import { useEffect, useState } from "react";

import { formatPostDate, resolveMediaUrl } from "../lib/api.js";

function AuthorBadge({ authorId, username, avatarUrl, onProfileOpen }) {
  const avatarLetter = (username?.trim()?.[0] ?? "?").toUpperCase();
  const resolvedAvatarUrl = resolveMediaUrl(avatarUrl);

  return (
    <button className="author-badge" type="button" onClick={() => onProfileOpen?.(authorId)}>
      <div className="author-badge__avatar">
        {resolvedAvatarUrl ? (
          <img className="author-badge__avatar-image" src={resolvedAvatarUrl} alt={`Аватар пользователя ${username}`} />
        ) : (
          <span aria-hidden="true">{avatarLetter}</span>
        )}
      </div>
      <span className="author-badge__name">{username}</span>
    </button>
  );
}

function CommentCard({
  comment,
  onProfileOpen,
  onReplySubmit,
  onCommentLikeToggle,
  onCommentDelete,
  pendingCommentLikeIds,
  pendingReplyIds,
  pendingCommentDeleteIds,
  isReply = false,
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
    <article className={`comment-card${isReply ? " comment-card--reply" : ""}`}>
      <div className="comment-card__row">
        <AuthorBadge
          authorId={comment.author_id}
          username={comment.username}
          avatarUrl={comment.avatar_url}
          onProfileOpen={onProfileOpen}
        />
        <div className="comment-card__content">
          <div className="comment-card__body">
            {comment.reply_to_username ? (
              <button
                className="comment-card__reply-tag"
                type="button"
                onClick={() => onProfileOpen?.(comment.reply_to_user_id ?? comment.author_id)}
              >
                @{comment.reply_to_username}
              </button>
            ) : null}
            <span>{comment.body}</span>
          </div>
          <div className="comment-card__meta">
            <span>{formatPostDate(comment.created_at)}</span>
            <button
              className={`comment__like-button${comment.liked_by_me ? " is-active" : ""}`}
              type="button"
              aria-label={likeButtonLabel}
              aria-pressed={comment.liked_by_me}
              disabled={isLikePending}
              onClick={() => onCommentLikeToggle?.(comment.id, comment.liked_by_me)}
            >
              {comment.liked_by_me ? "\u2665" : "\u2661"} {likesCount}
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
        </div>
      </div>
    </article>
  );
}

function CommentThread(props) {
  const { comment } = props;
  const replies = Array.isArray(comment.replies) ? comment.replies : [];
  const [repliesOpen, setRepliesOpen] = useState(false);

  return (
    <div className="comment-thread">
      <CommentCard {...props} />

      {replies.length ? (
        <div className="comment-thread__replies">
          <button className="comment-thread__toggle" type="button" onClick={() => setRepliesOpen((current) => !current)}>
            {repliesOpen ? "Скрыть ответы" : `Показать ответы (${replies.length})`}
          </button>

          {repliesOpen ? (
            <div className="comment-thread__list">
              {replies.map((reply) => (
                <CommentCard key={reply.id} {...props} comment={reply} isReply />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CommentsModal({
  post,
  open,
  onClose,
  onProfileOpen,
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
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  onProfileOpen={onProfileOpen}
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

function PendingDeleteCard({ post, secondsLeft, isRestorePending, onRestore }) {
  return (
    <article className="post-card post-card--pending-delete">
      <div className="post-card__pending-title">Пост скрыт перед удалением</div>
      <div className="post-card__pending-text">
        Его можно восстановить ещё {secondsLeft} сек.
      </div>
      <button className="post-card__restore-button" type="button" disabled={isRestorePending} onClick={() => onRestore?.(post.id)}>
        {isRestorePending ? "..." : "Восстановить"}
      </button>
    </article>
  );
}

export function PostCard({
  post,
  onProfileOpen,
  onFollowToggle,
  onPostDelete,
  onPostRestore,
  onLikeToggle,
  onCommentSubmit,
  onCommentLikeToggle,
  onCommentDelete,
  isLikePending = false,
  isFollowPending = false,
  isDeletePending = false,
  isRestorePending = false,
  isCommentPending = false,
  pendingCommentLikeIds = {},
  pendingReplyIds = {},
  pendingCommentDeleteIds = {},
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const caption = post.caption?.trim();
  const likesCount = Number(post.likes_count) || 0;
  const commentsCount = Number(post.comments_count) || 0;
  const likeButtonLabel = post.liked_by_me ? "Убрать лайк" : "Поставить лайк";
  const isOwnPost = Boolean(post.can_delete);
  const isPendingDelete = Boolean(post.delete_scheduled_at);

  useEffect(() => {
    if (!post.delete_scheduled_at) {
      setSecondsLeft(0);
      return undefined;
    }

    const updateTimer = () => {
      const diffMs = new Date(post.delete_scheduled_at).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(diffMs / 1000)));
    };

    updateTimer();
    const timerId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timerId);
  }, [post.delete_scheduled_at]);

  if (isPendingDelete) {
    return (
      <PendingDeleteCard
        post={post}
        secondsLeft={secondsLeft}
        isRestorePending={isRestorePending}
        onRestore={onPostRestore}
      />
    );
  }

  return (
    <article className="post-card">
      <header className="post-card__header">
        <div className="post-card__author">
          <AuthorBadge
            authorId={post.author_id}
            username={post.username}
            avatarUrl={post.avatar_url}
            onProfileOpen={onProfileOpen}
          />
          <div className="post-card__time">{formatPostDate(post.created_at)}</div>
        </div>

        {isOwnPost ? (
          <button className="post-card__delete-button" type="button" disabled={isDeletePending} onClick={() => onPostDelete?.(post.id)}>
            {isDeletePending ? "..." : "Удалить пост"}
          </button>
        ) : onFollowToggle ? (
          <button
            className={`post-card__follow-button${post.is_following_author ? " is-active" : ""}`}
            type="button"
            disabled={isFollowPending}
            onClick={() => onFollowToggle(post.author_id, post.is_following_author)}
          >
            {isFollowPending ? "..." : post.is_following_author ? "Подписан" : "Подписаться"}
          </button>
        ) : null}
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
        <button className="post-card__action-button" type="button" aria-label="Открыть комментарии" onClick={() => setCommentsOpen(true)}>
          <svg className="post-card__comment-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M20.5 11.4c0 4.1-3.8 7.4-8.5 7.4-1.1 0-2.1-.2-3.1-.5L4 20l1.4-4c-1.2-1.3-1.9-2.9-1.9-4.6C3.5 7.3 7.3 4 12 4s8.5 3.3 8.5 7.4Z" />
          </svg>
        </button>
      </div>

      <div className="post-card__likes">{likesCount} лайков</div>
      <button className="post-card__comments-link" type="button" onClick={() => setCommentsOpen(true)}>
        Комментарии: {commentsCount}
      </button>
      <p className="post-card__caption">{caption || "Без описания."}</p>

      <CommentsModal
        post={post}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        onProfileOpen={onProfileOpen}
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
