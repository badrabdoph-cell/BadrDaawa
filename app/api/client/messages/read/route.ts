import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { CLIENT_SESSION_COOKIE, verifyClientSessionCookie } from "@/lib/client-session";
import { getClientMessages, markClientMessageRead } from "@/lib/client-messages";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { code?: string; messageId?: string; all?: boolean } | null;
  const code = String(body?.code || "").trim();
  if (!code || !(await verifyClientSessionCookie(request.cookies.get(CLIENT_SESSION_COOKIE)?.value, code))) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  if (prisma) {
    const disabledCheck = await prisma.invitation.findFirst({ where: { code, deletedAt: null }, select: { disabledAt: true } });
    if (disabledCheck?.disabledAt) {
      return NextResponse.json({ ok: false, error: "الدعوة معطلة من الإدارة." }, { status: 403 });
    }
  }

  await markClientMessageRead(code, body?.all ? undefined : body?.messageId);
  revalidatePath(`/${code}/ad_3399`);
  const messages = await getClientMessages(code);
  return NextResponse.json({ ok: true, messages, unreadCount: messages.filter((message) => !message.readAt).length });
}
