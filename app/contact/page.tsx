import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";

export const metadata: Metadata = {
  title: "تواصل معنا",
};

export default function ContactPage() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section">
        <div className="container form-grid">
          <div>
            <SectionIntro eyebrow="تواصل" title="خلينا نحول الفكرة لمنتج مبهر" lead="للطلبات، الشراكات، أو تخصيص قالب زفاف فاخر، تواصل مباشرة." />
            <div className="grid-3" style={{ marginTop: 28 }}>
              <div className="panel">
                <Phone size={24} />
                <h3>الهاتف</h3>
                <p>01011511561</p>
              </div>
              <div className="panel">
                <Mail size={24} />
                <h3>البريد</h3>
                <p>hello@BadrDaawa.com</p>
              </div>
              <div className="panel">
                <MapPin size={24} />
                <h3>النطاق</h3>
                <p>مصر والعالم العربي</p>
              </div>
            </div>
          </div>
          <aside className="form-panel">
            <h2>ابدأ من واتساب</h2>
            <p>أرسل أسماء العروسين وتاريخ الفرح والقالب المفضل، وسيتم تجهيز الدعوة.</p>
            <Link className="btn btn-gold" href="/order">
              <MessageCircle size={18} />
              افتح نموذج الطلب
            </Link>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
