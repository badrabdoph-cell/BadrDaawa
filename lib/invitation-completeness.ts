import type { Invitation } from "./types";

export type InvitationCompletenessItem = {
  key: string;
  label: string;
  complete: boolean;
};

export type InvitationCompleteness = {
  percentage: number;
  completed: number;
  total: number;
  items: InvitationCompletenessItem[];
  missingLabels: string[];
  isComplete: boolean;
};

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function hasValidDate(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

function hasImages(invitation: Invitation) {
  return Boolean(invitation.gallery?.filter(Boolean).length || invitation.heroPhoto?.trim());
}

function hasMusic(invitation: Invitation) {
  return Boolean(invitation.musicEnabled && invitation.musicUrl?.trim());
}

function hasInvitationTexts(invitation: Invitation) {
  const texts = invitation.texts;
  if (!texts) return false;
  return Object.values(texts).some((value) => typeof value === "string" && value.trim().length > 0);
}

export function getInvitationCompleteness(invitation: Invitation): InvitationCompleteness {
  const items: InvitationCompletenessItem[] = [
    {
      key: "names",
      label: "الأسماء",
      complete: hasText(invitation.groomName) && hasText(invitation.brideName),
    },
    {
      key: "date",
      label: "التاريخ",
      complete: hasValidDate(invitation.weddingDate),
    },
    {
      key: "venue",
      label: "القاعة",
      complete: hasText(invitation.venue),
    },
    {
      key: "map",
      label: "الخريطة",
      complete: hasText(invitation.mapUrl),
    },
    {
      key: "images",
      label: "الصور",
      complete: hasImages(invitation),
    },
    {
      key: "music",
      label: "الموسيقى",
      complete: hasMusic(invitation),
    },
    {
      key: "texts",
      label: "النصوص",
      complete: hasInvitationTexts(invitation),
    },
  ];
  const completed = items.filter((item) => item.complete).length;
  const total = items.length;
  const percentage = Math.round((completed / total) * 100);
  const missingLabels = items.filter((item) => !item.complete).map((item) => item.label);

  return {
    percentage,
    completed,
    total,
    items,
    missingLabels,
    isComplete: completed === total,
  };
}
