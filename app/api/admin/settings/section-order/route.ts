import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, getAdminSessionUser } from "@/lib/admin-session";
import { getDraftSiteSettings, updateSiteSettingsDraft } from "@/lib/site-settings";
import { publishSingleContentToGitHub } from "@/lib/publish-pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const username = await getAdminSessionUser(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (!username) {
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

    await publishSingleContentToGitHub("site-settings", username);

    revalidatePath("/");
    revalidatePath("/admin/settings");
    revalidatePath("/admin/broadcast");

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Section Order] Failed to save:", error);
    return NextResponse.json({ ok: false, error: "فشل حفظ ترتيب الأقسام" }, { status: 500 });
  }
}
