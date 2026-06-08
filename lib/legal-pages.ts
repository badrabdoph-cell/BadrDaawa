import { unstable_noStore as noStore } from "next/cache";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type LegalPageSlug = "privacy-policy" | "terms" | "refund-policy" | "usage-policy";

export type LegalPageContent = {
  slug: LegalPageSlug;
  title: string;
  description: string;
  content: string;
  updatedAt: string;
};

type LegalPageInput = {
  title?: unknown;
  description?: unknown;
  content?: unknown;
  updatedAt?: unknown;
};

export const legalPageSlugs: LegalPageSlug[] = ["privacy-policy", "terms", "refund-policy", "usage-policy"];

const legalPagesPath = path.join(process.cwd(), "data", "legal-pages.json");

const defaultLegalPages: Record<LegalPageSlug, LegalPageContent> = {
  "privacy-policy": {
    slug: "privacy-policy",
    title: "سياسة الخصوصية",
    description: "كيف يتم التعامل مع بيانات العملاء وضيوف الدعوات داخل BadrDaawa.",
    content:
      "نحترم خصوصيتك ونستخدم البيانات التي تقدمها فقط لتجهيز الدعوة الرقمية وتشغيل خدماتها.\n\nقد تشمل البيانات أسماء العروسين، بيانات المناسبة، الصور، أرقام التواصل، وردود الحضور.\n\nلا نبيع بياناتك لأي طرف ثالث. قد نستخدم مزودي خدمة موثوقين لتشغيل الاستضافة أو التخزين أو التحليلات اللازمة لتقديم الخدمة.\n\nيمكنك طلب تعديل أو حذف بياناتك من خلال التواصل معنا.",
    updatedAt: "",
  },
  terms: {
    slug: "terms",
    title: "الشروط والأحكام",
    description: "القواعد العامة لاستخدام خدمات الدعوات الرقمية.",
    content:
      "باستخدامك لخدمات BadrDaawa فأنت توافق على هذه الشروط.\n\nيلتزم العميل بتقديم بيانات صحيحة ومحتوى يملك حق استخدامه، بما في ذلك الصور والملفات الصوتية.\n\nنحتفظ بالحق في رفض أي محتوى مخالف أو غير مناسب.\n\nيتم تسليم الخدمة حسب الباقة والاتفاق المعلن وقت الطلب.",
    updatedAt: "",
  },
  "refund-policy": {
    slug: "refund-policy",
    title: "سياسة الاسترجاع",
    description: "آلية طلب الاسترجاع أو التعديل على الطلبات.",
    content:
      "تختلف إمكانية الاسترجاع حسب حالة تنفيذ الطلب.\n\nقبل بدء تنفيذ الدعوة يمكن للعميل طلب الإلغاء أو تغيير تفاصيل الطلب.\n\nبعد تجهيز الدعوة أو نشرها، يتم التعامل مع الطلب كخدمة رقمية منفذة، وقد تكون الاسترجاعات محدودة حسب الحالة.\n\nنلتزم بمراجعة أي مشكلة تشغيلية أو خطأ واضح والعمل على إصلاحه.",
    updatedAt: "",
  },
  "usage-policy": {
    slug: "usage-policy",
    title: "سياسة الاستخدام",
    description: "الاستخدام المقبول للدعوات والروابط والملفات المرفوعة.",
    content:
      "يجب استخدام الدعوات الرقمية لأغراض مناسبة وقانونية.\n\nلا يسمح برفع محتوى ينتهك حقوق الآخرين أو يحتوي على إساءة أو مواد غير قانونية.\n\nلا يجوز محاولة تعطيل الخدمة أو إساءة استخدام الروابط أو نماذج RSVP.\n\nقد يتم إيقاف أي دعوة تخالف هذه السياسة إلى حين مراجعة الحالة.",
    updatedAt: "",
  },
};

function cleanText(value: unknown, fallback: string, maxLength: number) {
  const text = typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  return text || fallback;
}

function normalizePage(slug: LegalPageSlug, input: LegalPageInput | undefined): LegalPageContent {
  const fallback = defaultLegalPages[slug];
  return {
    slug,
    title: cleanText(input?.title, fallback.title, 120),
    description: cleanText(input?.description, fallback.description, 240),
    content: cleanText(input?.content, fallback.content, 10000),
    updatedAt: typeof input?.updatedAt === "string" ? input.updatedAt : fallback.updatedAt,
  };
}

async function readLegalPagesFile() {
  try {
    const raw = await readFile(legalPagesPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    const source = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Partial<Record<LegalPageSlug, Partial<LegalPageContent>>>) : {};
    return Object.fromEntries(legalPageSlugs.map((slug) => [slug, normalizePage(slug, source[slug])])) as Record<LegalPageSlug, LegalPageContent>;
  } catch {
    return defaultLegalPages;
  }
}

async function writeLegalPages(pages: Record<LegalPageSlug, LegalPageContent>) {
  await mkdir(path.dirname(legalPagesPath), { recursive: true });
  await writeFile(legalPagesPath, `${JSON.stringify(pages, null, 2)}\n`, "utf8");
}

export async function getLegalPages() {
  noStore();
  return readLegalPagesFile();
}

export async function getLegalPage(slug: LegalPageSlug) {
  noStore();
  const pages = await readLegalPagesFile();
  return pages[slug];
}

export async function updateLegalPage(slug: LegalPageSlug, input: { title?: unknown; description?: unknown; content?: unknown }) {
  const pages = await readLegalPagesFile();
  pages[slug] = normalizePage(slug, {
    title: input.title,
    description: input.description,
    content: input.content,
    updatedAt: new Date().toISOString(),
  });
  await writeLegalPages(pages);
  return pages[slug];
}

export function isLegalPageSlug(value: string): value is LegalPageSlug {
  return legalPageSlugs.includes(value as LegalPageSlug);
}
