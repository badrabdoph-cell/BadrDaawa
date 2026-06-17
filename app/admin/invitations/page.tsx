import Link from "next/link";
import { headers } from "next/headers";
import { Archive, CalendarDays, Eye, Settings2, ShieldAlert, Sparkles, UserCheck } from "lucide-react";
import { getAdminGuests, getAdminInvitations } from "@/lib/admin-data";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getInvitationManagePath } from "@/lib/invitation-manage-token";
import { AdminInvitationRow } from "@/components/AdminInvitationRow";
import { AdminInvitationFilters } from "@/components/AdminInvitationFilters";
import { formatArabicNumber, getPublicSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type InvitationListParams = {
  created?: string;
  error?: string;
  demo?: string;
  status?: string;
  message?: string;
  q?: string;
  state?: string;
  sort?: string;
  noteStatus?: string;
  favoriteStatus?: string;
};

function formatAdminDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Cairo" }).format(date);
}

function isExpiredInvitation(weddingDate: string) {
  const date = new Date(weddingDate);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function getInvitationState(invitation: { isActive: boolean; weddingDate: string; status?: string; disabledAt?: string; trialEndsAt?: string; disabledBy?: string }) {
  if (invitation.disabledAt) {
    if (invitation.disabledBy === "system" && invitation.trialEndsAt) return "trial-ended";
    return "disabled";
  }
  if (invitation.trialEndsAt && new Date(invitation.trialEndsAt).getTime() > Date.now()) return "trial";
  if (invitation.status === "archived") return "archived";
  if (invitation.status === "paused" || !invitation.isActive) return "paused";
  if (isExpiredInvitation(invitation.weddingDate)) return "expired";
  return "active";
}

function stateLabel(state: string) {
  if (state === "active") return "نشطة";
  if (state === "paused") return "متوقفة";
  if (state === "expired") return "منتهية";
  if (state === "archived") return "مؤرشفة";
  if (state === "disabled") return "معطلة";
  if (state === "trial") return "تجريبي";
  if (state === "trial-ended") return "منتهي تجريبي";
  return "كل الحالات";
}

function stateClassName(state: string) {
  if (state === "active") return "status success";
  if (state === "paused" || state === "expired") return "status warning";
  if (state === "trial") return "status info trial-badge";
  if (state === "trial-ended") return "status danger";
  return "status danger";
}

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<InvitationListParams>;
}) {
  const [params, invitations, guests, templates, requestHeaders] = await Promise.all([
    searchParams,
    getAdminInvitations(),
    getAdminGuests(),
    getTemplatesWithSettings(),
    headers(),
  ]);
  const siteUrl = getPublicSiteUrl(requestHeaders).replace(/\/$/, "");
  const query = (params.q || "").trim().toLowerCase();
  const selectedState = params.state || "all";
  const selectedSort = params.sort || "newest";
  const guestStatsByCode = guests.reduce(
    (map, guest) => {
      const current = map.get(guest.invitationCode) || { confirmed: 0, attendees: 0 };
      if (guest.status === "confirmed") {
        current.confirmed += 1;
        current.attendees += Math.max(1, guest.attendees || 1);
      }
      map.set(guest.invitationCode, current);
      return map;
    },
    new Map<string, { confirmed: number; attendees: number }>(),
  );
  const filteredInvitations = invitations
    .filter((invitation) => {
      const state = getInvitationState(invitation);
      const template = templates.find((item) => item.slug === invitation.templateSlug);
      const searchable = [invitation.code, invitation.customSlug, invitation.groomName, invitation.brideName, invitation.venue, invitation.city, template?.arabicName || invitation.templateSlug].join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (selectedState === "all" || state === selectedState);
    })
    .sort((a, b) => {
      if (selectedSort === "views") return b.views - a.views;
      if (selectedSort === "weddingDate") return new Date(a.weddingDate).getTime() - new Date(b.weddingDate).getTime();
      if (selectedSort === "attendees") return (guestStatsByCode.get(b.code)?.attendees || 0) - (guestStatsByCode.get(a.code)?.attendees || 0);
      return 0;
    });
  const adminPaths = await Promise.all(filteredInvitations.map((inv) => getInvitationManagePath(inv.code).then((path) => ({ code: inv.code, path }))));
  const adminPathByCode = new Map(adminPaths.map((item) => [item.code, item.path]));
  const activeCount = invitations.filter((invitation) => getInvitationState(invitation) === "active").length;
  const pausedCount = invitations.filter((invitation) => getInvitationState(invitation) === "paused").length;
  const disabledCount = invitations.filter((invitation) => getInvitationState(invitation) === "disabled").length;
  const trialCount = invitations.filter((invitation) => getInvitationState(invitation) === "trial").length;
  const trialEndedCount = invitations.filter((invitation) => getInvitationState(invitation) === "trial-ended").length;
  const expiredCount = invitations.filter((invitation) => getInvitationState(invitation) === "expired").length;
  const archivedCount = invitations.filter((invitation) => getInvitationState(invitation) === "archived").length;
  const totalViews = invitations.reduce((sum, invitation) => sum + invitation.views, 0);
  const expectedGuests = [...guestStatsByCode.values()].reduce((sum, item) => sum + item.attendees, 0);
  const statusMessages: Record<string, string> = {
    pause: "تم إيقاف الدعوة.",
    resume: "تم تشغيل الدعوة.",
    archive: "تمت أرشفة الدعوة.",
    delete: "تم نقل الدعوة إلى سلة المهملات.",
    missing: "لم يتم العثور على الدعوة المطلوبة.",
    invalid: "الإجراء غير صالح.",
    "custom-slug": "تم تحديث رابط الدعوة المخصص.",
    "custom-url-error": params.message || "تعذر حفظ الرابط المخصص.",
    disable: "تم تعطيل الدعوة.",
    enable: "تم إعادة تفعيل الدعوة.",
    "disable-reason-required": "سبب التعطيل مطلوب. اكتب سبباً قبل التعطيل.",
  };
  const noteMessages: Record<string, string> = {
    created: "تمت إضافة الملاحظة الداخلية.",
    updated: "تم تحديث الملاحظة الداخلية.",
    deleted: "تم حذف الملاحظة الداخلية.",
    invalid: "اكتب ملاحظة صالحة قبل الحفظ.",
    missing: "لم يتم العثور على الملاحظة المطلوبة.",
  };
  const favoriteMessages: Record<string, string> = {
    added: "تمت إضافة العنصر إلى المفضلة.",
    removed: "تمت إزالة العنصر من المفضلة.",
    invalid: "تعذر تحديث المفضلة.",
    missing: "العنصر غير موجود في المفضلة.",
  };

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Invitations</span>
          <h1>إدارة الدعوات</h1>
          <p>كل دعوات العملاء في قسم واحد: إنشاء، تعديل، نسخ روابط، متابعة الزيارات والحضور، وتشغيل أو إيقاف الدعوة.</p>
        </div>
        <div className="button-row">
          <Link className="btn btn-gold" href="/admin/new-invitation">
            <Sparkles size={18} />
            دعوة جديدة
          </Link>
        </div>
      </div>

      <section className="admin-list-overview" aria-label="ملخص الدعوات">
        <div className="admin-list-stat">
          <Archive size={19} />
          <span>كل الدعوات</span>
          <strong>{formatArabicNumber(invitations.length)}</strong>
        </div>
        <div className="admin-list-stat good">
          <Eye size={19} />
          <span>إجمالي الزيارات</span>
          <strong>{formatArabicNumber(totalViews)}</strong>
        </div>
        <div className="admin-list-stat good">
          <UserCheck size={19} />
          <span>ضيوف مؤكدون</span>
          <strong>{formatArabicNumber(expectedGuests)}</strong>
        </div>
        <div className="admin-list-stat good">
          <Sparkles size={19} />
          <span>نشطة الآن</span>
          <strong>{formatArabicNumber(activeCount)}</strong>
        </div>
        <div className="admin-list-stat warning">
          <Settings2 size={19} />
          <span>متوقفة</span>
          <strong>{formatArabicNumber(pausedCount)}</strong>
        </div>
        <div className="admin-list-stat danger">
          <ShieldAlert size={19} />
          <span>معطلة</span>
          <strong>{formatArabicNumber(disabledCount)}</strong>
        </div>
        <div className="admin-list-stat info">
          <Sparkles size={19} />
          <span>تجريبي</span>
          <strong>{formatArabicNumber(trialCount)}</strong>
        </div>
        <div className="admin-list-stat">
          <CalendarDays size={19} />
          <span>منتهية تجريبي</span>
          <strong>{formatArabicNumber(trialEndedCount)}</strong>
        </div>
        <div className="admin-list-stat">
          <CalendarDays size={19} />
          <span>منتهية</span>
          <strong>{formatArabicNumber(expiredCount)}</strong>
        </div>
        <div className="admin-list-stat warning">
          <Archive size={19} />
          <span>مؤرشفة</span>
          <strong>{formatArabicNumber(archivedCount)}</strong>
        </div>
      </section>

      {params.created ? <div className="notice success">تم إنشاء الدعوة بنجاح: {params.created}</div> : null}
      {params.error ? <div className="notice danger">{params.error === "music" ? "الصوت لم يتم حفظه. استخدم ملف صوت صالح أو رابط مباشر." : params.error === "images" ? "الصور لم يتم حفظها. ارفع صور JPG/PNG/WebP أو انتظر انتهاء الرفع." : "راجع البيانات المطلوبة قبل إنشاء الدعوة."}</div> : null}
      {params.status ? <div className={params.status === "missing" || params.status === "invalid" ? "notice danger" : "notice success"}>{statusMessages[params.status] || "تم تنفيذ الإجراء."}</div> : null}
      {params.noteStatus ? <div className={params.noteStatus === "invalid" || params.noteStatus === "missing" ? "notice danger" : "notice success"}>{noteMessages[params.noteStatus] || "تم تحديث الملاحظات الداخلية."}</div> : null}
      {params.favoriteStatus ? <div className={params.favoriteStatus === "invalid" || params.favoriteStatus === "missing" ? "notice danger" : "notice success"}>{favoriteMessages[params.favoriteStatus] || "تم تحديث المفضلة."}</div> : null}
      <AdminInvitationFilters query={query} selectedState={selectedState} selectedSort={selectedSort} />

      {filteredInvitations.length ? (
        <div className="admin-invitation-table-wrapper">
          <table className="admin-invitation-table">
            <thead>
              <tr>
                <th className="col-state"></th>
                <th className="col-name">اسم الدعوة</th>
                <th className="col-date">تاريخ الحفل</th>
                <th className="col-views">الزيارات</th>
                <th className="col-status">الحالة</th>
                <th className="col-actions">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.map((invitation) => {
                const publicSlug = invitation.customSlug || invitation.code;
                const invitationUrl = `${siteUrl}/${publicSlug}`;
                const invitationState = getInvitationState(invitation);
                const stateEmoji = invitationState === "active" ? "\uD83D\uDFE2" : invitationState === "paused" ? "\uD83D\uDFE1" : invitationState === "disabled" || invitationState === "trial-ended" ? "\uD83D\uDD34" : invitationState === "trial" ? "\uD83D\uDFE0" : "";
                const adminPath = adminPathByCode.get(invitation.code);
                const adminUrl = adminPath ? `${siteUrl}${adminPath}` : "";
                return (
                  <AdminInvitationRow
                    key={invitation.id}
                    code={invitation.code}
                    groomName={invitation.groomName}
                    brideName={invitation.brideName}
                    weddingDate={formatAdminDate(invitation.weddingDate)}
                    views={formatArabicNumber(invitation.views)}
                    stateEmoji={stateEmoji}
                    stateLabel={stateLabel(invitationState)}
                    stateClass={stateClassName(invitationState)}
                    publicPath={`/${publicSlug}`}
                    adminPath={`/admin/invitations/${encodeURIComponent(invitation.code)}`}
                    invitationUrl={invitationUrl}
                    adminUrl={adminUrl}
                    isDisabled={invitationState === "disabled" || invitationState === "trial-ended"}
                    disabledReason={invitation.disabledReason}
                    disabledBy={invitation.disabledBy}
                    trialDays={invitation.trialDays}
                    trialRemaining={invitation.trialEndsAt ? Math.max(0, Math.ceil((new Date(invitation.trialEndsAt).getTime() - Date.now()) / 86400000)) : undefined}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state compact">
          <strong>لا توجد دعوات مطابقة</strong>
          <p>جرّب تغيير البحث أو حالة الفلترة.</p>
        </div>
      )}
    </>
  );
}
