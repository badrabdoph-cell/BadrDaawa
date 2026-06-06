import type { Metadata } from "next";
import { LoginPanel } from "@/components/LoginPanel";
import { isAdminAuthConfigured } from "@/lib/auth-config";

export const metadata: Metadata = {
  title: "دخول الادمن",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string; setup?: string }> }) {
  const params = await searchParams;

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
