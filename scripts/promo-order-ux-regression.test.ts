import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const orderForm = readFileSync("components/OrderForm.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const historyPage = readFileSync("app/admin/promo-codes/history/page.tsx", "utf8");
const discountsPage = readFileSync("app/admin/promo-codes/discounts/page.tsx", "utf8");

assert.match(
  orderForm,
  /nextPromo\.photographer\?\.name\s*\|\|\s*nextPromo\.partner\?\.displayName/,
  "partner promo application should fall back to partner.displayName when photographer payload is missing",
);

assert.match(orderForm, /partner-saved-avatar/, "partner saved card should render a premium avatar/logo area");
assert.match(orderForm, /appliedPromo\?\.partner\?\.logoUrl/, "partner saved card should use partner logo from promo response");

assert.match(css, /\.order-wizard-card\s+\.order-template-card[\s\S]*grid-template-rows:\s*none/, "order wizard template cards should reset the generic template-card row layout");
assert.match(css, /\.order-wizard-card\s+\.order-template-card[\s\S]*min-height:\s*unset/, "order wizard template cards should not inherit huge marketing-card heights");
assert.match(css, /\.order-wizard-card\s+\.order-template-thumb[\s\S]*aspect-ratio:\s*16\s*\/\s*10/, "order wizard template thumbnails should be compact preview strips");

assert.match(historyPage, /promo-actions-menu/, "promo history rows should use a compact actions menu instead of giant inline buttons");
assert.doesNotMatch(historyPage, /<div className="button-row">\s*<Link className="btn btn-gold" href=\{`\/admin\/promo-codes\/\$\{promo\.id\}`\}/, "partner history rows should not expose all actions as giant inline buttons");

assert.match(discountsPage, /errorMessage\(params\.error\)/, "discount page should map creation errors into visible Arabic messages");
assert.match(discountsPage, /duplicate|unique|already/i, "discount page should explain duplicate-code failures instead of collapsing into a generic crash");

console.log("promo-order-ux-regression tests passed");
