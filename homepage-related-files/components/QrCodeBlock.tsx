"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCodeBlock({ value }: { value: string }) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let isCurrent = true;

    QRCode.toDataURL(value, {
      margin: 1,
      width: 180,
      color: {
        dark: "#171614",
        light: "#ffffff",
      },
    })
      .then((nextDataUrl) => {
        if (isCurrent) setDataUrl(nextDataUrl);
      })
      .catch(() => {
        if (isCurrent) setDataUrl("");
      });

    return () => {
      isCurrent = false;
    };
  }, [value]);

  return (
    <div className="qr-card">
      {dataUrl ? <img src={dataUrl} alt="QR Code للدعوة" width={180} height={180} /> : <span className="qr-placeholder" aria-hidden="true" />}
      <strong>امسح الكود وافتح الدعوة</strong>
    </div>
  );
}
