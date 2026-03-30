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
    avatar_url: str | None = None
    created_at: datetime
    likes_count: int = 0
    liked_by_me: bool = False


class PostLikeOut(BaseModel):
    post_id: int
    likes_count: int
    liked_by_me: bool
