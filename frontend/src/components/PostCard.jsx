import { useState } from "react";

import { formatPostDate, resolveMediaUrl } from "../lib/api.js";

function CommentItem({
  comment,
  onReplySubmit,
  onCommentLikeToggle,
  onCommentDelete,
  pendingCommentLikeIds,
  pendingReplyIds,
  pendingCommentDeleteIds,
}) {
  const [replyText, setReplyText] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);

  const likesCount = Number(comment.likes_count) || 0;
  const isLikePending = Boolean(pendingCommentLikeIds?.[comment.id]);
  const isReplyPending = Boolean(pendingReplyIds?.[comment.id]);
  const isDeletePending = Boolean(pendingCommentDeleteIds?.[comment.id]);
  const replyBody = replyText.trim();
  const likeButtonLabel = comment.liked_by_me ? "Убрать лайк с комментария" : "Поставить лайк комментарию";

  const handleReplySubmit = async (event) => {
    event.preventDefault();

    if (!replyBody) {
      return;
    }

    const saved = await onReplySubmit?.(comment.id, replyBody);
    if (saved) {
      setReplyText("");
      setReplyOpen(false);
    }
  };

  return (
    <div className="comment">
      <div className="comment__body">
        <span className="comment__author">{comment.username}</span>
        <span>{comment.body}</span>
      </div>

      <div className="comment__meta">
        <span>{formatPostDate(comment.created_at)}</span>
        <button
          className={`comment__like-button${comment.liked_by_me ? " is-active" : ""}`}
          type="button"
          aria-label={likeButtonLabel}
          aria-pressed={comment.liked_by_me}
          disabled={isLikePending}
          onClick={() => onCommentLikeToggle?.(comment.id, comment.liked_by_me)}
        >
          {comment.liked_by_me ? "♥" : "♡"} {likesCount}
        </button>
        <button className="comment__reply-button" type="button" onClick={() => setReplyOpen((current) => !current)}>
          Ответить
        </button>
        {comment.can_delete ? (
          <button
            className="comment__delete-button"
            type="button"
            aria-label="Удалить комментарий"
            disabled={isDeletePending}
            onClick={() => onCommentDelete?.(comment.id)}
          >
            Удалить
          </button>
        ) : null}
      </div>

      {replyOpen ? (
        <form className="comment-form comment-form--reply" onSubmit={handleReplySubmit}>
          <input
            className="comment-form__input"
            type="text"
            value={replyText}
            maxLength={1000}
            placeholder={`Ответить ${comment.username}`}
            onChange={(event) => setReplyText(event.target.value)}
          />
          <button className="comment-form__button" type="submit" disabled={!replyBody || isReplyPending}>
            {isReplyPending ? "..." : "Ответ"}
          </button>
        </form>
      ) : null}

      {comment.replies?.length ? (
        <div className="comment__replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReplySubmit={onReplySubmit}
              onCommentLikeToggle={onCommentLikeToggle}
              onCommentDelete={onCommentDelete}
              pendingCommentLikeIds={pendingCommentLikeIds}
              pendingReplyIds={pendingReplyIds}
              pendingCommentDeleteIds={pendingCommentDeleteIds}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CommentsModal({
  post,
  open,
  onClose,
  onCommentSubmit,
  onCommentLikeToggle,
  onCommentDelete,
  isCommentPending,
  pendingCommentLikeIds,
  pendingReplyIds,
  pendingCommentDeleteIds,
}) {
  const [commentText, setCommentText] = useState("");

  if (!open) {
    return null;
  }

  const commentsCount = Number(post.comments_count) || 0;
  const comments = Array.isArray(post.comments) ? post.comments : [];
  const commentBody = commentText.trim();

  const handleCommentSubmit = async (event) => {
    event.preventDefault();

    if (!commentBody) {
      return;
    }

    const saved = await onCommentSubmit?.(post.id, commentBody, null);
    if (saved) {
      setCommentText("");
    }
  };

  return (
    <>
      <div className="modal-backdrop comments-modal__backdrop is-visible" onClick={onClose} />

      <section className="comments-modal" role="dialog" aria-modal="true" aria-labelledby={`comments-title-${post.id}`}>
        <header className="comments-modal__header">
          <div id={`comments-title-${post.id}`} className="comments-modal__title">
            Комментарии ({commentsCount})
          </div>
          <button className="icon-button" type="button" aria-label="Закрыть комментарии" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="comments-modal__body">
          {comments.length ? (
            <div className="post-card__comments-list">
              {comments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  onReplySubmit={(parentId, body) => onCommentSubmit?.(post.id, body, parentId)}
                  onCommentLikeToggle={onCommentLikeToggle}
                  onCommentDelete={onCommentDelete}
                  pendingCommentLikeIds={pendingCommentLikeIds}
                  pendingReplyIds={pendingReplyIds}
                  pendingCommentDeleteIds={pendingCommentDeleteIds}
                />
              ))}
            </div>
          ) : (
            <div className="post-card__comments-empty">Комментариев пока нет.</div>
          )}
        </div>

        <form className="comment-form comments-modal__form" onSubmit={handleCommentSubmit}>
          <input
            className="comment-form__input"
            type="text"
            value={commentText}
            maxLength={1000}
            placeholder="Добавить комментарий"
            onChange={(event) => setCommentText(event.target.value)}
          />
          <button className="comment-form__button" type="submit" disabled={!commentBody || isCommentPending}>
            {isCommentPending ? "..." : "Отправить"}
          </button>
        </form>
      </section>
    </>
  );
}

export function PostCard({
  post,
  onLikeToggle,
  onCommentSubmit,
  onCommentLikeToggle,
  onCommentDelete,
  isLikePending = false,
  isCommentPending = false,
  pendingCommentLikeIds = {},
  pendingReplyIds = {},
  pendingCommentDeleteIds = {},
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);

  const avatarLetter = (post.username?.trim()?.[0] ?? "?").toUpperCase();
  const avatarUrl = resolveMediaUrl(post.avatar_url);
  const caption = post.caption?.trim();
  const likesCount = Number(post.likes_count) || 0;
  const commentsCount = Number(post.comments_count) || 0;
  const likeButtonLabel = post.liked_by_me ? "Убрать лайк" : "Поставить лайк";

  return (
    <article className="post-card">
      <header className="post-card__header">
        <div className="post-card__author">
          <div className="post-card__avatar">
            {avatarUrl ? (
              <img
                className="post-card__avatar-image"
                src={avatarUrl}
                alt={`Аватар пользователя ${post.username}`}
              />
            ) : (
              <span aria-hidden="true">{avatarLetter}</span>
            )}
          </div>
          <div>
            <div className="post-card__username">{post.username}</div>
            <div className="post-card__time">{formatPostDate(post.created_at)}</div>
          </div>
        </div>
        <div className="post-card__menu" aria-hidden="true">
          ...
        </div>
      </header>

      <img
        className="post-card__media"
        src={resolveMediaUrl(post.image_url)}
        alt={`Пост пользователя ${post.username}`}
        loading="lazy"
      />

      <div className="post-card__actions">
        <button
          className={`post-card__action-button${post.liked_by_me ? " is-active" : ""}`}
          type="button"
          aria-label={likeButtonLabel}
          aria-pressed={post.liked_by_me}
          disabled={isLikePending}
          onClick={() => onLikeToggle?.(post.id, post.liked_by_me)}
        >
          {post.liked_by_me ? "\u2665" : "\u2661"}
        </button>
        <button
          className="post-card__action-button"
          type="button"
          aria-label="Открыть комментарии"
          onClick={() => setCommentsOpen(true)}
        >
          <svg
            className="post-card__comment-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M20.5 11.4c0 4.1-3.8 7.4-8.5 7.4-1.1 0-2.1-.2-3.1-.5L4 20l1.4-4c-1.2-1.3-1.9-2.9-1.9-4.6C3.5 7.3 7.3 4 12 4s8.5 3.3 8.5 7.4Z" />
          </svg>
        </button>
      </div>

      <div className="post-card__likes">{likesCount} лайков</div>
      <p className="post-card__caption">{caption || "Без описания."}</p>

      <CommentsModal
        post={post}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onCommentSubmit={onCommentSubmit}
        onCommentLikeToggle={onCommentLikeToggle}
        onCommentDelete={onCommentDelete}
        isCommentPending={isCommentPending}
        pendingCommentLikeIds={pendingCommentLikeIds}
        pendingReplyIds={pendingReplyIds}
        pendingCommentDeleteIds={pendingCommentDeleteIds}
      />
    </article>
  );
}
