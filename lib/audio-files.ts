import crypto from "node:crypto";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDirectory } from "./runtime-paths";

const uploadDir = path.join(process.cwd(), "public", "uploads", "music");

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

const allowedAudioExtensions = new Set(["mp3", "wav", "ogg", "webm", "m4a", "aac", "mp4", "aif", "aiff", "flac"]);
const maxAudioBytes = 35 * 1024 * 1024;

export function isYouTubeUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, "");
    return hostname === "youtube.com" || hostname === "youtu.be" || hostname.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

export function cleanPlayableAudioUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return /\.(mp3|wav|ogg|webm|m4a|aac|mp4|aif|aiff|flac)(?:[?#].*)?$/i.test(trimmed) ? trimmed : "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (isYouTubeUrl(url.toString())) return "";
    return /\.(mp3|wav|ogg|webm|m4a|aac|mp4|aif|aiff|flac)(?:[?#].*)?$/i.test(url.pathname + url.search) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function isUploadedMusicUrl(value?: string | null) {
  return Boolean(value?.startsWith("/uploads/music/") && !value.includes(".."));
}

export async function deleteUploadedMusicFile(value?: string | null) {
  if (!isUploadedMusicUrl(value)) return false;
  const filePath = path.join(process.cwd(), "public", value || "");
  if (!filePath.startsWith(uploadDir)) return false;

  try {
    await unlink(filePath);
    return true;
  } catch {
    return false;
  }
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
  const detectedExtension = extensionFromBytes(bytes);
  const extension = normalizeAudioExtension(detectedExtension || allowedAudioTypes[file.type] || (allowedAudioExtensions.has(nameExtension) ? nameExtension : ""));
  if (!extension || file.size > maxAudioBytes) return "";

  ensureDirectory(uploadDir);
  await mkdir(uploadDir, { recursive: true });
  const fileName = `music-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, bytes);

  const savedUrl = `/uploads/music/${fileName}`;
  if (previousUrl && previousUrl !== savedUrl) {
    await deleteUploadedMusicFile(previousUrl);
  }
  return savedUrl;
}

export async function listUploadedMusicFiles() {
  try {
    ensureDirectory(uploadDir);
    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(uploadDir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const filePath = path.join(uploadDir, entry.name);
      const fileStat = await stat(filePath);
      files.push({
        url: `/uploads/music/${entry.name}`,
        modifiedAt: fileStat.mtime.getTime(),
      });
    }
    return files.sort((a, b) => b.modifiedAt - a.modifiedAt);
  } catch {
    return [];
  }
}
