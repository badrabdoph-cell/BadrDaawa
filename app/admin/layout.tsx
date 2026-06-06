import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/DashboardShell";

export const metadata: Metadata = {
  title: "لوحة الإدارة",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("bd_admin_session")?.value;
  const expected = process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || "badrdaawa-admin-local";

  if (session !== expected) {
    return children;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
