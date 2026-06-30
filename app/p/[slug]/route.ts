import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const cleanSlug = slug.trim();
  const fallback = new URL("/order", request.url);
  if (!cleanSlug) return NextResponse.redirect(fallback, 308);

  const url = new URL(`/r/${encodeURIComponent(cleanSlug)}`, request.url);
  return NextResponse.redirect(url, 308);
}
