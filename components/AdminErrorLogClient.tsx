"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, Bug, Check, Clock3, Copy, EyeOff, Filter, Loader2, Route, Search, Trash2, UserRound } from "lucide-react";
import Link from "next/link";
import type { ErrorTrackingEvent } from "@/lib/error-tracking";
import { formatArabicNumber } from "@/lib/utils";

type Props = {
  events: ErrorTrackingEvent[];
  q: string;
  route: string;
  user: string;
};

type SeverityFilter = "all" | "error" | "warning" | "info";
type DateFilter = "all" | "1h" | "24h" | "7d";

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(date);
}

function shortRoute(value: string) {
  if (value.length <= 76) return value;
  return `${value.slice(0, 34)}...${value.slice(-34)}`;
}

function inferSeverity(event: ErrorTrackingEvent): SeverityFilter {
  if (event.stack || event.source === "error") return "error";
  if (event.source === "warning" || (event.message && event.message.toLowerCase().includes("warn"))) return "warning";
  return "info";
}

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "1h", label: "آخر ساعة" },
  { key: "24h", label: "آخر 24 ساعة" },
  { key: "7d", label: "آخر 7 أيام" },
];

const SEVERITY_FILTERS: { key: SeverityFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "error", label: "خطأ" },
  { key: "warning", label: "تحذير" },
  { key: "info", label: "معلومات" },
];

export function AdminErrorLogClient({ events, q, route, user: userFilter }: Props) {
  const router = useRouter();
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [copyStates, setCopyStates] = useState<Map<string, boolean>>(new Map());
  const [clearing, setClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const dateCutoff = useMemo(() => {
    const now = Date.now();
    switch (dateFilter) {
      case "1h": return now - 3600000;
      case "24h": return now - 86400000;
      case "7d": return now - 604800000;
      default: return 0;
    }
  }, [dateFilter]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (severityFilter !== "all" && inferSeverity(event) !== severityFilter) return false;
      if (dateFilter !== "all" && new Date(event.createdAt).getTime() < dateCutoff) return false;
      return true;
    });
  }, [events, severityFilter, dateFilter, dateCutoff]);

  const latest = events[0];
  const adminErrors = events.filter((event) => event.user.startsWith("admin")).length;
  const routeCount = new Set(events.map((event) => event.route)).size;
  const DISPLAY_LIMIT = 100;
  const displayEvents = filteredEvents.length > DISPLAY_LIMIT ? filteredEvents.slice(0, DISPLAY_LIMIT) : filteredEvents;

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyDetails = useCallback(async (event: ErrorTrackingEvent) => {
    const lines = [
      `Route: ${event.route}`,
      `Message: ${event.message}`,
      `User: ${event.user}`,
      `Source: ${event.source || "unknown"}`,
      `Time: ${event.createdAt}`,
    ];
    if (event.digest) lines.push(`Digest: ${event.digest}`);
    if (event.stack) lines.push(`Stack:\n${event.stack}`);
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopyStates((prev) => {
      const next = new Map(prev);
      next.set(event.id, true);
      return next;
    });
    setTimeout(() => {
      setCopyStates((prev) => {
        const next = new Map(prev);
        next.delete(event.id);
        return next;
      });
    }, 2000);
  }, []);

  const clearAll = useCallback(async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/admin/error-tracking", { method: "DELETE" });
      if (res.ok) {
        router.refresh();
        setShowClearConfirm(false);
      }
    } catch {
    } finally {
      setClearing(false);
    }
  }, [router]);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Error Tracking</span>
          <h1>تتبع الأخطاء</h1>
          <p>سجل داخلي للأخطاء يتضمن المسار، الرسالة، Stack، الوقت، والمستخدم.</p>
        </div>
      </div>

      <section className="admin-list-overview errors-overview" aria-label="ملخص الأخطاء">
        <div className="admin-list-stat warning">
          <Bug size={19} />
          <span>الأخطاء</span>
          <strong>{formatArabicNumber(events.length)}</strong>
        </div>
        <div className="admin-list-stat">
          <Route size={19} />
          <span>المسارات المتأثرة</span>
          <strong>{formatArabicNumber(routeCount)}</strong>
        </div>
        <div className="admin-list-stat">
          <UserRound size={19} />
          <span>أخطاء الأدمن</span>
          <strong>{formatArabicNumber(adminErrors)}</strong>
        </div>
        <div className="admin-list-stat">
          <Clock3 size={19} />
          <span>آخر خطأ</span>
          <strong className="errors-last-time">{latest ? formatDateTime(latest.createdAt) : "لا يوجد"}</strong>
        </div>
      </section>

      <form className="admin-table-toolbar errors-toolbar" action="/admin/errors" method="get">
        <label className="admin-search-field">
          <Search size={17} />
          <input name="q" placeholder="ابحث في الرسالة أو Stack" defaultValue={q} />
        </label>
        <label className="admin-search-field">
          <Route size={17} />
          <input name="route" placeholder="فلترة حسب Route" defaultValue={route} />
        </label>
        <label className="admin-search-field">
          <UserRound size={17} />
          <input name="user" placeholder="فلترة حسب User" defaultValue={userFilter} />
        </label>
        <button className="btn btn-soft" type="submit">بحث</button>
        {q || route || userFilter ? <Link className="btn btn-soft" href="/admin/errors">مسح</Link> : null}
      </form>

      <div className="errors-client-filters" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div className="errors-filter-group" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Filter size={15} style={{ color: "rgba(245, 234, 214, 0.58)" }} />
          <div className="errors-severity-tabs" role="tablist" aria-label="فلترة حسب الخطورة" style={{ display: "inline-flex", gap: 4, padding: 4, border: "1px solid rgba(245, 234, 214, 0.1)", borderRadius: 10, background: "rgba(255, 255, 255, 0.035)" }}>
            {SEVERITY_FILTERS.map((opt) => (
              <button
                key={opt.key}
                className={`errors-filter-tab ${severityFilter === opt.key ? "active" : ""}`}
                type="button"
                onClick={() => setSeverityFilter(opt.key)}
                style={{
                  minHeight: 32,
                  padding: "4px 10px",
                  border: 0,
                  borderRadius: 7,
                  background: severityFilter === opt.key ? "rgba(243, 207, 115, 0.14)" : "transparent",
                  color: severityFilter === opt.key ? "#fff7e8" : "rgba(245, 234, 214, 0.55)",
                  cursor: "pointer",
                  fontWeight: 950,
                  fontSize: "0.8rem",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="errors-filter-group" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Clock3 size={15} style={{ color: "rgba(245, 234, 214, 0.58)" }} />
          <div className="errors-date-tabs" role="tablist" aria-label="فلترة حسب الوقت" style={{ display: "inline-flex", gap: 4, padding: 4, border: "1px solid rgba(245, 234, 214, 0.1)", borderRadius: 10, background: "rgba(255, 255, 255, 0.035)" }}>
            {DATE_FILTERS.map((opt) => (
              <button
                key={opt.key}
                className={`errors-filter-tab ${dateFilter === opt.key ? "active" : ""}`}
                type="button"
                onClick={() => setDateFilter(opt.key)}
                style={{
                  minHeight: 32,
                  padding: "4px 10px",
                  border: 0,
                  borderRadius: 7,
                  background: dateFilter === opt.key ? "rgba(243, 207, 115, 0.14)" : "transparent",
                  color: dateFilter === opt.key ? "#fff7e8" : "rgba(245, 234, 214, 0.55)",
                  cursor: "pointer",
                  fontWeight: 950,
                  fontSize: "0.8rem",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        {events.length > 0 ? (
          <div style={{ position: "relative" }}>
            {showClearConfirm ? (
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ color: "#ffc0bd", fontSize: "0.82rem", fontWeight: 900 }}>تأكيد المسح؟</span>
                <button className="btn btn-soft" type="button" onClick={clearAll} disabled={clearing} style={{ borderColor: "rgba(255, 98, 87, 0.3)" }}>
                  {clearing ? <Loader2 size={15} className="spin-icon" /> : <Trash2 size={15} />}
                  نعم
                </button>
                <button className="btn btn-soft" type="button" onClick={() => setShowClearConfirm(false)}>
                  إلغاء
                </button>
              </div>
            ) : (
              <button className="btn btn-soft" type="button" onClick={() => setShowClearConfirm(true)} style={{ borderColor: "rgba(255, 98, 87, 0.2)" }}>
                <Trash2 size={15} />
                مسح الكل
              </button>
            )}
          </div>
        ) : null}
      </div>

      {filteredEvents.length !== events.length ? (
        <div className="notice" style={{ marginBottom: 12, fontSize: "0.85rem" }}>
          عرض {formatArabicNumber(filteredEvents.length)} من أصل {formatArabicNumber(events.length)} حدث
        </div>
      ) : null}

      <div className="table-shell">
        <table className="data-table errors-table">
          <thead>
            <tr>
              <th>نسخ</th>
              <th>الخطورة</th>
              <th>Route</th>
              <th>Message</th>
              <th>User</th>
              <th>Source</th>
              <th>Time</th>
              <th>التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {displayEvents.map((event) => {
              const severity = inferSeverity(event);
              const expanded = expandedRows.has(event.id);
              return (
                <tr key={event.id} className={expanded ? "error-row-expanded" : ""}>
                  <td>
                    <button className="btn btn-glass" type="button" onClick={() => copyDetails(event)} title="نسخ تفاصيل الخطأ" style={{ fontSize: 12, padding: "2px 8px", minHeight: 30 }}>
                      {copyStates.get(event.id) ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                  </td>
                  <td>
                    <span className={`error-severity-badge ${severity}`}>
                      <span className={`status-dot ${severity === "error" ? "disabled" : severity === "warning" ? "paused" : "active"}`} />
                      {severity === "error" ? "خطأ" : severity === "warning" ? "تحذير" : "معلومات"}
                    </span>
                  </td>
                  <td className="admin-long-link">{shortRoute(event.route)}</td>
                  <td>
                    <strong className="errors-message">{event.message}</strong>
                    {event.digest ? <small className="admin-muted-line">Digest: {event.digest}</small> : null}
                  </td>
                  <td>{event.user}</td>
                  <td><span className="status warning">{event.source || "unknown"}</span></td>
                  <td>{formatDateTime(event.createdAt)}</td>
                  <td>
                    {event.stack ? (
                      <details className="errors-stack" open={expanded} onToggle={(e) => {
                        if (e.currentTarget.open) toggleExpand(event.id);
                        else expandedRows.delete(event.id);
                      }}>
                        <summary>عرض Stack</summary>
                        <pre>{event.stack}</pre>
                      </details>
                    ) : (
                      <span className="admin-muted-line">لا يوجد Stack</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!displayEvents.length ? (
              <tr>
                <td colSpan={8}>
                  <div className="admin-empty-state compact">
                    <AlertTriangle size={22} />
                    <strong>لا توجد أخطاء مطابقة</strong>
                    <p>عند حدوث أخطاء في الواجهة أو حدود React ستظهر هنا تلقائياً.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {filteredEvents.length > DISPLAY_LIMIT && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          عرض أول {DISPLAY_LIMIT} من أصل {filteredEvents.length}. استخدم خاصية البحث للتصفية.
        </p>
      )}
    </>
  );
}
