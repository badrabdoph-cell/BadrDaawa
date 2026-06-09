import type { InvitationTexts } from "./types";

export const defaultInvitationTexts: Required<InvitationTexts> = {
  groomNameEn: "",
  brideNameEn: "",
  inviteMessage: "يومنا لن يكتمل إلا بحضوركم، ننتظركم لنصنع معاً ذكريات لا تنسى في أفضل يوم في عمرنا.",
  inviteMessageSecondary: "وجودكم معنا يجعل فرحتنا أجمل.",
  rsvpQuestion: "ناوي تحضر وتشاركنا فرحه عمرنا؟",
  rsvpDeclinedMessage: "حزين إنك مش معايا في يومي المفضل 🥹",
};

const textLimits: Record<keyof InvitationTexts, number> = {
  groomNameEn: 120,
  brideNameEn: 120,
  inviteMessage: 520,
  inviteMessageSecondary: 240,
  rsvpQuestion: 160,
  rsvpDeclinedMessage: 180,
};

function cleanText(value: unknown, fallback: string, limit: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, limit) : fallback;
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
  };
}
