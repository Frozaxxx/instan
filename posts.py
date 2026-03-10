from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Post, User
from schemas import PostOut

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


def to_post_out(post: Post, username: str) -> PostOut:
    return PostOut(
        id=int(post.id),
        username=username,
        caption=post.caption,
        image_url=f"/static/{post.image_path}",
        created_at=post.created_at or datetime.now(UTC),
    )


@router.get("/posts", response_model=list[PostOut])
def get_posts(db: Session = Depends(get_db)):
    rows = (
        db.query(Post, User.username)
        .join(User, Post.author_id == User.id)
        .order_by(Post.created_at.desc(), Post.id.desc())
        .all()
    )
    return [to_post_out(post, username) for post, username in rows]


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

    return to_post_out(post, current_user.username)
