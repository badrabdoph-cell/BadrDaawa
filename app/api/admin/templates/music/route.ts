import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { getTemplateWithSettings, updateTemplateSettings } from "@/lib/template-settings";
import { getRedirectUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const slug = String(formData.get("slug") || "").trim();
  const oldValues = await getTemplateWithSettings(slug).catch(() => null);
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
    previewImage: String(formData.get("previewImage") || ""),
    accentImage: String(formData.get("accentImage") || ""),
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
  }

  const url = getRedirectUrl("/admin/templates", request.headers, request.nextUrl.origin);
  url.searchParams.set("saved", updated ? slug : "0");
  url.hash = `template-${slug}`;
  return NextResponse.redirect(url, 303);
}
