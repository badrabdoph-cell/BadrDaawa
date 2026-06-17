import Link from "next/link";
import type { Metadata } from "next";
import { Home, MessageCircle, ShieldAlert, XCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "رابط إدارة غير صالح",
  robots: { index: false, follow: false },
};

function errorMessage(reason?: string) {
  if (reason === "disabled") return "تم تعطيل الدعوة من الإدارة ولا يمكن الوصول إلى لوحة التحكم.";
  if (reason === "pending") return "تم تجهيز رابط إدارة الدعوة، لكنه سيعمل تلقائياً بعد موافقة الأدمن ونشر الدعوة.";
  if (reason === "session") return "لوحة إدارة الدعوة لا تفتح إلا من رابط الإدارة السري الخاص بها.";
  if (reason === "expired") return "رابط إدارة الدعوة منتهي الصلاحية. اطلب رابطاً جديداً من فريق الإدارة.";
  if (reason === "invalid") return "رابط إدارة الدعوة غير صحيح أو تم نسخه بشكل ناقص.";
  if (reason === "rejected") return "تم رفض طلب الدعوة من الإدارة. للاستفسار، تواصل مع فريق الدعم.";
  return "لم يتم العثور على دعوة مرتبطة بهذا الرابط السري.";
}

export default async function InvalidInvitationManageLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; rejectionReason?: string; whatsappUrl?: string }>;
}) {
  const params = await searchParams;
  const isRejected = params.reason === "rejected";
  return (
    <main className="pending-invitation-page" dir="rtl">
      <section className="pending-invitation-card">
        {isRejected ? <XCircle size={38} aria-hidden="true" /> : <ShieldAlert size={38} aria-hidden="true" />}
        <span className="eyebrow">{isRejected ? "تم الرفض" : "Secure Link"}</span>
        <h1>{isRejected ? "تم رفض طلب الدعوة" : params.reason === "pending" ? "الدعوة قيد المراجعة" : "رابط إدارة الدعوة غير متاح"}</h1>
        <p>{errorMessage(params.reason)}</p>
        {isRejected && params.rejectionReason ? (
          <div className="rejection-reason">
            <strong>سبب الرفض</strong>
            <p>{params.rejectionReason}</p>
          </div>
        ) : null}
        <div className="status-actions">
          <Link className="btn btn-soft" href="/">
            <Home size={16} />
            العودة للرئيسية
          </Link>
          {params.whatsappUrl ? (
            <a className="btn btn-gold" href={params.whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} />
              خدمة العملاء
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}
