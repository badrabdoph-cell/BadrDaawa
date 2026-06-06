import { NextRequest, NextResponse } from "next/server";

function adminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.AUTH_SECRET || "badrdaawa-admin-local";
}

function clientSessionSecret() {
  return process.env.CLIENT_SESSION_SECRET || process.env.AUTH_SECRET || "badrdaawa-client-local";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const session = request.cookies.get("bd_admin_session")?.value;
    if (session !== adminSessionSecret()) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  const customerMatch = pathname.match(/^\/([^/]+)\/ad_3399(?:\/)?$/);
  if (customerMatch) {
    const code = customerMatch[1];
    const session = request.cookies.get("bd_client_session")?.value;
    if (session !== `${clientSessionSecret()}:${code}`) {
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
