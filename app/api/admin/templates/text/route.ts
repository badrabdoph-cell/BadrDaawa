import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getTemplatePreviewInfo, updateTemplatePreviewInfo } from "@/lib/template-preview-info";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const runtime = "nodejs";

type TextPatchPayload = {
  id?: string;
  value?: string;
};

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) return NextResponse.json({ ok: false, error: "انتهت جلسة الأدمن." }, { status: 401 });

  try {
    const payload = (await request.json().catch(() => null)) as TextPatchPayload | null;
    const id = cleanText(payload?.id, 80);
    const value = cleanText(payload?.value, 500);
    if (!id) return NextResponse.json({ ok: false, error: "النص المحدد غير صالح." }, { status: 400 });

    const current = await getTemplatePreviewInfo();
    const nextPatch = {
      texts: { ...current.texts },
      photographer: { ...current.photographer },
    };

    if (id === "invite-line-1") nextPatch.texts.inviteMessage = value;
    else if (id === "invite-line-2") nextPatch.texts.inviteMessageSecondary = value;
    else if (id === "photographer-title") nextPatch.photographer.name = value;
    else if (id === "photographer-copy") nextPatch.photographer.description = value;
    else if (id === "poll-question") nextPatch.texts.rsvpQuestion = value;
    else return NextResponse.json({ ok: false, error: "هذا النص غير قابل للحفظ من البحث." }, { status: 400 });

    const next = await updateTemplatePreviewInfo(nextPatch);
    const templates = await getTemplatesWithSettings();

    // Revalidate all affected paths to ensure the UI shows the new data
    revalidatePath("/admin/templates");
    revalidatePath("/templates");
    for (const template of templates) revalidatePath(`/templates/${template.slug}/preview`);
    queueGitHubSync(`Template text updated: ${id}.`, { uploadProjectFiles: true, changeType: "project" });

    await recordAuditLog({
      actor: await getAuditActorFromAdminRequest(request),
      action: "template.change",
      entity: { type: "Template", id: "global-preview-info", label: "نصوص القوالب" },
      oldValues: current,
      newValues: next,
      metadata: { source: "admin-template-text-search", fieldId: id },
    });

    console.log(`[Templates Text] Successfully updated: ${id}`);
    return NextResponse.json({ ok: true, previewInfo: next });
  } catch (error) {
    console.error("[Templates Text] CRITICAL ERROR:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "تعذر حفظ النص. حاول مرة أخرى." }, { status: 500 });
  }
}
