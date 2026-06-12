"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

export const inviteOpenedEventName = "badr:invite-opened";

type InviteOpeningProps = {
  groomName: string;
  brideName: string;
  coverImage: string;
  weddingDateLabel?: string;
  openingText?: string;
  locale?: Language;
};

function canUseOptimizedImage(src: string) {
  return src.startsWith("/") && !src.startsWith("/uploads/") && !src.toLowerCase().endsWith(".svg");
}

export function InviteOpening({ groomName, brideName, coverImage, weddingDateLabel, openingText, locale = "ar" }: InviteOpeningProps) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const [phase, setPhase] = useState<"ready" | "leaving" | "done">("ready");
  const hasOpenedRef = useRef(false);
  const doneTimerRef = useRef<number | null>(null);

  const finishOpening = useCallback(() => {
    if (doneTimerRef.current) {
      window.clearTimeout(doneTimerRef.current);
      doneTimerRef.current = null;
    }
    setPhase("done");
  }, []);

  useEffect(() => {
    if (phase !== "leaving") return;
    doneTimerRef.current = window.setTimeout(finishOpening, 1200);
    return () => {
      if (doneTimerRef.current) {
        window.clearTimeout(doneTimerRef.current);
        doneTimerRef.current = null;
      }
    };
  }, [finishOpening, phase]);

  useEffect(() => {
    if (phase === "done") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [phase]);

  if (phase === "done") return null;

  function openInvitation() {
    if (phase !== "ready" || hasOpenedRef.current) return;
    hasOpenedRef.current = true;
    setPhase("leaving");
    window.dispatchEvent(new CustomEvent(inviteOpenedEventName));
  }

  return (
    <section
      className={`invite-opening cinematic-opening ${phase === "leaving" ? "is-leaving" : ""}`}
      aria-label={t("invitation.openingLabel")}
      onAnimationEnd={(event) => {
        if (event.currentTarget === event.target && phase === "leaving") finishOpening();
      }}
      onTransitionEnd={(event) => {
        if (event.currentTarget === event.target && phase === "leaving") finishOpening();
      }}
    >
      <div className="cinematic-opening-media" aria-hidden="true">
        {canUseOptimizedImage(coverImage) ? (
          <Image src={coverImage} alt="" fill priority sizes="100vw" draggable={false} />
        ) : (
          <img src={coverImage} alt="" loading="eager" decoding="async" draggable={false} />
        )}
      </div>
      <div className="cinematic-opening-gold-wash" aria-hidden="true" />
      <div className="cinematic-opening-shade" aria-hidden="true" />
      <div className="cinematic-opening-content">
        <span className="cinematic-opening-kicker">
          <Sparkles size={15} />
          {t("invitation.openingTitle")}
        </span>
        <h1>
          <span>{groomName}</span>
          <i aria-hidden="true">&amp;</i>
          <span>{brideName}</span>
        </h1>
        {weddingDateLabel ? <time className="cinematic-opening-date">{weddingDateLabel}</time> : null}
        {openingText ? <p>{openingText}</p> : null}
        <button
          type="button"
          onPointerDown={openInvitation}
          onClick={openInvitation}
        >
          {t("invitation.openingButton")}
        </button>
      </div>
    </section>
  );
}
