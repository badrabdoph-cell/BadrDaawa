import Link from "next/link";
import { KeyRound, LockKeyhole } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SectionIntro } from "@/components/SectionIntro";
import { ClientLoginForm } from "@/components/ClientLoginForm";

export default function ClientLoginPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container order-shell">
          <div>
            <SectionIntro eyebrow="لوحة العميل" title="دخول العروسين" lead="تابع الحضور والرابط والـ QR من مكان واحد." />
            <div className="panel" style={{ marginTop: 28 }}>
              <h3>تجربة سريعة</h3>
              <p>افتح لوحة تجريبية وشاهد شكل المتابعة.</p>
              <Link className="btn btn-gold" href="/badr-sarah-1/ad_3399">
                فتح لوحة تجريبية
              </Link>
            </div>
          </div>
          <ClientLoginForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
