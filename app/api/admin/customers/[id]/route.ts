import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { prisma } from "@/lib/db";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getRedirectUrl } from "@/lib/utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function redirectCustomers(request: NextRequest, status: string) {
  const url = getRedirectUrl("/admin/customers", request.headers, request.nextUrl.origin);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const { id } = await context.params;
  const formData = await request.formData();
  const action = String(formData.get("action") || "");
  if (!id || action !== "delete") return redirectCustomers(request, "invalid");

  if (!prisma) {
    console.error("[Admin Customer] PostgreSQL is not configured. Refusing runtime-store fallback write.");
    return redirectCustomers(request, "database");
  }

  const result = await prisma.customer.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  const changed = result.count > 0;
  if (!changed) return redirectCustomers(request, "missing");

  revalidatePath("/admin/customers");
  revalidatePath("/admin/trash");
  queueGitHubSync(`Customer moved to trash: ${id}.`, { createSnapshot: true });
  return redirectCustomers(request, "deleted");
}
