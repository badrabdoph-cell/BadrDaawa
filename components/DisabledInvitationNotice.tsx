import Link from "next/link";
import { ShieldAlert } from "lucide-react";

type DisabledInvitationNoticeProps = {
  reason?: string;
  whatsappUrl?: string;
};

export function DisabledInvitationNotice({ reason, whatsappUrl }: DisabledInvitationNoticeProps) {
  return (
    <main className="pending-invitation-page" dir="rtl">
      <section className="pending-invitation-card">
        <ShieldAlert size={34} aria-hidden="true" />
        <span className="eyebrow">معطلة</span>
        <h1>تم تعطيل الدعوة من الإدارة</h1>
        {reason ? <p className="disabled-reason">{reason}</p> : null}
        <div className="disabled-actions">
          {whatsappUrl ? (
            <a className="btn btn-gold" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              خدمة العملاء
            </a>
          ) : null}
          <Link className="btn btn-soft" href="/">
            الصفحة الرئيسية
          </Link>
        </div>
      </section>
    </main>
  );
}
