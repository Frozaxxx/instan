import { useEffect } from "react";

import { resolveMediaUrl } from "../lib/api.js";

export function UserProfileModal({ profile, open, isFollowPending, onClose, onFollowToggle }) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !profile) {
    return null;
  }

  const avatarLetter = (profile.username?.trim()?.[0] ?? "?").toUpperCase();
  const avatarUrl = resolveMediaUrl(profile.avatar_url);

  return (
    <>
      <div className="modal-backdrop profile-modal__backdrop is-visible" onClick={onClose} />

      <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby={`profile-title-${profile.id}`}>
        <header className="profile-modal__header">
          <div id={`profile-title-${profile.id}`} className="profile-modal__title">
            Профиль
          </div>
          <button className="icon-button" type="button" aria-label="Закрыть профиль" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="profile-modal__body">
          <div className="profile-modal__identity">
            <div className="profile-modal__avatar">
              {avatarUrl ? (
                <img className="profile-modal__avatar-image" src={avatarUrl} alt={`Аватар пользователя ${profile.username}`} />
              ) : (
                <span aria-hidden="true">{avatarLetter}</span>
              )}
            </div>

            <div className="profile-modal__text">
              <div className="profile-modal__name">{profile.full_name || profile.username}</div>
              <div className="profile-modal__handle">@{profile.username}</div>
            </div>
          </div>

          <div className="profile-modal__stats">
            <div className="profile-modal__stat">
              <div className="profile-modal__stat-value">{profile.posts_count ?? 0}</div>
              <div className="profile-modal__stat-label">посты</div>
            </div>
            <div className="profile-modal__stat">
              <div className="profile-modal__stat-value">{profile.followers_count ?? 0}</div>
              <div className="profile-modal__stat-label">подписчики</div>
            </div>
            <div className="profile-modal__stat">
              <div className="profile-modal__stat-value">{profile.following_count ?? 0}</div>
              <div className="profile-modal__stat-label">подписки</div>
            </div>
          </div>

          {!profile.is_me ? (
            <button
              className={`profile-modal__follow-button${profile.is_following ? " is-active" : ""}`}
              type="button"
              disabled={isFollowPending}
              onClick={() => onFollowToggle?.(profile.id, profile.is_following)}
            >
              {isFollowPending ? "..." : profile.is_following ? "Вы подписаны" : "Подписаться"}
            </button>
          ) : null}
        </div>
      </section>
    </>
  );
}
