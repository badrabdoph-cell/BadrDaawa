import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { prisma } from "@/lib/db";
import { createFileInvitation } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { fallbackInvitationGallery, saveInvitationGalleryImages } from "@/lib/invitation-images";
import { hashPassword } from "@/lib/password";
import { buildInvitationBaseSlug, makeNumberedInvitationSlug } from "@/lib/slug";
import { royalEnvelopeTemplate } from "@/lib/templates";
import { getTemplateSortOrderWithSettings, getTemplateWithSettings } from "@/lib/template-settings";
import { getRedirectUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const groomName = String(formData.get("groomName") || "").trim();
  const brideName = String(formData.get("brideName") || "").trim();
  const groomEnglish = String(formData.get("groomEnglish") || groomName).trim();
  const brideEnglish = String(formData.get("brideEnglish") || brideName).trim();
  const phone = String(formData.get("phone") || "").trim();
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "").trim();
  const weddingDate = String(formData.get("weddingDate") || "").trim();
  const weddingTime = String(formData.get("weddingTime") || "07:00 مساءً").trim();
  const venue = String(formData.get("venue") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const mapUrl = String(formData.get("mapUrl") || "").trim();
  const musicUrl = String(formData.get("musicUrl") || "").trim();
  const templateSlug = String(formData.get("templateSlug") || royalEnvelopeTemplate.slug).trim();
  const selectedTemplate = (await getTemplateWithSettings(templateSlug)) || royalEnvelopeTemplate;
  const galleryImages = formData
    .getAll("galleryImage")
    .map((value) => String(value))
    .filter((value) => value.startsWith("data:image/") || value.startsWith("/") || value.startsWith("http://") || value.startsWith("https://"));

  const parsedWeddingDate = new Date(weddingDate);
  if (!groomName || !brideName || !phone || !username || !password || !weddingDate || Number.isNaN(parsedWeddingDate.getTime()) || !venue) {
    return NextResponse.redirect(getRedirectUrl("/admin/client-invitations?error=missing", request.headers, request.nextUrl.origin), 303);
  }

  const savedGallery = await saveInvitationGalleryImages(galleryImages);
  const gallery = savedGallery.length ? savedGallery : fallbackInvitationGallery;
  const baseSlug = buildInvitationBaseSlug(groomEnglish, brideEnglish);

  async function createFallbackInvitation() {
    const invitation = await createFileInvitation({
      baseSlug,
      templateSlug: selectedTemplate.slug,
      groomName,
      brideName,
      phone,
      username,
      password,
      weddingDate,
      weddingTime,
      venue,
      city,
      mapUrl,
      gallery,
      musicUrl,
    });
    queueGitHubSync(`Client invitation created: ${invitation.code}.`, { createSnapshot: true });
    return NextResponse.redirect(getRedirectUrl(`/admin/client-invitations?created=${invitation.code}&demo=1`, request.headers, request.nextUrl.origin), 303);
  }

  if (!prisma) {
    return createFallbackInvitation();
  }

  try {
    const existing = await prisma.invitation.findMany({
      where: { code: { startsWith: baseSlug } },
      select: { code: true },
    });
    const code = makeNumberedInvitationSlug(
      baseSlug,
      existing.map((item: { code: string }) => item.code),
    );

    const template = await prisma.weddingTemplate.upsert({
      where: { slug: selectedTemplate.slug },
      update: {
        name: selectedTemplate.name,
        arabicName: selectedTemplate.arabicName,
        category: selectedTemplate.category,
        style: selectedTemplate.style,
        concept: selectedTemplate.concept,
        opening: selectedTemplate.opening,
        layout: selectedTemplate.layout,
        typography: selectedTemplate.typography,
        palette: selectedTemplate.palette,
        previewUrl: selectedTemplate.previewImage,
        enabled: selectedTemplate.enabled,
        sortOrder: await getTemplateSortOrderWithSettings(selectedTemplate.slug),
      },
      create: {
        slug: selectedTemplate.slug,
        name: selectedTemplate.name,
        arabicName: selectedTemplate.arabicName,
        category: selectedTemplate.category,
        style: selectedTemplate.style,
        concept: selectedTemplate.concept,
        opening: selectedTemplate.opening,
        layout: selectedTemplate.layout,
        typography: selectedTemplate.typography,
        palette: selectedTemplate.palette,
        previewUrl: selectedTemplate.previewImage,
        enabled: selectedTemplate.enabled,
        sortOrder: await getTemplateSortOrderWithSettings(selectedTemplate.slug),
      },
    });

    const customer = await prisma.customer.upsert({
      where: { username },
      update: {
        name: `${groomName} و ${brideName}`,
        phone,
        passwordHash: hashPassword(password),
        isActive: true,
      },
      create: {
        name: `${groomName} و ${brideName}`,
        phone,
        username,
        passwordHash: hashPassword(password),
        isActive: true,
      },
    });

    await prisma.invitation.create({
      data: {
        code,
        status: "ACTIVE",
        language: "ar",
        groomName,
        brideName,
        weddingDate: parsedWeddingDate,
        weddingTime,
        venue,
        city,
        mapUrl,
        heroPhoto: gallery[0],
        gallery,
        musicUrl,
        customerId: customer.id,
        templateId: template.id,
      },
    });

    queueGitHubSync(`Client invitation created: ${code}.`, { createSnapshot: true });
    return NextResponse.redirect(getRedirectUrl(`/admin/client-invitations?created=${code}`, request.headers, request.nextUrl.origin), 303);
  } catch (error) {
    console.error("Failed to create database invitation, falling back to file store", error);
    return createFallbackInvitation();
  }
}
