import Link from "next/link";
import { BarChart3, CalendarDays, MapPinCheckInside, Search, UserCheck, UsersRound } from "lucide-react";
import { getAdminGuests, getAdminInvitations } from "@/lib/admin-data";
import { getCheckInDashboard } from "@/lib/check-ins";
import { formatArabicNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type CheckInsPageParams = {
  q?: string;
  invitation?: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(date);
}

function formatPercent(value: number) {
  return `${formatArabicNumber(Math.max(0, Math.round(value)))}%`;
}

export default async function AdminCheckInsPage({ searchParams }: { searchParams: Promise<CheckInsPageParams> }) {
  const params = await searchParams;
  const [dashboard, invitations, guests] = await Promise.all([getCheckInDashboard(), getAdminInvitations(), getAdminGuests()]);
  const invitationMap = new Map(invitations.map((invitation) => [invitation.code, invitation]));
  const selectedInvitation = params.invitation || "";
  const query = params.q?.trim().toLowerCase() || "";
  const confirmedByInvitation = new Map<string, number>();
  guests
    .filter((guest) => guest.status === "confirmed")
    .forEach((guest) => {
      confirmedByInvitation.set(guest.invitationCode, (confirmedByInvitation.get(guest.invitationCode) || 0) + Math.max(1, guest.attendees || 1));
    });
  const rows = invitations
    .map((invitation) => {
      const actual = dashboard.invitationCounts.get(invitation.code) || 0;
      const confirmed = confirmedByInvitation.get(invitation.code) || 0;
      return {
        invitation,
        actual,
        confirmed,
        rate: confirmed ? Math.min(100, (actual / confirmed) * 100) : actual ? 100 : 0,
      };
    })
    .filter((row) => {
      const text = `${row.invitation.code} ${row.invitation.groomName} ${row.invitation.brideName} ${row.invitation.venue}`.toLowerCase();
      return (!selectedInvitation || row.invitation.code === selectedInvitation) && (!query || text.includes(query));
    })
    .sort((a, b) => b.actual - a.actual || b.confirmed - a.confirmed)
    .slice(0, 200);
  const recentCheckIns = dashboard.checkIns
    .filter((item) => (!selectedInvitation || item.invitationCode === selectedInvitation) && (!query || `${item.invitationCode} ${invitationMap.get(item.invitationCode)?.groomName || ""} ${invitationMap.get(item.invitationCode)?.brideName || ""}`.toLowerCase().includes(query)))
    .slice(0, 40);
  const totalRsvpExpected = guests.filter((guest) => guest.status === "confirmed").reduce((sum, guest) => sum + Math.max(1, guest.attendees || 1), 0);
  const topInvitation = dashboard.totals.topInvitationCode ? invitationMap.get(dashboard.totals.topInvitationCode) : undefined;

  return (
    <section className="admin-command-center check-ins-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Actual Attendance</span>
          <h1>الوصول الفعلي</h1>
          <p>إحصائيات تسجيل الوصول منفصلة عن RSVP التقليدي، لتعرف من وصل فعليًا لمكان الحفل.</p>
        </div>
      </div>

      <div className="admin-list-overview">
        <article className="admin-list-stat good">
          <MapPinCheckInside size={19} />
          <span>إجمالي الوصول الفعلي</span>
          <strong>{formatArabicNumber(dashboard.totals.checkIns)}</strong>
        </article>
        <article className="admin-list-stat">
          <UsersRound size={19} />
          <span>دعوات بها وصول</span>
          <strong>{formatArabicNumber(dashboard.totals.invitations)}</strong>
        </article>
        <article className="admin-list-stat warning">
          <CalendarDays size={19} />
          <span>وصول اليوم</span>
          <strong>{formatArabicNumber(dashboard.totals.today)}</strong>
        </article>
        <article className="admin-list-stat">
          <UserCheck size={19} />
          <span>RSVP مؤكد</span>
          <strong>{formatArabicNumber(totalRsvpExpected)}</strong>
        </article>
      </div>

      <section className="panel check-ins-visual-panel">
        <div>
          <span className="eyebrow">Separated Metrics</span>
          <h2>الحضور الفعلي لا يغيّر RSVP</h2>
          <p>أعلى دعوة في الوصول: {topInvitation ? `${topInvitation.groomName} و ${topInvitation.brideName}` : "لا توجد تسجيلات بعد"} ({formatArabicNumber(dashboard.totals.topInvitationCount)} وصول).</p>
        </div>
        <div className="check-ins-progress">
          <span style={{ width: `${totalRsvpExpected ? Math.min(100, (dashboard.totals.checkIns / totalRsvpExpected) * 100) : 0}%` }} />
        </div>
      </section>

      <section className="panel">
        <form className="attendance-toolbar" action="/admin/check-ins" method="get">
          <label className="admin-search-field">
            <Search size={17} />
            <input name="q" defaultValue={params.q || ""} placeholder="بحث باسم الدعوة، الكود، أو القاعة..." />
          </label>
          <label className="admin-select-field">
            <select name="invitation" defaultValue={selectedInvitation}>
              <option value="">كل الدعوات</option>
              {invitations.map((invitation) => (
                <option key={invitation.code} value={invitation.code}>
                  {invitation.groomName} و {invitation.brideName}
                </option>
              ))}
            </select>
          </label>
          <button className="btn btn-gold" type="submit">تطبيق</button>
          <Link className="btn btn-soft" href="/admin/check-ins">إعادة ضبط</Link>
        </form>

        <div className="table-shell">
          <table className="data-table check-ins-table">
            <thead>
              <tr>
                <th>الدعوة</th>
                <th>RSVP مؤكد</th>
                <th>وصول فعلي</th>
                <th>نسبة الوصول</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.invitation.code}>
                  <td>
                    <strong>{row.invitation.groomName} و {row.invitation.brideName}</strong>
                    <small>{row.invitation.code} · {row.invitation.venue}</small>
                  </td>
                  <td>{formatArabicNumber(row.confirmed)}</td>
                  <td><strong>{formatArabicNumber(row.actual)}</strong></td>
                  <td>{formatPercent(row.rate)}</td>
                  <td><span className={row.actual ? "guest-book-status-pill approved" : "guest-book-status-pill"}>{row.actual ? "بدأ الوصول" : "لا يوجد وصول"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length ? <div className="admin-empty-state compact">لا توجد دعوات مطابقة للفلاتر الحالية.</div> : null}
        </div>
      </section>

      <section className="panel">
        <div className="admin-card-head">
          <BarChart3 size={20} />
          <div>
            <span className="eyebrow">آخر تسجيلات الوصول</span>
            <h2>آخر الوصول الفعلي</h2>
          </div>
        </div>
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>الدعوة</th>
                <th>معرّف الزائر</th>
                <th>وقت الوصول</th>
              </tr>
            </thead>
            <tbody>
              {recentCheckIns.map((item) => {
                const invitation = invitationMap.get(item.invitationCode);
                return (
                  <tr key={item.id}>
                    <td>
                      <strong>{invitation ? `${invitation.groomName} و ${invitation.brideName}` : item.invitationCode}</strong>
                      <small>{item.invitationCode}</small>
                    </td>
                    <td><code>{item.visitorKey.slice(0, 24)}</code></td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!recentCheckIns.length ? <div className="admin-empty-state compact">لا توجد تسجيلات وصول بعد.</div> : null}
        </div>
      </section>
    </section>
  );
}
