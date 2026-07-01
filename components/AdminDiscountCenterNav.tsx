"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, History, PlusCircle } from "lucide-react";

const links = [
  { href: "/admin/promo-codes/discounts", label: "لوحة الخصومات", icon: BarChart3 },
  { href: "/admin/promo-codes/discounts/new", label: "إنشاء كود", icon: PlusCircle },
  { href: "/admin/promo-codes/discounts/history", label: "سجل الاستخدام", icon: History },
];

export function AdminDiscountCenterNav() {
  const pathname = usePathname();

  return (
    <nav className="partner-center-nav discount-center-nav" aria-label="تنقل مركز أكواد الخصم">
      {links.map((link) => {
        const Icon = link.icon;
        const active = link.href === "/admin/promo-codes/discounts" ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} className={active ? "active" : ""}>
            <Icon size={16} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
