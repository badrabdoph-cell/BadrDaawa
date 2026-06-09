import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { getDynamicPages } from "@/lib/dynamic-pages";
import { getFileInvitations } from "@/lib/file-store";
import { getSiteUrl } from "@/lib/utils";

function absoluteUrl(path: string) {
  return `${getSiteUrl().replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/templates"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/pricing"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/order"), lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/faq"), lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/privacy-policy"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/refund-policy"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/usage-policy"), lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const [dynamicPages, fileInvitations] = await Promise.all([getDynamicPages().catch(() => []), getFileInvitations().catch(() => [])]);
  for (const page of dynamicPages) {
    if (!page.isPublished) continue;
    routes.push({
      url: absoluteUrl(`/${page.slug}`),
      lastModified: new Date(page.updatedAt),
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  if (prisma) {
    const invitations = await prisma.invitation
      .findMany({
        where: { deletedAt: null, status: "ACTIVE" },
        select: { code: true, customSlug: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 1000,
      })
      .catch(() => []);

    for (const invitation of invitations) {
      routes.push({
        url: absoluteUrl(`/${invitation.customSlug || invitation.code}`),
        lastModified: invitation.updatedAt,
        changeFrequency: "weekly",
        priority: 0.4,
      });
    }
  }

  for (const invitation of fileInvitations) {
    if (!invitation.isActive) continue;
    routes.push({
      url: absoluteUrl(`/${invitation.customSlug || invitation.code}`),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.4,
    });
  }

  const seen = new Set<string>();
  return routes.filter((route) => {
    if (seen.has(route.url)) return false;
    seen.add(route.url);
    return true;
  });
}
