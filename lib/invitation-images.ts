import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const maxGalleryImageBytes = 3 * 1024 * 1024;

export const fallbackInvitationGallery = ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"];

function isExistingImageUrl(value: string) {
  return value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://");
}

export async function saveInvitationGalleryImages(images: string[]) {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "client-invitations");
  const savedUrls: string[] = [];

  for (const image of images.slice(0, 3)) {
    const value = image.trim();
    if (!value) continue;

    if (isExistingImageUrl(value)) {
      savedUrls.push(value);
      continue;
    }

    const match = value.match(/^data:image\/(?:jpeg|jpg);base64,([a-zA-Z0-9+/=]+)$/);
    if (!match) continue;

    const bytes = Buffer.from(match[1], "base64");
    if (!bytes.length || bytes.length > maxGalleryImageBytes) continue;

    try {
      await mkdir(uploadDir, { recursive: true });
      const fileName = `invitation-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.jpg`;
      await writeFile(path.join(uploadDir, fileName), bytes);
      savedUrls.push(`/uploads/client-invitations/${fileName}`);
    } catch (error) {
      console.error("Failed to save invitation gallery image", error);
    }
  }

  return savedUrls;
}
