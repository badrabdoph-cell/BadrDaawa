"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

export function ClientInvitationsSearch({ query }: { query: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const q = ((formData.get("q") as string) || "").trim();
    if (q) {
      router.push(`${pathname}?q=${encodeURIComponent(q)}`);
    } else {
      router.push(pathname);
    }
  }

  return (
    <form className="admin-table-toolbar" onSubmit={handleSubmit}>
      <label className="admin-search-field">
        <Search size={17} />
        <input name="q" placeholder="ابحث بالاسم، الكود، القالب أو المكان" defaultValue={query || ""} />
      </label>
      <button className="btn btn-soft" type="submit">بحث</button>
      {query ? (
        <Link className="btn btn-soft" href="/client-invitations">مسح</Link>
      ) : null}
    </form>
  );
}
