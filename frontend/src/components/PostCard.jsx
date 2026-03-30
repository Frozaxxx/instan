import { formatPostDate, resolveMediaUrl } from "../lib/api.js";

export function PostCard({ post, onLikeToggle, isLikePending = false }) {
  const avatarLetter = (post.username?.trim()?.[0] ?? "?").toUpperCase();
  const avatarUrl = resolveMediaUrl(post.avatar_url);
  const caption = post.caption?.trim();
  const likesCount = Number(post.likes_count) || 0;
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
      </div>

      <div className="post-card__likes">{likesCount} лайков</div>
      <p className="post-card__caption">{caption || "Без описания."}</p>
    </article>
  );
}
