import assert from "node:assert/strict";

import { selectPostImageCoverUrl, shouldSkipPostImageGeneration } from "../lib/post-image/service";

assert.equal(
  shouldSkipPostImageGeneration(
    { postImageStatus: "GENERATED", postImageSignature: "abc", postImageUrl: "/uploads/client-invitations/post-images/demo/a.png" },
    "abc",
  ),
  true,
  "generated image with matching signature should be reused",
);

assert.equal(
  shouldSkipPostImageGeneration(
    { postImageStatus: "GENERATED", postImageSignature: "abc", postImageUrl: "/uploads/client-invitations/post-images/demo/a.png" },
    "def",
  ),
  false,
  "changed signature should regenerate",
);

assert.equal(
  shouldSkipPostImageGeneration(
    { postImageStatus: "FAILED", postImageSignature: "abc", postImageUrl: "/uploads/client-invitations/post-images/demo/a.png" },
    "abc",
  ),
  false,
  "failed state should regenerate",
);

assert.equal(
  shouldSkipPostImageGeneration(
    { postImageStatus: "GENERATED", postImageSignature: "abc", postImageUrl: "/uploads/client-invitations/post-images/demo/a.png" },
    "abc",
    true,
  ),
  false,
  "force should regenerate",
);

assert.equal(selectPostImageCoverUrl({ heroPhoto: "/uploads/cover.jpg", gallery: ["/uploads/one.jpg"] }), "/uploads/cover.jpg");
assert.equal(selectPostImageCoverUrl({ heroPhoto: "", gallery: ["/uploads/one.jpg"] }), "/uploads/one.jpg");
assert.equal(selectPostImageCoverUrl({ heroPhoto: "", gallery: [] }), "");

console.log("post-image service tests passed");
