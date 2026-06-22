import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie, getAdminSessionUser } from "@/lib/admin-session";
import { downloadAndRestoreFromGitHub, logRestoreAttempt } from "@/lib/backups";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAdminEmail(request: NextRequest) {
  const session = await getAdminSessionUser(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  return session || "unknown";
}

export async function POST(request: NextRequest) {
  if (!(await verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (process.env.ALLOW_DESTRUCTIVE_RESTORE !== "I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL") {
    return NextResponse.json(
      { error: "Restore is disabled. Set ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL to enable." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.fileName !== "string") {
    return NextResponse.json({ error: "Missing fileName in request body" }, { status: 400 });
  }

  const fileName: string = body.fileName;
  const sha: string | undefined = body.sha;
  const createdAt: string | undefined = body.createdAt;

  const adminEmail = await getAdminEmail(request);
  const result = await downloadAndRestoreFromGitHub(fileName, {
    githubSha: sha,
    createdAt: createdAt ? new Date(createdAt) : undefined,
  });

  await logRestoreAttempt({
    type: "github-v1",
    status: result.ok ? "success" : "failed",
    fileName,
    commitSha: sha,
    itemsRestored: result.itemsRestored,
    uploadsRestored: result.uploadsRestored,
    error: result.error,
    durationMs: result.durationMs,
    performedBy: adminEmail,
  });

  revalidatePath("/admin/backups");

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
