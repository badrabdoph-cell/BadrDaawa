import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

type VideoExtension = "mp4" | "mov" | "webm";

export const maxVideoAudioExtractionBytes = 120 * 1024 * 1024;

const videoTypes: Record<string, VideoExtension> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const videoExtensions = new Set<VideoExtension>(["mp4", "mov", "webm"]);

function binaryPath(kind: "ffmpeg" | "ffprobe") {
  const envPath = kind === "ffmpeg" ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH;
  if (envPath?.trim()) return envPath.trim();
  return kind;
}

function fileExtension(file: File): VideoExtension | "" {
  const fromName = file.name.split(".").pop()?.toLowerCase() || "";
  if (videoExtensions.has(fromName as VideoExtension)) return fromName as VideoExtension;
  return videoTypes[file.type] || "";
}

export function validateVideoAudioFile(file: File | null) {
  if (!file || !file.size) return { ok: false, error: "اختر ملف فيديو أولاً." };
  if (file.size > maxVideoAudioExtractionBytes) return { ok: false, error: "حجم الفيديو كبير جدًا. الحد الأقصى 120MB." };
  if (!fileExtension(file)) return { ok: false, error: "صيغة الفيديو غير مدعومة. استخدم MP4 أو MOV أو WEBM." };
  return { ok: true, error: "" };
}

function runProcess(command: string, args: string[], options: { timeoutMs?: number } = {}) {
  return new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    const timer = options.timeoutMs
      ? setTimeout(() => {
          child.kill("SIGKILL");
          reject(new Error("timeout"));
        }, options.timeoutMs)
      : null;

    child.stdout.on("data", (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on("data", (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.on("error", (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (timer) clearTimeout(timer);
      resolve({
        code,
        stdout: Buffer.concat(stdoutChunks).toString("utf8").slice(-4000),
        stderr: Buffer.concat(stderrChunks).toString("utf8").slice(-4000),
      });
    });
  });
}

async function hasAudioStream(inputPath: string) {
  const ffprobe = binaryPath("ffprobe");
  try {
    const result = await runProcess(ffprobe, ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=codec_type", "-of", "csv=p=0", inputPath], {
      timeoutMs: 30000,
    });
    if (result.code === 0) return result.stdout.trim().includes("audio");
  } catch {
    return null;
  }
  return null;
}

function friendlyFfmpegError(stderr: string) {
  const text = stderr.toLowerCase();
  if (text.includes("does not contain any stream") || text.includes("stream specifier") || text.includes("matches no streams")) {
    return "الفيديو لا يحتوي على مسار صوتي يمكن استخراجه.";
  }
  if (text.includes("invalid data") || text.includes("moov atom not found")) return "ملف الفيديو غير صالح أو غير مكتمل.";
  if (text.includes("permission denied")) return "تعذر قراءة ملف الفيديو على الخادم.";
  return "فشل استخراج الصوت من الفيديو. جرّب فيديو آخر بصيغة MP4 أو MOV أو WEBM.";
}

export async function extractMp3AudioFromVideo(file: File) {
  const validation = validateVideoAudioFile(file);
  if (!validation.ok) return { bytes: null as Buffer | null, fileName: "", error: validation.error };

  const extension = fileExtension(file);
  const tempDir = path.join(os.tmpdir(), `badrdaawa-video-audio-${randomUUID()}`);
  const inputPath = path.join(tempDir, `source.${extension}`);
  const outputPath = path.join(tempDir, "extracted-audio.mp3");

  try {
    await mkdir(tempDir, { recursive: true });
    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

    const audioCheck = await hasAudioStream(inputPath);
    if (audioCheck === false) return { bytes: null, fileName: "", error: "الفيديو لا يحتوي على مسار صوتي يمكن استخراجه." };

    const ffmpeg = binaryPath("ffmpeg");
    const result = await runProcess(
      ffmpeg,
      ["-y", "-hide_banner", "-loglevel", "error", "-i", inputPath, "-map", "0:a:0", "-vn", "-acodec", "libmp3lame", "-b:a", "160k", "-ar", "44100", outputPath],
      { timeoutMs: 180000 },
    );

    if (result.code !== 0) return { bytes: null, fileName: "", error: friendlyFfmpegError(result.stderr) };

    const bytes = await readFile(outputPath).catch(() => null);
    if (!bytes?.length) return { bytes: null, fileName: "", error: "الفيديو لا يحتوي على صوت قابل للاستخراج." };
    return {
      bytes,
      fileName: `${file.name.replace(/\.[^.]+$/, "") || "video"}-audio.mp3`,
      error: "",
    };
  } catch (error) {
    const message = error instanceof Error && error.message === "spawn ffmpeg ENOENT" ? "محرك استخراج الصوت FFmpeg غير متاح على الخادم." : "";
    return { bytes: null, fileName: "", error: message || "فشل استخراج الصوت من الفيديو. حاول مرة أخرى أو استخدم فيديو أصغر." };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
