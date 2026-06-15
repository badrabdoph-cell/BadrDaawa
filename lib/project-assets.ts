import { deleteUploadFile, writeUploadFile } from "./storage-provider";

const assetStoragePrefix = "assets/admin";
const publicPrefix = "/assets/admin";

function cleanSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeProjectAssetKey(key: string) {
  const parts = key.split(/[\\/]+/).map(cleanSegment).filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) return "";
  return parts.join("/");
}

export function isProjectAssetUrl(value?: string | null) {
  return Boolean(value?.startsWith(`${publicPrefix}/`) && !value.includes(".."));
}

export async function writeProjectAssetFile(key: string, bytes: Buffer | Uint8Array) {
  const normalizedKey = normalizeProjectAssetKey(key);
  if (!normalizedKey) throw new Error("Invalid project asset key.");
  const saved = await writeUploadFile(`${assetStoragePrefix}/${normalizedKey}`, bytes);
  return {
    key: normalizedKey,
    url: `${publicPrefix}/${normalizedKey}`,
    size: saved.size,
    lastModified: saved.lastModified,
  };
}

export async function deleteProjectAssetFile(value?: string | null) {
  if (!isProjectAssetUrl(value)) return false;
  const key = normalizeProjectAssetKey((value || "").slice(`${publicPrefix}/`.length));
  if (!key) return false;
  return deleteUploadFile(`${assetStoragePrefix}/${key}`);
}
