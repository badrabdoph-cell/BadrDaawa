import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/orders/route.ts", "utf8");
assert.match(route, /publishOrder\(/);
assert.match(route, /mode:\s*"AUTO_TRIAL"/);
assert.match(route, /activationStatus:\s*"ready"/);
assert.match(route, /activationStatus:\s*"pending"/);
assert.match(route, /autoTrialPublishEnabled/);
assert.match(route, /defaultTrialDays/);
assert.doesNotMatch(route, /buildOrderWhatsAppMessage/);
assert.doesNotMatch(route, /getWhatsAppOrderUrl/);
const createAuditStart = route.indexOf('action: "order.create"');
const createAuditEnd = route.indexOf('metadata: { source: "public-order-form" }', createAuditStart);
assert.ok(createAuditStart > -1 && createAuditEnd > createAuditStart);
assert.doesNotMatch(route.slice(createAuditStart, createAuditEnd), /manageToken/);

console.log("order automatic trial flow tests passed");
