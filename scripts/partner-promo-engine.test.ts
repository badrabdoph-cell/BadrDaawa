import assert from "node:assert/strict";
import {
  buildDiscountSnapshot,
  buildPartnerSnapshot,
  formatDiscountLabel,
  normalizePromoCode,
} from "../lib/partner-promo";

assert.equal(normalizePromoCode("  badr 2026 "), "BADR2026");
assert.equal(normalizePromoCode("summer-عرض"), "SUMMER-عرض");

assert.equal(formatDiscountLabel({ discountType: "NONE", discountValue: null }), "");
assert.equal(formatDiscountLabel({ discountType: "PERCENTAGE", discountValue: 20 }), "تم تطبيق خصم 20%");
assert.equal(formatDiscountLabel({ discountType: "FIXED_AMOUNT", discountValue: 150 }), "تم تطبيق خصم 150 جنيه");
assert.equal(formatDiscountLabel({ discountType: "FREE_INVITATION", discountValue: null }), "الدعوة مجانية بالكامل");

const partnerSnapshot = buildPartnerSnapshot({
  id: "partner-1",
  displayName: "Badr Studio",
  partnerType: "PHOTOGRAPHER",
  logoUrl: "https://example.com/logo.png",
  facebookUrl: "https://facebook.com/badr",
  instagramUrl: "https://instagram.com/badr",
  showPartnerCard: true,
});

assert.deepEqual(partnerSnapshot, {
  partnerId: "partner-1",
  displayName: "Badr Studio",
  partnerType: "PHOTOGRAPHER",
  logoUrl: "https://example.com/logo.png",
  facebookUrl: "https://facebook.com/badr",
  instagramUrl: "https://instagram.com/badr",
  showPartnerCard: true,
});

const discountSnapshot = buildDiscountSnapshot({
  id: "promo-1",
  code: "BADR2026",
  discountType: "PERCENTAGE",
  discountValue: 20,
});

assert.deepEqual(discountSnapshot, {
  promoId: "promo-1",
  code: "BADR2026",
  discountType: "PERCENTAGE",
  discountValue: 20,
  label: "تم تطبيق خصم 20%",
});

console.log("partner-promo-engine tests passed");
