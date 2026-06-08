import Link from "next/link";
import { headers } from "next/headers";
import { Archive, CalendarDays, Eye, Filter, Pause, Play, Search, Settings2, Trash2, UserCheck } from "lucide-react";
import { AdminCreateInvitationForm } from "@/components/AdminCreateInvitationForm";
import { CopyButton } from "@/components/CopyButton";
import { getAdminGuests, getAdminInvitations } from "@/lib/admin-data";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { formatArabicNumber, getPublicSiteUrl } from "@/lib/utils";
import { getCustomerAdminPath } from "@/lib/slug";

export const dynamic = "force-dynamic";

type InvitationListParams = {
  created?: string;
  error?: string;
  demo?: string;
  status?: string;
  q?: string;
  state?: string;
  sort?: string;
};

function formatAdminDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function isExpiredInvitation(weddingDate: string) {
  const date = new Date(weddingDate);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function getInvitationState(invitation: { isActive: boolean; weddingDate: string }) {
  if (!invitation.isActive) return "paused";
  if (isExpiredInvitation(invitation.weddingDate)) return "expired";
  return "active";
}

function stateLabel(state: string) {
  if (state === "active") return "نشطة";
  if (state === "paused") return "متوقفة";
  if (state === "expired") return "منتهية";
  return "كل الحالات";
}

export default async function ClientInvitationsPage({
  searchParams,
}: {
  searchParams: Promise<InvitationListParams>;
}) {
  const [params, invitations, guests, templates, requestHeaders] = await Promise.all([searchParams, getAdminInvitations(), getAdminGuests(), getTemplatesWithSettings(), headers()]);
  const siteUrl = getPublicSiteUrl(requestHeaders).replace(/\/$/, "");
  const query = (params.q || "").trim().toLowerCase();
  const selectedState = params.state || "all";
  const selectedSort = params.sort || "newest";
  const guestStatsByCode = guests.reduce(
    (map, guest) => {
      const current = map.get(guest.invitationCode) || { responses: 0, confirmed: 0, attendees: 0 };
      current.responses += 1;
      if (guest.status === "confirmed") {
        current.confirmed += 1;
        current.attendees += Math.max(1, guest.attendees || 1);
      }
      map.set(guest.invitationCode, current);
      return map;
    },
    new Map<string, { responses: number; confirmed: number; attendees: number }>(),
  );
  const filteredInvitations = invitations
    .filter((invitation) => {
      const state = getInvitationState(invitation);
      const template = templates.find((item) => item.slug === invitation.templateSlug);
      const searchable = [invitation.code, invitation.groomName, invitation.brideName, invitation.venue, invitation.city, template?.arabicName || invitation.templateSlug].join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (selectedState === "all" || state === selectedState);
    })
    .sort((a, b) => {
      if (selectedSort === "views") return b.views - a.views;
      if (selectedSort === "weddingDate") return new Date(a.weddingDate).getTime() - new Date(b.weddingDate).getTime();
      if (selectedSort === "attendees") return (guestStatsByCode.get(b.code)?.attendees || 0) - (guestStatsByCode.get(a.code)?.attendees || 0);
      return 0;
    });
  const activeCount = invitations.filter((invitation) => getInvitationState(invitation) === "active").length;
  const pausedCount = invitations.filter((invitation) => getInvitationState(invitation) === "paused").length;
  const expiredCount = invitations.filter((invitation) => getInvitationState(invitation) === "expired").length;
  const expectedGuests = [...guestStatsByCode.values()].reduce((sum, item) => sum + item.attendees, 0);
  const statusMessages: Record<string, string> = {
    pause: "تم إيقاف الدعوة.",
    resume: "تم تشغيل الدعوة.",
    delete: "تم حذف الدعوة.",
    missing: "لم يتم العثور على الدعوة المطلوبة.",
    invalid: "الإجراء غير صالح.",
  };

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Client Invitations</span>
          <h1>دعوات العملاء</h1>
          <p>ابحث، رتّب، وافتح روابط العميل أو التعديل من جدول واحد بدون الرجوع بين صفحات كثيرة.</p>
        </div>
        <a className="btn btn-gold" href="#create-invitation">
          إنشاء دعوة عميل
        </a>
      </div>

      <section className="admin-list-overview" aria-label="ملخص دعوات العملاء">
        <div className="admin-list-stat">
          <Archive size={19} />
          <span>كل الدعوات</span>
          <strong>{formatArabicNumber(invitations.length)}</strong>
        </div>
        <div className="admin-list-stat good">
          <Eye size={19} />
          <span>نشطة الآن</span>
          <strong>{formatArabicNumber(activeCount)}</strong>
        </div>
        <div className="admin-list-stat warning">
          <Pause size={19} />
          <span>متوقفة</span>
          <strong>{formatArabicNumber(pausedCount)}</strong>
        </div>
        <div className="admin-list-stat">
          <CalendarDays size={19} />
          <span>منتهية</span>
          <strong>{formatArabicNumber(expiredCount)}</strong>
        </div>
        <div className="admin-list-stat good">
          <UserCheck size={19} />
          <span>ضيوف متوقعون</span>
          <strong>{formatArabicNumber(expectedGuests)}</strong>
        </div>
      </section>

      <div id="create-invitation">
        <AdminCreateInvitationForm created={params.created} error={params.error} demo={params.demo} templates={templates} siteUrl={siteUrl} />
      </div>
      {params.status ? <div className={params.status === "missing" || params.status === "invalid" ? "notice danger" : "notice success"}>{statusMessages[params.status] || "تم تنفيذ الإجراء."}</div> : null}
      <form className="admin-table-toolbar" action="/admin/client-invitations" method="get">
        <label className="admin-search-field">
          <Search size={17} />
          <input name="q" placeholder="ابحث بالاسم، الكود، القالب أو المكان" defaultValue={params.q || ""} />
        </label>
        <label className="admin-select-field">
          <Filter size={17} />
          <select name="state" defaultValue={selectedState} aria-label="فلترة حالة الدعوة">
            <option value="all">كل الحالات</option>
            <option value="active">نشطة</option>
            <option value="paused">متوقفة</option>
            <option value="expired">منتهية</option>
          </select>
        </label>
        <label className="admin-select-field">
          <CalendarDays size={17} />
          <select name="sort" defaultValue={selectedSort} aria-label="ترتيب الدعوات">
            <option value="newest">الأحدث إنشاء</option>
            <option value="weddingDate">حسب تاريخ الفرح</option>
            <option value="views">الأكثر زيارة</option>
            <option value="attendees">الأكثر حضوراً</option>
          </select>
        </label>
        <button className="btn btn-soft" type="submit">تطبيق</button>
        {(query || selectedState !== "all" || selectedSort !== "newest") ? (
          <Link className="btn btn-soft" href="/admin/client-invitations">مسح</Link>
        ) : null}
      </form>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>الكود</th>
              <th>الأسماء</th>
              <th>تاريخ الفرح</th>
              <th>القالب المستخدم</th>
              <th>المشاهدات</th>
              <th>الحضور</th>
              <th>الحالة</th>
              <th>روابط العميل</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvitations.map((invitation) => {
              const template = templates.find((item) => item.slug === invitation.templateSlug);
              const invitationUrl = `${siteUrl}/${invitation.code}`;
              const clientAdminUrl = `${siteUrl}${getCustomerAdminPath(invitation.code)}`;
              const guestStats = guestStatsByCode.get(invitation.code) || { responses: 0, confirmed: 0, attendees: 0 };
              const invitationState = getInvitationState(invitation);
              return (
                <tr key={invitation.id}>
                  <td>{invitation.code}</td>
                  <td>
                    {invitation.groomName} &amp; {invitation.brideName}
                  </td>
                  <td>{formatAdminDate(invitation.weddingDate)}</td>
                  <td>{template?.arabicName || invitation.templateSlug}</td>
                  <td>{formatArabicNumber(invitation.views)}</td>
                  <td>
                    <span className="admin-guests-cell">{formatArabicNumber(guestStats.attendees)} ضيف</span>
                    <small>{formatArabicNumber(guestStats.responses)} رد</small>
                  </td>
                  <td>
                    <span className={invitationState === "active" ? "status success" : "status danger"}>{stateLabel(invitationState)}</span>
                  </td>
                  <td>
                    <div className="mini-links">
                      <span>{invitationUrl}</span>
                      <span>{clientAdminUrl}</span>
                    </div>
                  </td>
                  <td>
                    <div className="button-row">
                      <Link className="btn btn-soft btn-icon" href={`/${invitation.code}`} title="فتح الدعوة">
                        <Eye size={17} />
                      </Link>
                      <Link className="btn btn-soft btn-icon" href={getCustomerAdminPath(invitation.code)} title="تعديل الدعوة">
                        <Settings2 size={17} />
                      </Link>
                      <CopyButton className="btn btn-soft btn-icon" value={invitationUrl} title="نسخ رابط الدعوة" iconOnly />
                      <form action={`/api/admin/invitations/${invitation.code}`} method="post">
                        <button className="btn btn-soft btn-icon" name="action" value={invitation.isActive ? "pause" : "resume"} title={invitation.isActive ? "إيقاف الدعوة" : "تشغيل الدعوة"} type="submit">
                          {invitation.isActive ? <Pause size={17} /> : <Play size={17} />}
                        </button>
                      </form>
                      <form action={`/api/admin/invitations/${invitation.code}`} method="post">
                        <button className="btn btn-soft btn-icon danger-button" name="action" value="delete" title="حذف الدعوة" type="submit">
                          <Trash2 size={17} />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filteredInvitations.length ? (
              <tr>
                <td colSpan={9}>
                  <div className="admin-empty-state compact">
                    <strong>لا توجد دعوات مطابقة</strong>
                    <p>جرّب تغيير البحث أو حالة الفلترة.</p>
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
