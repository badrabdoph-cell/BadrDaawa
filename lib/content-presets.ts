import { unstable_noStore as noStore } from "next/cache";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultInvitationTexts } from "./invitation-texts";
import type { ContentPreset, ContentPresetKind } from "./types";

const presetsPath = path.join(process.cwd(), "data", "content-presets.json");

type ContentPresetInput = {
  id?: unknown;
  kind?: unknown;
  title?: unknown;
  content?: unknown;
  secondaryContent?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const contentPresetKindLabels: Record<ContentPresetKind, string> = {
  opening: "افتتاحيات",
  welcome: "رسائل ترحيب",
  rsvp: "رسائل RSVP",
};

function nowIso() {
  return new Date().toISOString();
}

function seedPresets(): ContentPreset[] {
  const timestamp = nowIso();
  return [
    {
      id: "default-opening",
      kind: "opening",
      title: "افتتاحية كلاسيكية",
      content: defaultInvitationTexts.inviteMessage,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "default-welcome",
      kind: "welcome",
      title: "ترحيب قصير",
      content: defaultInvitationTexts.inviteMessageSecondary,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "default-rsvp",
      kind: "rsvp",
      title: "تأكيد حضور لطيف",
      content: defaultInvitationTexts.rsvpQuestion,
      secondaryContent: defaultInvitationTexts.rsvpDeclinedMessage,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

function normalizeKind(value: unknown): ContentPresetKind {
  return value === "welcome" || value === "rsvp" || value === "opening" ? value : "opening";
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizePreset(value: ContentPresetInput): ContentPreset | null {
  const title = cleanText(value.title, 120);
  const content = cleanText(value.content, 1400);
  if (!title || !content) return null;
  const timestamp = nowIso();
  return {
    id: cleanText(value.id, 80) || createPresetId(),
    kind: normalizeKind(value.kind),
    title,
    content,
    secondaryContent: cleanText(value.secondaryContent, 500) || undefined,
    createdAt: typeof value.createdAt === "string" && value.createdAt ? value.createdAt : timestamp,
    updatedAt: typeof value.updatedAt === "string" && value.updatedAt ? value.updatedAt : timestamp,
  };
}

function sortPresets(presets: ContentPreset[]) {
  const rank: Record<ContentPresetKind, number> = { opening: 0, welcome: 1, rsvp: 2 };
  return [...presets].sort((first, second) => rank[first.kind] - rank[second.kind] || second.updatedAt.localeCompare(first.updatedAt));
}

function createPresetId() {
  return `preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readPresetsRaw() {
  try {
    const raw = await readFile(presetsPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return seedPresets();
    const presets = parsed.map((item) => normalizePreset(item as ContentPresetInput)).filter(Boolean) as ContentPreset[];
    return presets.length ? sortPresets(presets) : seedPresets();
  } catch {
    return seedPresets();
  }
}

async function writePresets(presets: ContentPreset[]) {
  await mkdir(path.dirname(presetsPath), { recursive: true });
  await writeFile(presetsPath, `${JSON.stringify(sortPresets(presets), null, 2)}\n`, "utf8");
}

export async function getContentPresets() {
  noStore();
  return readPresetsRaw();
}

export async function createContentPreset(input: { kind: unknown; title: unknown; content: unknown; secondaryContent?: unknown }) {
  const preset = normalizePreset({
    id: createPresetId(),
    kind: normalizeKind(input.kind),
    title: input.title,
    content: input.content,
    secondaryContent: input.secondaryContent,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  if (!preset) return null;
  const presets = await readPresetsRaw();
  await writePresets([preset, ...presets]);
  return preset;
}

export async function updateContentPreset(id: string, input: { kind: unknown; title: unknown; content: unknown; secondaryContent?: unknown }) {
  const presets = await readPresetsRaw();
  const index = presets.findIndex((preset) => preset.id === id);
  if (index === -1) return null;
  const updated = normalizePreset({
    ...presets[index],
    kind: normalizeKind(input.kind),
    title: input.title,
    content: input.content,
    secondaryContent: input.secondaryContent,
    updatedAt: nowIso(),
  });
  if (!updated) return null;
  const next = presets.slice();
  next[index] = updated;
  await writePresets(next);
  return updated;
}

export async function deleteContentPreset(id: string) {
  const presets = await readPresetsRaw();
  const next = presets.filter((preset) => preset.id !== id);
  if (next.length === presets.length) return false;
  await writePresets(next);
  return true;
}
