import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/LoginPanel";
import { getAdminSessionSecret, isAdminAuthConfigured } from "@/lib/auth-config";

export const metadata: Metadata = {
  title: "دخول الادمن",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; setup?: string }> }) {
  const params = await searchParams;
  const cookieStore = await cookies();
  if (cookieStore.get("bd_admin_session")?.value === getAdminSessionSecret()) {
    redirect("/admin");
  }

  return (
    <LoginPanel
      action="/api/auth/admin/login"
      title="دخول الادمن الرئيسي"
      description="التحكم الكامل في الدعوات، العملاء، الطلبات، القوالب، والروابط."
      error={params.error}
      setupWarning={params.setup || !isAdminAuthConfigured() ? "أضف ADMIN_USERNAME و ADMIN_PASSWORD في Railway قبل الدخول للإنتاج." : undefined}
      hiddenFields={{ next: params.next || "/admin" }}
    />
  );
}
