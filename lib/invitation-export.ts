import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type InvitationExportData = {
  code: string;
  templateSlug: string;
  groomName: string;
  brideName: string;
  weddingDate: string;
  weddingTime: string;
  venue: string;
  city: string;
  mapUrl: string;
  heroPhoto: string;
  gallery: string[];
  musicUrl: string;
  exportedAt: string;
  createdAt: string;
};

/**
 * Exports invitation metadata as a JSON file to `data/invitations/{code}.json`.
 * This ensures the GitHub sync process picks up invitation data alongside the
 * uploaded image files in `public/uploads/`.
 *
 * Errors are logged but never thrown so they don't block invitation creation.
 */
export async function exportInvitationData(data: InvitationExportData): Promise<boolean> {
  const exportDir = path.join(process.cwd(), "data", "invitations");

  try {
    await mkdir(exportDir, { recursive: true });

    const filePath = path.join(exportDir, `${data.code}.json`);
    const payload = {
      ...data,
      exportedAt: new Date().toISOString(),
    };

    await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    console.log(`[InvitationExport] Exported invitation data to data/invitations/${data.code}.json`);
    return true;
  } catch (error) {
    console.error(`[InvitationExport] Failed to export invitation data for "${data.code}":`, error);
    return false;
  }
}
