import { NextRequest, NextResponse } from "next/server";
import { getShareableSiteUrl } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cleanSlug = slug.trim();
  const baseUrl = getShareableSiteUrl(request.headers);
  const fallback = new URL("/order", baseUrl);
  if (!cleanSlug) return NextResponse.redirect(fallback, 308);

  const url = new URL(`/r/${encodeURIComponent(cleanSlug)}`, baseUrl);
  return NextResponse.redirect(url, 308);
}
