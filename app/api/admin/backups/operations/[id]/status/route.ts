import { NextRequest, NextResponse } from "next/server";
import { getOperation } from "@/lib/operation-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const op = getOperation(id);
  if (!op) {
    return NextResponse.json({ error: "Operation not found or expired" }, { status: 404 });
  }
  return NextResponse.json(op);
}
