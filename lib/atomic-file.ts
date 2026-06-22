import { mkdir, rename, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export async function writeTextFileAtomic(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${process.pid}.${Date.now().toString(36)}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tempPath, content, "utf8");
  await rename(tempPath, filePath);
}

export async function writeJsonFileAtomic(filePath: string, value: unknown) {
  await writeTextFileAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}
