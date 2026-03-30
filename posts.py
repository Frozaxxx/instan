from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Post, PostLike, User
from schemas import PostLikeOut, PostOut

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "frontend" / "uploads"

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
MAX_CAPTION_LENGTH = 2200


def to_post_out(
    post: Post,
    username: str,
    avatar_path: str | None,
    likes_count: int = 0,
    liked_by_me: bool = False,
) -> PostOut:
    avatar_url = None
    if avatar_path:
        avatar_url = f"/static/{avatar_path.lstrip('/')}"

    return PostOut(
        id=int(post.id),
        username=username,
        caption=post.caption,
        image_url=f"/static/{post.image_path}",
        avatar_url=avatar_url,
        created_at=post.created_at or datetime.now(UTC),
        likes_count=likes_count,
        liked_by_me=liked_by_me,
    )


def get_post_or_404(db: Session, post_id: int) -> Post:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


def load_post_reactions(
    db: Session,
    post_ids: list[int],
    current_user_id: int,
) -> tuple[dict[int, int], set[int]]:
    if not post_ids:
        return {}, set()

    like_counts_rows = (
        db.query(PostLike.post_id, func.count(PostLike.id))
        .filter(PostLike.post_id.in_(post_ids))
        .group_by(PostLike.post_id)
        .all()
    )
    liked_rows = (
        db.query(PostLike.post_id)
        .filter(PostLike.post_id.in_(post_ids), PostLike.user_id == current_user_id)
        .all()
    )

    like_counts = {int(post_id): int(likes_count) for post_id, likes_count in like_counts_rows}
    liked_post_ids = {int(post_id) for post_id, in liked_rows}
    return like_counts, liked_post_ids


def build_post_like_payload(db: Session, post_id: int, current_user_id: int) -> PostLikeOut:
    likes_count = (
        db.query(func.count(PostLike.id))
        .filter(PostLike.post_id == post_id)
        .scalar()
        or 0
    )
    liked_by_me = (
        db.query(PostLike.id)
        .filter(PostLike.post_id == post_id, PostLike.user_id == current_user_id)
        .first()
        is not None
    )
    return PostLikeOut(
        post_id=post_id,
        likes_count=int(likes_count),
        liked_by_me=liked_by_me,
    )


@router.get("/posts", response_model=list[PostOut])
def get_posts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Post, User.username, User.avatar_path)
        .join(User, Post.author_id == User.id)
        .order_by(Post.created_at.desc(), Post.id.desc())
        .all()
    )

    post_ids = [int(post.id) for post, _, _ in rows]
    like_counts, liked_post_ids = load_post_reactions(db, post_ids, current_user.id)

    return [
        to_post_out(
            post,
            username,
            avatar_path,
            likes_count=like_counts.get(int(post.id), 0),
            liked_by_me=int(post.id) in liked_post_ids,
        )
        for post, username, avatar_path in rows
    ]


@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    caption: str = Form(""),
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    normalized_caption = caption.strip()
    if len(normalized_caption) > MAX_CAPTION_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Caption must be <= {MAX_CAPTION_LENGTH} characters",
        )

    if image.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only JPEG, PNG, WEBP or GIF images are allowed",
        )

    payload = await image.read()
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image file is empty",
        )
    if len(payload) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Image is too large (max 10 MB)",
        )

    extension = Path(image.filename or "").suffix.lower()
    if not extension:
        extension = ".jpg"

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    saved_name = f"{uuid4().hex}{extension}"
    saved_path = UPLOADS_DIR / saved_name
    saved_path.write_bytes(payload)

    relative_image_path = Path("uploads", saved_name).as_posix()
    post = Post(
        author_id=current_user.id,
        caption=normalized_caption,
        image_path=relative_image_path,
    )
    db.add(post)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        saved_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save post. Please restart backend and try again.",
        )
    db.refresh(post)

    return to_post_out(post, current_user.username, current_user.avatar_path)


@router.post("/posts/{post_id}/like", response_model=PostLikeOut)
def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_post_or_404(db, post_id)

    existing_like = (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id, PostLike.user_id == current_user.id)
        .first()
    )
    if not existing_like:
        db.add(PostLike(post_id=post_id, user_id=current_user.id))
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not save like. Please try again.",
            )

    return build_post_like_payload(db, post_id, current_user.id)


@router.delete("/posts/{post_id}/like", response_model=PostLikeOut)
def unlike_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_post_or_404(db, post_id)

    existing_like = (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id, PostLike.user_id == current_user.id)
        .first()
    )
    if existing_like:
        db.delete(existing_like)
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not remove like. Please try again.",
            )

    return build_post_like_payload(db, post_id, current_user.id)
