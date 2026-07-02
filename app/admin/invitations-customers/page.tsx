import Link from "next/link";
import { headers } from "next/headers";
import { Archive, CalendarDays, Eye, Settings2, ShieldAlert, Sparkles, UserCheck, UsersRound, Phone, User, Activity } from "lucide-react";
import { getAdminCustomers, getAdminGuests, getAdminInvitations } from "@/lib/admin-data";
import { getAdminFavorites, isAdminFavorite } from "@/lib/admin-favorites";
import { getInvitationState, stateClassName, stateEmoji, stateLabel } from "@/lib/admin-crm-status";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { formatArabicNumber, getPublicSiteUrl } from "@/lib/utils";
import { AdminInvitationFiltersV2 } from "@/components/AdminInvitationFiltersV2";

export const dynamic = "force-dynamic";

type UnifiedListParams = {
  q?: string;
  state?: string;
  sort?: string;
  clientStatus?: string;
  status?: string;
  message?: string;
};

function formatAdminDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Cairo" }).format(date);
}

export default async function UnifiedInvitationsPage({ searchParams }: { searchParams: Promise<UnifiedListParams> }) {
  const [params, invitations, guests, customers, templates, requestHeaders, favorites] = await Promise.all([
    searchParams,
    getAdminInvitations(),
    getAdminGuests(),
    getAdminCustomers(),
    getTemplatesWithSettings(),
    headers(),
    getAdminFavorites(),
  ]);
  const siteUrl = getPublicSiteUrl(requestHeaders).replace(/\/$/, "");
  const query = (params.q || "").trim().toLowerCase();
  const selectedState = params.state || "all";
  const selectedSort = params.sort || "newest";
  const selectedClientStatus = params.clientStatus || "all";
  const customerMap = new Map(customers.map((c) => [c.id, c]));

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
      const customer = customerMap.get(invitation.customerId);
      const template = templates.find((item) => item.slug === invitation.templateSlug);
      const searchable = [
        invitation.code, invitation.customSlug, invitation.groomName, invitation.brideName,
        invitation.venue, invitation.city, template?.arabicName || invitation.templateSlug,
        customer?.name || "", customer?.phone || "", customer?.username || "",
      ].join(" ").toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesState = selectedState === "all" || state === selectedState;
      const matchesClientStatus = selectedClientStatus === "all" ||
        (selectedClientStatus === "active" && customer?.isActive) ||
        (selectedClientStatus === "inactive" && !customer?.isActive);
      return matchesSearch && matchesState && matchesClientStatus;
    })
    .map((inv) => ({ ...inv, _weddingDate: new Date(inv.weddingDate).getTime() }))
    .sort((a, b) => {
      if (selectedSort === "views") return b.views - a.views;
      if (selectedSort === "weddingDate") return a._weddingDate - b._weddingDate;
      if (selectedSort === "attendees") return (guestStatsByCode.get(b.code)?.attendees || 0) - (guestStatsByCode.get(a.code)?.attendees || 0);
      return 0;
    });

  const activeCount = invitations.filter((inv) => getInvitationState(inv) === "active").length;
  const pausedCount = invitations.filter((inv) => getInvitationState(inv) === "paused").length;
  const disabledCount = invitations.filter((inv) => getInvitationState(inv) === "disabled").length;
  const trialCount = invitations.filter((inv) => getInvitationState(inv) === "trial").length;
  const expiredCount = invitations.filter((inv) => getInvitationState(inv) === "expired").length;
  const totalViews = invitations.reduce((sum, inv) => sum + inv.views, 0);
  const expectedGuests = [...guestStatsByCode.values()].reduce((sum, item) => sum + item.attendees, 0);
  const activeCustomers = customers.filter((c) => c.isActive).length;

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Invitations & Customers</span>
          <h1>الدعوات والعملاء</h1>
          <p>قسم موحد يجمع الدعوات والعملاء معاً: بيانات الدعوة، معلومات العميل، الإحصائيات، والإجراءات في مكان واحد (تجريبي).</p>
        </div>
        <div className="button-row">
          <Link className="btn btn-gold" href="/admin/new-invitation">
            <Sparkles size={18} />
            دعوة جديدة
          </Link>
          <Link className="btn btn-soft" href="/admin/customers">
            <UsersRound size={18} />
            العملاء
          </Link>
        </div>
      </div>

      <section className="admin-list-overview" aria-label="ملخص الدعوات الموحد">
        <div className="admin-list-stat">
          <Archive size={19} />
          <span>كل الدعوات</span>
          <strong>{formatArabicNumber(invitations.length)}</strong>
        </div>
        <div className="admin-list-stat good">
          <UsersRound size={19} />
          <span>كل العملاء</span>
          <strong>{formatArabicNumber(customers.length)}</strong>
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
          <span>دعوات نشطة</span>
          <strong>{formatArabicNumber(activeCount)}</strong>
        </div>
        <div className="admin-list-stat good">
          <User size={19} />
          <span>عملاء نشطين</span>
          <strong>{formatArabicNumber(activeCustomers)}</strong>
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
          <span>منتهية</span>
          <strong>{formatArabicNumber(expiredCount)}</strong>
        </div>
      </section>

      <AdminInvitationFiltersV2 query={query} selectedState={selectedState} selectedSort={selectedSort} selectedClientStatus={selectedClientStatus} />

      {filteredInvitations.length ? (
        <div className="admin-invitation-table-wrapper">
          <table className="admin-invitation-table unified-invitation-table">
            <thead>
              <tr>
                <th className="col-state"></th>
                <th className="col-name">اسم الدعوة</th>
                <th className="col-customer">العميل</th>
                <th className="col-date">تاريخ الحفل</th>
                <th className="col-views">الزيارات</th>
                <th className="col-status">حالة الدعوة</th>
                <th className="col-client-status">حالة العميل</th>
                <th className="col-actions">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvitations.map((invitation) => {
                const customer = customerMap.get(invitation.customerId);
                const invitationState = getInvitationState(invitation);
                const publicSlug = invitation.customSlug || invitation.code;
                const invitationUrl = `${siteUrl}/${publicSlug}`;
                const rowIsFavorite = isAdminFavorite(favorites, "invitation", invitation.code);
                return (
                  <tr key={invitation.id} className="admin-invitation-row unified-row">
                    <td className="cell-state">
                      <span className={`state-dot ${stateClassName(invitationState).replace("status ", "")}`}>{stateEmoji(invitationState)}</span>
                    </td>
                    <td className="cell-name" data-label="اسم الدعوة">
                      <div className="admin-name-content">
                        <span className="inv-code">{invitation.code}</span>
                        <Link href={`/admin/invitations-customers/${encodeURIComponent(invitation.code)}`}>
                          <strong>{invitation.groomName} و {invitation.brideName}</strong>
                        </Link>
                      </div>
                    </td>
                    <td className="cell-customer" data-label="العميل">
                      {customer ? (
                        <div className="customer-info-cell">
                          <span className="customer-name">{customer.name}</span>
                          <span className="customer-phone">{customer.phone}</span>
                          <small className="customer-username">{customer.username}</small>
                        </div>
                      ) : (
                        <span className="text-danger">غير مرتبط</span>
                      )}
                    </td>
                    <td className="cell-date" data-label="تاريخ الحفل">{formatAdminDate(invitation.weddingDate)}</td>
                    <td className="cell-views" data-label="الزيارات">{formatArabicNumber(invitation.views)}</td>
                    <td className="cell-status" data-label="حالة الدعوة">
                      <span className={stateClassName(invitationState)}>{stateLabel(invitationState)}</span>
                    </td>
                    <td className="cell-client-status" data-label="حالة العميل">
                      <span className={customer?.isActive ? "status success" : "status danger"}>
                        {customer?.isActive ? "نشط" : "متوقف"}
                      </span>
                    </td>
                    <td className="cell-actions" data-label="الإجراءات">
                      <div className="admin-row-actions">
                        <Link className="btn btn-sm btn-gold" href={`/admin/invitations-customers/${encodeURIComponent(invitation.code)}`}>
                          <Settings2 size={16} />
                          إدارة
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty-state compact">
          <strong>لا توجد دعوات مطابقة</strong>
          <p>جرّب تغيير البحث أو الفلاتر.</p>
        </div>
      )}
    </>
  );
}
