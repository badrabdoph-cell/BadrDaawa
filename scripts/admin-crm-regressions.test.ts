import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getInvitationState, stateLabel } from "../lib/admin-crm-status";

const rowSource = await readFile(new URL("../components/AdminInvitationRow.tsx", import.meta.url), "utf8");
const routeSource = await readFile(new URL("../app/api/admin/invitations/[code]/route.ts", import.meta.url), "utf8");

assert(!rowSource.includes('action: "hard-delete"'), "Admin invitation rows must not hard-delete invitations directly.");
assert(routeSource.includes('"update-details"'), "Invitation admin route must support update-details from inline editing.");

assert.equal(
  getInvitationState({
    isActive: true,
    weddingDate: new Date(Date.now() + 86400000).toISOString(),
  }),
  "active",
);
assert.equal(
  getInvitationState({
    isActive: true,
    weddingDate: new Date(Date.now() + 86400000).toISOString(),
    trialEndsAt: new Date(Date.now() + 86400000).toISOString(),
  }),
  "trial",
);
assert.equal(
  getInvitationState({
    isActive: false,
    weddingDate: new Date(Date.now() + 86400000).toISOString(),
    disabledAt: new Date().toISOString(),
    disabledBy: "system",
    trialEndsAt: new Date(Date.now() - 86400000).toISOString(),
  }),
  "trial-ended",
);
assert.equal(stateLabel("trial-ended"), "منتهي تجريبي");
