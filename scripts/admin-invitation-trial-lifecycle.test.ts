import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getInvitationState } from "../lib/admin-crm-status";

assert.equal(getInvitationState({
  isActive: true,
  status: "ACTIVE",
  weddingDate: "2026-08-20T00:00:00.000Z",
  trialEndsAt: "2026-07-20T00:00:00.000Z",
}, Date.parse("2026-07-26T00:00:00.000Z")), "trial-ended");

const route = readFileSync("app/api/admin/invitations/[code]/route.ts", "utf8");
const row = readFileSync("components/AdminInvitationRow.tsx", "utf8");
assert.match(route, /extend-trial/);
assert.match(route, /final-activate/);
assert.match(route, /trialEndsAt:\s*null/);
assert.match(route, /disabledAt:\s*null/);
assert.match(row, /تمديد التجربة/);
assert.match(row, /تفعيل نهائي/);

console.log("admin invitation trial lifecycle tests passed");
