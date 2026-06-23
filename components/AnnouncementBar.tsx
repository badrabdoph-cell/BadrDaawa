import Link from "next/link";
import { Gift } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="announcement-bar" role="banner" aria-label="شريط العرض الترويجي">
      <div className="container announcement-bar-inner">
        <span className="announcement-bar-text">
          <Gift size={16} aria-hidden="true" />
          <span>مجاني لفترة محدودة أثناء الإطلاق التجريبي</span>
        </span>
        <Link href="/templates" className="announcement-bar-cta">
          ابدأ الآن
        </Link>
      </div>
    </div>
  );
}
