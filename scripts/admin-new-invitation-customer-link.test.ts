import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pageSource = await readFile(new URL("../app/admin/new-invitation/page.tsx", import.meta.url), "utf8");
const wizardSource = await readFile(new URL("../components/AdminNewInvitationWizard.tsx", import.meta.url), "utf8");

assert.match(pageSource, /getAdminCustomers/);
assert.match(pageSource, /initialCustomerId=\{params\?\.customerId \|\| ""\}/);
assert.match(pageSource, /customers=\{customers\.map/);

assert.match(wizardSource, /customerId:\s*""/);
assert.match(wizardSource, /phone:\s*""/);
assert.match(wizardSource, /email:\s*""/);
assert.match(wizardSource, /customerId:\s*draft\.customerId/);
assert.match(wizardSource, /phone:\s*draft\.phone/);
assert.match(wizardSource, /email:\s*draft\.email/);
assert.match(wizardSource, /id="adminCustomerId"/);
