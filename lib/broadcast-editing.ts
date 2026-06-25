export type BroadcastRegistryEntry = {
  id: string;
  title: string;
  text: string;
  href?: string;
  sourceLabel?: string;
  editable?: boolean;
};

export type BroadcastElementIdentity = {
  broadcastId?: string | null;
  text?: string | null;
};

export function normalizeBroadcastText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ");
}

export function matchBroadcastEntry(identity: BroadcastElementIdentity, entries: BroadcastRegistryEntry[]) {
  const broadcastId = identity.broadcastId?.trim();
  if (broadcastId) {
    return entries.find((entry) => entry.id === broadcastId) || null;
  }

  const text = normalizeBroadcastText(identity.text || "");
  if (!text || text.length < 2) return null;

  const matches = entries.filter((entry) => normalizeBroadcastText(entry.text) === text);
  return matches.length === 1 ? matches[0] : null;
}

function hashString(value: string) {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

export function createSiteTextOverrideId(path: string, originalText: string, occurrence = 0) {
  const cleanPath = path.split("#")[0].split("?")[0] || "/";
  const normalizedText = normalizeBroadcastText(originalText);
  return `site-text-overrides.${hashString(`${cleanPath}|${occurrence}|${normalizedText}`)}`;
}

export function getSiteTextOverrideStorageId(id: string) {
  return id.startsWith("site-text-overrides.") ? id.slice("site-text-overrides.".length) : id;
}
