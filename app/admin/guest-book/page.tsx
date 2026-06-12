import Link from "next/link";
import { CheckCircle2, Filter, MessageCircleHeart, Pencil, Search, Trash2, XCircle } from "lucide-react";
import { ConfirmingSubmitButton } from "@/components/ConfirmingSubmitButton";
import { getAdminInvitations } from "@/lib/admin-data";
import { getAllCoupleMessagesSettings, getAllGuestBookMessages } from "@/lib/guest-book";
import type { GuestBookMessage, GuestBookMode, GuestBookStatus } from "@/lib/types";
import { formatArabicNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

type GuestBookPageParams = {
  q?: string;
  status?: GuestBookStatus | "all";
  invitation?: string;
  saved?: string;
  error?: string;
};

const statusLabels: Record<GuestBookStatus, string> = {
  pending: "بانتظار الموافقة",
  approved: "منشورة",
  rejected: "مرفوضة",
};

const modeLabels: Record<GuestBookMode, string> = {
  disabled: "تعطيل القسم",
  auto: "نشر تلقائي",
  moderated: "مراجعة قبل النشر",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function notice(saved?: string, error?: string) {
  if (saved === "approve") return { kind: "success", text: "تم نشر رسالة التهنئة داخل الدعوة." };
  if (saved === "reject") return { kind: "success", text: "تم رفض رسالة التهنئة." };
  if (saved === "delete") return { kind: "success", text: "تم حذف رسالة التهنئة." };
  if (saved === "bulk-delete") return { kind: "success", text: "تم حذف الرسائل المحددة ضمن العملية الجماعية." };
  if (saved === "bulk-approve") return { kind: "success", text: "تم اعتماد الرسائل المعلقة ضمن العملية الجماعية." };
  if (saved === "edit") return { kind: "success", text: "تم تعديل رسالة العروسين." };
  if (saved === "settings") return { kind: "success", text: "تم حفظ إعدادات رسائل العروسين لهذه الدعوة." };
  if (error) return { kind: "danger", text: "تعذر تنفيذ العملية المطلوبة." };
  return null;
}

function matchesMessage(message: GuestBookMessage, query: string, invitationTitle: string) {
  if (!query) return true;
  const haystack = [message.name, message.message, message.invitationCode, invitationTitle].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export default async function AdminGuestBookPage({ searchParams }: { searchParams: Promise<GuestBookPageParams> }) {
  const params = await searchParams;
  const [messages, invitations, allSettings] = await Promise.all([getAllGuestBookMessages(), getAdminInvitations(), getAllCoupleMessagesSettings()]);
  const invitationMap = new Map(invitations.map((invitation) => [invitation.code, `${invitation.groomName} و ${invitation.brideName}`]));
  const settingsMap = new Map(allSettings.map((setting) => [setting.invitationCode, setting.mode]));
  const status = params.status || "all";
  const selectedInvitation = params.invitation || "";
  const query = params.q?.trim() || "";
  const settingsInvitationCode = selectedInvitation || invitations[0]?.code || "";
  const filtered = messages.filter((message) => {
    const invitationTitle = invitationMap.get(message.invitationCode) || message.invitationCode;
    const matchesStatus = status === "all" || message.status === status;
    const matchesInvitation = !selectedInvitation || message.invitationCode === selectedInvitation;
    return matchesStatus && matchesInvitation && matchesMessage(message, query, invitationTitle);
  });
  const stats = {
    total: messages.length,
    pending: messages.filter((message) => message.status === "pending").length,
    approved: messages.filter((message) => message.status === "approved").length,
    rejected: messages.filter((message) => message.status === "rejected").length,
  };
  const invitationCounts = new Map<string, number>();
  messages.forEach((message) => invitationCounts.set(message.invitationCode, (invitationCounts.get(message.invitationCode) || 0) + 1));
  const pageNotice = notice(params.saved, params.error);

  return (
    <section className="admin-command-center guest-book-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Couple Messages</span>
          <h1>كلمات وذكريات للعرسان ❤️</h1>
          <p>مكان موحد لرسائل وتهاني الضيوف، مع صور اختيارية ومراجعة قبل النشر أو نشر تلقائي حسب إعداد كل دعوة.</p>
        </div>
      </div>

      {pageNotice ? <div className={pageNotice.kind === "danger" ? "notice danger" : "notice success"}>{pageNotice.text}</div> : null}

      <div className="admin-list-overview">
        <article className="admin-list-stat">
          <MessageCircleHeart size={19} />
          <span>كل الرسائل</span>
          <strong>{formatArabicNumber(stats.total)}</strong>
        </article>
        <article className="admin-list-stat warning">
          <Filter size={19} />
          <span>بانتظار الموافقة</span>
          <strong>{formatArabicNumber(stats.pending)}</strong>
        </article>
        <article className="admin-list-stat good">
          <CheckCircle2 size={19} />
          <span>منشورة</span>
          <strong>{formatArabicNumber(stats.approved)}</strong>
        </article>
        <article className="admin-list-stat">
          <XCircle size={19} />
          <span>مرفوضة</span>
          <strong>{formatArabicNumber(stats.rejected)}</strong>
        </article>
      </div>

      <section className="panel">
        {settingsInvitationCode ? (
          <form className="couple-messages-settings-panel" action="/api/admin/guest-book" method="post">
            <input type="hidden" name="action" value="settings" />
            <label className="admin-select-field">
              <span>إعدادات دعوة</span>
              <select name="invitationCode" defaultValue={settingsInvitationCode}>
                {invitations.map((invitation) => (
                  <option key={invitation.code} value={invitation.code}>
                    {invitation.groomName} و {invitation.brideName}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-select-field">
              <span>طريقة النشر</span>
              <select name="mode" defaultValue={settingsMap.get(settingsInvitationCode) || "moderated"}>
                {Object.entries(modeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <button className="btn btn-gold" type="submit">حفظ إعدادات الرسائل</button>
          </form>
        ) : null}

        <form className="attendance-toolbar" action="/admin/guest-book" method="get">
          <label className="admin-search-field">
            <Search size={17} />
            <input name="q" defaultValue={query} placeholder="بحث بالاسم، الرسالة، أو الدعوة..." />
          </label>
          <label className="admin-select-field">
            <Filter size={17} />
            <select name="status" defaultValue={status}>
              <option value="all">كل الحالات</option>
              <option value="pending">بانتظار الموافقة</option>
              <option value="approved">منشورة</option>
              <option value="rejected">مرفوضة</option>
            </select>
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
          <Link className="btn btn-soft" href="/admin/guest-book">إعادة ضبط</Link>
        </form>

        <section className="guest-book-bulk-panel" aria-label="إدارة جماعية لرسائل التهنئة">
          <div className="admin-card-head">
            <Trash2 size={20} />
            <div>
              <span className="eyebrow">Bulk Actions</span>
              <h2>إدارة جماعية آمنة</h2>
            </div>
          </div>
          <div className="guest-book-bulk-grid">
            {[
              { action: "bulk-delete-all", label: "حذف جميع الرسائل", count: stats.total, confirm: "حذف" },
              { action: "bulk-delete-pending", label: "حذف الرسائل المعلقة فقط", count: stats.pending, confirm: "حذف" },
              { action: "bulk-delete-rejected", label: "حذف الرسائل المرفوضة فقط", count: stats.rejected, confirm: "حذف" },
              { action: "bulk-approve-pending", label: "اعتماد جميع الرسائل المعلقة", count: stats.pending, confirm: "اعتماد" },
            ].map((item) => (
              <form className="guest-book-bulk-card" action="/api/admin/guest-book" method="post" key={item.action}>
                <input type="hidden" name="action" value={item.action} />
                <input type="hidden" name="expectedCount" value={item.count} />
                <strong>{item.label}</strong>
                <span>{formatArabicNumber(item.count)} رسالة</span>
                <input name="confirmText" placeholder={`اكتب ${item.confirm}`} aria-label={`تأكيد ${item.label}`} />
                <ConfirmingSubmitButton className="btn btn-soft danger-button" disabled={!item.count} fallbackCount={item.count} confirmTitle={item.label} confirmMessage={`سيتم تنفيذ الإجراء على ${formatArabicNumber(item.count)} رسالة.`}>
                  تنفيذ
                </ConfirmingSubmitButton>
              </form>
            ))}

            <form className="guest-book-bulk-card wide" action="/api/admin/guest-book" method="post">
              <input type="hidden" name="action" value="bulk-delete-invitation" />
              <strong>حذف الرسائل الخاصة بدعوة محددة</strong>
              <label className="admin-select-field">
                <span>الدعوة</span>
                <select id="guest-book-bulk-invitation-select" name="bulkInvitationCode" defaultValue={settingsInvitationCode}>
                  {invitations.map((invitation) => (
                    <option key={invitation.code} value={invitation.code} data-count={invitationCounts.get(invitation.code) || 0}>
                      {invitation.groomName} و {invitation.brideName} - {formatArabicNumber(invitationCounts.get(invitation.code) || 0)} رسالة
                    </option>
                  ))}
                </select>
              </label>
              <input name="confirmText" placeholder="اكتب حذف" aria-label="تأكيد حذف رسائل دعوة محددة" />
              <ConfirmingSubmitButton className="btn btn-soft danger-button" selectCountSelector="#guest-book-bulk-invitation-select" confirmTitle="حذف رسائل دعوة محددة" confirmMessage="سيتم حذف رسائل التهنئة الخاصة بالدعوة التي اخترتها. سيعيد الخادم حساب العدد قبل الحذف.">
                حذف رسائل الدعوة
              </ConfirmingSubmitButton>
            </form>
          </div>

          <form id="guest-book-bulk-selected-form" className="guest-book-selected-actions" action="/api/admin/guest-book" method="post">
            <input type="hidden" name="action" value="bulk-selected-delete" />
            <input name="confirmText" placeholder="اكتب حذف أو اعتماد حسب الإجراء" aria-label="تأكيد الإجراء الجماعي المحدد" />
            <ConfirmingSubmitButton className="btn btn-soft danger-button" name="action" value="bulk-selected-delete" countSelector=".guest-book-select-checkbox:checked" confirmTitle="حذف الرسائل المحددة" confirmMessage="سيتم حذف الرسائل التي قمت بتحديدها فقط.">
              حذف المحدد
            </ConfirmingSubmitButton>
            <ConfirmingSubmitButton className="btn btn-gold" name="action" value="bulk-selected-approve" countSelector=".guest-book-select-checkbox:checked" confirmTitle="اعتماد الرسائل المحددة" confirmMessage="سيتم اعتماد الرسائل المعلقة من العناصر المحددة فقط.">
              اعتماد المحدد
            </ConfirmingSubmitButton>
          </form>
        </section>

        <div className="table-shell">
          <table className="data-table guest-book-admin-table">
            <thead>
              <tr>
                <th>تحديد</th>
                <th>الدعوة</th>
                <th>الاسم</th>
                <th>الرسالة</th>
                <th>الحالة</th>
                <th>تاريخ الإرسال</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((message) => (
                <tr key={message.id}>
                  <td>
                    <input className="guest-book-select-checkbox" form="guest-book-bulk-selected-form" type="checkbox" name="selectedMessageId" value={message.id} aria-label={`تحديد رسالة ${message.name}`} />
                  </td>
                  <td>
                    <strong>{invitationMap.get(message.invitationCode) || message.invitationCode}</strong>
                    <small>{message.invitationCode}</small>
                  </td>
                  <td>{message.name}</td>
                  <td className="guest-book-message-cell">{message.message}</td>
                  <td>
                    <span className={`guest-book-status-pill ${message.status}`}>{statusLabels[message.status]}</span>
                  </td>
                  <td>{formatDate(message.createdAt)}</td>
                  <td>
                    <div className="button-row">
                      <form action="/api/admin/guest-book" method="post">
                        <input type="hidden" name="messageId" value={message.id} />
                        <input type="hidden" name="action" value="approve" />
                        <button className="btn btn-soft btn-icon" type="submit" title="قبول"><CheckCircle2 size={16} /></button>
                      </form>
                      <form action="/api/admin/guest-book" method="post">
                        <input type="hidden" name="messageId" value={message.id} />
                        <input type="hidden" name="action" value="reject" />
                        <button className="btn btn-soft btn-icon" type="submit" title="رفض"><XCircle size={16} /></button>
                      </form>
                      <form action="/api/admin/guest-book" method="post">
                        <input type="hidden" name="messageId" value={message.id} />
                        <input type="hidden" name="action" value="delete" />
                        <button className="btn btn-soft btn-icon danger-button" type="submit" title="حذف"><Trash2 size={16} /></button>
                      </form>
                      <details className="guest-book-edit-details">
                        <summary className="btn btn-soft btn-icon" title="تعديل"><Pencil size={16} /></summary>
                        <form className="guest-book-edit-form" action="/api/admin/guest-book" method="post">
                          <input type="hidden" name="messageId" value={message.id} />
                          <input type="hidden" name="action" value="edit" />
                          <input name="name" defaultValue={message.name} placeholder="اسم المرسل" maxLength={80} required />
                          <textarea name="message" defaultValue={message.message} placeholder="نص الرسالة" maxLength={600} rows={3} required />
                          <select name="status" defaultValue={message.status}>
                            <option value="pending">بانتظار الموافقة</option>
                            <option value="approved">منشورة</option>
                            <option value="rejected">مرفوضة</option>
                          </select>
                          <button className="btn btn-gold" type="submit">حفظ التعديل</button>
                        </form>
                      </details>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? <div className="admin-empty-state compact">لا توجد رسائل مطابقة للفلاتر الحالية.</div> : null}
        </div>
      </section>
    </section>
  );
}
