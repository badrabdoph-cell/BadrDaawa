import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { getPostImageTemplates } from "../lib/post-image/registry";

const templates = getPostImageTemplates();
const renderSvgSource = readFileSync("lib/post-image/render-svg.ts", "utf8");
const previewCardSource = readFileSync("components/post-image/PostImagePreviewCard.tsx", "utf8");
const previewRegistryPath = "components/post-image/template-previews.tsx";
const guidePath = "docs/post-image-templates.md";

assert.ok(existsSync(previewRegistryPath), "post image previews should live in a template preview registry");
assert.ok(existsSync(guidePath), "post image template contributor guide should exist");

const previewRegistrySource = readFileSync("components/post-image/template-previews.tsx", "utf8");
const guideSource = readFileSync(guidePath, "utf8");

assert.ok(templates.length >= 2, "post image registry should expose every available template");

for (const template of templates) {
  assert.equal(typeof template.renderSvg, "function", `${template.id} should provide its own SVG renderer`);
  assert.match(previewRegistrySource, new RegExp(`"${template.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `${template.id} should have a registered preview component`);
}

assert.doesNotMatch(renderSvgSource, /templateId\s*={2,3}\s*["'`]/, "renderPostImageSvg should dispatch through template definitions, not hard-code template ids");
assert.doesNotMatch(previewCardSource, /templateId\s*={2,3}\s*["'`]/, "PostImagePreviewCard should dispatch through preview registry, not hard-code template ids");
assert.match(guideSource, /PostImageTemplate\.manifest/, "template guide should explain the template manifest contract");
assert.match(guideSource, /renderSvg\(payload\)/, "template guide should explain the SVG renderer contract");
assert.match(guideSource, /template-previews\.tsx/, "template guide should explain preview registration");
assert.match(guideSource, /portrait-4x5/, "template guide should mention the main portrait size");
assert.match(guideSource, /open-graph/, "template guide should mention the Open Graph variant");
assert.match(guideSource, /visual QA/i, "template guide should require visual QA before release");

console.log("post-image template extensibility tests passed");
