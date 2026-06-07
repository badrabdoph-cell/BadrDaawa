import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateFileInvitation } from "@/lib/file-store";
import { saveInvitationGalleryImages } from "@/lib/invitation-images";

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
  const galleryImages = formData
    .getAll("galleryImage")
    .map((value) => String(value))
    .filter((value) => value.startsWith("data:image/") || value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://"));
  const savedGallery = await saveInvitationGalleryImages(galleryImages, request.headers, request.nextUrl.origin);

  const data: Record<string, unknown> = {};
  const fileData: Record<string, unknown> = {};
  const groomName = String(formData.get("groomName") || "").trim();
  const brideName = String(formData.get("brideName") || "").trim();
  const weddingDate = String(formData.get("weddingDate") || "").trim();
  const weddingTime = String(formData.get("weddingTime") || "").trim();
  const venue = String(formData.get("venue") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const mapUrl = String(formData.get("mapUrl") || "").trim();
  const musicUrl = String(formData.get("musicUrl") || "").trim();

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
  if (formData.has("musicUrl")) {
    data.musicUrl = musicUrl;
    fileData.musicUrl = musicUrl;
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
