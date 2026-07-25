import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const form = readFileSync("components/OrderForm.tsx", "utf8");
const success = readFileSync("components/OrderSuccessRedirect.tsx", "utf8");
assert.match(form, /activationStatus/);
assert.match(form, /publicUrl/);
assert.match(form, /adminUrl/);
assert.match(success, /دعوتك جاهزة للتجربة/);
assert.match(success, /فتح لوحة التحكم/);
assert.match(success, /مشاهدة الدعوة/);
assert.match(success, /تواصل مع الدعم/);
assert.match(success, /storedPayloadMatchesCurrent/);
assert.doesNotMatch(success, /redirectCountdownSeconds/);
assert.doesNotMatch(success, /window\.location\.assign\(payload\.whatsappUrl\)/);

console.log("order success trial UX tests passed");
