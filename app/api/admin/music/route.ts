import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getMusicLibrary, updateMusicSlot } from "@/lib/music-library";
import { getTemplatesWithSettings, updateTemplatesMusicState } from "@/lib/template-settings";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

const allowedAudioTypes: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
};

const allowedAudioExtensions = new Set(["mp3", "wav", "ogg", "webm", "m4a", "aac"]);

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function cleanAudioUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

async function saveAudioFile(file: File | null) {
  if (!file || !file.size) return "";
  const nameExtension = file.name.split(".").pop()?.toLowerCase() || "";
  const extension = allowedAudioTypes[file.type] || (allowedAudioExtensions.has(nameExtension) ? nameExtension : "");
  if (!extension || file.size > 35 * 1024 * 1024) return "";

  const uploadDir = path.join(process.cwd(), "public", "uploads", "music");
  await mkdir(uploadDir, { recursive: true });
  const fileName = `music-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.${extension}`;
  await writeFile(path.join(uploadDir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/music/${fileName}`;
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const [templates, library] = await Promise.all([getTemplatesWithSettings(), getMusicLibrary()]);
  const allTemplateSlugs = templates.filter((template) => template.enabled).map((template) => template.slug);
  const slotId = String(formData.get("slotId") || "");
  const currentSlot = library.slots.find((slot) => slot.id === slotId);
  const trackName = String(formData.get("trackName") || "");
  const trackEnabled = formData.get("trackEnabled") === "on";
  const applyToAll = formData.get("applyToAll") === "on";
  const uploadedFile = formData.get("audioFile");
  const uploadedUrl = await saveAudioFile(uploadedFile instanceof File ? uploadedFile : null);
  const audioUrl = uploadedUrl || cleanAudioUrl(String(formData.get("audioUrl") || "")) || cleanAudioUrl(String(formData.get("existingAudioUrl") || "")) || currentSlot?.url || "";
  const selectedTemplateSlugs = applyToAll ? allTemplateSlugs : formData.getAll("templateSlugs").map((value) => String(value));
  const url = getRedirectUrl("/admin/music", request.headers, request.nextUrl.origin);

  if (!currentSlot || (trackEnabled && !audioUrl)) {
    url.searchParams.set("error", trackEnabled && !audioUrl ? "audio" : "slot");
    if (slotId) url.searchParams.set("open", slotId);
    return NextResponse.redirect(url, 303);
  }

  const appliedTemplateSlugs = selectedTemplateSlugs.length ? await updateTemplatesMusicState(selectedTemplateSlugs, { musicUrl: audioUrl, enabled: trackEnabled }) : [];

  const savedSlot = await updateMusicSlot({
    id: slotId,
    name: trackName,
    url: audioUrl,
    enabled: trackEnabled,
    applyToAll,
    templateSlugs: applyToAll ? allTemplateSlugs : appliedTemplateSlugs,
  });

  if (savedSlot) {
    revalidatePath("/admin/music");
    if (appliedTemplateSlugs.length) {
      revalidatePath("/admin/templates");
      revalidatePath("/templates");
      for (const slug of appliedTemplateSlugs) {
        revalidatePath(`/templates/${slug}/preview`);
      }
    }
    queueGitHubSync(`Music slot ${savedSlot.id} ${trackEnabled ? "enabled" : "disabled"} for ${appliedTemplateSlugs.length} template(s).`, { createSnapshot: true });
  }

  if (!savedSlot) url.searchParams.set("error", "slot");
  else url.searchParams.set("saved", savedSlot.id);
  url.searchParams.set("count", String(appliedTemplateSlugs.length));
  return NextResponse.redirect(url, 303);
}
