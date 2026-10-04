from fastapi import BackgroundTasks, FastAPI, File, UploadFile, Form, Request, HTTPException, Depends
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User, FileUpload, ChatHistory, Base, Image, DatabaseQuery, PlainChatHistory
from models import EmailActionToken
from auth import create_access_token, get_password_hash, verify_password_and_update, oauth2_scheme
from email_service import send_email
from schema_migrations import upgrade_database
from settings import FRONTEND_URL, JWT_SECRET_KEY
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
from email_validator import EmailNotValidError, validate_email
from datetime import datetime, timedelta, timezone
import hashlib
import re
import secrets
import threading
import time



# ✅ Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ✅ Enable CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://botlocalai.duckdns.org"],  # ✅ Allow React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALGORITHM = "HS256"

# ✅ Ensure database tables are created
Base.metadata.create_all(bind=engine)
upgrade_database(engine)

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


_RATE_LIMIT_WINDOW_SECONDS = 3600
_RATE_LIMIT_MAX_ATTEMPTS = 5
_rate_limit_events: dict[str, list[float]] = {}
_rate_limit_lock = threading.Lock()


def normalize_email(email: str) -> str:
    try:
        return validate_email(email.strip(), check_deliverability=False).normalized.lower()
    except EmailNotValidError as error:
        raise HTTPException(status_code=422, detail="Enter a valid email address") from error


def validate_password_strength(password: str) -> None:
    has_uppercase = re.search(r"[A-Z]", password) is not None
    has_lowercase = re.search(r"[a-z]", password) is not None
    has_number = re.search(r"[0-9]", password) is not None
    has_special = re.search(r"[^A-Za-z0-9\s]", password) is not None
    if not (len(password) >= 8 and has_uppercase and has_lowercase and has_number and has_special):
        raise HTTPException(
            status_code=422,
            detail=(
                "Password must be at least 8 characters and include an uppercase letter, "
                "a lowercase letter, a number, and a special character."
            ),
        )


def is_rate_limited(keys: list[str]) -> bool:
    now = time.monotonic()
    cutoff = now - _RATE_LIMIT_WINDOW_SECONDS
    with _rate_limit_lock:
        blocked = False
        for key in keys:
            events = [event for event in _rate_limit_events.get(key, []) if event > cutoff]
            if events:
                _rate_limit_events[key] = events
            else:
                _rate_limit_events.pop(key, None)
            blocked = blocked or len(events) >= _RATE_LIMIT_MAX_ATTEMPTS
        for key in keys:
            _rate_limit_events.setdefault(key, []).append(now)
        return blocked


def create_email_action_token(
    db: Session, user: User, purpose: str, lifetime: timedelta
) -> str:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    db.query(EmailActionToken).filter(
        EmailActionToken.user_id == user.id,
        EmailActionToken.purpose == purpose,
        EmailActionToken.consumed_at.is_(None),
    ).update({EmailActionToken.consumed_at: now}, synchronize_session=False)

    raw_token = secrets.token_urlsafe(32)
    db.add(
        EmailActionToken(
            user_id=user.id,
            purpose=purpose,
            token_digest=hashlib.sha256(raw_token.encode()).hexdigest(),
            expires_at=now + lifetime,
        )
    )
    return raw_token


def consume_email_action_token(db: Session, raw_token: str, purpose: str):
    token_digest = hashlib.sha256(raw_token.encode()).hexdigest()
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    token = db.query(EmailActionToken).filter(
        EmailActionToken.token_digest == token_digest,
        EmailActionToken.purpose == purpose,
        EmailActionToken.consumed_at.is_(None),
        EmailActionToken.expires_at > now,
    ).first()
    if not token:
        return None

    changed = db.query(EmailActionToken).filter(
        EmailActionToken.id == token.id,
        EmailActionToken.consumed_at.is_(None),
        EmailActionToken.expires_at > now,
    ).update({EmailActionToken.consumed_at: now}, synchronize_session=False)
    if changed != 1:
        return None
    db.flush()
    return token


def send_action_email(email: str, raw_token: str, purpose: str) -> None:
    if purpose == "password_reset":
        link = f"{FRONTEND_URL}/reset-password#token={raw_token}"
        subject = "Reset your ChatBot password"
        action = "reset your password"
        lifetime = "30 minutes"
    else:
        link = f"{FRONTEND_URL}/verify-email#token={raw_token}"
        subject = "Verify your ChatBot email"
        action = "verify your email address"
        lifetime = "24 hours"

    send_email(
        email,
        subject,
        f"Use this link to {action}:\n\n{link}\n\nThis link expires in {lifetime}. If you did not request it, you can ignore this email.",
    )


def deliver_action_email(email: str, raw_token: str, purpose: str) -> None:
    try:
        send_action_email(email, raw_token, purpose)
    except Exception as error:
        logger.warning(
            "Account action email delivery failed (error=%s, smtp_code=%s)",
            type(error).__name__,
            getattr(error, "smtp_code", None),
        )


def _request_keys(request: Request, email: str) -> list[str]:
    client_host = request.client.host if request.client else "unknown"
    return [f"ip:{client_host}", f"email:{email}"]



@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Chat API!"}   


# ✅ Decode Token to Get User ID
def get_authenticated_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        if not user or payload.get("ver", 0) != user.token_version:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(user: User = Depends(get_authenticated_user)):
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="email_verification_required")
    return user


# ✅ User Registration
@app.post("/register/")
def register(
    background_tasks: BackgroundTasks,
    username: str = Form(...),
    password: str = Form(..., min_length=8, max_length=1024),
    email: str = Form(...),
    db: Session = Depends(get_db),
):
    username = username.strip()
    email = normalize_email(email)
    validate_password_strength(password)
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already taken")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(username=username.strip(), password=get_password_hash(password), email=email)
    db.add(new_user)
    db.flush()
    raw_token = create_email_action_token(db, new_user, "email_verification", timedelta(hours=24))
    db.commit()
    background_tasks.add_task(deliver_action_email, new_user.email, raw_token, "email_verification")

    return {"message": "Registration successful. Check your email to verify your account."}

# ✅ User Login
@app.post("/login/")
def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    is_valid, upgraded_hash = verify_password_and_update(password, user.password)
    if not is_valid:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if upgraded_hash:
        user.password = upgraded_hash
        db.commit()

    access_token = create_access_token(data={"sub": user.username, "ver": user.token_version})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "email": user.email,
        "email_verified": user.email_verified,
    }
@app.get("/user/")
def get_user(user: User = Depends(get_authenticated_user)):
    return {"username": user.username, "email": user.email, "email_verified": user.email_verified}


@app.post("/account/email/")
def update_account_email(
    request: Request,
    background_tasks: BackgroundTasks,
    email: str = Form(...),
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    normalized_email = normalize_email(email)
    existing_user = db.query(User).filter(User.email == normalized_email, User.id != user.id).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    if is_rate_limited(_request_keys(request, normalized_email)):
        return {"message": "If delivery is configured, a verification link has been sent."}

    user.email = normalized_email
    user.email_verified = False
    raw_token = create_email_action_token(db, user, "email_verification", timedelta(hours=24))
    db.commit()
    background_tasks.add_task(deliver_action_email, normalized_email, raw_token, "email_verification")
    return {"message": "If delivery is configured, a verification link has been sent."}


@app.post("/account/email/resend/")
def resend_account_email_verification(
    request: Request,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_authenticated_user),
    db: Session = Depends(get_db),
):
    if user.email and not user.email_verified and not is_rate_limited(_request_keys(request, user.email)):
        raw_token = create_email_action_token(db, user, "email_verification", timedelta(hours=24))
        db.commit()
        background_tasks.add_task(deliver_action_email, user.email, raw_token, "email_verification")
    return {"message": "If your account needs verification, a link has been sent."}


@app.post("/email-verification/request/")
def request_email_verification(
    request: Request,
    background_tasks: BackgroundTasks,
    email: str = Form(...),
    db: Session = Depends(get_db),
):
    try:
        normalized_email = normalize_email(email)
    except HTTPException:
        normalized_email = email.strip().lower()

    if not is_rate_limited(_request_keys(request, normalized_email)):
        user = db.query(User).filter(User.email == normalized_email, User.email_verified.is_(False)).first()
        if user:
            raw_token = create_email_action_token(db, user, "email_verification", timedelta(hours=24))
            db.commit()
            background_tasks.add_task(deliver_action_email, normalized_email, raw_token, "email_verification")
    return {"message": "If the account needs verification, a link has been sent."}


@app.post("/email-verification/confirm/")
def confirm_email_verification(token: str = Form(...), db: Session = Depends(get_db)):
    action_token = consume_email_action_token(db, token, "email_verification")
    if not action_token:
        token_digest = hashlib.sha256(token.encode()).hexdigest()
        previous_token = db.query(EmailActionToken).filter(
            EmailActionToken.token_digest == token_digest,
            EmailActionToken.purpose == "email_verification",
        ).first()
        if previous_token and previous_token.consumed_at:
            user = db.query(User).filter(User.id == previous_token.user_id).first()
            if user and user.email_verified:
                return {"message": "Email verified successfully"}
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")

    user = db.query(User).filter(User.id == action_token.user_id).first()
    if not user:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid or expired verification link")
    user.email_verified = True
    db.commit()
    return {"message": "Email verified successfully"}


@app.post("/password-reset/request/")
def request_password_reset(
    request: Request,
    background_tasks: BackgroundTasks,
    email: str = Form(...),
    db: Session = Depends(get_db),
):
    try:
        normalized_email = normalize_email(email)
    except HTTPException:
        normalized_email = email.strip().lower()

    if not is_rate_limited(_request_keys(request, normalized_email)):
        user = db.query(User).filter(
            User.email == normalized_email,
            User.email_verified.is_(True),
        ).first()
        if user:
            raw_token = create_email_action_token(db, user, "password_reset", timedelta(minutes=30))
            db.commit()
            background_tasks.add_task(deliver_action_email, normalized_email, raw_token, "password_reset")
    return {"message": "If a verified account exists for that email, a reset link has been sent."}


@app.post("/password-reset/confirm/")
def confirm_password_reset(
    token: str = Form(...),
    new_password: str = Form(..., min_length=8, max_length=1024),
    db: Session = Depends(get_db),
):
    action_token = consume_email_action_token(db, token, "password_reset")
    if not action_token:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    user = db.query(User).filter(User.id == action_token.user_id).first()
    if not user:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")

    validate_password_strength(new_password)
    user.password = get_password_hash(new_password)
    user.token_version += 1
    db.query(EmailActionToken).filter(
        EmailActionToken.user_id == user.id,
        EmailActionToken.purpose == "password_reset",
        EmailActionToken.consumed_at.is_(None),
    ).update(
        {EmailActionToken.consumed_at: datetime.now(timezone.utc).replace(tzinfo=None)},
        synchronize_session=False,
    )
    db.commit()
    return {"message": "Password reset successfully. Please sign in with your new password."}


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
