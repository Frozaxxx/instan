import { useEffect, useRef, useState } from "react";

const VIEWPORT_SIZE = 280;
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getViewportMetrics(imageSize, zoom) {
  if (!imageSize.width || !imageSize.height) {
    return {
      width: 0,
      height: 0,
      maxOffsetX: 0,
      maxOffsetY: 0,
    };
  }

  const baseScale = Math.max(VIEWPORT_SIZE / imageSize.width, VIEWPORT_SIZE / imageSize.height);
  const width = imageSize.width * baseScale * zoom;
  const height = imageSize.height * baseScale * zoom;

  return {
    width,
    height,
    maxOffsetX: Math.max(0, (width - VIEWPORT_SIZE) / 2),
    maxOffsetY: Math.max(0, (height - VIEWPORT_SIZE) / 2),
  };
}

function clampPosition(position, metrics) {
  return {
    x: clamp(position.x, -metrics.maxOffsetX, metrics.maxOffsetX),
    y: clamp(position.y, -metrics.maxOffsetY, metrics.maxOffsetY),
  };
}

export function AvatarCropModal({
  open,
  sourceUrl,
  error,
  isSubmitting,
  onClose,
  onSave,
}) {
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const imageRef = useRef(null);
  const dragStateRef = useRef(null);

  const metrics = getViewportMetrics(imageSize, zoom);

  useEffect(() => {
    if (!open || !sourceUrl) {
      return undefined;
    }

    setZoom(MIN_ZOOM);
    setPosition({ x: 0, y: 0 });
    setImageSize({ width: 0, height: 0 });

    const image = new Image();
    image.onload = () => {
      setImageSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.src = sourceUrl;

    return () => {
      image.onload = null;
    };
  }, [open, sourceUrl]);

  useEffect(() => {
    setPosition((current) => {
      const next = clampPosition(current, metrics);
      if (next.x === current.x && next.y === current.y) {
        return current;
      }
      return next;
    });
  }, [metrics.width, metrics.height, metrics.maxOffsetX, metrics.maxOffsetY]);

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

  const handlePointerDown = (event) => {
    if (!metrics.width || !metrics.height) {
      return;
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const nextPosition = {
      x: dragState.originX + event.clientX - dragState.startX,
      y: dragState.originY + event.clientY - dragState.startY,
    };

    setPosition(clampPosition(nextPosition, metrics));
  };

  const handlePointerUp = (event) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleZoomChange = (event) => {
    setZoom(Number(event.target.value));
  };

  const handleSave = async () => {
    if (!imageRef.current || !metrics.width || !metrics.height) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const outputRatio = OUTPUT_SIZE / VIEWPORT_SIZE;
    const drawX = (VIEWPORT_SIZE - metrics.width) / 2 + position.x;
    const drawY = (VIEWPORT_SIZE - metrics.height) / 2 + position.y;

    context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.save();
    context.scale(outputRatio, outputRatio);
    context.beginPath();
    context.arc(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2, 0, Math.PI * 2);
    context.clip();
    context.drawImage(imageRef.current, drawX, drawY, metrics.width, metrics.height);
    context.restore();

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png", 0.92);
    });

    if (!blob) {
      return;
    }

    await onSave(blob);
  };

  const previewTransform = {
    width: metrics.width ? `${metrics.width}px` : "auto",
    height: metrics.height ? `${metrics.height}px` : "auto",
    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
  };

  return (
    <>
      <div className="modal-backdrop is-visible" onClick={onClose} aria-hidden="true" />

      <section className="avatar-crop-modal" role="dialog" aria-modal="true" aria-labelledby="avatar-crop-title">
        <div className="avatar-crop-modal__header">
          <div className="avatar-crop-modal__title" id="avatar-crop-title">
            Обрезка аватара
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Закрыть окно">
            ×
          </button>
        </div>

        <div className="avatar-crop-modal__body">
          <div className="avatar-crop-modal__hint">
            Перетаскивай фото внутри круга и меняй масштаб, чтобы выбрать область аватарки.
          </div>

          <div
            className="avatar-crop-stage"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {sourceUrl ? (
              <img
                ref={imageRef}
                className="avatar-crop-stage__image"
                src={sourceUrl}
                alt="Предпросмотр обрезки аватара"
                draggable="false"
                style={previewTransform}
              />
            ) : null}
            <div className="avatar-crop-stage__shade" aria-hidden="true" />
            <div className="avatar-crop-stage__frame" aria-hidden="true" />
          </div>

          <label className="avatar-crop-modal__slider">
            <span>Масштаб</span>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step="0.01"
              value={zoom}
              onChange={handleZoomChange}
            />
          </label>

          <div className="form-error" aria-live="polite">
            {error}
          </div>

          <div className="avatar-crop-modal__actions">
            <button className="button button--secondary" type="button" onClick={onClose} disabled={isSubmitting}>
              Отмена
            </button>
            <button className="button button--primary" type="button" onClick={handleSave} disabled={isSubmitting || !metrics.width}>
              {isSubmitting ? "Сохраняем..." : "Сохранить аватар"}
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
