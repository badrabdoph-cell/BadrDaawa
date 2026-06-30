import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const dashboardShell = readFileSync("components/DashboardShell.tsx", "utf8");
const partnerNav = readFileSync("components/AdminPartnerCenterNav.tsx", "utf8");
const partnerDirectory = readFileSync("app/admin/partners/directory/page.tsx", "utf8");
const partnerNew = readFileSync("app/admin/partners/new/page.tsx", "utf8");
const partnerDetails = readFileSync("app/admin/partners/[id]/page.tsx", "utf8");
const discountsPage = readFileSync("app/admin/promo-codes/discounts/page.tsx", "utf8");

const partnersStart = dashboardShell.indexOf('id: "partners"');
const contentStart = dashboardShell.indexOf('id: "content"');
const partnerSection = dashboardShell.slice(partnersStart, contentStart);

assert.match(dashboardShell, /id:\s*"discounts"/, "sidebar should expose an independent discount center");
assert.match(dashboardShell, /title:\s*"مركز أكواد الخصم"/, "discount center should be named مركز أكواد الخصم");
assert.doesNotMatch(partnerSection, /\/admin\/promo-codes\/discounts/, "partner center must not contain general discount links");
assert.doesNotMatch(partnerNav, /أكواد الخصم|promo-codes\/discounts/, "partner center nav must not expose general discounts");
assert.ok(existsSync("components/AdminDiscountCenterNav.tsx"), "discount center internal nav must exist");
assert.doesNotMatch(discountsPage, /AdminPartnerCenterNav/, "discount pages must not use partner center nav");
assert.match(discountsPage, /AdminDiscountCenterNav/, "discount pages should use discount center nav");

for (const label of ["الصورة", "الاسم", "النوع", "البروموكود", "نسبة الخصم", "الحالة", "الدعوات", "الطلبات", "الزيارات", "معدل التحويل", "آخر نشاط", "الإجراءات"]) {
  assert.match(partnerDirectory, new RegExp(label), `partner CRM table should include ${label}`);
}
assert.match(partnerDirectory, /partner-crm-table/, "partner directory should use a CRM table");
assert.doesNotMatch(partnerDirectory, /partner-card-grid/, "partner directory should no longer be card-first");

for (const label of ["بيانات الشريك", "البروموكود", "الخصم", "المراجعة"]) {
  assert.match(partnerNew, new RegExp(label), `partner creation wizard should include ${label}`);
}
assert.match(partnerNew, /partner-wizard/, "partner creation should use wizard layout");

for (const label of ["نظرة عامة", "الدعوات", "الطلبات", "الرسائل", "الإحصائيات", "سجل النشاط", "الإعدادات"]) {
  assert.match(partnerDetails, new RegExp(label), `partner dashboard should expose ${label} tab`);
}

console.log("partner-discount-centers tests passed");
