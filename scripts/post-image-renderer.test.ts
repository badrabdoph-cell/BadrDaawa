import assert from "node:assert/strict";

import { generatePostImage } from "../lib/post-image/generator";
import { getDefaultPostImageTemplate, getPostImageSize } from "../lib/post-image/registry";
import { renderPostImageSvg } from "../lib/post-image/render-svg";
import { createPostImageSignature } from "../lib/post-image/signature";

const template = getDefaultPostImageTemplate();
const size = getPostImageSize(template.id, "portrait-4x5");

assert.equal(template.id, "breaking-news-v1");
assert.equal(size.width, 1080);
assert.equal(size.height, 1350);

const signatureInput = {
  templateId: template.id,
  size,
  groomName: "أحمد",
  brideName: "منى",
  weddingDate: "2026-06-06",
  coverImageUrl: "/uploads/client-invitations/demo/cover.jpg",
  invitationUrl: "https://example.com/demo",
};

const svg = renderPostImageSvg({
  ...signatureInput,
  title: "خبر عاجل!!",
  coupleLine: "أحمد هيتجوز منى",
  curiosityDate: "❤️ / 6 / 2026",
  qrCodeDataUrl:
    "data:image/svg+xml;base64," +
    Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="white"/></svg>').toString("base64"),
  coverImageDataUrl: null,
});

assert.ok(svg.includes('width="1080"'), "SVG should use target width");
assert.ok(svg.includes('height="1350"'), "SVG should use target height");
assert.ok(svg.includes("خبر عاجل!!"), "SVG should contain title");
assert.ok(svg.includes("أحمد هيتجوز منى"), "SVG should contain couple line");

const generated = await generatePostImage({
  ...signatureInput,
  coverImageUrl: null,
});

assert.equal(generated.width, 1080);
assert.equal(generated.height, 1350);
assert.equal(generated.contentType, "image/png");
assert.ok(generated.bytes.length > 20_000, "PNG should not be blank/tiny");
assert.equal(generated.signature, createPostImageSignature({ ...signatureInput, coverImageUrl: null }));

console.log("post-image renderer tests passed");
