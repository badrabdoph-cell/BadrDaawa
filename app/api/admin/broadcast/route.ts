import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { collectAllTextEntries, updateContentText } from "@/lib/content-text-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function getBroadcastState() {
  const fields = (await collectAllTextEntries()).filter((field) => field.editable);
  return { fields };
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return jsonError("unauthorized", 401);
  }
  try {
    return NextResponse.json({ ok: true, ...(await getBroadcastState()) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "failed");
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return jsonError("unauthorized", 401);
  }
  try {
    const payload = (await request.json()) as { id?: string; value?: string };
    if (!payload.id || typeof payload.value !== "string") {
      return jsonError("يجب إرسال id و value");
    }
    const success = await updateContentText(payload.id, payload.value);
    if (!success) {
      return jsonError("لم يتم العثور على النص", 404);
    }
    revalidatePath("/");
    revalidatePath("/admin/broadcast");
    revalidatePath("/admin/texts");
    revalidatePath("/admin/settings");
    const fields = (await collectAllTextEntries()).filter((field) => field.editable);
    return NextResponse.json({ ok: true, fields });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "failed");
  }
}
