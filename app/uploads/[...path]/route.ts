import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { NextRequest, NextResponse } from "next/server";
import { runtimeUploadSubdirs, runtimeUploadsDir } from "@/lib/runtime-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mimeTypes: Record<string, string> = {
  aac: "audio/aac",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  avif: "image/avif",
  bmp: "image/bmp",
  flac: "audio/flac",
  gif: "image/gif",
  ico: "image/vnd.microsoft.icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  ogg: "audio/ogg",
  png: "image/png",
  wav: "audio/wav",
  webm: "audio/webm",
  webp: "image/webp",
};

type RouteProps = {
  params: Promise<{ path?: string[] }>;
};

function invalidSegment(segment: string) {
  return !segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\") || segment.includes("\0");
}

async function resolveUploadPath(segments: string[] | undefined) {
  const cleanSegments = (segments || []).map((segment) => decodeURIComponent(segment)).filter(Boolean);
  if (!cleanSegments.length || cleanSegments.some(invalidSegment)) return null;
  if (!runtimeUploadSubdirs.includes(cleanSegments[0])) return null;

  const filePath = path.join(runtimeUploadsDir, ...cleanSegments);
  const root = `${runtimeUploadsDir}${path.sep}`;
  if (!filePath.startsWith(root)) return null;

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return null;
    return { filePath, size: fileStat.size };
  } catch {
    return null;
  }
}

function contentTypeFor(filePath: string) {
  const extension = path.extname(filePath).replace(/^\./, "").toLowerCase();
  return mimeTypes[extension] || "application/octet-stream";
}

function parseRange(range: string | null, size: number) {
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end < start || start >= size) return null;
  return { start, end: Math.min(end, size - 1) };
}

function streamFile(filePath: string, range?: { start: number; end: number }) {
  const stream = range ? createReadStream(filePath, { start: range.start, end: range.end }) : createReadStream(filePath);
  return Readable.toWeb(stream) as BodyInit;
}

export async function GET(request: NextRequest, { params }: RouteProps) {
  const resolved = await resolveUploadPath((await params).path);
  if (!resolved) return NextResponse.json({ error: "Upload not found" }, { status: 404 });

  const type = contentTypeFor(resolved.filePath);
  const range = parseRange(request.headers.get("range"), resolved.size);
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": type,
  });

  if (range) {
    headers.set("Content-Length", String(range.end - range.start + 1));
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${resolved.size}`);
    return new NextResponse(streamFile(resolved.filePath, range), { status: 206, headers });
  }

  headers.set("Content-Length", String(resolved.size));
  return new NextResponse(streamFile(resolved.filePath), { headers });
}

export async function HEAD(request: NextRequest, props: RouteProps) {
  const response = await GET(request, props);
  return new NextResponse(null, { status: response.status, headers: response.headers });
}
