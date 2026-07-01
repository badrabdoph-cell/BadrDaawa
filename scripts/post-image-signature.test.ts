import assert from "node:assert/strict";

import { formatPostImageCuriosityDate } from "../lib/post-image/date";
import { createPostImageSignature } from "../lib/post-image/signature";
import type { PostImageSignatureInput } from "../lib/post-image/types";

const baseInput: PostImageSignatureInput = {
  templateId: "breaking-news-v1",
  size: { id: "portrait-4x5", width: 1080, height: 1350 },
  groomName: "أحمد",
  brideName: "منى",
  weddingDate: "2026-06-06",
  coverImageUrl: "/uploads/client-invitations/demo/cover.jpg",
  invitationUrl: "https://example.com/demo",
};

assert.equal(formatPostImageCuriosityDate("2026-06-06"), "❤️ / 6 / 2026");
assert.equal(formatPostImageCuriosityDate(new Date("2026-12-24T18:00:00.000Z")), "❤️ / 12 / 2026");

const originalSignature = createPostImageSignature(baseInput);
const sameSignature = createPostImageSignature({
  ...baseInput,
  groomName: " أحمد ",
  brideName: "منى",
});

assert.equal(sameSignature, originalSignature, "trim-only changes should not regenerate");

const changedVisibleData = createPostImageSignature({
  ...baseInput,
  brideName: "سارة",
});

assert.notEqual(changedVisibleData, originalSignature, "visible name changes must regenerate");

const changedDayOnly = createPostImageSignature({
  ...baseInput,
  weddingDate: "2026-06-20",
});

assert.equal(changedDayOnly, originalSignature, "hidden day changes should not regenerate");

const changedMonth = createPostImageSignature({
  ...baseInput,
  weddingDate: "2026-07-06",
});

assert.notEqual(changedMonth, originalSignature, "visible month changes must regenerate");

const changedUrl = createPostImageSignature({
  ...baseInput,
  invitationUrl: "https://example.com/another-demo",
});

assert.notEqual(changedUrl, originalSignature, "QR URL changes must regenerate");

console.log("post-image signature tests passed");
