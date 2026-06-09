import Link from "next/link";
import { BarChart3, CalendarDays, Download, FileSpreadsheet, FileText, MousePointerClick, Share2, TrendingUp, UserCheck, UsersRound, UserX } from "lucide-react";
import { StatsGrid } from "@/components/StatsGrid";
import { analyticsDateLabel, getAdminAnalyticsReport, type AnalyticsPeriod } from "@/lib/admin-analytics";
import { formatArabicNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AnalyticsPageParams = {
  period?: string;
};

const periods: Array<{ value: AnalyticsPeriod; label: string }> = [
  { value: "today", label: "اليوم" },
  { value: "7d", label: "آخر 7 أيام" },
  { value: "30d", label: "آخر 30 يوم" },
  { value: "all", label: "كل الوقت" },
];

function formatPercent(value: number) {
  return `${formatArabicNumber(value)}%`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function exportHref(period: AnalyticsPeriod, format: "pdf" | "xlsx" | "csv") {
  return `/api/admin/analytics/export?period=${period}&format=${format}`;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsPageParams>;
}) {
  const params = await searchParams;
  const report = await getAdminAnalyticsReport({ period: params.period });
  const maxGrowth = Math.max(1, ...report.viewGrowth.map((item) => item.count));
  const maxComparisonViews = Math.max(1, ...report.invitationComparison.map((item) => item.views));

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Analytics</span>
          <h1>تحليلات وتقارير المنصة</h1>
          <p>نظام موحد للزيارات، مصادر الدخول، RSVP، أداء الدعوات، ومقارنة النتائج.</p>
        </div>
        <div className="button-row">
          <Link className="btn btn-soft" href={exportHref(report.period, "csv")}>
            <Download size={17} />
            CSV
          </Link>
          <Link className="btn btn-soft" href={exportHref(report.period, "xlsx")}>
            <FileSpreadsheet size={17} />
            Excel
          </Link>
          <Link className="btn btn-gold" href={exportHref(report.period, "pdf")}>
            <FileText size={17} />
            PDF
          </Link>
        </div>
      </div>

      <form className="analytics-filter-bar" action="/admin/analytics" method="get" aria-label="فلاتر التحليلات">
        <div className="analytics-period-tabs">
          {periods.map((period) => (
            <Link className={report.period === period.value ? "active" : ""} href={`/admin/analytics?period=${period.value}`} key={period.value}>
              {period.label}
            </Link>
          ))}
        </div>
        <input type="hidden" name="period" value={report.period} />
        <span>
          <CalendarDays size={16} />
          التقرير الحالي: {report.periodLabel}
        </span>
      </form>

      <StatsGrid
        stats={[
          { label: "إجمالي الزيارات", value: report.totals.visits },
          { label: "حضور مؤكد", value: report.totals.confirmed },
          { label: "اعتذارات", value: report.totals.declined },
          { label: "أشخاص متوقع حضورهم", value: report.totals.expectedAttendees },
          { label: "معدل التحويل إلى RSVP", value: formatPercent(report.totals.conversionRate) },
          { label: "أكثر مصدر زيارات", value: report.topSource?.label || "لا يوجد" },
        ]}
      />

      <section className="analytics-grid analytics-pro-grid">
        <article className="panel analytics-panel analytics-wide">
          <div className="admin-card-head">
            <TrendingUp size={24} />
            <div>
              <span className="eyebrow">View Growth</span>
              <h2>نمو المشاهدات بمرور الوقت</h2>
            </div>
          </div>
          {report.viewGrowth.some((item) => item.count > 0) ? (
            <div className="analytics-bar-chart">
              {report.viewGrowth.map((item) => (
                <div className="analytics-bar-column" key={item.date}>
                  <strong>{formatArabicNumber(item.count)}</strong>
                  <span style={{ height: `${Math.max(7, (item.count / maxGrowth) * 100)}%` }} />
                  <small>{analyticsDateLabel(item.date)}</small>
                </div>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state compact">
              <strong>لا توجد زيارات ضمن الفترة الحالية</strong>
              <p>ستظهر هنا المشاهدات اليومية بعد فتح الدعوات.</p>
            </div>
          )}
        </article>

        <article className="panel analytics-panel analytics-source-panel">
          <div className="admin-card-head">
            <Share2 size={24} />
            <div>
              <span className="eyebrow">Traffic Sources</span>
              <h2>مصادر الزيارات</h2>
            </div>
          </div>
          <div className="analytics-source-summary">
            <span>إجمالي زيارات مصنفة</span>
            <strong>{formatArabicNumber(report.sources.reduce((sum, source) => sum + source.count, 0))}</strong>
            <small>{report.topSource ? `الأعلى: ${report.topSource.label} (${formatPercent(report.topSource.percentage)})` : "لا توجد بيانات مصادر بعد"}</small>
          </div>
          <div className="analytics-source-list">
            {report.sources.map((source) => (
              <div className="analytics-source-row" key={source.source}>
                <div>
                  <span>{source.label}</span>
                  <small>{formatArabicNumber(source.count)} زيارة</small>
                </div>
                <div className="analytics-source-meter" aria-label={`${source.label}: ${source.percentage}%`}>
                  <i style={{ width: `${source.percentage}%` }} />
                </div>
                <strong>{formatPercent(source.percentage)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="panel analytics-panel">
          <div className="admin-card-head">
            <MousePointerClick size={24} />
            <div>
              <span className="eyebrow">Peak Time</span>
              <h2>أكثر أيام الزيارة</h2>
            </div>
          </div>
          <div className="analytics-list">
            {report.visitDays.filter((item) => item.count > 0).length ? (
              report.visitDays.slice(0, 7).map((item) => (
                <div className="analytics-row analytics-meter-row" key={item.label}>
                  <span>
                    {item.label}
                    <small>{formatArabicNumber(item.count)} زيارة</small>
                  </span>
                  <i style={{ width: `${Math.max(8, item.percentage)}%` }} />
                </div>
              ))
            ) : (
              <p>لا توجد بيانات أيام ضمن الفترة.</p>
            )}
          </div>
        </article>

        <article className="panel analytics-panel">
          <div className="admin-card-head">
            <CalendarDays size={24} />
            <div>
              <span className="eyebrow">Peak Hours</span>
              <h2>أكثر أوقات الزيارة</h2>
            </div>
          </div>
          <div className="analytics-list">
            {report.visitHours.length ? (
              report.visitHours.map((item) => (
                <div className="analytics-row analytics-meter-row" key={item.hour}>
                  <span>
                    {item.hour}
                    <small>{formatArabicNumber(item.count)} زيارة</small>
                  </span>
                  <i style={{ width: `${Math.max(8, item.percentage)}%` }} />
                </div>
              ))
            ) : (
              <p>لا توجد بيانات ساعات ضمن الفترة.</p>
            )}
          </div>
        </article>

        <article className="panel analytics-panel analytics-wide">
          <div className="admin-card-head">
            <BarChart3 size={24} />
            <div>
              <span className="eyebrow">Top Invitations</span>
              <h2>أكثر الدعوات مشاهدة</h2>
            </div>
          </div>
          <div className="analytics-ranking-list">
            {report.topInvitations.length ? (
              report.topInvitations.map((invitation, index) => (
                <div className="analytics-rank-row" key={invitation.code}>
                  <b>{index + 1}</b>
                  <span>
                    <strong>{invitation.title}</strong>
                    <small>{invitation.code} · {formatArabicNumber(invitation.rsvps)} RSVP</small>
                  </span>
                  <div>
                    <i style={{ width: `${Math.max(6, (invitation.views / maxComparisonViews) * 100)}%` }} />
                  </div>
                  <em>{formatArabicNumber(invitation.views)} زيارة</em>
                </div>
              ))
            ) : (
              <div className="admin-empty-state compact">
                <strong>لا توجد دعوات مشاهدة ضمن الفترة</strong>
              </div>
            )}
          </div>
        </article>

        <article className="panel analytics-panel">
          <div className="admin-card-head">
            <UsersRound size={24} />
            <div>
              <span className="eyebrow">RSVP</span>
              <h2>آخر ردود الحضور</h2>
            </div>
          </div>
          <div className="analytics-list">
            {report.recentResponses.length ? (
              report.recentResponses.map((guest) => (
                <div className="analytics-row" key={guest.id}>
                  <span>
                    {guest.name}
                    <small>{guest.invitationCode} · {formatArabicNumber(guest.attendees)} فرد · {formatDateTime(guest.createdAt)}</small>
                  </span>
                  <em className={guest.status === "confirmed" ? "status success" : "status danger"}>{guest.status === "confirmed" ? "حاضر" : "معتذر"}</em>
                </div>
              ))
            ) : (
              <p>لا توجد ردود RSVP ضمن الفترة.</p>
            )}
          </div>
        </article>
      </section>

      <section className="panel analytics-panel analytics-comparison-panel">
        <div className="admin-card-head">
          <UserCheck size={24} />
          <div>
            <span className="eyebrow">Comparison</span>
            <h2>مقارنة أداء الدعوات</h2>
          </div>
        </div>
        <div className="analytics-table-shell">
          <table className="data-table analytics-comparison-table">
            <thead>
              <tr>
                <th>الدعوة</th>
                <th>الزيارات</th>
                <th>RSVP</th>
                <th>مؤكد</th>
                <th>اعتذارات</th>
                <th>أشخاص متوقعون</th>
                <th>معدل التحويل</th>
              </tr>
            </thead>
            <tbody>
              {report.invitationComparison.length ? (
                report.invitationComparison.map((item) => (
                  <tr key={item.code}>
                    <td>
                      <strong>{item.title}</strong>
                      <small className="admin-muted-line">{item.code}</small>
                    </td>
                    <td>{formatArabicNumber(item.views)}</td>
                    <td>{formatArabicNumber(item.rsvps)}</td>
                    <td><span className="status success">{formatArabicNumber(item.confirmed)}</span></td>
                    <td><span className="status danger">{formatArabicNumber(item.declined)}</span></td>
                    <td>{formatArabicNumber(item.expectedAttendees)}</td>
                    <td>{formatPercent(item.conversionRate)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>
                    <div className="admin-empty-state compact">
                      <UserX size={22} />
                      <strong>لا توجد بيانات مقارنة ضمن الفترة</strong>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
