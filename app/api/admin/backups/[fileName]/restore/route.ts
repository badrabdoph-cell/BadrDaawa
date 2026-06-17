import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { restoreFromBackup } from "@/lib/backups";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ fileName: string }>;
};

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileName } = await context.params;

  if (process.env.ALLOW_DESTRUCTIVE_RESTORE !== "I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL") {
    return NextResponse.json(
      { error: "Restore is disabled. Set ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL to enable." },
      { status: 403 },
    );
  }

  const result = await restoreFromBackup(fileName);
  revalidatePath("/admin/backups");

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
