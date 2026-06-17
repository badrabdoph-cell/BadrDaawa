import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { normalizeImageForDisplay } from "@/lib/display-images";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { imageExtensionForUpload, imageExtensionFromBytes, isSupportedImageFile } from "@/lib/image-formats";
import { writeProjectAssetFile } from "@/lib/project-assets";
import { getSiteSettings, updateSiteSettings } from "@/lib/site-settings";
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

      const logoFile = formData.get("photographerLogoFile");
      let uploadedLogoUrl = "";
      if (logoFile instanceof File && logoFile.size > 0) {
        uploadedLogoUrl = await saveLogo(logoFile);
      }

      await updateSiteSettings({
        photographer: {
          showPhotographerCard,
          defaultName: photographerName,
          defaultInstagramUrl: photographerInstagramUrl,
          defaultFacebookUrl: photographerFacebookUrl,
          defaultLogoUrl: uploadedLogoUrl || text(formData, "photographerLogoUrl"),
        },
      });

      revalidatePath("/admin/photographer-logo");
      revalidatePath("/");
      revalidatePath("/templates");
      queueGitHubSync("Photographer settings updated from photographer-logo admin.", { uploadProjectFiles: true, changeType: "project" });

      return NextResponse.redirect(getRedirectUrl("/admin/photographer-logo?settings_saved=1", request.headers, request.nextUrl.origin), 303);
    }

    if (mode !== "all" && mode !== "defaults-only") {
      return NextResponse.redirect(getRedirectUrl("/admin/photographer-logo?error=invalid", request.headers, request.nextUrl.origin), 303);
    }

    const settings = await getSiteSettings();
    const newLogoUrl = settings.photographer.defaultLogoUrl;

    if (!newLogoUrl) {
      return NextResponse.redirect(getRedirectUrl("/admin/photographer-logo?error=nologo", request.headers, request.nextUrl.origin), 303);
    }

    if (!prisma) {
      return NextResponse.redirect(getRedirectUrl("/admin/photographer-logo?error=database", request.headers, request.nextUrl.origin), 303);
    }

    const invitations = await prisma.invitation.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        code: true,
        groomName: true,
        brideName: true,
        photographer: true,
      },
    });

    let updatedCount = 0;
    let skippedCustomCount = 0;

    for (const invitation of invitations) {
      if (!invitation.photographer || typeof invitation.photographer !== "object") continue;
      const raw = invitation.photographer as Record<string, unknown>;
      if (raw.enabled === false) continue;

      const logoSource = raw._logoSource === "custom" ? "custom" : "global";
      if (mode === "defaults-only" && logoSource === "custom") {
        skippedCustomCount += 1;
        continue;
      }

      const updatedPhotographer = {
        ...raw,
        logoUrl: newLogoUrl,
        _logoSource: "global",
      };

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { photographer: updatedPhotographer },
      });

      revalidatePath(`/${invitation.code}`);
      updatedCount += 1;
    }

    const actor = await getAuditActorFromAdminRequest(request);
    await recordAuditLog({
      actor,
      action: "photographer-logo.bulk-update",
      entity: { type: "Invitation", id: "bulk", label: `${updatedCount} دعوة` },
      newValues: { mode, logoUrl: newLogoUrl, updatedCount, skippedCustomCount },
      metadata: { source: "photographer-logo-admin", mode },
    });

    revalidatePath("/admin/invitations");
    revalidatePath("/admin/photographer-logo");

    return NextResponse.redirect(getRedirectUrl(`/admin/photographer-logo?success=1&updated=${updatedCount}&skipped=${skippedCustomCount}`, request.headers, request.nextUrl.origin), 303);
  } catch (error) {
    console.error("[Photographer Logo] POST failed", error);
    return NextResponse.redirect(getRedirectUrl("/admin/photographer-logo?error=failed", request.headers, request.nextUrl.origin), 303);
  }
}
