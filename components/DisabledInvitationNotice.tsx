import Link from "next/link";
import { Home, MessageCircle, ShieldAlert } from "lucide-react";

type DisabledInvitationNoticeProps = {
  reason?: string;
  whatsappUrl?: string;
};

export function DisabledInvitationNotice({ reason, whatsappUrl }: DisabledInvitationNoticeProps) {
  return (
    <main className="pending-invitation-page" dir="rtl">
      <section className="pending-invitation-card">
        <ShieldAlert size={38} aria-hidden="true" />
        <span className="eyebrow">معطلة</span>
        <h1>تم تعطيل الدعوة من الإدارة</h1>
        {reason ? <p className="rejection-reason">{reason}</p> : null}
        <div className="status-actions">
          <Link className="btn btn-soft" href="/">
            <Home size={16} />
            الصفحة الرئيسية
          </Link>
          {whatsappUrl ? (
            <a className="btn btn-gold" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} />
              خدمة العملاء
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
