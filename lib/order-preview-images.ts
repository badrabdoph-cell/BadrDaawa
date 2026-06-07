import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { imageExtensionFromDataMime, isSupportedImageUrl } from "./image-formats";
import { ensureDirectory } from "./runtime-paths";

const maxPreviewImageBytes = 12 * 1024 * 1024;

export async function saveOrderPreviewImages(images: string[], folder = "order-previews") {
  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  ensureDirectory(uploadDir);
  const savedUrls: string[] = [];

  for (const image of images.slice(0, 3)) {
    const value = image.trim();
    if (!value || !isSupportedImageUrl(value)) {
      console.error(`[Order Images] Ignored unsupported preview image payload for ${folder}.`);
      continue;
    }

    if (value.startsWith("/uploads/") || value.startsWith("/assets/")) {
      savedUrls.push(value);
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
    ensureDirectory(uploadDir);
    await mkdir(uploadDir, { recursive: true });
    const fileName = `order-preview-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
    await writeFile(path.join(uploadDir, fileName), bytes);
    const url = `/uploads/${folder}/${fileName}`;
    console.log(`[Order Images] Saved ${url} (${bytes.length} bytes).`);
    savedUrls.push(url);
  }

  console.log(`[Order Images] Received ${images.length}, saved ${savedUrls.length} in ${folder}.`, savedUrls);
  return savedUrls;
}
