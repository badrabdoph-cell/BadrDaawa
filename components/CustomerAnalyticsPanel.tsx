import { CalendarDays, Eye, UserCheck, UserX, UsersRound } from "lucide-react";
import type { CustomerInvitationAnalytics } from "@/lib/customer-analytics";
import { formatArabicNumber, formatDateTime } from "@/lib/utils";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function CustomerAnalyticsPanel({ analytics }: { analytics: CustomerInvitationAnalytics }) {
  const responseTotal = analytics.confirmedResponses + analytics.declinedResponses;
  const maxDayViews = Math.max(1, ...analytics.openDays.map((day) => day.count));
  const confirmedPercent = responseTotal ? Math.round((analytics.confirmedResponses / responseTotal) * 100) : 0;
  const declinedPercent = responseTotal ? 100 - confirmedPercent : 0;

  return (
    <section className="customer-analytics-panel" aria-label="إحصائيات الدعوة">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Analytics</span>
          <h2>إحصائيات الدعوة</h2>
        </div>
      </div>

      <div className="customer-analytics-stats">
        <article><Eye size={19} /><span>عدد الزيارات</span><strong>{formatArabicNumber(analytics.visits)}</strong></article>
        <article><UserCheck size={19} /><span>حضور مؤكد</span><strong>{formatArabicNumber(analytics.confirmedResponses)}</strong></article>
        <article><UserX size={19} /><span>اعتذارات</span><strong>{formatArabicNumber(analytics.declinedResponses)}</strong></article>
        <article><UsersRound size={19} /><span>أشخاص متوقع حضورهم</span><strong>{formatArabicNumber(analytics.expectedAttendees)}</strong></article>
      </div>

      <div className="customer-analytics-grid">
        <article className="panel customer-chart-card">
          <div className="admin-card-head">
            <UsersRound size={20} />
            <div>
              <span className="eyebrow">RSVP</span>
              <h3>توزيع الردود</h3>
            </div>
          </div>
          <div className="customer-rsvp-chart" aria-label={`حضور ${confirmedPercent}% واعتذار ${declinedPercent}%`}>
            <span className="confirmed" style={{ width: `${confirmedPercent}%` }} />
            <span className="declined" style={{ width: `${declinedPercent}%` }} />
          </div>
          <div className="customer-chart-legend">
            <span><i className="confirmed" /> حضور {formatArabicNumber(confirmedPercent)}%</span>
            <span><i className="declined" /> اعتذار {formatArabicNumber(declinedPercent)}%</span>
          </div>
        </article>

        <article className="panel customer-chart-card">
          <div className="admin-card-head">
            <CalendarDays size={20} />
            <div>
              <span className="eyebrow">Views</span>
              <h3>أكثر أيام فتح الدعوة</h3>
            </div>
          </div>
          {analytics.openDays.length ? (
            <div className="customer-day-bars">
              {analytics.openDays.map((day) => (
                <div className="customer-day-bar" key={day.date}>
                  <span>{formatDate(day.date)}</span>
                  <div><i style={{ width: `${Math.max(8, (day.count / maxDayViews) * 100)}%` }} /></div>
                  <strong>{formatArabicNumber(day.count)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state compact">
              <strong>لا توجد زيارات يومية مسجلة بعد</strong>
              <p>ستظهر هنا الأيام الأعلى بعد فتح الدعوة من الضيوف.</p>
            </div>
          )}
        </article>
      </div>

      <article className="panel customer-recent-responses">
        <div className="admin-card-head">
          <UserCheck size={20} />
          <div>
            <span className="eyebrow">Latest RSVP</span>
            <h3>آخر الردود</h3>
          </div>
        </div>
        {analytics.recentResponses.length ? (
          <div className="customer-response-list">
            {analytics.recentResponses.map((guest) => (
              <div className="customer-response-row" key={guest.id}>
                <span>
                  <strong>{guest.name}</strong>
                  <small>{formatDateTime(guest.createdAt)} · {formatArabicNumber(guest.attendees)} فرد</small>
                </span>
                <em className={guest.status === "confirmed" ? "status success" : "status danger"}>{guest.status === "confirmed" ? "حاضر" : "معتذر"}</em>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state compact">
            <strong>لا توجد ردود حتى الآن</strong>
          </div>
        )}
      </article>
    </section>
  );
}
