import path from "path";
import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { getUploadFileContentType, normalizeStorageKey, statUploadFile, streamUploadFile } from "@/lib/storage-provider";

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
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  ogg: "audio/ogg",
  png: "image/png",
  svg: "image/svg+xml",
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

function contentTypeFor(key: string) {
  const extension = path.extname(key).replace(/^\./, "").toLowerCase();
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

export async function GET(request: NextRequest, { params }: RouteProps) {
  const cleanSegments = ((await params).path || []).map((segment) => decodeURIComponent(segment)).filter(Boolean);
  if (!cleanSegments.length || cleanSegments.some(invalidSegment)) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const storageKey = normalizeStorageKey(`assets/admin/${cleanSegments.join("/")}`);
  const file = await statUploadFile(storageKey);

  if (!file) {
    const legacyPath = path.join(process.cwd(), "public", "assets", "admin", ...cleanSegments);
    try {
      const legacyBytes = await readFile(legacyPath);
      const type = contentTypeFor(legacyPath);
      return new NextResponse(legacyBytes, {
        status: 200,
        headers: {
          "Content-Type": type,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Length": String(legacyBytes.length),
        },
      });
    } catch {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }
  }

  const type = getUploadFileContentType(storageKey) || contentTypeFor(storageKey);
  const range = parseRange(request.headers.get("range"), file.size);
  const stream = await streamUploadFile(storageKey, range || undefined);
  if (!stream) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
    "Content-Type": type,
  });

  if (range) {
    headers.set("Content-Length", String(stream.contentLength));
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${file.size}`);
    return new NextResponse(stream.body, { status: 206, headers });
  }

  headers.set("Content-Length", String(stream.contentLength));
  return new NextResponse(stream.body, { headers });
}

export async function HEAD(request: NextRequest, props: RouteProps) {
  const response = await GET(request, props);
  return new NextResponse(null, { status: response.status, headers: response.headers });
}
