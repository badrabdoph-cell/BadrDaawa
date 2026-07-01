import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const shell = readFileSync("components/DashboardShell.tsx", "utf8");
const nav = readFileSync("components/AdminPromoSectionNav.tsx", "utf8");

assert.match(shell, /title:\s*"أكواد الخصم"/, "sidebar should expose one discount codes section");
assert.doesNotMatch(shell, /title:\s*"مركز الشركاء"/, "partners center should not remain as a separate sidebar section");
assert.doesNotMatch(shell, /title:\s*"مركز أكواد الخصم"/, "discount center should not remain as a separate sidebar section");
assert.match(shell, /\/admin\/promo-codes\/photographers/, "sidebar should link photographers promo page");
assert.match(shell, /\/admin\/promo-codes\/discounts/, "sidebar should link discount code page");
assert.match(shell, /\/admin\/promo-codes\/history/, "sidebar should link unified history page");
assert.match(shell, /\/admin\/promo-codes\/health/, "sidebar should link promo health page");

assert.match(nav, /المصورين/, "promo nav should expose photographers page");
assert.match(nav, /كود الخصم/, "promo nav should expose discount code page");
assert.match(nav, /السجل/, "promo nav should expose unified history page");
assert.match(nav, /Promo Health|صحة البروموكود/, "promo nav should expose health page");
assert.doesNotMatch(nav, /مركز الشركاء|مركز أكواد الخصم|لوحة الخصومات/, "promo nav should not use old center labels");

assert.ok(existsSync("app/admin/promo-codes/photographers/page.tsx"), "photographers promo page must exist");
assert.ok(existsSync("app/admin/promo-codes/discounts/page.tsx"), "discount promo page must exist");
assert.ok(existsSync("app/admin/promo-codes/history/page.tsx"), "unified promo history page must exist");
assert.ok(existsSync("app/admin/promo-codes/health/page.tsx"), "promo health page must exist");

const photographers = readFileSync("app/admin/promo-codes/photographers/page.tsx", "utf8");
for (const label of ["اسم المصور", "رفع الشعار", "Facebook", "Instagram", "الرابط المختصر", "نسخ الكود", "نسخ الرابط", "اختبار الكود"]) {
  assert.match(photographers, new RegExp(label), `photographers page should include ${label}`);
}

const discounts = readFileSync("app/admin/promo-codes/discounts/page.tsx", "utf8");
for (const label of ["كود الخصم", "نسبة الخصم", "مجاني 100%", "الجملة التي تظهر", "اختبار الكود"]) {
  assert.match(discounts, new RegExp(label), `discount page should include ${label}`);
}
assert.doesNotMatch(discounts, /الرابط المختصر|\/r\//, "general discount codes must not generate short links");

const history = readFileSync("app/admin/promo-codes/history/page.tsx", "utf8");
for (const label of ["أكواد الخصم", "المصورين والقاعات", "Bulk Actions", "تعطيل مؤقت", "إعادة تشغيل", "كل الدعوات"]) {
  assert.match(history, new RegExp(label), `history page should include ${label}`);
}

console.log("promo-unified-center tests passed");
