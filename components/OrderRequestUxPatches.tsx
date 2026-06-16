"use client";

import { useEffect } from "react";

function getText(element: Element | null) {
  return (element?.textContent || "").replace(/\s+/g, " ").trim();
}

function findPhotoReviewCard() {
  return Array.from(document.querySelectorAll<HTMLElement>(".order-review-item")).find((item) => getText(item).includes("الصور")) || null;
}

function hasUploadWaitHint() {
  return Boolean(document.querySelector("#order-upload-wait-hint"));
}

function syncUploadReviewState() {
  const waiting = hasUploadWaitHint();
  const photoCard = findPhotoReviewCard();
  const submitButton = document.querySelector<HTMLButtonElement>(".order-review-actions .order-submit");

  if (photoCard) {
    photoCard.classList.toggle("order-review-photos-warning", waiting);
    if (waiting) photoCard.setAttribute("aria-invalid", "true");
    else photoCard.removeAttribute("aria-invalid");
  }

  if (!submitButton) return;

  if (waiting && submitButton.disabled && !getText(submitButton).includes("جاري")) {
    submitButton.disabled = false;
    submitButton.removeAttribute("disabled");
    submitButton.dataset.uploadWaitOverride = "true";
    return;
  }

  if (!waiting && submitButton.dataset.uploadWaitOverride === "true") {
    delete submitButton.dataset.uploadWaitOverride;
  }
}

function clickMusicFileInput(kind: "audio" | "video") {
  window.setTimeout(() => {
    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>(".order-music-upload input[type='file']"));
    const input = inputs.find((item) => {
      const accept = item.accept || "";
      if (kind === "video") return accept.includes("video") || accept.includes(".mp4") || accept.includes(".mov") || accept.includes(".webm");
      return accept.includes("audio") || accept.includes(".mp3");
    });
    if (input && !input.disabled) input.click();
  }, 130);
}

export function OrderRequestUxPatches() {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const musicButton = target.closest<HTMLButtonElement>(".order-music-choice-grid button");
      if (musicButton) {
        const label = getText(musicButton);
        if (label.includes("رفع MP3")) clickMusicFileInput("audio");
        if (label.includes("صوت من فيديو")) clickMusicFileInput("video");
        if (label.includes("رابط أغنية")) window.setTimeout(() => document.querySelector<HTMLInputElement>("#musicUrl")?.focus(), 130);
      }

      const submitButton = target.closest<HTMLButtonElement>(".order-review-actions .order-submit[data-upload-wait-override='true']");
      if (submitButton && hasUploadWaitHint()) {
        window.setTimeout(() => {
          const alert = document.querySelector<HTMLElement>(".order-alert.danger");
          const targetElement = alert || findPhotoReviewCard() || document.querySelector<HTMLElement>("#order-upload-wait-hint");
          targetElement?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 130);
      }
    }

    syncUploadReviewState();
    const observer = new MutationObserver(syncUploadReviewState);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "class"],
    });
    const interval = window.setInterval(syncUploadReviewState, 700);
    document.addEventListener("click", handleClick, true);

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  return null;
}
