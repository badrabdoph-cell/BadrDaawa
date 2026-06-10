"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

type CalendarDevice = "apple" | "android" | "desktop";

function detectCalendarDevice() {
  if (typeof navigator === "undefined") return "desktop" satisfies CalendarDevice;
  const userAgent = navigator.userAgent.toLowerCase();
  const isAppleTouchDesktop = userAgent.includes("macintosh") && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/.test(userAgent) || isAppleTouchDesktop) return "apple" satisfies CalendarDevice;
  if (userAgent.includes("android")) return "android" satisfies CalendarDevice;
  return "desktop" satisfies CalendarDevice;
}

export function SmartCalendarButton({
  googleUrl,
  icsUrl,
  locale = "ar",
  isPreview = false,
  className = "btn btn-gold btn-glow",
}: {
  googleUrl: string;
  icsUrl: string;
  locale?: Language;
  isPreview?: boolean;
  className?: string;
}) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const [device, setDevice] = useState<CalendarDevice>("desktop");

  useEffect(() => {
    setDevice(detectCalendarDevice());
  }, []);

  const href = useMemo(() => {
    if (isPreview) return undefined;
    return device === "apple" ? icsUrl : googleUrl;
  }, [device, googleUrl, icsUrl, isPreview]);

  return (
    <a className={isPreview ? `${className} disabled` : className} href={href} target={device === "apple" ? undefined : "_blank"} rel={device === "apple" ? undefined : "noreferrer"} aria-disabled={isPreview}>
      <CalendarPlus size={17} />
      {t("invitation.calendar.addButton")}
    </a>
  );
}
