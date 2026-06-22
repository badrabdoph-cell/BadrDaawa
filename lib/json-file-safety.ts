import { readFile, stat } from "fs/promises";

const defaultMaxJsonFileBytes = 8 * 1024 * 1024;

export function maxSafeJsonFileBytes() {
  const configured = Number(process.env.MAX_SAFE_JSON_FILE_BYTES || process.env.JSON_FILE_MAX_BYTES || 0);
  return Number.isFinite(configured) && configured > 0 ? configured : defaultMaxJsonFileBytes;
}

export async function statJsonFile(filePath: string) {
  try {
    return await stat(filePath);
  } catch {
    return null;
  }
}

export async function readJsonFileIfSafe(filePath: string, label = filePath, maxBytes = maxSafeJsonFileBytes()) {
  const fileStat = await statJsonFile(filePath);
  if (!fileStat || !fileStat.isFile()) return { raw: "", sizeBytes: 0, skipped: false };
  if (fileStat.size > maxBytes) {
    console.warn(`[JSON Safety] Skipping oversized JSON file ${label}: ${fileStat.size} bytes > ${maxBytes} bytes.`);
    return { raw: "", sizeBytes: fileStat.size, skipped: true };
  }
  return { raw: await readFile(filePath, "utf8"), sizeBytes: fileStat.size, skipped: false };
}

export async function parseJsonFileIfSafe<T = unknown>(filePath: string, label = filePath, maxBytes = maxSafeJsonFileBytes()) {
  const result = await readJsonFileIfSafe(filePath, label, maxBytes);
  if (!result.raw) return { value: null as T | null, sizeBytes: result.sizeBytes, skipped: result.skipped };
  try {
    return { value: JSON.parse(result.raw) as T, sizeBytes: result.sizeBytes, skipped: false };
  } catch (error) {
    console.error(`[JSON Safety] Failed to parse ${label}.`, error);
    return { value: null as T | null, sizeBytes: result.sizeBytes, skipped: false };
  }
}
