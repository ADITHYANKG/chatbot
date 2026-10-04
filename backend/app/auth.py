import hashlib
import hmac
import base64
import binascii
from datetime import datetime, timedelta, timezone
from jose import jwt
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from settings import JWT_ACCESS_TOKEN_EXPIRE_MINUTES, JWT_SECRET_KEY

# ✅ Define OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login/")

ALGORITHM = "HS256"
LEGACY_SALT = b"your_salt_here"
LEGACY_ITERATIONS = 100000
password_hash = PasswordHash.recommended()

def get_password_hash(password: str) -> str:
    return password_hash.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    is_valid, _ = verify_password_and_update(plain_password, hashed_password)
    return is_valid


def verify_password_and_update(
    plain_password: str, hashed_password: str
) -> tuple[bool, str | None]:
    if hashed_password.startswith("$argon2"):
        try:
            return password_hash.verify_and_update(plain_password, hashed_password)
        except (ValueError, TypeError):
            return False, None

    try:
        expected_hash = base64.b64decode(hashed_password, validate=True)
    except (binascii.Error, ValueError):
        return False, None

    legacy_hash = hashlib.pbkdf2_hmac(
        "sha256", plain_password.encode(), LEGACY_SALT, LEGACY_ITERATIONS
    )
    is_valid = hmac.compare_digest(legacy_hash, expected_hash)
    return is_valid, get_password_hash(plain_password) if is_valid else None

# ✅ JWT Token Generation
def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=ALGORITHM)
