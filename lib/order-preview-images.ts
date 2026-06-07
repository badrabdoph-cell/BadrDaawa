import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { normalizeImageForDisplay } from "./display-images";
import { imageExtensionFromDataMime, imageExtensionFromMime, imageExtensionFromName, isBrowserDisplayImageUrl, isSupportedImageUrl } from "./image-formats";
import { ensureDirectory } from "./runtime-paths";

const maxPreviewImageBytes = 80 * 1024 * 1024;

export type PreviewImageInput =
  | string
  | File
  | {
      dataUrl?: string;
      name?: string;
      type?: string;
    };

function normalizePreviewInput(image: PreviewImageInput) {
  if (isFileInput(image)) {
    return { value: "", name: image.name, type: image.type };
  }

  if (typeof image === "string") {
    return { value: image.trim(), name: "", type: "" };
  }

  return {
    value: typeof image.dataUrl === "string" ? image.dataUrl.trim() : "",
    name: typeof image.name === "string" ? image.name.trim() : "",
    type: typeof image.type === "string" ? image.type.trim() : "",
  };
}

function parseDataUrl(value: string) {
  const match = value.match(/^data:([^;,]*)(?:;[^,]*)?;base64,([a-zA-Z0-9+/=]+)$/i);
  if (!match) return null;
  return { mime: match[1] || "", base64: match[2] || "" };
}

function isFileInput(image: PreviewImageInput): image is File {
  return typeof File !== "undefined" && image instanceof File;
}

export async function saveOrderPreviewImages(images: PreviewImageInput[], folder = "order-previews") {
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
    if (isFileInput(image)) {
      if (!image.size || image.size > maxPreviewImageBytes) {
        console.error(`[Order Images] Uploaded preview image skipped for ${folder}: invalid size ${image.size}.`);
        continue;
      }

      const extension = imageExtensionFromMime(image.type) || imageExtensionFromName(image.name);
      if (!extension) {
        console.error(`[Order Images] Uploaded preview image skipped for ${folder}: unsupported file (${image.type || "empty"} / ${image.name || "unnamed"}).`);
        continue;
      }

      const url = await saveBytes(Buffer.from(await image.arrayBuffer()), extension, image.name || image.type || `upload:${folder}`);
      if (url) savedUrls.push(url);
      continue;
    }

    const { value, name, type } = normalizePreviewInput(image);
    if (!value) {
      console.error(`[Order Images] Ignored unsupported preview image payload for ${folder}.`);
      continue;
    }

    const dataUrl = parseDataUrl(value);
    if (dataUrl) {
      const bytes = Buffer.from(dataUrl.base64, "base64");
      if (!bytes.length || bytes.length > maxPreviewImageBytes) {
        console.error(`[Order Images] Preview image skipped for ${folder}: invalid size ${bytes.length}.`);
        continue;
      }

      const extension = imageExtensionFromDataMime(dataUrl.mime) || imageExtensionFromMime(type) || imageExtensionFromName(name);
      if (!extension) {
        console.error(`[Order Images] Preview image skipped for ${folder}: unsupported MIME/name (${dataUrl.mime || "empty"} / ${type || "empty"} / ${name || "unnamed"}).`);
        continue;
      }

      const url = await saveBytes(bytes, extension, name || dataUrl.mime || `preview:${folder}`);
      if (url) savedUrls.push(url);
      continue;
    }

    if (!isSupportedImageUrl(value)) {
      console.error(`[Order Images] Ignored unsupported preview image URL for ${folder}: ${value.slice(0, 80)}.`);
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
  }

  console.log(`[Order Images] Received ${images.length}, saved ${savedUrls.length} in ${folder}.`, savedUrls);
  return savedUrls;
}
