import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Archive, CalendarDays, CheckCircle2, Copy, Edit, ExternalLink, Eye, Link2, Mail, Music2, Pause, Phone, Play, Save, Settings2, ShieldAlert, StickyNote, Trash2, User, UserCheck, UsersRound, X } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { CopySuccessButton } from "@/components/CopySuccessButton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { InternalNotesPanel } from "@/components/InternalNotesPanel";
import { getAdminCustomers, getAdminGuests, getAdminInvitations } from "@/lib/admin-data";
import { getAdminFavorites, isAdminFavorite } from "@/lib/admin-favorites";
import { getInvitationState, stateClassName, stateLabel } from "@/lib/admin-crm-status";
import { getGuestBookMessages } from "@/lib/guest-book";
import { getInternalNotesForEntity } from "@/lib/internal-notes";
import { getInvitationManagePath } from "@/lib/invitation-manage-token";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { formatArabicNumber, getPublicSiteUrl } from "@/lib/utils";
import { ClientCustomerEditor } from "@/components/ClientCustomerEditor";

export const dynamic = "force-dynamic";

function formatAdminDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Cairo" }).format(date);
}

function formatAdminDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(date);
}

export default async function UnifiedInvitationDetailsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const cleanCode = decodeURIComponent(code || "").trim();
  const [invitations, guests, customers, templates, notes, favorites, messages, requestHeaders] = await Promise.all([
    getAdminInvitations(),
    getAdminGuests(),
    getAdminCustomers(),
    getTemplatesWithSettings(),
    getInternalNotesForEntity("invitation", cleanCode),
    getAdminFavorites({ entityType: "invitation" }),
    getGuestBookMessages(cleanCode, "all"),
    headers(),
  ]);
  const invitation = invitations.find((item) => item.code.toLowerCase() === cleanCode.toLowerCase());
  if (!invitation) notFound();

  const siteUrl = getPublicSiteUrl(requestHeaders).replace(/\/$/, "");
  const publicSlug = invitation.customSlug || invitation.code;
  const invitationUrl = `${siteUrl}/${publicSlug}`;
  const customerAdminPath = await getInvitationManagePath(invitation.code);
  const clientAdminUrl = `${siteUrl}${customerAdminPath}`;
  const invitationGuests = guests.filter((guest) => guest.invitationCode.toLowerCase() === invitation.code.toLowerCase());
  const confirmedGuests = invitationGuests.filter((guest) => guest.status === "confirmed");
  const confirmedAttendees = confirmedGuests.reduce((sum, guest) => sum + Math.max(1, guest.attendees || 1), 0);
  const template = templates.find((item) => item.slug === invitation.templateSlug);
  const invitationState = getInvitationState(invitation);
  const returnTo = `/admin/invitations-customers/${encodeURIComponent(invitation.code)}`;
  const approvedMessages = messages.filter((message) => message.status === "approved").length;

  // Customer data
  const customer = customers.find((c) => c.id === invitation.customerId);
  const customerOtherInvitations = customer
    ? invitations.filter((inv) => inv.customerId === customer.id && inv.code.toLowerCase() !== cleanCode.toLowerCase())
    : [];
  const customerNotes = customer
    ? await getInternalNotesForEntity("customer", customer.id).catch(() => [])
    : [];

  return (
    <>
      {invitation.disabledAt ? (
        <div className="disabled-invitation-alert">
          <ShieldAlert size={22} />
          <div>
            <strong>الدعوة معطلة</strong>
            {invitation.disabledReason ? <p>سبب التعطيل: {invitation.disabledReason}</p> : null}
            <p className="disabled-meta">
              {invitation.disabledBy ? <span>بواسطة: {invitation.disabledBy}</span> : null}
              <span>بتاريخ: {formatAdminDateTime(invitation.disabledAt)}</span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="dashboard-head invitation-detail-head">
        <div>
          <Link className="admin-back-link" href="/admin/invitations-customers">العودة للقائمة الموحدة</Link>
          <span className="eyebrow">Invitations & Customers</span>
          <h1>{invitation.groomName} و {invitation.brideName}</h1>
          <p>صفحة موحدة تجمع تفاصيل الدعوة ومعلومات العميل وإجراءات الإدارة كاملة (تجريبي).</p>
        </div>
        <div className="button-row">
          <span className={stateClassName(invitationState)}><span className={`status-dot ${invitationState}`} />{stateLabel(invitationState)}</span>
          <Link className="btn btn-soft" href={`/${publicSlug}`}>
            <Eye size={17} />
            عرض الدعوة
          </Link>
          <Link className="btn btn-gold" href={customerAdminPath}>
            <ExternalLink size={17} />
            لوحة العميل
          </Link>
        </div>
      </div>

      <nav className="invitation-detail-tabs" aria-label="أقسام الإدارة الموحدة">
        <a href="#customer">العميل</a>
        <a href="#stats">الإحصائيات</a>
        <a href="#guests">الضيوف</a>
        <a href="#guest-book">التهاني</a>
        <a href="#music">الموسيقى</a>
        <a href="#notes">الملاحظات</a>
        <a href="#settings">الإعدادات</a>
        <a href="#links">الروابط</a>
      </nav>

      {/* Customer Section - NEW */}
      <section className="invitation-detail-section unified-section-card" id="customer" aria-label="بيانات العميل">
        <div className="invitation-detail-section-head">
          <div>
            <span className="eyebrow">Customer</span>
            <h2>بيانات العميل</h2>
          </div>
          <User size={18} />
        </div>
        {customer ? (
          <div className="customer-card unified-customer-card">
            <div className="customer-card-header">
              <div className="customer-avatar">
                <User size={24} />
              </div>
              <div className="customer-primary-info">
                <strong className="customer-name">{customer.name}</strong>
                <span className={customer.isActive ? "status success" : "status danger"}>
                  {customer.isActive ? "نشط" : "متوقف"}
                </span>
              </div>
            </div>
            <div className="customer-details-grid">
              <div className="customer-detail-item">
                <Phone size={16} />
                <span>الهاتف</span>
                <strong dir="ltr">{customer.phone}</strong>
              </div>
              <div className="customer-detail-item">
                <User size={16} />
                <span>اسم الدخول</span>
                <strong>{customer.username}</strong>
              </div>
              {customer.email ? (
                <div className="customer-detail-item">
                  <Mail size={16} />
                  <span>البريد</span>
                  <strong>{customer.email}</strong>
                </div>
              ) : null}
              <div className="customer-detail-item">
                <CalendarDays size={16} />
                <span>تاريخ التسجيل</span>
                <strong>{formatAdminDate(customer.createdAt)}</strong>
              </div>
              <div className="customer-detail-item">
                <Archive size={16} />
                <span>عدد الدعوات</span>
                <strong>{customerOtherInvitations.length + 1}</strong>
              </div>
            </div>
            <div className="customer-actions-row">
              <ClientCustomerEditor
                customerId={customer.id}
                currentName={customer.name}
                currentPhone={customer.phone}
                currentEmail={customer.email || ""}
                currentIsActive={customer.isActive}
                returnTo={returnTo}
              />
            </div>
            {customerOtherInvitations.length > 0 ? (
              <details className="customer-other-invitations">
                <summary className="btn btn-soft">
                  <Archive size={16} />
                  دعوات أخرى للعميل ({customerOtherInvitations.length})
                </summary>
                <div className="customer-other-invitations-list">
                  {customerOtherInvitations.map((other) => {
                    const otherState = getInvitationState(other);
                    return (
                      <Link key={other.id} href={`/admin/invitations-customers/${encodeURIComponent(other.code)}`} className="other-invitation-item">
                        <span className={`status-dot ${stateClassName(otherState).replace("status ", "")}`} />
                        <strong>{other.groomName} و {other.brideName}</strong>
                        <span className={stateClassName(otherState)}>{stateLabel(otherState)}</span>
                        <small>{formatAdminDate(other.weddingDate)}</small>
                      </Link>
                    );
                  })}
                </div>
              </details>
            ) : null}
            <div className="customer-notes-section">
              <InternalNotesPanel entityType="customer" entityId={customer.id} notes={customerNotes} returnTo={returnTo} />
            </div>
          </div>
        ) : (
          <div className="admin-empty-state compact">
            <strong>العميل غير موجود</strong>
            <p>لم يتم العثور على العميل المرتبط بهذه الدعوة.</p>
          </div>
        )}
      </section>

      {/* Stats Section */}
      <section className="invitation-detail-grid" id="stats" aria-label="إحصائيات الدعوة">
        <article className="invitation-detail-stat">
          <Eye size={19} />
          <span>الزيارات</span>
          <strong>{formatArabicNumber(invitation.views)}</strong>
        </article>
        <article className="invitation-detail-stat">
          <UsersRound size={19} />
          <span>ردود RSVP</span>
          <strong>{formatArabicNumber(invitationGuests.length)}</strong>
        </article>
        <article className="invitation-detail-stat">
          <UserCheck size={19} />
          <span>حضور مؤكد</span>
          <strong>{formatArabicNumber(confirmedAttendees)}</strong>
        </article>
        <article className="invitation-detail-stat">
          <CalendarDays size={19} />
          <span>تاريخ الحفل</span>
          <strong>{formatAdminDate(invitation.weddingDate)}</strong>
        </article>
      </section>

      <div className="invitation-detail-sections">
        <section className="invitation-detail-section" id="guests">
          <div className="invitation-detail-section-head">
            <div>
              <span className="eyebrow">Guests</span>
              <h2>الضيوف</h2>
            </div>
            <Link className="btn btn-soft" href="/admin/attendance">
              <UsersRound size={17} />
              صفحة الحضور
            </Link>
          </div>
          <div className="invitation-guest-list">
            {invitationGuests.slice(0, 12).map((guest) => (
              <article className="invitation-guest-card" key={guest.id}>
                <div>
                  <strong>{guest.name}</strong>
                  <span>{guest.phone}</span>
                </div>
                <span className={guest.status === "confirmed" ? "status success" : "status warning"}>{guest.status === "confirmed" ? "مؤكد" : "اعتذار"}</span>
                <small>{formatArabicNumber(guest.attendees)} فرد</small>
                {guest.note ? <p>{guest.note}</p> : null}
              </article>
            ))}
            {!invitationGuests.length ? <p className="admin-muted-paragraph">لا توجد ردود RSVP لهذه الدعوة بعد.</p> : null}
          </div>
        </section>

        <section className="invitation-detail-section" id="guest-book">
          <div className="invitation-detail-section-head">
            <div>
              <span className="eyebrow">Guest Book</span>
              <h2>التهاني</h2>
            </div>
            <Link className="btn btn-soft" href="/admin/guest-book">
              <ExternalLink size={17} />
              إدارة الرسائل
            </Link>
          </div>
          <div className="invitation-message-summary">
            <span>كل الرسائل: <strong>{formatArabicNumber(messages.length)}</strong></span>
            <span>المعتمدة: <strong>{formatArabicNumber(approvedMessages)}</strong></span>
          </div>
          <div className="invitation-message-list">
            {messages.slice(0, 8).map((message) => (
              <article className="invitation-message-card" key={message.id}>
                <div>
                  <strong>{message.name}</strong>
                  <span className={message.status === "approved" ? "status success" : message.status === "pending" ? "status warning" : "status danger"}>{message.status === "approved" ? "معتمدة" : message.status === "pending" ? "بانتظار المراجعة" : "مرفوضة"}</span>
                </div>
                <p>{message.message}</p>
                <time>{formatAdminDateTime(message.createdAt)}</time>
              </article>
            ))}
            {!messages.length ? <p className="admin-muted-paragraph">لا توجد رسائل تهنئة لهذه الدعوة بعد.</p> : null}
          </div>
        </section>

        <section className="invitation-detail-section" id="music">
          <div className="invitation-detail-section-head">
            <div>
              <span className="eyebrow">Music</span>
              <h2>الموسيقى</h2>
            </div>
            <Link className="btn btn-soft" href="/admin/music">
              <Music2 size={17} />
              مكتبة الموسيقى
            </Link>
          </div>
          <div className="invitation-detail-info-list">
            <div>
              <span>الحالة</span>
              <strong>{invitation.musicEnabled ? "مفعلة" : "غير مفعلة"}</strong>
            </div>
            <div>
              <span>الرابط الحالي</span>
              <strong dir="ltr">{invitation.musicUrl || "لا يوجد رابط موسيقى محفوظ"}</strong>
            </div>
          </div>
        </section>

        <section className="invitation-detail-section" id="notes">
          <div className="invitation-detail-section-head">
            <div>
              <span className="eyebrow">Internal Notes</span>
              <h2>الملاحظات</h2>
            </div>
            <StickyNote size={18} />
          </div>
          <InternalNotesPanel entityType="invitation" entityId={invitation.code} notes={notes} returnTo={returnTo} />
        </section>

        <section className="invitation-detail-section" id="settings">
          <div className="invitation-detail-section-head">
            <div>
              <span className="eyebrow">Settings</span>
              <h2>الإعدادات</h2>
            </div>
            <Settings2 size={18} />
          </div>
          <div className="invitation-detail-info-list">
            <div>
              <span>الكود</span>
              <strong>{invitation.code}</strong>
            </div>
            <div>
              <span>القالب</span>
              <strong>{template?.arabicName || invitation.templateSlug}</strong>
            </div>
            <div>
              <span>المكان</span>
              <strong>{[invitation.venue, invitation.city].filter(Boolean).join(" - ") || "غير محدد"}</strong>
            </div>
            <div>
              <span>وقت الحفل</span>
              <strong>{invitation.weddingTime || "غير محدد"}</strong>
            </div>
          </div>
          {invitation.disabledAt ? (
            <div className="disabled-info-box">
              <span className="status danger">معطلة</span>
              {invitation.disabledReason ? <p>{invitation.disabledReason}</p> : null}
              <div className="disabled-info-meta">
                {invitation.disabledBy ? <span>بواسطة: {invitation.disabledBy}</span> : null}
                <span>بتاريخ: {formatAdminDateTime(invitation.disabledAt)}</span>
              </div>
              <form action={`/api/admin/invitations/${invitation.code}`} method="post">
                <button className="btn btn-soft" name="action" value="enable" type="submit">
                  <Play size={17} />
                  إعادة تفعيل الدعوة
                </button>
              </form>
            </div>
          ) : (
            <details className="admin-disable-form">
              <summary className="btn btn-soft danger-button">
                <ShieldAlert size={17} />
                تعطيل الدعوة
              </summary>
              <form action={`/api/admin/invitations/${invitation.code}`} method="post" className="admin-disable-form-body">
                <textarea name="disabledReason" rows={3} placeholder="سبب التعطيل (سيظهر للزائرين)" required />
                <button className="btn btn-danger" name="action" value="disable" type="submit">
                  تأكيد التعطيل
                </button>
              </form>
            </details>
          )}
          <div className="invitation-detail-actions">
            <FavoriteToggleButton
              entityType="invitation"
              entityId={invitation.code}
              label={`${invitation.groomName} و ${invitation.brideName}`}
              href={returnTo}
              returnTo={returnTo}
              active={isAdminFavorite(favorites, "invitation", invitation.code)}
            />
            {!invitation.disabledAt ? (
              <form action={`/api/admin/invitations/${invitation.code}`} method="post">
                <button className="btn btn-soft" name="action" value={invitation.isActive ? "pause" : "resume"} type="submit">
                  {invitation.isActive ? <Pause size={17} /> : <Play size={17} />}
                  {invitation.isActive ? "إيقاف الدعوة" : "تشغيل الدعوة"}
                </button>
              </form>
            ) : null}
            {invitationState !== "archived" ? (
              <form action={`/api/admin/invitations/${invitation.code}`} method="post">
                <button className="btn btn-soft" name="action" value="archive" type="submit">
                  <Archive size={17} />
                  أرشفة الدعوة
                </button>
              </form>
            ) : null}
            <form action={`/api/admin/invitations/${invitation.code}`} method="post">
              <button className="btn btn-soft danger-button" name="action" value="delete" type="submit">
                <Trash2 size={17} />
                نقل للمهملات
              </button>
            </form>
          </div>
        </section>

        <section className="invitation-detail-section" id="links">
          <div className="invitation-detail-section-head">
            <div>
              <span className="eyebrow">Links</span>
              <h2>الروابط</h2>
            </div>
            <Link2 size={18} />
          </div>
          <div className="invitation-link-list">
            <div>
              <span>رابط الدعوة</span>
              <strong dir="ltr">{invitationUrl}</strong>
              <CopyButton value={invitationUrl} label="نسخ" />
            </div>
            <div>
              <span>رابط لوحة العميل</span>
              <strong dir="ltr">{clientAdminUrl}</strong>
              <CopyButton value={clientAdminUrl} label="نسخ" />
            </div>
          </div>
          <div className="invitation-success-copy-row">
            <CopySuccessButton publicUrl={invitationUrl} adminUrl={clientAdminUrl} />
          </div>
          <form className="custom-slug-form invitation-custom-slug-form" action={`/api/admin/invitations/${invitation.code}`} method="post">
            <input type="hidden" name="action" value="custom-slug" />
            <span>/</span>
            <input name="customSlug" dir="ltr" defaultValue={invitation.customSlug || ""} placeholder={invitation.code} />
            <button className="btn btn-soft" type="submit">
              <Copy size={17} />
              حفظ الرابط المخصص
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
