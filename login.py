from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import ADMIN_PASSWORD, ADMIN_USERNAME, create_token, verify_password
from database import get_db
from models import User
from schemas import UserLogin

router = APIRouter()


@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    if data.username == ADMIN_USERNAME and data.password == ADMIN_PASSWORD:
        token = create_token(0, role="admin")
        return {"access_token": token, "token_type": "bearer", "role": "admin"}

    user = db.query(User).filter(User.username == data.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if int(user.is_blocked or 0) != 0:
        raise HTTPException(status_code=403, detail="User is blocked")

    if not verify_password(data.password, str(user.password_hash)):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_token(int(str(user.id)), role="user")
    return {"access_token": token, "token_type": "bearer", "role": "user"}
