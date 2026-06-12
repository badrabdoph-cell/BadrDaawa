import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAuditActorFromAdminRequest, recordAuditLog } from "@/lib/audit-log";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getTemplatePreviewInfo, updateTemplatePreviewInfo } from "@/lib/template-preview-info";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getRedirectUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function storyItem(formData: FormData, index: number) {
  return {
    id: `template-preview-story-${index}`,
    title: text(formData, `story${index}Title`),
    description: text(formData, `story${index}Description`),
    date: text(formData, `story${index}Date`),
    imageUrl: text(formData, `story${index}ImageUrl`),
  };
}

function galleryStoryItem(formData: FormData, index: number) {
  return {
    title: text(formData, `galleryStory${index}Title`),
    description: text(formData, `galleryStory${index}Description`),
  };
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const oldValues = await getTemplatePreviewInfo().catch(() => null);
  const next = await updateTemplatePreviewInfo({
    language: text(formData, "language") === "en" ? "en" : "ar",
    groomName: text(formData, "groomName"),
    brideName: text(formData, "brideName"),
    weddingDate: text(formData, "weddingDate"),
    weddingTime: text(formData, "weddingTime"),
    venue: text(formData, "venue"),
    city: text(formData, "city"),
    mapUrl: text(formData, "mapUrl"),
    heroVideoUrl: text(formData, "heroVideoUrl"),
    gallery: [text(formData, "gallery1"), text(formData, "gallery2"), text(formData, "gallery3")],
    texts: {
      openingText: text(formData, "openingText"),
      inviteMessage: text(formData, "inviteMessage"),
      inviteMessageSecondary: text(formData, "inviteMessageSecondary"),
      rsvpQuestion: text(formData, "rsvpQuestion"),
      rsvpDeclinedMessage: text(formData, "rsvpDeclinedMessage"),
      rsvpConfirmedSuccessMessage: text(formData, "rsvpConfirmedSuccessMessage"),
      rsvpDeclinedSuccessMessage: text(formData, "rsvpDeclinedSuccessMessage"),
      galleryStories: [galleryStoryItem(formData, 1), galleryStoryItem(formData, 2), galleryStoryItem(formData, 3)],
      story: [storyItem(formData, 1), storyItem(formData, 2), storyItem(formData, 3)],
    },
    photographer: {
      enabled: formData.get("photographerEnabled") === "on",
      name: text(formData, "photographerName"),
      logoUrl: text(formData, "photographerLogoUrl"),
      instagramUrl: text(formData, "photographerInstagramUrl"),
      facebookUrl: text(formData, "photographerFacebookUrl"),
    },
  });

  const templates = await getTemplatesWithSettings();
  revalidatePath("/admin/templates");
  revalidatePath("/templates");
  for (const template of templates) revalidatePath(`/templates/${template.slug}/preview`);
  queueGitHubSync("Templates preview information updated from admin.", { uploadProjectFiles: true, changeType: "project" });

  const actor = await getAuditActorFromAdminRequest(request);
  await recordAuditLog({
    actor,
    action: "template.change",
    entity: { type: "Template", id: "global-preview-info", label: "معلومات القوالب" },
    oldValues,
    newValues: next,
    metadata: { source: "admin-template-preview-info", templates: templates.length },
  });

  const url = getRedirectUrl("/admin/templates", request.headers, request.nextUrl.origin);
  url.searchParams.set("saved", "template-info");
  url.hash = "template-preview-info";
  return NextResponse.redirect(url, 303);
}
