import { NextResponse } from "next/server";
import { saveOrderPreviewImages, type PreviewImageInput } from "@/lib/order-preview-images";

export const runtime = "nodejs";

function isPreviewImageInput(value: unknown): value is PreviewImageInput {
  if (typeof value === "string") return true;
  if (typeof File !== "undefined" && value instanceof File) return value.size > 0;
  if (!value || typeof value !== "object") return false;
  const input = value as { dataUrl?: unknown };
  return typeof input.dataUrl === "string";
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  let images: PreviewImageInput[] = [];

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData().catch(() => null);
    images = formData?.getAll("images").filter(isPreviewImageInput) || [];
  } else {
    const body = (await request.json().catch(() => null)) as { images?: unknown } | null;
    images = Array.isArray(body?.images) ? body.images.filter(isPreviewImageInput) : [];
  }

  const imageUrls = await saveOrderPreviewImages(images);
  if (images.length && !imageUrls.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "تعذر تحويل الصورة لصيغة قابلة للعرض. جرّب رفع JPG أو PNG أو صورة HEIC أوضح/أقل حجمًا.",
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, imageUrls });
}
