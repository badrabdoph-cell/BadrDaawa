import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { generatePostImageSet } from "../lib/post-image/generator";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const service = readFileSync("lib/post-image/service.ts", "utf8");
const types = readFileSync("lib/types.ts", "utf8");
const adminData = readFileSync("lib/admin-data.ts", "utf8");
const invitationData = readFileSync("lib/invitation-data.ts", "utf8");

assert.match(schema, /postImageOgUrl\s+String\?/, "Invitation should store Open Graph post image URL");
assert.match(schema, /postImageOgSignature\s+String\?/, "Invitation should store Open Graph post image signature");
assert.match(schema, /postImageGenerationToken\s+String\?/, "Invitation should store a generation lock token");
assert.match(schema, /postImageGenerationStartedAt\s+DateTime\?/, "Invitation should store generation lock start time");

assert.match(service, /generatePostImageSet/, "post image service should generate a variant set");
assert.match(service, /postImageOgUrl/, "post image service should persist the Open Graph asset");
assert.match(types, /postImageOgUrl\?: string/, "shared Invitation type should expose Open Graph post image URL");
assert.match(adminData, /postImageOgUrl/, "admin data should expose Open Graph post image URL");
assert.match(invitationData, /postImageOgUrl/, "public invitation data should expose Open Graph post image URL");

const generated = await generatePostImageSet({
  templateId: "breaking-news-v1",
  groomName: "بدر",
  brideName: "سارة",
  weddingDate: "2026-07-22",
  coverImageUrl: null,
  invitationUrl: "https://example.com/demo",
});

assert.equal(generated.portrait.size.id, "portrait-4x5");
assert.equal(generated.openGraph.size.id, "open-graph");
assert.equal(generated.openGraph.width, 1200);
assert.equal(generated.openGraph.height, 630);
assert.notEqual(generated.portrait.signature, generated.openGraph.signature, "variant signatures should include size");

console.log("post-image variants tests passed");
