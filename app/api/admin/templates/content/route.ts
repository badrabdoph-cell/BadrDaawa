import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { deleteUploadUrlIfUnused } from "@/lib/media-cleanup";
import {
  getTemplatePreviewBaseInfo,
  getTemplatePreviewInfo,
  resolveTemplatePreviewInfo,
  updateTemplatePreviewInfo,
  type TemplatePreviewEditableInfo,
  type TemplatePreviewInfo,
} from "@/lib/template-preview-info";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const runtime = "nodejs";

type SavePayload = {
  mode?: "global" | "template";
  templateSlug?: string;
  content?: Partial<TemplatePreviewEditableInfo>;
  scope?: {
    mode?: "all" | "allExcept";
    excludedSlugs?: string[];
  };
  conflictResolution?: "ask" | "applyGlobal" | "preserveCustom";
};

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function collectUploadUrls(value: unknown, urls = new Set<string>()) {
  if (!value) return urls;
  if (typeof value === "string") {
    for (const match of value.matchAll(/\/uploads\/[A-Za-z0-9._~:/?#@!$&'()*+,;=%-]+/g)) urls.add(match[0].split("?")[0].split("#")[0]);
    return urls;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUploadUrls(item, urls);
    return urls;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) collectUploadUrls(item, urls);
  }
  return urls;
}

function mergeContent(base: TemplatePreviewEditableInfo, patch: Partial<TemplatePreviewEditableInfo> = {}) {
  return {
    ...base,
    ...patch,
    texts: {
      ...base.texts,
      ...patch.texts,
    },
    photographer: {
      ...base.photographer,
      ...patch.photographer,
    },
  };
}

function validSlugs(input: unknown, allSlugs: Set<string>) {
  return Array.isArray(input) ? input.filter((item): item is string => typeof item === "string" && allSlugs.has(item)) : [];
}

async function cleanupReplacedUploads(before: unknown, after: unknown) {
  const beforeUrls = collectUploadUrls(before);
  const afterUrls = collectUploadUrls(after);
  const removed = [...beforeUrls].filter((url) => !afterUrls.has(url));
  const results = await Promise.allSettled(removed.map((url) => deleteUploadUrlIfUnused(url)));
  return results
    .map((result, index) => ({ url: removed[index], result }))
    .filter((item) => item.result.status === "fulfilled" && item.result.value.ok)
    .map((item) => item.url);
}

function responsePayload(info: TemplatePreviewInfo, templates: Awaited<ReturnType<typeof getTemplatesWithSettings>>) {
  return {
    ok: true,
    previewInfo: info,
    effectiveBySlug: Object.fromEntries(templates.map((template) => [template.slug, resolveTemplatePreviewInfo(info, template.slug)])),
    templates: templates.map((template) => ({
      slug: template.slug,
      name: template.name,
      arabicName: template.arabicName,
      category: template.category,
      previewImage: template.previewImage,
      enabled: template.enabled,
      score: template.score,
    })),
  };
}

async function revalidateTemplates(templates: Awaited<ReturnType<typeof getTemplatesWithSettings>>) {
  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  for (const template of templates) revalidatePath(`/templates/${template.slug}/preview`);
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) return NextResponse.json({ ok: false, error: "انتهت جلسة الأدمن." }, { status: 401 });
  const [previewInfo, templates] = await Promise.all([getTemplatePreviewInfo(), getTemplatesWithSettings()]);
  return NextResponse.json(responsePayload(previewInfo, templates));
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) return NextResponse.json({ ok: false, error: "انتهت جلسة الأدمن. سجل الدخول مرة أخرى." }, { status: 401 });

  try {
    const payload = (await request.json().catch(() => null)) as SavePayload | null;
    if (!payload?.content) return NextResponse.json({ ok: false, error: "بيانات الحفظ غير صالحة." }, { status: 400 });

    const [current, templates] = await Promise.all([getTemplatePreviewInfo(), getTemplatesWithSettings()]);
    const allSlugs = new Set(templates.map((template) => template.slug));
    const mode = payload.mode === "template" ? "template" : "global";
    const beforeUrlsSnapshot = current;
    let next: TemplatePreviewInfo | null = null;

    if (mode === "template") {
      const slug = payload.templateSlug || "";
      if (!allSlugs.has(slug)) return NextResponse.json({ ok: false, error: "القالب المحدد غير موجود." }, { status: 400 });
      const base = resolveTemplatePreviewInfo(current, slug);
      next = await updateTemplatePreviewInfo({
        templateOverrides: {
          ...current.templateOverrides,
          [slug]: {
            ...mergeContent(base, payload.content),
            updatedAt: new Date().toISOString(),
          },
        },
      });
    } else {
      const overrideSlugs = Object.keys(current.templateOverrides).filter((slug) => allSlugs.has(slug));
      if (overrideSlugs.length && (payload.conflictResolution || "ask") === "ask") {
        return NextResponse.json(
          {
            ok: false,
            conflict: true,
            message: "بعض القوالب تحتوي تعديلات مخصصة تختلف عن الإعدادات العامة.",
            templates: templates.filter((template) => overrideSlugs.includes(template.slug)).map((template) => ({ slug: template.slug, arabicName: template.arabicName })),
          },
          { status: 409 },
        );
      }

      const scopeMode = payload.scope?.mode === "allExcept" ? "allExcept" : "all";
      const excludedSlugs = scopeMode === "allExcept" ? validSlugs(payload.scope?.excludedSlugs, allSlugs) : [];
      const base = getTemplatePreviewBaseInfo(current);
      const nextOverrides = { ...current.templateOverrides };
      if (payload.conflictResolution === "applyGlobal") {
        for (const slug of overrideSlugs) delete nextOverrides[slug];
      }
      if (scopeMode === "allExcept") {
        for (const slug of excludedSlugs) {
          nextOverrides[slug] = {
            ...resolveTemplatePreviewInfo(current, slug),
            updatedAt: new Date().toISOString(),
          };
        }
      }
      next = await updateTemplatePreviewInfo({
        ...mergeContent(base, payload.content),
        templateOverrides: nextOverrides,
        adminScope: { mode: scopeMode, excludedSlugs },
      });
    }

    if (!next) throw new Error("Failed to update template preview info");

    await revalidateTemplates(templates);
    const deletedUploads = await cleanupReplacedUploads(beforeUrlsSnapshot, next);
    queueGitHubSync("Templates content updated from redesigned admin editor.", { uploadProjectFiles: true, changeType: "project" });
    await recordAuditLog({
      actor: await getAuditActorFromAdminRequest(request),
      action: "template.change",
      entity: { type: "Template", id: mode === "template" ? payload.templateSlug || "unknown" : "global-preview-info", label: mode === "template" ? payload.templateSlug || "قالب منفرد" : "معلومات القوالب" },
      oldValues: current,
      newValues: next,
      metadata: { source: "templates-content-editor", mode, deletedUploads },
    });

    console.log("[Templates Content] Successfully updated and saved");
    return NextResponse.json(responsePayload(next, templates));
  } catch (error) {
    console.error("[Templates Content] CRITICAL ERROR:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "تعذر حفظ التعديلات. حاول مرة أخرى." }, { status: 500 });
  }
}
