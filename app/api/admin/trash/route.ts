import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { hardDeleteInvitationCompletely } from "@/lib/invitation-deletion";
import { hardDeleteTrashItem, restoreTrashItem, type TrashEntityType } from "@/lib/trash";
import { getRedirectUrl } from "@/lib/utils";

const entityTypes = new Set(["invitation", "order", "customer"]);
const storageTypes = new Set(["database", "file"]);

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectTrash(request: NextRequest, status: string) {
  const url = getRedirectUrl("/admin/trash", request.headers, request.nextUrl.origin);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, 303);
}

function revalidateAdminTrash(type: TrashEntityType, id: string) {
  revalidatePath("/admin/trash");
  revalidatePath("/admin");
  if (type === "invitation") {
    revalidatePath("/admin/invitations");
    revalidatePath(`/${id}`);
    revalidatePath(`/${id}/ad_3399`);
  }
  if (type === "order") revalidatePath("/admin/orders");
  if (type === "customer") revalidatePath("/admin/customers");
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") || "");
  const type = String(formData.get("type") || "");
  const id = String(formData.get("id") || "");
  const storage = String(formData.get("storage") || "database");

  if ((action !== "restore" && action !== "hard-delete") || !entityTypes.has(type) || !id || !storageTypes.has(storage)) {
    return redirectTrash(request, "invalid");
  }

  const entityType = type as TrashEntityType;
  const storageType = storage as "database" | "file";
  let ok = false;
  let hardDeleteSummary: Awaited<ReturnType<typeof hardDeleteInvitationCompletely>> | null = null;
  if (action === "restore") {
    ok = await restoreTrashItem(entityType, id, storageType);
  } else if (entityType === "invitation" && storageType === "database") {
    hardDeleteSummary = await hardDeleteInvitationCompletely(id);
    ok = hardDeleteSummary.ok;
  } else {
    ok = await hardDeleteTrashItem(entityType, id, storageType);
  }

  if (!ok) return redirectTrash(request, "missing");

  revalidateAdminTrash(entityType, id);
  if (hardDeleteSummary) {
    await recordAuditLog({
      actor: await getAuditActorFromAdminRequest(request),
      action: "invitation.delete",
      entity: { type: "Invitation", id, label: id },
      oldValues: { hardDelete: true },
      newValues: {
        deleted: true,
        deletedRecords: hardDeleteSummary.deletedRecords,
        deletedFiles: hardDeleteSummary.deletedFiles.length,
        skippedFiles: hardDeleteSummary.skippedFiles.length,
      },
      metadata: {
        storage: "database",
        source: "trash-hard-delete",
        deletedFiles: hardDeleteSummary.deletedFiles,
        skippedFiles: hardDeleteSummary.skippedFiles,
      },
    });
  }
  return redirectTrash(request, action === "restore" ? "restored" : "deleted");
}
