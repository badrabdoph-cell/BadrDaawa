import type { Metadata } from "next";
import { LoginPanel } from "@/components/LoginPanel";

export const metadata: Metadata = {
  title: "دخول الادمن",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;

  return (
    <LoginPanel
      action="/api/auth/admin/login"
      title="دخول الادمن الرئيسي"
      description="التحكم الكامل في الدعوات، العملاء، الطلبات، القوالب، والروابط."
      error={params.error}
      hiddenFields={{ next: params.next || "/admin" }}
    />
  );
}
