import Link from "next/link";
import { Crown, Instagram, MessageCircle } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div>
          <Link href="/" className="brand">
            <span className="brand-mark">
              <Crown size={20} />
            </span>
            <span>BadrDaawa</span>
          </Link>
          <p>دعوات زفاف رقمية فاخرة، مصممة للعروسين اللي عايزين تجربة تليق بالفرحة.</p>
        </div>
        <div className="button-row">
          <Link className="btn btn-soft btn-icon" href="/contact" title="تواصل معنا">
            <MessageCircle size={20} />
          </Link>
          <Link className="btn btn-soft btn-icon" href="/templates" title="شاهد القالب">
            <Instagram size={20} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
