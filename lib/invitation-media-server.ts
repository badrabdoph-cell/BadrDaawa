import crypto from "node:crypto";
import { writeUploadFile } from "./storage-provider";

const maxHeroVideoBytes = 35 * 1024 * 1024;

const videoExtensionByType: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export async function saveInvitationHeroVideo(file: File, folder = "client-invitations") {
  if (!file.size || file.size > maxHeroVideoBytes) return "";
  const extension = videoExtensionByType[file.type] || (file.name.match(/\.(mp4|webm|mov|m4v)$/i)?.[1] || "").toLowerCase();
  if (!extension) return "";
  const contentType = file.type || (extension === "webm" ? "video/webm" : extension === "mov" ? "video/quicktime" : "video/mp4");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.length || bytes.length > maxHeroVideoBytes) return "";
  const fileName = `invitation-hero-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const saved = await writeUploadFile(`${folder}/${fileName}`, bytes, contentType);
  return saved.url;
}
