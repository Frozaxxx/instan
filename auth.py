import hashlib
import os
from datetime import datetime, timedelta, UTC

from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session


from database import get_db
from models import User

SECRET_KEY = os.getenv("JWT_SECRET", "Lb1rok")
ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin_root")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "InstanAdmin_8421")

auth_scheme = HTTPBearer()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    return hash_password(password) == password_hash


def create_token(user_id: int, role: str = "user") -> str:
    exp = datetime.now(UTC) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "role": role, "exp": exp}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(auth_scheme),
    db: Session = Depends(get_db),
) -> User:
    token = creds.credentials
    try:
        payload = decode_token(token)
        user_id = int(payload["sub"])
        role = payload.get("role", "user")
    except (KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")

    if role != "user":
        raise HTTPException(status_code=403, detail="User token required")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if int(user.is_blocked or 0) != 0:
        raise HTTPException(status_code=403, detail="User is blocked")
    return user


def require_admin(
    creds: HTTPAuthorizationCredentials = Depends(auth_scheme),
) -> dict:
    token = creds.credentials
    payload = decode_token(token)
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload
