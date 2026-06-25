import Link from "next/link";
import { Gift } from "lucide-react";

export type AnnouncementBarProps = {
  text?: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

export function AnnouncementBar({ text = "مجاني لفترة محدودة أثناء الإطلاق التجريبي", ctaLabel = "ابدأ الآن", ctaUrl = "/templates" }: AnnouncementBarProps) {
  return (
    <div className="announcement-bar" role="banner" aria-label="شريط العرض الترويجي">
      <div className="container announcement-bar-inner">
        <span className="announcement-bar-text">
          <Gift size={16} aria-hidden="true" />
          <span>{text}</span>
        </span>
        <Link href={ctaUrl} className="announcement-bar-cta">
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
