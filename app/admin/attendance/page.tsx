import Link from "next/link";
import { BarChart3, CheckCircle2, Download, Search, UsersRound, UserX, UserCheck, Filter, Trash2, Save, MessageCircle } from "lucide-react";
import { AdminAttendancePrintButton } from "@/components/AdminAttendancePrintButton";
import { CopyButton } from "@/components/CopyButton";
import { getAttendanceDashboard, type AttendanceSortKey, type AttendanceStatusFilter, type AttendanceSortDir } from "@/lib/attendance";
import { formatArabicNumber, normalizePhoneForWhatsApp, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AttendancePageParams = {
  invitation?: string;
  q?: string;
  status?: AttendanceStatusFilter;
  sort?: AttendanceSortKey;
  dir?: AttendanceSortDir;
  page?: string;
  pageSize?: string;
  saved?: string;
  error?: string;
};

const sortLabels: Record<AttendanceSortKey, string> = {
  createdAt: "تاريخ الرد",
  name: "الاسم",
  phone: "الهاتف",
  status: "الحالة",
  attendees: "المرافقين",
  invitation: "الدعوة",
};

function buildHref(params: AttendancePageParams, patch: AttendancePageParams) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...patch })) {
    if (value !== undefined && value !== "" && key !== "saved" && key !== "error") next.set(key, String(value));
  }
  const query = next.toString();
  return query ? `/admin/attendance?${query}` : "/admin/attendance";
}

function exportHref(params: AttendancePageParams, format: "xlsx" | "csv") {
  const next = new URLSearchParams();
  for (const key of ["invitation", "q", "status", "sort", "dir"] as const) {
    const value = params[key];
    if (value) next.set(key, value);
  }
  next.set("format", format);
  return `/api/admin/attendance/export?${next.toString()}`;
}

function message(saved?: string, error?: string) {
  if (saved === "updated") return { kind: "success", text: "تم تعديل رد الحضور." };
  if (saved === "deleted") return { kind: "success", text: "تم حذف رد الحضور." };
  if (error === "invalid") return { kind: "danger", text: "راجع بيانات الرد قبل الحفظ." };
  if (error) return { kind: "danger", text: "تعذر تنفيذ العملية." };
  return null;
}

export default async function AdminAttendancePage({ searchParams }: { searchParams: Promise<AttendancePageParams> }) {
  const params = await searchParams;
  const dashboard = await getAttendanceDashboard({
    invitationCode: params.invitation,
    q: params.q,
    status: params.status,
    sort: params.sort,
    dir: params.dir,
    page: Number(params.page || 1),
    pageSize: Number(params.pageSize || 20),
  });
  const notice = message(params.saved, params.error);
  const confirmedPercent = dashboard.totals.responses ? Math.round((dashboard.totals.confirmed / dashboard.totals.responses) * 100) : 0;
  const declinedPercent = dashboard.totals.responses ? Math.round((dashboard.totals.declined / dashboard.totals.responses) * 100) : 0;

  return (
    <section className="admin-command-center attendance-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">RSVP Management</span>
          <h1>إدارة الحضور</h1>
          <p>لوحة احترافية لمتابعة ردود الحضور لكل دعوة، مع بحث وتصفية وتصدير وتعديل مباشر.</p>
        </div>
      </div>

      {notice ? <div className={notice.kind === "danger" ? "notice danger" : "notice success"}>{notice.text}</div> : null}

      <div className="admin-list-overview attendance-overview">
        <article className="admin-list-stat">
          <UsersRound size={19} />
          <span>الدعوات</span>
          <strong>{formatArabicNumber(dashboard.totals.invitations)}</strong>
        </article>
        <article className="admin-list-stat">
          <BarChart3 size={19} />
          <span>إجمالي الردود</span>
          <strong>{formatArabicNumber(dashboard.totals.responses)}</strong>
        </article>
        <article className="admin-list-stat good">
          <UserCheck size={19} />
          <span>المؤكدين</span>
          <strong>{formatArabicNumber(dashboard.totals.confirmed)}</strong>
        </article>
        <article className="admin-list-stat warning">
          <UserX size={19} />
          <span>المعتذرين</span>
          <strong>{formatArabicNumber(dashboard.totals.declined)}</strong>
        </article>
        <article className="admin-list-stat good">
          <CheckCircle2 size={19} />
          <span>الحضور المتوقع</span>
          <strong>{formatArabicNumber(dashboard.totals.expectedAttendees)}</strong>
        </article>
      </div>

      <section className="panel attendance-visual-panel">
        <div>
          <span className="eyebrow">Visual Stats</span>
          <h2>نسبة الردود</h2>
        </div>
        <div className="attendance-chart">
          <span className="confirmed" style={{ width: `${confirmedPercent}%` }} />
          <span className="declined" style={{ width: `${declinedPercent}%` }} />
        </div>
        <div className="attendance-chart-legend">
          <span><i className="confirmed" /> مؤكد {formatArabicNumber(confirmedPercent)}%</span>
          <span><i className="declined" /> معتذر {formatArabicNumber(declinedPercent)}%</span>
        </div>
      </section>

      <section className="attendance-invitation-grid">
        {dashboard.summaries.map((summary) => (
          <Link className={dashboard.query.invitationCode === summary.code ? "attendance-invitation-card active" : "attendance-invitation-card"} href={buildHref(params, { invitation: summary.code, page: "1" })} key={summary.code}>
            <strong>{summary.title}</strong>
            <small>{formatDate(summary.weddingDate)} · {summary.venue}</small>
            <div>
              <span>الردود <b>{formatArabicNumber(summary.totalResponses)}</b></span>
              <span>مؤكد <b>{formatArabicNumber(summary.confirmedResponses)}</b></span>
              <span>اعتذار <b>{formatArabicNumber(summary.declinedResponses)}</b></span>
              <span>متوقع <b>{formatArabicNumber(summary.expectedAttendees)}</b></span>
            </div>
          </Link>
        ))}
      </section>

      <section className="panel attendance-table-panel">
        <form className="attendance-toolbar" action="/admin/attendance" method="get">
          <label className="admin-search-field">
            <Search size={17} />
            <input name="q" defaultValue={dashboard.query.q} placeholder="بحث بالاسم، الهاتف، الملاحظات، أو الدعوة..." />
          </label>
          <label className="admin-select-field">
            <Filter size={17} />
            <select name="invitation" defaultValue={dashboard.query.invitationCode}>
              <option value="">كل الدعوات</option>
              {dashboard.invitations.map((invitation) => (
                <option key={invitation.code} value={invitation.code}>
                  {invitation.groomName} و {invitation.brideName}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-select-field">
            <select name="status" defaultValue={dashboard.query.status}>
              <option value="all">كل الحالات</option>
              <option value="confirmed">مؤكد</option>
              <option value="declined">معتذر</option>
            </select>
          </label>
          <label className="admin-select-field">
            <select name="sort" defaultValue={dashboard.query.sort}>
              {Object.entries(sortLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
          <label className="admin-select-field">
            <select name="dir" defaultValue={dashboard.query.dir}>
              <option value="desc">تنازلي</option>
              <option value="asc">تصاعدي</option>
            </select>
          </label>
          <input type="hidden" name="page" value="1" />
          <button className="btn btn-gold" type="submit">تطبيق</button>
          <Link className="btn btn-soft" href="/admin/attendance">إعادة ضبط</Link>
        </form>

        <div className="attendance-export-row">
          <a className="btn btn-soft" href={exportHref(params, "xlsx")}><Download size={17} /> Excel</a>
          <a className="btn btn-soft" href={exportHref(params, "csv")}><Download size={17} /> CSV</a>
          <AdminAttendancePrintButton />
          <span>{formatArabicNumber(dashboard.pagination.totalRows)} نتيجة</span>
        </div>

        <div className="table-shell attendance-print-area">
          <table className="data-table attendance-table">
            <thead>
              <tr>
                <th>الدعوة</th>
                <th>الاسم</th>
                <th>رقم الهاتف</th>
                <th>حالة الرد</th>
                <th>عدد المرافقين</th>
                <th>الملاحظات</th>
                <th>تاريخ الرد</th>
                <th className="attendance-actions-col">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.pageRows.map((guest) => {
                const formId = `rsvp-${guest.id}`;
                return (
                  <tr key={guest.id}>
                    <td>
                      <strong>{guest.invitationTitle}</strong>
                      <small>{guest.invitationCode}</small>
                    </td>
                    <td><input className="admin-table-input" form={formId} name="name" defaultValue={guest.name} required /></td>
                    <td><input className="admin-table-input" form={formId} name="phone" defaultValue={guest.phone} required /></td>
                    <td>
                      <select className="admin-table-input" form={formId} name="status" defaultValue={guest.status}>
                        <option value="confirmed">مؤكد</option>
                        <option value="declined">معتذر</option>
                      </select>
                    </td>
                    <td><input className="admin-table-input compact" form={formId} name="attendees" type="number" min="1" max="20" defaultValue={guest.attendees} /></td>
                    <td><input className="admin-table-input" form={formId} name="note" defaultValue={guest.note || ""} /></td>
                    <td>{formatDate(guest.createdAt)}</td>
                    <td className="attendance-actions-col">
                      <form id={formId} action={`/api/admin/rsvp/${guest.id}`} method="post">
                        <input name="action" type="hidden" value="update" />
                      </form>
                      <div className="button-row">
                        <button className="btn btn-soft btn-icon" form={formId} type="submit" title="حفظ"><Save size={16} /></button>
                        <a className="btn btn-soft btn-icon" href={`https://wa.me/${normalizePhoneForWhatsApp(guest.phone)}`} title="واتساب"><MessageCircle size={16} /></a>
                        <CopyButton className="btn btn-soft btn-icon" value={guest.phone} title="نسخ الرقم" iconOnly />
                        <form action={`/api/admin/rsvp/${guest.id}`} method="post">
                          <input name="action" type="hidden" value="delete" />
                          <button className="btn btn-soft btn-icon danger-button" type="submit" title="حذف"><Trash2 size={16} /></button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!dashboard.pageRows.length ? <div className="admin-empty-state compact">لا توجد ردود مطابقة للفلاتر الحالية.</div> : null}
        </div>

        <div className="pagination">
          <Link aria-disabled={dashboard.pagination.page <= 1} href={buildHref(params, { page: String(Math.max(1, dashboard.pagination.page - 1)) })}>السابق</Link>
          {Array.from({ length: dashboard.pagination.totalPages }).map((_, index) => {
            const page = index + 1;
            return (
              <Link className={page === dashboard.pagination.page ? "active" : ""} href={buildHref(params, { page: String(page) })} key={page}>
                {formatArabicNumber(page)}
              </Link>
            );
          })}
          <Link aria-disabled={dashboard.pagination.page >= dashboard.pagination.totalPages} href={buildHref(params, { page: String(Math.min(dashboard.pagination.totalPages, dashboard.pagination.page + 1)) })}>التالي</Link>
        </div>
      </section>
    </section>
  );
}
