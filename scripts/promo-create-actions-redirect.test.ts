import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const actions = readFileSync("app/admin/promo-codes/actions.ts", "utf8");

function functionBody(name: string) {
  const start = actions.indexOf(`export async function ${name}`);
  assert.notEqual(start, -1, `${name} must exist`);
  const next = actions.indexOf("\nexport async function ", start + 1);
  return actions.slice(start, next === -1 ? actions.length : next);
}

for (const name of ["createQuickPromoCodeAction", "createDiscountPromoCodeAction"]) {
  const body = functionBody(name);
  const tryStart = body.indexOf("try {");
  const catchStart = body.indexOf("} catch", tryStart);
  const tryBody = body.slice(tryStart, catchStart);
  assert.doesNotMatch(tryBody, /\bredirect\(/, `${name} must not call Next redirect inside try/catch`);
  assert.match(body, /let redirectTo/, `${name} should build a redirect target first`);
  assert.match(body, /\n\s*redirect\(redirectTo\);/, `${name} should redirect after try/catch`);
  assert.match(body, /console\.error/, `${name} should log the real creation failure`);
}

console.log("promo-create-actions-redirect tests passed");
