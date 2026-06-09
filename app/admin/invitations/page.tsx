import Link from "next/link";
import { headers } from "next/headers";
import { Archive, CalendarDays, ExternalLink, Eye, Filter, Pause, Play, Search, Settings2, Sparkles, Trash2, UserCheck } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { InternalNotesPanel } from "@/components/InternalNotesPanel";
import { getAdminGuests, getAdminInvitations } from "@/lib/admin-data";
import { getAdminFavorites, isAdminFavorite } from "@/lib/admin-favorites";
import { getInternalNotes, groupInternalNotesByEntity } from "@/lib/internal-notes";
import { getInvitationCompleteness } from "@/lib/invitation-completeness";
import { getInvitationManagePath } from "@/lib/invitation-manage-token";
import { getTemplatesWithSettings } from "@/lib/template-settings";
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
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function isExpiredInvitation(weddingDate: string) {
  const date = new Date(weddingDate);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

function getInvitationState(invitation: { isActive: boolean; weddingDate: string; status?: string }) {
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
  return "كل الحالات";
}

function stateClassName(state: string) {
  if (state === "active") return "status success";
  if (state === "paused" || state === "expired") return "status warning";
  return "status danger";
}

function buildReturnTo(params: InvitationListParams) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "noteStatus" && key !== "favoriteStatus") query.set(key, value);
  }
  return `/admin/invitations${query.toString() ? `?${query.toString()}` : ""}`;
}

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<InvitationListParams>;
}) {
  const [params, invitations, guests, templates, requestHeaders, internalNotes, favorites] = await Promise.all([
    searchParams,
    getAdminInvitations(),
    getAdminGuests(),
    getTemplatesWithSettings(),
    headers(),
    getInternalNotes({ entityType: "invitation" }),
    getAdminFavorites({ entityType: "invitation" }),
  ]);
  const siteUrl = getPublicSiteUrl(requestHeaders).replace(/\/$/, "");
  const query = (params.q || "").trim().toLowerCase();
  const selectedState = params.state || "all";
  const selectedSort = params.sort || "newest";
  const returnTo = buildReturnTo(params);
  const notesByEntity = groupInternalNotesByEntity(internalNotes);
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
      const searchable = [invitation.code, invitation.customSlug, invitation.groomName, invitation.brideName, invitation.venue, invitation.city, template?.arabicName || invitation.templateSlug].join(" ").toLowerCase();
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
  const archivedCount = invitations.filter((invitation) => getInvitationState(invitation) === "archived").length;
  const totalViews = invitations.reduce((sum, invitation) => sum + invitation.views, 0);
  const expectedGuests = [...guestStatsByCode.values()].reduce((sum, item) => sum + item.attendees, 0);
  const completenessByCode = new Map(invitations.map((invitation) => [invitation.code, getInvitationCompleteness(invitation)]));
  const incompleteInvitations = invitations
    .map((invitation) => ({ invitation, completeness: completenessByCode.get(invitation.code) || getInvitationCompleteness(invitation) }))
    .filter((item) => !item.completeness.isComplete)
    .sort((a, b) => a.completeness.percentage - b.completeness.percentage);
  const managePathByCode = new Map(
    await Promise.all(
      filteredInvitations.map(async (invitation) => [invitation.code, await getInvitationManagePath(invitation.code)] as const),
    ),
  );
  const statusMessages: Record<string, string> = {
    pause: "تم إيقاف الدعوة.",
    resume: "تم تشغيل الدعوة.",
    archive: "تمت أرشفة الدعوة.",
    delete: "تم نقل الدعوة إلى سلة المهملات.",
    missing: "لم يتم العثور على الدعوة المطلوبة.",
    invalid: "الإجراء غير صالح.",
    "custom-slug": "تم تحديث رابط الدعوة المخصص.",
    "custom-url-error": params.message || "تعذر حفظ الرابط المخصص.",
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
          <Play size={19} />
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
        <div className="admin-list-stat warning">
          <Archive size={19} />
          <span>مؤرشفة</span>
          <strong>{formatArabicNumber(archivedCount)}</strong>
        </div>
        <div className="admin-list-stat warning">
          <Settings2 size={19} />
          <span>غير مكتملة</span>
          <strong>{formatArabicNumber(incompleteInvitations.length)}</strong>
        </div>
      </section>

      {params.created ? <div className="notice success">تم إنشاء الدعوة بنجاح: {params.created}</div> : null}
      {params.error ? <div className="notice danger">{params.error === "music" ? "الصوت لم يتم حفظه. استخدم ملف صوت صالح أو رابط مباشر." : params.error === "images" ? "الصور لم يتم حفظها. ارفع صور JPG/PNG/WebP أو انتظر انتهاء الرفع." : "راجع البيانات المطلوبة قبل إنشاء الدعوة."}</div> : null}
      {params.status ? <div className={params.status === "missing" || params.status === "invalid" ? "notice danger" : "notice success"}>{statusMessages[params.status] || "تم تنفيذ الإجراء."}</div> : null}
      {params.noteStatus ? <div className={params.noteStatus === "invalid" || params.noteStatus === "missing" ? "notice danger" : "notice success"}>{noteMessages[params.noteStatus] || "تم تحديث الملاحظات الداخلية."}</div> : null}
      {params.favoriteStatus ? <div className={params.favoriteStatus === "invalid" || params.favoriteStatus === "missing" ? "notice danger" : "notice success"}>{favoriteMessages[params.favoriteStatus] || "تم تحديث المفضلة."}</div> : null}
      {incompleteInvitations.length ? (
        <div className="notice warning invitation-completeness-alert">
          <Settings2 size={18} />
          <div>
            <strong>يوجد {formatArabicNumber(incompleteInvitations.length)} دعوة غير مكتملة.</strong>
            <span>
              أقل الدعوات اكتمالاً:{" "}
              {incompleteInvitations
                .slice(0, 3)
                .map(({ invitation, completeness }) => `${invitation.code} (${formatArabicNumber(completeness.percentage)}%)`)
                .join("، ")}
            </span>
          </div>
        </div>
      ) : null}
      <form className="admin-table-toolbar" action="/admin/invitations" method="get">
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
            <option value="archived">مؤرشفة</option>
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
        {query || selectedState !== "all" || selectedSort !== "newest" ? (
          <Link className="btn btn-soft" href="/admin/invitations">مسح</Link>
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
              <th>الزيارات</th>
              <th>الحضور</th>
              <th>الاكتمال</th>
              <th>الحالة</th>
              <th>روابط العميل</th>
              <th>ملاحظات داخلية</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvitations.map((invitation) => {
              const template = templates.find((item) => item.slug === invitation.templateSlug);
              const publicSlug = invitation.customSlug || invitation.code;
              const invitationUrl = `${siteUrl}/${publicSlug}`;
              const customerAdminPath = managePathByCode.get(invitation.code) || `/${invitation.code}/ad_3399`;
              const clientAdminUrl = `${siteUrl}${customerAdminPath}`;
              const guestStats = guestStatsByCode.get(invitation.code) || { responses: 0, confirmed: 0, attendees: 0 };
              const invitationState = getInvitationState(invitation);
              const completeness = completenessByCode.get(invitation.code) || getInvitationCompleteness(invitation);
              return (
                <tr key={invitation.id}>
                  <td>
                    <strong>{invitation.code}</strong>
                    {invitation.customSlug ? <small className="admin-muted-line">/{invitation.customSlug}</small> : null}
                  </td>
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
                    <div className={completeness.isComplete ? "invitation-completeness done" : "invitation-completeness warning"}>
                      <strong>{formatArabicNumber(completeness.percentage)}%</strong>
                      <span className="invitation-completeness-track">
                        <span style={{ width: `${completeness.percentage}%` }} />
                      </span>
                      {!completeness.isComplete ? <small>ناقص: {completeness.missingLabels.join("، ")}</small> : <small>مكتملة</small>}
                    </div>
                  </td>
                  <td>
                    <span className={stateClassName(invitationState)}>{stateLabel(invitationState)}</span>
                  </td>
                  <td>
                    <div className="mini-links">
                      <span>{invitationUrl}</span>
                      <span>{clientAdminUrl}</span>
                    </div>
                    <form className="custom-slug-form" action={`/api/admin/invitations/${invitation.code}`} method="post">
                      <input type="hidden" name="action" value="custom-slug" />
                      <span>/</span>
                      <input name="customSlug" dir="ltr" defaultValue={invitation.customSlug || ""} placeholder={invitation.code} />
                      <button className="btn btn-soft" type="submit">حفظ</button>
                    </form>
                  </td>
                  <td>
                    <InternalNotesPanel
                      entityType="invitation"
                      entityId={invitation.code}
                      notes={notesByEntity.get(`invitation:${invitation.code}`) || []}
                      returnTo={returnTo}
                      compact
                    />
                  </td>
                  <td>
                    <div className="button-row">
                      <FavoriteToggleButton
                        entityType="invitation"
                        entityId={invitation.code}
                        label={`${invitation.groomName} و ${invitation.brideName}`}
                        href={customerAdminPath}
                        returnTo={returnTo}
                        active={isAdminFavorite(favorites, "invitation", invitation.code)}
                        iconOnly
                      />
                      <Link className="btn btn-soft btn-icon" href={`/${publicSlug}`} title="فتح الدعوة">
                        <Eye size={17} />
                      </Link>
                      <Link className="btn btn-soft btn-icon" href={customerAdminPath} title="تعديل الدعوة">
                        <Settings2 size={17} />
                      </Link>
                      <Link className="btn btn-soft btn-icon" href={customerAdminPath} title="فتح لوحة العميل">
                        <ExternalLink size={17} />
                      </Link>
                      <CopyButton className="btn btn-soft btn-icon" value={invitationUrl} title="نسخ رابط الدعوة" iconOnly />
                      <form action={`/api/admin/invitations/${invitation.code}`} method="post">
                        <button className="btn btn-soft btn-icon" name="action" value={invitation.isActive ? "pause" : "resume"} title={invitation.isActive ? "إيقاف الدعوة" : "تشغيل الدعوة"} type="submit">
                          {invitation.isActive ? <Pause size={17} /> : <Play size={17} />}
                        </button>
                      </form>
                      {invitationState !== "archived" ? (
                        <form action={`/api/admin/invitations/${invitation.code}`} method="post">
                          <button className="btn btn-soft btn-icon" name="action" value="archive" title="أرشفة الدعوة" type="submit">
                            <Archive size={17} />
                          </button>
                        </form>
                      ) : null}
                      <form action={`/api/admin/invitations/${invitation.code}`} method="post">
                        <button className="btn btn-soft btn-icon danger-button" name="action" value="delete" title="نقل الدعوة للمهملات" type="submit">
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
                <td colSpan={11}>
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
