import type { InvitationTexts } from "./types";
import { normalizeInternalAssetUrl } from "./utils";

export function cleanInvitationHeroVideoUrl(value: unknown) {
  const clean = typeof value === "string" ? normalizeInternalAssetUrl(value) || value.trim() : "";
  if (!clean) return "";
  if (clean.startsWith("/uploads/") && /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(clean)) return clean;
  if (!/^https?:\/\//i.test(clean)) return "";
  try {
    const url = new URL(clean);
    return /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i.test(url.pathname + url.search) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function invitationTextsWithHeroVideo(texts: InvitationTexts, heroVideoUrl: string): InvitationTexts {
  const raw = texts && typeof texts === "object" ? texts : {};
  const next = { ...raw };
  if (heroVideoUrl) {
    next.heroVideoUrl = heroVideoUrl;
  } else {
    delete next.heroVideoUrl;
  }
  return next;
}
