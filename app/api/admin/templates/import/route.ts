import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { createCustomTemplateFromHtml } from "@/lib/custom-templates";
import { syncAdminStateToGitHub } from "@/lib/github-sync";
import { getPublicUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getPublicUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const result = await createCustomTemplateFromHtml({
    name: String(formData.get("name") || ""),
    slug: String(formData.get("slug") || ""),
    category: String(formData.get("category") || ""),
    concept: String(formData.get("concept") || ""),
    musicUrl: String(formData.get("musicUrl") || ""),
    html: String(formData.get("html") || ""),
  });

  if (result.ok) {
    revalidatePath("/admin/templates");
    revalidatePath("/templates");
    revalidatePath("/order");
    revalidatePath(`/templates/${result.template.slug}/preview`);
    await syncAdminStateToGitHub(`Custom template imported: ${result.template.slug}.`, { createSnapshot: true });
  }

  const url = new URL("/admin/templates", request.url);
  url.searchParams.set("imported", result.ok ? result.template.slug : "0");
  return NextResponse.redirect(url, 303);
}
