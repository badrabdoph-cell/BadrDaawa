import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { isLegalPageSlug, updateLegalPage } from "@/lib/legal-pages";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function revalidateLegalPages() {
  revalidatePath("/");
  revalidatePath("/privacy-policy");
  revalidatePath("/terms");
  revalidatePath("/refund-policy");
  revalidatePath("/usage-policy");
  revalidatePath("/admin/legal");
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const slug = String(formData.get("slug") || "");
  if (!isLegalPageSlug(slug)) {
    return NextResponse.redirect(getRedirectUrl("/admin/legal?error=slug", request.headers, request.nextUrl.origin), 303);
  }

  const page = await updateLegalPage(slug, {
    title: formData.get("title"),
    description: formData.get("description"),
    content: formData.get("content"),
  });
  revalidateLegalPages();
  queueGitHubSync(`Legal page updated: .`, { uploadProjectFiles: true, changeType: "project" });
  return NextResponse.redirect(getRedirectUrl(`/admin/legal?saved=${page.slug}`, request.headers, request.nextUrl.origin), 303);
}
