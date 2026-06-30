"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, History, Percent, TicketPercent } from "lucide-react";

const promoLinks = [
  { href: "/admin/promo-codes", label: "نظرة عامة", icon: BarChart3 },
  { href: "/admin/promo-codes/partners", label: "بروموكود المصورين والشركاء", icon: TicketPercent },
  { href: "/admin/promo-codes/discounts", label: "أكواد الخصم المستقلة", icon: Percent },
  { href: "/admin/promo-codes/history", label: "سجل البروموكود", icon: History },
];

export function AdminPromoSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="promo-section-nav" aria-label="تنقل قسم البروموكود">
      {promoLinks.map((link) => {
        const Icon = link.icon;
        const active = link.href === "/admin/promo-codes" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link key={link.href} className={active ? "active" : ""} href={link.href}>
            <Icon size={16} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
