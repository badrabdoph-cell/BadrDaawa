import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginPanel } from "@/components/LoginPanel";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { isAdminAuthConfigured } from "@/lib/auth-config";

export const metadata: Metadata = {
  title: "دخول الادمن",
};

type AdminLoginSearchParams = {
  error?: string;
  next?: string;
  setup?: string;
  scope?: string;
};

function isClientInvitationsNext(value: string) {
  return value === "/client-invitations" || value.startsWith("/client-invitations/") || value.startsWith("/client-invitations?");
}

function sanitizeLoginNext(value?: string) {
  if (!value || value.startsWith("//") || value.startsWith("/admin/login")) return "/admin";
  if (value.startsWith("/admin") || isClientInvitationsNext(value)) return value;
  return "/admin";
}

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<AdminLoginSearchParams> }) {
  const params = await searchParams;
  const next = sanitizeLoginNext(params.next);
  const isClientInvitationsLogin = params.scope === "client-invitations" || isClientInvitationsNext(next);
  const cookieStore = await cookies();
  if (await verifyAdminSessionCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value)) {
    redirect(next);
  }

  return (
    <LoginPanel
      action="/api/auth/admin/login"
      title={isClientInvitationsLogin ? "دخول الأدمن لدعوات العملاء" : "دخول الادمن الرئيسي"}
      description={
        isClientInvitationsLogin
          ? "تسجيل الدخول للصفحة دي خاص بالأدمن فقط. استخدم نفس يوزر وباسورد الأدمن للوصول إلى دعوات العملاء."
          : "التحكم الكامل في الدعوات، العملاء، الطلبات، القوالب، والروابط."
      }
      error={params.error}
      setupWarning={params.setup || !isAdminAuthConfigured() ? "أضف ADMIN_USERNAME و ADMIN_PASSWORD أو ADMIN_USER و ADMIN_PASS في Railway قبل الدخول للإنتاج." : undefined}
      hiddenFields={{ next }}
    />
  );
}
