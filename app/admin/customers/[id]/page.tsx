import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Archive, Bell, CalendarDays, ExternalLink, Mail, MessageSquareText, Phone, ShieldAlert, StickyNote, User, UsersRound } from "lucide-react";
import { ClientCustomerEditor } from "@/components/ClientCustomerEditor";
import { CopyButton } from "@/components/CopyButton";
import { InternalNotesPanel } from "@/components/InternalNotesPanel";
import { getAdminCustomerProfile } from "@/lib/admin-crm";
import { getInvitationState, stateClassName, stateLabel } from "@/lib/admin-crm-status";
import { formatArabicNumber, getPublicSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeZone: "Africa/Cairo" }).format(date);
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(date);
}

function invitationStateFor(invitation: {
  status: string;
  weddingDate: Date;
  disabledAt?: Date | null;
  disabledBy?: string | null;
  trialEndsAt?: Date | null;
}) {
  return getInvitationState({
    isActive: invitation.status === "ACTIVE" && !invitation.disabledAt,
    status: invitation.status,
    weddingDate: invitation.weddingDate.toISOString(),
    disabledAt: invitation.disabledAt?.toISOString(),
    disabledBy: invitation.disabledBy || undefined,
    trialEndsAt: invitation.trialEndsAt?.toISOString(),
  });
}

export default async function CustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, requestHeaders] = await Promise.all([params, headers()]);
  const profile = await getAdminCustomerProfile(id);
  if (!profile) notFound();

  const siteUrl = getPublicSiteUrl(requestHeaders).replace(/\/$/, "");
  const returnTo = `/admin/customers/${encodeURIComponent(profile.customer.id)}`;

  return (
    <section className="admin-customer-profile">
      <div className="dashboard-head customer-profile-head">
        <div>
          <Link className="admin-back-link" href="/admin/customers">العودة للعملاء</Link>
          <span className="eyebrow">Customer 360</span>
          <h1>{profile.customer.name}</h1>
          <p>ملف موحد يعرض بيانات العميل، دعواته، طلباته، رسائله، الملاحظات، ونقاط جودة البيانات.</p>
        </div>
        <div className="button-row">
          <span className={profile.customer.isActive ? "status success" : "status danger"}>{profile.customer.isActive ? "نشط" : "متوقف"}</span>
          <Link className="btn btn-gold" href={`/admin/new-invitation?customerId=${encodeURIComponent(profile.customer.id)}`}>
            <Archive size={17} />
            دعوة جديدة
          </Link>
          <Link className="btn btn-soft" href={`/admin/messages?q=${encodeURIComponent(profile.customer.username)}`}>
            <MessageSquareText size={17} />
            الرسائل
          </Link>
        </div>
      </div>

      <section className="customer-profile-hero">
        <article className="customer-profile-card primary">
          <div className="customer-profile-avatar">
            <User size={24} />
          </div>
          <div>
            <span>العميل</span>
            <strong>{profile.customer.name}</strong>
            <small>{profile.customer.username}</small>
          </div>
        </article>
        <article className="customer-profile-card">
          <Phone size={19} />
          <span>الهاتف</span>
          <strong dir="ltr">{profile.customer.phone || "غير مسجل"}</strong>
          {profile.customer.phone ? <CopyButton value={profile.customer.phone} label="نسخ" /> : null}
        </article>
        <article className="customer-profile-card">
          <Mail size={19} />
          <span>البريد</span>
          <strong dir="ltr">{profile.customer.email || "غير مسجل"}</strong>
        </article>
        <article className="customer-profile-card">
          <CalendarDays size={19} />
          <span>تاريخ التسجيل</span>
          <strong>{formatDate(profile.customer.createdAt)}</strong>
        </article>
      </section>

      {profile.qualityFlags.length ? (
        <section className="customer-quality-strip" aria-label="مؤشرات جودة بيانات العميل">
          <ShieldAlert size={18} />
          <strong>بيانات تحتاج مراجعة</strong>
          {profile.qualityFlags.map((flag) => (
            <span className={`status ${flag.severity === "danger" ? "danger" : "warning"}`} key={flag.key}>{flag.label}</span>
          ))}
        </section>
      ) : null}

      <section className="admin-list-overview customer-profile-stats">
        <article className="admin-list-stat">
          <Archive size={19} />
          <span>الدعوات</span>
          <strong>{formatArabicNumber(profile.stats.invitations)}</strong>
        </article>
        <article className="admin-list-stat">
          <UsersRound size={19} />
          <span>الحضور المؤكد</span>
          <strong>{formatArabicNumber(profile.stats.confirmedGuests)}</strong>
        </article>
        <article className="admin-list-stat">
          <MessageSquareText size={19} />
          <span>الرسائل</span>
          <strong>{formatArabicNumber(profile.stats.messages)}</strong>
        </article>
        <article className="admin-list-stat warning">
          <Bell size={19} />
          <span>غير مقروءة</span>
          <strong>{formatArabicNumber(profile.stats.unreadMessages)}</strong>
        </article>
      </section>

      <div className="customer-profile-layout">
        <main className="customer-profile-main">
          <section className="invitation-detail-section" id="invitations">
            <div className="invitation-detail-section-head">
              <div>
                <span className="eyebrow">Invitations</span>
                <h2>دعوات العميل</h2>
              </div>
            </div>
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>الدعوة</th>
                    <th>التاريخ</th>
                    <th>الحالة</th>
                    <th>الروابط</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.invitations.map((invitation) => {
                    const state = invitationStateFor(invitation);
                    const publicSlug = invitation.customSlug || invitation.code;
                    const publicUrl = `${siteUrl}/${publicSlug}`;
                    return (
                      <tr key={invitation.id}>
                        <td>
                          <Link href={`/admin/invitations-customers/${encodeURIComponent(invitation.code)}`}>
                            <strong>{invitation.groomName} و {invitation.brideName}</strong>
                          </Link>
                          <small>{invitation.code}</small>
                        </td>
                        <td>{formatDate(invitation.weddingDate)}</td>
                        <td><span className={stateClassName(state)}>{stateLabel(state)}</span></td>
                        <td>
                          <div className="button-row">
                            <Link className="btn btn-soft btn-sm" href={`/${publicSlug}`}>
                              <ExternalLink size={15} />
                              فتح
                            </Link>
                            <CopyButton value={publicUrl} label="نسخ" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!profile.invitations.length ? (
                    <tr><td colSpan={4}>لا توجد دعوات مرتبطة بهذا العميل.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="invitation-detail-section" id="orders">
            <div className="invitation-detail-section-head">
              <div>
                <span className="eyebrow">Orders</span>
                <h2>طلبات العميل</h2>
              </div>
              <Link className="btn btn-soft" href="/admin/orders">فتح الطلبات</Link>
            </div>
            <div className="customer-mini-list">
              {profile.orders.map((order) => (
                <article className="customer-mini-card" key={order.id}>
                  <div>
                    <strong>{order.groomName} و {order.brideName}</strong>
                    <span>{order.orderNumber || order.id}</span>
                  </div>
                  <span className="status">{String(order.status)}</span>
                  <small>{formatDateTime(order.submittedAt || order.createdAt)}</small>
                </article>
              ))}
              {!profile.orders.length ? <p className="admin-muted-paragraph">لا توجد طلبات محفوظة لهذا العميل.</p> : null}
            </div>
          </section>

          <section className="invitation-detail-section" id="timeline">
            <div className="invitation-detail-section-head">
              <div>
                <span className="eyebrow">Timeline</span>
                <h2>سجل النشاط</h2>
              </div>
            </div>
            <div className="customer-timeline">
              {profile.timeline.slice(0, 30).map((item) => (
                <article className={`customer-timeline-item ${item.kind}`} key={item.id}>
                  <time>{formatDateTime(item.createdAt)}</time>
                  <div>
                    {item.href ? <Link href={item.href}><strong>{item.title}</strong></Link> : <strong>{item.title}</strong>}
                    {item.description ? <p>{item.description}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>

        <aside className="customer-profile-side">
          <section className="invitation-detail-section">
            <div className="invitation-detail-section-head">
              <div>
                <span className="eyebrow">Customer</span>
                <h2>تعديل بيانات العميل</h2>
              </div>
            </div>
            <ClientCustomerEditor
              customerId={profile.customer.id}
              currentName={profile.customer.name}
              currentPhone={profile.customer.phone}
              currentEmail={profile.customer.email || ""}
              currentIsActive={profile.customer.isActive}
              returnTo={returnTo}
            />
          </section>

          <InternalNotesPanel
            entityType="customer"
            entityId={profile.customer.id}
            notes={profile.notes.map((note) => ({
              id: note.id,
              entityType: "customer",
              entityId: profile.customer.id,
              body: note.body,
              authorLabel: note.authorLabel,
              createdAt: note.createdAt.toISOString(),
              updatedAt: note.updatedAt.toISOString(),
            }))}
            title="ملاحظات العميل"
            returnTo={returnTo}
          />

          <section className="invitation-detail-section">
            <div className="invitation-detail-section-head">
              <div>
                <span className="eyebrow">Messages</span>
                <h2>آخر الرسائل</h2>
              </div>
              <StickyNote size={18} />
            </div>
            <div className="customer-mini-list">
              {profile.messages.slice(0, 8).map((message) => (
                <article className="customer-mini-card" key={message.id}>
                  <div>
                    <strong>{message.title}</strong>
                    <span>{message.body}</span>
                  </div>
                  <span className={message.readAt ? "status success" : "status warning"}>{message.readAt ? "مقروءة" : "غير مقروءة"}</span>
                </article>
              ))}
              {!profile.messages.length ? <p className="admin-muted-paragraph">لا توجد رسائل لهذا العميل بعد.</p> : null}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
