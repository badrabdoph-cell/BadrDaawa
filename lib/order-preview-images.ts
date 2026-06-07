import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeImageForDisplay } from "./display-images";
import { imageExtensionFromDataMime, imageExtensionFromName, isBrowserDisplayImageUrl, isSupportedImageUrl } from "./image-formats";
import { ensureDirectory } from "./runtime-paths";

const maxPreviewImageBytes = 80 * 1024 * 1024;

export async function saveOrderPreviewImages(images: string[], folder = "order-previews") {
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  ensureDirectory(uploadDir);
  const savedUrls: string[] = [];

  async function saveBytes(bytes: Buffer, extension: string, sourceLabel: string) {
    const normalized = await normalizeImageForDisplay(bytes, extension, sourceLabel);
    if (!normalized) return "";

    ensureDirectory(uploadDir);
    await mkdir(uploadDir, { recursive: true });
    const fileName = `order-preview-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${normalized.extension}`;
    await writeFile(path.join(uploadDir, fileName), normalized.bytes);
    const url = `/uploads/${folder}/${fileName}`;
    const convertedSuffix = normalized.converted ? ` converted from ${normalized.originalExtension}` : "";
    console.log(`[Order Images] Saved ${url} (${normalized.bytes.length} bytes${convertedSuffix}).`);
    return url;
  }

  for (const image of images.slice(0, 3)) {
    const value = image.trim();
    if (!value || !isSupportedImageUrl(value)) {
      console.error(`[Order Images] Ignored unsupported preview image payload for ${folder}.`);
      continue;
    }

    if ((value.startsWith("/uploads/") || value.startsWith("/assets/")) && isBrowserDisplayImageUrl(value)) {
      savedUrls.push(value);
      continue;
    }

    if (value.startsWith("/uploads/") || value.startsWith("/assets/")) {
      try {
        const diskPath = path.join(process.cwd(), "public", value.replace(/^\/+/, ""));
        const convertedUrl = await saveBytes(await readFile(diskPath), imageExtensionFromName(value) || "jpg", `existing:${value}`);
        if (convertedUrl) savedUrls.push(convertedUrl);
      } catch (error) {
        console.error(`[Order Images] Failed to convert existing non-displayable image for ${folder}: ${value}`, error);
      }
      continue;
    }

    const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) {
      console.error(`[Order Images] Invalid preview image data URL for ${folder}.`);
      continue;
    }

    const bytes = Buffer.from(match[2], "base64");
    if (!bytes.length || bytes.length > maxPreviewImageBytes) {
      console.error(`[Order Images] Preview image skipped for ${folder}: invalid size ${bytes.length}.`);
      continue;
    }

    const extension = imageExtensionFromDataMime(match[1]) || "jpg";
    const url = await saveBytes(bytes, extension, `preview:${folder}`);
    if (url) savedUrls.push(url);
  }

  console.log(`[Order Images] Received ${images.length}, saved ${savedUrls.length} in ${folder}.`, savedUrls);
  return savedUrls;
}
