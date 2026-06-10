"use client";

import { useEffect, useState } from "react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

export function QrCodeBlock({ value, locale = "ar" }: { value: string; locale?: Language }) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let isCurrent = true;

    async function renderQrCode() {
      try {
        const QRCode = (await import("qrcode")).default;
        const nextDataUrl = await QRCode.toDataURL(value, {
          margin: 1,
          width: 180,
          color: {
            dark: "#171614",
            light: "#ffffff",
          },
        });
        if (isCurrent) setDataUrl(nextDataUrl);
      } catch {
        if (isCurrent) setDataUrl("");
      }
    }

    void renderQrCode();

    return () => {
      isCurrent = false;
    };
  }, [value]);

  return (
    <div className="qr-card">
      {dataUrl ? <img src={dataUrl} alt={t("invitation.qrAlt")} width={180} height={180} /> : <span className="qr-placeholder" aria-hidden="true" />}
      <strong>{t("invitation.qrText")}</strong>
    </div>
  );
}
