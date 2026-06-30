"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Handshake, History, Percent, PlusCircle } from "lucide-react";

const links = [
  { href: "/admin/partners", label: "لوحة التحكم", icon: BarChart3 },
  { href: "/admin/partners/directory", label: "الشركاء", icon: Handshake },
  { href: "/admin/partners/new", label: "إنشاء شريك", icon: PlusCircle },
  { href: "/admin/promo-codes/discounts", label: "أكواد الخصم", icon: Percent },
  { href: "/admin/partners/activity", label: "سجل العمليات", icon: History },
];

export function AdminPartnerCenterNav() {
  const pathname = usePathname();

  return (
    <nav className="partner-center-nav" aria-label="تنقل مركز الشركاء">
      {links.map((link) => {
        const Icon = link.icon;
        const active = link.href === "/admin/partners" ? pathname === link.href : pathname.startsWith(link.href);
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
