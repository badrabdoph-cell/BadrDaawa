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
    kicker: "هنا تبدأ الحكاية ❤️",
    mainTitle: "دعوة تليق بأجمل يوم في حياتكم ✨",
    accentTitle: "ودّع الورق والزحمه وصمّم دعوتك بطابعك الخاص",
    description: "شاركوا لحظاتكم الجميلة مع أحبائكم بطريقه حديثه",
    primaryCta: "ابدأ تصميم دعوتك",
    secondaryCta: "استعرض التصاميم",
  },
  features: {
    title: "كل ما تحتاجه دعوتك في مكان واحد",
    points: [
      { id: "rsvp-open", text: "إدارة الحضور" },
      { id: "guest-records", text: "كشف كامل بأسماء وأرقام المسجلين للحضور" },
      { id: "client-admin", text: "لوحة تحكم خاصة بك" },
      { id: "reminder", text: "إرسال تذكير تلقائي بموعد الزفاف" },
      { id: "music", text: "أضف الموسيقى التي تحبها للدعوة" },
      { id: "anytime-edit", text: "عدّل دعوتك وقتما تشاء" },
      { id: "self-create", text: "تحكم كامل في تفاصيل دعوتك" },
      { id: "support", text: "دعم ومساعدة عند الحاجة" },
      { id: "send-message", text: "إرسال رسائل للضيوف بضغطة واحدة" },
      { id: "free-edit", text: "عدّل دعوتك وقتما تشاء" },
      { id: "poll", text: "معرفة عدد الحضور المتوقع بدقة" },
      { id: "private-link", text: "رابط خاص لمشاركة دعوتك بسهولة" },
      { id: "tracking", text: "اعرف من شاهد دعوتك ومتى" },
    ],
  },
  preview: {
    eyebrow: "اختر التصميم الأقرب لذوقك ✨",
    title: "كل تصميم يحكي قصة مختلفة",
    badge: "معاينة",
    fullInviteCta: "معاينة الدعوة كاملة",
    orderCta: "استخدم هذا التصميم",
  },
  pricing: {
    eyebrow: "الأسعار والباقات",
    title: "اختر ما يناسب احتياجك",
    invitationPlanName: "الباقة الأساسية",
    invitationPrice: "100 ج",
    plusPlanName: "الباقة الكاملة",
    plusPrice: "300 ج",
    rows: [
      { id: "reminder", feature: "إرسال تذكير تلقائي بموعد الزفاف", invitation: false, plus: true },
      { id: "music", feature: "أضف الموسيقى التي تحبها للدعوة", invitation: false, plus: true },
      { id: "anytime-edit", feature: "عدّل دعوتك وقتما تشاء", invitation: false, plus: true },
      { id: "main-page", feature: "صفحة الدعوة الأساسية", invitation: true, plus: true },
      { id: "choose-design", feature: "اختيار التصميم", invitation: true, plus: true },
      { id: "comments", feature: "كلمات وذكريات للعرسان ❤️", invitation: true, plus: true },
      { id: "rsvp-open", feature: "إدارة الحضور", invitation: true, plus: true },
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
