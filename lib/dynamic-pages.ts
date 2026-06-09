import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { writeJsonFileAtomic } from "./atomic-file";
import { prisma } from "./db";
import { getFileInvitations } from "./file-store";
import { normalizeCustomInvitationSlug } from "./slug";
import { getMetadataBaseUrl, getSiteUrl } from "./utils";

export type DynamicPage = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  coverImageUrl?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DynamicPageInput = {
  slug?: unknown;
  title?: unknown;
  description?: unknown;
  content?: unknown;
  coverImageUrl?: unknown;
  isPublished?: unknown;
};

type DynamicPagesStore = {
  pages: DynamicPage[];
};

type DynamicPageRow = Omit<Partial<DynamicPage>, "coverImageUrl" | "createdAt" | "updatedAt"> & {
  coverImageUrl?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
};

const storePath = path.join(process.cwd(), "data", "dynamic-pages.json");
const reservedDynamicPageSlugs = new Set([
  "admin",
  "api",
  "client",
  "client-invitations",
  "manage",
  "order",
  "pricing",
  "templates",
  "uploads",
  "_next",
]);

function toIso(value: Date | string | undefined) {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value) return value;
  return new Date().toISOString();
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanContent(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 50000) : "";
}

function cleanImageUrl(value: unknown) {
  const raw = cleanText(value, 1000);
  if (!raw) return "";
  if (raw.startsWith("/uploads/") || raw.startsWith("/assets/")) return raw;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizePage(row: DynamicPageRow): DynamicPage {
  const now = new Date().toISOString();
  return {
    id: String(row.id || `page_${Date.now().toString(36)}`),
    slug: normalizeCustomInvitationSlug(row.slug || ""),
    title: cleanText(row.title, 160) || "صفحة بدون عنوان",
    description: cleanText(row.description, 300),
    content: cleanContent(row.content),
    coverImageUrl: cleanImageUrl(row.coverImageUrl),
    isPublished: row.isPublished !== false,
    createdAt: toIso(row.createdAt || now),
    updatedAt: toIso(row.updatedAt || now),
  };
}

async function readStore(): Promise<DynamicPagesStore> {
  noStore();
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<DynamicPagesStore>;
    return { pages: Array.isArray(parsed.pages) ? parsed.pages.map(normalizePage).filter((page) => page.slug) : [] };
  } catch {
    return { pages: [] };
  }
}

async function writeStore(store: DynamicPagesStore) {
  await writeJsonFileAtomic(storePath, store);
}

export function normalizeDynamicPageSlug(value: unknown) {
  return normalizeCustomInvitationSlug(typeof value === "string" ? value : "");
}

export async function validateDynamicPageSlug(slugValue: unknown, currentId = "") {
  const slug = normalizeDynamicPageSlug(slugValue);
  if (!slug) return { slug: "", error: "اكتب رابط slug صالحاً بحروف إنجليزية أو أرقام." };
  if (slug.length < 2) return { slug, error: "الرابط يجب أن يكون حرفين على الأقل." };
  if (reservedDynamicPageSlugs.has(slug)) return { slug, error: "هذا الرابط محجوز داخل النظام." };

  const current = currentId.trim();
  if (prisma) {
    const [page, invitation] = await Promise.all([
      prisma.dynamicPage.findUnique({ where: { slug }, select: { id: true } }).catch(() => null),
      prisma.invitation.findFirst({ where: { deletedAt: null, OR: [{ code: slug }, { customSlug: slug }] }, select: { id: true } }).catch(() => null),
    ]);
    if (page && page.id !== current) return { slug, error: "يوجد صفحة أخرى بنفس الرابط." };
    if (invitation) return { slug, error: "هذا الرابط مستخدم في دعوة حالية." };
  }

  const [store, fileInvitations] = await Promise.all([readStore(), getFileInvitations().catch(() => [])]);
  if (store.pages.some((page) => page.slug === slug && page.id !== current)) return { slug, error: "يوجد صفحة أخرى بنفس الرابط." };
  if (fileInvitations.some((invitation) => invitation.code.toLowerCase() === slug || invitation.customSlug?.toLowerCase() === slug)) {
    return { slug, error: "هذا الرابط مستخدم في دعوة حالية." };
  }

  return { slug, error: "" };
}

export async function getDynamicPages() {
  noStore();
  if (prisma) {
    try {
      const pages = await prisma.dynamicPage.findMany({ orderBy: { updatedAt: "desc" } });
      return pages.map((page) => normalizePage(page));
    } catch (error) {
      console.error("Failed to load dynamic pages from database", error);
    }
  }
  return (await readStore()).pages.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getDynamicPageBySlug(slugValue: string, options: { includeHidden?: boolean } = {}) {
  noStore();
  const slug = normalizeDynamicPageSlug(slugValue);
  if (!slug) return null;
  if (prisma) {
    try {
      const page = await prisma.dynamicPage.findUnique({ where: { slug } });
      if (!page || (!options.includeHidden && !page.isPublished)) return null;
      return normalizePage(page);
    } catch (error) {
      console.error("Failed to load dynamic page from database", error);
    }
  }
  const page = (await readStore()).pages.find((item) => item.slug === slug);
  return page && (options.includeHidden || page.isPublished) ? page : null;
}

export async function upsertDynamicPage(input: DynamicPageInput & { id?: unknown }) {
  const id = cleanText(input.id, 120);
  const slugResult = await validateDynamicPageSlug(input.slug, id);
  if (slugResult.error) return { page: null, error: slugResult.error };

  const now = new Date().toISOString();
  const page = normalizePage({
    id: id || `page_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    slug: slugResult.slug,
    title: cleanText(input.title, 160),
    description: cleanText(input.description, 300),
    content: cleanContent(input.content),
    coverImageUrl: cleanImageUrl(input.coverImageUrl),
    isPublished: input.isPublished === "on" || input.isPublished === true || input.isPublished === "true",
    createdAt: now,
    updatedAt: now,
  });

  if (!page.title || !page.description || !page.content) {
    return { page: null, error: "العنوان والوصف والمحتوى مطلوبة." };
  }

  if (prisma) {
    try {
      const saved = id
        ? await prisma.dynamicPage.update({
            where: { id },
            data: {
              slug: page.slug,
              title: page.title,
              description: page.description,
              content: page.content,
              coverImageUrl: page.coverImageUrl || null,
              isPublished: page.isPublished,
            },
          })
        : await prisma.dynamicPage.create({
            data: {
              slug: page.slug,
              title: page.title,
              description: page.description,
              content: page.content,
              coverImageUrl: page.coverImageUrl || null,
              isPublished: page.isPublished,
            },
          });
      return { page: normalizePage(saved), error: "" };
    } catch (error) {
      console.error("Failed to save dynamic page in database", error);
    }
  }

  const store = await readStore();
  const existingIndex = id ? store.pages.findIndex((item) => item.id === id) : -1;
  if (existingIndex >= 0) {
    store.pages[existingIndex] = { ...page, id, createdAt: store.pages[existingIndex].createdAt, updatedAt: now };
  } else {
    store.pages.unshift(page);
  }
  await writeStore(store);
  return { page: existingIndex >= 0 ? store.pages[existingIndex] : page, error: "" };
}

export async function setDynamicPagePublished(id: string, isPublished: boolean) {
  if (prisma) {
    try {
      const page = await prisma.dynamicPage.update({ where: { id }, data: { isPublished } });
      return normalizePage(page);
    } catch (error) {
      console.error("Failed to toggle dynamic page", error);
    }
  }
  const store = await readStore();
  const index = store.pages.findIndex((page) => page.id === id);
  if (index < 0) return null;
  store.pages[index] = { ...store.pages[index], isPublished, updatedAt: new Date().toISOString() };
  await writeStore(store);
  return store.pages[index];
}

export async function deleteDynamicPage(id: string) {
  if (prisma) {
    try {
      const page = await prisma.dynamicPage.delete({ where: { id } });
      return normalizePage(page);
    } catch (error) {
      console.error("Failed to delete dynamic page", error);
    }
  }
  const store = await readStore();
  const page = store.pages.find((item) => item.id === id) || null;
  store.pages = store.pages.filter((item) => item.id !== id);
  await writeStore(store);
  return page;
}

export function getDynamicPageMetadata(page: DynamicPage): Metadata {
  const url = `${getSiteUrl().replace(/\/$/, "")}/${page.slug}`;
  const image = page.coverImageUrl ? new URL(page.coverImageUrl, `${getSiteUrl().replace(/\/$/, "")}/`).toString() : undefined;
  return {
    metadataBase: getMetadataBaseUrl(),
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    robots: page.isPublished ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      type: "article",
      locale: "ar_EG",
      images: image ? [{ url: image, width: 1200, height: 630, alt: page.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: page.title,
      description: page.description,
      images: image ? [image] : undefined,
    },
  };
}
