export function shouldShowPhotographerCard() {
  return process.env.SHOW_PHOTOGRAPHER_CARD !== "false";
}

export function extractInvitationCodeFromInput(value: string) {
  const raw = value.trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    return url.pathname.split("/").filter(Boolean)[0] || "";
  } catch {
    return raw.replace(/^\/+/, "").split("/")[0] || "";
  }
}
