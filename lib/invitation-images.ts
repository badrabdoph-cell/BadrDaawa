import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { imageExtensionForUpload, imageExtensionFromDataMime, isSupportedImageFile, isSupportedImageUrl } from "./image-formats";
import { normalizeInternalAssetUrl } from "./utils";

const maxGalleryImageBytes = 3 * 1024 * 1024;
const maxRawGalleryImageBytes = 80 * 1024 * 1024;

export const fallbackInvitationGallery = ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"];

function isExistingImageUrl(value: string) {
  return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://");
}

function imageExtension(type: string, fileName = "") {
  return imageExtensionForUpload(type, fileName);
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
    if (!isSupportedImageFile(image) || image.size > maxRawGalleryImageBytes) return "";
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
    return normalizeInternalAssetUrl(value) || value;
  }

  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return "";

  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > maxGalleryImageBytes) return "";

  try {
    return saveImageBytes(bytes, imageExtensionFromDataMime(match[1].toLowerCase()) || "jpg");
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
  return typeof value === "string" && isSupportedImageUrl(value);
}

function isValidGalleryFile(value: FormDataEntryValue | null): value is File {
  return value instanceof File && isSupportedImageFile(value);
}

export function getInvitationGalleryEntries(formData: FormData, slots = 3) {
  const indexed: Array<string | File> = [];

  for (let index = 0; index < slots; index += 1) {
    const optimized = formData.get(`galleryImage${index}`);
    const raw = formData.get(`galleryImage${index}Raw`);
    if (isValidGalleryText(optimized)) {
      indexed.push(optimized);
    } else if (isValidGalleryFile(raw)) {
      indexed.push(raw);
    }
  }

  if (indexed.length) return indexed;

  const optimized = formData.getAll("galleryImage").filter(isValidGalleryText);
  const raw = formData.getAll("galleryImageRaw").filter(isValidGalleryFile);

  if (!optimized.length) return raw;
  if (optimized.length >= raw.length || optimized.length >= slots) return optimized;

  return [...optimized, ...raw.slice(optimized.length)];
}
