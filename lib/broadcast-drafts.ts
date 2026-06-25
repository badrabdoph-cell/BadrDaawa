export type BroadcastDraftMap = Record<string, string>;

export type BroadcastDraftEntry = {
  id: string;
  text: string;
};

export function updateBroadcastDraft(
  drafts: BroadcastDraftMap,
  id: string,
  value: string,
  originalValue: string,
): BroadcastDraftMap {
  const next = { ...drafts };
  if (value === originalValue) {
    delete next[id];
  } else {
    next[id] = value;
  }
  return next;
}

export function getBroadcastDraftValue(entry: BroadcastDraftEntry | null, drafts: BroadcastDraftMap) {
  if (!entry) return "";
  return Object.prototype.hasOwnProperty.call(drafts, entry.id) ? drafts[entry.id] : entry.text;
}

export function collectDirtyBroadcastDrafts(entries: BroadcastDraftEntry[], drafts: BroadcastDraftMap) {
  const entryById = new Map(entries.map((entry) => [entry.id, entry]));
  return Object.entries(drafts)
    .filter(([id, value]) => {
      const entry = entryById.get(id);
      return entry && value !== entry.text;
    })
    .map(([id, value]) => ({ id, value }));
}
