import { NextRequest, NextResponse } from "next/server";
import { checkAndAutoPublish } from "@/lib/auto-publish-scheduler";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!process.env.AUTO_PUBLISH_CRON_SECRET) {
    console.warn("[Auto-Publish] AUTO_PUBLISH_CRON_SECRET is not set; skipping auto-publish check");
    return NextResponse.json({ success: false, error: "Not configured" }, { status: 200 });
  }
  if (secret !== process.env.AUTO_PUBLISH_CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkAndAutoPublish();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Auto-publish check failed:", error);
    return NextResponse.json({ success: false, error: "Auto-publish check failed" }, { status: 500 });
  }
}
