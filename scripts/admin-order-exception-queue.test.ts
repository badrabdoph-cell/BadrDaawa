import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manager = readFileSync("components/AdminOrderRequestsManager.tsx", "utf8");
const page = readFileSync("app/admin/orders/page.tsx", "utf8");
const countRoute = readFileSync("app/api/admin/orders/count/route.ts", "utf8");
const notifications = readFileSync("lib/admin-notifications.ts", "utf8");
assert.match(manager, /تحتاج تدخل/);
assert.match(manager, /إعادة محاولة النشر التجريبي/);
assert.match(page, /طلبات تحتاج تدخل/);
assert.match(notifications, /يحتاج تدخل/);
assert.doesNotMatch(notifications, /وصل طلب جديد أو طلب يحتاج مراجعة/);
assert.match(countRoute, /"NEW", "REVIEWING", "EDITED", "ACCEPTED"/);

console.log("admin order exception queue tests passed");
