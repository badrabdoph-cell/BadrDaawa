"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Copy, Download, Filter, Search, ShieldCheck } from "lucide-react";
import type { AuditAction, AuditLogEntry } from "@/lib/audit-log";
import { auditActionLabels } from "@/lib/audit-log";
import { formatArabicNumber } from "@/lib/utils";

type Props = {
  entries: AuditLogEntry[];
  allActions: AuditAction[];
  actionCounts: Record<string, number>;
  latestEntry: AuditLogEntry | undefined;
  params: {
    q?: string;
    action?: string;
    entityType?: string;
    actor?: string;
    from?: string;
    to?: string;
  };
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

const ENTITY_TYPE_OPTIONS = [
  { value: "all", label: "كل الكيانات" },
  { value: "Invitation", label: "دعوة" },
  { value: "Order", label: "طلب" },
  { value: "Template", label: "قالب" },
  { value: "Media", label: "وسائط" },
  { value: "GitHubSync", label: "GitHub" },
  { value: "Backup", label: "Backup" },
];

const ACTOR_OPTIONS = [
  { value: "all", label: "كل المستخدمين" },
  { value: "admin", label: "الأدمن" },
  { value: "public", label: "الزوار" },
  { value: "system", label: "النظام" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(value));
}

function beautifyJson(value: unknown): string {
  if (value == null) return "";
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (!text || text === "{}" || text === "[]") return "";
  return text;
}

function AuditDiffEntry({ oldValues, newValues }: { oldValues: unknown; newValues: unknown }) {
  const oldStr = beautifyJson(oldValues);
  const newStr = beautifyJson(newValues);
  const [oldExpanded, setOldExpanded] = useState(false);
  const [newExpanded, setNewExpanded] = useState(false);
  const [oldCopied, setOldCopied] = useState(false);
  const [newCopied, setNewCopied] = useState(false);

  const displayOld = useMemo(() => {
    if (!oldStr) return "";
    if (!oldExpanded && oldStr.length > 300) return oldStr.slice(0, 300) + "...";
    return oldStr;
  }, [oldStr, oldExpanded]);

  const displayNew = useMemo(() => {
    if (!newStr) return "";
    if (!newExpanded && newStr.length > 300) return newStr.slice(0, 300) + "...";
    return newStr;
  }, [newStr, newExpanded]);

  const copyToClipboard = useCallback(async (text: string, setCopied: (v: boolean) => void) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  if (!oldStr && !newStr) return <span className="audit-muted">لا توجد قيم مسجلة</span>;

  return (
    <div className="audit-diff-grid">
      {oldStr ? (
        <div className="audit-diff-card">
          <div className="audit-diff-card-head">
            <summary>قبل</summary>
            <div className="audit-diff-card-actions">
              <button className="btn btn-glass" type="button" onClick={() => copyToClipboard(oldStr, setOldCopied)} title="نسخ" style={{ fontSize: 11, padding: "2px 7px", minHeight: 26 }}>
                {oldCopied ? <Check size={11} /> : <Copy size={11} />}
                {oldCopied ? "تم" : "نسخ"}
              </button>
              {oldStr.length > 300 ? (
                <button className="btn btn-glass" type="button" onClick={() => setOldExpanded(!oldExpanded)} style={{ fontSize: 11, padding: "2px 7px", minHeight: 26 }}>
                  {oldExpanded ? "طي" : "عرض الكل"}
                </button>
              ) : null}
            </div>
          </div>
          <pre className={oldExpanded ? "expanded" : ""}>{displayOld}</pre>
        </div>
      ) : null}
      {newStr ? (
        <div className="audit-diff-card">
          <div className="audit-diff-card-head">
            <summary>بعد</summary>
            <div className="audit-diff-card-actions">
              <button className="btn btn-glass" type="button" onClick={() => copyToClipboard(newStr, setNewCopied)} title="نسخ" style={{ fontSize: 11, padding: "2px 7px", minHeight: 26 }}>
                {newCopied ? <Check size={11} /> : <Copy size={11} />}
                {newCopied ? "تم" : "نسخ"}
              </button>
              {newStr.length > 300 ? (
                <button className="btn btn-glass" type="button" onClick={() => setNewExpanded(!newExpanded)} style={{ fontSize: 11, padding: "2px 7px", minHeight: 26 }}>
                  {newExpanded ? "طي" : "عرض الكل"}
                </button>
              ) : null}
            </div>
          </div>
          <pre className={newExpanded ? "expanded" : ""}>{displayNew}</pre>
        </div>
      ) : null}
    </div>
  );
}

export function AuditLogClient({ entries, allActions, actionCounts, latestEntry, params }: Props) {
  const [exporting, setExporting] = useState(false);

  const exportJson = useCallback(async () => {
    setExporting(true);
    try {
      const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [entries]);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Audit Log</span>
          <h1>سجل التدقيق</h1>
          <p>تتبع واضح لإنشاء وتعديل وحذف الدعوات، الطلبات، الوسائط، المزامنة، واستعادة النسخ الاحتياطية.</p>
        </div>
        <div className="audit-dashboard-actions" style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-soft" type="button" onClick={exportJson} disabled={exporting || !entries.length}>
            <Download size={17} />
            {exporting ? "جاري..." : "تصدير JSON"}
          </button>
          <a className="btn btn-gold" href={`/api/admin/audit-log/export${Object.keys(params).length ? `?${new URLSearchParams(params as Record<string, string>).toString()}` : ""}`}>
            <Download size={17} />
            تصدير CSV
          </a>
        </div>
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
              {ENTITY_TYPE_OPTIONS.filter((o) => o.value !== "all").map((opt) => (
                <option value={opt.value} key={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <select name="actor" defaultValue={params.actor || "all"} aria-label="المستخدم">
            {ACTOR_OPTIONS.map((opt) => (
              <option value={opt.value} key={opt.value}>
                {opt.label}
              </option>
            ))}
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
                      <AuditDiffEntry oldValues={entry.oldValues} newValues={entry.newValues} />
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
