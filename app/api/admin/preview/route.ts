import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { updateHomePreviewSettings } from "@/lib/preview-settings";
import { getPublicUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

async function savePreviewVideo(file: File | null) {
  if (!file || !file.size || !file.type.startsWith("video/")) return "";
  if (file.size > 35 * 1024 * 1024) return "";

  const extensionByType: Record<string, string> = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
  };
  const extension = extensionByType[file.type] || "mp4";
  const fileName = `home-preview-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "previews");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/previews/${fileName}`;
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getPublicUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const mode = String(formData.get("mode") || "");
  const templateSlug = String(formData.get("templateSlug") || "");
  const imageUrl = String(formData.get("imageUrl") || "");
  const uploadedImageUrl = String(formData.get("previewImage") || "");
  const videoUrl = String(formData.get("videoUrl") || "");
  const previewVideo = formData.get("previewVideo");
  const uploadedVideoUrl = await savePreviewVideo(previewVideo instanceof File ? previewVideo : null);

  await updateHomePreviewSettings({ mode, templateSlug, imageUrl, uploadedImageUrl, videoUrl, uploadedVideoUrl });

  revalidatePath("/");
  revalidatePath("/admin/preview");

  return NextResponse.redirect(new URL("/admin/preview?saved=1", request.url), 303);
}
