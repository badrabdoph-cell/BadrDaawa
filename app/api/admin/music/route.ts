import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { cleanPlayableAudioUrl, deleteUploadedMusicFile, isYouTubeUrl, saveUploadedAudioFile } from "@/lib/audio-files";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getMusicLibrary, updateMusicSlot } from "@/lib/music-library";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const [templates, library] = await Promise.all([getTemplatesWithSettings(), getMusicLibrary()]);
  const allTemplateSlugs = templates.filter((template) => template.enabled).map((template) => template.slug);
  const slotId = String(formData.get("slotId") || "global-track");
  const currentSlot = library.slots.find((slot) => slot.id === slotId);
  const trackName = String(formData.get("trackName") || "");
  const trackEnabled = formData.get("trackEnabled") === "on";
  const uploadedFile = formData.get("audioFile");
  const existingAudioUrl = String(formData.get("existingAudioUrl") || currentSlot?.url || "");
  const requestedAudioUrl = String(formData.get("audioUrl") || "").trim();
  const url = getRedirectUrl("/admin/music", request.headers, request.nextUrl.origin);

  if (!currentSlot) {
    url.searchParams.set("error", "slot");
    return NextResponse.redirect(url, 303);
  }

  if (requestedAudioUrl && isYouTubeUrl(requestedAudioUrl)) {
    url.searchParams.set("error", "youtube");
    return NextResponse.redirect(url, 303);
  }

  const uploadedUrl = await saveUploadedAudioFile(uploadedFile instanceof File ? uploadedFile : null, existingAudioUrl);
  const directUrl = cleanPlayableAudioUrl(requestedAudioUrl);
  const isReplacingWithDirectUrl = Boolean(directUrl && directUrl !== existingAudioUrl);
  const audioUrl = uploadedUrl || directUrl || cleanPlayableAudioUrl(existingAudioUrl) || "";

  if (isReplacingWithDirectUrl) {
    await deleteUploadedMusicFile(existingAudioUrl);
  }

  if (trackEnabled && !audioUrl) {
    url.searchParams.set("error", trackEnabled && !audioUrl ? "audio" : "slot");
    return NextResponse.redirect(url, 303);
  }

  const appliedTemplateSlugs = allTemplateSlugs;

  const savedSlot = await updateMusicSlot({
    id: slotId,
    name: trackName,
    url: audioUrl,
    enabled: trackEnabled,
    applyToAll: true,
    templateSlugs: appliedTemplateSlugs,
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
