import { headers } from "next/headers";
import { AdminNewInvitationWizard } from "@/components/AdminNewInvitationWizard";
import { getMediaCleanupReport } from "@/lib/media-cleanup";
import { getMusicLibrary } from "@/lib/music-library";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getPublicSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NewInvitationPage() {
  const [templates, musicLibrary, mediaReport, requestHeaders] = await Promise.all([getTemplatesWithSettings(), getMusicLibrary(), getMediaCleanupReport(), headers()]);
  const templateOptions = templates.map(({ slug, name, arabicName, category, previewImage }) => ({
    slug,
    name,
    arabicName,
    category,
    previewImage,
  }));
  const musicFiles = musicLibrary.slots
    .filter((slot) => slot.url)
    .map((slot) => ({
      id: slot.id,
      name: slot.name,
      url: slot.url,
      modifiedAt: Date.parse(slot.updatedAt || slot.createdAt || "") || 0,
      sizeBytes: slot.sizeBytes,
      extension: slot.extension,
    }));
  const imageFiles = mediaReport.usedFiles
    .concat(mediaReport.unusedFiles)
    .filter((file) => file.kind === "image")
    .map((file) => ({ url: file.url, name: file.relativePath, sizeBytes: file.sizeBytes, extension: file.extension }));

  return <AdminNewInvitationWizard templates={templateOptions} musicFiles={musicFiles} imageFiles={imageFiles} siteUrl={getPublicSiteUrl(requestHeaders).replace(/\/$/, "")} />;
}
