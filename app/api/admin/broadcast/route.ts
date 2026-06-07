import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { queueGitHubSync } from "@/lib/github-sync-queue";
import { getHomeContent, updateHomeContent, type HomeContent } from "@/lib/home-content";
import { getHomePreviewSettings, updateHomePreviewSettings } from "@/lib/preview-settings";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function cleanText(value: string) {
  return value.trim().slice(0, 500);
}

function updateTextContent(content: HomeContent, key: string, value: string) {
  const text = cleanText(value);
  const next = structuredClone(content);

  if (key.startsWith("hero.") && key in next.hero) {
    next.hero[key.slice("hero.".length) as keyof HomeContent["hero"]] = text;
    return next;
  }

  if (key === "features.title") {
    next.features.title = text;
    return next;
  }

  if (key.startsWith("features.points.")) {
    const id = key.replace(/^features\.points\./, "").replace(/\.text$/, "");
    const point = next.features.points.find((item) => item.id === id);
    if (point) point.text = text;
    return next;
  }

  if (key.startsWith("preview.") && key in next.preview) {
    next.preview[key.slice("preview.".length) as keyof HomeContent["preview"]] = text;
    return next;
  }

  if (key.startsWith("pricing.") && key in next.pricing) {
    const field = key.slice("pricing.".length) as keyof Omit<HomeContent["pricing"], "rows">;
    next.pricing[field] = text;
    return next;
  }

  if (key.startsWith("pricing.rows.")) {
    const id = key.replace(/^pricing\.rows\./, "").replace(/\.feature$/, "");
    const row = next.pricing.rows.find((item) => item.id === id);
    if (row) row.feature = text;
    return next;
  }

  return next;
}

function inferPreviewMode(value: string) {
  const clean = value.trim().split("?")[0]?.toLowerCase() || "";
  if (/\.(mp4|webm|mov|m4v)$/.test(clean)) return "video";
  if (/\.(jpg|jpeg|png|webp|gif|svg)$/.test(clean)) return "image";
  return "template";
}

export async function POST(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const formData = await request.formData();
  const key = String(formData.get("key") || "");
  const kind = String(formData.get("kind") || "text");

  if (!key) {
    return NextResponse.redirect(getRedirectUrl("/admin/broadcast?error=missing", request.headers, request.nextUrl.origin), 303);
  }

  if (kind === "media" || key === "preview.media") {
    const settings = await getHomePreviewSettings();
    const mediaUrl = String(formData.get("mediaUrl") || "").trim();
    const templateSlug = String(formData.get("templateSlug") || settings.templateSlug).trim();
    const requestedMode = String(formData.get("mediaMode") || "");
    const mode = requestedMode === "image" || requestedMode === "video" || requestedMode === "template" ? requestedMode : inferPreviewMode(mediaUrl);

    await updateHomePreviewSettings({
      mode,
      templateSlug,
      mediaUrl,
      imageUrl: mode === "image" ? mediaUrl : settings.imageUrl,
      videoUrl: mode === "video" ? mediaUrl : settings.videoUrl,
    });
  } else {
    const content = await getHomeContent();
    await updateHomeContent(updateTextContent(content, key, String(formData.get("value") || "")));
  }

  revalidatePath("/");
  revalidatePath("/admin/broadcast");
  queueGitHubSync(`Broadcast screen updated: ${key}.`, { createSnapshot: true });

  const url = getRedirectUrl("/admin/broadcast", request.headers, request.nextUrl.origin);
  url.searchParams.set("saved", key);
  return NextResponse.redirect(url, 303);
}
