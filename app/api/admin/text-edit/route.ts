import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { updateContentText } from "@/lib/content-text-registry";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifyAdminSessionCookie(session))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { id?: string; value?: string };
    if (!body.id || typeof body.value !== "string") {
      return NextResponse.json({ error: "id and value are required" }, { status: 400 });
    }

    const success = await updateContentText(body.id, body.value);
    if (!success) {
      return NextResponse.json({ error: "Text not found or could not be updated" }, { status: 404 });
    }

    revalidatePath("/");
    revalidatePath("/admin/broadcast");
    revalidatePath("/admin/texts");

    return NextResponse.json({ success: true, id: body.id });
  } catch (error) {
    console.error("[Text Edit API] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
