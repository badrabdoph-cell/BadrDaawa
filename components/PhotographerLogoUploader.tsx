"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, RotateCcw, Trash2, UploadCloud, X } from "lucide-react";
import { acceptedImageFormats } from "@/lib/image-formats";

type CropState = {
  sourceUrl: string;
  zoom: number;
  cropX: number;
  cropY: number;
};

async function createCroppedLogo(sourceUrl: string, zoom: number, cropX: number, cropY: number): Promise<string> {
  const img = new Image();
  img.src = sourceUrl;
  await img.decode();
  const size = 400;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  const scale = Math.max(size / img.naturalWidth, size / img.naturalHeight) * zoom;
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  const maxX = Math.max(0, (drawW - size) / 2);
  const maxY = Math.max(0, (drawH - size) / 2);
  const offX = Math.min(maxX, Math.max(-maxX, cropX * maxX));
  const offY = Math.min(maxY, Math.max(-maxY, cropY * maxY));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(img, (size - drawW) / 2 + offX, (size - drawH) / 2 + offY, drawW, drawH);
  return canvas.toDataURL("image/webp", 0.9);
}

export function PhotographerLogoUploader({
  currentLogoUrl,
  name = "photographerLogoDataUrl",
  removeName = "removeLogo",
}: {
  currentLogoUrl: string;
  name?: string;
  removeName?: string;
}) {
  const [crop, setCrop] = useState<CropState | null>(null);
  const [croppedDataUrl, setCroppedDataUrl] = useState("");
  const [removed, setRemoved] = useState(false);
  const [applying, setApplying] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { if (crop?.sourceUrl) URL.revokeObjectURL(crop.sourceUrl); };
  }, [crop?.sourceUrl]);

  const showLogo = !removed && (croppedDataUrl || currentLogoUrl);
  const previewUrl = croppedDataUrl || currentLogoUrl;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCrop({ sourceUrl: URL.createObjectURL(file), zoom: 1, cropX: 0, cropY: 0 });
  }

  async function applyCrop() {
    if (!crop) return;
    setApplying(true);
    try {
      setCroppedDataUrl(await createCroppedLogo(crop.sourceUrl, crop.zoom, crop.cropX, crop.cropY));
      setCrop(null);
      setRemoved(false);
    } catch { alert("فشل قص الصورة. حاول مرة أخرى."); }
    setApplying(false);
  }

  function cancelCrop() {
    if (crop?.sourceUrl) URL.revokeObjectURL(crop.sourceUrl);
    setCrop(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleRemove() {
    setCroppedDataUrl("");
    setRemoved(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  function resetCrop() {
    if (!crop) return;
    setCrop({ ...crop, zoom: 1, cropX: 0, cropY: 0 });
  }

  return (
    <>
      {crop ? (
        <div className="new-invite-crop-modal">
          <div className="new-invite-crop-card" style={{ maxWidth: 420 }}>
            <div className="new-invite-crop-head">
              <strong>قص الشعار</strong>
              <button className="admin-icon-button" type="button" onClick={cancelCrop}><X size={17} /></button>
            </div>
            <div className="new-invite-crop-preview" style={{ aspectRatio: "1 / 1", borderRadius: "50%" }}>
              <img
                src={crop.sourceUrl}
                alt="قص الشعار"
                style={{
                  objectPosition: `${50 + crop.cropX * 50}% ${50 + crop.cropY * 50}%`,
                  transform: `scale(${crop.zoom})`,
                }}
              />
            </div>
            <div className="visual-crop-controls">
              <label>تكبير <input type="range" min="1" max="2.4" step="0.05" value={crop.zoom} onChange={(e) => setCrop({ ...crop, zoom: Number(e.target.value) })} /></label>
              <label>يمين / شمال <input type="range" min="-1" max="1" step="0.02" value={crop.cropX} onChange={(e) => setCrop({ ...crop, cropX: Number(e.target.value) })} /></label>
              <label>فوق / تحت <input type="range" min="-1" max="1" step="0.02" value={crop.cropY} onChange={(e) => setCrop({ ...crop, cropY: Number(e.target.value) })} /></label>
            </div>
            <div className="new-invite-crop-actions">
              <button className="btn btn-soft" type="button" onClick={resetCrop}><RotateCcw size={16} /> إعادة ضبط</button>
              <button className="btn btn-gold" type="button" onClick={applyCrop} disabled={applying} style={{ marginRight: "auto" }}>
                {applying ? <Loader2 size={16} /> : <UploadCloud size={16} />} تأكيد القص
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="field" style={{ gridColumn: "1 / -1" }}>
        <span>شعار المصور</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", marginTop: 6, width: "100%" }}>
          {showLogo ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 280px" }}>
              <img
                src={previewUrl}
                alt="شعار المصور"
                style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", background: "rgba(255,255,255,0.08)", flex: "0 0 auto" }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ color: "#fff7e8", display: "block", fontSize: "0.9rem" }}>{previewUrl.split("/").pop()?.slice(0, 36) || "شعار"}</strong>
                <small style={{ color: "rgba(245,234,214,0.5)", wordBreak: "break-all", fontSize: "0.75rem", display: "block" }}>{previewUrl.slice(0, 60)}…</small>
              </div>
              <button className="btn btn-soft" type="button" onClick={handleRemove} style={{ flex: "0 0 auto" }}>
                <Trash2 size={16} /> حذف
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(245,234,214,0.4)", padding: "8px 0" }}>
              <ImagePlus size={22} />
              <span>لا يوجد شعار مرفوع</span>
            </div>
          )}
          <label className="btn btn-soft" style={{ cursor: "pointer", flex: "0 0 auto" }}>
            <ImagePlus size={17} />
            {showLogo ? "تغيير الصورة" : "اختيار صورة"}
            <input ref={fileRef} type="file" accept={acceptedImageFormats} onChange={handleFile} hidden />
          </label>
        </div>
        {croppedDataUrl ? <input name={name} type="hidden" value={croppedDataUrl} /> : null}
        {removed ? <input name={removeName} type="hidden" value="1" /> : null}
      </div>
    </>
  );
}
