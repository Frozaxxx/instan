from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


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
    comments_count: int = 0
    comments: list["CommentOut"] = Field(default_factory=list)


class PostLikeOut(BaseModel):
    post_id: int
    likes_count: int
    liked_by_me: bool


class CommentCreate(BaseModel):
    body: str
    parent_id: int | None = None


class CommentOut(BaseModel):
    id: int
    post_id: int
    parent_id: int | None = None
    username: str
    body: str
    avatar_url: str | None = None
    created_at: datetime
    likes_count: int = 0
    liked_by_me: bool = False
    can_delete: bool = False
    replies: list["CommentOut"] = Field(default_factory=list)


class CommentLikeOut(BaseModel):
    comment_id: int
    likes_count: int
    liked_by_me: bool


class CommentDeleteOut(BaseModel):
    post_id: int
    deleted_comment_ids: list[int]
    comments_count: int


try:
    PostOut.model_rebuild()
    CommentOut.model_rebuild()
except AttributeError:
    PostOut.update_forward_refs(CommentOut=CommentOut)
    CommentOut.update_forward_refs(CommentOut=CommentOut)
