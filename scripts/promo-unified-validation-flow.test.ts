import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

assert.ok(existsSync("lib/promo-code-service.ts"), "PromoCodeService must exist");

const service = readFileSync("lib/promo-code-service.ts", "utf8");
const route = readFileSync("app/api/promo/validate/route.ts", "utf8");
const orderForm = readFileSync("components/OrderForm.tsx", "utf8");
const orderApi = readFileSync("app/api/orders/route.ts", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");
const actions = readFileSync("app/admin/promo-codes/actions.ts", "utf8");

assert.match(service, /PromoCodeService/, "service should be named PromoCodeService");
assert.match(service, /validatePromoCode/, "service should validate any promo code");
assert.match(service, /createPartnerPromo/, "service should create partner promo codes");
assert.match(service, /createDiscountPromo/, "service should create discount promo codes");
assert.match(service, /testShortLink/, "service should test short links");
assert.match(service, /getPromoHealth/, "service should provide promo health data");
assert.match(service, /partnerPromoCode\.findUnique/, "service should search partner promo codes first");
assert.match(service, /discountPromoCode\.findUnique/, "service should search discount promo codes second");
assert.match(service, /toUpperCase\(\)/, "codes should be normalized uppercase");

assert.match(route, /PromoCodeService\.validatePromoCode/, "existing validation endpoint should use unified service");
assert.doesNotMatch(orderForm, /api\/discount-promo\/validate/, "frontend must not call a separate discount endpoint");
assert.match(orderForm, /\/api\/promo\/validate/, "frontend should call only the unified promo endpoint");
assert.doesNotMatch(orderForm, /api\/promo\/validate[\s\S]*api\/promo\/validate/, "frontend should not make multiple promo validation requests");
assert.match(orderForm, /type:\s*"partner"\s*\|\s*"discount"|type\?\:\s*"partner"\s*\|\s*"discount"/, "frontend type should be generic response metadata only");

assert.match(orderApi, /PromoCodeService\.validatePromoCode/, "order API should let backend determine promo type");
assert.match(orderApi, /discountPromoId/, "order API should save general discount promo id");
assert.match(orderApi, /partnerPromoId/, "order API should save partner promo id");
assert.match(orderApi, /recordPromoOrderApplication/, "order API should update promo counters through service");

assert.match(schema, /displayMessage\s+String\?/, "DiscountPromoCode should have clear displayMessage field");
assert.match(actions, /displayMessage/, "discount creation action should save displayMessage");

console.log("promo-unified-validation-flow tests passed");
