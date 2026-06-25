import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { updateContentText } from "@/lib/content-text-registry";
import { updateSiteTextOverrideDraft } from "@/lib/site-text-overrides";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSessionCookie(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: string; value?: string; path?: string; originalText?: string; occurrence?: number };
    if (!body.id || typeof body.value !== "string") {
      return NextResponse.json({ error: "id and value are required" }, { status: 400 });
    }

    let success = false;
    if (body.id.startsWith("site-text-overrides.") && typeof body.path === "string" && typeof body.originalText === "string") {
      await updateSiteTextOverrideDraft({
        id: body.id,
        path: body.path,
        originalText: body.originalText,
        text: body.value,
        occurrence: Number.isInteger(body.occurrence) ? body.occurrence : 0,
      });
      success = true;
    } else {
      success = await updateContentText(body.id, body.value);
    }
    if (!success) {
      return NextResponse.json({ error: "Text not found or could not be updated" }, { status: 404 });
    }

    revalidatePath("/");
    revalidatePath("/templates");
    revalidatePath("/admin/broadcast");
    revalidatePath("/admin/texts");

    return NextResponse.json({ success: true, id: body.id });
  } catch (error) {
    console.error("[Text Edit API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
