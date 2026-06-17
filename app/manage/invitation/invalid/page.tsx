import Link from "next/link";
import type { Metadata } from "next";
import { ShieldAlert, XCircle } from "lucide-react";

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
  searchParams: Promise<{ reason?: string; rejectionReason?: string }>;
}) {
  const params = await searchParams;
  const isRejected = params.reason === "rejected";
  return (
    <main className="page-shell">
      <section className="section compact">
        <div className="container">
          <article className="panel invalid-manage-link">
            {isRejected ? <XCircle size={34} style={{ color: "#dc2626" }} /> : <ShieldAlert size={34} />}
            <span className="eyebrow">{isRejected ? "تم الرفض" : "Secure Link"}</span>
            <h1>{isRejected ? "تم رفض طلب الدعوة" : params.reason === "pending" ? "الدعوة قيد المراجعة" : "رابط إدارة الدعوة غير متاح"}</h1>
            <p>{errorMessage(params.reason)}</p>
            {isRejected && params.rejectionReason ? (
              <div className="rejection-reason-box" style={{ background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 12, padding: "12px 18px", marginTop: 8, fontSize: "0.92rem" }}>
                <strong>سبب الرفض:</strong>
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.8)" }}>{params.rejectionReason}</p>
              </div>
            ) : null}
            <Link className="btn btn-gold" href="/">
              العودة للموقع
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
