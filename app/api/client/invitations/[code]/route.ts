import { NextRequest, NextResponse } from "next/server";
import { cleanPlayableAudioUrl, deleteUploadedMusicFile, isYouTubeUrl, saveUploadedAudioFile } from "@/lib/audio-files";
import { prisma } from "@/lib/db";
import { getFileInvitationByCode, updateFileInvitation } from "@/lib/file-store";
import { getInvitationGalleryEntries, saveInvitationGalleryImages } from "@/lib/invitation-images";

function isClientAllowed(request: NextRequest, code: string) {
  const expected = process.env.CLIENT_SESSION_SECRET || process.env.AUTH_SECRET || "badrdaawa-client-local";
  return request.cookies.get("bd_client_session")?.value === `${expected}:${code}`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  if (!isClientAllowed(request, code)) {
    return NextResponse.redirect(new URL(`/${code}/ad_3399/login`, request.url), 303);
  }

  const formData = await request.formData();
  const galleryImages = getInvitationGalleryEntries(formData);
  const savedGallery = await saveInvitationGalleryImages(galleryImages);

  const data: Record<string, unknown> = {};
  const fileData: Record<string, unknown> = {};
  const groomName = String(formData.get("groomName") || "").trim();
  const brideName = String(formData.get("brideName") || "").trim();
  const weddingDate = String(formData.get("weddingDate") || "").trim();
  const weddingTime = String(formData.get("weddingTime") || "").trim();
  const venue = String(formData.get("venue") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const mapUrl = String(formData.get("mapUrl") || "").trim();
  const rawMusicUrl = String(formData.get("musicUrl") || "").trim();
  const uploadedAudio = formData.get("audioFile");
  let currentMusicUrl = "";

  if (formData.has("musicUrl") || uploadedAudio instanceof File) {
    if (rawMusicUrl && isYouTubeUrl(rawMusicUrl)) {
      return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=music-error`, request.url), 303);
    }

    if (prisma) {
      const existing = await prisma.invitation.findUnique({ where: { code }, select: { musicUrl: true } }).catch(() => null);
      currentMusicUrl = existing?.musicUrl || "";
    } else {
      currentMusicUrl = (await getFileInvitationByCode(code))?.musicUrl || "";
    }
  }

  if (groomName) {
    data.groomName = groomName;
    fileData.groomName = groomName;
  }
  if (brideName) {
    data.brideName = brideName;
    fileData.brideName = brideName;
  }
  if (weddingDate) {
    const parsedDate = new Date(weddingDate);
    if (!Number.isNaN(parsedDate.getTime())) {
      data.weddingDate = parsedDate;
      fileData.weddingDate = weddingDate;
    }
  }
  if (weddingTime) {
    data.weddingTime = weddingTime;
    fileData.weddingTime = weddingTime;
  }
  if (venue) {
    data.venue = venue;
    fileData.venue = venue;
  }
  if (city) {
    data.city = city;
    fileData.city = city;
  }
  if (mapUrl) {
    data.mapUrl = mapUrl;
    fileData.mapUrl = mapUrl;
  }
  if (formData.has("musicUrl") || uploadedAudio instanceof File) {
    const uploadedMusicUrl = await saveUploadedAudioFile(uploadedAudio instanceof File ? uploadedAudio : null, currentMusicUrl);
    const directMusicUrl = cleanPlayableAudioUrl(rawMusicUrl);
    const nextMusicUrl = uploadedMusicUrl || directMusicUrl || "";
    if (rawMusicUrl && !nextMusicUrl) {
      return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=music-error`, request.url), 303);
    }
    if (!uploadedMusicUrl && directMusicUrl && directMusicUrl !== currentMusicUrl) {
      await deleteUploadedMusicFile(currentMusicUrl);
    }
    data.musicUrl = nextMusicUrl;
    fileData.musicUrl = nextMusicUrl;
  }
  if (savedGallery.length) {
    data.gallery = savedGallery;
    data.heroPhoto = savedGallery[0];
    fileData.gallery = savedGallery;
    fileData.heroPhoto = savedGallery[0];
  }

  if (prisma) {
    try {
      if (Object.keys(data).length) {
        await prisma.invitation.update({ where: { code }, data });
      }
      return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=1`, request.url), 303);
    } catch (error) {
      console.error("Failed to update database invitation from client admin", error);
    }
  }

  if (Object.keys(fileData).length) {
    await updateFileInvitation(code, fileData);
  }
  return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=1`, request.url), 303);
}
