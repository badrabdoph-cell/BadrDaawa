import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeImageForDisplay } from "./display-images";
import {
  imageExtensionForUpload,
  imageExtensionFromDataMime,
  imageExtensionFromName,
  isBrowserDisplayImageUrl,
  isSupportedImageFile,
  isSupportedImageUrl,
} from "./image-formats";
import { ensureDirectory } from "./runtime-paths";
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

async function saveImageBytes(bytes: Buffer, extension: string, sourceLabel: string) {
  const normalized = await normalizeImageForDisplay(bytes, extension, sourceLabel);
  if (!normalized) return "";

  const uploadDir = path.join(process.cwd(), "public", "uploads", "client-invitations");
  ensureDirectory(uploadDir);
  await mkdir(uploadDir, { recursive: true });
  const fileName = `invitation-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${normalized.extension}`;
  await writeFile(path.join(uploadDir, fileName), normalized.bytes);
  const url = `/uploads/client-invitations/${fileName}`;
  const convertedSuffix = normalized.converted ? ` converted from ${normalized.originalExtension}` : "";
  console.log(`[Invitation Images] Saved ${url} (${normalized.bytes.length} bytes${convertedSuffix}).`);
  return url;
}

async function saveExistingInternalImageUrl(value: string) {
  const normalized = normalizeInternalAssetUrl(value) || value;
  if (isBrowserDisplayImageUrl(normalized)) return normalized;
  if (!normalized.startsWith("/uploads/") && !normalized.startsWith("/assets/")) {
    console.error(`[Invitation Images] Existing image is not browser-displayable and cannot be converted without a local file: ${normalized}`);
    return "";
  }

  try {
    const diskPath = path.join(process.cwd(), "public", normalized.replace(/^\/+/, ""));
    const bytes = await readFile(diskPath);
    const extension = imageExtensionFromName(normalized) || "jpg";
    return saveImageBytes(bytes, extension, `existing:${normalized}`);
  } catch (error) {
    console.error(`[Invitation Images] Failed to convert existing non-displayable image: ${normalized}`, error);
    return "";
  }
}

async function saveGalleryImage(image: string | File) {
  if (typeof image !== "string") {
    if (!isSupportedImageFile(image)) {
      console.error(`[Invitation Images] Unsupported uploaded image: ${image.name || "unnamed"} (${image.type || "unknown"}).`);
      return "";
    }
    if (image.size > maxRawGalleryImageBytes) {
      console.error(`[Invitation Images] Uploaded image is too large: ${image.name || "unnamed"} (${image.size} bytes).`);
      return "";
    }
    try {
      const bytes = Buffer.from(await image.arrayBuffer());
      if (!bytes.length) {
        console.error(`[Invitation Images] Uploaded image is empty: ${image.name || "unnamed"}.`);
        return "";
      }
      return saveImageBytes(bytes, imageExtension(image.type, image.name), image.name || image.type || "uploaded invitation image");
    } catch (error) {
      console.error("[Invitation Images] Failed to save uploaded invitation image", error);
      return "";
    }
  }

  const value = image.trim();
  if (!value) return "";

  if (isExistingImageUrl(value)) {
    return saveExistingInternalImageUrl(value);
  }

  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) {
    console.error("[Invitation Images] Ignored invalid gallery image payload.");
    return "";
  }

  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > maxGalleryImageBytes) {
    console.error(`[Invitation Images] Optimized gallery image is invalid or too large (${bytes.length} bytes).`);
    return "";
  }

  try {
    return saveImageBytes(bytes, imageExtensionFromDataMime(match[1].toLowerCase()) || "jpg", "optimized invitation image");
  } catch (error) {
    console.error("[Invitation Images] Failed to save invitation gallery image", error);
    return "";
  }
}

export async function saveInvitationGalleryImages(images: Array<string | File>) {
  const savedUrls: string[] = [];

  for (const image of images.slice(0, 3)) {
    const saved = await saveGalleryImage(image);
    if (saved) savedUrls.push(saved);
  }

  console.log(`[Invitation Images] Received ${images.length}, saved ${savedUrls.length}.`, savedUrls);
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
