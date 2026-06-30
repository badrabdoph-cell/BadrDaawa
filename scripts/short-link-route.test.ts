import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/r/[slug]/route.ts", "utf8");

assert.match(route, /function buildOrderFallbackUrl/, "short-link route should build an order fallback URL");
assert.match(route, /PARTNER_PROMO_STATUS_COOKIE/, "short-link fallback should expose a clear promo status cookie");
assert.match(route, /try\s*{[\s\S]*partnerPromoCode\.findFirst/, "short-link lookup should be protected by try/catch");
assert.match(route, /catch\s*\(/, "short-link route should catch database lookup failures");
assert.match(route, /PARTNER_PROMO_COOKIE/, "short-link route should persist the promo code before opening order page");
assert.doesNotMatch(route, /url\.searchParams\.set\("promo",/, "short-link route should not depend on promo query parameters");

console.log("short-link-route tests passed");
