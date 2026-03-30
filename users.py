from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import User

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
AVATARS_DIR = BASE_DIR / "frontend" / "uploads" / "avatars"

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


def to_user_payload(user: User) -> dict[str, int | str | None]:
    avatar_url = None
    if user.avatar_path:
        avatar_url = f"/static/{user.avatar_path.lstrip('/')}"

    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "followers_count": user.followers_count or 0,
        "following_count": user.following_count or 0,
        "avatar_url": avatar_url,
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return to_user_payload(current_user)


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
        previous_avatar_file = (BASE_DIR / "frontend" / previous_avatar_path).resolve()
        avatars_root = AVATARS_DIR.resolve()
        if avatars_root in previous_avatar_file.parents:
            previous_avatar_file.unlink(missing_ok=True)

    return to_user_payload(current_user)
