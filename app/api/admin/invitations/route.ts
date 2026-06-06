import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { buildInvitationBaseSlug, makeNumberedInvitationSlug } from "@/lib/slug";
import { royalEnvelopeTemplate } from "@/lib/templates";

function isAdmin(request: NextRequest) {
  const expected = process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || "badrdaawa-admin-local";
  return request.cookies.get("bd_admin_session")?.value === expected;
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.redirect(new URL("/admin/login", request.url), 303);
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
    where: { slug: royalEnvelopeTemplate.slug },
    update: {
      name: royalEnvelopeTemplate.name,
      arabicName: royalEnvelopeTemplate.arabicName,
      category: royalEnvelopeTemplate.category,
      style: royalEnvelopeTemplate.style,
      concept: royalEnvelopeTemplate.concept,
      opening: royalEnvelopeTemplate.opening,
      layout: royalEnvelopeTemplate.layout,
      typography: royalEnvelopeTemplate.typography,
      palette: royalEnvelopeTemplate.palette,
      previewUrl: royalEnvelopeTemplate.previewImage,
      enabled: true,
      sortOrder: 1,
    },
    create: {
      slug: royalEnvelopeTemplate.slug,
      name: royalEnvelopeTemplate.name,
      arabicName: royalEnvelopeTemplate.arabicName,
      category: royalEnvelopeTemplate.category,
      style: royalEnvelopeTemplate.style,
      concept: royalEnvelopeTemplate.concept,
      opening: royalEnvelopeTemplate.opening,
      layout: royalEnvelopeTemplate.layout,
      typography: royalEnvelopeTemplate.typography,
      palette: royalEnvelopeTemplate.palette,
      previewUrl: royalEnvelopeTemplate.previewImage,
      enabled: true,
      sortOrder: 1,
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
      heroPhoto: "/assets/invite/badr-sarah-1.jpeg",
      gallery: ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"],
      customerId: customer.id,
      templateId: template.id,
    },
  });

  return NextResponse.redirect(new URL(`/admin/invitations?created=${code}`, request.url), 303);
}
