import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

import { getPostImageTemplates } from "../lib/post-image/registry";

const templates = getPostImageTemplates();
const renderSvgSource = readFileSync("lib/post-image/render-svg.ts", "utf8");
const previewCardSource = readFileSync("components/post-image/PostImagePreviewCard.tsx", "utf8");
const previewRegistryPath = "components/post-image/template-previews.tsx";

assert.ok(existsSync(previewRegistryPath), "post image previews should live in a template preview registry");

const previewRegistrySource = readFileSync("components/post-image/template-previews.tsx", "utf8");

assert.ok(templates.length >= 2, "post image registry should expose every available template");

for (const template of templates) {
  assert.equal(typeof template.renderSvg, "function", `${template.id} should provide its own SVG renderer`);
  assert.match(previewRegistrySource, new RegExp(`"${template.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`), `${template.id} should have a registered preview component`);
}

assert.doesNotMatch(renderSvgSource, /templateId\s*={2,3}\s*["'`]/, "renderPostImageSvg should dispatch through template definitions, not hard-code template ids");
assert.doesNotMatch(previewCardSource, /templateId\s*={2,3}\s*["'`]/, "PostImagePreviewCard should dispatch through preview registry, not hard-code template ids");

console.log("post-image template extensibility tests passed");
