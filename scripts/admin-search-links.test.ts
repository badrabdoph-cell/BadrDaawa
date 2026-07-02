import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/admin-search.ts", import.meta.url), "utf8");

assert.match(source, /href:\s*`\/admin\/invitations\/\$\{encodeURIComponent\(invitation\.code\)\}`/);
assert.match(source, /href:\s*`\/admin\/customers\/\$\{encodeURIComponent\(customer\.id\)\}`/);
assert.doesNotMatch(source, /href:\s*"\/admin\/customers"/);
