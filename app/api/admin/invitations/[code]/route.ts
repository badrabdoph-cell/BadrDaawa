import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { resolveCustomInvitationSlug } from "@/lib/custom-invitation-url";
import { prisma } from "@/lib/db";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getRedirectUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectBack(request: NextRequest, status: string) {
  const url = getRedirectUrl("/admin/invitations", request.headers, request.nextUrl.origin);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, 303);
}

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (error) {
    console.error("Failed to revalidate invitation admin path", error);
  }
}

async function updateDatabaseInvitation(code: string, action: string, customSlug?: string) {
  if (!prisma) return false;

  try {
    if (action === "custom-slug") {
      const result = await prisma.invitation.updateMany({ where: { code, deletedAt: null }, data: { customSlug: customSlug || null } });
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

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const { code } = await params;
  const formData = await request.formData();
  const action = String(formData.get("action") || "").trim();
  if (!code || !["pause", "resume", "archive", "delete", "custom-slug"].includes(action)) {
    return redirectBack(request, "invalid");
  }

  const oldValues = await getInvitationAuditSnapshot(code);
  let customSlug = "";
  if (action === "custom-slug") {
    const result = await resolveCustomInvitationSlug(formData.get("customSlug"), code);
    if (result.error) {
      const url = getRedirectUrl("/admin/invitations", request.headers, request.nextUrl.origin);
      url.searchParams.set("status", "custom-url-error");
      url.searchParams.set("message", result.error);
      return NextResponse.redirect(url, 303);
    }
    customSlug = result.slug;
  }

  if (!prisma) {
    console.error("[Admin Invitation Action] PostgreSQL is not configured. Refusing runtime-store fallback write.");
    return redirectBack(request, "database");
  }

  const updatedDatabase = await updateDatabaseInvitation(code, action, customSlug);
  const changed = updatedDatabase;

  if (changed) {
    safeRevalidatePath("/admin/invitations");
    safeRevalidatePath("/admin");
    safeRevalidatePath(`/${code}`);
    if (oldValues && "customSlug" in oldValues && typeof oldValues.customSlug === "string") safeRevalidatePath(`/${oldValues.customSlug}`);
    if (customSlug) safeRevalidatePath(`/${customSlug}`);
    safeRevalidatePath(`/${code}/ad_3399`);
    queueGitHubSync(`Client invitation ${action}: ${code}.`, { createSnapshot: true });
    await recordAuditLog({
      actor: await getAuditActorFromAdminRequest(request),
      action: action === "delete" ? "invitation.delete" : action === "archive" ? "invitation.archive" : action === "pause" ? "invitation.pause" : action === "custom-slug" ? "invitation.update" : "invitation.resume",
      entity: { type: "Invitation", id: code, label: code },
      oldValues,
      newValues: action === "delete" ? { deleted: true } : action === "custom-slug" ? { customSlug } : { status: action === "archive" ? "ARCHIVED" : action === "pause" ? "PAUSED" : "ACTIVE", active: action === "resume" },
      metadata: { storage: "database" },
    });
  }

  return redirectBack(request, changed ? action : "missing");
}
