import Link from "next/link";
import { Crown, MessageCircle } from "lucide-react";

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
          <p>Royal Envelope. دعوة واضحة، أنيقة، وسهلة المشاركة.</p>
        </div>
        <div className="button-row">
          <Link className="btn btn-soft btn-icon" href="/contact" title="تواصل معنا">
            <MessageCircle size={20} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
