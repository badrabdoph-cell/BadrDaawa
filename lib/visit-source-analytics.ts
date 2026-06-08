import { prisma } from "./db";
import { getFileAnalyticsEvents } from "./file-store";
import { normalizeVisitSource, visitSourceLabels, visitSources, type VisitSource } from "./visit-source";

export type VisitSourceStat = {
  source: VisitSource;
  label: string;
  count: number;
  percentage: number;
};

export type VisitSourceAnalytics = {
  total: number;
  topSource?: VisitSourceStat;
  sources: VisitSourceStat[];
};

function sourceFromMetadata(metadata: unknown): VisitSource {
  if (!metadata || typeof metadata !== "object") return "Unknown";
  const raw = metadata as Record<string, unknown>;
  return normalizeVisitSource(typeof raw.source === "string" ? raw.source : "") || normalizeVisitSource(typeof raw.utmSource === "string" ? raw.utmSource : "") || "Unknown";
}

function buildStats(sources: VisitSource[]): VisitSourceAnalytics {
  const counts = new Map<VisitSource, number>(visitSources.map((source) => [source, 0]));
  for (const source of sources) {
    counts.set(source, (counts.get(source) || 0) + 1);
  }
  const total = sources.length;
  const stats = visitSources
    .map((source) => ({
      source,
      label: visitSourceLabels[source],
      count: counts.get(source) || 0,
      percentage: total ? Math.round(((counts.get(source) || 0) / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count || visitSources.indexOf(a.source) - visitSources.indexOf(b.source));

  return {
    total,
    topSource: stats.find((stat) => stat.count > 0),
    sources: stats,
  };
}

export async function getVisitSourceAnalytics(): Promise<VisitSourceAnalytics> {
  if (!prisma) {
    const events = await getFileAnalyticsEvents();
    return buildStats(events.filter((event) => event.eventType === "VIEW").map((event) => sourceFromMetadata(event.metadata)));
  }

  try {
    const events = await prisma.analyticsEvent.findMany({
      where: { eventType: "VIEW", invitation: { deletedAt: null } },
      select: { metadata: true },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });
    return buildStats(events.map((event) => sourceFromMetadata(event.metadata)));
  } catch (error) {
    console.error("Failed to load visit source analytics", error);
    const events = await getFileAnalyticsEvents();
    return buildStats(events.filter((event) => event.eventType === "VIEW").map((event) => sourceFromMetadata(event.metadata)));
  }
}
