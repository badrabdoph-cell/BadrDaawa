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
    mainTitle: "دعوة فرحك",
    accentTitle: "بشكل كريتف وترندي",
    description: "حابب تعمل دعايه لنفسك والمعازيم تعرفك قبل ما الفرح يبدأ أصلًا؟",
    primaryCta: "طلب دعوه",
    secondaryCta: "شوف الاشكال والافكار",
  },
  features: {
    title: "المميزات ال هتتقدملك",
    points: [
      { id: "rsvp-open", text: "مفتوح تسجيلات الحضور" },
      { id: "guest-records", text: "الحصول على سجلات الحضور بالأسماء وأرقام الهواتف" },
      { id: "client-admin", text: "بيدج أدمن خاصة بيك" },
      { id: "reminder", text: "إشعار تذكير بموعد الفرح للمسجلين حضور" },
      { id: "music", text: "إضافة أغاني أو موسيقى تشتغل تلقائي عند فتح الدعوة" },
      { id: "anytime-edit", text: "إمكانية التعديل على التصميم في أي وقت" },
      { id: "self-create", text: "انشئ دعوة زفافك بنفسك" },
      { id: "support", text: "متابعة حالة الدعم 24/7" },
      { id: "send-message", text: "تقدر تبعت رسالة لكل اللي حضر الدعوة" },
      { id: "free-edit", text: "تقدر تعدل براحتك في دعوتك" },
      { id: "poll", text: "استفتاء مين هيحضر ومين لا" },
      { id: "private-link", text: "رابط خاص بيك + رابط متابعة + قائمة بتتحدث فوري" },
      { id: "tracking", text: "تعرف مين دخل الدعوة وتتابع الحضور أول بأول" },
    ],
  },
  preview: {
    eyebrow: "اختر استايلك الخاص ✨",
    title: "كل دعوة ليها شكل يحكي فرحتك",
    badge: "معاينة",
    fullInviteCta: "افتح الدعوة كاملة",
    orderCta: "عايز واحد زيه",
  },
  pricing: {
    eyebrow: "الباقات",
    title: "اختار المناسب لفرحك",
    invitationPlanName: "باقة الدعوة فقط",
    invitationPrice: "100 ج",
    plusPlanName: "باقة الدعوة بلس",
    plusPrice: "300 ج",
    rows: [
      { id: "reminder", feature: "إشعار تذكير بموعد الفرح للمسجلين حضور", invitation: false, plus: true },
      { id: "music", feature: "إضافة أغاني أو موسيقى من اختيارك تشتغل تلقائي عند فتح الدعوة", invitation: false, plus: true },
      { id: "anytime-edit", feature: "إمكانية التعديل على التصميم في أي وقت", invitation: false, plus: true },
      { id: "main-page", feature: "صفحة الدعوة الأساسية", invitation: true, plus: true },
      { id: "choose-design", feature: "اختيار التصميم", invitation: true, plus: true },
      { id: "comments", feature: "مفتوح كومنت", invitation: true, plus: true },
      { id: "rsvp-open", feature: "مفتوح تسجيلات الحضور", invitation: true, plus: true },
      { id: "client-admin", feature: "بيدج أدمن خاصة بيك", invitation: true, plus: true },
      { id: "guest-records", feature: "الحصول علي سجلات الحضور اسماء وارقام هواتفهم", invitation: true, plus: true },
      { id: "support", feature: "خدمه عملاء", invitation: true, plus: true },
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
  return fallback.map((item, index) => {
    const incoming = value.find((entry) => entry && typeof entry === "object" && "id" in entry && entry.id === item.id) || value[index];
    return {
      id: item.id,
      text: cleanText((incoming as Partial<HomeFeaturePoint> | undefined)?.text, item.text),
    };
  });
}

function normalizePricingRows(value: unknown, fallback: HomePricingRow[]) {
  if (!Array.isArray(value)) return fallback;
  return fallback.map((item, index) => {
    const incoming = value.find((entry) => entry && typeof entry === "object" && "id" in entry && entry.id === item.id) || value[index];
    return {
      id: item.id,
      feature: cleanText((incoming as Partial<HomePricingRow> | undefined)?.feature, item.feature),
      invitation: typeof (incoming as Partial<HomePricingRow> | undefined)?.invitation === "boolean" ? Boolean((incoming as Partial<HomePricingRow>).invitation) : item.invitation,
      plus: typeof (incoming as Partial<HomePricingRow> | undefined)?.plus === "boolean" ? Boolean((incoming as Partial<HomePricingRow>).plus) : item.plus,
    };
  });
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
