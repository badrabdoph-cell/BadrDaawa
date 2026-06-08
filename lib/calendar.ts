import type { Invitation } from "./types";

const defaultDurationMinutes = 4 * 60;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function parseWeddingTime(value?: string | null) {
  const raw = (value || "").trim().toLowerCase();
  const normalized = raw
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/\s+/g, " ");
  const match = normalized.match(/(\d{1,2})(?::(\d{1,2}))?/);
  if (!match) return { hours: 19, minutes: 0 };
  let hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2] || 0)));
  const isPm = /pm|p\.m|مساء|مسا|ليل|ليلاً|ليلا/.test(normalized);
  const isAm = /am|a\.m|صباح|صبا/.test(normalized);
  if (isPm && hours < 12) hours += 12;
  if (isAm && hours === 12) hours = 0;
  return { hours, minutes };
}

export function getInvitationCalendarRange(invitation: Pick<Invitation, "weddingDate" | "weddingTime">) {
  const baseDate = new Date(invitation.weddingDate);
  const safeDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  const { hours, minutes } = parseWeddingTime(invitation.weddingTime);
  const start = new Date(safeDate);
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + defaultDurationMinutes * 60 * 1000);
  return { start, end };
}

function compactUtc(date: Date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function foldIcsLine(line: string) {
  const chunks: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    chunks.push(rest.slice(0, 74));
    rest = ` ${rest.slice(74)}`;
  }
  chunks.push(rest);
  return chunks.join("\r\n");
}

export function getInvitationCalendarTitle(invitation: Pick<Invitation, "groomName" | "brideName">) {
  return `زفاف ${invitation.groomName} و ${invitation.brideName}`;
}

export function getInvitationCalendarDescription(invitation: Pick<Invitation, "groomName" | "brideName" | "venue" | "city" | "mapUrl">, invitationUrl: string) {
  return [`دعوة زفاف ${invitation.groomName} و ${invitation.brideName}`, invitation.venue ? `المكان: ${invitation.venue}` : "", invitation.city ? `المدينة: ${invitation.city}` : "", invitation.mapUrl ? `الخريطة: ${invitation.mapUrl}` : "", invitationUrl ? `رابط الدعوة: ${invitationUrl}` : ""].filter(Boolean).join("\n");
}

export function getGoogleCalendarUrl(invitation: Invitation, invitationUrl: string) {
  const { start, end } = getInvitationCalendarRange(invitation);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: getInvitationCalendarTitle(invitation),
    dates: `${compactUtc(start)}/${compactUtc(end)}`,
    details: getInvitationCalendarDescription(invitation, invitationUrl),
    location: [invitation.venue, invitation.city].filter(Boolean).join(" - "),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function getOutlookCalendarUrl(invitation: Invitation, invitationUrl: string) {
  const { start, end } = getInvitationCalendarRange(invitation);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: getInvitationCalendarTitle(invitation),
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: getInvitationCalendarDescription(invitation, invitationUrl),
    location: [invitation.venue, invitation.city].filter(Boolean).join(" - "),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function createInvitationIcs(invitation: Invitation, invitationUrl: string) {
  const { start, end } = getInvitationCalendarRange(invitation);
  const now = new Date();
  const title = getInvitationCalendarTitle(invitation);
  const description = getInvitationCalendarDescription(invitation, invitationUrl);
  const location = [invitation.venue, invitation.city].filter(Boolean).join(" - ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BadrDaawa//Invitation Calendar//AR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${invitation.code}@badrdaawa`,
    `DTSTAMP:${compactUtc(now)}`,
    `DTSTART:${compactUtc(start)}`,
    `DTEND:${compactUtc(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    invitationUrl ? `URL:${invitationUrl}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}

export function getCalendarFileName(invitation: Pick<Invitation, "code">) {
  return `${invitation.code || "invitation"}-wedding.ics`;
}
