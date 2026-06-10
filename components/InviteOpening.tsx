"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
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
  return src.startsWith("/") && !src.toLowerCase().endsWith(".svg");
}

export function InviteOpening({ groomName, brideName, coverImage, weddingDateLabel, openingText, locale = "ar" }: InviteOpeningProps) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const [phase, setPhase] = useState<"ready" | "leaving" | "done">("ready");

  useEffect(() => {
    if (phase !== "leaving") return;
    const timer = window.setTimeout(() => setPhase("done"), 960);
    return () => window.clearTimeout(timer);
  }, [phase]);

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
    if (phase !== "ready") return;
    window.dispatchEvent(new CustomEvent(inviteOpenedEventName));
    setPhase("leaving");
  }

  return (
    <section className={`invite-opening cinematic-opening ${phase === "leaving" ? "is-leaving" : ""}`} aria-label={t("invitation.openingLabel")}>
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
        <button type="button" onClick={openInvitation}>
          {t("invitation.openingButton")}
        </button>
      </div>
    </section>
  );
}
