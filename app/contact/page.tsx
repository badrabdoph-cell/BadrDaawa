import type { Metadata } from "next";
import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { DynamicPageView } from "@/components/DynamicPageView";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionIntro } from "@/components/SectionIntro";
import { getDynamicPageBySlug, getDynamicPageMetadata } from "@/lib/dynamic-pages";
import { getSiteSettings } from "@/lib/site-settings";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getDynamicPageBySlug("contact");
  return page ? getDynamicPageMetadata(page) : { title: "تواصل معنا" };
}

export default async function ContactPage() {
  const dynamicPage = await getDynamicPageBySlug("contact");
  if (dynamicPage) return <DynamicPageView page={dynamicPage} />;

  const settings = await getSiteSettings();
  const primaryPhone = settings.contactPhones[0] || "01011511561";

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container contact-focus">
          <SectionIntro eyebrow="تواصل" title="جاهز نبدأ؟" lead="املأ الطلب أو تواصل مباشرة على واتساب." />
          <aside className="form-panel">
            <Phone size={24} />
            <h2>{primaryPhone}</h2>
            <p>{settings.email ? settings.email : "أرسل الأسماء، التاريخ، والمكان."}</p>
            {settings.whatsappUrl ? (
              <a className="btn btn-gold" href={settings.whatsappUrl} target="_blank" rel="noreferrer">
                <MessageCircle size={18} />
                تواصل الآن
              </a>
            ) : (
              <Link className="btn btn-gold" href="/templates">
                <MessageCircle size={18} />
                افتح نموذج الطلب
              </Link>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
