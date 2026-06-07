import { mkdirSync } from "node:fs";
import path from "node:path";

export const runtimeDataDir = path.join(process.cwd(), "data");
export const runtimeBackupDir = path.join(runtimeDataDir, "backups");
export const runtimeUploadsDir = path.join(process.cwd(), "public", "uploads");
export const runtimeUploadSubdirs = ["client-invitations", "order-requests", "order-previews", "music"];

export function ensureDirectory(dirPath: string) {
  mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

export function ensureRuntimeDirectories() {
  ensureDirectory(runtimeDataDir);
  ensureDirectory(runtimeBackupDir);
  ensureDirectory(runtimeUploadsDir);

  for (const subdir of runtimeUploadSubdirs) {
    ensureDirectory(path.join(runtimeUploadsDir, subdir));
  }
}

export function ensureParentDirectory(filePath: string) {
  ensureDirectory(path.dirname(filePath));
}
