import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { updateAdminFavoriteNote } from "@/lib/admin-favorites";

export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { id?: string; note?: string } | null;
  if (!body?.id) {
    return NextResponse.json({ error: "Missing favorite id" }, { status: 400 });
  }

  await updateAdminFavoriteNote(body.id, body.note || "");
  revalidatePath("/admin/favorites");
  return NextResponse.json({ success: true });
}
