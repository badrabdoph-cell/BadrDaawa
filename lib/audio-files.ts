import crypto from "node:crypto";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadDir = path.join(process.cwd(), "public", "uploads", "music");

const allowedAudioTypes: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
};

const allowedAudioExtensions = new Set(["mp3", "wav", "ogg", "webm", "m4a", "aac"]);
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
  if (trimmed.startsWith("/")) return /\.(mp3|wav|ogg|webm|m4a|aac)(?:[?#].*)?$/i.test(trimmed) ? trimmed : "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    if (isYouTubeUrl(url.toString())) return "";
    return /\.(mp3|wav|ogg|webm|m4a|aac)(?:[?#].*)?$/i.test(url.pathname + url.search) ? url.toString() : "";
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

export async function saveUploadedAudioFile(file: File | null, previousUrl?: string | null) {
  if (!file || !file.size) return "";
  const nameExtension = file.name.split(".").pop()?.toLowerCase() || "";
  const extension = allowedAudioTypes[file.type] || (allowedAudioExtensions.has(nameExtension) ? nameExtension : "");
  if (!extension || file.size > maxAudioBytes) return "";

  await mkdir(uploadDir, { recursive: true });
  const fileName = `music-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const filePath = path.join(uploadDir, fileName);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  const savedUrl = `/uploads/music/${fileName}`;
  if (previousUrl && previousUrl !== savedUrl) {
    await deleteUploadedMusicFile(previousUrl);
  }
  return savedUrl;
}

export async function listUploadedMusicFiles() {
  try {
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
