import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getDraftSiteSettings, updateSiteSettingsDraft } from "@/lib/site-settings";
import { promoteDraftToPublished } from "@/lib/project-content-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!(await verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ ok: false, error: "غير مصرح." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { order?: string[] };
    if (!Array.isArray(body.order)) {
      return NextResponse.json({ ok: false, error: "يجب إرسال مصفوفة order" }, { status: 400 });
    }

    const current = await getDraftSiteSettings();
    await updateSiteSettingsDraft({
      ...current,
      homepage: {
        ...current.homepage,
        sectionOrder: body.order,
      },
    });

    await promoteDraftToPublished("site-settings");

    revalidatePath("/");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/broadcast");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Section Order] Failed to save:", error);
    return NextResponse.json({ ok: false, error: "فشل حفظ ترتيب الأقسام" }, { status: 500 });
  }
}
