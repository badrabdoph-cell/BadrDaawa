import Link from "next/link";
import { ClipboardCheck, Home, MessageCircle } from "lucide-react";

type PendingInvitationNoticeProps = {
  groomName?: string;
  brideName?: string;
  code?: string;
  variant?: "public" | "admin";
  whatsappUrl?: string;
  submittedAt?: string;
};

function formatDate(iso?: string) {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ar-EG", { dateStyle: "full", timeStyle: "short" }).format(date);
  } catch {
    return "";
  }
}

export function PendingInvitationNotice({ groomName, brideName, code, variant = "public", whatsappUrl, submittedAt }: PendingInvitationNoticeProps) {
  const coupleName = [groomName, brideName].filter(Boolean).join(" و ");
  const displayDate = formatDate(submittedAt);

  return (
    <main className="pending-invitation-page" dir="rtl">
      <section className="pending-invitation-card pending-invitation-card-review">
        <div className="pending-invitation-icon-wrap">
          <ClipboardCheck size={46} aria-hidden="true" />
          <span className="pending-invitation-pulse" />
        </div>

        <span className="eyebrow">🟡 قيد المراجعة</span>
        <h1>الدعوة قيد المراجعة من الإدارة</h1>
        <p className="pending-invitation-description">
          تم استلام طلب الدعوة بنجاح، ويقوم فريق Wedding Daawa بمراجعته الآن.
          <br />
          بمجرد الموافقة سيتم نشر الدعوة وتفعيل الرابط تلقائيًا، ولن تحتاج إلى القيام بأي خطوة إضافية.
        </p>

        <div className="pending-invitation-details">
          <div className="pending-invitation-detail-row">
            <span className="detail-icon">👰</span>
            <span className="detail-label">أسماء العروسين</span>
            <strong className="detail-value">{coupleName}</strong>
          </div>
          <div className="pending-invitation-detail-row">
            <span className="detail-icon">🆔</span>
            <span className="detail-label">رقم الطلب</span>
            <strong className="detail-value" dir="ltr">{code}</strong>
          </div>
          <div className="pending-invitation-detail-row">
            <span className="detail-icon">🟡</span>
            <span className="detail-label">حالة الطلب</span>
            <strong className="detail-value">قيد المراجعة</strong>
          </div>
          <div className="pending-invitation-detail-row">
            <span className="detail-icon">⏱️</span>
            <span className="detail-label">مدة المراجعة المتوقعة</span>
            <strong className="detail-value">24–48 ساعة</strong>
          </div>
          {displayDate ? (
            <div className="pending-invitation-detail-row">
              <span className="detail-icon">📅</span>
              <span className="detail-label">تاريخ ووقت إرسال الطلب</span>
              <strong className="detail-value">{displayDate}</strong>
            </div>
          ) : null}
        </div>

        <div className="status-actions">
          <Link className="btn btn-soft" href="/">
            <Home size={16} />
            العودة للرئيسية
          </Link>
          {whatsappUrl ? (
            <a className="btn btn-gold" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} />
              التواصل مع خدمة العملاء
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
