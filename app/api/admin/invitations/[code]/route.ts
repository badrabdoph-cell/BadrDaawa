import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, getAdminSessionUser, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { resolveCustomInvitationSlug } from "@/lib/custom-invitation-url";
import { prisma } from "@/lib/db";
import { hardDeleteInvitationCompletely } from "@/lib/invitation-deletion";
import { getRedirectUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectBack(request: NextRequest, status: string) {
  const url = getRedirectUrl("/admin/invitations", request.headers, request.nextUrl.origin);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, 303);
}

type InvitationUpdateOptions = {
  customSlug?: string;
  disabledReason?: string;
  disabledBy?: string;
  groomName?: string;
  brideName?: string;
  weddingDate?: Date;
};

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.error("Failed to revalidate invitation admin path", error);
  }
}

async function updateDatabaseInvitation(code: string, action: string, options: InvitationUpdateOptions = {}) {
  if (!prisma) return false;

  try {
    if (action === "custom-slug") {
      const result = await prisma.invitation.updateMany({ where: { code, deletedAt: null }, data: { customSlug: options.customSlug || null } });
      return result.count > 0;
    }

    if (action === "update-details") {
      if (!options.groomName || !options.brideName || !options.weddingDate) return false;
      const result = await prisma.invitation.updateMany({
        where: { code, deletedAt: null },
        data: {
          groomName: options.groomName,
          brideName: options.brideName,
          weddingDate: options.weddingDate,
        },
      });
      return result.count > 0;
    }

    if (action === "delete") {
      const result = await prisma.invitation.updateMany({ where: { code, deletedAt: null }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
      return result.count > 0;
    }

    if (action === "pause" || action === "resume" || action === "archive") {
      const result = await prisma.invitation.updateMany({
        where: { code, deletedAt: null },
        data: { status: action === "archive" ? "ARCHIVED" : action === "pause" ? "PAUSED" : "ACTIVE" },
      });
      return result.count > 0;
    }

    if (action === "disable") {
      const result = await prisma.invitation.updateMany({
        where: { code, deletedAt: null },
        data: { disabledAt: new Date(), disabledReason: options.disabledReason || null, disabledBy: options.disabledBy || null },
      });
      return result.count > 0;
    }

    if (action === "enable") {
      const result = await prisma.invitation.updateMany({
        where: { code, deletedAt: null },
        data: { disabledAt: null, disabledReason: null, disabledBy: null, status: "ACTIVE" },
      });
      return result.count > 0;
    }
  } catch (error) {
    console.error("Failed to update database invitation from admin", error);
  }

  return false;
}

async function getInvitationAuditSnapshot(code: string) {
  if (prisma) {
    const invitation = await prisma.invitation
      .findUnique({
        where: { code },
        select: {
          code: true,
          customSlug: true,
          status: true,
          groomName: true,
          brideName: true,
          weddingDate: true,
          venue: true,
          musicEnabled: true,
          musicUrl: true,
        },
      })
      .catch(() => null);
    if (invitation) return invitation;
  }
  return null;
}

function wantsJson(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  const accept = request.headers.get("accept") || "";
  return contentType.includes("application/json") || accept.includes("application/json");
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const { code } = await params;
  const jsonMode = wantsJson(request);
  
  let action: string;
  let customSlug = "";
  let disabledReason = "";
  let groomName = "";
  let brideName = "";
  let weddingDate = "";
  
  if (jsonMode) {
    const body = await request.json().catch(() => null) as { action?: string; customSlug?: string; disabledReason?: string; groomName?: string; brideName?: string; weddingDate?: string } | null;
    if (!body) return jsonMode ? jsonError("بيانات غير صالحة.") : redirectBack(request, "invalid");
    action = (body.action || "").trim();
    customSlug = body.customSlug || "";
    disabledReason = body.disabledReason || "";
    groomName = (body.groomName || "").trim();
    brideName = (body.brideName || "").trim();
    weddingDate = (body.weddingDate || "").trim();
  } else {
    const formData = await request.formData();
    action = String(formData.get("action") || "").trim();
    customSlug = String(formData.get("customSlug") || "").trim();
    disabledReason = String(formData.get("disabledReason") || "").trim();
    groomName = String(formData.get("groomName") || "").trim();
    brideName = String(formData.get("brideName") || "").trim();
    weddingDate = String(formData.get("weddingDate") || "").trim();
  }

  if (action === "disable") {
    const reason = (disabledReason || "").trim();
    if (!reason) {
      return jsonMode ? jsonError("سبب التعطيل مطلوب.") : redirectBack(request, "disable-reason-required");
    }
    disabledReason = reason;
  }

  if (action === "update-details") {
    const parsedWeddingDate = new Date(weddingDate);
    if (!groomName || !brideName || Number.isNaN(parsedWeddingDate.getTime())) {
      return jsonMode ? jsonError("اسم العريس والعروس وتاريخ الحفل مطلوبة.") : redirectBack(request, "invalid");
    }
  }

  if (!code || !["pause", "resume", "archive", "delete", "custom-slug", "hard-delete", "disable", "enable", "update-details"].includes(action)) {
    return jsonMode ? jsonError("الإجراء غير صالح.") : redirectBack(request, "invalid");
  }

  // Handle hard-delete with JSON response for AJAX calls
  if (action === "hard-delete") {
    if (!prisma) {
      return jsonMode ? jsonError("قاعدة البيانات غير متاحة.", 503) : redirectBack(request, "database");
    }
    try {
      await prisma.invitation.updateMany({ where: { code, deletedAt: null }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
      const result = await hardDeleteInvitationCompletely(code);
      if (!result.ok) throw new Error("لم يتم العثور على الدعوة.");
      safeRevalidatePath("/admin/invitations");
      safeRevalidatePath("/admin");
      safeRevalidatePath("/admin/trash");
      if (jsonMode) return NextResponse.json({ ok: true, hardDeleted: true });
      return redirectBack(request, "hard-deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حذف الدعوة.";
      return jsonMode ? jsonError(message, 500) : redirectBack(request, `error:${encodeURIComponent(message)}`);
    }
  }

  const oldValues = await getInvitationAuditSnapshot(code);
  if (action === "custom-slug") {
    const result = await resolveCustomInvitationSlug(customSlug, code);
    if (result.error) {
      const url = getRedirectUrl("/admin/invitations", request.headers, request.nextUrl.origin);
      url.searchParams.set("status", "custom-url-error");
      url.searchParams.set("message", result.error);
      return NextResponse.redirect(url, 303);
    }
    customSlug = result.slug;
  }

  if (!prisma) {
    console.error("[Admin Invitation Action] PostgreSQL is not configured. Refusing operational write.");
    return redirectBack(request, "database");
  }

  const disabledBy = action === "disable" ? await getAdminSessionUser(request.cookies.get(ADMIN_SESSION_COOKIE)?.value) : undefined;
  const updatedDatabase = await updateDatabaseInvitation(code, action, {
    customSlug,
    disabledReason: action === "disable" ? disabledReason : undefined,
    disabledBy: disabledBy || undefined,
    groomName,
    brideName,
    weddingDate: action === "update-details" ? new Date(weddingDate) : undefined,
  });
  const changed = updatedDatabase;

  if (changed) {
    safeRevalidatePath("/admin/invitations");
    safeRevalidatePath("/admin");
    safeRevalidatePath(`/${code}`);
    if (oldValues && "customSlug" in oldValues && typeof oldValues.customSlug === "string") safeRevalidatePath(`/${oldValues.customSlug}`);
    if (customSlug) safeRevalidatePath(`/${customSlug}`);
    safeRevalidatePath(`/${code}/ad_3399`);
    await recordAuditLog({
      actor: await getAuditActorFromAdminRequest(request),
      action: action === "delete" ? "invitation.delete" : action === "archive" ? "invitation.archive" : action === "pause" ? "invitation.pause" : action === "disable" ? "invitation.disable" : action === "enable" ? "invitation.enable" : action === "custom-slug" || action === "update-details" ? "invitation.update" : "invitation.resume",
      entity: { type: "Invitation", id: code, label: code },
      oldValues,
      newValues: action === "delete" ? { deleted: true } : action === "custom-slug" ? { customSlug } : action === "update-details" ? { groomName, brideName, weddingDate } : action === "disable" ? { disabledAt: new Date().toISOString(), disabledReason } : action === "enable" ? { disabledAt: null, disabledReason: null } : { status: action === "archive" ? "ARCHIVED" : action === "pause" ? "PAUSED" : "ACTIVE", active: action === "resume" },
      metadata: { storage: "database" },
    });
  }

  if (jsonMode) {
    return NextResponse.json({ ok: changed, action });
  }
  return redirectBack(request, changed ? action : "missing");
}
