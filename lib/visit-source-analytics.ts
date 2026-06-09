import { getAdminAnalyticsReport } from "./admin-analytics";
import type { VisitSource } from "./visit-source";

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

export async function getVisitSourceAnalytics(): Promise<VisitSourceAnalytics> {
  const report = await getAdminAnalyticsReport({ period: "all" });
  return {
    total: report.sources.reduce((sum, source) => sum + source.count, 0),
    topSource: report.topSource,
    sources: report.sources,
  };
}
