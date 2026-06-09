import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getInvitationByCode } from "@/lib/invitation-data";
import { createGuestBookMessage, getApprovedGuestBookMessages, getCoupleMessagesSettings } from "@/lib/guest-book";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { saveOrderPreviewImages } from "@/lib/order-preview-images";
import { checkRequestRateLimit, rateLimitResponse } from "@/lib/rate-limiting";
import { isSameOriginRequest, sameOriginErrorResponse } from "@/lib/security-enhancements";

export const runtime = "nodejs";
export const maxDuration = 45;

type RouteContext = {
  params: Promise<{ code: string }>;
};

const maxMessageImageBytes = 8 * 1024 * 1024;

async function uploadedImageUrl(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    const image = formData?.get("image");
    const imageUrl = String(formData?.get("imageUrl") || "").trim();
    if (image instanceof File && image.size > 0) {
      if (image.size > maxMessageImageBytes) {
        return { formData, error: "حجم الصورة كبير. اختار صورة أقل من 8MB." };
      }
      const saved = await saveOrderPreviewImages([image], "couple-messages", `couple-message-${Date.now().toString(36)}`);
      return { formData, imageUrl: saved[0] || "" };
    }
    return { formData, imageUrl };
  }
  const body = (await request.json().catch(() => null)) as { name?: unknown; message?: unknown; imageUrl?: unknown } | null;
  return { body, imageUrl: body?.imageUrl };
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
  if (contentLength > maxMessageImageBytes + 256 * 1024) {
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

  const payload = await uploadedImageUrl(request);
  if ("error" in payload && payload.error) {
    return NextResponse.json({ error: payload.error }, { status: 413 });
  }
  const formData = "formData" in payload ? payload.formData : null;
  const body = "body" in payload ? payload.body : null;
  const name = formData ? formData.get("name") : body?.name;
  const message = formData ? formData.get("message") : body?.message;
  const saved = await createGuestBookMessage({
    invitationCode: code,
    name,
    message,
    imageUrl: payload.imageUrl,
    status: settings.mode === "auto" ? "approved" : "pending",
  });
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
