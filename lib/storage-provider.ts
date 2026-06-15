import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { runtimeUploadsDir } from "./runtime-paths";

export type StorageProviderKind = "local" | "railway-volume" | "s3" | "r2";

export type StorageFile = {
  key: string;
  url: string;
  size: number;
  lastModified?: Date;
  contentType?: string;
};

export type StorageListFile = StorageFile & {
  relativePath: string;
};

export type StorageWriteInput = {
  key: string;
  bytes: Buffer | Uint8Array;
  contentType?: string;
};

export type StorageReadRange = {
  start: number;
  end: number;
};

export type StorageReadResult = {
  body: BodyInit;
  size: number;
  contentLength: number;
  lastModified?: Date;
};

export interface StorageProvider {
  kind: StorageProviderKind;
  publicUrl(key: string): string;
  write(input: StorageWriteInput): Promise<StorageFile>;
  read(key: string): Promise<Buffer>;
  readStream(key: string, range?: StorageReadRange): Promise<StorageReadResult>;
  stat(key: string): Promise<StorageFile | null>;
  delete(key: string): Promise<boolean>;
  list(prefix?: string): Promise<StorageListFile[]>;
}

const uploadUrlPrefix = "/uploads/";

function configuredProviderKind(): StorageProviderKind {
  const value = (process.env.STORAGE_PROVIDER || process.env.NEXT_PUBLIC_STORAGE_PROVIDER || "local").trim().toLowerCase();
  if (value === "railway" || value === "railway-volumes") return "railway-volume";
  if (value === "railway-volume" || value === "local" || value === "s3" || value === "r2") return value;
  return "local";
}

function uploadRootFor(kind: StorageProviderKind) {
  return process.env.STORAGE_LOCAL_ROOT || runtimeUploadsDir;
}

export function normalizeStorageKey(value: string) {
  const clean = decodeURIComponent(value || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/^uploads\/+/, "");
  const parts = clean.split(/[\\/]+/).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === ".." || part.includes("\0"))) return "";
  return parts.join("/");
}

export function storageKeyFromUploadUrl(value?: string | null) {
  const clean = (value || "").trim();
  if (!clean) return "";
  try {
    const pathname = clean.startsWith("http://") || clean.startsWith("https://") ? new URL(clean).pathname : clean.split("?")[0].split("#")[0];
    if (!pathname.startsWith(uploadUrlPrefix)) return "";
    return normalizeStorageKey(pathname.slice(uploadUrlPrefix.length));
  } catch {
    const pathname = clean.split("?")[0].split("#")[0];
    return pathname.startsWith(uploadUrlPrefix) ? normalizeStorageKey(pathname.slice(uploadUrlPrefix.length)) : "";
  }
}

export function uploadUrlFromStorageKey(key: string) {
  const normalized = normalizeStorageKey(key);
  return normalized ? `${uploadUrlPrefix}${normalized}` : "";
}

function extensionFromKey(key: string) {
  return key.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
}

function mimeFromKey(key: string) {
  const extension = extensionFromKey(key);
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
    wav: "audio/wav",
    webm: "audio/webm",
    webp: "image/webp",
  };
  return mimeTypes[extension] || "application/octet-stream";
}

class LocalStorageProvider implements StorageProvider {
  kind: StorageProviderKind;
  private root: string;

  constructor(kind: StorageProviderKind, root: string) {
    this.kind = kind;
    this.root = path.resolve(root);
  }

  publicUrl(key: string) {
    return uploadUrlFromStorageKey(key);
  }

  private filePath(key: string) {
    const normalized = normalizeStorageKey(key);
    if (!normalized) return "";
    const target = path.resolve(this.root, normalized);
    return target.startsWith(`${this.root}${path.sep}`) ? target : "";
  }

  async write(input: StorageWriteInput) {
    const key = normalizeStorageKey(input.key);
    const filePath = this.filePath(key);
    if (!key || !filePath) throw new Error("Invalid storage key.");
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, input.bytes);
    const fileStat = await stat(filePath);
    return {
      key,
      relativePath: key,
      url: this.publicUrl(key),
      size: fileStat.size,
      lastModified: fileStat.mtime,
      contentType: input.contentType || mimeFromKey(key),
    };
  }

  async read(key: string) {
    const filePath = this.filePath(key);
    if (!filePath) throw new Error("Invalid storage key.");
    return readFile(filePath);
  }

  async readStream(key: string, range?: StorageReadRange) {
    const file = await this.stat(key);
    if (!file) throw new Error("Storage file not found.");
    const filePath = this.filePath(key);
    if (!filePath) throw new Error("Invalid storage key.");
    const stream = range ? createReadStream(filePath, { start: range.start, end: range.end }) : createReadStream(filePath);
    return {
      body: Readable.toWeb(stream) as BodyInit,
      size: file.size,
      contentLength: range ? range.end - range.start + 1 : file.size,
      lastModified: file.lastModified,
    };
  }

  async stat(key: string) {
    const normalized = normalizeStorageKey(key);
    const filePath = this.filePath(normalized);
    if (!normalized || !filePath) return null;
    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) return null;
      return {
        key: normalized,
        relativePath: normalized,
        url: this.publicUrl(normalized),
        size: fileStat.size,
        lastModified: fileStat.mtime,
        contentType: mimeFromKey(normalized),
      };
    } catch {
      return null;
    }
  }

  async delete(key: string) {
    const filePath = this.filePath(key);
    if (!filePath) return false;
    try {
      await unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix = "") {
    const normalizedPrefix = normalizeStorageKey(prefix);
    const startDir = path.resolve(this.root, normalizedPrefix);
    if (!startDir.startsWith(this.root)) return [];
    const files: StorageListFile[] = [];

    async function walk(dir: string, root: string, provider: LocalStorageProvider) {
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(fullPath, root, provider);
          continue;
        }
        if (!entry.isFile()) continue;
        const fileStat = await stat(fullPath).catch(() => null);
        if (!fileStat) continue;
        const key = path.relative(root, fullPath).split(path.sep).join("/");
        files.push({
          key,
          relativePath: key,
          url: provider.publicUrl(key),
          size: fileStat.size,
          lastModified: fileStat.mtime,
          contentType: mimeFromKey(key),
        });
      }
    }

    await walk(startDir, this.root, this);
    return files;
  }
}

class UnconfiguredRemoteStorageProvider implements StorageProvider {
  kind: StorageProviderKind;

  constructor(kind: StorageProviderKind) {
    this.kind = kind;
  }

  publicUrl(key: string) {
    const baseUrl = this.kind === "r2" ? process.env.CLOUDFLARE_R2_PUBLIC_URL : process.env.AWS_S3_PUBLIC_URL;
    const normalized = normalizeStorageKey(key);
    return baseUrl && normalized ? `${baseUrl.replace(/\/$/, "")}/${normalized}` : uploadUrlFromStorageKey(normalized);
  }

  private notConfigured(): never {
    throw new Error(`${this.kind.toUpperCase()} storage provider is not configured in this deployment.`);
  }

  async write(): Promise<StorageFile> {
    this.notConfigured();
  }

  async read(): Promise<Buffer> {
    this.notConfigured();
  }

  async readStream(): Promise<StorageReadResult> {
    this.notConfigured();
  }

  async stat(): Promise<StorageFile | null> {
    this.notConfigured();
  }

  async delete(): Promise<boolean> {
    this.notConfigured();
  }

  async list(): Promise<StorageListFile[]> {
    this.notConfigured();
  }
}

let uploadStorageSingleton: StorageProvider | null = null;

export function getUploadStorageProvider() {
  if (uploadStorageSingleton) return uploadStorageSingleton;
  const kind = configuredProviderKind();
  uploadStorageSingleton = kind === "local" || kind === "railway-volume" ? new LocalStorageProvider(kind, uploadRootFor(kind)) : new UnconfiguredRemoteStorageProvider(kind);
  return uploadStorageSingleton;
}

export async function writeUploadFile(key: string, bytes: Buffer | Uint8Array, contentType?: string) {
  return getUploadStorageProvider().write({ key, bytes, contentType });
}

export async function readUploadFile(keyOrUrl: string) {
  const key = storageKeyFromUploadUrl(keyOrUrl) || normalizeStorageKey(keyOrUrl);
  if (!key) return null;
  return getUploadStorageProvider().read(key);
}

export async function readPublicMediaFile(value: string) {
  const uploadKey = storageKeyFromUploadUrl(value);
  if (uploadKey) return getUploadStorageProvider().read(uploadKey);

  if (value.startsWith("/assets/admin/")) {
    const assetKey = normalizeStorageKey(`assets/admin/${value.slice("/assets/admin/".length)}`);
    if (assetKey) {
      const provider = getUploadStorageProvider();
      try {
        return await provider.read(assetKey);
      } catch {
        /* fall through to legacy path */
      }
    }
  }

  const normalizedAsset = value.trim().startsWith("/assets/") ? value.trim().replace(/^\/+/, "") : "";
  if (!normalizedAsset || normalizedAsset.includes("..")) return null;
  return readFile(path.join(process.cwd(), "public", normalizedAsset));
}

export async function deleteUploadFile(keyOrUrl: string) {
  const key = storageKeyFromUploadUrl(keyOrUrl) || normalizeStorageKey(keyOrUrl);
  return key ? getUploadStorageProvider().delete(key) : false;
}

export async function statUploadFile(keyOrUrl: string) {
  const key = storageKeyFromUploadUrl(keyOrUrl) || normalizeStorageKey(keyOrUrl);
  return key ? getUploadStorageProvider().stat(key) : null;
}

export async function listUploadFiles(prefix = "") {
  return getUploadStorageProvider().list(prefix);
}

export async function streamUploadFile(keyOrUrl: string, range?: StorageReadRange) {
  const key = storageKeyFromUploadUrl(keyOrUrl) || normalizeStorageKey(keyOrUrl);
  return key ? getUploadStorageProvider().readStream(key, range) : null;
}

export function getUploadFileContentType(keyOrUrl: string) {
  const key = storageKeyFromUploadUrl(keyOrUrl) || normalizeStorageKey(keyOrUrl);
  return key ? mimeFromKey(key) : "application/octet-stream";
}
