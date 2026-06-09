"use client";

import { ChevronLeft, ChevronRight, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

type InviteGalleryProps = {
  images: string[];
  locale?: Language;
  className?: string;
  label?: string;
  altPrefix?: string;
};

function clampIndex(index: number, length: number) {
  if (!length) return 0;
  return (index + length) % length;
}

export function InviteGallery({ images, locale = "ar", className = "", label, altPrefix = "صورة من الدعوة" }: InviteGalleryProps) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const cleanImages = useMemo(() => images.filter(Boolean), [images]);
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const draggedRef = useRef(false);
  const activeIndex = clampIndex(active, cleanImages.length);

  useEffect(() => {
    if (!fullscreen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setFullscreen(false);
        setZoomed(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fullscreen]);

  if (!cleanImages.length) return null;

  function go(nextIndex: number) {
    setActive(clampIndex(nextIndex, cleanImages.length));
    setZoomed(false);
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    draggedRef.current = false;
    if (zoomed || cleanImages.length < 2) return;
    setDragStart(event.clientX);
    setDragOffset(0);
    if (typeof event.currentTarget.setPointerCapture === "function") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (dragStart === null || zoomed) return;
    const nextOffset = event.clientX - dragStart;
    if (Math.abs(nextOffset) > 8) draggedRef.current = true;
    setDragOffset(nextOffset);
  }

  function finishDrag() {
    if (dragStart === null) return;
    if (Math.abs(dragOffset) > 44) go(activeIndex + (dragOffset > 0 ? -1 : 1));
    setDragStart(null);
    setDragOffset(0);
  }

  function openFullscreen() {
    if (draggedRef.current) return;
    setFullscreen(true);
  }

  function renderGallery() {
    return (
      <div className="invite-gallery-stage">
        <div
          className={["invite-gallery-viewport", zoomed ? "is-zoomed" : ""].filter(Boolean).join(" ")}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
        >
          <div
            className="invite-gallery-track"
            style={{
              transform: `translate3d(calc(${-activeIndex * 100}% + ${dragOffset}px), 0, 0)`,
              transitionDuration: dragStart === null ? "420ms" : "0ms",
            }}
          >
            {cleanImages.map((image, index) => (
              <button className="invite-gallery-slide" type="button" key={`${image}-${index}`} onClick={openFullscreen} aria-label={t("invitation.gallery.openImage", { number: index + 1 })}>
                <img src={image} alt={`${altPrefix} ${index + 1}`} loading={index === 0 ? "eager" : "lazy"} decoding="async" draggable={false} />
              </button>
            ))}
          </div>
        </div>

        <div className="invite-gallery-actions">
          <button type="button" onClick={() => go(activeIndex - 1)} aria-label={t("invitation.gallery.previous")} disabled={cleanImages.length < 2}>
            <ChevronRight size={18} />
          </button>
          <button type="button" onClick={() => setFullscreen(true)} aria-label={t("invitation.gallery.fullscreen")}>
            <Maximize2 size={17} />
          </button>
          <button type="button" onClick={() => go(activeIndex + 1)} aria-label={t("invitation.gallery.next")} disabled={cleanImages.length < 2}>
            <ChevronLeft size={18} />
          </button>
        </div>

        {cleanImages.length > 1 ? (
          <div className="invite-gallery-dots" aria-label={t("invitation.gallery.imageCount", { count: cleanImages.length })}>
            {cleanImages.map((image, index) => (
              <button className={index === activeIndex ? "active" : ""} type="button" key={`dot-${image}-${index}`} onClick={() => go(index)} aria-label={t("invitation.gallery.goTo", { number: index + 1 })} />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <section className={["interactive-gallery", className].filter(Boolean).join(" ")} aria-label={label || t("invitation.galleryLabel")}>
        {renderGallery()}
      </section>
      {fullscreen ? (
        <div className="invite-gallery-lightbox" role="dialog" aria-modal="true" aria-label={label || t("invitation.galleryLabel")}>
          <div className="invite-gallery-lightbox-bar">
            <span>{t("invitation.gallery.imageCounter", { current: activeIndex + 1, count: cleanImages.length })}</span>
            <div>
              <button type="button" onClick={() => setZoomed((current) => !current)} aria-label={zoomed ? t("invitation.gallery.zoomOut") : t("invitation.gallery.zoomIn")}>
                {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFullscreen(false);
                  setZoomed(false);
                }}
                aria-label={t("invitation.gallery.close")}
              >
                <X size={19} />
              </button>
            </div>
          </div>
          <div className="invite-gallery-lightbox-body">{renderGallery()}</div>
        </div>
      ) : null}
    </>
  );
}
