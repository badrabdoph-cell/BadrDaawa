import { Download, Filter, Search, ShieldCheck } from "lucide-react";
import { auditActionLabels, listAuditLogEntries, type AuditAction, type AuditLogEntry } from "@/lib/audit-log";
import { formatArabicNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AuditLogPageParams = {
  q?: string;
  action?: string;
  entityType?: string;
  actor?: string;
  from?: string;
  to?: string;
};

const entityLabels: Record<string, string> = {
  Invitation: "دعوة",
  Order: "طلب",
  Template: "قالب",
  Media: "وسائط",
  GitHubSync: "GitHub",
  Backup: "Backup",
};

const actorLabels: Record<string, string> = {
  admin: "الأدمن",
  client: "العميل",
  public: "زائر",
  system: "النظام",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(value));
}

function compactJson(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!text || text === "{}" || text === "[]") return undefined;
  return text.length > 700 ? `${text.slice(0, 700)}...` : text;
}

function buildExportHref(params: AuditLogPageParams) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  return `/api/admin/audit-log/export${search.size ? `?${search.toString()}` : ""}`;
}

function AuditDiff({ entry }: { entry: AuditLogEntry }) {
  const oldValues = compactJson(entry.oldValues);
  const newValues = compactJson(entry.newValues);
  if (oldValues == null && newValues == null) return <span className="audit-muted">لا توجد قيم مسجلة</span>;
  return (
    <div className="audit-diff-grid">
      {oldValues != null ? (
        <details>
          <summary>قبل</summary>
          <pre>{oldValues}</pre>
        </details>
      ) : null}
      {newValues != null ? (
        <details>
          <summary>بعد</summary>
          <pre>{newValues}</pre>
        </details>
      ) : null}
    </div>
  );
}

export default async function AdminAuditLogPage({ searchParams }: { searchParams: Promise<AuditLogPageParams> }) {
  const params = await searchParams;
  const entries = await listAuditLogEntries(params);
  const allActions = Object.keys(auditActionLabels) as AuditAction[];
  const actionCounts = entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.action] = (acc[entry.action] || 0) + 1;
    return acc;
  }, {});
  const latestEntry = entries[0];

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Audit Log</span>
          <h1>سجل التدقيق</h1>
          <p>تتبع واضح لإنشاء وتعديل وحذف الدعوات، الطلبات، الوسائط، المزامنة، واستعادة النسخ الاحتياطية.</p>
        </div>
        <a className="btn btn-gold" href={buildExportHref(params)}>
          <Download size={17} />
          تصدير CSV
        </a>
      </div>

      <section className="media-stats-grid audit-stats-grid">
        <article className="admin-list-stat">
          <ShieldCheck size={19} />
          <span>الأحداث المعروضة</span>
          <strong>{formatArabicNumber(entries.length)}</strong>
        </article>
        <article className="admin-list-stat good">
          <Filter size={19} />
          <span>أنواع العمليات</span>
          <strong>{formatArabicNumber(Object.keys(actionCounts).length)}</strong>
        </article>
        <article className="admin-list-stat">
          <Search size={19} />
          <span>آخر حدث</span>
          <strong>{latestEntry ? formatDate(latestEntry.createdAt) : "لا يوجد"}</strong>
        </article>
      </section>

      <section className="panel audit-log-toolbar">
        <form action="/admin/audit-log" method="get">
          <label className="media-search-field">
            <Search size={17} />
            <input name="q" defaultValue={params.q || ""} placeholder="ابحث بالمستخدم، العملية، الكيان، أو القيم" />
          </label>
          <label>
            <Filter size={16} />
            <select name="action" defaultValue={params.action || "all"}>
              <option value="all">كل العمليات</option>
              {allActions.map((action) => (
                <option value={action} key={action}>
                  {auditActionLabels[action]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <ShieldCheck size={16} />
            <select name="entityType" defaultValue={params.entityType || "all"}>
              <option value="all">كل الكيانات</option>
              {Object.entries(entityLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <select name="actor" defaultValue={params.actor || "all"} aria-label="المستخدم">
            <option value="all">كل المستخدمين</option>
            <option value="admin">الأدمن</option>
            <option value="public">الزوار</option>
            <option value="system">النظام</option>
          </select>
          <input name="from" type="date" defaultValue={params.from || ""} aria-label="من تاريخ" />
          <input name="to" type="date" defaultValue={params.to || ""} aria-label="إلى تاريخ" />
          <button className="btn btn-soft" type="submit">تطبيق</button>
        </form>
      </section>

      <section className="panel audit-log-panel">
        {entries.length ? (
          <div className="table-shell audit-table-shell">
            <table className="data-table audit-log-table">
              <thead>
                <tr>
                  <th>الوقت</th>
                  <th>المستخدم</th>
                  <th>العملية</th>
                  <th>الكيان</th>
                  <th>القيم</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDate(entry.createdAt)}</td>
                    <td>
                      <strong>{entry.actor.label}</strong>
                      <small>{actorLabels[entry.actor.type] || entry.actor.type}</small>
                    </td>
                    <td>
                      <span className="audit-action-pill">{auditActionLabels[entry.action] || entry.action}</span>
                    </td>
                    <td>
                      <strong>{entityLabels[entry.entity.type] || entry.entity.type}</strong>
                      <small>{entry.entity.label || entry.entity.id}</small>
                    </td>
                    <td>
                      <AuditDiff entry={entry} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state compact">
            <ShieldCheck size={22} />
            <strong>لا توجد أحداث مطابقة.</strong>
          </div>
        )}
      </section>
    </>
  );
}
