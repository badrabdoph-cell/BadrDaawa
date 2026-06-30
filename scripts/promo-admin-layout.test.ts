import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const promoPagePath = "app/admin/promo-codes/page.tsx";
const promoPartnersPagePath = "app/admin/promo-codes/partners/page.tsx";
const promoDiscountsPagePath = "app/admin/promo-codes/discounts/page.tsx";
const promoHistoryPagePath = "app/admin/promo-codes/history/page.tsx";
const promoDetailsPagePath = "app/admin/promo-codes/[id]/page.tsx";
const promoActionsPath = "app/admin/promo-codes/actions.ts";
const promoCopyPanelPath = "components/AdminPromoCopyPanel.tsx";
const promoNavPath = "components/AdminPromoSectionNav.tsx";

assert.ok(existsSync(promoPagePath), "dedicated promo codes admin page must exist");
assert.ok(existsSync(promoPartnersPagePath), "partner promo codes page must exist");
assert.ok(existsSync(promoDiscountsPagePath), "discount promo codes page must exist");
assert.ok(existsSync(promoHistoryPagePath), "promo code history page must exist");
assert.ok(existsSync(promoDetailsPagePath), "promo code detail management page must exist");
assert.ok(existsSync(promoActionsPath), "dedicated promo codes actions must exist");
assert.ok(existsSync(promoCopyPanelPath), "promo copy panel must exist");
assert.ok(existsSync(promoNavPath), "promo section navigation must exist");

const promoPage = readFileSync(promoPagePath, "utf8");
const promoPartnersPage = readFileSync(promoPartnersPagePath, "utf8");
const promoDiscountsPage = readFileSync(promoDiscountsPagePath, "utf8");
const promoHistoryPage = readFileSync(promoHistoryPagePath, "utf8");
const promoDetailsPage = readFileSync(promoDetailsPagePath, "utf8");
const promoActions = readFileSync(promoActionsPath, "utf8");
const promoNav = readFileSync(promoNavPath, "utf8");
const promoCopyPanel = readFileSync(promoCopyPanelPath, "utf8");
const partnersPage = readFileSync("app/admin/partners/page.tsx", "utf8");
const dashboardShell = readFileSync("components/DashboardShell.tsx", "utf8");

assert.match(promoPage, /أكواد البرومو/, "promo admin page should be Arabic-first");
assert.match(promoPage, /createQuickPromoCodeAction/, "promo admin page should use quick create action");
assert.match(promoPage, /\/admin\/promo-codes\/partners/, "overview should link to partner promo page");
assert.match(promoPage, /\/admin\/promo-codes\/discounts/, "overview should link to discount promo page");
assert.match(promoPage, /\/admin\/promo-codes\/history/, "overview should link to promo history page");
assert.match(promoPartnersPage, /بروموكود المصورين والشركاء/, "partner promo page should be clearly named");
assert.match(promoDiscountsPage, /أكواد الخصم المستقلة/, "discount promo page should be clearly named");
assert.match(promoHistoryPage, /سجل البروموكود/, "history page should be clearly named");
assert.match(promoDetailsPage, /إدارة البروموكود/, "detail page should manage one promo code");
assert.match(promoDetailsPage, /الدعوات والطلبات/, "detail page should expose orders/invitations");
assert.match(promoActions, /updatePartnerPromoStatusAction/, "promo actions should support status changes");
assert.match(promoActions, /softDeletePartnerPromoAction/, "promo actions should support soft delete");
assert.match(promoActions, /restorePartnerPromoAction/, "promo actions should support restore");
assert.match(promoNav, /\/admin\/promo-codes\/partners/, "promo nav should link partner page");
assert.match(promoCopyPanel, /نسخ رسالة جاهزة/, "promo admin page should expose ready-message copy");
assert.match(promoPage, /معدل التحويل/, "promo admin page should show conversion rate");
assert.match(dashboardShell, /\/admin\/promo-codes/, "dashboard should link to promo code admin");
assert.doesNotMatch(partnersPage, /tab=promos|tab=discounts|tab=messages|tab=analytics|tab=settings/, "partners page should not expose fake promo tabs");

console.log("promo-admin-layout tests passed");
