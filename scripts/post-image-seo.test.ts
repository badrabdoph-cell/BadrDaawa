import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const seo = readFileSync("lib/invitation-seo.ts", "utf8");

assert.match(seo, /postImageOgUrl/, "SEO metadata should prefer Open Graph post image asset");
assert.match(seo, /postImageOgWidth/, "SEO metadata should expose Open Graph width");
assert.match(seo, /postImageOgHeight/, "SEO metadata should expose Open Graph height");
assert.match(seo, /width:\s*image\.width/, "SEO metadata should use selected image width");
assert.match(seo, /height:\s*image\.height/, "SEO metadata should use selected image height");

console.log("post-image SEO tests passed");
