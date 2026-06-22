import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getPublishedTemplatePreviewInfo } from "@/lib/template-preview-info";
import { getPublicPublishedTemplateWithPreviewMusic } from "@/lib/template-settings";

export const dynamic = "force-dynamic";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatDate(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  const date = new Date(clean);
  if (Number.isNaN(date.getTime())) return clean;
  return clean;
}

function compactTime(value: string) {
  return value
    .replace(/مساءً/g, "")
    .replace(/صباحًا/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function replaceText(svg: string, original: string, value: string) {
  return svg.replace(new RegExp(`>${escapeRegExp(original)}<`, "g"), `>${escapeXml(value)}<`);
}

function replaceAll(svg: string, replacements: Array<[string, string]>) {
  return replacements.reduce((next, [original, value]) => replaceText(next, original, value), svg);
}

async function readTemplateSvg(previewImage: string) {
  if (!previewImage.startsWith("/assets/templates/") || !previewImage.endsWith(".svg") || previewImage.includes("..")) return "";
  const filePath = path.join(process.cwd(), "public", previewImage);
  return readFile(filePath, "utf8").catch(() => "");
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const [template, previewInfo] = await Promise.all([getPublicPublishedTemplateWithPreviewMusic(slug), getPublishedTemplatePreviewInfo()]);
  if (!template) return new NextResponse("Not found", { status: 404 });

  const baseSvg = await readTemplateSvg(template.previewImage);
  if (!baseSvg) return new NextResponse(null, { status: 307, headers: { Location: template.previewImage } });

  const groomName = previewInfo.groomName;
  const brideName = previewInfo.brideName;
  const coupleAmp = `${groomName} & ${brideName}`;
  const date = formatDate(previewInfo.weddingDate);
  const time = compactTime(previewInfo.weddingTime);
  const venue = previewInfo.venue;
  const city = previewInfo.city;

  const svg = replaceAll(baseSvg, [
    ["بدر", groomName],
    ["Badr", groomName],
    ["Sara", brideName],
    ["بدر &amp; Sara", coupleAmp],
    ["26 / 10 / 2026", date],
    ["26 أكتوبر", date],
    ["26 أكتوبر • 07:00", `${date}${time ? ` • ${time}` : ""}`],
    ["7 PM", time],
    ["07:00", time],
    ["Date", date],
    ["Time", time],
    ["التاريخ", date],
    ["الوقت", time],
    ["المكان", venue],
    ["اليوم والتاريخ", date],
    ["موعد الحضور", time],
    ["القاعة والموقع", [venue, city].filter(Boolean).join(" - ")],
  ]);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
