"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, Gauge, History, Percent } from "lucide-react";

const promoLinks = [
  { href: "/admin/promo-codes/photographers", label: "المصورين", icon: Camera },
  { href: "/admin/promo-codes/discounts", label: "كود الخصم", icon: Percent },
  { href: "/admin/promo-codes/history", label: "السجل", icon: History },
  { href: "/admin/promo-codes/health", label: "Promo Health", icon: Gauge },
];

export function AdminPromoSectionNav() {
  const pathname = usePathname();

  return (
    <nav className="promo-section-nav" aria-label="تنقل قسم البروموكود">
      {promoLinks.map((link) => {
        const Icon = link.icon;
        const active = pathname.startsWith(link.href);
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
