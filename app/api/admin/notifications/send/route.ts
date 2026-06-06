import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionSecret } from "@/lib/auth-config";
import { sendPushNotification } from "@/lib/push-notifications";

function isAdmin(request: NextRequest) {
  return request.cookies.get("bd_admin_session")?.value === getAdminSessionSecret();
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.redirect(new URL("/admin/login", request.url), 303);
  }

  const formData = await request.formData();
  const title = String(formData.get("title") || "BadrDaawa").trim();
  const body = String(formData.get("body") || "").trim();
  const url = String(formData.get("url") || "/").trim();

  if (!body) {
    return NextResponse.redirect(new URL("/admin?notify=empty", request.url), 303);
  }

  try {
    const result = await sendPushNotification({ title, body, url });
    const status = result.ok ? `sent-${result.successCount}-${result.failureCount}` : "demo";
    return NextResponse.redirect(new URL(`/admin?notify=${status}`, request.url), 303);
  } catch (error) {
    console.error("Failed to send push notification", error);
    return NextResponse.redirect(new URL("/admin?notify=error", request.url), 303);
  }
}
