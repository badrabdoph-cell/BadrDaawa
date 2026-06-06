import { NextResponse } from "next/server";
import { getPublicUrl } from "@/lib/utils";

export async function POST(request: Request) {
  const response = NextResponse.redirect(getPublicUrl("/admin/login", request.headers, request.url), 303);
  response.cookies.delete("bd_admin_session");
  return response;
}
