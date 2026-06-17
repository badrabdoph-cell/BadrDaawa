"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Filter, CalendarDays } from "lucide-react";

type Props = {
  query: string;
  selectedState: string;
  selectedSort: string;
};

export function AdminInvitationFilters({ query, selectedState, selectedSort }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    params.set("q", (formData.get("q") as string) || "");
    params.set("state", (formData.get("state") as string) || "all");
    params.set("sort", (formData.get("sort") as string) || "newest");
    router.push(`${pathname}?${params.toString()}`);
  }

  const hasFilters = query || selectedState !== "all" || selectedSort !== "newest";

  return (
    <form className="admin-table-toolbar" onSubmit={handleSubmit}>
      <label className="admin-search-field">
        <Search size={17} />
        <input name="q" placeholder="ابحث بالاسم، الكود، القالب أو المكان" defaultValue={query || ""} />
      </label>
      <label className="admin-select-field">
        <Filter size={17} />
        <select name="state" defaultValue={selectedState} aria-label="فلترة حالة الدعوة">
          <option value="all">كل الحالات</option>
          <option value="active">نشطة</option>
          <option value="paused">متوقفة</option>
          <option value="disabled">معطلة</option>
          <option value="expired">منتهية</option>
          <option value="archived">مؤرشفة</option>
        </select>
      </label>
      <label className="admin-select-field">
        <CalendarDays size={17} />
        <select name="sort" defaultValue={selectedSort} aria-label="ترتيب الدعوات">
          <option value="newest">الأحدث إنشاء</option>
          <option value="weddingDate">حسب تاريخ الفرح</option>
          <option value="views">الأكثر زيارة</option>
          <option value="attendees">الأكثر حضوراً</option>
        </select>
      </label>
      <button className="btn btn-soft" type="submit">تطبيق</button>
      {hasFilters ? (
        <Link className="btn btn-soft" href="/admin/invitations">مسح</Link>
      ) : null}
    </form>
  );
}
