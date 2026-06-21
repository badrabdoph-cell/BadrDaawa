import Link from "next/link";
import { Gift } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="announcement-bar" role="banner" aria-label="شريط العرض الترويجي">
      <div className="container announcement-bar-inner">
        <span className="announcement-bar-text">
          <Gift size={16} aria-hidden="true" />
          <span>🎁 مجاناً لفترة محدودة بمناسبة الإطلاق التجريبي — أنشئ دعوتك الإلكترونية بالكامل بدون أي رسوم خلال فترة الاختبار الحالية.</span>
        </span>
        <Link href="/templates" className="announcement-bar-cta">
          ابدأ الآن
        </Link>
      </div>
    </div>
  );
}
