import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { saveOrderPreviewImages, type PreviewImageInput } from "@/lib/order-preview-images";

export const runtime = "nodejs";
export const maxDuration = 45;

const maxPreviewRequestBytes = 36 * 1024 * 1024;

function isPreviewImageInput(value: unknown): value is PreviewImageInput {
  if (typeof value === "string") return true;
  if (typeof File !== "undefined" && value instanceof File) return value.size > 0;
  if (!value || typeof value !== "object") return false;
  const input = value as { dataUrl?: unknown };
  return typeof input.dataUrl === "string";
}

export async function POST(request: Request) {
  const requestId = `preview-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
  const startedAt = Date.now();
  const contentType = request.headers.get("content-type") || "";
  const contentLength = Number(request.headers.get("content-length") || 0);
  const referer = request.headers.get("referer") || "";
  let images: PreviewImageInput[] = [];

  console.log(
    `[Preview Images ${requestId}] Start contentType=${contentType || "unknown"} contentLength=${contentLength || "unknown"} referer=${referer || "unknown"}.`,
  );

  if (contentLength > maxPreviewRequestBytes) {
    console.error(`[Preview Images ${requestId}] Rejected large request: ${contentLength} bytes.`);
    return NextResponse.json(
      { ok: false, error: "حجم الصورة كبير جداً. اضغط الصورة أو اختار صورة أقل من 32MB ثم حاول مرة أخرى." },
      { status: 413 },
    );
  }

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData().catch((error) => {
        console.error(`[Preview Images ${requestId}] Failed to parse multipart payload.`, error);
        return null;
      });
      images = formData?.getAll("images").filter(isPreviewImageInput) || [];
    } else {
      const body = (await request.json().catch((error) => {
        console.error(`[Preview Images ${requestId}] Failed to parse JSON payload.`, error);
        return null;
      })) as { images?: unknown } | null;
      images = Array.isArray(body?.images) ? body.images.filter(isPreviewImageInput) : [];
    }

    console.log(`[Preview Images ${requestId}] Parsed ${images.length} image(s).`);

    if (!images.length) {
      return NextResponse.json({ ok: false, error: "لم تصل أي صورة صالحة للخادم. اختار صورة JPG/PNG/WebP وحاول مرة أخرى." }, { status: 400 });
    }

    const imageUrls = await saveOrderPreviewImages(images, "order-previews", requestId);
    if (!imageUrls.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "الصورة لم تصل كملف صالح أو تبدو تالفة. جرّب رفع JPG أو PNG أو HEIC أو AVIF من جديد.",
        },
        { status: 422 },
      );
    }

    queueGitHubSync(`Order preview image uploaded: ${imageUrls.join(", ")}.`);
    console.log(`[Preview Images ${requestId}] Done in ${Date.now() - startedAt}ms.`, imageUrls);
    return NextResponse.json({ ok: true, imageUrls });
  } catch (error) {
    console.error(`[Preview Images ${requestId}] Unexpected upload failure after ${Date.now() - startedAt}ms.`, error);
    return NextResponse.json(
      { ok: false, error: "حصل خطأ أثناء حفظ الصورة. جرّب مرة أخرى، ولو تكرر الخطأ ارفع صورة أصغر." },
      { status: 500 },
    );
  }
}
