"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Download, ImagePlus, Printer, QrCode, RotateCcw } from "lucide-react";
import QRCode from "qrcode";

type InvitationQrToolsProps = {
  invitationUrl: string;
  title: string;
  initialLogoUrl?: string;
};

const qrColor = {
  dark: "#171614",
  light: "#ffffff",
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function downloadFile(fileName: string, href: string) {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function withLogoInSvg(svg: string, logoDataUrl: string) {
  if (!logoDataUrl) return svg;
  const viewBox = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const viewSize = Number(viewBox?.[1] || 100);
  const logoSize = Number((viewSize * 0.2).toFixed(3));
  const logoPadding = Number((viewSize * 0.035).toFixed(3));
  const logoBox = logoSize + logoPadding * 2;
  const x = Number(((viewSize - logoBox) / 2).toFixed(3));
  const imageX = x + logoPadding;
  const radius = Number((viewSize * 0.035).toFixed(3));
  const insert = [
    `<rect x="${x}" y="${x}" width="${logoBox}" height="${logoBox}" rx="${radius}" fill="#ffffff"/>`,
    `<image href="${escapeXml(logoDataUrl)}" x="${imageX}" y="${imageX}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`,
  ].join("");
  return svg.replace("</svg>", `${insert}</svg>`);
}

function drawRoundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

export function InvitationQrTools({ invitationUrl, title, initialLogoUrl = "" }: InvitationQrToolsProps) {
  const [size, setSize] = useState(320);
  const [logoDataUrl, setLogoDataUrl] = useState(initialLogoUrl.startsWith("/") || initialLogoUrl.startsWith("data:image/") ? initialLogoUrl : "");
  const [pngDataUrl, setPngDataUrl] = useState("");
  const [svgMarkup, setSvgMarkup] = useState("");
  const [status, setStatus] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const fileNameBase = useMemo(() => title.trim().replace(/[^\w\u0600-\u06ff-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "invitation-qr", [title]);

  useEffect(() => {
    let active = true;

    async function renderQr() {
      setStatus("");
      const canvas = canvasRef.current;
      if (!canvas) return;
      const baseQr = await QRCode.toDataURL(invitationUrl, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: size,
        color: qrColor,
      });
      const svg = await QRCode.toString(invitationUrl, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: size,
        type: "svg",
        color: qrColor,
      });

      if (!active) return;

      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.clearRect(0, 0, size, size);
      const qrImage = await loadImage(baseQr);
      if (!active) return;
      context.drawImage(qrImage, 0, 0, size, size);

      if (logoDataUrl) {
        try {
          const logo = await loadImage(logoDataUrl);
          if (!active) return;
          const logoSize = Math.round(size * 0.2);
          const padding = Math.round(size * 0.035);
          const boxSize = logoSize + padding * 2;
          const x = Math.round((size - boxSize) / 2);
          const logoX = x + padding;
          const radius = Math.round(size * 0.035);
          context.fillStyle = "#ffffff";
          drawRoundedRect(context, x, x, boxSize, boxSize, radius);
          context.fill();
          context.drawImage(logo, logoX, logoX, logoSize, logoSize);
        } catch {
          setStatus("تعذر إضافة الشعار داخل QR. جرّب رفع صورة PNG أو JPG.");
        }
      }

      setPngDataUrl(canvas.toDataURL("image/png"));
      setSvgMarkup(withLogoInSvg(svg, logoDataUrl));
    }

    renderQr().catch(() => {
      if (active) {
        setPngDataUrl("");
        setSvgMarkup("");
        setStatus("تعذر إنشاء QR حالياً.");
      }
    });

    return () => {
      active = false;
    };
  }, [invitationUrl, logoDataUrl, size]);

  async function handleLogo(file?: File | null) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    if (dataUrl) setLogoDataUrl(dataUrl);
  }

  function downloadPng() {
    if (pngDataUrl) downloadFile(`${fileNameBase}.png`, pngDataUrl);
  }

  function downloadSvg() {
    if (!svgMarkup) return;
    const blob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    downloadFile(`${fileNameBase}.svg`, URL.createObjectURL(blob));
  }

  function printQr() {
    if (!pngDataUrl) return;
    const printWindow = window.open("", "_blank", "width=720,height=840");
    if (!printWindow) return;
    printWindow.document.write(`
      <!doctype html>
      <html lang="ar" dir="rtl">
        <head>
          <title>${escapeXml(title)} QR</title>
          <style>
            body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; }
            .sheet { text-align: center; padding: 32px; }
            img { width: ${size}px; height: ${size}px; max-width: 88vw; max-height: 72vh; }
            h1 { margin: 0 0 18px; font-size: 24px; }
            p { direction: ltr; color: #555; font-weight: 700; }
            @media print { body { display: block; } .sheet { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="sheet">
            <h1>${escapeXml(title)}</h1>
            <img src="${pngDataUrl}" alt="QR Code" />
            <p>${escapeXml(invitationUrl)}</p>
          </div>
          <script>window.onload = () => { window.focus(); window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <article className="panel invitation-qr-tools">
      <div className="invitation-qr-head">
        <QrCode size={24} />
        <div>
          <h2>الرابط والـ QR</h2>
          <p>يتم إنشاء QR تلقائياً من رابط الدعوة، ويمكن تحميله أو طباعته بالحجم والشعار المناسبين.</p>
        </div>
      </div>

      <div className="invitation-qr-workspace">
        <div className="invitation-qr-preview" style={{ "--qr-size": `${Math.min(size, 360)}px` } as CSSProperties}>
          <canvas ref={canvasRef} aria-label="QR Code للدعوة" />
          {!pngDataUrl ? <span className="qr-placeholder" aria-hidden="true" /> : null}
        </div>

        <div className="invitation-qr-controls">
          <label className="field">
            <span>حجم QR</span>
            <input type="range" min={180} max={720} step={20} value={size} onChange={(event) => setSize(Number(event.target.value))} />
            <small>{size}px</small>
          </label>

          <label className="builder-logo-upload invitation-qr-logo">
            <ImagePlus size={17} />
            <span>{logoDataUrl ? "تغيير الشعار داخل QR" : "إضافة شعار داخل QR"}</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => handleLogo(event.target.files?.[0])} />
          </label>

          {logoDataUrl ? (
            <button className="btn btn-soft" type="button" onClick={() => setLogoDataUrl("")}>
              <RotateCcw size={16} />
              إزالة الشعار
            </button>
          ) : null}

          <div className="invitation-qr-actions">
            <button className="btn btn-gold" type="button" onClick={downloadPng} disabled={!pngDataUrl}>
              <Download size={17} />
              تحميل PNG
            </button>
            <button className="btn btn-soft" type="button" onClick={downloadSvg} disabled={!svgMarkup}>
              <Download size={17} />
              تحميل SVG
            </button>
            <button className="btn btn-soft" type="button" onClick={printQr} disabled={!pngDataUrl}>
              <Printer size={17} />
              طباعة QR
            </button>
          </div>
          {status ? <div className="notice danger compact">{status}</div> : null}
        </div>
      </div>
    </article>
  );
}
