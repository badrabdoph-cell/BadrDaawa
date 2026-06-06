import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateFileInvitation } from "@/lib/file-store";

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
    .filter((value) => value.startsWith("data:image/jpeg") || value.startsWith("/"));

  const data: Record<string, unknown> = {};
  const groomName = String(formData.get("groomName") || "").trim();
  const brideName = String(formData.get("brideName") || "").trim();
  const weddingDate = String(formData.get("weddingDate") || "").trim();
  const weddingTime = String(formData.get("weddingTime") || "").trim();
  const venue = String(formData.get("venue") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const mapUrl = String(formData.get("mapUrl") || "").trim();
  const musicUrl = String(formData.get("musicUrl") || "").trim();

  if (groomName) data.groomName = groomName;
  if (brideName) data.brideName = brideName;
  if (weddingDate) data.weddingDate = prisma ? new Date(weddingDate) : weddingDate;
  if (weddingTime) data.weddingTime = weddingTime;
  if (venue) data.venue = venue;
  if (city) data.city = city;
  if (mapUrl) data.mapUrl = mapUrl;
  if (formData.has("musicUrl")) data.musicUrl = musicUrl;
  if (galleryImages.length) {
    data.gallery = galleryImages;
    data.heroPhoto = galleryImages[0];
  }

  if (prisma) {
    if (Object.keys(data).length) {
      await prisma.invitation.update({ where: { code }, data });
    }
  } else if (Object.keys(data).length) {
    await updateFileInvitation(code, data);
  }

  return NextResponse.redirect(new URL(`/${code}/ad_3399?saved=1`, request.url), 303);
}
