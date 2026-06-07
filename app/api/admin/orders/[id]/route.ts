import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { cleanPlayableAudioUrl } from "@/lib/audio-files";
import { prisma } from "@/lib/db";
import { createFileInvitation, deleteFileOrder, getFileOrder, updateFileOrder } from "@/lib/file-store";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { isBrowserDisplayImageUrl } from "@/lib/image-formats";
import { hashPassword } from "@/lib/password";
import { buildInvitationBaseSlug, makeNumberedInvitationSlug } from "@/lib/slug";
import { getTemplateSortOrderWithSettings, getTemplateWithSettings } from "@/lib/template-settings";
import { getRedirectUrl, normalizeInternalAssetUrl } from "@/lib/utils";
import { validateOrderUpdate } from "@/lib/validation-enhanced";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const fallbackGallery = ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"];

type OrderConversionDraft = {
  groomName?: string;
  brideName?: string;
  phone?: string;
  weddingDate?: string;
  venue?: string;
  notes?: string;
  templateSlug?: string;
  imageUrls?: string[];
};

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectBack(request: NextRequest, status: string) {
  const url = getRedirectUrl("/admin/orders", request.headers, request.nextUrl.origin);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, 303);
}

function cleanDisplayImageUrl(value?: string | null) {
  const url = normalizeInternalAssetUrl(value);
  return url && isBrowserDisplayImageUrl(url) ? url : "";
}

function parseImageUrls(notes?: string | null) {
  if (!notes) return [];
  return Array.from(notes.matchAll(/https?:\/\/\S+|\/uploads\/[^\s]+/g))
    .map((match) => cleanDisplayImageUrl(match[0]))
    .filter(Boolean);
}

function parseMusicUrl(notes?: string | null) {
  if (!notes) return "";
  const directMatch = notes.match(/رابط الموسيقى:\s*(\S+)/);
  const candidates = directMatch ? [directMatch[1]] : Array.from(notes.matchAll(/https?:\/\/\S+|\/uploads\/music\/[^\s]+/g)).map((match) => match[0]);
  for (const candidate of candidates) {
    const clean = cleanPlayableAudioUrl(candidate);
    if (clean) return clean;
  }
  return "";
}

function parseStoredImageUrls(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => cleanDisplayImageUrl(typeof item === "string" ? item : "")).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parseStoredImageUrls(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getOrderDraftFromForm(formData: FormData): OrderConversionDraft {
  const notes = String(formData.get("notes") || "").trim();
  return {
    groomName: String(formData.get("groomName") || "").trim(),
    brideName: String(formData.get("brideName") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    weddingDate: String(formData.get("weddingDate") || "").trim(),
    venue: String(formData.get("venue") || "").trim(),
    notes,
    templateSlug: String(formData.get("templateSlug") || "").trim(),
    imageUrls: parseImageUrls(notes),
  };
}

function mergeImageUrls(...groups: Array<Array<string | undefined> | undefined>) {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const group of groups) {
    for (const item of group || []) {
      const url = cleanDisplayImageUrl(item);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
  }

  return urls.slice(0, 3);
}

async function getSafeTemplate(slug?: string | null) {
  return (slug ? await getTemplateWithSettings(slug) : null) || (await getTemplateWithSettings("royal-envelope"));
}

async function convertFileOrder(id: string, draft: OrderConversionDraft) {
  const order = await getFileOrder(id);
  if (!order) return null;
  const groomName = draft.groomName || order.groomName;
  const brideName = draft.brideName || order.brideName;
  const phone = draft.phone || order.phone || "";
  const weddingDate = draft.weddingDate || order.weddingDate;
  const venue = draft.venue || order.venue || "يحدد لاحقًا";
  const templateSlug = draft.templateSlug || order.templateSlug || "royal-envelope";
  const gallery = mergeImageUrls(draft.imageUrls, order.imageUrls, parseImageUrls(order.notes), parseImageUrls(draft.notes));
  const musicUrl = parseMusicUrl(draft.notes) || parseMusicUrl(order.notes);
  const digits = digitsOnly(phone);
  const username = `client_${digits || order.id.replace(/[^a-z0-9]/gi, "_").slice(0, 18)}`;
  const password = digits.slice(-6) || order.id.slice(-6) || "123456";
  const invitation = await createFileInvitation({
    baseSlug: buildInvitationBaseSlug(groomName, brideName),
    templateSlug,
    groomName,
    brideName,
    phone,
    username,
    password,
    weddingDate,
    weddingTime: "07:00 مساءً",
    venue,
    city: "",
    mapUrl: "",
    gallery: gallery.length ? gallery : fallbackGallery,
    musicUrl,
  });
  await updateFileOrder(id, { groomName, brideName, phone, weddingDate, venue, notes: draft.notes || order.notes, imageUrls: gallery, templateSlug, status: "converted" });
  return invitation.code;
}

async function convertPrismaOrder(id: string, draft: OrderConversionDraft) {
  if (!prisma) return null;
  const order = await prisma.orderRequest.findUnique({
    where: { id },
    include: { template: { select: { slug: true } } },
  });
  if (!order) return null;

  const groomName = draft.groomName || order.groomName;
  const brideName = draft.brideName || order.brideName;
  const phone = draft.phone || order.phone || "";
  const weddingDate = draft.weddingDate ? normalizeDate(draft.weddingDate) : order.weddingDate;
  const venue = draft.venue || order.venue || "يحدد لاحقًا";
  const notes = draft.notes ?? order.notes ?? "";
  const templateSlug = draft.templateSlug || order.template?.slug || "royal-envelope";
  const musicUrl = parseMusicUrl(notes) || parseMusicUrl(order.notes);
  const selectedTemplate = await getSafeTemplate(templateSlug);
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

  const baseSlug = buildInvitationBaseSlug(groomName, brideName);
  const existing = await prisma.invitation.findMany({ where: { code: { startsWith: baseSlug } }, select: { code: true } });
  const code = makeNumberedInvitationSlug(
    baseSlug,
      existing.map((item: { code: string }) => item.code),
  );
  const digits = digitsOnly(phone);
  const username = `client_${digits || order.id.replace(/[^a-z0-9]/gi, "_").slice(0, 18)}`;
  const password = digits.slice(-6) || order.id.slice(-6) || "123456";
  const gallery = mergeImageUrls(draft.imageUrls, parseStoredImageUrls(order.imageUrls), parseImageUrls(order.notes), parseImageUrls(notes));

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
      language: order.language,
      groomName,
      brideName,
      weddingDate,
      weddingTime: "07:00 مساءً",
      venue,
      city: "",
      mapUrl: "",
      heroPhoto: gallery[0] || fallbackGallery[0],
      gallery: gallery.length ? gallery : fallbackGallery,
      musicUrl: musicUrl || undefined,
      customerId: customer.id,
      templateId: template.id,
    },
  });

  await prisma.orderRequest.update({
    where: { id },
    data: {
      groomName,
      brideName,
      phone,
      weddingDate,
      venue,
      notes,
      imageUrls: gallery,
      status: "CONVERTED",
      customerId: customer.id,
      templateId: template.id,
    },
  });
  return code;
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const action = String(formData.get("action") || "");

  try {
    if (action === "delete") {
      if (prisma) await prisma.orderRequest.delete({ where: { id } }).catch(() => null);
      else await deleteFileOrder(id);

      try {
        revalidatePath("/admin/orders");
      } catch (error) {
        console.error("Failed to revalidate orders page", error);
      }

      queueGitHubSync(`Order deleted from admin: ${id}.`, { createSnapshot: true });
      return redirectBack(request, "deleted");
    }

    if (action === "accept" || action === "reject") {
      const status = action === "accept" ? "accepted" : "rejected";
      if (prisma) await prisma.orderRequest.update({ where: { id }, data: { status: status.toUpperCase() as "ACCEPTED" | "REJECTED" } }).catch(() => null);
      else await updateFileOrder(id, { status });

      try {
        revalidatePath("/admin/orders");
      } catch (error) {
        console.error("Failed to revalidate orders page", error);
      }

      queueGitHubSync(`Order ${status} from admin: ${id}.`, { createSnapshot: true });
      return redirectBack(request, status);
    }

    if (action === "convert") {
      const draft = getOrderDraftFromForm(formData);
      const validation = validateOrderUpdate({
        groomName: draft.groomName,
        brideName: draft.brideName,
        phone: draft.phone,
        weddingDate: draft.weddingDate,
        venue: draft.venue,
        notes: draft.notes,
        templateSlug: draft.templateSlug,
      });
      if (!validation.success) {
        return redirectBack(request, `error:${validation.error}`);
      }

      const code = prisma ? await convertPrismaOrder(id, draft) : await convertFileOrder(id, draft);
      if (code) {
        try {
          revalidatePath("/admin/orders");
          revalidatePath("/admin/client-invitations");
        } catch (error) {
          console.error("Failed to revalidate pages", error);
        }

        queueGitHubSync(`Order converted to invitation: ${code}.`, { createSnapshot: true });
      }
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

      const validation = validateOrderUpdate({ groomName, brideName, phone, weddingDate, venue, notes, templateSlug });
      if (!validation.success) {
        return redirectBack(request, `error:${validation.error}`);
      }

      if (!prisma) {
        const existing = await getFileOrder(id);
        await updateFileOrder(id, { groomName, brideName, phone, weddingDate, venue, notes, imageUrls: existing?.imageUrls || [], templateSlug });
        queueGitHubSync(`Order updated from admin: ${id}.`, { createSnapshot: true });
        return redirectBack(request, "updated");
      }

      const existingOrder = await prisma.orderRequest.findUnique({ where: { id }, select: { notes: true, imageUrls: true } });
      const existingImages = parseImageUrls(existingOrder?.notes);
      const storedImages = parseStoredImageUrls(existingOrder?.imageUrls);
      const nextImageUrls = mergeImageUrls(storedImages, existingImages, parseImageUrls(notes));
      const nextNotes =
        nextImageUrls.length && !nextImageUrls.every((url) => notes.includes(url))
          ? [notes, `صور الطلب:\n${nextImageUrls.map((url, index) => `${index + 1}. ${url}`).join("\n")}`].filter(Boolean).join("\n\n")
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
          imageUrls: nextImageUrls,
          ...(template ? { templateId: template.id } : {}),
        },
      });

      try {
        revalidatePath("/admin/orders");
      } catch (error) {
        console.error("Failed to revalidate orders page", error);
      }

      queueGitHubSync(`Order updated from admin: ${id}.`, { createSnapshot: true });
      return redirectBack(request, "updated");
    }

    return redirectBack(request, "unknown");
  } catch (error) {
    console.error("Failed to handle admin order action", { id, action, error });
    return redirectBack(request, "failed");
  }
}
