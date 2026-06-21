import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { normalizeImageForDisplay } from "@/lib/display-images";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { imageExtensionForUpload, imageExtensionFromBytes, isSupportedImageFile } from "@/lib/image-formats";
import { writeProjectAssetFile } from "@/lib/project-assets";
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings";
import { getTemplatePreviewInfo, updateTemplatePreviewInfo } from "@/lib/template-preview-info";
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
  const normalized = await normalizeImageForDisplay(bytes, extension, `photographer-logo:${file.name || file.type}`);
  if (!normalized) return "";

  bytes = normalized.bytes;
  extension = normalized.extension;
  const saved = await writeProjectAssetFile(`branding/photographer-logo-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`, bytes);
  return saved.url;
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getSiteSettings();
    if (!prisma) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const invitations = await prisma.invitation.findMany({
      where: { deletedAt: null },
      select: {
        code: true,
        groomName: true,
        brideName: true,
        photographer: true,
        status: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const globalLogoUrl = settings.photographer.defaultLogoUrl;

    const invitationsWithLogoInfo = invitations
      .filter((inv) => {
        if (!inv.photographer || typeof inv.photographer !== "object") return false;
        const raw = inv.photographer as Record<string, unknown>;
        return raw.enabled !== false;
      })
      .map((inv) => {
        const raw = inv.photographer as Record<string, unknown>;
        const logoUrl = typeof raw.logoUrl === "string" ? raw.logoUrl : "";
        const logoSource = raw._logoSource === "custom" ? "custom" : "global";
        const hasCustomLogo = logoSource === "custom" && Boolean(logoUrl);

        return {
          code: inv.code,
          groomName: inv.groomName,
          brideName: inv.brideName,
          status: inv.status,
          logoUrl,
          logoSource,
          hasCustomLogo,
          matchesGlobal: logoUrl === globalLogoUrl || (!logoUrl && !globalLogoUrl),
        };
      });

    return NextResponse.json({
      globalLogoUrl,
      invitations: invitationsWithLogoInfo,
      totalCount: invitationsWithLogoInfo.length,
      customCount: invitationsWithLogoInfo.filter((inv) => inv.hasCustomLogo).length,
      defaultCount: invitationsWithLogoInfo.filter((inv) => !inv.hasCustomLogo).length,
    });
  } catch (error) {
    console.error("[Photographer Logo] Failed to fetch data", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  try {
    const formData = await request.formData();
    const rawMode = formData.get("mode");
    const mode = typeof rawMode === "string" ? rawMode : "";

    if (mode === "save") {
      const showPhotographerCard = formData.has("showPhotographerCard");
      const photographerName = text(formData, "photographerName");
      const photographerInstagramUrl = text(formData, "photographerInstagramUrl");
      const photographerFacebookUrl = text(formData, "photographerFacebookUrl");
      const removeLogo = formData.has("removeLogo");

      let resolvedLogoUrl: string;

      if (removeLogo) {
        resolvedLogoUrl = "";
      } else {
        const logoDataUrl = text(formData, "photographerLogoDataUrl");
        if (logoDataUrl) {
          const matches = logoDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
          if (matches) {
            const ext = matches[1] === "png" ? "png" : "webp";
            const bytes = Buffer.from(matches[2], "base64");
            const saved = await writeProjectAssetFile(`branding/photographer-logo-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${ext}`, bytes);
            resolvedLogoUrl = saved.url;
          } else {
            resolvedLogoUrl = "";
          }
        } else {
          const logoFile = formData.get("photographerLogoFile");
          resolvedLogoUrl = logoFile instanceof File && logoFile.size > 0 ? await saveLogo(logoFile) : text(formData, "photographerLogoUrl");
        }
      }

      await updateSiteSettings({
        photographer: {
          showPhotographerCard,
          defaultName: photographerName,
          defaultInstagramUrl: photographerInstagramUrl,
          defaultFacebookUrl: photographerFacebookUrl,
          defaultLogoUrl: resolvedLogoUrl,
        },
      });

      const currentPreview = await getTemplatePreviewInfo();
      await updateTemplatePreviewInfo({
        ...currentPreview,
        photographer: {
          ...currentPreview.photographer,
          enabled: showPhotographerCard,
          name: photographerName || currentPreview.photographer.name,
          instagramUrl: photographerInstagramUrl || currentPreview.photographer.instagramUrl,
          facebookUrl: photographerFacebookUrl || currentPreview.photographer.facebookUrl,
          logoUrl: resolvedLogoUrl || currentPreview.photographer.logoUrl,
        },
        templateOverrides: currentPreview.templateOverrides,
        adminScope: currentPreview.adminScope,
      });

      revalidatePath("/admin/photographer-logo");
      revalidatePath("/admin/templates");
      revalidatePath("/");
      revalidatePath("/templates");

      return NextResponse.redirect(getRedirectUrl("/admin/photographer-logo?settings_saved=1", request.headers, request.nextUrl.origin), 303);
    }

    if (mode === "update-selected") {
      const rawCodes = formData.getAll("codes");
      const codes: string[] = [];
      for (const c of rawCodes) {
        if (typeof c === "string" && c.trim()) codes.push(c.trim());
      }

      if (codes.length === 0) {
        return NextResponse.redirect(getRedirectUrl("/admin/photographer-logo?error=noselection", request.headers, request.nextUrl.origin), 303);
      }

      const settings = await getSiteSettings();
      const globalLogoUrl = settings.photographer.defaultLogoUrl;

      if (!globalLogoUrl) {
        return NextResponse.redirect(getRedirectUrl("/admin/photographer-logo?error=nologo", request.headers, request.nextUrl.origin), 303);
      }

      if (!prisma) {
        return NextResponse.redirect(getRedirectUrl("/admin/photographer-logo?error=database", request.headers, request.nextUrl.origin), 303);
      }

      const invitations = await prisma.invitation.findMany({
        where: { code: { in: codes }, deletedAt: null },
        select: {
          id: true,
          code: true,
          photographer: true,
        },
      });

      let updatedCount = 0;

      for (const invitation of invitations) {
        if (!invitation.photographer || typeof invitation.photographer !== "object") continue;
        const raw = invitation.photographer as Record<string, unknown>;
        if (raw.enabled === false) continue;

        const updatedPhotographer = {
          enabled: true,
          name: settings.photographer.defaultName || (typeof raw.name === "string" ? raw.name : ""),
          description: typeof raw.description === "string" ? raw.description : "",
          logoUrl: globalLogoUrl,
          instagramUrl: settings.photographer.defaultInstagramUrl || (typeof raw.instagramUrl === "string" ? raw.instagramUrl : ""),
          facebookUrl: settings.photographer.defaultFacebookUrl || (typeof raw.facebookUrl === "string" ? raw.facebookUrl : ""),
          whatsappUrl: typeof raw.whatsappUrl === "string" ? raw.whatsappUrl : "",
          _logoSource: "global",
        };

        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { photographer: updatedPhotographer as any },
        });

        revalidatePath(`/${invitation.code}`);
        updatedCount += 1;
      }

      const actor = await getAuditActorFromAdminRequest(request);
      await recordAuditLog({
        actor,
        action: "photographer-logo.bulk-update",
        entity: { type: "Invitation", id: "bulk", label: `${updatedCount} دعوة` },
        newValues: { mode: "update-selected", logoUrl: globalLogoUrl, updatedCount, requestedCodes: codes.length },
        metadata: { source: "photographer-logo-admin" },
      });

      revalidatePath("/admin/invitations");
      revalidatePath("/admin/photographer-logo");

      return NextResponse.redirect(getRedirectUrl(`/admin/photographer-logo?success=1&updated=${updatedCount}&skipped=${codes.length - updatedCount}`, request.headers, request.nextUrl.origin), 303);
    }

    return NextResponse.redirect(getRedirectUrl("/admin/photographer-logo?error=invalid", request.headers, request.nextUrl.origin), 303);
  } catch (error) {
    console.error("[Photographer Logo] POST failed", error);
    return NextResponse.redirect(getRedirectUrl("/admin/photographer-logo?error=failed", request.headers, request.nextUrl.origin), 303);
  }
}
