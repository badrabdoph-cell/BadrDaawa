import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { deleteMediaFilesByAction, type StorageCleanupAction } from "@/lib/media-cleanup";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ct = request.headers.get("content-type") || "";
    let action: string;
    if (ct.includes("json")) {
      const body = await request.json();
      action = body.action;
    } else {
      const formData = await request.formData();
      action = (formData.get("action") as string) || "orphans";
    }

    const validActions: StorageCleanupAction[] = [
      "orphans", "duplicates", "original-images", "music-unused",
      "database-orphans", "old-backups", "all",
    ];

    if (!validActions.includes(action as StorageCleanupAction)) {
      return NextResponse.json({ ok: false, error: `إجراء غير صالح: ${action}` }, { status: 400 });
    }

    const result = await deleteMediaFilesByAction(action as StorageCleanupAction);

    revalidatePath("/admin/cleanup");
    revalidatePath("/admin/cleanup/media");
    revalidatePath("/admin/cleanup/backups");
    revalidatePath("/admin/cleanup/scan");
    revalidatePath("/admin/media");
    revalidatePath("/admin/backups");

    return NextResponse.json({
      ok: true,
      action: result.action,
      deletedFiles: result.deletedFiles.length,
      deletedBackups: result.deletedBackups.length,
      deletedDatabaseOrphans: result.deletedDatabaseOrphans.length,
      deletedSizeBytes: result.deletedSizeBytes,
      skippedFiles: result.skippedFiles.length,
      backupFileName: result.backupFileName,
      redirect: `/admin/cleanup/media?status=cleaned&count=${result.deletedFiles.length}&size=${result.deletedSizeBytes}`,
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
