import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { syncAdminStateToGitHub } from "@/lib/github-sync";
import { updateHomePreviewSettings } from "@/lib/preview-settings";
import { getPublicUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

async function savePreviewMedia(file: File | null) {
  if (!file || !file.size) return { url: "", mode: "" };
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) return { url: "", mode: "" };
  if (isImage && file.size > 8 * 1024 * 1024) return { url: "", mode: "" };
  if (isVideo && file.size > 35 * 1024 * 1024) return { url: "", mode: "" };

  const extensionByType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  const extension = extensionByType[file.type] || (isImage ? "jpg" : "mp4");
  const fileName = `home-preview-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "previews");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));
  return { url: `/uploads/previews/${fileName}`, mode: isImage ? "image" : "video" };
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getPublicUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const mode = String(formData.get("mode") || "");
  const templateSlug = String(formData.get("templateSlug") || "");
  const mediaUrl = String(formData.get("mediaUrl") || "");
  const imageUrl = String(formData.get("imageUrl") || "");
  const uploadedImageUrl = String(formData.get("previewImage") || "");
  const videoUrl = String(formData.get("videoUrl") || "");
  const previewMedia = formData.get("previewMedia");
  const previewVideo = formData.get("previewVideo");
  const uploadedMedia = await savePreviewMedia(previewMedia instanceof File ? previewMedia : previewVideo instanceof File ? previewVideo : null);

  await updateHomePreviewSettings({
    mode,
    templateSlug,
    mediaUrl,
    uploadedMediaUrl: uploadedMedia.url,
    uploadedMediaMode: uploadedMedia.mode,
    imageUrl,
    uploadedImageUrl,
    videoUrl,
  });

  revalidatePath("/");
  revalidatePath("/admin/preview");
  await syncAdminStateToGitHub("Homepage preview settings updated from admin.", { createSnapshot: true });

  return NextResponse.redirect(new URL("/admin/preview?saved=1", request.url), 303);
}
