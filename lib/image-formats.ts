export const supportedImageExtensions = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "raw",
  "cr3",
  "cr2",
  "dng",
  "tiff",
  "tif",
  "psd",
  "psb",
  "svg",
  "ai",
  "eps",
  "bmp",
  "heic",
  "heif",
  "ico",
  "avif",
  "nef",
  "arw",
  "raf",
  "orf",
  "rw2",
  "rwl",
  "jp2",
  "j2k",
  "ppm",
  "pgm",
  "pbm",
  "tga",
  "xcf",
  "exr",
  "hdr",
  "dds",
  "icns",
  "cur",
  "wbmp",
] as const;

const supportedImageExtensionSet = new Set<string>(supportedImageExtensions);

export const browserDisplayImageExtensions = ["jpg", "jpeg", "png", "webp", "gif", "svg", "bmp", "ico", "avif"] as const;

const browserDisplayImageExtensionSet = new Set<string>(browserDisplayImageExtensions);

const imageMimeExtensions: Record<string, string> = {
  "application/illustrator": "ai",
  "application/postscript": "eps",
  "application/psd": "psd",
  "application/vnd.adobe.illustrator": "ai",
  "application/x-photoshop": "psd",
  "image/aces": "exr",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/ico": "ico",
  "image/j2k": "j2k",
  "image/jp2": "jp2",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/openraster": "ora",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/tga": "tga",
  "image/tiff": "tif",
  "image/vnd.adobe.photoshop": "psd",
  "image/vnd.microsoft.icon": "ico",
  "image/vnd.radiance": "hdr",
  "image/vnd.wap.wbmp": "wbmp",
  "image/webp": "webp",
  "image/x-adobe-dng": "dng",
  "image/x-arw": "arw",
  "image/x-canon-cr2": "cr2",
  "image/x-canon-cr3": "cr3",
  "image/x-coreldraw": "cdr",
  "image/x-dds": "dds",
  "image/x-dng": "dng",
  "image/x-exr": "exr",
  "image/x-icon": "ico",
  "image/x-icns": "icns",
  "image/x-nikon-nef": "nef",
  "image/x-olympus-orf": "orf",
  "image/x-panasonic-raw": "rw2",
  "image/x-portable-anymap": "pnm",
  "image/x-portable-bitmap": "pbm",
  "image/x-portable-graymap": "pgm",
  "image/x-portable-pixmap": "ppm",
  "image/x-raw": "raw",
  "image/x-rw2": "rw2",
  "image/x-sony-arw": "arw",
  "image/x-tga": "tga",
  "image/x-xbitmap": "xbm",
  "image/x-xcf": "xcf",
};

export const acceptedImageFormats = `image/*,${supportedImageExtensions.map((extension) => `.${extension}`).join(",")}`;

export function cleanImageExtension(value?: string | null) {
  const extension = value?.split("?")[0]?.split("#")[0]?.replace(/^\./, "").trim().toLowerCase() || "";
  if (!supportedImageExtensionSet.has(extension)) return "";
  if (extension === "jpeg") return "jpg";
  if (extension === "tiff") return "tif";
  return extension;
}

export function imageExtensionFromName(fileName = "") {
  return cleanImageExtension(fileName.split(".").pop());
}

export function imageExtensionFromMime(type = "") {
  const extension = imageMimeExtensions[type.trim().toLowerCase()] || "";
  return cleanImageExtension(extension);
}

export function imageExtensionFromDataMime(type = "") {
  return imageExtensionFromMime(type) || cleanImageExtension(type.replace(/^image\//i, ""));
}

export function imageExtensionFromBytes(bytes: Uint8Array) {
  if (bytes.length < 4) return "";

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "gif";
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70
  ) {
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]).toLowerCase();
    if (brand === "avif" || brand === "avis") return "avif";
    if (brand === "heic" || brand === "heix" || brand === "hevc" || brand === "hevx") return "heic";
    if (brand === "heif" || brand === "mif1" || brand === "msf1") return "heif";
  }
  if (
    bytes.length >= 4 &&
    ((bytes[0] === 0x49 && bytes[1] === 0x49 && bytes[2] === 0x2a && bytes[3] === 0x00) ||
      (bytes[0] === 0x4d && bytes[1] === 0x4d && bytes[2] === 0x00 && bytes[3] === 0x2a))
  ) {
    return "tif";
  }

  return "";
}

export function isSupportedImageFile(file: File) {
  return Boolean(file.size > 0 && (imageExtensionFromMime(file.type) || imageExtensionFromName(file.name) || file.type.startsWith("image/")));
}

export function isSupportedImageUrl(value: string, allowDataImage = true) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (allowDataImage && /^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) return true;
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const clean = trimmed.split("?")[0]?.split("#")[0] || "";
    return Boolean(imageExtensionFromName(clean) || /^https?:\/\//i.test(trimmed) || trimmed.startsWith("/"));
  }
  return false;
}

export function isBrowserDisplayImageExtension(value?: string | null) {
  const extension = cleanImageExtension(value);
  return Boolean(extension && browserDisplayImageExtensionSet.has(extension));
}

export function isBrowserDisplayImageUrl(value: string, allowDataImage = true) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (allowDataImage && /^data:image\/[a-z0-9.+-]+;base64,/i.test(trimmed)) {
    const mime = trimmed.slice(5, trimmed.indexOf(";"));
    return isBrowserDisplayImageExtension(imageExtensionFromDataMime(mime));
  }
  if (trimmed.startsWith("/") || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    const clean = trimmed.split("?")[0]?.split("#")[0] || "";
    const extension = imageExtensionFromName(clean);
    if (extension) return isBrowserDisplayImageExtension(extension);
    return /^https?:\/\//i.test(trimmed);
  }
  return false;
}

export function imageExtensionForUpload(type = "", fileName = "", fallback = "jpg") {
  return imageExtensionFromMime(type) || imageExtensionFromName(fileName) || cleanImageExtension(fallback) || "jpg";
}
