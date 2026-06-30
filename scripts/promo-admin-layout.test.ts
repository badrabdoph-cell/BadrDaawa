import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const promoPagePath = "app/admin/promo-codes/page.tsx";
const promoActionsPath = "app/admin/promo-codes/actions.ts";
const promoCopyPanelPath = "components/AdminPromoCopyPanel.tsx";

assert.ok(existsSync(promoPagePath), "dedicated promo codes admin page must exist");
assert.ok(existsSync(promoActionsPath), "dedicated promo codes actions must exist");
assert.ok(existsSync(promoCopyPanelPath), "promo copy panel must exist");

const promoPage = readFileSync(promoPagePath, "utf8");
const promoCopyPanel = readFileSync(promoCopyPanelPath, "utf8");
const partnersPage = readFileSync("app/admin/partners/page.tsx", "utf8");
const dashboardShell = readFileSync("components/DashboardShell.tsx", "utf8");

assert.match(promoPage, /أكواد البرومو/, "promo admin page should be Arabic-first");
assert.match(promoPage, /createQuickPromoCodeAction/, "promo admin page should use quick create action");
assert.match(promoCopyPanel, /نسخ رسالة جاهزة/, "promo admin page should expose ready-message copy");
assert.match(promoPage, /معدل التحويل/, "promo admin page should show conversion rate");
assert.match(dashboardShell, /\/admin\/promo-codes/, "dashboard should link to promo code admin");
assert.doesNotMatch(partnersPage, /tab=promos|tab=discounts|tab=messages|tab=analytics|tab=settings/, "partners page should not expose fake promo tabs");

console.log("promo-admin-layout tests passed");
