import { NextRequest, NextResponse } from "next/server";
import { createOperation } from "@/lib/operation-progress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const type = body.type;
  if (!type || typeof type !== "string") {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }
  const { id } = createOperation(type);
  return NextResponse.json({ operationId: id });
}
