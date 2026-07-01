import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const orderForm = readFileSync("components/OrderForm.tsx", "utf8");
const previewCard = readFileSync("components/post-image/PostImagePreviewCard.tsx", "utf8");
const previewRegistry = readFileSync("components/post-image/template-previews.tsx", "utf8");
const validation = readFileSync("lib/validation.ts", "utf8");
const orderRoute = readFileSync("app/api/orders/route.ts", "utf8");
const adminOrderRoute = readFileSync("app/api/admin/orders/[id]/route.ts", "utf8");
const prismaSchema = readFileSync("prisma/schema.prisma", "utf8");

assert.match(orderForm, /postImageTemplateId:\s*initialDraft\?\.postImageTemplateId\s*\|\|\s*DEFAULT_POST_IMAGE_TEMPLATE_ID/, "order form should keep selected post image template in state");
assert.match(orderForm, /updateField\("postImageTemplateId"/, "template cards should update the selected template without reload");
assert.match(orderForm, /postImageTemplateId:\s*form\.postImageTemplateId/, "order payload should submit the selected post image template");
assert.doesNotMatch(orderForm, />\s*(اختيار|Select)\s*</, "template cards should not use a separate select button");

assert.match(previewCard, /post-image-template-picker/, "preview card should render a scalable template picker");
assert.match(previewCard, /selectedTemplateId/, "preview card should expose selected template state");
assert.match(previewCard, /getPostImageTemplatePreview/, "preview card should resolve previews through the preview registry");
assert.match(previewRegistry, /"whatsapp-chat"/, "preview registry should support the whatsapp-chat preview layout");
assert.match(previewCard, /aria-pressed=\{selected\}/, "template cards should be accessible selectable cards");

assert.match(validation, /postImageTemplateId/, "order validation should accept postImageTemplateId");
assert.match(orderRoute, /postImageTemplateId:\s*parsed\.data\.postImageTemplateId/, "public order route should persist selected post image template");
assert.match(adminOrderRoute, /postImageTemplateId/, "admin order publish route should carry selected post image template to invitations");
assert.match(prismaSchema, /postImageTemplateId\s+String\?\s+@default\("breaking-news-v1"\)/, "OrderRequest should store postImageTemplateId for later publishing");

console.log("post-image template selection tests passed");
