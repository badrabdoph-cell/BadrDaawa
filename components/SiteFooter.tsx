import Link from "next/link";
import { Crown, MessageCircle } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";

export async function SiteFooter() {
  const settings = await getSiteSettings();
  const socialLinks = [
    { label: "فيسبوك", href: settings.socialLinks.facebook },
    { label: "إنستجرام", href: settings.socialLinks.instagram },
    { label: "تيك توك", href: settings.socialLinks.tiktok },
    { label: "يوتيوب", href: settings.socialLinks.youtube },
    { label: "تيليجرام", href: settings.socialLinks.telegram },
  ].filter((link) => link.href);

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="brand">
            <span className="brand-mark">
              {settings.logoUrl ? <img className="brand-logo-image" src={settings.logoUrl} alt="" /> : <Crown size={20} />}
            </span>
            <span>{settings.siteName}</span>
          </Link>
          <p>{settings.siteDescription}</p>
        </div>
        <div className="button-row">
          {socialLinks.map((link) => (
            <Link className="footer-link" href={link.href} key={link.label} target="_blank" rel="noreferrer">
              {link.label}
            </Link>
          ))}
          <Link className="footer-link" href="/privacy-policy">
            سياسة الخصوصية
          </Link>
          <Link className="footer-link" href="/terms">
            الشروط والأحكام
          </Link>
          <Link className="footer-link" href="/refund-policy">
            سياسة الاسترجاع
          </Link>
          <Link className="footer-link" href="/usage-policy">
            سياسة الاستخدام
          </Link>
          <Link className="btn btn-soft btn-icon" href="/contact" title="تواصل معنا">
            <MessageCircle size={20} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
