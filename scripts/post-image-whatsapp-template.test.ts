import assert from "node:assert/strict";

import { getPostImageTemplate, getPostImageTemplates } from "../lib/post-image/registry";
import { renderPostImageSvg } from "../lib/post-image/render-svg";
import type { PostImageRenderPayload } from "../lib/post-image/types";

const templates = getPostImageTemplates();
const whatsappTemplate = getPostImageTemplate("whatsapp-chat");

assert.ok(templates.some((template) => template.id === "whatsapp-chat"), "registry should include whatsapp-chat template");
assert.equal(whatsappTemplate.name, "WhatsApp Chat", "whatsapp-chat template should use the requested display name");
assert.equal(whatsappTemplate.defaultSize.width, 1080, "whatsapp-chat should support the main portrait width");
assert.equal(whatsappTemplate.defaultSize.height, 1350, "whatsapp-chat should support the main portrait height");

const payload: PostImageRenderPayload = {
  templateId: "whatsapp-chat",
  size: whatsappTemplate.defaultSize,
  title: "خبر عاجل!!",
  groomName: "أحمد",
  brideName: "منى",
  weddingDate: "2026-07-22",
  coverImageUrl: "/uploads/demo.jpg",
  invitationUrl: "https://example.com/demo",
  coupleLine: "أحمد هيتجوز منى",
  curiosityDate: "❤️ / 7 / 2026",
  qrCodeDataUrl: "data:image/png;base64,AAAA",
  coverImageDataUrl: "data:image/jpeg;base64,BBBB",
};

const svg = renderPostImageSvg(payload);

assert.match(svg, /whatsapp-chat-template/, "renderer should use the whatsapp chat layout");
assert.match(svg, /أحمد &amp; منى/, "chat header should show groom and bride names");
assert.match(svg, /مساء الخير/, "chat template should include the opening message");
assert.match(svg, /عندنا خبر حلو/, "chat template should include the suspense message");
assert.match(svg, /أخيرًا قررنا نتجوز/, "chat template should include the wedding reveal message");
assert.match(svg, /SAVE THE DATE/, "chat template should include save the date message");
assert.match(svg, /اضغط على الصورة/, "chat template should include the final CTA");
assert.match(svg, /data:image\/png;base64,AAAA/, "chat template should render the QR data URL");
assert.match(svg, /data:image\/jpeg;base64,BBBB/, "chat template should render the cover image data URL");

console.log("post-image whatsapp template tests passed");
