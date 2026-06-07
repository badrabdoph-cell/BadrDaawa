"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, RotateCcw } from "lucide-react";

type CropItem = {
  id: string;
  fileName: string;
  originalSize: number;
  sourceUrl: string;
  cropX: number;
  cropY: number;
  zoom: number;
  optimizedUrl: string;
  optimizedSize: number;
};

const acceptedImageFormats = "image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.svg,.bmp,.tif,.tiff,.heic,.heif";

function formatKb(bytes: number) {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function dataUrlSize(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}

async function optimizeImage(item: CropItem, width: number, height: number, quality: number) {
  const image = new Image();
  image.src = item.sourceUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return { url: "", size: 0 };

  const targetRatio = width / height;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  let sourceWidth = image.naturalWidth / item.zoom;
  let sourceHeight = sourceWidth / targetRatio;

  if (imageRatio < targetRatio || sourceHeight > image.naturalHeight / item.zoom) {
    sourceHeight = image.naturalHeight / item.zoom;
    sourceWidth = sourceHeight * targetRatio;
  }

  const maxX = Math.max(0, (image.naturalWidth - sourceWidth) / 2);
  const maxY = Math.max(0, (image.naturalHeight - sourceHeight) / 2);
  const sourceX = Math.min(image.naturalWidth - sourceWidth, Math.max(0, maxX + item.cropX * maxX));
  const sourceY = Math.min(image.naturalHeight - sourceHeight, Math.max(0, maxY + item.cropY * maxY));

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);

  const url = canvas.toDataURL("image/jpeg", quality);
  return { url, size: dataUrlSize(url) };
}

export function ImageCropUploader({
  name = "galleryImage",
  label = "صور الدعوة",
  targetWidth = 1200,
  targetHeight = 1500,
  maxFiles = 3,
  defaultImages = [],
}: {
  name?: string;
  label?: string;
  targetWidth?: number;
  targetHeight?: number;
  maxFiles?: number;
  defaultImages?: string[];
}) {
  const [items, setItems] = useState<CropItem[]>([]);
  const timers = useRef<Record<string, number>>({});
  const objectUrls = useRef<string[]>([]);
  const ratio = useMemo(() => `${targetWidth} / ${targetHeight}`, [targetHeight, targetWidth]);

  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach((timer) => window.clearTimeout(timer));
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const queueOptimize = (nextItem: CropItem) => {
    window.clearTimeout(timers.current[nextItem.id]);
    timers.current[nextItem.id] = window.setTimeout(async () => {
      const optimized = await optimizeImage(nextItem, targetWidth, targetHeight, 0.84);
      setItems((current) => current.map((item) => (item.id === nextItem.id ? { ...item, optimizedUrl: optimized.url, optimizedSize: optimized.size } : item)));
    }, 160);
  };

  const updateItem = (id: string, updates: Partial<CropItem>) => {
    setItems((current) => {
      const next = current.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        queueOptimize(updated);
        return updated;
      });
      return next;
    });
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current = [];

    const selected = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, maxFiles);

    const nextItems = selected.map((file) => {
      const sourceUrl = URL.createObjectURL(file);
      objectUrls.current.push(sourceUrl);
      return {
        id: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
        fileName: file.name,
        originalSize: file.size,
        sourceUrl,
        cropX: 0,
        cropY: 0,
        zoom: 1,
        optimizedUrl: "",
        optimizedSize: 0,
      };
    });

    setItems(nextItems);
    nextItems.forEach(queueOptimize);
  };

  return (
    <div className="crop-uploader">
      <label className="crop-dropzone">
        <ImagePlus size={22} />
        <strong>{label}</strong>
        <span>
          {targetWidth}x{targetHeight}px - كروب إجباري قبل الرفع وضغط تلقائي
        </span>
        <input name={`${name}Raw`} type="file" accept={acceptedImageFormats} multiple={maxFiles > 1} onChange={(event) => handleFiles(event.target.files)} />
      </label>

      {!items.length && defaultImages.length ? (
        <div className="crop-existing">
          {defaultImages.map((image) => (
            <img src={image} alt="صورة حالية" key={image} />
          ))}
        </div>
      ) : null}

      {items.length ? (
        <div className="crop-list">
          {items.map((item, index) => (
            <article className="crop-item" key={item.id}>
              <div className="crop-preview" style={{ aspectRatio: ratio }}>
                <img
                  src={item.sourceUrl}
                  alt={item.fileName}
                  style={{
                    objectPosition: `${50 + item.cropX * 50}% ${50 + item.cropY * 50}%`,
                    transform: `scale(${item.zoom})`,
                  }}
                />
              </div>
              <div className="crop-controls">
                <strong>صورة {index + 1}</strong>
                <span>
                  {formatKb(item.originalSize)} إلى {item.optimizedSize ? formatKb(item.optimizedSize) : "جاري الضغط"}
                </span>
                <label>
                  تكبير
                  <input type="range" min="1" max="2.4" step="0.05" value={item.zoom} onChange={(event) => updateItem(item.id, { zoom: Number(event.target.value) })} />
                </label>
                <label>
                  يمين / شمال
                  <input type="range" min="-1" max="1" step="0.02" value={item.cropX} onChange={(event) => updateItem(item.id, { cropX: Number(event.target.value) })} />
                </label>
                <label>
                  فوق / تحت
                  <input type="range" min="-1" max="1" step="0.02" value={item.cropY} onChange={(event) => updateItem(item.id, { cropY: Number(event.target.value) })} />
                </label>
                <button className="btn btn-soft" type="button" onClick={() => updateItem(item.id, { cropX: 0, cropY: 0, zoom: 1 })}>
                  <RotateCcw size={16} />
                  إعادة ضبط
                </button>
                {item.optimizedUrl ? <input name={name} type="hidden" value={item.optimizedUrl} /> : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
