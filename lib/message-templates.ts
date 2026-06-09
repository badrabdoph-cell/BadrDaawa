import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";
import type { MessageTemplate, MessageTemplateKind } from "./types";

const templatesPath = path.join(process.cwd(), "data", "message-templates.json");

type MessageTemplateInput = {
  id?: unknown;
  kind?: unknown;
  title?: unknown;
  content?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const messageTemplateKindLabels: Record<MessageTemplateKind, string> = {
  whatsapp: "رسائل واتساب",
  welcome: "رسائل ترحيب",
  reminder: "رسائل تذكير",
};

const kindRank: Record<MessageTemplateKind, number> = {
  whatsapp: 0,
  welcome: 1,
  reminder: 2,
};

function nowIso() {
  return new Date().toISOString();
}

function createTemplateId() {
  return `message-template-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeKind(value: unknown): MessageTemplateKind {
  return value === "welcome" || value === "reminder" || value === "whatsapp" ? value : "whatsapp";
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

function seedTemplates(): MessageTemplate[] {
  const timestamp = nowIso();
  return [
    {
      id: "default-whatsapp-invitation",
      kind: "whatsapp",
      title: "دعوة واتساب رسمية",
      content: "يسعدنا دعوتكم لحضور حفل زفاف {{groomName}} و {{brideName}}\nالتاريخ: {{date}}\nالقاعة: {{venue}}\nرابط الدعوة: {{link}}",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "default-welcome-message",
      kind: "welcome",
      title: "ترحيب داخل لوحة العميل",
      content: "أهلاً {{groomName}} و {{brideName}}، دعوتكم جاهزة ويمكنكم مشاركة الرابط مع الضيوف من هنا: {{link}}",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    {
      id: "default-reminder-message",
      kind: "reminder",
      title: "تذكير قبل الحفل",
      content: "تذكير لطيف بحفل زفاف {{groomName}} و {{brideName}} يوم {{date}} في {{venue}}.\nرابط الدعوة: {{link}}",
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

function normalizeTemplate(value: MessageTemplateInput): MessageTemplate | null {
  const title = cleanText(value.title, 120);
  const content = cleanText(value.content, 3000);
  if (!title || !content) return null;
  const timestamp = nowIso();
  return {
    id: cleanText(value.id, 100) || createTemplateId(),
    kind: normalizeKind(value.kind),
    title,
    content,
    createdAt: typeof value.createdAt === "string" && value.createdAt ? value.createdAt : timestamp,
    updatedAt: typeof value.updatedAt === "string" && value.updatedAt ? value.updatedAt : timestamp,
  };
}

function sortTemplates(templates: MessageTemplate[]) {
  return [...templates].sort((first, second) => kindRank[first.kind] - kindRank[second.kind] || second.updatedAt.localeCompare(first.updatedAt));
}

async function readTemplatesRaw() {
  try {
    const raw = await readFile(templatesPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return seedTemplates();
    const templates = parsed.map((item) => normalizeTemplate(item as MessageTemplateInput)).filter(Boolean) as MessageTemplate[];
    return templates.length ? sortTemplates(templates) : seedTemplates();
  } catch {
    return seedTemplates();
  }
}

async function writeTemplates(templates: MessageTemplate[]) {
  await mkdir(path.dirname(templatesPath), { recursive: true });
  await writeFile(templatesPath, `${JSON.stringify(sortTemplates(templates), null, 2)}\n`, "utf8");
}

export async function getMessageTemplates() {
  noStore();
  return readTemplatesRaw();
}

export async function createMessageTemplate(input: { kind: unknown; title: unknown; content: unknown }) {
  const template = normalizeTemplate({
    id: createTemplateId(),
    kind: input.kind,
    title: input.title,
    content: input.content,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  if (!template) return null;
  const templates = await readTemplatesRaw();
  await writeTemplates([template, ...templates]);
  return template;
}

export async function updateMessageTemplate(id: string, input: { kind: unknown; title: unknown; content: unknown }) {
  const templates = await readTemplatesRaw();
  const index = templates.findIndex((template) => template.id === id);
  if (index === -1) return null;
  const updated = normalizeTemplate({
    ...templates[index],
    kind: input.kind,
    title: input.title,
    content: input.content,
    updatedAt: nowIso(),
  });
  if (!updated) return null;
  const next = templates.slice();
  next[index] = updated;
  await writeTemplates(next);
  return updated;
}

export async function deleteMessageTemplate(id: string) {
  const templates = await readTemplatesRaw();
  const next = templates.filter((template) => template.id !== id);
  if (next.length === templates.length) return false;
  await writeTemplates(next);
  return true;
}
