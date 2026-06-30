"use client";

import { useEffect, useMemo, useState } from "react";
import { QrCode } from "lucide-react";

function cleanCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase().replace(/[^\p{L}\p{N}_-]+/gu, "").slice(0, 32);
}

export function PartnerPromoPreviewFields() {
  const [code, setCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const cleanedCode = cleanCode(code);
  const shortPath = `/r/${cleanedCode || "BADR"}`;

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return shortPath;
    return `${window.location.origin}${shortPath}`;
  }, [shortPath]);

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((module) => module.default.toDataURL(shareUrl))
      .then((url) => {
        if (!cancelled) setQrCodeUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrCodeUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  return (
    <div className="partner-create-preview">
      <label className="field">
        <span>البروموكود</span>
        <input name="promoCode" dir="ltr" placeholder="مثال: BADR" value={code} onChange={(event) => setCode(event.target.value)} />
        <small>سيصبح الرابط المختصر بهذا الشكل: {shortPath}</small>
      </label>
      <div className="partner-qr-preview">
        {qrCodeUrl ? <span style={{ backgroundImage: `url(${qrCodeUrl})` }} aria-label="QR Preview" /> : <span><QrCode size={34} /></span>}
        <div>
          <strong>QR Preview</strong>
          <small dir="ltr">{shareUrl}</small>
        </div>
      </div>
    </div>
  );
}
