from fastapi import FastAPI, File, UploadFile, Form, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User, FileUpload, ChatHistory, Base, Image, DatabaseQuery, PlainChatHistory
from auth import create_access_token, get_password_hash, verify_password, oauth2_scheme
from file_processor import extract_text_from_file
from llm_client import query_ollama, connect_ollama_db, disconnect_ollama_db
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
from pathlib import Path
from jose import jwt
import uuid
from datetime import datetime
import random
# ✅ Initialize FastAPI app
app = FastAPI()
from sqlalchemy import func



# ✅ Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ✅ Enable CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # ✅ Allow React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"

# ✅ Ensure database tables are created
Base.metadata.create_all(bind=engine)

# ✅ Set File Upload Configurations
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE_MB = 10

# ✅ Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Chat API!"}   


# ✅ Decode Token to Get User ID
def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ✅ User Registration
@app.post("/register/")
def register(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")

    hashed_password = get_password_hash(password)
    new_user = User(username=username, password=hashed_password)
    db.add(new_user)
    db.commit()

    return {"message": "User registered successfully"}

# ✅ User Login
@app.post("/login/")
def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}
@app.get("/user/")
def get_user(user: User = Depends(get_current_user)):
    return {"username": user.username}
@app.get("/user-id/")
def get_user_id(user: User = Depends(get_current_user)):    
    return {"user_id": user.id}


@app.get("/users/")
def get_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return [{"id": user.id, "username": user.username} for user in users]


# ✅ Upload File & Extract Content
@app.post("/upload/")
async def upload_file(file: UploadFile = File(...), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Handles file uploads, extracts content, and stores it in the database."""
    if file.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File size exceeds limit")

    unique_filename = f"{uuid.uuid4()}_{file.filename}"
    file_path = UPLOAD_DIR / unique_filename

    with file_path.open("wb") as f:
        f.write(await file.read())

    # ✅ Extract file content
    extracted_data = extract_text_from_file(file_path)
    is_tabular = extracted_data.get("is_tabular", False)
    extracted_content = ""
    table_headers = ""
    table_rows = ""

    if is_tabular:
        headers = extracted_data.get("headers", [])
        rows = extracted_data.get("rows", [])
        table_headers = ",".join(str(h) for h in headers)
        table_rows = "\n".join([",".join(str(cell) for cell in row) for row in rows])
        extracted_content = f"{table_headers}\n{table_rows}"
    else:
        extracted_content = extracted_data.get("text", "")

    # ✅ Save extracted content in DB
    new_file = FileUpload(
        filename=file.filename,
        file_path=str(file_path),
        extracted_content=extracted_content,
        is_tabular=1 if is_tabular else 0,
        table_headers=table_headers if is_tabular else None,
        table_rows=table_rows if is_tabular else None,
        user_id=user.id,
    )
    db.add(new_file)
    db.commit()
    db.refresh(new_file)

    return {
        "file_id": new_file.id,
        "message": "File uploaded successfully",
        "extracted_content": extracted_content,
        "is_tabular": is_tabular,
        "table_headers": headers if is_tabular else [],
        "table_rows": rows if is_tabular else [],
    }
    

# ✅ Query LLM (Chatbot) and Save Chat History
@app.post("/query/")
async def query_llm(request: Request, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Handles AI query requests and saves chat history."""
    form_data = await request.json()
    query = form_data.get("query") or form_data.get("prompt") 
    file_id = form_data.get("file_id")
    mode=form_data.get("mode","file")
   
    if not query:
        raise HTTPException(status_code=400, detail="Missing query or prompt")
    file_text = None
    
    if mode=="file":
        if not file_id:
            raise HTTPException(status_code=400,detail="file_id required for file mode")
        file = db.query(FileUpload).filter(FileUpload.id == file_id, FileUpload.user_id == user.id).first()
        
        if not file:
            raise HTTPException(status_code=404,detail="file not found")
        file_text=file.extracted_content
    
    session_id = None
    conversation_history = []
    if mode == "chat":
        session_id = form_data.get("session_id") or str(uuid.uuid4())
        previous_turns = (
            db.query(PlainChatHistory)
            .filter(
                PlainChatHistory.user_id == user.id,
                PlainChatHistory.session_id == session_id,
            )
            .order_by(PlainChatHistory.timestamp, PlainChatHistory.id)
            .all()
        )
        if form_data.get("session_id") and not previous_turns:
            raise HTTPException(status_code=404, detail="Chat session not found")
        conversation_history = [
            message
            for turn in previous_turns
            for message in (
                {"role": "user", "content": turn.query_text},
                {"role": "assistant", "content": turn.response_text},
            )
        ]

    response = query_ollama(
        file_text=file_text,
        user_query=query,
        mode=mode,
        conversation_history=conversation_history if mode == "chat" else None,
    )  # ✅ Pass extracted content to LLM
    
   
    # ✅ Store chat history with correct column names , and image history and db queries
    if mode=="image":
        new_image=Image(
            user_id=user.id,
            prompt=query,
            image_url=response
        
        )
        db.add(new_image)
        db.commit()
        return {"image_url":response}
    elif mode=="file":
        new_chat = ChatHistory(
        file_id=file.id,
        user_id=user.id,
        query_text=query,  # ✅ Corrected from 'message'
        response_text=response  # ✅ Corrected from 'response'
    )
        db.add(new_chat)
        db.commit()
        
        return {"response": response}

    elif mode == "chat":
        db.add(
            PlainChatHistory(
                user_id=user.id,
                session_id=session_id,
                query_text=query,
                response_text=response,
            )
        )
        db.commit()
        return {"response": response, "session_id": session_id}

    else:
        session_id = form_data.get("session_id")
        database = form_data.get("database")
        # if not session_id or not database:
        #     print("response",response)
        #     raise HTTPException(status_code=400, detail="Missing session_id or database name")
        
        print(session_id)
        new_db=DatabaseQuery(
            
            user_id=user.id,
            query_text=query,
            response_text=response,
            session_id=session_id,
            database_name=database
        
        )
        db.add(new_db)
        db.commit()
        return {"response":response}


@app.get("/chat-history")
def get_plain_chat_sessions(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    turns = (
        db.query(PlainChatHistory)
        .filter(PlainChatHistory.user_id == user.id)
        .order_by(PlainChatHistory.timestamp, PlainChatHistory.id)
        .all()
    )
    sessions = {}
    for turn in turns:
        session = sessions.setdefault(
            turn.session_id,
            {
                "session_id": turn.session_id,
                "title": turn.query_text[:60],
                "time": turn.timestamp.isoformat(),
            },
        )
        session["time"] = turn.timestamp.isoformat()
    return sorted(sessions.values(), key=lambda session: session["time"], reverse=True)


@app.get("/chat-history/{session_id}")
def get_plain_chat_session(
    session_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    turns = (
        db.query(PlainChatHistory)
        .filter(
            PlainChatHistory.user_id == user.id,
            PlainChatHistory.session_id == session_id,
        )
        .order_by(PlainChatHistory.timestamp, PlainChatHistory.id)
        .all()
    )
    if not turns:
        raise HTTPException(status_code=404, detail="Chat session not found")
    return [
        {
            "query": turn.query_text,
            "response": turn.response_text,
            "time": turn.timestamp.isoformat(),
        }
        for turn in turns
    ]

        



  





# ✅ Get Chat History for a Specific File
@app.get("/chats/{file_id}")
def get_chat_history(file_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chats = db.query(ChatHistory).filter(ChatHistory.file_id == file_id, ChatHistory.user_id == user.id).all()
    
    chat_list = []
    for chat in chats:
        chat_list.append({"role": "user", "content": chat.query_text})
        chat_list.append({"role": "ai", "content": chat.response_text})
    # logger.error(f"chat: {chat_list}")
    return chat_list

# ✅ Get File Content for a Specific File
@app.get("/files/{file_id}")
def get_file_content(file_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file = db.query(FileUpload).filter(FileUpload.id == file_id, FileUpload.user_id == user.id).first()
    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    is_tabular = bool(file.is_tabular)
    headers = file.table_headers.split(",") if file.table_headers else []
    rows = [row.split(",") for row in file.table_rows.split("\n")] if file.table_rows else []

    return {
        "text": file.extracted_content,
        "is_tabular": is_tabular,
        "table_headers": headers,
        "table_rows": rows,
    }

# ✅ Get User's Uploaded Files
@app.get("/files/")
def get_user_files(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetches all uploaded files for a user."""
    files = db.query(FileUpload).filter(FileUpload.user_id == user.id).all()
    return [{"id": file.id, "filename": file.filename, "upload_time": file.upload_time} for file in files]
    

@app.get("/image-prompts")
def get_image_prompts(user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        prompts = (
            db.query(Image)
            .filter(Image.user_id == user.id)
            .order_by(Image.timestamp.desc())
            .all()
        )

        return [
            {
                "prompt": p.prompt,
                "image_url": p.image_url,  # base64 or URL
                "time": p.timestamp.isoformat() if p.timestamp else None
            }
            for p in prompts
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch image prompts: {str(e)}")
    






# @app.get("/db-history")
# def get_db_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
#     queries = db.query(DatabaseQuery).filter(DatabaseQuery.user_id == user.id).order_by(DatabaseQuery.timestamp.desc()).all()
#     return [
#         {
#             "query": q.query_text,
#             "response": q.response_text,
#             "times": q.timestamp.isoformat(),
#         } for q in queries
#     ]

@app.get("/db-history")
def get_db_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Step 1: Get earliest timestamp for each session
    subq = (
        db.query(
            DatabaseQuery.session_id,
            func.min(DatabaseQuery.timestamp).label("first_time")
        )
        .filter(DatabaseQuery.user_id == user.id)
        .group_by(DatabaseQuery.session_id)
        .subquery()
    )

    # Step 2: Join to get first query entry of each session
    sessions = (
        db.query(DatabaseQuery)
        .join(subq, (DatabaseQuery.session_id == subq.c.session_id) & (DatabaseQuery.timestamp == subq.c.first_time))
        .order_by(DatabaseQuery.timestamp.desc())
        .all()
    )

    return [
        {
            "id": s.id,
            "session_id": s.session_id,
            "query": s.query_text,
            "response": s.response_text,
            "database": s.database_name,
            "time": s.timestamp.isoformat(),
        }
        for s in sessions
    ]



@app.get("/db-history/{session_id}")
def get_queries_by_session(session_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    queries = (
        db.query(DatabaseQuery)
        .filter(DatabaseQuery.user_id == user.id, DatabaseQuery.session_id == session_id)
        .order_by(DatabaseQuery.timestamp)
        .all()
    )

    return [
        {
            "query": q.query_text,
            "response": q.response_text,
            "time": q.timestamp.isoformat()
        }
        for q in queries
    ]





























@app.post("/connect/")
async def connect_db(request: Request, user: User = Depends(get_current_user)):
    body = await request.json()
    db_config = body.get("db_config")
    fetch_mode=body.get("fetch_mode")
    print(db_config)


    if not db_config:
        raise HTTPException(status_code=400, detail="Missing 'db_config'")

    try:
        print("hits main ")
        response = connect_ollama_db(db_config,fetch_mode)
        if fetch_mode:
            return response 
        if response.get("status")=="connected":
            session_id=str(uuid.uuid4())
            database_name=db_config.get("MYSQL_DATABASE","Unknown")
            print("🔁 Final response from /connect/:", response)

            return{
                "status":"connected",
                "session_id":session_id,
                "database":database_name
            }
        else:
            print("🔁 Final response from /connect/:", response)
            
            raise HTTPException(status_code=500, detail=response.get("message", "MCP connection failed"))
            
            


        
    except Exception as e:
        print("cant connect")
        return {"status": "error", "message": str(e)}
    



























@app.post("/disconnect/")
async def disconnect_db(user: User = Depends(get_current_user)):
    try:
        response = disconnect_ollama_db()
        return response
    except Exception as e:
        return {"status": "error", "message": str(e)}    
    
if __name__=="__main__":
    import uvicorn 
    uvicorn.run("main:app",reload=True)    
