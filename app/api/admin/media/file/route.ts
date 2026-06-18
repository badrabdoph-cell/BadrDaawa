import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { deleteMediaFile, replaceMediaFile } from "@/lib/media-cleanup";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectMedia(request: NextRequest, params: Record<string, string>) {
  const url = getRedirectUrl("/admin/media", request.headers, request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const action = String(formData.get("action") || "");
  const url = String(formData.get("url") || "");

  if (action === "delete") {
    const result = await deleteMediaFile(url);
    if (!result.ok) return redirectMedia(request, { mediaError: result.reason || "delete" });
    if (result.file?.kind === "image") {
      await recordAuditLog({
        actor: await getAuditActorFromAdminRequest(request),
        action: "media.image.delete",
        entity: { type: "Media", id: result.file.url, label: result.file.relativePath },
        oldValues: result.file,
        newValues: { deleted: true },
        metadata: { backupFileName: result.backupFileName, source: "media-library" },
      });
    }
    return redirectMedia(request, { mediaSaved: "deleted", backup: result.backupFileName || "" });
  }

  if (action === "bulk-delete") {
    const urls = formData.getAll("url").map(String).filter(Boolean);
    let deleted = 0;
    for (const deleteUrl of urls) {
      const result = await deleteMediaFile(deleteUrl);
      if (result.ok) deleted++;
    }
    return redirectMedia(request, { deleted: String(deleted), backup: "bulk" });
  }

  if (action === "replace") {
    const file = formData.get("file");
    const result = await replaceMediaFile(url, file instanceof File ? file : null);
    if (!result.ok) return redirectMedia(request, { mediaError: result.reason || "replace" });
    return redirectMedia(request, { mediaSaved: "replaced", backup: result.backupFileName || "" });
  }

  return redirectMedia(request, { mediaError: "action" });
}
