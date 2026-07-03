import Link from "next/link";
import { Archive, MessageSquareText, PlusCircle, Search, Sparkles, UserCheck, UsersRound } from "lucide-react";

type AdminContactsCommandCenterProps = {
  active: "customers" | "invitations" | "unified" | "messages" | "new-invitation";
  title?: string;
  description?: string;
};

const links = [
  { key: "customers", href: "/admin/customers", label: "كل العملاء", icon: UserCheck },
  { key: "invitations", href: "/admin/invitations", label: "الدعوات", icon: Archive },
  { key: "unified", href: "/admin/invitations-customers", label: "الدعوات والعملاء", icon: UsersRound },
  { key: "messages", href: "/admin/messages", label: "الرسائل", icon: MessageSquareText },
  { key: "new-invitation", href: "/admin/new-invitation", label: "دعوة جديدة", icon: PlusCircle },
] as const;

export function AdminContactsCommandCenter({
  active,
  title = "مركز قيادة جهات الاتصال الجديد",
  description = "نسخة CRM v2 تجمع العملاء، الدعوات، الرسائل، والملفات الموحدة في مسار تشغيل واحد واضح.",
}: AdminContactsCommandCenterProps) {
  return (
    <section className="contacts-command-center" aria-label="مركز قيادة جهات الاتصال">
      <div className="contacts-command-copy">
        <span>
          <Sparkles size={15} />
          CRM v2 Production
        </span>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <nav className="contacts-command-nav" aria-label="تنقل جهات الاتصال الجديد">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.key} className={active === item.key ? "active" : ""} href={item.href}>
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <form className="contacts-command-search" action="/admin/search" method="get">
        <Search size={16} />
        <input name="q" placeholder="بحث سريع في العملاء والدعوات والرسائل" />
        <button type="submit">بحث</button>
      </form>
    </section>
  );
}
