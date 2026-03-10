from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserRegister(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: str


class UserLogin(BaseModel):
    username: str
    password: str


class PostOut(BaseModel):
    id: int
    username: str
    caption: str
    image_url: str
    created_at: datetime
