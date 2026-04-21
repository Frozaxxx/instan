import os
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased

from auth import get_current_user
from database import get_db
from models import Comment, CommentLike, Follow, Post, PostLike, User
from schemas import CommentCreate, CommentDeleteOut, CommentLikeOut, CommentOut, PostDeleteOut, PostLikeOut, PostOut

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = Path(os.getenv("MEDIA_ROOT", str(BASE_DIR / "frontend" / "uploads"))).resolve()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024
MAX_CAPTION_LENGTH = 2200
MAX_COMMENT_LENGTH = 1000
POST_RESTORE_WINDOW_SECONDS = 30


def build_avatar_url(avatar_path: str | None) -> str | None:
    if not avatar_path:
        return None

    return f"/static/{avatar_path.lstrip('/')}"


def to_post_out(
    post: Post,
    username: str,
    avatar_path: str | None,
    likes_count: int = 0,
    liked_by_me: bool = False,
    can_delete: bool = False,
    is_following_author: bool = False,
    comments_count: int = 0,
    comments: list[CommentOut] | None = None,
) -> PostOut:
    return PostOut(
        id=int(post.id),
        author_id=int(post.author_id),
        username=username,
        caption=post.caption,
        image_url=f"/static/{post.image_path}",
        avatar_url=build_avatar_url(avatar_path),
        created_at=post.created_at or datetime.now(UTC),
        likes_count=likes_count,
        liked_by_me=liked_by_me,
        can_delete=can_delete,
        is_following_author=is_following_author,
        delete_scheduled_at=post.delete_scheduled_at,
        comments_count=comments_count,
        comments=comments or [],
    )


def get_post_or_404(db: Session, post_id: int) -> Post:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


def get_comment_or_404(db: Session, comment_id: int) -> Comment:
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    return comment


def purge_expired_deleted_posts(db: Session) -> None:
    now = datetime.now(UTC)
    expired_posts = (
        db.query(Post)
        .filter(Post.delete_scheduled_at.isnot(None), Post.delete_scheduled_at <= now)
        .all()
    )
    if not expired_posts:
        return

    for post in expired_posts:
        db.delete(post)
    db.commit()


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


def build_comment_out(
    comment: Comment,
    username: str,
    avatar_path: str | None,
    reply_to_user_id: int | None = None,
    reply_to_username: str | None = None,
    likes_count: int = 0,
    liked_by_me: bool = False,
    can_delete: bool = False,
) -> CommentOut:
    return CommentOut(
        id=int(comment.id),
        post_id=int(comment.post_id),
        parent_id=int(comment.parent_id) if comment.parent_id is not None else None,
        author_id=int(comment.author_id),
        username=username,
        reply_to_user_id=reply_to_user_id,
        reply_to_username=reply_to_username,
        body=comment.body,
        avatar_url=build_avatar_url(avatar_path),
        created_at=comment.created_at or datetime.now(UTC),
        likes_count=likes_count,
        liked_by_me=liked_by_me,
        can_delete=can_delete,
        replies=[],
    )


def load_comment_reactions(
    db: Session,
    comment_ids: list[int],
    current_user_id: int,
) -> tuple[dict[int, int], set[int]]:
    if not comment_ids:
        return {}, set()

    like_counts_rows = (
        db.query(CommentLike.comment_id, func.count(CommentLike.id))
        .filter(CommentLike.comment_id.in_(comment_ids))
        .group_by(CommentLike.comment_id)
        .all()
    )
    liked_rows = (
        db.query(CommentLike.comment_id)
        .filter(CommentLike.comment_id.in_(comment_ids), CommentLike.user_id == current_user_id)
        .all()
    )

    like_counts = {int(comment_id): int(likes_count) for comment_id, likes_count in like_counts_rows}
    liked_comment_ids = {int(comment_id) for comment_id, in liked_rows}
    return like_counts, liked_comment_ids


def load_post_comments(
    db: Session,
    post_ids: list[int],
    current_user_id: int,
    post_author_ids: dict[int, int],
) -> tuple[dict[int, list[CommentOut]], dict[int, int]]:
    comments_by_post = {post_id: [] for post_id in post_ids}
    comment_counts = {post_id: 0 for post_id in post_ids}
    if not post_ids:
        return comments_by_post, comment_counts

    reply_user = aliased(User)
    rows = (
        db.query(
            Comment,
            User.username,
            User.avatar_path,
            reply_user.username,
        )
        .select_from(Comment)
        .join(User, Comment.author_id == User.id)
        .join(reply_user, Comment.reply_to_user_id == reply_user.id, isouter=True)
        .filter(Comment.post_id.in_(post_ids))
        .order_by(Comment.created_at.asc(), Comment.id.asc())
        .all()
    )
    comment_ids = [int(comment.id) for comment, _, _, _ in rows]
    like_counts, liked_comment_ids = load_comment_reactions(db, comment_ids, current_user_id)

    comments_by_id: dict[int, CommentOut] = {}
    parent_by_comment_id: dict[int, int | None] = {}
    ordered_comments: list[CommentOut] = []
    for comment, username, avatar_path, reply_to_username in rows:
        comment_id = int(comment.id)
        post_id = int(comment.post_id)
        parent_by_comment_id[comment_id] = int(comment.parent_id) if comment.parent_id is not None else None
        comment_counts[post_id] = comment_counts.get(post_id, 0) + 1
        comment_out = build_comment_out(
            comment,
            username,
            avatar_path,
            reply_to_user_id=int(comment.reply_to_user_id) if comment.reply_to_user_id is not None else None,
            reply_to_username=reply_to_username,
            likes_count=like_counts.get(comment_id, 0),
            liked_by_me=comment_id in liked_comment_ids,
            can_delete=(
                int(comment.author_id) == current_user_id
                or post_author_ids.get(post_id) == current_user_id
            ),
        )
        comments_by_id[comment_id] = comment_out
        ordered_comments.append(comment_out)

    root_parent_by_comment_id: dict[int, int | None] = {}
    for comment_id in parent_by_comment_id:
        root_parent_id = parent_by_comment_id.get(comment_id)
        while root_parent_id is not None and parent_by_comment_id.get(root_parent_id) is not None:
            root_parent_id = parent_by_comment_id[root_parent_id]
        root_parent_by_comment_id[comment_id] = root_parent_id

    for comment_out in ordered_comments:
        root_parent_id = root_parent_by_comment_id.get(comment_out.id)
        if root_parent_id and root_parent_id in comments_by_id:
            comment_out.parent_id = root_parent_id
            comments_by_id[root_parent_id].replies.append(comment_out)
        else:
            comments_by_post.setdefault(comment_out.post_id, []).append(comment_out)

    return comments_by_post, comment_counts


def load_following_author_ids(db: Session, author_ids: set[int], current_user_id: int) -> set[int]:
    if not author_ids:
        return set()

    rows = (
        db.query(Follow.following_id)
        .filter(Follow.follower_id == current_user_id, Follow.following_id.in_(author_ids))
        .all()
    )
    return {int(author_id) for author_id, in rows}


def collect_comment_tree_ids(db: Session, root_comment_id: int) -> list[int]:
    comment_ids = [root_comment_id]
    cursor = [root_comment_id]

    while cursor:
        child_rows = db.query(Comment.id).filter(Comment.parent_id.in_(cursor)).all()
        cursor = [int(comment_id) for comment_id, in child_rows]
        comment_ids.extend(cursor)

    return comment_ids


def build_comment_like_payload(db: Session, comment_id: int, current_user_id: int) -> CommentLikeOut:
    likes_count = (
        db.query(func.count(CommentLike.id))
        .filter(CommentLike.comment_id == comment_id)
        .scalar()
        or 0
    )
    liked_by_me = (
        db.query(CommentLike.id)
        .filter(CommentLike.comment_id == comment_id, CommentLike.user_id == current_user_id)
        .first()
        is not None
    )
    return CommentLikeOut(
        comment_id=comment_id,
        likes_count=int(likes_count),
        liked_by_me=liked_by_me,
    )


@router.get("/posts", response_model=list[PostOut])
def get_posts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    purge_expired_deleted_posts(db)
    rows = (
        db.query(Post, User.username, User.avatar_path)
        .join(User, Post.author_id == User.id)
        .filter(Post.delete_scheduled_at.is_(None))
        .order_by(Post.created_at.desc(), Post.id.desc())
        .all()
    )

    post_ids = [int(post.id) for post, _, _ in rows]
    post_author_ids = {int(post.id): int(post.author_id) for post, _, _ in rows}
    following_author_ids = load_following_author_ids(db, set(post_author_ids.values()), int(current_user.id))
    like_counts, liked_post_ids = load_post_reactions(db, post_ids, current_user.id)
    comments_by_post, comment_counts = load_post_comments(db, post_ids, current_user.id, post_author_ids)

    return [
        to_post_out(
            post,
            username,
            avatar_path,
            likes_count=like_counts.get(int(post.id), 0),
            liked_by_me=int(post.id) in liked_post_ids,
            can_delete=int(post.author_id) == int(current_user.id),
            is_following_author=int(post.author_id) in following_author_ids,
            comments_count=comment_counts.get(int(post.id), 0),
            comments=comments_by_post.get(int(post.id), []),
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

    return to_post_out(post, current_user.username, current_user.avatar_path, can_delete=True)


@router.post("/posts/{post_id}/delete", response_model=PostDeleteOut)
def schedule_post_delete(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    purge_expired_deleted_posts(db)
    post = get_post_or_404(db, post_id)
    if int(post.author_id) != int(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can delete only your posts")

    if post.delete_scheduled_at is None:
        post.delete_scheduled_at = datetime.now(UTC) + timedelta(seconds=POST_RESTORE_WINDOW_SECONDS)
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(status_code=500, detail="Could not schedule post deletion")
        db.refresh(post)

    return PostDeleteOut(post_id=int(post.id), delete_scheduled_at=post.delete_scheduled_at, deleted=False)


@router.post("/posts/{post_id}/restore", response_model=PostDeleteOut)
def restore_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    purge_expired_deleted_posts(db)
    post = get_post_or_404(db, post_id)
    if int(post.author_id) != int(current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can restore only your posts")
    if post.delete_scheduled_at is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Post is not pending deletion")

    post.delete_scheduled_at = None
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not restore post")

    return PostDeleteOut(post_id=int(post.id), delete_scheduled_at=None, deleted=False)


@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def create_comment(
    post_id: int,
    payload: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_post_or_404(db, post_id)

    normalized_body = payload.body.strip()
    if not normalized_body:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Comment cannot be empty",
        )
    if len(normalized_body) > MAX_COMMENT_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Comment must be <= {MAX_COMMENT_LENGTH} characters",
        )

    parent_id = payload.parent_id
    reply_to_user_id = None
    if parent_id is not None:
        parent_comment = get_comment_or_404(db, parent_id)
        if int(parent_comment.post_id) != post_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Parent comment belongs to another post",
            )
        reply_to_user_id = int(parent_comment.author_id)
        if parent_comment.parent_id is not None:
            parent_id = int(parent_comment.parent_id)

    comment = Comment(
        post_id=post_id,
        author_id=current_user.id,
        parent_id=parent_id,
        reply_to_user_id=reply_to_user_id,
        body=normalized_body,
    )
    db.add(comment)
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save comment. Please try again.",
        )
    db.refresh(comment)

    reply_to_username = None
    if reply_to_user_id is not None:
        reply_to_user = db.query(User).filter(User.id == reply_to_user_id).first()
        reply_to_username = reply_to_user.username if reply_to_user else None

    return build_comment_out(
        comment,
        current_user.username,
        current_user.avatar_path,
        reply_to_user_id=reply_to_user_id,
        reply_to_username=reply_to_username,
        can_delete=True,
    )


@router.delete("/comments/{comment_id}", response_model=CommentDeleteOut)
def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = get_comment_or_404(db, comment_id)
    post = get_post_or_404(db, int(comment.post_id))

    if int(comment.author_id) != int(current_user.id) and int(post.author_id) != int(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can delete only your comments or comments under your posts",
        )

    deleted_comment_ids = collect_comment_tree_ids(db, int(comment.id))
    try:
        db.query(CommentLike).filter(CommentLike.comment_id.in_(deleted_comment_ids)).delete(
            synchronize_session=False
        )
        db.query(Comment).filter(Comment.id.in_(deleted_comment_ids)).delete(synchronize_session=False)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not delete comment. Please try again.",
        )

    comments_count = (
        db.query(func.count(Comment.id))
        .filter(Comment.post_id == post.id)
        .scalar()
        or 0
    )
    return CommentDeleteOut(
        post_id=int(post.id),
        deleted_comment_ids=deleted_comment_ids,
        comments_count=int(comments_count),
    )


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


@router.post("/comments/{comment_id}/like", response_model=CommentLikeOut)
def like_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_comment_or_404(db, comment_id)

    existing_like = (
        db.query(CommentLike)
        .filter(CommentLike.comment_id == comment_id, CommentLike.user_id == current_user.id)
        .first()
    )
    if not existing_like:
        db.add(CommentLike(comment_id=comment_id, user_id=current_user.id))
        try:
            db.commit()
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not save comment like. Please try again.",
            )

    return build_comment_like_payload(db, comment_id, current_user.id)


@router.delete("/comments/{comment_id}/like", response_model=CommentLikeOut)
def unlike_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_comment_or_404(db, comment_id)

    existing_like = (
        db.query(CommentLike)
        .filter(CommentLike.comment_id == comment_id, CommentLike.user_id == current_user.id)
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
                detail="Could not remove comment like. Please try again.",
            )

    return build_comment_like_payload(db, comment_id, current_user.id)
