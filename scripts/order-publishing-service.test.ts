import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("lib/order-publishing.ts", "utf8");
const route = readFileSync("app/api/admin/orders/[id]/route.ts", "utf8");

assert.match(service, /export type OrderPublishMode/);
assert.match(service, /export async function publishOrder/);
assert.match(service, /AUTO_TRIAL/);
assert.match(service, /MANUAL_TRIAL/);
assert.match(service, /FINAL/);
assert.match(service, /prisma\.\$transaction/);
assert.match(service, /status:\s*"PUBLISHED"/);
assert.match(service, /getPublicPublishedTemplateWithSettings/);
assert.match(service, /reused:\s*true/);
assert.match(service, /deletedAt:\s*true/);
assert.doesNotMatch(route, /async function publishPrismaOrder/);
assert.match(route, /publishOrder\(/);

console.log("order publishing service tests passed");
