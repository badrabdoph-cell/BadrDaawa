import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shortLinkRoute = readFileSync("app/r/[slug]/route.ts", "utf8");
const orderPage = readFileSync("app/order/page.tsx", "utf8");
const orderForm = readFileSync("components/OrderForm.tsx", "utf8");

assert.match(shortLinkRoute, /PARTNER_PROMO_COOKIE/, "short-link route should persist the promo code in a cookie");
assert.match(shortLinkRoute, /PARTNER_PROMO_STATUS_COOKIE/, "short-link route should persist unavailable promo status in a cookie");
assert.doesNotMatch(shortLinkRoute, /url\.searchParams\.set\("promo",\s*promo\.code\)/, "successful short-link redirects should not depend on promo query parameters");
assert.match(shortLinkRoute, /new URL\("\/order"/, "short-link route should always land on the order page");

assert.match(orderPage, /cookies\(\)/, "order page should read referral cookies on the server");
assert.match(orderPage, /PARTNER_PROMO_COOKIE/, "order page should seed the order form from the promo cookie");
assert.match(orderPage, /initialPromoStatus/, "order page should pass a friendly promo status to the form");

assert.match(orderForm, /initialPromoStatus/, "order form should accept the referral status");
assert.match(orderForm, /هذا البروموكود غير متوفر أو انتهت صلاحيته/, "order form should show a friendly unavailable promo message");

console.log("promo-referral-flow tests passed");
