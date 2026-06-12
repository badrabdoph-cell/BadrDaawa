import { unstable_noStore as noStore } from "next/cache";
import { getAdminGuests, getAdminInvitations } from "./admin-data";
import { prisma } from "./db";
import type { GuestRsvp, Invitation } from "./types";
import { normalizeVisitSource, visitSourceLabels, visitSources, type VisitSource } from "./visit-source";

export type AnalyticsPeriod = "today" | "7d" | "30d" | "all";

export type AnalyticsEventRow = {
  invitationCode: string;
  eventType: string;
  source: VisitSource;
  createdAt: string;
};

export type AnalyticsSourceStat = {
  source: VisitSource;
  label: string;
  count: number;
  percentage: number;
};

export type AnalyticsInvitationPerformance = {
  code: string;
  title: string;
  templateSlug: string;
  views: number;
  rsvps: number;
  confirmed: number;
  declined: number;
  expectedAttendees: number;
  conversionRate: number;
};

export type AdminAnalyticsReport = {
  period: AnalyticsPeriod;
  periodLabel: string;
  generatedAt: string;
  totals: {
    visits: number;
    confirmed: number;
    declined: number;
    expectedAttendees: number;
    rsvps: number;
    conversionRate: number;
  };
  sources: AnalyticsSourceStat[];
  topSource?: AnalyticsSourceStat;
  viewGrowth: Array<{ date: string; count: number }>;
  visitDays: Array<{ label: string; count: number; percentage: number }>;
  visitHours: Array<{ hour: string; count: number; percentage: number }>;
  topInvitations: AnalyticsInvitationPerformance[];
  invitationComparison: AnalyticsInvitationPerformance[];
  recentResponses: GuestRsvp[];
};

const periodLabels: Record<AnalyticsPeriod, string> = {
  today: "اليوم",
  "7d": "آخر 7 أيام",
  "30d": "آخر 30 يوم",
  all: "كل الوقت",
};

const arabicDayLabels = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function normalizePeriod(value?: string | null): AnalyticsPeriod {
  return value === "today" || value === "7d" || value === "30d" || value === "all" ? value : "30d";
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function getDateRange(period: AnalyticsPeriod) {
  if (period === "all") return { from: null as Date | null, to: null as Date | null };
  const from = startOfToday();
  if (period === "7d") from.setDate(from.getDate() - 6);
  if (period === "30d") from.setDate(from.getDate() - 29);
  return { from, to: null as Date | null };
}

function isWithinPeriod(value: string, from: Date | null, to: Date | null) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return false;
  return (!from || time >= from.getTime()) && (!to || time <= to.getTime());
}

function sourceFromMetadata(metadata: unknown): VisitSource {
  if (!metadata || typeof metadata !== "object") return "Unknown";
  const raw = metadata as Record<string, unknown>;
  return normalizeVisitSource(typeof raw.source === "string" ? raw.source : "") || normalizeVisitSource(typeof raw.utmSource === "string" ? raw.utmSource : "") || "Unknown";
}

function formatDayKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function dayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short" }).format(date);
}

function hourLabel(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { hour: "numeric" }).format(date);
}

function countByDate(events: AnalyticsEventRow[], period: AnalyticsPeriod, from: Date | null) {
  const map = new Map<string, number>();
  if (period !== "all") {
    const cursor = from ? new Date(from) : startOfToday();
    const today = startOfToday();
    while (cursor.getTime() <= today.getTime()) {
      map.set(cursor.toISOString().slice(0, 10), 0);
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  for (const event of events) {
    const key = formatDayKey(event.createdAt);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildSourceStats(events: AnalyticsEventRow[]): AnalyticsSourceStat[] {
  const counts = new Map<VisitSource, number>(visitSources.map((source) => [source, 0]));
  for (const event of events) counts.set(event.source, (counts.get(event.source) || 0) + 1);
  const total = events.length;
  return visitSources
    .map((source) => ({
      source,
      label: visitSourceLabels[source],
      count: counts.get(source) || 0,
      percentage: total ? Math.round(((counts.get(source) || 0) / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || visitSources.indexOf(a.source) - visitSources.indexOf(b.source));
}

function buildVisitDays(events: AnalyticsEventRow[]) {
  const counts = new Map<number, number>();
  for (const event of events) {
    const date = new Date(event.createdAt);
    if (!Number.isNaN(date.getTime())) counts.set(date.getDay(), (counts.get(date.getDay()) || 0) + 1);
  }
  const max = Math.max(1, ...counts.values());
  return Array.from({ length: 7 }, (_, day) => ({
    label: arabicDayLabels[day],
    count: counts.get(day) || 0,
    percentage: Math.round(((counts.get(day) || 0) / max) * 100),
  })).sort((a, b) => b.count - a.count);
}

function buildVisitHours(events: AnalyticsEventRow[]) {
  const counts = new Map<number, number>();
  for (const event of events) {
    const date = new Date(event.createdAt);
    if (!Number.isNaN(date.getTime())) counts.set(date.getHours(), (counts.get(date.getHours()) || 0) + 1);
  }
  const max = Math.max(1, ...counts.values());
  return Array.from(counts.entries())
    .map(([hour, count]) => ({ hour: hourLabel(hour), count, percentage: Math.round((count / max) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

async function getAnalyticsEvents() {
  if (!prisma) {
    return [];
  }

  try {
    const events = await prisma.analyticsEvent.findMany({
      where: { invitation: { deletedAt: null } },
      select: {
        eventType: true,
        metadata: true,
        createdAt: true,
        invitation: { select: { code: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20000,
    });
    return events.map((event) => ({
      invitationCode: event.invitation.code,
      eventType: event.eventType,
      source: sourceFromMetadata(event.metadata),
      createdAt: event.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Failed to load admin analytics events", error);
    return [];
  }
}

function invitationTitle(invitation: Invitation) {
  return `${invitation.groomName} و ${invitation.brideName}`;
}

function buildPerformance(invitations: Invitation[], guests: GuestRsvp[], viewEvents: AnalyticsEventRow[], period: AnalyticsPeriod) {
  const viewCounts = new Map<string, number>();
  for (const event of viewEvents) viewCounts.set(event.invitationCode, (viewCounts.get(event.invitationCode) || 0) + 1);

  return invitations
    .map((invitation) => {
      const invitationGuests = guests.filter((guest) => guest.invitationCode === invitation.code);
      const confirmedGuests = invitationGuests.filter((guest) => guest.status === "confirmed");
      const views = period === "all" && !viewCounts.size ? invitation.views : viewCounts.get(invitation.code) || 0;
      const rsvps = invitationGuests.length;
      return {
        code: invitation.code,
        title: invitationTitle(invitation),
        templateSlug: invitation.templateSlug,
        views,
        rsvps,
        confirmed: confirmedGuests.length,
        declined: invitationGuests.filter((guest) => guest.status === "declined").length,
        expectedAttendees: confirmedGuests.reduce((sum, guest) => sum + Math.max(1, guest.attendees || 1), 0),
        conversionRate: views ? Math.round((rsvps / views) * 100) : 0,
      };
    })
    .sort((a, b) => b.views - a.views || b.rsvps - a.rsvps);
}

export async function getAdminAnalyticsReport(input: { period?: string | null } = {}): Promise<AdminAnalyticsReport> {
  noStore();
  const period = normalizePeriod(input.period);
  const { from, to } = getDateRange(period);
  const [invitations, guests, events] = await Promise.all([getAdminInvitations(), getAdminGuests(), getAnalyticsEvents()]);
  const viewEvents = events.filter((event) => event.eventType === "VIEW" && isWithinPeriod(event.createdAt, from, to));
  const filteredGuests = guests.filter((guest) => isWithinPeriod(guest.createdAt, from, to));
  const confirmedGuests = filteredGuests.filter((guest) => guest.status === "confirmed");
  const declinedGuests = filteredGuests.filter((guest) => guest.status === "declined");
  const fallbackAllViews = period === "all" && !viewEvents.length ? invitations.reduce((sum, invitation) => sum + invitation.views, 0) : 0;
  const visits = viewEvents.length || fallbackAllViews;
  const rsvps = filteredGuests.length;
  const performance = buildPerformance(invitations, filteredGuests, viewEvents, period);

  return {
    period,
    periodLabel: periodLabels[period],
    generatedAt: new Date().toISOString(),
    totals: {
      visits,
      confirmed: confirmedGuests.length,
      declined: declinedGuests.length,
      expectedAttendees: confirmedGuests.reduce((sum, guest) => sum + Math.max(1, guest.attendees || 1), 0),
      rsvps,
      conversionRate: visits ? Math.round((rsvps / visits) * 100) : 0,
    },
    sources: buildSourceStats(viewEvents),
    topSource: buildSourceStats(viewEvents).find((source) => source.count > 0),
    viewGrowth: countByDate(viewEvents, period, from),
    visitDays: buildVisitDays(viewEvents),
    visitHours: buildVisitHours(viewEvents),
    topInvitations: performance.slice(0, 8),
    invitationComparison: performance.slice(0, 12),
    recentResponses: [...filteredGuests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
  };
}

export function analyticsReportToRows(report: AdminAnalyticsReport) {
  return report.invitationComparison.map((item) => ({
    "الدعوة": item.title,
    "الكود": item.code,
    "القالب": item.templateSlug,
    "الزيارات": item.views,
    "إجمالي RSVP": item.rsvps,
    "حضور مؤكد": item.confirmed,
    "اعتذارات": item.declined,
    "الأشخاص المتوقع حضورهم": item.expectedAttendees,
    "معدل التحويل": `${item.conversionRate}%`,
  }));
}

export function analyticsSummaryRows(report: AdminAnalyticsReport) {
  return [
    { metric: "الفترة", value: report.periodLabel },
    { metric: "إجمالي الزيارات", value: report.totals.visits },
    { metric: "حضور مؤكد", value: report.totals.confirmed },
    { metric: "اعتذارات", value: report.totals.declined },
    { metric: "الأشخاص المتوقع حضورهم", value: report.totals.expectedAttendees },
    { metric: "معدل التحويل", value: `${report.totals.conversionRate}%` },
    { metric: "أكثر مصدر زيارات", value: report.topSource?.label || "لا يوجد" },
  ];
}

export function analyticsDateLabel(value: string) {
  return dayLabel(value);
}
