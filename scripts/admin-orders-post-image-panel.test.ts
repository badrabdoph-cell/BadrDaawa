import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manager = readFileSync("components/AdminOrderRequestsManager.tsx", "utf8");
const adminData = readFileSync("lib/admin-data.ts", "utf8");
const types = readFileSync("lib/types.ts", "utf8");
const orderRoute = readFileSync("app/api/admin/orders/[id]/route.ts", "utf8");
const postImagePanel = readFileSync("components/PostImageAdminPanel.tsx", "utf8");

assert.match(types, /export type OrderPostImageState/, "OrderRequest should expose a reusable post image state type");
assert.match(types, /postImage\?: OrderPostImageState/, "admin order data should carry the linked invitation post image state");

assert.match(adminData, /postImageByCode/, "admin orders loader should map published invitation codes to post image data");
assert.match(adminData, /postImage:\s*toOrderPostImageState\(postImage\)/, "admin orders should include linked post image data");
assert.doesNotMatch(adminData, /if \(clean === "accepted"\) return "reviewing"/, "admin orders loader should preserve accepted status");

assert.match(orderRoute, /getInvitationPostImageState/, "admin order API snapshots should include post image data after publish/regenerate");
assert.match(orderRoute, /postImage,\s*\n\s*language:/, "admin order API should return the latest linked post image state");
assert.match(orderRoute, /action\?:[\s\S]*"update-status"/, "admin order API should explicitly accept status-only updates");
assert.match(orderRoute, /if \(action === "update-status"\)/, "admin order API should handle status-only updates without falling through to edited");

assert.match(manager, /PostImageAdminPanel/, "admin orders manager should render the post image admin controls");
assert.match(manager, /selectedOrder\.postImage/, "post image panel should use the selected order linked post image state");
assert.match(manager, /صورة البوست/, "admin orders should label the post image control section clearly");
assert.doesNotMatch(manager, /action:\s*"update-status",\s*status:\s*"accepted"/, "primary accept action should publish the invitation so the post image can be generated");
assert.match(manager, /إعادة محاولة النشر التجريبي/, "primary recovery action should publish the invitation with a trial and generate final assets");
assert.match(manager, /runOrderAction\(order, "trial-publish", state\)/, "quick recovery should preserve the customer's trial instead of final activation");
assert.match(postImagePanel, /ogUrl/, "post image admin panel should receive the Open Graph post image asset");
assert.match(postImagePanel, /تحميل OG/, "post image admin panel should allow downloading the Open Graph asset");
assert.match(postImagePanel, /نسخ رابط OG/, "post image admin panel should allow copying the Open Graph asset link");

console.log("admin orders post image panel tests passed");
