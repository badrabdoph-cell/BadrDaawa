import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { normalizeImageForDisplay } from "@/lib/display-images";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import {
  imageExtensionForUpload,
  imageExtensionFromBytes,
  imageExtensionFromDataMime,
  imageExtensionFromName,
  isBrowserDisplayImageUrl,
  isSupportedImageFile,
  isSupportedImageUrl,
} from "@/lib/image-formats";
import { getTemplateWithSettings, updateTemplateSettings } from "@/lib/template-settings";
import { getRedirectUrl, normalizeInternalAssetUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

async function saveTemplateImage(image: string | File, request: NextRequest) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "template-previews");
  await mkdir(uploadDir, { recursive: true });

  async function saveBytes(bytes: Buffer, extension: string, sourceLabel: string) {
    const normalized = await normalizeImageForDisplay(bytes, extension, sourceLabel);
    if (!normalized) return "";
    const fileName = `template-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${normalized.extension}`;
    await writeFile(path.join(uploadDir, fileName), normalized.bytes);
    return `/uploads/template-previews/${fileName}`;
  }

  if (image instanceof File) {
    if (!isSupportedImageFile(image) || image.size > 80 * 1024 * 1024) return "";
    const bytes = Buffer.from(await image.arrayBuffer());
    const extension = imageExtensionForUpload(image.type, image.name, imageExtensionFromBytes(bytes) || "jpg");
    return saveBytes(bytes, extension, `template:${image.name || image.type}`);
  }

  if (!image) return "";
  if (image.startsWith("/") || image.startsWith("http://") || image.startsWith("https://")) {
    const normalized = normalizeInternalAssetUrl(image) || image;
    if (isBrowserDisplayImageUrl(normalized)) return normalized;
    if (!normalized.startsWith("/uploads/") && !normalized.startsWith("/assets/")) return "";
    try {
      const diskPath = path.join(process.cwd(), "public", normalized.replace(/^\/+/, ""));
      return saveBytes(await readFile(diskPath), imageExtensionFromName(normalized) || "jpg", `template-existing:${normalized}`);
    } catch (error) {
      console.error(`[Template Images] Failed to convert existing non-displayable image: ${normalized}`, error);
      return "";
    }
  }
  if (!isSupportedImageUrl(image)) return "";

  const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return "";

  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 12 * 1024 * 1024) return "";
  const extension = imageExtensionFromDataMime(match[1]) || "jpg";

  return saveBytes(bytes, extension, "template-optimized");
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const slug = String(formData.get("slug") || "").trim();
  const oldValues = await getTemplateWithSettings(slug).catch(() => null);
  const optimizedImages = formData.getAll("templateImage").filter((value): value is string => typeof value === "string" && Boolean(value));
  const rawImages = formData.getAll("templateImageRaw").filter((value): value is File => value instanceof File && isSupportedImageFile(value));
  const imageInputs = optimizedImages.length >= rawImages.length ? optimizedImages : rawImages;
  const uploadedImages = await Promise.all(imageInputs.map((value) => saveTemplateImage(value, request)));
  const cleanUploadedImages = uploadedImages.filter(Boolean);
  const updated = await updateTemplateSettings(slug, {
    arabicName: String(formData.get("arabicName") || ""),
    category: String(formData.get("category") || ""),
    concept: String(formData.get("concept") || ""),
    opening: String(formData.get("opening") || ""),
    layout: String(formData.get("layout") || ""),
    typography: String(formData.get("typography") || ""),
    enabled: formData.get("enabled") === "on",
    musicUrl: String(formData.get("musicUrl") || ""),
    musicMuted: formData.get("musicMuted") === "on",
    previewImage: cleanUploadedImages[0] || String(formData.get("previewImage") || ""),
    accentImage: cleanUploadedImages[1] || String(formData.get("accentImage") || ""),
    palette: {
      primary: String(formData.get("palettePrimary") || ""),
      secondary: String(formData.get("paletteSecondary") || ""),
      accent: String(formData.get("paletteAccent") || ""),
      ink: String(formData.get("paletteInk") || ""),
      surface: String(formData.get("paletteSurface") || ""),
    },
    photographer: {
      enabled: formData.get("photographerEnabled") === "on",
      name: String(formData.get("photographerName") || ""),
      instagramUrl: String(formData.get("photographerInstagramUrl") || ""),
      facebookUrl: String(formData.get("photographerFacebookUrl") || ""),
    },
  });

  if (updated) {
    revalidatePath("/admin/templates");
    revalidatePath("/templates");
    revalidatePath(`/templates/${slug}/preview`);
    queueGitHubSync(`Template settings updated: ${slug}.`, { createSnapshot: true });
    const actor = await getAuditActorFromAdminRequest(request);
    const newValues = await getTemplateWithSettings(slug).catch(() => null);
    await recordAuditLog({
      actor,
      action: "template.change",
      entity: { type: "Template", id: slug, label: newValues?.arabicName || newValues?.name || slug },
      oldValues,
      newValues,
      metadata: { source: "admin-template-settings" },
    });
    if (cleanUploadedImages.length) {
      await recordAuditLog({
        actor,
        action: "media.image.upload",
        entity: { type: "Media", id: cleanUploadedImages[0], label: cleanUploadedImages.length > 1 ? `${cleanUploadedImages.length} template images` : cleanUploadedImages[0] },
        newValues: { imageUrls: cleanUploadedImages },
        metadata: { templateSlug: slug, source: "admin-template-settings" },
      });
    }
  }

  const url = getRedirectUrl("/admin/templates", request.headers, request.nextUrl.origin);
  url.searchParams.set("saved", updated ? slug : "0");
  url.hash = `template-${slug}`;
  return NextResponse.redirect(url, 303);
}
