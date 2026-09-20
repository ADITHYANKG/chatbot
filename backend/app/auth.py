import hashlib
import hmac
import base64
from datetime import datetime, timedelta
from jose import jwt
from fastapi.security import OAuth2PasswordBearer

# ✅ Define OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60*24*365
SALT = b"your_salt_here"  # ✅ Change this to a secure, random value

# ✅ Secure Password Hashing (SHA256 with Salt)
def get_password_hash(password: str) -> str:
    hash_obj = hashlib.pbkdf2_hmac("sha256", password.encode(), SALT, 100000)
    return base64.b64encode(hash_obj).decode()

# ✅ Secure Password Verification
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(get_password_hash(plain_password), hashed_password)

# ✅ JWT Token Generation
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() +  (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
