import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const dashboardShell = readFileSync("components/DashboardShell.tsx", "utf8");
const promoNav = readFileSync("components/AdminPromoSectionNav.tsx", "utf8");
const photographersPage = readFileSync("app/admin/promo-codes/photographers/page.tsx", "utf8");
const discountsPage = readFileSync("app/admin/promo-codes/discounts/page.tsx", "utf8");
const historyPage = readFileSync("app/admin/promo-codes/history/page.tsx", "utf8");

const promoStart = dashboardShell.indexOf('id: "promo-codes"');
const contentStart = dashboardShell.indexOf('id: "content"');
const promoSection = dashboardShell.slice(promoStart, contentStart);

assert.match(dashboardShell, /id:\s*"promo-codes"/, "sidebar should expose one unified discount codes section");
assert.match(dashboardShell, /title:\s*"أكواد الخصم"/, "unified section should be named أكواد الخصم");
assert.doesNotMatch(dashboardShell, /id:\s*"partners"|title:\s*"مركز الشركاء"|title:\s*"مركز أكواد الخصم"/, "old split centers should not remain in the sidebar");
assert.match(promoSection, /\/admin\/promo-codes\/photographers/, "unified section should link photographers page");
assert.match(promoSection, /\/admin\/promo-codes\/discounts/, "unified section should link discount page");
assert.match(promoSection, /\/admin\/promo-codes\/history/, "unified section should link history page");
assert.match(promoNav, /المصورين/, "promo nav should expose photographers");
assert.match(promoNav, /كود الخصم/, "promo nav should expose discount code page");
assert.match(promoNav, /السجل/, "promo nav should expose history");
assert.ok(existsSync("app/admin/promo-codes/photographers/page.tsx"), "photographers creation page must exist");
assert.doesNotMatch(discountsPage, /AdminPartnerCenterNav|AdminDiscountCenterNav/, "discount pages must not use the old split-center navs");

for (const label of ["اسم المصور", "رفع الشعار", "Facebook", "Instagram", "الرابط المختصر", "نسخ الكود", "نسخ الرابط", "اختبار الكود"]) {
  assert.match(photographersPage, new RegExp(label), `photographers page should include ${label}`);
}

for (const label of ["كود الخصم", "نسبة الخصم", "مجاني 100%", "الجملة التي تظهر", "اختبار الكود"]) {
  assert.match(discountsPage, new RegExp(label), `discount page should include ${label}`);
}

for (const label of ["أكواد الخصم", "المصورين والقاعات", "Bulk Actions", "كل الدعوات"]) {
  assert.match(historyPage, new RegExp(label), `history page should include ${label}`);
}

console.log("unified partner-discount center tests passed");
