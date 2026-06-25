import { readDraftContent, readPublishedContent, writeDraftContent } from "./project-content-store";
import { createSiteTextOverrideId, getSiteTextOverrideStorageId } from "./broadcast-editing";

export type SiteTextOverride = {
  id: string;
  path: string;
  originalText: string;
  text: string;
  occurrence: number;
  updatedAt: string;
};

export type SiteTextOverrides = Record<string, SiteTextOverride>;

export const defaultSiteTextOverrides: SiteTextOverrides = {};

function normalizeOverrides(value: unknown): SiteTextOverrides {
  if (!value || typeof value !== "object") return defaultSiteTextOverrides;
  const result: SiteTextOverrides = {};
  for (const [id, raw] of Object.entries(value as Record<string, unknown>)) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as Partial<SiteTextOverride>;
    if (typeof item.id !== "string" || item.id !== id) continue;
    if (typeof item.path !== "string" || typeof item.originalText !== "string" || typeof item.text !== "string") continue;
    result[id] = {
      id,
      path: item.path,
      originalText: item.originalText,
      text: item.text,
      occurrence: Number.isInteger(item.occurrence) ? item.occurrence as number : 0,
      updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : new Date(0).toISOString(),
    };
  }
  return result;
}

export { createSiteTextOverrideId, getSiteTextOverrideStorageId };

export async function getDraftSiteTextOverrides() {
  return readDraftContent("site-text-overrides", defaultSiteTextOverrides, normalizeOverrides);
}

export async function getPublishedSiteTextOverrides() {
  return readPublishedContent("site-text-overrides", defaultSiteTextOverrides, normalizeOverrides);
}

export async function updateSiteTextOverrideDraft(input: {
  id: string;
  path: string;
  originalText: string;
  text: string;
  occurrence?: number;
}) {
  const current = await getDraftSiteTextOverrides();
  const storageId = getSiteTextOverrideStorageId(input.id);
  const next: SiteTextOverrides = {
    ...current,
    [storageId]: {
      id: storageId,
      path: input.path,
      originalText: input.originalText,
      text: input.text,
      occurrence: input.occurrence ?? current[storageId]?.occurrence ?? 0,
      updatedAt: new Date().toISOString(),
    },
  };
  await writeDraftContent("site-text-overrides", next);
  return next[storageId];
}
