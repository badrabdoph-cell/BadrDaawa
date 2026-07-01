import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manager = readFileSync("components/AdminOrderRequestsManager.tsx", "utf8");
const adminData = readFileSync("lib/admin-data.ts", "utf8");
const types = readFileSync("lib/types.ts", "utf8");
const orderRoute = readFileSync("app/api/admin/orders/[id]/route.ts", "utf8");

assert.match(types, /export type OrderPostImageState/, "OrderRequest should expose a reusable post image state type");
assert.match(types, /postImage\?: OrderPostImageState/, "admin order data should carry the linked invitation post image state");

assert.match(adminData, /postImageByCode/, "admin orders loader should map published invitation codes to post image data");
assert.match(adminData, /postImage:\s*toOrderPostImageState\(postImage\)/, "admin orders should include linked post image data");

assert.match(orderRoute, /getInvitationPostImageState/, "admin order API snapshots should include post image data after publish/regenerate");
assert.match(orderRoute, /postImage,\s*\n\s*language:/, "admin order API should return the latest linked post image state");

assert.match(manager, /PostImageAdminPanel/, "admin orders manager should render the post image admin controls");
assert.match(manager, /selectedOrder\.postImage/, "post image panel should use the selected order linked post image state");
assert.match(manager, /صورة البوست/, "admin orders should label the post image control section clearly");

console.log("admin orders post image panel tests passed");
