import crypto from "node:crypto";
import { normalizeImageForDisplay } from "./display-images";
import { imageExtensionFromBytes, imageExtensionFromDataMime, imageExtensionFromMime, imageExtensionFromName, isBrowserDisplayImageUrl, isSupportedImageUrl } from "./image-formats";
import { readPublicMediaFile, writeUploadFile } from "./storage-provider";

const maxPreviewImageBytes = 32 * 1024 * 1024;

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

export async function saveOrderPreviewImages(images: PreviewImageInput[], folder = "order-previews", requestId = "local") {
  const savedUrls: string[] = [];

  async function saveBytes(bytes: Buffer, extension: string, sourceLabel: string) {
    const startedAt = Date.now();
    const detectedExtension = imageExtensionFromBytes(bytes);
    const finalExtension = extension || detectedExtension;
    console.log(
      `[Order Images ${requestId}] Optimizing ${sourceLabel} (${bytes.length} bytes, extension=${extension || "unknown"}, detected=${detectedExtension || "unknown"}) for ${folder}.`,
    );
    if (!finalExtension) {
      console.error(`[Order Images ${requestId}] Rejected ${sourceLabel}: unsupported image bytes.`);
      return "";
    }
    const normalized = await normalizeImageForDisplay(bytes, finalExtension, sourceLabel);
    if (!normalized) return "";

    const fileName = `order-preview-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${normalized.extension}`;
    const saved = await writeUploadFile(`${folder}/${fileName}`, normalized.bytes, `image/${normalized.extension}`);
    const url = saved.url;
    const convertedSuffix = normalized.converted ? ` converted from ${normalized.originalExtension}` : "";
    console.log(`[Order Images ${requestId}] Saved ${url} (${normalized.bytes.length} bytes${convertedSuffix}, ${Date.now() - startedAt}ms).`);
    return url;
  }

  for (const image of images.slice(0, 3)) {
    if (isFileInput(image)) {
      if (!image.size || image.size > maxPreviewImageBytes) {
        console.error(`[Order Images ${requestId}] Uploaded preview image skipped for ${folder}: invalid size ${image.size}.`);
        continue;
      }

      const bytes = Buffer.from(await image.arrayBuffer());
      const detectedExtension = imageExtensionFromBytes(bytes);
      const extension = imageExtensionFromMime(image.type) || imageExtensionFromName(image.name) || detectedExtension;
      console.log(
        `[Order Images ${requestId}] File input ${image.name || "unnamed"} type=${image.type || "unknown"} size=${image.size} extension=${extension || "unknown"} detected=${detectedExtension || "unknown"}.`,
      );
      if (!extension) {
        console.error(`[Order Images ${requestId}] Uploaded preview image skipped for ${folder}: unsupported file (${image.type || "empty"} / ${image.name || "unnamed"}).`);
        continue;
      }

      const url = await saveBytes(bytes, extension, image.name || image.type || `upload:${folder}`);
      if (url) savedUrls.push(url);
      continue;
    }

    const { value, name, type } = normalizePreviewInput(image);
    if (!value) {
      console.error(`[Order Images ${requestId}] Ignored unsupported preview image payload for ${folder}.`);
      continue;
    }

    const dataUrl = parseDataUrl(value);
    if (dataUrl) {
      const bytes = Buffer.from(dataUrl.base64, "base64");
      if (!bytes.length || bytes.length > maxPreviewImageBytes) {
        console.error(`[Order Images ${requestId}] Preview image skipped for ${folder}: invalid size ${bytes.length}.`);
        continue;
      }

      const detectedExtension = imageExtensionFromBytes(bytes);
      const extension = imageExtensionFromDataMime(dataUrl.mime) || imageExtensionFromMime(type) || imageExtensionFromName(name) || detectedExtension;
      console.log(
        `[Order Images ${requestId}] Data URL input name=${name || "unnamed"} mime=${dataUrl.mime || type || "unknown"} size=${bytes.length} extension=${extension || "unknown"} detected=${detectedExtension || "unknown"}.`,
      );
      if (!extension) {
        console.error(`[Order Images ${requestId}] Preview image skipped for ${folder}: unsupported MIME/name (${dataUrl.mime || "empty"} / ${type || "empty"} / ${name || "unnamed"}).`);
        continue;
      }

      const url = await saveBytes(bytes, extension, name || dataUrl.mime || `preview:${folder}`);
      if (url) savedUrls.push(url);
      continue;
    }

    if (!isSupportedImageUrl(value)) {
      console.error(`[Order Images ${requestId}] Ignored unsupported preview image URL for ${folder}: ${value.slice(0, 80)}.`);
      continue;
    }

    if (value.startsWith("/uploads/") || value.startsWith("/assets/")) {
      try {
        const bytes = await readPublicMediaFile(value);
        const convertedUrl = bytes ? await saveBytes(bytes, imageExtensionFromName(value) || "jpg", `existing:${value}`) : "";
        if (convertedUrl) savedUrls.push(convertedUrl);
        else if (isBrowserDisplayImageUrl(value)) savedUrls.push(value);
      } catch (error) {
        console.error(`[Order Images ${requestId}] Failed to convert existing non-displayable image for ${folder}: ${value}`, error);
        if (isBrowserDisplayImageUrl(value)) savedUrls.push(value);
      }
      continue;
    }
  }

  console.log(`[Order Images ${requestId}] Received ${images.length}, saved ${savedUrls.length} in ${folder}.`, savedUrls);
  return savedUrls;
}
