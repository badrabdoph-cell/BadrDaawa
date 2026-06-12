import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { normalizeImageForDisplay } from "@/lib/display-images";
import { getHomeContent, updateHomeContent } from "@/lib/home-content";
import { imageExtensionForUpload, imageExtensionFromBytes, isSupportedImageFile } from "@/lib/image-formats";
import { getHomePreviewSettings, updateHomePreviewSettings } from "@/lib/preview-settings";
import { updateSiteSettings } from "@/lib/site-settings";
import { writeUploadFile } from "@/lib/storage-provider";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function saveLogo(file: File | null) {
  if (!file || !file.size || !isSupportedImageFile(file) || file.size > 8 * 1024 * 1024) return "";

  let bytes: Buffer = Buffer.from(await file.arrayBuffer());
  let extension = imageExtensionForUpload(file.type, file.name, imageExtensionFromBytes(bytes) || "webp");
  const normalized = await normalizeImageForDisplay(bytes, extension, `site-logo:${file.name || file.type}`);
  if (!normalized) return "";

  bytes = normalized.bytes;
  extension = normalized.extension;
  const saved = await writeUploadFile(`previews/site-logo-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`, bytes, `image/${extension}`);
  return saved.url;
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  try {
    const formData = await request.formData();
    const logoFile = formData.get("logoFile");
    const uploadedLogoUrl = await saveLogo(logoFile instanceof File ? logoFile : null);
    const currentContent = await getHomeContent();
    const currentPreview = await getHomePreviewSettings();
    const primaryCtaLabel = text(formData, "primaryCtaLabel");
    const secondaryCtaLabel = text(formData, "secondaryCtaLabel");

    await updateSiteSettings({
      siteName: text(formData, "siteName"),
      logoUrl: uploadedLogoUrl || text(formData, "logoUrl"),
      siteDescription: text(formData, "siteDescription"),
      contactPhones: text(formData, "contactPhones").split(/\r?\n|,/),
      whatsappUrl: text(formData, "whatsappUrl"),
      email: text(formData, "email"),
      socialLinks: {
        facebook: text(formData, "facebook"),
        instagram: text(formData, "instagram"),
        tiktok: text(formData, "tiktok"),
        youtube: text(formData, "youtube"),
        telegram: text(formData, "telegram"),
      },
      seo: {
        title: text(formData, "seoTitle"),
        description: text(formData, "seoDescription"),
        keywords: text(formData, "seoKeywords"),
        ogTitle: text(formData, "ogTitle"),
        ogDescription: text(formData, "ogDescription"),
      },
      homepage: {
        showFeatures: formData.has("showFeatures"),
        showPreview: formData.has("showPreview"),
        showPricing: formData.has("showPricing"),
        primaryCtaLabel,
        secondaryCtaLabel,
      },
      photographer: {
        showPhotographerCard: formData.has("showPhotographerCard"),
        defaultName: text(formData, "photographerName"),
        defaultInstagramUrl: text(formData, "photographerInstagramUrl"),
        defaultFacebookUrl: text(formData, "photographerFacebookUrl"),
      },
    });

    await updateHomeContent({
      ...currentContent,
      hero: {
        ...currentContent.hero,
        primaryCta: primaryCtaLabel || currentContent.hero.primaryCta,
        secondaryCta: secondaryCtaLabel || currentContent.hero.secondaryCta,
      },
    });

    await updateHomePreviewSettings({
      mode: text(formData, "homePreviewMode") || currentPreview.mode,
      templateSlug: text(formData, "homePreviewTemplateSlug") || currentPreview.templateSlug,
      mediaUrl: text(formData, "homePreviewMediaUrl"),
      imageUrl: currentPreview.imageUrl,
      videoUrl: currentPreview.videoUrl,
    });

    ["/", "/templates", "/admin/settings", "/admin/preview"].forEach((path) => revalidatePath(path));

    return NextResponse.redirect(getRedirectUrl("/admin/settings?saved=1", request.headers, request.nextUrl.origin), 303);
  } catch (error) {
    console.error("Failed to update site settings", error);
    return NextResponse.redirect(getRedirectUrl("/admin/settings?error=1", request.headers, request.nextUrl.origin), 303);
  }
}
