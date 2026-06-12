import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAdminInvitations } from "@/lib/admin-data";
import { cleanNewDirectAudioUrl, deleteProjectMusicFile, deleteUploadedMusicFile, isBlockedMusicPageUrl, saveProjectAudioFile } from "@/lib/audio-files";
import { prisma } from "@/lib/db";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { deleteMusicSlot, getMusicLibrary, getMusicUsage, renameMusicSlot, saveMusicSlot, setMusicSlotEnabled } from "@/lib/music-library";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { clearTemplatesPreviewMusicIfTrackDeleted, updateTemplatesPreviewMusicSettings } from "@/lib/templates-preview-music";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

async function revalidateMusicPages(templateSlugs: string[]) {
  revalidatePath("/admin/music");
  revalidatePath("/admin/templates");
  revalidatePath("/admin/invitations");
  revalidatePath("/templates");
  for (const slug of templateSlugs) revalidatePath(`/templates/${slug}/preview`);

  const invitations = await getAdminInvitations().catch(() => []);
  for (const invitation of invitations) {
    revalidatePath(`/${invitation.code}`);
    revalidatePath(`/${invitation.code}/ad_3399`);
  }
}

function revalidateTemplatesPreviewPages(templateSlugs: string[]) {
  revalidatePath("/admin/music");
  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  for (const slug of templateSlugs) revalidatePath(`/templates/${slug}/preview`);
}

async function convertInvitationsToDefaultMusic(trackUrl: string) {
  if (!trackUrl) return 0;
  if (!prisma) {
    console.error("[Music] PostgreSQL is not configured. Refusing operational write.");
    return 0;
  }
  const result = await prisma.invitation.updateMany({
    where: { musicUrl: trackUrl },
    data: { musicUrl: null, musicEnabled: true },
  });
  return result.count;
}

function redirectWith(request: NextRequest, params: Record<string, string>) {
  const url = getRedirectUrl("/admin/music", request.headers, request.nextUrl.origin);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const [templates, library, invitations] = await Promise.all([getTemplatesWithSettings(), getMusicLibrary(), getAdminInvitations()]);
  const allTemplateSlugs = templates.filter((template) => template.enabled).map((template) => template.slug);
  const action = String(formData.get("action") || "save");
  const slotId = String(formData.get("slotId") || "").trim();
  const currentSlot = library.slots.find((slot) => slot.id === slotId);
  const usage = getMusicUsage(invitations, library);
  const usedCount = currentSlot?.url ? usage.usageByUrl.get(currentSlot.url) || 0 : 0;

  if (action === "templates-preview") {
    const enabled = formData.get("templatesPreviewEnabled") === "on";
    const requestedTrackId = String(formData.get("templatesPreviewTrackId") || "").trim();
    const selectedTrack = library.slots.find((slot) => slot.id === requestedTrackId && slot.url);
    if (enabled && !selectedTrack) return redirectWith(request, { error: "templates-preview-track" });
    const settings = await updateTemplatesPreviewMusicSettings({ enabled, trackId: selectedTrack?.id || "" });
    revalidateTemplatesPreviewPages(allTemplateSlugs);
    queueGitHubSync(`Templates preview music updated: ${settings.enabled ? settings.trackId : "off"}.`, { uploadProjectFiles: true, changeType: "project" });
    return redirectWith(request, { saved: "templates-preview" });
  }

  if (["rename", "replace", "enable", "disable", "delete"].includes(action) && !currentSlot) {
    return redirectWith(request, { error: "slot" });
  }

  if (action === "rename") {
    const name = String(formData.get("trackName") || "").trim();
    if (!name) return redirectWith(request, { error: "name" });
    const saved = await renameMusicSlot(slotId, name);
    await revalidateMusicPages(allTemplateSlugs);
    if (saved) queueGitHubSync(`Music track renamed: ${saved.id}.`, { uploadProjectFiles: true, changeType: "project" });
    return redirectWith(request, saved ? { saved: "renamed" } : { error: "slot" });
  }

  if (action === "enable" || action === "default") {
    if (!currentSlot?.url) return redirectWith(request, { error: "audio" });
    const saved = await setMusicSlotEnabled(slotId, true);
    await revalidateMusicPages(allTemplateSlugs);
    queueGitHubSync(`Default music set: ${saved?.id || slotId}.`, { uploadProjectFiles: true, changeType: "project" });
    return redirectWith(request, { saved: "default", count: String(allTemplateSlugs.length) });
  }

  if (action === "disable") {
    const saved = await setMusicSlotEnabled(slotId, false);
    await revalidateMusicPages(allTemplateSlugs);
    queueGitHubSync(`Default music disabled: ${saved?.id || slotId}.`, { uploadProjectFiles: true, changeType: "project" });
    return redirectWith(request, { saved: "disabled" });
  }

  if (action === "delete") {
    if (!currentSlot) return redirectWith(request, { error: "slot" });
    const forceDelete = formData.get("forceDelete") === "1";
    if (usedCount > 0 && !forceDelete) {
      return redirectWith(request, { confirmDelete: currentSlot.id, used: String(usedCount) });
    }
    const converted = await convertInvitationsToDefaultMusic(currentSlot.url);
    const deleted = await deleteMusicSlot(currentSlot.id);
    if (deleted) await clearTemplatesPreviewMusicIfTrackDeleted(deleted.id);
    if (deleted) {
      await deleteProjectMusicFile(deleted.url);
      await deleteUploadedMusicFile(deleted.url);
    }
    await revalidateMusicPages(allTemplateSlugs);
    queueGitHubSync(`Music track deleted: ${deleted?.id || slotId}; converted ${converted} invitation(s).`, { uploadProjectFiles: true, changeType: "project" });
    return redirectWith(request, deleted ? { saved: "deleted", converted: String(converted) } : { error: "slot" });
  }

  const trackName = String(formData.get("trackName") || currentSlot?.name || "").trim();
  if (!trackName) return redirectWith(request, { error: "name" });

  const uploadedFile = formData.get("audioFile");
  const hasUploadedFile = uploadedFile instanceof File && uploadedFile.size > 0;
  const requestedAudioUrl = String(formData.get("audioUrl") || "").trim();
  if (requestedAudioUrl && isBlockedMusicPageUrl(requestedAudioUrl)) {
    return redirectWith(request, { error: "blocked-url" });
  }

  const previousUrl = currentSlot?.url || "";
  if (!hasUploadedFile && !requestedAudioUrl && !previousUrl) {
    return redirectWith(request, { error: "audio" });
  }

  const uploadedUrl = await saveProjectAudioFile(hasUploadedFile ? uploadedFile : null, action === "replace" ? previousUrl : undefined);
  const directUrl = cleanNewDirectAudioUrl(requestedAudioUrl);
  if ((hasUploadedFile && !uploadedUrl) || (requestedAudioUrl && !directUrl)) {
    return redirectWith(request, { error: "audio" });
  }

  const audioUrl = uploadedUrl || directUrl || previousUrl;
  const source = uploadedUrl ? "upload" : directUrl ? "url" : currentSlot?.source;
  if (!audioUrl) return redirectWith(request, { error: "audio" });
  if (directUrl && previousUrl && directUrl !== previousUrl) {
    await deleteProjectMusicFile(previousUrl);
    await deleteUploadedMusicFile(previousUrl);
  }

  const enabled = formData.get("setDefault") === "on" || action === "replace-default";
  const savedSlot = await saveMusicSlot({
    id: currentSlot?.id,
    name: trackName,
    url: audioUrl,
    enabled,
    source,
  });

  if (!savedSlot) return redirectWith(request, { error: "slot" });
  await revalidateMusicPages(allTemplateSlugs);
  queueGitHubSync(`Music track saved: ${savedSlot.id}.`, { uploadProjectFiles: true, changeType: "project" });
  return redirectWith(request, { saved: enabled ? "default" : "saved", count: String(allTemplateSlugs.length) });
}
