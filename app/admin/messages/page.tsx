import Link from "next/link";
import { Bell, CheckCircle2, MessageSquareText, Search, Send, UserRound } from "lucide-react";
import { headers } from "next/headers";
import { AdminClientMessageForm } from "@/components/AdminClientMessageForm";
import { getAdminInvitations } from "@/lib/admin-data";
import { getAllClientMessages, getTotalUnreadClientMessages } from "@/lib/client-messages";
import { getMessageTemplates } from "@/lib/message-templates";
import { formatArabicNumber, getPublicSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type AdminMessagesParams = {
  sent?: string;
  error?: string;
  q?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Cairo",
  }).format(new Date(value));
}

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<AdminMessagesParams> }) {
  const [params, invitations, messages, unreadCount, messageTemplates, requestHeaders] = await Promise.all([searchParams, getAdminInvitations(), getAllClientMessages(), getTotalUnreadClientMessages(), getMessageTemplates(), headers()]);
  const query = (params.q || "").trim().toLowerCase();
  const invitationMap = new Map(invitations.map((inv) => [inv.code, inv]));
  const filteredMessages = messages.filter((message) => {
    const invitation = invitationMap.get(message.invitationCode);
    const haystack = [message.title, message.body, message.invitationCode, invitation?.groomName, invitation?.brideName, invitation?.venue].join(" ").toLowerCase();
    return !query || haystack.includes(query);
  });
  const DISPLAY_LIMIT = 100;
  const displayMessages = filteredMessages.length > DISPLAY_LIMIT ? filteredMessages.slice(0, DISPLAY_LIMIT) : filteredMessages;
  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Messages</span>
          <h1>مركز الرسائل</h1>
          <p>أرسل رسالة داخلية لعميل محدد، وتابع هل وصلت كرسالة مقروءة أو غير مقروءة داخل لوحة العميل.</p>
        </div>
      </div>

      {params.sent ? (
        <div className="notice success">
          <CheckCircle2 size={18} />
          تم إرسال الرسالة إلى {params.sent}.
        </div>
      ) : null}
      {params.error ? <div className="notice danger">{params.error === "missing" ? "اختار دعوة واكتب نص الرسالة." : "تعذر إرسال الرسالة."}</div> : null}

      <section className="admin-list-overview messages-overview">
        <article className="admin-list-stat">
          <MessageSquareText size={19} />
          <span>كل الرسائل</span>
          <strong>{formatArabicNumber(messages.length)}</strong>
        </article>
        <article className="admin-list-stat warning">
          <Bell size={19} />
          <span>غير مقروءة</span>
          <strong>{formatArabicNumber(unreadCount)}</strong>
        </article>
        <article className="admin-list-stat good">
          <UserRound size={19} />
          <span>العملاء المتاحون</span>
          <strong>{formatArabicNumber(invitations.length)}</strong>
        </article>
      </section>

      <section className="panel admin-client-message-panel">
        <div className="admin-card-head">
          <Send size={22} />
          <div>
            <span className="eyebrow">Send</span>
            <h2>إرسال رسالة لعميل</h2>
          </div>
        </div>
        <AdminClientMessageForm invitations={invitations} messageTemplates={messageTemplates} siteUrl={getPublicSiteUrl(requestHeaders)} />
      </section>

      <form className="admin-table-toolbar messages-toolbar" action="/admin/messages" method="get">
        <label className="admin-search-field">
          <Search size={17} />
          <input name="q" placeholder="ابحث في الرسائل أو كود الدعوة أو اسم العميل" defaultValue={params.q || ""} />
        </label>
        <button className="btn btn-soft" type="submit">بحث</button>
        {query ? <Link className="btn btn-soft" href="/admin/messages">مسح</Link> : null}
      </form>

      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>العميل</th>
              <th>العنوان</th>
              <th>الرسالة</th>
              <th>الحالة</th>
              <th>الوقت</th>
            </tr>
          </thead>
          <tbody>
            {displayMessages.map((message) => {
              const invitation = invitationMap.get(message.invitationCode);
              return (
                <tr key={message.id}>
                  <td>
                    <strong>{invitation ? `${invitation.groomName} و ${invitation.brideName}` : message.invitationCode}</strong>
                    <small>{message.invitationCode}</small>
                  </td>
                  <td>{message.title}</td>
                  <td className="message-preview-cell">{message.body}</td>
                  <td>
                    <span className={message.readAt ? "status success" : "status warning"}>{message.readAt ? "مقروء" : "غير مقروء"}</span>
                    {message.readAt ? <small>{formatDate(message.readAt)}</small> : null}
                  </td>
                  <td>{formatDate(message.createdAt)}</td>
                </tr>
              );
            })}
            {!displayMessages.length ? (
              <tr>
                <td colSpan={5}>
                  <div className="admin-empty-state compact">
                    <MessageSquareText size={22} />
                    <strong>لا توجد رسائل مطابقة.</strong>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {filteredMessages.length > DISPLAY_LIMIT && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          عرض أول {DISPLAY_LIMIT} من أصل {filteredMessages.length}. استخدم خاصية البحث للتصفية.
        </p>
      )}
    </>
  );
}
