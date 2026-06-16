import { NextResponse } from "next/server";
import { readAppSetting } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await readAppSetting<{ apiKey: string } | null>("project-content:google-maps");
    const apiKey = settings?.apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
    return NextResponse.json({ key: apiKey });
  } catch {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "";
    return NextResponse.json({ key: apiKey });
  }
}
