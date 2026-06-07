import { mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dirs = [
  path.join(root, "data"),
  path.join(root, "data", "backups"),
  path.join(root, "public", "uploads"),
  path.join(root, "public", "uploads", "client-invitations"),
  path.join(root, "public", "uploads", "order-requests"),
  path.join(root, "public", "uploads", "order-previews"),
  path.join(root, "public", "uploads", "music"),
];

for (const dir of dirs) {
  mkdirSync(dir, { recursive: true });
}

console.log(`[prepare] Runtime directories are ready: ${dirs.length}`);
