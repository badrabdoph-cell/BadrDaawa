import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getDynamicPages, deleteDynamicPage, setDynamicPagePublished, upsertDynamicPage } from "@/lib/dynamic-pages";
import { saveInvitationGalleryImages } from "@/lib/invitation-images";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectPages(request: NextRequest, params: Record<string, string>) {
  const url = getRedirectUrl("/admin/pages", request.headers, request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

function revalidatePageRoutes(slugs: Array<string | undefined>) {
  revalidatePath("/admin/pages");
  for (const slug of slugs) {
    if (slug) revalidatePath(`/${slug}`);
  }
}

async function uploadedCoverUrl(formData: FormData) {
  const file = formData.get("coverFile");
  if (!(file instanceof File) || !file.size) return "";
  const saved = await saveInvitationGalleryImages([file]);
  return saved[0] || "";
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  try {
    const formData = await request.formData();
    const action = String(formData.get("action") || "create");
    const id = String(formData.get("id") || "").trim();

    if (action === "delete") {
      if (!id) return redirectPages(request, { error: "id" });
      const deleted = await deleteDynamicPage(id);
      if (!deleted) return redirectPages(request, { error: "id" });
      revalidatePageRoutes([deleted.slug]);
      return redirectPages(request, { saved: "deleted" });
    }

    if (action === "toggle") {
      if (!id) return redirectPages(request, { error: "id" });
      const isPublished = String(formData.get("isPublished") || "") === "true";
      const page = await setDynamicPagePublished(id, isPublished);
      if (!page) return redirectPages(request, { error: "id" });
      revalidatePageRoutes([page.slug]);
      return redirectPages(request, { saved: "visibility" });
    }

    const pages = await getDynamicPages();
    const previous = id ? pages.find((page) => page.id === id) : undefined;
    const coverImageUrl = (await uploadedCoverUrl(formData)) || formData.get("coverImageUrl") || previous?.coverImageUrl || "";
    const result = await upsertDynamicPage({
      id,
      title: formData.get("title"),
      slug: formData.get("slug"),
      description: formData.get("description"),
      content: formData.get("content"),
      coverImageUrl,
      isPublished: formData.get("isPublished"),
    });

    if (!result.page) return redirectPages(request, { error: "validation", message: result.error || "بيانات الصفحة غير مكتملة." });

    revalidatePageRoutes([previous?.slug, result.page.slug]);
    const params: Record<string, string> = { saved: id ? "updated" : "created", edit: result.page.id };
    const url = getRedirectUrl("/admin/pages", request.headers, request.nextUrl.origin);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return NextResponse.redirect(url, 303);
  } catch (error) {
    console.error("Failed to update dynamic pages", error);
    return redirectPages(request, { error: "server" });
  }
}
