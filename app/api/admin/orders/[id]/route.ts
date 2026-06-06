import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { prisma } from "@/lib/db";
import { createFileInvitation, deleteFileOrder, getFileOrder, updateFileOrder } from "@/lib/file-store";
import { syncAdminStateToGitHub } from "@/lib/github-sync";
import { hashPassword } from "@/lib/password";
import { buildInvitationBaseSlug, makeNumberedInvitationSlug } from "@/lib/slug";
import { getTemplateSortOrderWithSettings, getTemplateWithSettings } from "@/lib/template-settings";
import { getPublicUrl } from "@/lib/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const fallbackGallery = ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"];

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectBack(request: NextRequest, status: string) {
  const url = new URL("/admin/orders", request.url);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, 303);
}

function parseImageUrls(notes?: string | null) {
  if (!notes) return [];
  return Array.from(notes.matchAll(/https?:\/\/\S+|\/uploads\/order-requests\/\S+/g)).map((match) => match[0].trim());
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

async function convertFileOrder(id: string) {
  const order = await getFileOrder(id);
  if (!order) return null;
  const gallery = order.imageUrls?.length ? order.imageUrls : parseImageUrls(order.notes);
  const digits = digitsOnly(order.phone);
  const username = `client_${digits || order.id.replace(/[^a-z0-9]/gi, "_").slice(0, 18)}`;
  const password = digits.slice(-6) || order.id.slice(-6) || "123456";
  const invitation = await createFileInvitation({
    baseSlug: buildInvitationBaseSlug(order.groomName, order.brideName),
    templateSlug: order.templateSlug,
    groomName: order.groomName,
    brideName: order.brideName,
    phone: order.phone,
    username,
    password,
    weddingDate: order.weddingDate,
    weddingTime: "07:00 مساءً",
    venue: order.venue || "يحدد لاحقًا",
    city: "",
    mapUrl: "",
    gallery: gallery.length ? gallery : fallbackGallery,
    musicUrl: "",
  });
  await updateFileOrder(id, { status: "converted" });
  return invitation.code;
}

async function convertPrismaOrder(id: string) {
  if (!prisma) return null;
  const order = await prisma.orderRequest.findUnique({
    where: { id },
    include: { template: { select: { slug: true } } },
  });
  if (!order) return null;

  const templateSlug = order.template?.slug || "royal-envelope";
  const selectedTemplate = await getTemplateWithSettings(templateSlug);
  if (!selectedTemplate) return null;

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

  const baseSlug = buildInvitationBaseSlug(order.groomName, order.brideName);
  const existing = await prisma.invitation.findMany({ where: { code: { startsWith: baseSlug } }, select: { code: true } });
  const code = makeNumberedInvitationSlug(
    baseSlug,
    existing.map((item) => item.code),
  );
  const digits = digitsOnly(order.phone);
  const username = `client_${digits || order.id.replace(/[^a-z0-9]/gi, "_").slice(0, 18)}`;
  const password = digits.slice(-6) || order.id.slice(-6) || "123456";
  const gallery = parseImageUrls(order.notes);

  const customer = await prisma.customer.upsert({
    where: { username },
    update: {
      name: `${order.groomName} و ${order.brideName}`,
      phone: order.phone,
      passwordHash: hashPassword(password),
      isActive: true,
    },
    create: {
      name: `${order.groomName} و ${order.brideName}`,
      phone: order.phone,
      username,
      passwordHash: hashPassword(password),
      isActive: true,
    },
  });

  await prisma.invitation.create({
    data: {
      code,
      status: "ACTIVE",
      language: order.language,
      groomName: order.groomName,
      brideName: order.brideName,
      weddingDate: order.weddingDate,
      weddingTime: "07:00 مساءً",
      venue: order.venue || "يحدد لاحقًا",
      city: "",
      mapUrl: "",
      heroPhoto: gallery[0] || fallbackGallery[0],
      gallery: gallery.length ? gallery : fallbackGallery,
      customerId: customer.id,
      templateId: template.id,
    },
  });

  await prisma.orderRequest.update({ where: { id }, data: { status: "CONVERTED", customerId: customer.id } });
  return code;
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getPublicUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const action = String(formData.get("action") || "");

  if (action === "delete") {
    if (prisma) await prisma.orderRequest.delete({ where: { id } }).catch(() => null);
    else await deleteFileOrder(id);
    await syncAdminStateToGitHub(`Order deleted from admin: ${id}.`, { createSnapshot: true });
    return redirectBack(request, "deleted");
  }

  if (action === "accept" || action === "reject") {
    const status = action === "accept" ? "accepted" : "rejected";
    if (prisma) await prisma.orderRequest.update({ where: { id }, data: { status: status.toUpperCase() as "ACCEPTED" | "REJECTED" } }).catch(() => null);
    else await updateFileOrder(id, { status });
    await syncAdminStateToGitHub(`Order ${status} from admin: ${id}.`, { createSnapshot: true });
    return redirectBack(request, status);
  }

  if (action === "convert") {
    const code = prisma ? await convertPrismaOrder(id) : await convertFileOrder(id);
    if (code) await syncAdminStateToGitHub(`Order converted to invitation: ${code}.`, { createSnapshot: true });
    return redirectBack(request, code ? `converted-${code}` : "missing");
  }

  if (action === "update") {
    const groomName = String(formData.get("groomName") || "").trim();
    const brideName = String(formData.get("brideName") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const weddingDate = String(formData.get("weddingDate") || "").trim();
    const venue = String(formData.get("venue") || "").trim();
    const notes = String(formData.get("notes") || "").trim();
    const templateSlug = String(formData.get("templateSlug") || "").trim();

    if (!groomName || !brideName || !weddingDate) return redirectBack(request, "missing");

    if (!prisma) {
      const existing = await getFileOrder(id);
      await updateFileOrder(id, { groomName, brideName, phone, weddingDate, venue, notes, imageUrls: existing?.imageUrls || [], templateSlug });
      await syncAdminStateToGitHub(`Order updated from admin: ${id}.`, { createSnapshot: true });
      return redirectBack(request, "updated");
    }

    const existingOrder = await prisma.orderRequest.findUnique({ where: { id }, select: { notes: true } });
    const existingImages = parseImageUrls(existingOrder?.notes);
    const nextNotes = existingImages.length && !existingImages.every((url) => notes.includes(url))
      ? [notes, `صور الطلب:\n${existingImages.map((url, index) => `${index + 1}. ${url}`).join("\n")}`].filter(Boolean).join("\n\n")
      : notes;

    const selectedTemplate = templateSlug ? await getTemplateWithSettings(templateSlug) : null;
    const template = selectedTemplate
      ? await prisma.weddingTemplate.upsert({
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
          select: { id: true },
        })
      : null;

    await prisma.orderRequest.update({
      where: { id },
      data: {
        groomName,
        brideName,
        phone,
        weddingDate: normalizeDate(weddingDate),
        venue,
        notes: nextNotes,
        ...(template ? { templateId: template.id } : {}),
      },
    });
    await syncAdminStateToGitHub(`Order updated from admin: ${id}.`, { createSnapshot: true });
    return redirectBack(request, "updated");
  }

  return redirectBack(request, "unknown");
}
