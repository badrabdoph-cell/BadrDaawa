import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { prisma } from "@/lib/db";
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
    console.error("[Admin Customer] PostgreSQL is not configured. Refusing operational write.");
    return redirectCustomers(request, "database");
  }

  const result = await prisma.customer.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  const changed = result.count > 0;
  if (!changed) return redirectCustomers(request, "missing");

  revalidatePath("/admin/customers");
    revalidatePath("/admin/invitations-customers");
  revalidatePath("/admin/trash");
  return redirectCustomers(request, "deleted");
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ ok: false, error: "غير مصرح." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ ok: false, error: "معرف العميل مطلوب." }, { status: 400 });

  if (!prisma) {
    return NextResponse.json({ ok: false, error: "قاعدة البيانات غير متاحة." }, { status: 503 });
  }

  let body: { name?: string; phone?: string; email?: string | null; isActive?: boolean };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "بيانات غير صالحة." }, { status: 400 });
  }

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return NextResponse.json({ ok: false, error: "العميل غير موجود." }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.phone !== undefined) updateData.phone = body.phone;
  if (body.email !== undefined) updateData.email = body.email || null;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  await prisma.customer.update({ where: { id }, data: { name: body.name, phone: body.phone, email: body.email === undefined ? undefined : body.email, isActive: body.isActive } as never });
  revalidatePath("/admin/customers");
    revalidatePath("/admin/invitations-customers");
  return NextResponse.json({ ok: true });
}
