import { useEffect } from "react";

export function CreatePostModal({
  open,
  caption,
  previewUrl,
  error,
  isSubmitting,
  onCaptionChange,
  onClose,
  onFileChange,
  onSubmit,
}) {
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

  if (!open) {
    return null;
  }

  return (
    <>
      <div className="modal-backdrop is-visible" onClick={onClose} aria-hidden="true" />
      <section className="create-post-modal" role="dialog" aria-modal="true" aria-labelledby="create-post-title">
        <div className="create-post-modal__header">
          <div className="create-post-modal__title" id="create-post-title">
            Новый пост
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть окно">
            ✕
          </button>
        </div>

        <form className="create-post-modal__form" onSubmit={onSubmit}>
          <label className="form-field">
            <span className="form-field__label">Фото</span>
            <input
              className="form-field__input"
              type="file"
              accept="image/*"
              onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
              required
            />
          </label>

          {previewUrl ? (
            <img className="create-post-modal__preview" src={previewUrl} alt="Предпросмотр поста" />
          ) : (
            <div className="create-post-modal__placeholder">Выбери изображение, чтобы увидеть превью.</div>
          )}

          <label className="form-field">
            <span className="form-field__label">Описание</span>
            <textarea
              className="form-field__input form-field__input--textarea"
              rows="4"
              maxLength="2200"
              placeholder="О чем этот пост?"
              value={caption}
              onChange={(event) => onCaptionChange(event.target.value)}
            />
          </label>

          <div className="create-post-modal__footer">
            <div className="form-error" aria-live="polite">
              {error}
            </div>
            <button className="button button--primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Публикуем..." : "Опубликовать"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
