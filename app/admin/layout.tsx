import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DashboardShell } from "@/components/DashboardShell";
import { getAdminSessionSecret } from "@/lib/auth-config";

export const metadata: Metadata = {
  title: "لوحة الإدارة",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get("bd_admin_session")?.value;
  const expected = getAdminSessionSecret();

  if (session !== expected) {
    return children;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
