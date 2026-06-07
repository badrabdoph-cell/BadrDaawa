import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const maxGalleryImageBytes = 3 * 1024 * 1024;
const maxRawGalleryImageBytes = 12 * 1024 * 1024;

export const fallbackInvitationGallery = ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"];

function isExistingImageUrl(value: string) {
  return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://");
}

const allowedImageExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "svg", "bmp", "tif", "tiff", "heic", "heif"]);

function cleanImageExtension(value?: string) {
  const extension = value?.split("?")[0]?.split("#")[0]?.replace(/^\./, "").trim().toLowerCase() || "";
  if (!allowedImageExtensions.has(extension)) return "";
  return extension === "jpeg" ? "jpg" : extension;
}

function imageExtension(type: string, fileName = "") {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/avif") return "avif";
  if (type === "image/svg+xml") return "svg";
  if (type === "image/bmp") return "bmp";
  if (type === "image/tiff") return "tiff";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  const nameExtension = cleanImageExtension(fileName.split(".").pop());
  if (nameExtension) return nameExtension;
  return "jpg";
}

async function saveImageBytes(bytes: Buffer, extension: string) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "client-invitations");
  await mkdir(uploadDir, { recursive: true });
  const fileName = `invitation-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  await writeFile(path.join(uploadDir, fileName), bytes);
  return `/uploads/client-invitations/${fileName}`;
}

async function saveGalleryImage(image: string | File) {
  if (typeof image !== "string") {
    if (!image.type.startsWith("image/") || !image.size || image.size > maxRawGalleryImageBytes) return "";
    try {
      const bytes = Buffer.from(await image.arrayBuffer());
      if (!bytes.length) return "";
      return saveImageBytes(bytes, imageExtension(image.type, image.name));
    } catch (error) {
      console.error("Failed to save uploaded invitation image", error);
      return "";
    }
  }

  const value = image.trim();
  if (!value) return "";

  if (isExistingImageUrl(value)) {
    return value;
  }

  const match = value.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return "";

  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > maxGalleryImageBytes) return "";

  try {
    return saveImageBytes(bytes, imageExtension(`image/${match[1].toLowerCase()}`));
  } catch (error) {
    console.error("Failed to save invitation gallery image", error);
    return "";
  }
}

export async function saveInvitationGalleryImages(images: Array<string | File>) {
  const savedUrls: string[] = [];

  for (const image of images.slice(0, 3)) {
    const saved = await saveGalleryImage(image);
    if (saved) savedUrls.push(saved);
  }

  return savedUrls;
}

function isValidGalleryText(value: FormDataEntryValue | null): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("data:image/") || value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://"))
  );
}

function isValidGalleryFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.type.startsWith("image/") && value.size > 0;
}

export function getInvitationGalleryEntries(formData: FormData, slots = 3) {
  const indexed: Array<string | File> = [];

  for (let index = 0; index < slots; index += 1) {
    const optimized = formData.get(`galleryImage${index}`);
    const raw = formData.get(`galleryImage${index}Raw`);

    if (isValidGalleryText(optimized)) {
      console.log(`[InvitationImages] Slot ${index}: found optimized data URL (${Math.round(dataUrlSize(optimized) / 1024)} KB)`);
      indexed.push(optimized);
    } else if (isValidGalleryFile(raw)) {
      console.log(`[InvitationImages] Slot ${index}: found raw file "${raw.name}" (${Math.round(raw.size / 1024)} KB)`);
      indexed.push(raw);
    } else {
      // Fallback: check non-indexed names in case the uploader used the base name
      const optimizedFallback = formData.get(`galleryImage`);
      const rawFallback = formData.get(`galleryImageRaw`);
      if (index === 0 && isValidGalleryText(optimizedFallback)) {
        console.log(`[InvitationImages] Slot ${index}: found optimized via non-indexed fallback (${Math.round(dataUrlSize(optimizedFallback) / 1024)} KB)`);
        indexed.push(optimizedFallback);
      } else if (index === 0 && isValidGalleryFile(rawFallback)) {
        console.log(`[InvitationImages] Slot ${index}: found raw file via non-indexed fallback "${rawFallback.name}"`);
        indexed.push(rawFallback);
      } else {
        console.log(`[InvitationImages] Slot ${index}: no image found`);
      }
    }
  }

  if (indexed.length) {
    console.log(`[InvitationImages] Extracted ${indexed.length} image(s) via indexed lookup`);
    return indexed;
  }

  // Last-resort: collect all values under the base names (handles multi-file inputs)
  const optimized = formData.getAll("galleryImage").filter(isValidGalleryText);
  const raw = formData.getAll("galleryImageRaw").filter(isValidGalleryFile);

  console.log(`[InvitationImages] Indexed lookup found nothing; fallback: ${optimized.length} optimized, ${raw.length} raw`);

  if (!optimized.length) return raw;
  if (optimized.length >= raw.length || optimized.length >= slots) return optimized;

  return [...optimized, ...raw.slice(optimized.length)];
}

function dataUrlSize(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.round((base64.length * 3) / 4);
}
