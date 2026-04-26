from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import distinct, func
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from auth import require_admin
from database import get_db
from models import Comment, CommentLike, Post, PostLike, User
from schemas import AdminActivityOut, AdminChartPointOut, AdminCommentOut, AdminMetricsOut, AdminPostOut, AdminUserOut

router = APIRouter(prefix="/admin", tags=["admin"])


def build_image_url(image_path: str) -> str:
    return f"/static/{image_path.lstrip('/')}"


def build_daily_series(rows: list[tuple], value_index: int = 1) -> list[AdminChartPointOut]:
    if not rows:
        return []

    normalized_rows = []
    for row in rows:
        day_value = row[0]
        if hasattr(day_value, "date"):
            day_value = day_value.date()
        normalized_rows.append((day_value, int(row[value_index] or 0)))

    values_by_day = {day: value for day, value in normalized_rows}
    current_day = min(values_by_day)
    last_day = max(values_by_day)
    series: list[AdminChartPointOut] = []

    while current_day <= last_day:
        series.append(
            AdminChartPointOut(
                date=current_day.isoformat(),
                value=values_by_day.get(current_day, 0),
            )
        )
        current_day += timedelta(days=1)

    return series


@router.get("/metrics", response_model=AdminMetricsOut)
def get_admin_metrics(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return AdminMetricsOut(
        users_count=int(db.query(func.count(User.id)).scalar() or 0),
        blocked_users_count=int(db.query(func.count(User.id)).filter(User.is_blocked != 0).scalar() or 0),
        posts_count=int(db.query(func.count(Post.id)).scalar() or 0),
        comments_count=int(db.query(func.count(Comment.id)).scalar() or 0),
        post_likes_count=int(db.query(func.count(PostLike.id)).scalar() or 0),
        comment_likes_count=int(db.query(func.count(CommentLike.id)).scalar() or 0),
    )


@router.get("/activity", response_model=AdminActivityOut)
def get_admin_activity(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    post_rows = (
        db.query(
            func.date_trunc("day", Post.created_at).label("day"),
            func.count(Post.id).label("posts_count"),
        )
        .group_by("day")
        .order_by("day")
        .all()
    )
    posting_user_rows = (
        db.query(
            func.date_trunc("day", Post.created_at).label("day"),
            func.count(distinct(Post.author_id)).label("users_count"),
        )
        .group_by("day")
        .order_by("day")
        .all()
    )

    return AdminActivityOut(
        posts_by_day=build_daily_series(post_rows),
        posting_users_by_day=build_daily_series(posting_user_rows),
    )


@router.get("/users", response_model=list[AdminUserOut])
def get_admin_users(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    post_counts = {
        int(user_id): int(count)
        for user_id, count in (
            db.query(Post.author_id, func.count(Post.id))
            .group_by(Post.author_id)
            .all()
        )
    }
    comment_counts = {
        int(user_id): int(count)
        for user_id, count in (
            db.query(Comment.author_id, func.count(Comment.id))
            .group_by(Comment.author_id)
            .all()
        )
    }

    users = db.query(User).order_by(User.id.desc()).all()
    return [
        AdminUserOut(
            id=int(user.id),
            username=user.username,
            full_name=user.full_name,
            email=user.email,
            is_blocked=int(user.is_blocked or 0) != 0,
            followers_count=int(user.followers_count or 0),
            following_count=int(user.following_count or 0),
            posts_count=post_counts.get(int(user.id), 0),
            comments_count=comment_counts.get(int(user.id), 0),
        )
        for user in users
    ]


@router.get("/posts", response_model=list[AdminPostOut])
def get_admin_posts(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    like_counts = {
        int(post_id): int(count)
        for post_id, count in (
            db.query(PostLike.post_id, func.count(PostLike.id))
            .group_by(PostLike.post_id)
            .all()
        )
    }
    comment_counts = {
        int(post_id): int(count)
        for post_id, count in (
            db.query(Comment.post_id, func.count(Comment.id))
            .group_by(Comment.post_id)
            .all()
        )
    }
    rows = (
        db.query(Post, User.username)
        .join(User, Post.author_id == User.id)
        .order_by(Post.created_at.desc(), Post.id.desc())
        .all()
    )
    return [
        AdminPostOut(
            id=int(post.id),
            author_id=int(post.author_id),
            username=username,
            caption=post.caption,
            image_url=build_image_url(post.image_path),
            created_at=post.created_at,
            likes_count=like_counts.get(int(post.id), 0),
            comments_count=comment_counts.get(int(post.id), 0),
        )
        for post, username in rows
    ]


@router.get("/comments", response_model=list[AdminCommentOut])
def get_admin_comments(
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    replies_counts = {
        int(parent_id): int(count)
        for parent_id, count in (
            db.query(Comment.parent_id, func.count(Comment.id))
            .filter(Comment.parent_id.isnot(None))
            .group_by(Comment.parent_id)
            .all()
        )
    }
    rows = (
        db.query(Comment, User.username)
        .join(User, Comment.author_id == User.id)
        .order_by(Comment.created_at.desc(), Comment.id.desc())
        .all()
    )
    return [
        AdminCommentOut(
            id=int(comment.id),
            post_id=int(comment.post_id),
            author_id=int(comment.author_id),
            username=username,
            body=comment.body,
            created_at=comment.created_at,
            replies_count=replies_counts.get(int(comment.id), 0),
        )
        for comment, username in rows
    ]


@router.delete("/posts/{post_id}")
def admin_delete_post(
    post_id: int,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    try:
        db.delete(post)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not delete post")

    return {"deleted": True, "post_id": post_id}


@router.delete("/comments/{comment_id}")
def admin_delete_comment(
    comment_id: int,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")

    try:
        db.delete(comment)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not delete comment")

    return {"deleted": True, "comment_id": comment_id}


@router.post("/users/{user_id}/block")
def admin_block_user(
    user_id: int,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_blocked = 1
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not block user")

    return {"user_id": user_id, "is_blocked": True}


@router.post("/users/{user_id}/unblock")
def admin_unblock_user(
    user_id: int,
    _: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_blocked = 0
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(status_code=500, detail="Could not unblock user")

    return {"user_id": user_id, "is_blocked": False}
