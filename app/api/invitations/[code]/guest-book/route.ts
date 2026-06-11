import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getInvitationByCode } from "@/lib/invitation-data";
import { createGuestBookMessage, getApprovedGuestBookMessages, getCoupleMessagesSettings, GuestBookStorageError } from "@/lib/guest-book";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { checkRequestRateLimit, rateLimitResponse } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";

export const runtime = "nodejs";
export const maxDuration = 45;

type RouteContext = {
  params: Promise<{ code: string }>;
};

async function readMessagePayload(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    return { formData };
  }
  const body = (await request.json().catch(() => null)) as { name?: unknown; message?: unknown } | null;
  return { body };
}

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  const settings = await getCoupleMessagesSettings(code);
  if (settings.mode === "disabled") {
    return NextResponse.json({ messages: [], settings });
  }
  const messages = await getApprovedGuestBookMessages(code);
  return NextResponse.json({ messages, settings });
}

export async function POST(request: Request, context: RouteContext) {
  const { code } = await context.params;
  if (!isSameOriginRequest(request)) return sameOriginErrorResponse();
  const limit = checkRequestRateLimit(request, `guest-book:${code}`, { windowMs: 60000, maxRequests: 6 });
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);

  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 32 * 1024) {
    return NextResponse.json({ error: "حجم الطلب كبير جدًا." }, { status: 413 });
  }

  const invitation = await getInvitationByCode(code);
  if (!invitation || !invitation.isActive) {
    return NextResponse.json({ error: "الدعوة غير متاحة حاليًا" }, { status: 404 });
  }

  const settings = await getCoupleMessagesSettings(code);
  if (settings.mode === "disabled") {
    return NextResponse.json({ error: "قسم رسائل العروسين غير مفعل لهذه الدعوة." }, { status: 403 });
  }

  const payload = await readMessagePayload(request);
  const formData = "formData" in payload ? payload.formData : null;
  const body = "body" in payload ? payload.body : null;
  const name = formData ? formData.get("name") : body?.name;
  const message = formData ? formData.get("message") : body?.message;
  const saved = await createGuestBookMessage({
    invitationCode: code,
    name,
    message,
    status: settings.mode === "auto" ? "approved" : "pending",
  }).catch((error) => {
    if (error instanceof GuestBookStorageError) return "storage-error" as const;
    throw error;
  });
  if (saved === "storage-error") {
    return NextResponse.json({ error: "تعذر حفظ الرسالة حالياً. حاول مرة أخرى بعد قليل." }, { status: 503 });
  }
  if (!saved) {
    return NextResponse.json({ error: "اكتب الاسم ورسالة واضحة للعروسين." }, { status: 400 });
  }

  revalidatePath("/admin/guest-book");
  revalidatePath("/admin");
  revalidatePath(`/${code}/ad_3399`);
  revalidatePath(`/${invitation.customSlug || invitation.code}`);
  queueGitHubSync(`Couple message ${saved.status}: ${code}.`, { createSnapshot: true });
  return NextResponse.json({ ok: true, status: saved.status, message: saved.status === "approved" ? saved : undefined });
}
