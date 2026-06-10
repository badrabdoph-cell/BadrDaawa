import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { CLIENT_SESSION_COOKIE, verifyClientSessionCookie } from "@/lib/client-session";
import { addSecurityHeaders, isSameOriginRequest } from "@/lib/security-enhancements";
import { getRedirectUrl } from "@/lib/utils";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isUnsafeMethod = !["GET", "HEAD", "OPTIONS"].includes(request.method);

  if ((pathname.startsWith("/api/admin") || pathname.startsWith("/api/client")) && isUnsafeMethod && !isSameOriginRequest(request)) {
    return addSecurityHeaders(NextResponse.json({ error: "تم رفض الطلب بسبب مصدر غير موثوق." }, { status: 403 }));
  }

  if (pathname.startsWith("/api/admin")) {
    const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!(await verifyAdminSessionCookie(session))) {
      return addSecurityHeaders(NextResponse.json({ error: "غير مصرح." }, { status: 401 }));
    }
  }

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!(await verifyAdminSessionCookie(session))) {
      const url = getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin);
      url.searchParams.set("next", pathname);
      return addSecurityHeaders(NextResponse.redirect(url));
    }
  }

  const customerMatch = pathname.match(/^\/([^/]+)\/ad_3399(?:\/.*)?$/);
  const isCustomerLoginPage = /^\/[^/]+\/ad_3399\/login(?:\/)?$/.test(pathname);
  if (isCustomerLoginPage) {
    const url = getRedirectUrl("/manage/invitation/invalid", request.headers, request.nextUrl.origin);
    url.searchParams.set("reason", "session");
    return addSecurityHeaders(NextResponse.redirect(url));
  }
  if (customerMatch) {
    const code = customerMatch[1];
    const session = request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
    if (!(await verifyClientSessionCookie(session, code))) {
      const url = getRedirectUrl("/manage/invitation/invalid", request.headers, request.nextUrl.origin);
      url.searchParams.set("reason", "session");
      return addSecurityHeaders(NextResponse.redirect(url));
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/client/:path*", "/:code/ad_3399", "/:code/ad_3399/:path*"],
};
