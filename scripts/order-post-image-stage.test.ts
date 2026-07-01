import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("components/OrderForm.tsx", "utf8");

const postImageStepIndex = source.indexOf('{ id: "postImage", title: "صورة البوست" }');
const reviewStepIndex = source.indexOf('{ id: "review", title: "مراجعة الطلب" }');

assert.ok(postImageStepIndex > -1, "order wizard must include post image step");
assert.ok(reviewStepIndex > -1, "order wizard must include review step");
assert.ok(postImageStepIndex < reviewStepIndex, "post image step must appear before review");
assert.ok(source.includes("<PostImagePreviewCard"), "post image step must render preview card");
assert.equal(source.includes('name="postImage"'), false, "post image step must not add a submitted field");
assert.equal(source.includes("postImage:"), false, "order payload must not add post image data");

console.log("order post-image stage tests passed");
