import { NextResponse } from "next/server";
import { getLatestNotification } from "@/lib/push-notifications";

export async function GET() {
  return NextResponse.json(await getLatestNotification());
}
