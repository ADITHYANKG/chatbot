from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base
import uuid 
class ChatHistory(Base):
    __tablename__ = "chat_history"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("file_uploads.id"))  # ✅ Correct ForeignKey reference
    user_id = Column(Integer, ForeignKey("users.id"))
    query_text = Column(Text, nullable=False)  # ✅ Renamed from 'message' to 'query_text'
    response_text = Column(Text, nullable=False)  # ✅ Renamed from 'response' to 'response_text'
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="chats")
    file = relationship("FileUpload", back_populates="chats")

class FileUpload(Base):
    __tablename__ = "file_uploads"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_path = Column(String, nullable=False)
    extracted_content = Column(Text, nullable=True)
    is_tabular = Column(Integer, default=0)  # ✅ 0 = False, 1 = True
    table_headers = Column(Text, nullable=True)  # ✅ store as comma-separated
    table_rows = Column(Text, nullable=True)  # ✅ store as newline-separated rows
    upload_time = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    user = relationship("User", back_populates="files")
    chats = relationship("ChatHistory", back_populates="file")

class User(Base):
    __tablename__ = "users"
     
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    
    files = relationship("FileUpload", back_populates="user")
    chats = relationship("ChatHistory", back_populates="user")  # ✅ Allow access to chat history
class Image(Base):
    __tablename__="images"
    id=Column(Integer,primary_key=True,index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    prompt = Column(String, nullable=False)
    image_url = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)



    

class DatabaseQuery(Base):
    __tablename__="db_queries"
    session_id = Column(String, default=lambda: str(uuid.uuid4()), index=True)  # 🆕
    database_name = Column(String, nullable=False) 

    
    id=Column(Integer,primary_key=True,index=True)
    user_id=Column(Integer,ForeignKey("users.id"))
    query_text = Column(Text, nullable=False)  # ✅ Renamed from 'message' to 'query_text'
    response_text = Column(Text, nullable=False)  # ✅ Renamed from 'response' to 'response_text'
    timestamp = Column(DateTime, default=datetime.utcnow)
    