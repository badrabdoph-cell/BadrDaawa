ALTER TABLE "DiscountPromoCode" ADD COLUMN IF NOT EXISTS "displayMessage" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "PartnerPromoCode_code_ci_key" ON "PartnerPromoCode" (UPPER("code"));
CREATE UNIQUE INDEX IF NOT EXISTS "DiscountPromoCode_code_ci_key" ON "DiscountPromoCode" (UPPER("code"));
