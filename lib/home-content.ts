import { unstable_noStore as noStore } from "next/cache";
import { readProjectContentSetting, writeProjectContentSetting, readDraftContent, readPublishedContent, writeDraftContent } from "./project-content-store";

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
    mainTitle: "الجيل الجديد من دعوات الزفاف ✨",
    accentTitle: "ودّع الورق والزحمه دعوتك دلوقتي الكترونيه",
    description: "شاركوا لحظاتكم الجميلة مع أحبائكم بطريقه حديثه",
    primaryCta: "ابدأ تصميم دعوتك",
    secondaryCta: "استعرض التصاميم",
  },
  features: {
    title: "كل ما تحتاجه دعوتك في مكان واحد",
    points: [
      { id: "client-admin", icon: "SlidersHorizontal", text: "اغنيه من اختيارك بتشتغل تلقائي اول ماحد يفتح الدعوه" },
      { id: "self-create", icon: "UsersRound", text: "هتعرف عدد الزوار و عدد الحضور وعدد ال مش هيحضرو فرحك" },
      { id: "reminder", icon: "Link2", text: "هيكون معاك 2 رابط واحد للدعوه ال هتبعته وتشيرو وواحد تاني للادمن وال منه هتتحكم فالدعوه" },
      { id: "music", icon: "UserCheck", text: "وال هيكون معاك كشف كامل بال هيحضرو فرحك الاسم ورقم الفون بتعهم" },
      { id: "rsvp-open", icon: "UserCheck", text: "هتقدر تعرف مين زار الدعوه بتعتك" },
      { id: "guest-records", icon: "UsersRound", text: "هيكون عندك استفتاء وهتعرف مين هيحضر فرحك ومين لا" },
      { id: "anytime-edit", icon: "Send", text: "تقدر تبعت رساله لكل ال هيحضرو فرحك وتفكرهم بالفرح" },
      { id: "support", icon: "Send", text: "المعازيم هيكون معاهم لوكيشن القاعه عنوان وعلي الخريطه بشكل تلقائي" },
      { id: "send-message", icon: "Send", text: "إرسال رسائل للضيوف بضغطة واحدة" },
      { id: "free-edit", icon: "Vote", text: "ميزه اضافه للتقويم وال منها الموقع هيفكرهم ويديهم تنبيه للفرح" },
      { id: "poll", icon: "Vote", text: "ميزه التعليقات هلي الدعوه ، المعازيم يقدرو يسبولك كومنت ومش هيظهر فالدعوه غير لما انت توافق عليه بنفسك من الادمن" },
      { id: "private-link", icon: "Send", text: "ابعت رساله للحضور بضغطه وحده ✨" },
      { id: "tracking", icon: "Eye", text: "رساله جماعيه توصل لكل المعازيم فوقت واحد باسم العريس والعروسه علي فونهم مباشر مش من رقم فون لا من اسم العريس والعروسه تكتب فيه ال انت حابه 😉" },
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
    const match = fallback.find((item) => item.id === point.id);
    const text = cleanText(point.text, match?.text || "");
    if (!text) continue;
    seen.add(point.id);
    normalized.push({
      id: point.id.trim(),
      text,
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
  const normalized: HomePricingRow[] = [];

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Partial<HomePricingRow>;
    if (typeof row.id !== "string" || !row.id.trim() || seen.has(row.id)) continue;
    const match = fallback.find((item) => item.id === row.id);
    const feature = cleanText(row.feature, match?.feature || "");
    if (!feature) continue;
    seen.add(row.id);
    normalized.push({
      id: row.id.trim(),
      feature,
      invitation: typeof row.invitation === "boolean" ? row.invitation : (match?.invitation ?? true),
      plus: typeof row.plus === "boolean" ? row.plus : (match?.plus ?? true),
    });
  }

  for (const item of fallback) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    normalized.push({ ...item });
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

// Draft/Publish System Functions
export async function getDraftHomeContent() {
  noStore();
  return readDraftContent("home-content", defaultHomeContent, (value) => normalizeContent(value as Partial<HomeContent>));
}

export async function getPublishedHomeContent() {
  noStore();
  return readPublishedContent("home-content", defaultHomeContent, (value) => normalizeContent(value as Partial<HomeContent>));
}

export async function updateHomeContentDraft(input: Partial<HomeContent>) {
  const current = await getDraftHomeContent();
  const next = normalizeContent({ ...current, ...input });
  await writeDraftContent("home-content", next);
  return next;
}

export async function updateHomeContent(input: Partial<HomeContent>) {
  return updateHomeContentDraft(input);
}
