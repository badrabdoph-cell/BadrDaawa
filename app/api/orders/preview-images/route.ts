import { NextResponse } from "next/server";
import { saveOrderPreviewImages } from "@/lib/order-preview-images";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { images?: unknown } | null;
  const images = Array.isArray(body?.images) ? body.images.filter((image): image is string => typeof image === "string") : [];
  const imageUrls = await saveOrderPreviewImages(images);

  return NextResponse.json({ ok: true, imageUrls });
}
