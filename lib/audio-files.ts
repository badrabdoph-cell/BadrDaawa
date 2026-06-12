import crypto from "node:crypto";
import { deleteProjectAssetFile, writeProjectAssetFile } from "./project-assets";
import { deleteUploadFile, listUploadFiles, writeUploadFile } from "./storage-provider";

const allowedAudioTypes: Record<string, string> = {
  "audio/aac": "aac",
  "audio/aiff": "aif",
  "audio/flac": "flac",
  "audio/m4a": "m4a",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/vnd.dlna.adts": "aac",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/x-aac": "aac",
  "audio/x-aiff": "aif",
  "audio/x-flac": "flac",
  "audio/x-m4a": "m4a",
  "audio/x-mpeg": "mp3",
  "audio/x-wav": "wav",
  "video/mp4": "m4a",
};

const allowedAudioExtensions = new Set(["mp3", "wav", "ogg", "webm", "m4a", "aac", "flac"]);
const maxAudioBytes = 35 * 1024 * 1024;
const directAudioPattern = /\.(mp3|wav|ogg|webm|m4a|aac|flac)(?:[?#].*)?$/i;
const legacyDirectAudioPattern = /\.(mp3|wav|ogg|webm|m4a|aac|mp4|aif|aiff|flac)(?:[?#].*)?$/i;

export function isYouTubeUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, "");
    return hostname === "youtube.com" || hostname === "youtu.be" || hostname.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

export function isBlockedMusicPageUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, "").toLowerCase();
    return (
      hostname === "youtube.com" ||
      hostname === "youtu.be" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "music.youtube.com" ||
      hostname === "spotify.com" ||
      hostname.endsWith(".spotify.com") ||
      hostname === "soundcloud.com" ||
      hostname.endsWith(".soundcloud.com")
    );
  } catch {
    return false;
  }
}

export function cleanPlayableAudioUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return legacyDirectAudioPattern.test(trimmed) ? trimmed : "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (isBlockedMusicPageUrl(url.toString())) return "";
    return legacyDirectAudioPattern.test(url.pathname + url.search) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function cleanNewDirectAudioUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return directAudioPattern.test(trimmed) ? trimmed : "";
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (isBlockedMusicPageUrl(url.toString())) return "";
    return directAudioPattern.test(url.pathname + url.search) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function isUploadedMusicUrl(value?: string | null) {
  return Boolean(value?.startsWith("/uploads/music/") && !value.includes(".."));
}

export async function deleteUploadedMusicFile(value?: string | null) {
  if (!isUploadedMusicUrl(value)) return false;
  return deleteUploadFile(value || "");
}

export async function deleteProjectMusicFile(value?: string | null) {
  return deleteProjectAssetFile(value);
}

function extensionFromBytes(bytes: Buffer) {
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WAVE") return "wav";
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "OggS") return "ogg";
  if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return "webm";
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp") return "m4a";
  if (bytes.length >= 3 && bytes.subarray(0, 3).toString("ascii") === "ID3") return "mp3";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) return "aac";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "mp3";
  if (bytes.length >= 4 && bytes.subarray(0, 4).toString("ascii") === "fLaC") return "flac";
  if (bytes.length >= 12 && (bytes.subarray(8, 12).toString("ascii") === "AIFF" || bytes.subarray(8, 12).toString("ascii") === "AIFC")) return "aif";
  return "";
}

function normalizeAudioExtension(extension: string) {
  if (extension === "aiff") return "aif";
  if (extension === "mp4") return "m4a";
  return extension;
}

export async function saveUploadedAudioFile(file: File | null, previousUrl?: string | null) {
  if (!file || !file.size) return "";
  const nameExtension = file.name.split(".").pop()?.toLowerCase() || "";
  if (file.size > maxAudioBytes) return "";
  const bytes = Buffer.from(await file.arrayBuffer());
  return saveAudioBytes(bytes, file.type, nameExtension, previousUrl);
}

export async function saveProjectAudioFile(file: File | null, previousUrl?: string | null) {
  if (!file || !file.size) return "";
  const nameExtension = file.name.split(".").pop()?.toLowerCase() || "";
  if (file.size > maxAudioBytes) return "";
  const bytes = Buffer.from(await file.arrayBuffer());
  const detectedExtension = extensionFromBytes(bytes);
  const extension = normalizeAudioExtension(detectedExtension || allowedAudioTypes[file.type] || (allowedAudioExtensions.has(nameExtension) ? nameExtension : ""));
  if (!extension || !allowedAudioExtensions.has(extension) || !bytes.length || bytes.length > maxAudioBytes) return "";

  const fileName = `music-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const saved = await writeProjectAssetFile(`music/${fileName}`, bytes);
  if (previousUrl && previousUrl !== saved.url) {
    await deleteProjectMusicFile(previousUrl);
  }
  return saved.url;
}

async function saveAudioBytes(bytes: Buffer, mimeType = "", nameExtension = "", previousUrl?: string | null) {
  const detectedExtension = extensionFromBytes(bytes);
  const extension = normalizeAudioExtension(detectedExtension || allowedAudioTypes[mimeType] || (allowedAudioExtensions.has(nameExtension) ? nameExtension : ""));
  if (!extension || !allowedAudioExtensions.has(extension) || !bytes.length || bytes.length > maxAudioBytes) return "";

  const fileName = `music-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const saved = await writeUploadFile(`music/${fileName}`, bytes, `audio/${extension === "mp3" ? "mpeg" : extension}`);
  const savedUrl = saved.url;
  if (previousUrl && previousUrl !== savedUrl) {
    await deleteUploadedMusicFile(previousUrl);
  }
  return savedUrl;
}

export async function saveExtractedMp3Audio(bytes: Buffer, previousUrl?: string | null) {
  if (!bytes.length || bytes.length > maxAudioBytes) return "";
  const fileName = `music-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.mp3`;
  const saved = await writeUploadFile(`music/${fileName}`, bytes, "audio/mpeg");
  const savedUrl = saved.url;
  if (previousUrl && previousUrl !== savedUrl) {
    await deleteUploadedMusicFile(previousUrl);
  }
  return savedUrl;
}

export async function saveAudioDataUrl(dataUrl: string, previousUrl?: string | null) {
  const match = dataUrl.trim().match(/^data:(audio\/[a-zA-Z0-9.+-]+|video\/mp4);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return "";
  if (Math.floor((match[2].length * 3) / 4) > maxAudioBytes) return "";
  const bytes = Buffer.from(match[2], "base64");
  return saveAudioBytes(bytes, match[1], "", previousUrl);
}

export async function listUploadedMusicFiles() {
  try {
    const entries = await listUploadFiles("music");
    const files = [];
    for (const entry of entries) {
      const extension = entry.key.split(".").pop()?.toLowerCase() || "";
      files.push({
        url: entry.url,
        modifiedAt: entry.lastModified?.getTime() || 0,
        sizeBytes: entry.size,
        extension,
        mimeType: extension ? `audio/${extension === "mp3" ? "mpeg" : extension}` : "",
      });
    }
    return files.sort((a, b) => b.modifiedAt - a.modifiedAt);
  } catch {
    return [];
  }
}
