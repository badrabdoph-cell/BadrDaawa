"use client";

import { useEffect, useState } from "react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

export function InviteOpening({ groomName, brideName, locale = "ar" }: { groomName: string; brideName: string; locale?: Language }) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsDone(true), 3000);
    return () => window.clearTimeout(timer);
  }, []);

  if (isDone) {
    return null;
  }

  return (
    <section className="invite-opening" aria-label={t("invitation.openingLabel")}>
      <div className="opening-envelope">
        <div className="opening-envelope-base" />
        <div className="opening-envelope-flap" />
        <div className="opening-paper">
          <span>{t("invitation.openingTitle")}</span>
          <strong>
            {groomName} &amp; {brideName}
          </strong>
        </div>
      </div>
    </section>
  );
}
