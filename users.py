import os
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Follow, Post, PostLike, User
from schemas import FollowOut, UserProfileOut

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
MEDIA_DIR = Path(os.getenv("MEDIA_ROOT", str(BASE_DIR / "frontend" / "uploads"))).resolve()
AVATARS_DIR = MEDIA_DIR / "avatars"

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
MAX_AVATAR_SIZE_BYTES = 10 * 1024 * 1024
EXTENSION_BY_CONTENT_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


def build_avatar_url(avatar_path: str | None) -> str | None:
    if not avatar_path:
        return None
    return f"/static/{avatar_path.lstrip('/')}"


def get_user_or_404(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def build_follow_payload(db: Session, target_user: User, current_user_id: int) -> FollowOut:
    is_following = (
        db.query(Follow.id)
        .filter(Follow.follower_id == current_user_id, Follow.following_id == target_user.id)
        .first()
        is not None
    )
    return FollowOut(
        user_id=int(target_user.id),
        followers_count=int(target_user.followers_count or 0),
        following_count=int(target_user.following_count or 0),
        is_following=is_following,
    )


def to_user_payload(user: User) -> dict[str, int | str | None]:
    avatar_url = None
    if user.avatar_path:
        avatar_url = build_avatar_url(user.avatar_path)

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "followers_count": user.followers_count or 0,
        "following_count": user.following_count or 0,
        "posts_count": 0,
        "avatar_url": avatar_url,
    }


def to_user_profile_payload(db: Session, user: User, current_user_id: int) -> UserProfileOut:
    posts_count = (
        db.query(func.count(Post.id))
        .filter(Post.author_id == user.id)
        .scalar()
        or 0
    )
    likes_count = (
        db.query(func.count(PostLike.id))
        .join(Post, PostLike.post_id == Post.id)
        .filter(Post.author_id == user.id)
        .scalar()
        or 0
    )
    is_following = False
    if int(user.id) != int(current_user_id):
        is_following = (
            db.query(Follow.id)
            .filter(Follow.follower_id == current_user_id, Follow.following_id == user.id)
            .first()
            is not None
        )

    return UserProfileOut(
        id=int(user.id),
        username=user.username,
        full_name=user.full_name,
        email=user.email if int(user.id) == int(current_user_id) else None,
        avatar_url=build_avatar_url(user.avatar_path),
        followers_count=int(user.followers_count or 0),
        following_count=int(user.following_count or 0),
        posts_count=int(posts_count),
        likes_count=int(likes_count),
        is_me=int(user.id) == int(current_user_id),
        is_following=is_following,
    )


@router.get("/me")
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    payload = to_user_payload(current_user)
    posts_count = (
        db.query(func.count(Post.id))
        .filter(Post.author_id == current_user.id)
        .scalar()
        or 0
    )
    payload["posts_count"] = int(posts_count)
    likes_count = (
        db.query(func.count(PostLike.id))
        .join(Post, PostLike.post_id == Post.id)
        .filter(Post.author_id == current_user.id)
        .scalar()
        or 0
    )
    payload["likes_count"] = int(likes_count)
    return payload


@router.get("/users/{user_id}", response_model=UserProfileOut)
def get_user_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_user_or_404(db, user_id)
    return to_user_profile_payload(db, user, int(current_user.id))


@router.post("/users/{user_id}/follow", response_model=FollowOut)
def follow_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if int(current_user.id) == int(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot follow yourself",
        )

    target_user = get_user_or_404(db, user_id)
    existing_follow = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == user_id)
        .first()
    )
    if not existing_follow:
        db.add(Follow(follower_id=current_user.id, following_id=user_id))
        current_user.following_count = int(current_user.following_count or 0) + 1
        target_user.followers_count = int(target_user.followers_count or 0) + 1
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not follow user. Please try again.",
            )

    db.refresh(current_user)
    db.refresh(target_user)
    return build_follow_payload(db, target_user, int(current_user.id))


@router.delete("/users/{user_id}/follow", response_model=FollowOut)
def unfollow_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if int(current_user.id) == int(user_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot unfollow yourself",
        )

    target_user = get_user_or_404(db, user_id)
    existing_follow = (
        db.query(Follow)
        .filter(Follow.follower_id == current_user.id, Follow.following_id == user_id)
        .first()
    )
    if existing_follow:
        db.delete(existing_follow)
        current_user.following_count = max(0, int(current_user.following_count or 0) - 1)
        target_user.followers_count = max(0, int(target_user.followers_count or 0) - 1)
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not unfollow user. Please try again.",
            )

    db.refresh(current_user)
    db.refresh(target_user)
    return build_follow_payload(db, target_user, int(current_user.id))


@router.post("/me/avatar")
async def upload_avatar(
    avatar: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if avatar.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, WEBP or GIF images are allowed",
        )

    payload = await avatar.read()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Avatar file is empty",
        )

    if len(payload) > MAX_AVATAR_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Avatar is too large (max 10 MB)",
        )

    extension = Path(avatar.filename or "").suffix.lower()
    if not extension:
        extension = EXTENSION_BY_CONTENT_TYPE.get(avatar.content_type or "", ".png")

    AVATARS_DIR.mkdir(parents=True, exist_ok=True)
    saved_name = f"{uuid4().hex}{extension}"
    saved_path = AVATARS_DIR / saved_name
    saved_path.write_bytes(payload)

    previous_avatar_path = current_user.avatar_path
    current_user.avatar_path = Path("uploads", "avatars", saved_name).as_posix()

    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save avatar. Please try again.",
        )

    db.refresh(current_user)

    if previous_avatar_path:
        previous_avatar_relative = Path(previous_avatar_path)
        if previous_avatar_relative.parts and previous_avatar_relative.parts[0] == "uploads":
            previous_avatar_relative = Path(*previous_avatar_relative.parts[1:])
            previous_avatar_file = (MEDIA_DIR / previous_avatar_relative).resolve()
            avatars_root = AVATARS_DIR.resolve()
            if avatars_root in previous_avatar_file.parents:
                previous_avatar_file.unlink(missing_ok=True)

    return to_user_payload(current_user)
