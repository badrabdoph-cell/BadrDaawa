import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { getFileInvitationByCode, setFileInvitationActive, setFileInvitationArchived, softDeleteFileInvitation } from "@/lib/file-store";
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

async function updateDatabaseInvitation(code: string, action: string) {
  if (!prisma) return false;

  try {
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

async function updateFileInvitationAction(code: string, action: string) {
  if (action === "delete") return softDeleteFileInvitation(code);
  if (action === "pause") return setFileInvitationActive(code, false);
  if (action === "resume") return setFileInvitationActive(code, true);
  if (action === "archive") return setFileInvitationArchived(code, true);
  return false;
}

async function getInvitationAuditSnapshot(code: string) {
  if (prisma) {
    const invitation = await prisma.invitation
      .findUnique({
        where: { code },
        select: {
          code: true,
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
  const fileInvitation = await getFileInvitationByCode(code).catch(() => null);
  if (!fileInvitation) return null;
  return {
    code: fileInvitation.code,
    isActive: fileInvitation.isActive,
    groomName: fileInvitation.groomName,
    brideName: fileInvitation.brideName,
    weddingDate: fileInvitation.weddingDate,
    venue: fileInvitation.venue,
    musicEnabled: fileInvitation.musicEnabled,
    musicUrl: fileInvitation.musicUrl,
  };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const { code } = await params;
  const formData = await request.formData();
  const action = String(formData.get("action") || "").trim();
  if (!code || !["pause", "resume", "archive", "delete"].includes(action)) {
    return redirectBack(request, "invalid");
  }

  const oldValues = await getInvitationAuditSnapshot(code);
  const updatedDatabase = await updateDatabaseInvitation(code, action);
  const updatedFile = updatedDatabase ? false : await updateFileInvitationAction(code, action);
  const changed = updatedDatabase || updatedFile;

  if (changed) {
    safeRevalidatePath("/admin/invitations");
    safeRevalidatePath("/admin");
    safeRevalidatePath(`/${code}`);
    safeRevalidatePath(`/${code}/ad_3399`);
    queueGitHubSync(`Client invitation ${action}: ${code}.`, { createSnapshot: true });
    await recordAuditLog({
      actor: await getAuditActorFromAdminRequest(request),
      action: action === "delete" ? "invitation.delete" : action === "archive" ? "invitation.archive" : action === "pause" ? "invitation.pause" : "invitation.resume",
      entity: { type: "Invitation", id: code, label: code },
      oldValues,
      newValues: action === "delete" ? { deleted: true } : { status: action === "archive" ? "ARCHIVED" : action === "pause" ? "PAUSED" : "ACTIVE", active: action === "resume" },
      metadata: { storage: updatedDatabase ? "database" : "file" },
    });
  }

  return redirectBack(request, changed ? action : "missing");
}
