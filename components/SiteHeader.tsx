import Link from "next/link";
import { Crown, Headphones, Send } from "lucide-react";
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
          <a className="btn btn-gold btn-glow nav-whatsapp" href={supportUrl} target="_blank" rel="noreferrer" aria-label="دعم واتساب">
            <svg className="whatsapp-logo" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M16.02 3.2c-7.06 0-12.8 5.62-12.8 12.54 0 2.37.68 4.68 1.97 6.68L3.1 28.8l6.63-2.04a13.03 13.03 0 0 0 6.29 1.6c7.06 0 12.8-5.62 12.8-12.54S23.08 3.2 16.02 3.2Zm0 22.98c-2.1 0-4.14-.62-5.9-1.8l-.42-.28-3.9 1.2 1.24-3.74-.29-.43a10.18 10.18 0 0 1-1.74-5.7c0-5.71 4.7-10.35 10.47-10.35s10.47 4.64 10.47 10.35-4.7 10.75-10.93 10.75Zm5.96-7.7c-.33-.16-1.94-.94-2.24-1.05-.3-.1-.52-.16-.74.16-.22.32-.85 1.04-1.04 1.25-.19.22-.38.24-.71.08-.33-.16-1.39-.5-2.64-1.6-.98-.86-1.64-1.92-1.83-2.24-.19-.32-.02-.5.14-.66.15-.14.33-.38.49-.57.16-.19.22-.32.33-.54.11-.22.05-.4-.03-.57-.08-.16-.74-1.75-1.01-2.4-.27-.63-.54-.54-.74-.55h-.63c-.22 0-.57.08-.87.4-.3.32-1.14 1.1-1.14 2.68s1.17 3.1 1.33 3.32c.16.22 2.3 3.45 5.58 4.84.78.33 1.39.53 1.86.68.78.24 1.49.21 2.05.13.63-.09 1.94-.78 2.21-1.53.27-.75.27-1.4.19-1.53-.08-.13-.3-.21-.63-.37Z" />
            </svg>
            <Headphones size={18} aria-hidden="true" />
          </a>
          <Link className="btn btn-gold btn-glow" href="/order">
            <Send size={18} />
            اطلب دعوتك
          </Link>
        </div>
      </div>
    </header>
  );
}
