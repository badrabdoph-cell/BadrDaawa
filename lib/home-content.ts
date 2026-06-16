import { unstable_noStore as noStore } from "next/cache";
import { readProjectContentSetting, writeProjectContentSetting } from "./project-content-store";

export type HomeFeaturePoint = {
  id: string;
  text: string;
  icon?: string;
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
      { id: "rsvp-open", text: "إدارة الحضور", icon: "UserCheck" },
      { id: "guest-records", text: "كشف كامل بأسماء وأرقام المسجلين للحضور", icon: "UsersRound" },
      { id: "client-admin", text: "لوحة تحكم خاصة بك", icon: "SlidersHorizontal" },
      { id: "reminder", text: "إرسال تذكير تلقائي بموعد الزفاف", icon: "BellRing" },
      { id: "music", text: "أضف الموسيقى التي تحبها للدعوة", icon: "Headphones" },
      { id: "anytime-edit", text: "عدّل دعوتك وقتما تشاء", icon: "Sparkles" },
      { id: "self-create", text: "تحكم كامل في تفاصيل دعوتك", icon: "Sparkles" },
      { id: "support", text: "دعم ومساعدة عند الحاجة", icon: "Headphones" },
      { id: "send-message", text: "إرسال رسائل للضيوف بضغطة واحدة", icon: "Send" },
      { id: "free-edit", text: "عدّل دعوتك وقتما تشاء", icon: "SlidersHorizontal" },
      { id: "poll", text: "معرفة عدد الحضور المتوقع بدقة", icon: "Vote" },
      { id: "private-link", text: "رابط خاص لمشاركة دعوتك بسهولة", icon: "Link2" },
      { id: "tracking", text: "اعرف من شاهد دعوتك ومتى", icon: "Eye" },
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
  const normalized: HomeFeaturePoint[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const point = entry as Partial<HomeFeaturePoint>;
    if (typeof point.id !== "string" || !point.id.trim() || seen.has(point.id)) continue;
    seen.add(point.id);
    const match = fallback.find((item) => item.id === point.id);
    normalized.push({
      id: point.id.trim(),
      text: cleanText(point.text, match?.text || ""),
      icon: point.icon || match?.icon,
    });
  }

  for (const item of fallback) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    normalized.push({ ...item });
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

export async function getHomeContent() {
  noStore();
  return readProjectContentSetting("home-content", defaultHomeContent, (value) => normalizeContent(value as Partial<HomeContent>));
}

export async function updateHomeContent(input: Partial<HomeContent>) {
  const next = normalizeContent(input);
  await writeProjectContentSetting("home-content", next);
  return next;
}
