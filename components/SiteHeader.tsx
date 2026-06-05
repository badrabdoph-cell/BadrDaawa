import Link from "next/link";
import { Crown, LayoutDashboard, Send } from "lucide-react";

const navLinks = [
  { href: "/templates", label: "القوالب" },
  { href: "/pricing", label: "الأسعار" },
  { href: "/faq", label: "الأسئلة" },
  { href: "/contact", label: "تواصل" },
];

export function SiteHeader() {
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
          <Link className="btn btn-soft" href="/admin" title="لوحة التحكم الرئيسية">
            <LayoutDashboard size={18} />
            لوحة التحكم
          </Link>
          <Link className="btn btn-gold" href="/order">
            <Send size={18} />
            اطلب دعوتك
          </Link>
        </div>
      </div>
    </header>
  );
}
