import type { CoupleStoryItem, InvitationTexts } from "./types";

export const defaultInvitationTexts: Required<InvitationTexts> = {
  groomNameEn: "",
  brideNameEn: "",
  inviteMessage: "بكل الحب والامتنان، ندعوكم لمشاركتنا هذه الليلة المميزة، حيث تبدأ حكاية جديدة ونحتفل بها برفقتكم.",
  inviteMessageSecondary: "وجودكم معنا يجعل فرحتنا أجمل.",
  rsvpQuestion: "ناوي تحضر وتشاركنا فرحه عمرنا؟",
  rsvpDeclinedMessage: "حزين إنك مش معايا في يومي المفضل 🥹",
  rsvpConfirmedSuccessMessage: "شكراً لتأكيد حضورك. وجودك يفرحنا ويكمل ليلتنا.",
  rsvpDeclinedSuccessMessage: "شكراً لردك. نتمنى لك كل الخير ونقدر مشاركتك لنا الفرحة.",
  story: [],
};

const textLimits: Record<Exclude<keyof InvitationTexts, "story">, number> = {
  groomNameEn: 120,
  brideNameEn: 120,
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

export function normalizeInvitationTexts(value: unknown): Required<InvitationTexts> {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    groomNameEn: cleanText(raw.groomNameEn, defaultInvitationTexts.groomNameEn, textLimits.groomNameEn),
    brideNameEn: cleanText(raw.brideNameEn, defaultInvitationTexts.brideNameEn, textLimits.brideNameEn),
    inviteMessage: cleanText(raw.inviteMessage, defaultInvitationTexts.inviteMessage, textLimits.inviteMessage),
    inviteMessageSecondary: cleanText(raw.inviteMessageSecondary, defaultInvitationTexts.inviteMessageSecondary, textLimits.inviteMessageSecondary),
    rsvpQuestion: cleanText(raw.rsvpQuestion, defaultInvitationTexts.rsvpQuestion, textLimits.rsvpQuestion),
    rsvpDeclinedMessage: cleanText(raw.rsvpDeclinedMessage, defaultInvitationTexts.rsvpDeclinedMessage, textLimits.rsvpDeclinedMessage),
    rsvpConfirmedSuccessMessage: cleanText(raw.rsvpConfirmedSuccessMessage, defaultInvitationTexts.rsvpConfirmedSuccessMessage, textLimits.rsvpConfirmedSuccessMessage),
    rsvpDeclinedSuccessMessage: cleanText(raw.rsvpDeclinedSuccessMessage, defaultInvitationTexts.rsvpDeclinedSuccessMessage, textLimits.rsvpDeclinedSuccessMessage),
    story: normalizeCoupleStory(raw.story),
  };
}
