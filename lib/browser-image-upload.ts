"use client";

const maxBrowserOriginalImageBytes = 32 * 1024 * 1024;
const maxDirectServerImageBytes = 32 * 1024 * 1024;
const maxImageSide = 1800;
const retryCount = 2;

type OptimizedUploadFile = {
  file: File;
  originalBytes: number;
  optimizedBytes: number;
  width: number;
  height: number;
};

export type BrowserImageUploadPhase = "selected" | "compressing" | "uploading" | "saved" | "retrying" | "error";

export type BrowserImageUploadStatus = {
  phase: BrowserImageUploadPhase;
  progress: number;
  message: string;
};

export type BrowserImageUploadOptions = {
  slot?: string | number;
  onStatus?: (status: BrowserImageUploadStatus) => void;
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function loadImageElement(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image-preview-failed"));
    image.src = url;
  });
}

async function compressBrowserImage(file: File): Promise<OptimizedUploadFile> {
  const sourceUrl = URL.createObjectURL(file);
  try {
    console.log(`[Browser Image Upload] Compress start name=${file.name || "unnamed"} type=${file.type || "unknown"} size=${file.size}.`);
    let width = 0;
    let height = 0;
    let drawable: CanvasImageSource;

    try {
      if (!("createImageBitmap" in window)) throw new Error("createImageBitmap-unavailable");
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      width = bitmap.width;
      height = bitmap.height;
      drawable = bitmap;
    } catch {
      const image = await loadImageElement(sourceUrl);
      width = image.naturalWidth;
      height = image.naturalHeight;
      drawable = image;
    }

    const scale = Math.min(1, maxImageSide / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("canvas-unavailable");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(drawable, 0, 0, targetWidth, targetHeight);
    if ("close" in drawable && typeof drawable.close === "function") drawable.close();

    const webpBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.82);
    });
    const blob = webpBlob?.size
      ? webpBlob
      : await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", 0.84);
        });

    if (!blob?.size) throw new Error("compression-empty");
    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    const output = new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "wedding-photo"}.${extension}`, {
      type: blob.type || "image/jpeg",
      lastModified: Date.now(),
    });

    return {
      file: output,
      originalBytes: file.size,
      optimizedBytes: output.size,
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

async function prepareUploadFile(file: File): Promise<OptimizedUploadFile> {
  if (file.size > maxBrowserOriginalImageBytes) {
    throw new Error(`حجم الصورة ${formatBytes(file.size)}. اختار صورة أقل من ${formatBytes(maxBrowserOriginalImageBytes)}.`);
  }

  try {
    return await compressBrowserImage(file);
  } catch (error) {
    if (file.size <= maxDirectServerImageBytes) {
      console.log(
        `[Browser Image Upload] Compression failed; uploading original fallback name=${file.name || "unnamed"} type=${file.type || "unknown"} size=${file.size}.`,
        error,
      );
      return {
        file,
        originalBytes: file.size,
        optimizedBytes: file.size,
        width: 0,
        height: 0,
      };
    }
    throw new Error("تعذر ضغط الصورة داخل المتصفح. جرّب صورة JPG أو PNG أصغر.");
  }
}

async function uploadWithFetch(file: File, options: BrowserImageUploadOptions, attempt: number) {
  const formData = new FormData();
  formData.append("images", file);
  if (options.slot !== undefined) formData.append("slot", String(options.slot));
  formData.append("attempt", String(attempt + 1));

  const response = await fetch("/api/orders/preview-images", {
    method: "POST",
    body: formData,
  });
  const data = (await response.json().catch(() => null)) as { imageUrls?: string[]; error?: string } | null;
  const url = data?.imageUrls?.[0] || "";
  if (!response.ok || !url) throw new Error(data?.error || "preview-image-upload-failed");
  return url;
}

export async function uploadBrowserPreviewImage(file: File, options: BrowserImageUploadOptions = {}) {
  options.onStatus?.({ phase: "selected", progress: 5, message: "تم اختيار الصورة" });
  options.onStatus?.({ phase: "compressing", progress: 20, message: "جاري ضغط الصورة قبل الرفع" });
  const optimized = await prepareUploadFile(file);

  options.onStatus?.({
    phase: "uploading",
    progress: 55,
    message: optimized.originalBytes === optimized.optimizedBytes
      ? `سيتم رفع الصورة الأصلية (${formatBytes(optimized.originalBytes)})`
      : `تم الضغط من ${formatBytes(optimized.originalBytes)} إلى ${formatBytes(optimized.optimizedBytes)}`,
  });

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    try {
      if (attempt > 0) {
        options.onStatus?.({
          phase: "retrying",
          progress: 55,
          message: `إعادة محاولة الرفع ${attempt + 1}/${retryCount + 1}`,
        });
      }
      const url = await uploadWithFetch(optimized.file, options, attempt);
      options.onStatus?.({ phase: "saved", progress: 100, message: "تم حفظ الصورة" });
      return url;
    } catch (error) {
      lastError = error;
    }
  }

  options.onStatus?.({ phase: "error", progress: 0, message: "فشل رفع الصورة" });
  throw lastError instanceof Error ? lastError : new Error("preview-image-upload-failed");
}
