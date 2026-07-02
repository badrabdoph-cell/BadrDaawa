export type AdminInvitationState = "active" | "paused" | "expired" | "archived" | "disabled" | "trial" | "trial-ended" | "draft";

export type AdminInvitationStateInput = {
  isActive: boolean;
  weddingDate: string;
  status?: string;
  disabledAt?: string;
  trialEndsAt?: string;
  disabledBy?: string;
};

export function isExpiredInvitation(weddingDate: string, now = Date.now()) {
  const date = new Date(weddingDate);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < now;
}

export function getInvitationState(invitation: AdminInvitationStateInput, now = Date.now()): AdminInvitationState {
  const status = invitation.status?.toLowerCase();
  const trialEndsAt = invitation.trialEndsAt ? new Date(invitation.trialEndsAt).getTime() : 0;

  if (invitation.disabledAt) {
    if (invitation.disabledBy === "system" && invitation.trialEndsAt) return "trial-ended";
    return "disabled";
  }
  if (trialEndsAt > now) return "trial";
  if (status === "draft") return "draft";
  if (status === "archived") return "archived";
  if (status === "paused" || !invitation.isActive) return "paused";
  if (isExpiredInvitation(invitation.weddingDate, now)) return "expired";
  return "active";
}

export function stateLabel(state: AdminInvitationState | string) {
  if (state === "active") return "نشطة";
  if (state === "paused") return "متوقفة";
  if (state === "expired") return "منتهية";
  if (state === "archived") return "مؤرشفة";
  if (state === "disabled") return "معطلة";
  if (state === "trial") return "تجريبي";
  if (state === "trial-ended") return "منتهي تجريبي";
  if (state === "draft") return "مسودة";
  return "كل الحالات";
}

export function stateClassName(state: AdminInvitationState | string) {
  if (state === "active") return "status success";
  if (state === "paused" || state === "expired" || state === "draft") return "status warning";
  if (state === "trial") return "status info trial-badge";
  if (state === "trial-ended") return "status danger";
  return "status danger";
}

export function stateEmoji(state: AdminInvitationState | string) {
  if (state === "active") return "\uD83D\uDFE2";
  if (state === "paused" || state === "expired" || state === "draft") return "\uD83D\uDFE1";
  if (state === "disabled" || state === "trial-ended") return "\uD83D\uDD34";
  if (state === "trial") return "\uD83D\uDFE0";
  return "";
}
