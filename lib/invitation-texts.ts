import type { CoupleStoryItem, GalleryStoryItem, InvitationGift, InvitationTexts, Language } from "./types";

export const defaultInvitationTexts: Required<InvitationTexts> = {
  groomNameEn: "",
  brideNameEn: "",
  openingText: "ليلة جديدة تبدأ باسم الحب. افتحوا الدعوة وشاركونا الفرحة.",
  inviteMessage: "بكل الحب والامتنان، ندعوكم لمشاركتنا هذه الليلة المميزة، حيث تبدأ حكاية جديدة ونحتفل بها برفقتكم.",
  inviteMessageSecondary: "هنفرح أكتر بوجودكم، وهتبقى الذكرى أحلى لما تكونوا جزء منها. 💖",
  rsvpQuestion: "ناوي تحضر وتشاركنا فرحه عمرنا؟",
  rsvpDeclinedMessage: "حزين إنك مش معايا في يومي المفضل 🥹",
  rsvpConfirmedSuccessMessage: "شكراً لتأكيد حضورك. وجودك يفرحنا ويكمل ليلتنا.",
  rsvpDeclinedSuccessMessage: "شكراً لردك. نتمنى لك كل الخير ونقدر مشاركتك لنا الفرحة.",
  galleryStories: [],
  story: [],
  gift: {},
};

export const defaultInvitationTextsByLocale: Record<Language, Required<InvitationTexts>> = {
  ar: defaultInvitationTexts,
  en: {
    groomNameEn: "",
    brideNameEn: "",
    openingText: "A new night begins with love. Open the invitation and celebrate with us.",
    inviteMessage: "With love and gratitude, we invite you to share this special evening with us as a new story begins.",
    inviteMessageSecondary: "Your presence will make our joy complete and turn the day into an unforgettable memory. 💖",
    rsvpQuestion: "Will you join us and celebrate our big day?",
    rsvpDeclinedMessage: "We will miss you on our special day.",
    rsvpConfirmedSuccessMessage: "Thank you for confirming. Your presence will make our night complete.",
    rsvpDeclinedSuccessMessage: "Thank you for letting us know. We appreciate you sharing our joy.",
    galleryStories: [],
    story: [],
    gift: {},
  },
};

const textLimits: Record<Exclude<keyof InvitationTexts, "galleryStories" | "story" | "gift">, number> = {
  groomNameEn: 120,
  brideNameEn: 120,
  openingText: 180,
  inviteMessage: 520,
  inviteMessageSecondary: 240,
  rsvpQuestion: 160,
  rsvpDeclinedMessage: 180,
  rsvpConfirmedSuccessMessage: 260,
  rsvpDeclinedSuccessMessage: 260,
};

function cleanText(value: unknown, fallback: string, limit: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;
}

function cleanOptionalText(value: unknown, limit: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : "";
}

export function normalizeCoupleStory(value: unknown): CoupleStoryItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry, index) => {
      const raw = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      return {
        id: cleanOptionalText(raw.id, 80) || `story-${index + 1}`,
        title: cleanOptionalText(raw.title, 120),
        description: cleanOptionalText(raw.description, 700),
        imageUrl: cleanOptionalText(raw.imageUrl, 500),
        date: cleanOptionalText(raw.date, 80),
      };
    })
    .filter((entry) => Boolean(entry.title || entry.description || entry.imageUrl || entry.date));
}

export function normalizeGalleryStories(value: unknown): GalleryStoryItem[] {
  if (!Array.isArray(value)) return [];
  const stories = value
    .slice(0, 12)
    .map((entry) => {
      const raw = entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {};
      return {
        title: cleanOptionalText(raw.title, 120),
        description: cleanOptionalText(raw.description, 280),
      };
    });
  return stories.some((entry) => entry.title || entry.description) ? stories : [];
}

export function normalizeInvitationGift(value: unknown): InvitationGift {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const gift = {
    vodafoneCash: cleanOptionalText(raw.vodafoneCash, 80),
    instapay: cleanOptionalText(raw.instapay, 120),
    bankAccount: cleanOptionalText(raw.bankAccount, 180),
    customText: cleanOptionalText(raw.customText, 500),
  };
  return Object.values(gift).some(Boolean) ? gift : {};
}

export function normalizeInvitationTexts(value: unknown, language: Language = "ar"): Required<InvitationTexts> {
  const defaults = defaultInvitationTextsByLocale[language] || defaultInvitationTexts;
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    groomNameEn: cleanText(raw.groomNameEn, defaults.groomNameEn, textLimits.groomNameEn),
    brideNameEn: cleanText(raw.brideNameEn, defaults.brideNameEn, textLimits.brideNameEn),
    openingText: cleanText(raw.openingText, defaults.openingText, textLimits.openingText),
    inviteMessage: cleanText(raw.inviteMessage, defaults.inviteMessage, textLimits.inviteMessage),
    inviteMessageSecondary: cleanText(raw.inviteMessageSecondary, defaults.inviteMessageSecondary, textLimits.inviteMessageSecondary),
    rsvpQuestion: cleanText(raw.rsvpQuestion, defaults.rsvpQuestion, textLimits.rsvpQuestion),
    rsvpDeclinedMessage: cleanText(raw.rsvpDeclinedMessage, defaults.rsvpDeclinedMessage, textLimits.rsvpDeclinedMessage),
    rsvpConfirmedSuccessMessage: cleanText(raw.rsvpConfirmedSuccessMessage, defaults.rsvpConfirmedSuccessMessage, textLimits.rsvpConfirmedSuccessMessage),
    rsvpDeclinedSuccessMessage: cleanText(raw.rsvpDeclinedSuccessMessage, defaults.rsvpDeclinedSuccessMessage, textLimits.rsvpDeclinedSuccessMessage),
    galleryStories: normalizeGalleryStories(raw.galleryStories),
    story: normalizeCoupleStory(raw.story),
    gift: normalizeInvitationGift(raw.gift),
  };
}
