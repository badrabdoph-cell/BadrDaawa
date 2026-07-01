import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const dashboardShell = readFileSync("components/DashboardShell.tsx", "utf8");
const partnersDashboard = readFileSync("app/admin/partners/page.tsx", "utf8");
const partnerDetails = readFileSync("app/admin/partners/[id]/page.tsx", "utf8");
const partnerActions = readFileSync("app/admin/partners/actions.ts", "utf8");
const promoNav = readFileSync("components/AdminPromoSectionNav.tsx", "utf8");

assert.match(dashboardShell, /id:\s*"promo-codes"/, "sidebar should expose unified promo codes section");
assert.match(dashboardShell, /title:\s*"أكواد الخصم"/, "unified section should be named أكواد الخصم");
assert.doesNotMatch(dashboardShell, /id:\s*"partners"|title:\s*"مركز الشركاء"/, "old independent partners section should not remain in the sidebar");
const contactsStart = dashboardShell.indexOf('id: "contacts"');
const promoStart = dashboardShell.indexOf('id: "promo-codes"');
const contactsSection = dashboardShell.slice(contactsStart, promoStart);
assert.doesNotMatch(contactsSection, /\/admin\/partners|\/admin\/promo-codes/, "partners links should not live inside contacts section");
assert.match(promoNav, /المصورين/, "unified promo nav should expose photographer codes");
assert.match(promoNav, /كود الخصم/, "unified promo nav should expose discount codes");
assert.match(promoNav, /السجل/, "unified promo nav should expose history");

assert.ok(existsSync("components/AdminPartnerCenterNav.tsx"), "partner center internal nav must exist");
assert.ok(existsSync("components/PartnerCardActions.tsx"), "partner card actions menu must exist");
assert.ok(existsSync("components/PartnerPromoPreviewFields.tsx"), "partner creation preview component must exist");
assert.ok(existsSync("app/admin/partners/directory/page.tsx"), "partner cards directory page must exist");
assert.ok(existsSync("app/admin/partners/activity/page.tsx"), "partner activity page must exist");

assert.match(partnersDashboard, /لوحة التحكم/, "partners root page should be dashboard-only");
assert.match(partnersDashboard, /أعلى شريك/, "dashboard should show top partner summary");
assert.match(partnersDashboard, /آخر دعوات/, "dashboard should show latest partner-created invitations");
assert.doesNotMatch(partnersDashboard, /admin-table-toolbar|<table|partner-editor-form/, "dashboard should not contain filters, tables, or create/edit forms");

const directoryPage = readFileSync("app/admin/partners/directory/page.tsx", "utf8");
assert.match(directoryPage, /partner-crm-table/, "partners page should use a CRM table");
assert.match(directoryPage, /PartnerCardActions/, "partner rows should hide secondary actions in a menu");
assert.match(directoryPage, /<table/, "partner directory should render a structured table");
assert.doesNotMatch(directoryPage, /partner-card-grid/, "partner directory should no longer render a card grid");

for (const label of ["نظرة عامة", "الدعوات", "الطلبات", "الإحصائيات", "الرسائل", "سجل النشاط", "الإعدادات"]) {
  assert.match(partnerDetails, new RegExp(label), `partner details should expose ${label} tab`);
}

assert.match(partnerActions, /createPartnerMessageAction/, "partner details messages tab should have a server action");
assert.match(partnerActions, /returnTo/, "partner status action should support returning to the current page");

console.log("partner-center-rebuild tests passed");
