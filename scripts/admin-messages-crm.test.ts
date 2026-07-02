import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const pageSource = await readFile(new URL("../app/admin/messages/page.tsx", import.meta.url), "utf8");
const routeSource = await readFile(new URL("../app/api/admin/client-messages/route.ts", import.meta.url), "utf8");

assert.match(pageSource, /selectedStatus/);
assert.match(pageSource, /selectedScope/);
assert.match(pageSource, /name="status"/);
assert.match(pageSource, /name="scope"/);
assert.match(pageSource, /\/admin\/customers\/\$\{encodeURIComponent\(invitation\.customerId\)\}/);
assert.match(pageSource, /\/admin\/invitations\/\$\{encodeURIComponent\(invitation\.code\)\}/);

assert.match(routeSource, /if \(scope === "all"\)/);
assert.match(routeSource, /const scope = scopeInput === "all" \? "all" : "single"/);
assert.match(routeSource, /revalidatePath\("\/admin\/customers"\)/);
assert.match(routeSource, /revalidatePath\(`\/admin\/customers\/\$\{invitation\.customerId\}`\)/);
