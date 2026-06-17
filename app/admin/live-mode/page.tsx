import Link from "next/link";
import { Megaphone, Radio, Search, UsersRound } from "lucide-react";
import { getAdminInvitations } from "@/lib/admin-data";
import { getCheckInDashboard } from "@/lib/check-ins";
import { getApprovedGuestBookMessages } from "@/lib/guest-book";
import { formatArabicNumber } from "@/lib/utils";
import { getAllWeddingLiveModes, serializeLiveModeEvents } from "@/lib/wedding-live-mode";

export const dynamic = "force-dynamic";

type LiveModePageParams = {
  q?: string;
  saved?: string;
  error?: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(date);
}

export default async function AdminLiveModePage({ searchParams }: { searchParams: Promise<LiveModePageParams> }) {
  const params = await searchParams;
  const [invitations, configs, checkInDashboard] = await Promise.all([getAdminInvitations(), getAllWeddingLiveModes(), getCheckInDashboard()]);
  const configMap = new Map(configs.map((config) => [config.invitationCode, config]));
  const query = params.q?.trim().toLowerCase() || "";
  const rows = invitations.filter((invitation) => {
    const haystack = `${invitation.code} ${invitation.groomName} ${invitation.brideName} ${invitation.venue}`.toLowerCase();
    return !query || haystack.includes(query);
  });
  const activeCount = configs.filter((config) => config.enabled).length;
  const approvedCounts = new Map<string, number>();
  await Promise.all(
    invitations.map(async (invitation) => {
      approvedCounts.set(invitation.code, (await getApprovedGuestBookMessages(invitation.code)).length);
    }),
  );

  return (
    <section className="admin-command-center live-mode-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Wedding Live Mode</span>
          <h1>وضع الحفل المباشر</h1>
          <p>تشغيل شريط مباشر وجدول أحداث وإعلان لحظي لكل دعوة بدون تعديل الدعوة الأصلية.</p>
        </div>
      </div>

      {params.saved ? <div className="notice success">تم تحديث Wedding Live Mode للدعوة {params.saved}.</div> : null}
      {params.error ? <div className="notice danger">تعذر تحديث الإعدادات. راجع الدعوة والبيانات.</div> : null}

      <div className="admin-list-overview">
        <article className="admin-list-stat good">
          <Radio size={19} />
          <span>أوضاع نشطة</span>
          <strong>{formatArabicNumber(activeCount)}</strong>
        </article>
        <article className="admin-list-stat">
          <UsersRound size={19} />
          <span>إجمالي تسجيل الوصول</span>
          <strong>{formatArabicNumber(checkInDashboard.totals.checkIns)}</strong>
        </article>
        <article className="admin-list-stat warning">
          <Megaphone size={19} />
          <span>دعوات قابلة للتشغيل</span>
          <strong>{formatArabicNumber(invitations.length)}</strong>
        </article>
      </div>

      <section className="panel">
        <form className="attendance-toolbar" action="/admin/live-mode" method="get">
          <label className="admin-search-field">
            <Search size={17} />
            <input name="q" defaultValue={params.q || ""} placeholder="بحث باسم الدعوة، الكود، أو القاعة..." />
          </label>
          <button className="btn btn-gold" type="submit">بحث</button>
          <Link className="btn btn-soft" href="/admin/live-mode">إعادة ضبط</Link>
        </form>

        <div className="live-mode-admin-grid">
          {rows.map((invitation) => {
            const config = configMap.get(invitation.code);
            const checkInCount = checkInDashboard.invitationCounts.get(invitation.code) || 0;
            return (
              <article className={config?.enabled ? "live-mode-admin-card active" : "live-mode-admin-card"} key={invitation.code}>
                <div className="live-mode-admin-card-head">
                  <div>
                    <strong>{invitation.groomName} و {invitation.brideName}</strong>
                    <small>{invitation.code} · {invitation.venue}</small>
                  </div>
                  <span>{config?.enabled ? "مباشر الآن" : "متوقف"}</span>
                </div>
                <div className="live-mode-admin-mini-stats">
                  <b>{formatArabicNumber(checkInCount)} وصول فعلي</b>
                  <b>{formatArabicNumber(approvedCounts.get(invitation.code) || 0)} رسالة معتمدة</b>
                  <b>{config?.updatedAt ? formatDate(config.updatedAt) : "لم يتم ضبطه"}</b>
                </div>
                <form action="/api/admin/live-mode" method="post" className="live-mode-admin-form">
                  <input type="hidden" name="invitationCode" value={invitation.code} />
                  <label className="builder-checkline">
                    <input name="enabled" type="checkbox" defaultChecked={config?.enabled === true} />
                    تشغيل Wedding Live Mode
                  </label>
                  <label className="field">
                    <span>إعلان مباشر من الأدمن</span>
                    <textarea name="announcement" defaultValue={config?.announcement || ""} rows={3} placeholder="مثال: نبدأ الآن فقرة الزفة، يسعدنا وجودكم معنا." />
                  </label>
                  <label className="field">
                    <span>جدول الأحداث: سطر لكل حدث بصيغة الوقت|العنوان - وصف اختياري</span>
                    <textarea name="events" dir="rtl" defaultValue={config ? serializeLiveModeEvents(config.events) : ""} rows={5} placeholder={"8:00 مساءً|استقبال الضيوف\n9:00 مساءً|الزفة\n10:00 مساءً|العشاء"} />
                  </label>
                  <button className="btn btn-gold" type="submit">حفظ الوضع المباشر</button>
                </form>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
