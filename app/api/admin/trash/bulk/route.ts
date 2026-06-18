import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { hardDeleteInvitationCompletely } from "@/lib/invitation-deletion";
import { hardDeleteTrashItem, restoreTrashItem, type TrashEntityType } from "@/lib/trash";
import { getRedirectUrl } from "@/lib/utils";

const entityTypes = new Set(["invitation", "order", "customer"]);

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") || "");
  const type = String(formData.get("type") || "");
  const idsRaw = formData.getAll("ids[]");

  if ((action !== "bulk-restore" && action !== "bulk-hard-delete") || !entityTypes.has(type) || idsRaw.length === 0) {
    return NextResponse.redirect(getRedirectUrl("/admin/trash?status=invalid", request.headers, request.nextUrl.origin), 303);
  }

  const entityType = type as TrashEntityType;
  const ids = idsRaw.map((id) => String(id));
  let successCount = 0;

  for (const id of ids) {
    try {
      if (action === "bulk-restore") {
        const ok = await restoreTrashItem(entityType, id, "database");
        if (ok) successCount++;
      } else if (entityType === "invitation") {
        const result = await hardDeleteInvitationCompletely(id);
        if (result.ok) successCount++;
      } else {
        const ok = await hardDeleteTrashItem(entityType, id, "database");
        if (ok) successCount++;
      }
    } catch {
      continue;
    }
  }

  revalidatePath("/admin/trash");
  revalidatePath("/admin");
  revalidatePath("/admin/invitations");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/customers");

  await recordAuditLog({
    actor: await getAuditActorFromAdminRequest(request),
    action: action === "bulk-restore" ? "backup.restore" : "invitation.delete",
    entity: { type: "Cleanup", id: ids.join(","), label: `${ids.length} items` },
    newValues: { action, type: entityType, count: ids.length, successCount },
    metadata: { source: "trash-bulk" },
  });

  const statusParam = action === "bulk-restore" ? "restored" : "deleted";
  return NextResponse.redirect(getRedirectUrl(`/admin/trash?status=${statusParam}&count=${successCount}`, request.headers, request.nextUrl.origin), 303);
}
