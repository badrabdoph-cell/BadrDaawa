import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { checkAndAutoRestore } = await import("@/lib/auto-restore");
    const result = await checkAndAutoRestore();
    return NextResponse.json({
      ok: result.restored,
      executed: result.executed,
      reason: result.reason,
      fileName: result.fileName,
      itemsRestored: result.itemsRestored,
      durationMs: result.durationMs,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
