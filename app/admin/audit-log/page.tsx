import { auditActionLabels, listAuditLogEntries, type AuditAction } from "@/lib/audit-log";
import { AuditLogClient } from "@/components/AuditLogClient";

export const dynamic = "force-dynamic";

type AuditLogPageParams = {
  q?: string;
  action?: string;
  entityType?: string;
  actor?: string;
  from?: string;
  to?: string;
};

export default async function AdminAuditLogPage({ searchParams }: { searchParams: Promise<AuditLogPageParams> }) {
  const params = await searchParams;
  const entries = await listAuditLogEntries(params);
  const allActions = Object.keys(auditActionLabels) as AuditAction[];
  const actionCounts = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.action] = (acc[entry.action] || 0) + 1;
    return acc;
  }, {});
  const latestEntry = entries[0];

  return <AuditLogClient entries={entries} allActions={allActions} actionCounts={actionCounts} latestEntry={latestEntry} params={params} />;
}
