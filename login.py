from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import create_token, verify_password
from database import get_db
from models import User
from schemas import UserLogin

router = APIRouter()


@router.post("/login")
def login(data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(data.password, str(user.password_hash)):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_token(int(str(user.id)))
    return {"access_token": token, "token_type": "bearer"}
