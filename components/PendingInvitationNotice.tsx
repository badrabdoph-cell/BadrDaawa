import Link from "next/link";
import { Clock3, Home, MessageCircle } from "lucide-react";

type PendingInvitationNoticeProps = {
  groomName?: string;
  brideName?: string;
  code?: string;
  variant?: "public" | "admin";
  whatsappUrl?: string;
};

export function PendingInvitationNotice({ groomName, brideName, code, variant = "public", whatsappUrl }: PendingInvitationNoticeProps) {
  const coupleName = [groomName, brideName].filter(Boolean).join(" / ");

  return (
    <main className="pending-invitation-page" dir="rtl">
      <section className="pending-invitation-card">
        <Clock3 size={38} aria-hidden="true" />
        <span className="eyebrow">قيد المراجعة</span>
        <h1>الدعوة ما زالت قيد المراجعة</h1>
        <p>
          {variant === "admin"
            ? "رابط إدارة الدعوة تم تجهيزه، لكنه سيعمل بعد موافقة الأدمن ونشر الدعوة."
            : "رابط الدعوة تم تجهيزه، لكنه غير متاح للضيوف حتى يوافق الأدمن ويتم نشر الدعوة."}
        </p>
        {coupleName ? <strong>{coupleName}</strong> : null}
        {code ? <small dir="ltr">{code}</small> : null}
        <div className="status-actions">
          <Link className="btn btn-soft" href="/">
            <Home size={16} />
            العودة للرئيسية
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
