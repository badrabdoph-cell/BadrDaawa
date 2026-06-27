import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { recordAuditLog } from "@/lib/audit-log";
import { cleanPlayableAudioUrl, deleteUploadedMusicFile, isYouTubeUrl, saveAudioDataUrl, saveUploadedAudioFile } from "@/lib/audio-files";
import { CLIENT_SESSION_COOKIE, verifyClientSessionCookie } from "@/lib/client-session";
import { prisma } from "@/lib/db";
import { getInvitationGalleryEntries, saveInvitationGalleryImages } from "@/lib/invitation-images";
import { cleanInvitationHeroVideoUrl, invitationTextsWithHeroVideo } from "@/lib/invitation-media";
import { normalizeInvitationTexts } from "@/lib/invitation-texts";
import type { Invitation } from "@/lib/types";
import { extractCoordinatesFromUrl } from "@/lib/map-url";

async function isClientAllowed(request: NextRequest, code: string) {
  return verifyClientSessionCookie(request.cookies.get(CLIENT_SESSION_COOKIE)?.value, code);
}

function getClientAuditActor(code: string) {
  return { type: "client" as const, id: code, label: `Client ${code}` };
}

type ClientInvitationPayload = {
  groomName?: string;
  brideName?: string;
  weddingDate?: string;
  weddingTime?: string;
  venue?: string;
  city?: string;
  mapUrl?: string;
  gallery?: string[];
  heroVideoUrl?: string;
  musicEnabled?: boolean;
  musicUrl?: string;
  musicDataUrl?: string;
  texts?: Invitation["texts"];
  photographer?: {
    enabled?: boolean;
    name?: string;
    description?: string;
    logoUrl?: string;
    logoDataUrl?: string;
    facebookUrl?: string;
    instagramUrl?: string;
  };
};

function cleanText(value: unknown, maxLength = 180) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanUrl(value: unknown) {
  const clean = cleanText(value, 300);
  if (!clean) return "";
  try {
    const url = new URL(clean);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

async function getCurrentMusicUrl(code: string) {
  if (prisma) {
    const existing = await prisma.invitation.findFirst({ where: { code, deletedAt: null }, select: { musicUrl: true } }).catch(() => null);
    if (existing?.musicUrl) return existing.musicUrl;
  }
  return "";
}

async function getClientInvitationAuditSnapshot(code: string) {
  if (prisma) {
    const invitation = await prisma.invitation
      .findFirst({
        where: { code, deletedAt: null },
        select: {
          code: true,
          status: true,
          groomName: true,
          brideName: true,
          weddingDate: true,
          weddingTime: true,
          venue: true,
          city: true,
          mapUrl: true,
          gallery: true,
          heroPhoto: true,
          musicEnabled: true,
          musicUrl: true,
          texts: true,
          photographer: true,
        },
      })
      .catch(() => null);
    if (invitation) return invitation;
  }
  return null;
}

async function resolveJsonMusic(code: string, payload: ClientInvitationPayload) {
  if (payload.musicEnabled === false) return { musicUrl: undefined, error: "" };
  if (payload.musicEnabled !== true) return { musicUrl: undefined, error: "" };

  const currentMusicUrl = await getCurrentMusicUrl(code);
  const uploadedMusicUrl = payload.musicDataUrl ? await saveAudioDataUrl(payload.musicDataUrl, currentMusicUrl) : "";
  const rawMusicUrl = cleanText(payload.musicUrl, 500);
  const directMusicUrl = cleanPlayableAudioUrl(rawMusicUrl);
  const nextMusicUrl = uploadedMusicUrl || directMusicUrl;

  if ((payload.musicDataUrl || rawMusicUrl) && !nextMusicUrl) {
    return { musicUrl: "", error: "ملف أو رابط الموسيقى غير قابل للتشغيل." };
  }
  if (!uploadedMusicUrl && directMusicUrl && directMusicUrl !== currentMusicUrl) {
    await deleteUploadedMusicFile(currentMusicUrl);
  }
  return { musicUrl: nextMusicUrl, error: "" };
}

async function resolveJsonPhotographer(payload: ClientInvitationPayload) {
  const photographer = payload.photographer;
  if (!photographer) return undefined;
  if (!photographer.enabled) return { enabled: false, name: "", description: "", logoUrl: "", facebookUrl: "", instagramUrl: "" };

  const logoGallery = photographer.logoDataUrl ? await saveInvitationGalleryImages([photographer.logoDataUrl]) : [];
  return {
    enabled: true,
    name: cleanText(photographer.name, 100) || "المصور الفوتوغرافي",
    description: cleanText(photographer.description, 500) || "",
    logoUrl: logoGallery[0] || cleanText(photographer.logoUrl, 300),
    facebookUrl: cleanUrl(photographer.facebookUrl) || "https://www.facebook.com/",
    instagramUrl: cleanUrl(photographer.instagramUrl) || "https://www.instagram.com/",
  };
}

async function handleJsonUpdate(request: NextRequest, code: string) {
  const payload = (await request.json().catch(() => null)) as ClientInvitationPayload | null;
  if (!payload) return NextResponse.json({ error: "بيانات غير صالحة." }, { status: 400 });
  if (!prisma) {
    console.error("[Client Invitation] PostgreSQL is not configured. Refusing operational write.");
    return NextResponse.json({ error: "قاعدة البيانات غير متاحة حالياً. حاول مرة أخرى بعد قليل." }, { status: 503 });
  }
  const oldValues = await getClientInvitationAuditSnapshot(code);

  const data: Record<string, unknown> = {};
  const fileData: Record<string, unknown> = {};
  const groomName = cleanText(payload.groomName);
  const brideName = cleanText(payload.brideName);
  const weddingDate = cleanText(payload.weddingDate);
  const weddingTime = cleanText(payload.weddingTime);
  const venue = cleanText(payload.venue);
  const city = cleanText(payload.city);
  const mapUrl = cleanText(payload.mapUrl, 500);
  const oldTexts = oldValues && "texts" in oldValues ? oldValues.texts : undefined;
  const oldRawTexts = oldTexts && typeof oldTexts === "object" ? (oldTexts as Record<string, unknown>) : {};
  const currentHeroVideoUrl = cleanInvitationHeroVideoUrl((oldValues && "heroVideoUrl" in oldValues ? oldValues.heroVideoUrl : undefined) || oldRawTexts.heroVideoUrl);
  const heroVideoUrl = typeof payload.heroVideoUrl === "string" ? cleanInvitationHeroVideoUrl(payload.heroVideoUrl) : currentHeroVideoUrl;
  let uploadedImageUrls: string[] = [];

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
  data.city = city;
  fileData.city = city;
  data.mapUrl = mapUrl;
  fileData.mapUrl = mapUrl;
  const clientMapCoords = extractCoordinatesFromUrl(mapUrl);
  data.latitude = clientMapCoords?.lat ?? null;
  data.longitude = clientMapCoords?.lng ?? null;

  if (Array.isArray(payload.gallery)) {
    const galleryInput = payload.gallery.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).slice(0, 3);
    const savedGallery = await saveInvitationGalleryImages(galleryInput);
    if (galleryInput.length && !savedGallery.length) {
      console.error(`[Client Invitation] JSON image save failed for ${code}. Received ${galleryInput.length}, saved 0.`);
      return NextResponse.json({ error: "الصور لم يتم حفظها. جرّب صورة أخرى أو صيغة مختلفة." }, { status: 400 });
    }
    if (savedGallery.length) {
      uploadedImageUrls = savedGallery;
      data.gallery = savedGallery;
      data.heroPhoto = savedGallery[0];
      fileData.gallery = savedGallery;
      fileData.heroPhoto = savedGallery[0];
    }
  }

  if (typeof payload.musicEnabled === "boolean") {
    data.musicEnabled = payload.musicEnabled;
    fileData.musicEnabled = payload.musicEnabled;
    const music = await resolveJsonMusic(code, payload);
    if (music.error) return NextResponse.json({ error: music.error }, { status: 400 });
    if (typeof music.musicUrl === "string") {
      data.musicUrl = music.musicUrl;
      fileData.musicUrl = music.musicUrl;
    }
  }

  const photographer = await resolveJsonPhotographer(payload);
  if (photographer) {
    data.photographer = photographer;
    fileData.photographer = photographer;
  }
  if (payload.texts || typeof payload.heroVideoUrl === "string") {
    const texts = invitationTextsWithHeroVideo(normalizeInvitationTexts(payload.texts || oldTexts), heroVideoUrl);
    data.texts = texts;
    fileData.texts = texts;
    fileData.heroVideoUrl = heroVideoUrl;
  }

  let updated = false;
  try {
    if (Object.keys(data).length) {
      const result = await prisma.invitation.updateMany({ where: { code, deletedAt: null }, data });
      updated = result.count > 0;
    }
  } catch (error) {
    console.error("Failed to update database invitation from client JSON editor", error);
    return NextResponse.json({ error: "تعذر حفظ التعديلات في قاعدة البيانات." }, { status: 500 });
  }

  revalidatePath(`/${code}`);
  revalidatePath(`/${code}/ad_3399`);
  if (updated) {
    await recordAuditLog({
      actor: getClientAuditActor(code),
      action: "invitation.update",
      entity: { type: "Invitation", id: code, label: code },
      oldValues,
      newValues: fileData,
      metadata: { source: "client-live-editor" },
    });
    if (uploadedImageUrls.length) {
      await recordAuditLog({
        actor: getClientAuditActor(code),
        action: "media.image.upload",
        entity: { type: "Media", id: uploadedImageUrls[0], label: uploadedImageUrls.length > 1 ? `${uploadedImageUrls.length} invitation images` : uploadedImageUrls[0] },
        newValues: { imageUrls: uploadedImageUrls },
        metadata: { invitationCode: code, source: "client-live-editor" },
      });
    }
  }
  return NextResponse.json({ ok: true, updated });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  if (!(await isClientAllowed(request, code))) {
    if (request.headers.get("content-type")?.includes("application/json")) {
      return NextResponse.json({ error: "افتح لوحة الدعوة من رابط الإدارة السري أولاً." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/manage/invitation/invalid?reason=session", request.url), 303);
  }

  if (prisma) {
    const disabledCheck = await prisma.invitation.findFirst({ where: { code, deletedAt: null }, select: { disabledAt: true } });
    if (disabledCheck?.disabledAt) {
      if (request.headers.get("content-type")?.includes("application/json")) {
        return NextResponse.json({ error: "الدعوة معطلة من الإدارة ولا يمكن تعديلها." }, { status: 403 });
      }
      return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=disabled`, request.url), 303);
    }
  }

  if (request.headers.get("content-type")?.includes("application/json")) {
    return handleJsonUpdate(request, code);
  }

  const formData = await request.formData();
  if (!prisma) {
    console.error("[Client Invitation] PostgreSQL is not configured. Refusing operational write.");
    return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=database-error`, request.url), 303);
  }
  const oldValues = await getClientInvitationAuditSnapshot(code);
  const galleryImages = getInvitationGalleryEntries(formData);
  const savedGallery = await saveInvitationGalleryImages(galleryImages);
  if (galleryImages.length && !savedGallery.length) {
    console.error(`[Client Invitation] Image save failed for ${code}. Received ${galleryImages.length}, saved 0.`);
    return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=images-error`, request.url), 303);
  }
  if (savedGallery.length) {
  }

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
  const hasUploadedAudio = uploadedAudio instanceof File && uploadedAudio.size > 0;
  let currentMusicUrl = "";

  if (formData.has("musicUrl") || uploadedAudio instanceof File) {
    if (rawMusicUrl && isYouTubeUrl(rawMusicUrl)) {
      return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=music-error`, request.url), 303);
    }

    const existing = await prisma.invitation.findFirst({ where: { code, deletedAt: null }, select: { musicUrl: true } }).catch(() => null);
    currentMusicUrl = existing?.musicUrl || "";
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
    const formMapCoords = extractCoordinatesFromUrl(mapUrl);
    data.latitude = formMapCoords?.lat ?? null;
    data.longitude = formMapCoords?.lng ?? null;
  }
  if (formData.has("musicUrl") || uploadedAudio instanceof File) {
    const uploadedMusicUrl = await saveUploadedAudioFile(uploadedAudio instanceof File ? uploadedAudio : null, currentMusicUrl);
    const directMusicUrl = cleanPlayableAudioUrl(rawMusicUrl);
    const nextMusicUrl = uploadedMusicUrl || directMusicUrl || "";
    if (hasUploadedAudio && !uploadedMusicUrl) {
      return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=music-error`, request.url), 303);
    }
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

  try {
    if (Object.keys(data).length) {
      const result = await prisma.invitation.updateMany({ where: { code, deletedAt: null }, data });
      if (!result.count) throw new Error("Invitation is deleted or missing.");
      if (savedGallery.length) {
      }
    }
    revalidatePath(`/${code}`);
    revalidatePath(`/${code}/ad_3399`);
    await recordAuditLog({
      actor: getClientAuditActor(code),
      action: "invitation.update",
      entity: { type: "Invitation", id: code, label: code },
      oldValues,
      newValues: data,
      metadata: { source: "client-settings-form", storage: "database" },
    });
    if (savedGallery.length) {
      await recordAuditLog({
        actor: getClientAuditActor(code),
        action: "media.image.upload",
        entity: { type: "Media", id: savedGallery[0], label: savedGallery.length > 1 ? `${savedGallery.length} invitation images` : savedGallery[0] },
        newValues: { imageUrls: savedGallery },
        metadata: { invitationCode: code, source: "client-settings-form" },
      });
    }
    return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=1`, request.url), 303);
  } catch (error) {
    console.error("Failed to update database invitation from client admin", error);
    return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=database-error`, request.url), 303);
  }
}
