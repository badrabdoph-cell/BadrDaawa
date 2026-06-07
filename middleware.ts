import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getClientSessionSecret } from "@/lib/auth-config";
import { getRedirectUrl } from "@/lib/utils";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!(await verifyAdminSessionCookie(session))) {
      const url = getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const customerMatch = pathname.match(/^\/([^/]+)\/ad_3399(?:\/)?$/);
  if (customerMatch) {
    const code = customerMatch[1];
    const session = request.cookies.get("bd_client_session")?.value;
    if (session !== `${getClientSessionSecret()}:${code}`) {
      const url = request.nextUrl.clone();
      url.pathname = `/${code}/ad_3399/login`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/:code/ad_3399"],
};
