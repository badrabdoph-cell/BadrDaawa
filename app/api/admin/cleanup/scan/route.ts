import { NextRequest, NextResponse } from "next/server";
import { runFullScan } from "@/lib/cleanup";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const report = await runFullScan();
    return NextResponse.json({ ...report, ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
