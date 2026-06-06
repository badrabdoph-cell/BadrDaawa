import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { invitationTemplates } from "@/lib/templates";

export const metadata: Metadata = {
  title: "Royal Envelope",
  description: "قالب الدعوة الحالي من BadrDaawa.",
};

export default function TemplatesPage() {
  const template = invitationTemplates[0];

  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="section compact">
        <div className="container template-focus">
          <div className="template-focus-media">
            <img src={template.previewImage} alt={template.arabicName} />
          </div>
          <div className="template-focus-copy">
            <span className="eyebrow">القالب الحالي</span>
            <h1>Royal Envelope</h1>
            <p>قالب واحد مصقول للموبايل: ظرف فاخر، تفاصيل واضحة، تأكيد حضور، وخريطة.</p>
            <ul className="feature-list">
              {["يفتح كظرف دعوة", "مناسب للواتساب", "QR وخريطة", "RSVP سريع"].map((feature) => (
                <li key={feature}>
                  <CheckCircle2 size={18} />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="button-row">
              <Link className="btn btn-gold" href="/order">
                اطلب هذا القالب
              </Link>
              <Link className="btn btn-soft" href="/A7X92K">
                شاهد مثال
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
