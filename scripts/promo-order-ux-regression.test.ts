import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const orderForm = readFileSync("components/OrderForm.tsx", "utf8");
const css = readFileSync("app/globals.css", "utf8");
const historyPage = readFileSync("app/admin/promo-codes/history/page.tsx", "utf8");
const discountsPage = readFileSync("app/admin/promo-codes/discounts/page.tsx", "utf8");
const orderApi = readFileSync("app/api/orders/route.ts", "utf8");
const adminOrderApi = readFileSync("app/api/admin/orders/[id]/route.ts", "utf8");
const orderPublishing = readFileSync("lib/order-publishing.ts", "utf8");
const invitationExperience = readFileSync("components/InvitationExperience.tsx", "utf8");
const templatePreview = readFileSync("app/templates/[slug]/preview/page.tsx", "utf8");
const invitationData = readFileSync("lib/invitation-data.ts", "utf8");

assert.match(
  orderForm,
  /nextPromo\.photographer\?\.name\s*\|\|\s*nextPromo\.partner\?\.displayName/,
  "partner promo application should fall back to partner.displayName when photographer payload is missing",
);

assert.match(orderForm, /partner-saved-avatar/, "partner saved card should render a premium avatar/logo area");
assert.match(orderForm, /appliedPromo\?\.partner\?\.logoUrl/, "partner saved card should use partner logo from promo response");
assert.match(orderForm, /params\.set\("photographerLogoUrl"/, "order preview URL should pass the applied partner logo to template preview");
assert.match(orderForm, /appliedPromo\?\.photographer\?\.logoUrl\s*\|\|\s*appliedPromo\?\.partner\?\.logoUrl/, "order preview should derive photographer logo from applied promo data");
assert.match(orderForm, /formData\.get\("photographerName"\)\s*\|\|\s*form\.photographerName/, "submit should keep promo-filled photographer name even when locked fields are disabled");

assert.match(orderApi, /logoUrl:\s*partnerPhotographer\?\.logoUrl\s*\|\|\s*partnerSnapshot\?\.logoUrl/, "order API should persist partner logo from promo snapshot");
assert.match(orderApi, /facebookUrl:\s*partnerPhotographer\?\.facebookUrl\s*\|\|\s*partnerSnapshot\?\.facebookUrl/, "order API should persist partner Facebook URL from promo snapshot");
assert.match(orderApi, /lockedByPromo:\s*true/, "order API should mark partner photographer data as locked by promo");

assert.match(adminOrderApi, /cleanPartnerSnapshotPhotographer/, "admin publish flow should rebuild photographer data from stored partner snapshot");
assert.match(adminOrderApi, /existingPhotographer\?\.lockedByPromo\s*\?\s*existingPhotographer/, "admin updates should not overwrite promo-locked photographer data with defaults");
assert.match(orderPublishing, /partnerSnapshot:\s*order\.partnerSnapshot/, "published invitation should retain the partner snapshot");
assert.match(orderPublishing, /partnerPublishedAt:\s*order\.partnerSnapshot\s*\?\s*now/, "published invitation should record partner publish time");

assert.match(invitationExperience, /forceInvitationPhotographer/, "invitation rendering should force promo photographer display even if global photographer card is off");
assert.match(templatePreview, /hasExplicitPhotographerPreview\s*\?\s*true\s*:\s*siteSettings\.photographer\.showPhotographerCard/, "order preview should force explicit promo photographer display");
assert.match(invitationData, /lockedByPromo:\s*raw\.lockedByPromo === true/, "public invitation loader should preserve promo lock metadata");

assert.match(css, /\.order-wizard-card\s+\.order-template-card[\s\S]*grid-template-rows:\s*none/, "order wizard template cards should reset the generic template-card row layout");
assert.match(css, /\.order-wizard-card\s+\.order-template-card[\s\S]*min-height:\s*unset/, "order wizard template cards should not inherit huge marketing-card heights");
assert.match(css, /\.order-wizard-card\s+\.order-template-thumb[\s\S]*aspect-ratio:\s*16\s*\/\s*10/, "order wizard template thumbnails should be compact preview strips");

assert.match(historyPage, /promo-actions-menu/, "promo history rows should use a compact actions menu instead of giant inline buttons");
assert.doesNotMatch(historyPage, /<div className="button-row">\s*<Link className="btn btn-gold" href=\{`\/admin\/promo-codes\/\$\{promo\.id\}`\}/, "partner history rows should not expose all actions as giant inline buttons");

assert.match(discountsPage, /errorMessage\(params\.error\)/, "discount page should map creation errors into visible Arabic messages");
assert.match(discountsPage, /duplicate|unique|already/i, "discount page should explain duplicate-code failures instead of collapsing into a generic crash");

console.log("promo-order-ux-regression tests passed");
