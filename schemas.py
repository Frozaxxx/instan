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
    author_id: int
    username: str
    caption: str
    image_url: str
    avatar_url: str | None = None
    created_at: datetime
    likes_count: int = 0
    liked_by_me: bool = False
    can_delete: bool = False
    is_following_author: bool = False
    delete_scheduled_at: datetime | None = None
    comments_count: int = 0
    comments: list["CommentOut"] = Field(default_factory=list)


class PostLikeOut(BaseModel):
    post_id: int
    likes_count: int
    liked_by_me: bool


class PostDeleteOut(BaseModel):
    post_id: int
    delete_scheduled_at: datetime | None = None
    deleted: bool = False


class CommentCreate(BaseModel):
    body: str
    parent_id: int | None = None


class CommentOut(BaseModel):
    id: int
    post_id: int
    parent_id: int | None = None
    author_id: int
    username: str
    reply_to_user_id: int | None = None
    reply_to_username: str | None = None
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


class UserProfileOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: str | None = None
    avatar_url: str | None = None
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    likes_count: int = 0
    is_me: bool = False
    is_following: bool = False


class FollowOut(BaseModel):
    user_id: int
    followers_count: int
    following_count: int
    is_following: bool


class AdminMetricsOut(BaseModel):
    users_count: int
    blocked_users_count: int
    posts_count: int
    comments_count: int
    post_likes_count: int
    comment_likes_count: int


class AdminChartPointOut(BaseModel):
    date: str
    value: int


class AdminActivityOut(BaseModel):
    posts_by_day: list[AdminChartPointOut]
    posting_users_by_day: list[AdminChartPointOut]


class AdminUserOut(BaseModel):
    id: int
    username: str
    full_name: str
    email: str
    is_blocked: bool
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    comments_count: int = 0


class AdminPostOut(BaseModel):
    id: int
    author_id: int
    username: str
    caption: str
    image_url: str
    created_at: datetime
    likes_count: int = 0
    comments_count: int = 0


class AdminCommentOut(BaseModel):
    id: int
    post_id: int
    author_id: int
    username: str
    body: str
    created_at: datetime
    replies_count: int = 0


try:
    PostOut.model_rebuild()
    CommentOut.model_rebuild()
except AttributeError:
    PostOut.update_forward_refs(CommentOut=CommentOut)
    CommentOut.update_forward_refs(CommentOut=CommentOut)
