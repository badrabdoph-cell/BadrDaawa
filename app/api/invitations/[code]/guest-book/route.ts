import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getInvitationByCode } from "@/lib/invitation-data";
import { createGuestBookMessage, getApprovedGuestBookMessages } from "@/lib/guest-book";
import { queueGitHubSync } from "@/lib/github-sync-queue";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  const messages = await getApprovedGuestBookMessages(code);
  return NextResponse.json({ messages });
}

export async function POST(request: Request, context: RouteContext) {
  const { code } = await context.params;
  const invitation = await getInvitationByCode(code);
  if (!invitation || !invitation.isActive) {
    return NextResponse.json({ error: "الدعوة غير متاحة حاليًا" }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { name?: unknown; message?: unknown } | null;
  const saved = await createGuestBookMessage({ invitationCode: code, name: body?.name, message: body?.message });
  if (!saved) {
    return NextResponse.json({ error: "اكتب الاسم ورسالة تهنئة واضحة." }, { status: 400 });
  }

  revalidatePath("/admin/guest-book");
  revalidatePath("/admin");
  revalidatePath(`/${code}/ad_3399`);
  revalidatePath(`/${invitation.customSlug || invitation.code}`);
  queueGitHubSync(`Guest book message pending review: ${code}.`, { createSnapshot: true });
  return NextResponse.json({ ok: true, status: saved.status });
}
