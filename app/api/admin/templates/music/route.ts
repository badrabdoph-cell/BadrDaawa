import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { updateTemplateMusic } from "@/lib/template-settings";
import { getPublicUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getPublicUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const slug = String(formData.get("slug") || "").trim();
  const musicUrl = String(formData.get("musicUrl") || "").trim();
  const updated = await updateTemplateMusic(slug, musicUrl);

  if (updated) {
    revalidatePath("/admin/templates");
    revalidatePath("/templates");
    revalidatePath(`/templates/${slug}/preview`);
  }

  const url = new URL("/admin/templates", request.url);
  url.searchParams.set("saved", updated ? slug : "0");
  return NextResponse.redirect(url, 303);
}
