import type { Invitation } from "./types";
import { getPrePublishValidationReport } from "./pre-publish-validation";

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

function hasMusic(invitation: Invitation) {
  return Boolean(invitation.musicEnabled && invitation.musicUrl?.trim());
}

function hasInvitationTexts(invitation: Invitation) {
  const texts = invitation.texts;
  if (!texts) return false;
  return Object.values(texts).some((value) => typeof value === "string" && value.trim().length > 0);
}

export function getInvitationCompleteness(invitation: Invitation): InvitationCompleteness {
  const prePublish = getPrePublishValidationReport(invitation);
  const items: InvitationCompletenessItem[] = prePublish.items
    .filter((entry) => entry.key !== "map")
    .map((entry) => ({ key: entry.key, label: entry.label, complete: entry.status !== "missing" }));
  items.push(
    {
      key: "map",
      label: "الخريطة",
      complete: hasText(invitation.mapUrl),
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
  );
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
