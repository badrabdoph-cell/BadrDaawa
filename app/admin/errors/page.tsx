import { AlertTriangle, Bug, Clock3, Route, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { getErrorEvents } from "@/lib/error-tracking";
import { formatArabicNumber } from "@/lib/utils";
import { AdminErrorCopyButtons, AdminErrorEventCopyButton } from "@/components/AdminErrorCopyButtons";

export const dynamic = "force-dynamic";

type ErrorsPageParams = {
  q?: string;
  route?: string;
  user?: string;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function shortRoute(value: string) {
  if (value.length <= 76) return value;
  return `${value.slice(0, 34)}...${value.slice(-34)}`;
}

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams: Promise<ErrorsPageParams>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim();
  const route = (params.route || "").trim();
  const user = (params.user || "").trim();
  const events = await getErrorEvents({ q, route, user });
  const latest = events[0];
  const adminErrors = events.filter((event) => event.user.startsWith("admin")).length;
  const routeCount = new Set(events.map((event) => event.route)).size;

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
          <input name="user" placeholder="فلترة حسب User" defaultValue={user} />
        </label>
        <button className="btn btn-soft" type="submit">بحث</button>
        {q || route || user ? <Link className="btn btn-soft" href="/admin/errors">مسح</Link> : null}
      </form>

      <AdminErrorCopyButtons events={events} />

      <div className="table-shell">
        <table className="data-table errors-table">
          <thead>
            <tr>
              <th>نسخ</th>
              <th>Route</th>
              <th>Message</th>
              <th>User</th>
              <th>Source</th>
              <th>Time</th>
              <th>Stack</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td><AdminErrorEventCopyButton event={event} /></td>
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
                    <details className="errors-stack">
                      <summary>عرض Stack</summary>
                      <pre>{event.stack}</pre>
                    </details>
                  ) : (
                    <span className="admin-muted-line">لا يوجد Stack</span>
                  )}
                </td>
              </tr>
            ))}
            {!events.length ? (
              <tr>
                <td colSpan={7}>
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
    </>
  );
}
