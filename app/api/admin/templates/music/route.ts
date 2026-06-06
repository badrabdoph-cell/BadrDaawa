import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { updateTemplateSettings } from "@/lib/template-settings";
import { getPublicUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

async function saveTemplateImage(image: string, request: NextRequest) {
  if (!image) return "";
  if (image.startsWith("/")) return image;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;

  const match = image.match(/^data:image\/jpeg;base64,([a-zA-Z0-9+/=]+)$/);
  if (!match) return "";

  const bytes = Buffer.from(match[1], "base64");
  if (!bytes.length || bytes.length > 3 * 1024 * 1024) return "";

  const uploadDir = path.join(process.cwd(), "public", "uploads", "template-previews");
  await mkdir(uploadDir, { recursive: true });
  const fileName = `template-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.jpg`;
  await writeFile(path.join(uploadDir, fileName), bytes);
  return getPublicUrl(`/uploads/template-previews/${fileName}`, request.headers, request.nextUrl.origin).toString();
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getPublicUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const slug = String(formData.get("slug") || "").trim();
  const uploadedImages = await Promise.all(formData.getAll("templateImage").map((value) => saveTemplateImage(String(value), request)));
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
  }

  const url = new URL("/admin/templates", request.url);
  url.searchParams.set("saved", updated ? slug : "0");
  url.hash = `template-${slug}`;
  return NextResponse.redirect(url, 303);
}
