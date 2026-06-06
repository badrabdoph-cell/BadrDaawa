import Link from "next/link";
import { Crown, MessageCircle, Send } from "lucide-react";
import { getWhatsAppOrderUrl } from "@/lib/utils";

const navLinks = [
  { href: "/templates", label: "القالب" },
  { href: "/client-invitations", label: "دعوات العميل" },
  { href: "/pricing", label: "الأسعار" },
  { href: "/faq", label: "الأسئلة" },
  { href: "/contact", label: "تواصل" },
];

export function SiteHeader() {
  const supportUrl = getWhatsAppOrderUrl("محتاج مساعدة في دعوة الفرح");

  return (
    <header className="site-header">
      <div className="container nav">
        <Link href="/" className="brand" aria-label="BadrDaawa">
          <span className="brand-mark">
            <Crown size={21} />
          </span>
          <span>BadrDaawa</span>
        </Link>
        <nav className="nav-links" aria-label="روابط الموقع">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <a className="btn btn-soft nav-whatsapp" href={supportUrl} target="_blank" rel="noreferrer" aria-label="دعم واتساب">
            <MessageCircle size={18} />
            دعم واتساب
          </a>
          <Link className="btn btn-gold" href="/order">
            <Send size={18} />
            اطلب دعوتك
          </Link>
        </div>
      </div>
    </header>
  );
}
