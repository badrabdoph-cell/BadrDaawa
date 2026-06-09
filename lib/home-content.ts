import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { unstable_noStore as noStore } from "next/cache";

export type HomeFeaturePoint = {
  id: string;
  text: string;
};

export type HomePricingRow = {
  id: string;
  feature: string;
  invitation: boolean;
  plus: boolean;
};

export type HomeContent = {
  hero: {
    kicker: string;
    mainTitle: string;
    accentTitle: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
  };
  features: {
    title: string;
    points: HomeFeaturePoint[];
  };
  preview: {
    eyebrow: string;
    title: string;
    badge: string;
    fullInviteCta: string;
    orderCta: string;
  };
  pricing: {
    eyebrow: string;
    title: string;
    invitationPlanName: string;
    invitationPrice: string;
    plusPlanName: string;
    plusPrice: string;
    rows: HomePricingRow[];
  };
};

const contentPath = path.join(process.cwd(), "data", "home-content.json");

export const defaultHomeContent: HomeContent = {
  hero: {
    kicker: "Forever Begins Here",
    mainTitle: "فرحتك تستاهل أكثر من مجرد دعوة 💍",
    accentTitle: "ودّع الورق والزحمه وصمّم دعوتك بطابعك الخاص",
    description: "كل قصة حب تستحق أن تُروى بطريقة مميزة ❤️",
    primaryCta: "ابدأ إنشاء دعوتك",
    secondaryCta: "شاهد التصاميم المختلفة",
  },
  features: {
    title: "مميزات دعوتك الرقمية",
    points: [
      { id: "rsvp-open", text: "تأكيد حضور الضيوف إلكترونيًا" },
      { id: "guest-records", text: "كشف كامل بأسماء وأرقام المسجلين للحضور" },
      { id: "client-admin", text: "لوحة تحكم خاصة بك" },
      { id: "reminder", text: "إرسال تذكير تلقائي بموعد الزفاف" },
      { id: "music", text: "إضافة أغاني أو موسيقى تشتغل تلقائي عند فتح الدعوة" },
      { id: "anytime-edit", text: "تعديل الدعوة بسهولة في أي وقت" },
      { id: "self-create", text: "صمّم دعوتك بنفسك" },
      { id: "support", text: "دعم فني متواصل" },
      { id: "send-message", text: "إرسال رسائل جماعية للمعازيم" },
      { id: "free-edit", text: "تعديل الدعوة بسهولة في أي وقت" },
      { id: "poll", text: "معرفة عدد الحضور المتوقع" },
      { id: "private-link", text: "رابط دعوة خاص بك ولوحة متابعة مباشرة" },
      { id: "tracking", text: "متابعة زيارات الدعوة وإحصائياتها لحظة بلحظة" },
    ],
  },
  preview: {
    eyebrow: "اختر استايلك الخاص ✨",
    title: "كل دعوة ليها شكل يحكي فرحتك",
    badge: "معاينة",
    fullInviteCta: "معاينة الدعوة كاملة",
    orderCta: "اختر هذا التصميم",
  },
  pricing: {
    eyebrow: "الباقات",
    title: "اختر الباقة المناسبة لك",
    invitationPlanName: "الباقة الأساسية",
    invitationPrice: "100 ج",
    plusPlanName: "الباقة المميزة",
    plusPrice: "300 ج",
    rows: [
      { id: "reminder", feature: "إرسال تذكير تلقائي بموعد الزفاف", invitation: false, plus: true },
      { id: "music", feature: "إضافة أغاني أو موسيقى من اختيارك تشتغل تلقائي عند فتح الدعوة", invitation: false, plus: true },
      { id: "anytime-edit", feature: "تعديل الدعوة بسهولة في أي وقت", invitation: false, plus: true },
      { id: "main-page", feature: "صفحة الدعوة الأساسية", invitation: true, plus: true },
      { id: "choose-design", feature: "اختيار التصميم", invitation: true, plus: true },
      { id: "comments", feature: "رسائل للعروسين", invitation: true, plus: true },
      { id: "rsvp-open", feature: "تأكيد حضور الضيوف إلكترونيًا", invitation: true, plus: true },
      { id: "client-admin", feature: "لوحة تحكم خاصة بك", invitation: true, plus: true },
      { id: "guest-records", feature: "كشف كامل بأسماء وأرقام المسجلين للحضور", invitation: true, plus: true },
      { id: "support", feature: "الدعم الفني", invitation: true, plus: true },
    ],
  },
};

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const text = value.trim();
  return text || fallback;
}

function normalizeFeaturePoints(value: unknown, fallback: HomeFeaturePoint[]) {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<string>();
  const normalized = fallback.map((item, index) => {
    const incoming = value.find((entry) => entry && typeof entry === "object" && "id" in entry && entry.id === item.id) || value[index];
    seen.add(item.id);
    return {
      id: item.id,
      text: cleanText((incoming as Partial<HomeFeaturePoint> | undefined)?.text, item.text),
    };
  });

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const point = entry as Partial<HomeFeaturePoint>;
    if (typeof point.id !== "string" || !point.id.trim() || seen.has(point.id)) continue;
    const text = cleanText(point.text, "");
    if (!text) continue;
    seen.add(point.id);
    normalized.push({ id: point.id.trim(), text });
  }

  return normalized;
}

function normalizePricingRows(value: unknown, fallback: HomePricingRow[]) {
  if (!Array.isArray(value)) return fallback;
  const seen = new Set<string>();
  const normalized = fallback.map((item, index) => {
    const incoming = value.find((entry) => entry && typeof entry === "object" && "id" in entry && entry.id === item.id) || value[index];
    seen.add(item.id);
    return {
      id: item.id,
      feature: cleanText((incoming as Partial<HomePricingRow> | undefined)?.feature, item.feature),
      invitation: typeof (incoming as Partial<HomePricingRow> | undefined)?.invitation === "boolean" ? Boolean((incoming as Partial<HomePricingRow>).invitation) : item.invitation,
      plus: typeof (incoming as Partial<HomePricingRow> | undefined)?.plus === "boolean" ? Boolean((incoming as Partial<HomePricingRow>).plus) : item.plus,
    };
  });

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<HomePricingRow>;
    if (typeof row.id !== "string" || !row.id.trim() || seen.has(row.id)) continue;
    const feature = cleanText(row.feature, "");
    if (!feature) continue;
    seen.add(row.id);
    normalized.push({
      id: row.id.trim(),
      feature,
      invitation: typeof row.invitation === "boolean" ? row.invitation : true,
      plus: typeof row.plus === "boolean" ? row.plus : true,
    });
  }

  return normalized;
}

function normalizeContent(input: Partial<HomeContent>): HomeContent {
  const fallback = defaultHomeContent;
  return {
    hero: {
      kicker: cleanText(input.hero?.kicker, fallback.hero.kicker),
      mainTitle: cleanText(input.hero?.mainTitle, fallback.hero.mainTitle),
      accentTitle: cleanText(input.hero?.accentTitle, fallback.hero.accentTitle),
      description: cleanText(input.hero?.description, fallback.hero.description),
      primaryCta: cleanText(input.hero?.primaryCta, fallback.hero.primaryCta),
      secondaryCta: cleanText(input.hero?.secondaryCta, fallback.hero.secondaryCta),
    },
    features: {
      title: cleanText(input.features?.title, fallback.features.title),
      points: normalizeFeaturePoints(input.features?.points, fallback.features.points),
    },
    preview: {
      eyebrow: cleanText(input.preview?.eyebrow, fallback.preview.eyebrow),
      title: cleanText(input.preview?.title, fallback.preview.title),
      badge: cleanText(input.preview?.badge, fallback.preview.badge),
      fullInviteCta: cleanText(input.preview?.fullInviteCta, fallback.preview.fullInviteCta),
      orderCta: cleanText(input.preview?.orderCta, fallback.preview.orderCta),
    },
    pricing: {
      eyebrow: cleanText(input.pricing?.eyebrow, fallback.pricing.eyebrow),
      title: cleanText(input.pricing?.title, fallback.pricing.title),
      invitationPlanName: cleanText(input.pricing?.invitationPlanName, fallback.pricing.invitationPlanName),
      invitationPrice: cleanText(input.pricing?.invitationPrice, fallback.pricing.invitationPrice),
      plusPlanName: cleanText(input.pricing?.plusPlanName, fallback.pricing.plusPlanName),
      plusPrice: cleanText(input.pricing?.plusPrice, fallback.pricing.plusPrice),
      rows: normalizePricingRows(input.pricing?.rows, fallback.pricing.rows),
    },
  };
}

async function readContentFile() {
  try {
    const raw = await readFile(contentPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Partial<HomeContent>) : {};
  } catch {
    return {};
  }
}

export async function getHomeContent() {
  noStore();
  return normalizeContent(await readContentFile());
}

export async function updateHomeContent(input: Partial<HomeContent>) {
  const next = normalizeContent(input);
  await mkdir(path.dirname(contentPath), { recursive: true });
  await writeFile(contentPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}
