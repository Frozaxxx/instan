from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import hash_password
from database import get_db
from models import User
from schemas import UserRegister

router = APIRouter()


@router.post("/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == user.username).first():
        raise HTTPException(status_code=409, detail="Username already exists")

    if db.query(User).filter(User.email == user.email).first():
        raise HTTPException(status_code=409, detail="Email already exists")

    new_user = User(
        username=user.username,
        email=user.email,
        password_hash=hash_password(user.password),
        full_name=user.full_name,
        followers_count=0,
        following_count=0,
        is_blocked=0,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User registered", "id": new_user.id}
