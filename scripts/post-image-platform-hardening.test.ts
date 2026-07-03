import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { getPostImageTemplateManifests, getPostImageTemplates } from "../lib/post-image/registry";
import { embedPostImageFonts } from "../lib/post-image/font";
import { fitTextOneLine, postImageSafeArea } from "../lib/post-image/layout";
import { renderPostImageSvg } from "../lib/post-image/render-svg";
import type { PostImageRenderPayload } from "../lib/post-image/types";

const templates = getPostImageTemplates();
const manifests = getPostImageTemplateManifests();

assert.ok(existsSync("public/fonts/NotoNaskhArabic-Regular.ttf"), "post image rendering should use the bundled Arabic font");
assert.equal(manifests.length, templates.length, "template manifests should match registered templates");

for (const template of templates) {
  assert.equal(template.manifest.id, template.id, "template manifest id should match template id");
  assert.ok(template.manifest.previewId, `${template.id} should declare a preview id`);
  assert.ok(template.manifest.version, `${template.id} should declare a stable version`);
  assert.ok(template.manifest.description, `${template.id} should describe the design`);
  assert.ok(template.manifest.defaultSizeId, `${template.id} should declare default size id`);
  assert.ok(template.supportedSizes.some((size) => size.id === "open-graph"), `${template.id} should support Open Graph output`);
}

assert.equal(fitTextOneLine("قصير", { base: 82, min: 54, maxCharacters: 18 }), 82);
assert.ok(fitTextOneLine("اسم طويل جدا جدا يحتاج تصغير ذكي", { base: 82, min: 54, maxCharacters: 18 }) < 82);
assert.deepEqual(postImageSafeArea({ width: 1080, height: 1350 }, 70), { x: 70, y: 70, width: 940, height: 1210 });

const fontCss = embedPostImageFonts();
assert.match(fontCss, /@font-face/, "font helper should emit font-face CSS");
assert.match(fontCss, /BadrDaawaArabic/, "font helper should expose the deterministic Arabic font family");

const payload: PostImageRenderPayload = {
  templateId: "breaking-news-v1",
  size: { id: "portrait-4x5", width: 1080, height: 1350 },
  groomName: "بدر",
  brideName: "سارة",
  weddingDate: "2026-07-22",
  coverImageUrl: null,
  invitationUrl: "https://example.com/demo",
  title: "خبر عاجل!!",
  coupleLine: "بدر هيتجوز سارة",
  curiosityDate: "❤️ / 7 / 2026",
  qrCodeDataUrl: "data:image/png;base64,AAAA",
  coverImageDataUrl: null,
  fontCss,
};

const svg = renderPostImageSvg(payload);
assert.match(svg, /BadrDaawaArabic/, "rendered SVG should include deterministic font CSS");
assert.match(svg, /@font-face/, "rendered SVG should embed font-face CSS");

console.log("post-image platform hardening tests passed");
