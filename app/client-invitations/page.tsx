import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, ExternalLink, MapPin, Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { getAdminInvitations } from "@/lib/admin-data";
import { getTemplatesWithSettings } from "@/lib/template-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "دعوات حقيقية",
  description: "مجموعة من الدعوات المنشورة لعملائنا من BadrDaawa.",
};

export default async function ClientInvitationsPublicPage() {
  const [invitations, templates] = await Promise.all([getAdminInvitations(), getTemplatesWithSettings()]);
  const activeInvitations = invitations.filter((invitation) => invitation.isActive);

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container client-invitations-page">
          <div className="section-title-block">
            <span className="eyebrow">
              <Sparkles size={16} />
              Client Invitations
            </span>
            <h1 className="section-title">دعوات حقيقية</h1>
            <p className="section-lead">مجموعة من الدعوات المنشورة لعملائنا.</p>
          </div>

          {activeInvitations.length ? (
            <div className="client-invitations-grid">
              {activeInvitations.map((invitation) => {
                const template = templates.find((item) => item.slug === invitation.templateSlug);
                const publicPath = `/${invitation.customSlug || invitation.code}`;
                return (
                  <article className="client-invitation-card" key={invitation.id}>
                    <Link className="client-invitation-photo" href={publicPath} aria-label={`فتح دعوة ${invitation.groomName} و ${invitation.brideName}`}>
                      <img src={invitation.heroPhoto || template?.accentImage || template?.previewImage || "/assets/templates/featured-1.svg"} alt="" loading="lazy" />
                    </Link>
                    <div className="client-invitation-body">
                      <span>{template?.arabicName || "دعوة عميل"}</span>
                      <h2>
                        {invitation.groomName} و {invitation.brideName}
                      </h2>
                      <p>
                        <CalendarDays size={15} />
                        {new Date(invitation.weddingDate).toLocaleDateString("ar-EG-u-nu-latn")}
                      </p>
                      <p>
                        <MapPin size={15} />
                        {invitation.venue}
                      </p>
                      <Link className="btn btn-gold btn-glow" href={publicPath}>
                        <ExternalLink size={17} />
                        فتح الدعوة
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <h2>لا توجد دعوات منشورة حالياً</h2>
              <p>ستظهر الدعوات المنشورة هنا تلقائياً.</p>
              <Link className="btn btn-gold" href="/templates">
                مشاهدة التصاميم
              </Link>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
