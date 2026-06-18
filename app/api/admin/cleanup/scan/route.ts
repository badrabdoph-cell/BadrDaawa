import { NextRequest, NextResponse } from "next/server";
import { runFullScan } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const report = await runFullScan();
    return NextResponse.json({
      ok: true,
      scannedAt: report.scannedAt,
      totalIssues: report.totalIssues,
      totalRecoverableBytes: report.totalRecoverableBytes,
      issues: report.issues.map((i) => ({
        id: i.id,
        category: i.category,
        title: i.title,
        severity: i.severity,
        count: i.count,
        sizeBytes: i.sizeBytes,
      })),
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
