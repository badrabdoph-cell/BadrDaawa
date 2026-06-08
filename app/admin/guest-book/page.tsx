import Link from "next/link";
import { CheckCircle2, Filter, MessageCircleHeart, Search, Trash2, XCircle } from "lucide-react";
import { getAdminInvitations } from "@/lib/admin-data";
import { getAllGuestBookMessages } from "@/lib/guest-book";
import type { GuestBookMessage, GuestBookStatus } from "@/lib/types";
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "-";
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function notice(saved?: string, error?: string) {
  if (saved === "approve") return { kind: "success", text: "تم نشر رسالة التهنئة داخل الدعوة." };
  if (saved === "reject") return { kind: "success", text: "تم رفض رسالة التهنئة." };
  if (saved === "delete") return { kind: "success", text: "تم حذف رسالة التهنئة." };
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
  const [messages, invitations] = await Promise.all([getAllGuestBookMessages(), getAdminInvitations()]);
  const invitationMap = new Map(invitations.map((invitation) => [invitation.code, `${invitation.groomName} و ${invitation.brideName}`]));
  const status = params.status || "all";
  const selectedInvitation = params.invitation || "";
  const query = params.q?.trim() || "";
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
  const pageNotice = notice(params.saved, params.error);

  return (
    <section className="admin-command-center guest-book-admin-page">
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Guest Book</span>
          <h1>سجل التهاني</h1>
          <p>راجع رسائل الضيوف قبل نشرها داخل الدعوة، مع قبول أو رفض أو حذف أي رسالة.</p>
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

        <div className="table-shell">
          <table className="data-table guest-book-admin-table">
            <thead>
              <tr>
                <th>الدعوة</th>
                <th>الاسم</th>
                <th>رسالة التهنئة</th>
                <th>الحالة</th>
                <th>تاريخ الإرسال</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((message) => (
                <tr key={message.id}>
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length ? <div className="admin-empty-state compact">لا توجد رسائل تهنئة مطابقة للفلاتر الحالية.</div> : null}
        </div>
      </section>
    </section>
  );
}
