"use client";

import Link from "next/link";
import { Crown, Headphones, Menu, Send, X } from "lucide-react";
import { useState } from "react";

const navLinks = [
  { href: "/templates", label: "القوالب" },
  { href: "/client-invitations", label: "دعوات العملاء" },
  { href: "/pricing", label: "الأسعار" },
  { href: "/faq", label: "الأسئلة" },
  { href: "/contact", label: "تواصل" },
];

type SiteHeaderClientProps = {
  logoUrl: string;
  siteName: string;
  supportUrl: string;
};

export function SiteHeaderClient({ logoUrl, siteName, supportUrl }: SiteHeaderClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header-mobile">
      <div className="container nav-mobile">
        <Link href="/" className="brand-mobile" aria-label={siteName} onClick={() => setMenuOpen(false)}>
          <span className="brand-mark-mobile">
            {logoUrl ? <img className="brand-logo-image" src={logoUrl} alt="" /> : <Crown size={20} />}
          </span>
          <span>{siteName}</span>
        </Link>

        <button className="menu-toggle" type="button" onClick={() => setMenuOpen((open) => !open)} aria-label="القائمة" aria-expanded={menuOpen} aria-controls="site-mobile-menu">
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen ? (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <nav id="site-mobile-menu" className="mobile-menu" aria-label="روابط الموقع" onClick={(event) => event.stopPropagation()}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="mobile-menu-link" onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}

            <div className="mobile-menu-actions">
              <a href={supportUrl} className="cta-primary" target="_blank" rel="noreferrer">
                <Headphones size={18} />
                الدعم
              </a>
              <Link href="/templates" className="cta-primary" onClick={() => setMenuOpen(false)}>
                <Send size={18} />
                اطلب دعوتك
              </Link>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
