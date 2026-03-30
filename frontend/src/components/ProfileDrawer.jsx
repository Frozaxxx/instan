import { useEffect, useRef } from "react";

import { resolveMediaUrl } from "../lib/api.js";

export function ProfileDrawer({
  me,
  open,
  postCount,
  profileExpanded,
  avatarFeedback,
  isAvatarUploading,
  onAvatarSelect,
  onClose,
  onToggleProfile,
  onLogout,
}) {
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const avatarLetter = (me?.username?.trim()?.[0] ?? "?").toUpperCase();
  const avatarUrl = resolveMediaUrl(me?.avatar_url);

  const handleAvatarButtonClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarInputChange = (event) => {
    const nextFile = event.target.files?.[0] ?? null;
    onAvatarSelect(nextFile);
    event.target.value = "";
  };

  return (
    <>
      <div
        className={`drawer-backdrop ${open ? "is-visible" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside className={`profile-drawer ${open ? "is-open" : ""}`} aria-hidden={!open}>
        <div className="profile-drawer__header">
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть меню">
            ←
          </button>
          <div className="profile-drawer__title">Аккаунт</div>
        </div>

        <div className="profile-drawer__body">
          <section className="profile-drawer__summary">
            <div className="profile-drawer__avatar-shell">
              <div className="profile-drawer__avatar">
                {avatarUrl ? (
                  <img
                    className="profile-drawer__avatar-image"
                    src={avatarUrl}
                    alt={`Аватар пользователя ${me?.username || "user"}`}
                  />
                ) : (
                  <span aria-hidden="true">{avatarLetter}</span>
                )}
              </div>

              <button
                className="avatar-edit-button"
                type="button"
                onClick={handleAvatarButtonClick}
                aria-label="Изменить аватар"
                disabled={isAvatarUploading}
              >
                <span className="avatar-edit-button__icon" aria-hidden="true">
                  ✎
                </span>
              </button>

              <input
                ref={avatarInputRef}
                className="visually-hidden"
                type="file"
                accept="image/*"
                onChange={handleAvatarInputChange}
              />
            </div>

            <div>
              <div className="profile-drawer__name">{me?.full_name || me?.username || "..."}</div>
              <div className="profile-drawer__handle">@{me?.username || "user"}</div>
              <div className="profile-drawer__meta">{me?.email || "..."}</div>
              <div className={`profile-drawer__hint ${avatarFeedback ? "is-visible" : ""}`}>
                {avatarFeedback || "Нажми на карандаш, чтобы сменить фото."}
              </div>
            </div>
          </section>

          <div className="profile-drawer__actions">
            <button className="drawer-action" type="button" onClick={onToggleProfile}>
              {profileExpanded ? "Скрыть профиль" : "Открыть профиль"}
            </button>
            <button className="drawer-action drawer-action--danger" type="button" onClick={onLogout}>
              Выйти
            </button>
          </div>

          <section className={`profile-drawer__details ${profileExpanded ? "is-open" : ""}`}>
            <div className="profile-drawer__section-title">Сводка профиля</div>
            <div className="profile-stats">
              <div className="profile-stats__card">
                <div className="profile-stats__value">{postCount}</div>
                <div className="profile-stats__label">посты</div>
              </div>
              <div className="profile-stats__card">
                <div className="profile-stats__value">{me?.followers_count ?? 0}</div>
                <div className="profile-stats__label">подписчики</div>
              </div>
              <div className="profile-stats__card">
                <div className="profile-stats__value">{me?.following_count ?? 0}</div>
                <div className="profile-stats__label">подписки</div>
              </div>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
