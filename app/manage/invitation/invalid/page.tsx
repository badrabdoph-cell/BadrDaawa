import Link from "next/link";
import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "رابط إدارة غير صالح",
  robots: { index: false, follow: false },
};

function errorMessage(reason?: string) {
  if (reason === "expired") return "رابط إدارة الدعوة منتهي الصلاحية. اطلب رابطاً جديداً من فريق الإدارة.";
  if (reason === "invalid") return "رابط إدارة الدعوة غير صحيح أو تم نسخه بشكل ناقص.";
  return "لم يتم العثور على دعوة مرتبطة بهذا الرابط السري.";
}

export default async function InvalidInvitationManageLinkPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="page-shell">
      <section className="section compact">
        <div className="container">
          <article className="panel invalid-manage-link">
            <ShieldAlert size={34} />
            <span className="eyebrow">Secure Link</span>
            <h1>رابط إدارة الدعوة غير متاح</h1>
            <p>{errorMessage(params.reason)}</p>
            <Link className="btn btn-gold" href="/">
              العودة للموقع
            </Link>
          </article>
        </div>
      </section>
    </main>
  );
}
