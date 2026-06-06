import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { buildInvitationBaseSlug, makeNumberedInvitationSlug } from "@/lib/slug";
import { royalEnvelopeTemplate } from "@/lib/templates";
import { getTemplateSortOrderWithSettings, getTemplateWithSettings } from "@/lib/template-settings";
import { getPublicUrl } from "@/lib/utils";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getPublicUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
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
    .filter((value) => value.startsWith("data:image/jpeg") || value.startsWith("/"));
  const fallbackGallery = ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"];
  const gallery = galleryImages.length ? galleryImages : fallbackGallery;

  if (!groomName || !brideName || !phone || !username || !password || !weddingDate || !venue) {
    return NextResponse.redirect(new URL("/admin/invitations?error=missing", request.url), 303);
  }

  const baseSlug = buildInvitationBaseSlug(groomEnglish, brideEnglish);

  if (!prisma) {
    const code = makeNumberedInvitationSlug(baseSlug, []);
    return NextResponse.redirect(new URL(`/admin/invitations?created=${code}&demo=1`, request.url), 303);
  }

  const existing = await prisma.invitation.findMany({
    where: { code: { startsWith: baseSlug } },
    select: { code: true },
  });
  const code = makeNumberedInvitationSlug(
    baseSlug,
    existing.map((item) => item.code),
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
      weddingDate: new Date(weddingDate),
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

  return NextResponse.redirect(new URL(`/admin/invitations?created=${code}`, request.url), 303);
}
