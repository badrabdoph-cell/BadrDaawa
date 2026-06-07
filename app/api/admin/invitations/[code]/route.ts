import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { prisma } from "@/lib/db";
import { deleteFileInvitation, setFileInvitationActive } from "@/lib/file-store";
import { syncAdminStateToGitHub } from "@/lib/github-sync";
import { getPublicUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectBack(request: NextRequest, status: string) {
  const url = new URL("/admin/client-invitations", request.url);
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
      await prisma.invitation.delete({ where: { code } });
      return true;
    }

    if (action === "pause" || action === "resume") {
      await prisma.invitation.update({
        where: { code },
        data: { status: action === "pause" ? "PAUSED" : "ACTIVE" },
      });
      return true;
    }
  } catch (error) {
    console.error("Failed to update database invitation from admin", error);
  }

  return false;
}

async function updateFileInvitationAction(code: string, action: string) {
  if (action === "delete") return deleteFileInvitation(code);
  if (action === "pause") return setFileInvitationActive(code, false);
  if (action === "resume") return setFileInvitationActive(code, true);
  return false;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getPublicUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const { code } = await params;
  const formData = await request.formData();
  const action = String(formData.get("action") || "").trim();
  if (!code || !["pause", "resume", "delete"].includes(action)) {
    return redirectBack(request, "invalid");
  }

  const updatedDatabase = await updateDatabaseInvitation(code, action);
  const updatedFile = updatedDatabase ? false : await updateFileInvitationAction(code, action);
  const changed = updatedDatabase || updatedFile;

  if (changed) {
    safeRevalidatePath("/admin/client-invitations");
    safeRevalidatePath("/admin");
    safeRevalidatePath(`/${code}`);
    safeRevalidatePath(`/${code}/ad_3399`);
    await syncAdminStateToGitHub(`Client invitation ${action}: ${code}.`, { createSnapshot: true });
  }

  return redirectBack(request, changed ? action : "missing");
}
