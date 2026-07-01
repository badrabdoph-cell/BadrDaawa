import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("lib/promo-code-service.ts", "utf8");
const healthPage = readFileSync("app/admin/promo-codes/health/page.tsx", "utf8");
const historyPage = readFileSync("app/admin/promo-codes/history/page.tsx", "utf8");
const detailPage = readFileSync("app/admin/promo-codes/[id]/page.tsx", "utf8");
const actions = readFileSync("app/admin/promo-codes/actions.ts", "utf8");

for (const metric of [
  "partnerPromoCount",
  "discountPromoCount",
  "activeCount",
  "pausedCount",
  "expiredCount",
  "archivedCount",
  "brokenShortLinks",
  "invalidQrCodes",
  "duplicateCodes",
  "relationErrors",
]) {
  assert.match(service, new RegExp(metric), `PromoCodeService health should calculate ${metric}`);
  assert.match(healthPage, new RegExp(metric), `Promo Health page should render ${metric}`);
}

for (const label of ["نشط", "معلق مؤقتًا", "بانتظار البداية", "منتهي", "محذوف", "مؤرشف"]) {
  assert.match(historyPage + detailPage, new RegExp(label), `UI should expose ${label} state`);
}

for (const label of ["Bulk Actions", "تفعيل", "تعطيل", "حذف آمن", "أرشفة", "استعادة", "تصدير CSV"]) {
  assert.match(historyPage, new RegExp(label), `history should expose bulk action ${label}`);
}

for (const action of ["bulkPromoAction", "pausePartnerPromoUntilAction", "logLegacyPromoRouteAction"]) {
  assert.match(actions, new RegExp(action), `actions should include ${action}`);
}

for (const event of ["إنشاء الكود", "تعديل البيانات", "تغيير الخصم", "تعطيل", "إعادة تشغيل", "إيقاف مؤقت", "حذف", "استعادة", "زيارة الرابط", "استخدام البروموكود", "إنشاء دعوة", "إرسال رسالة"]) {
  assert.match(detailPage, new RegExp(event), `promo detail timeline should include ${event}`);
}

console.log("promo-health-and-actions tests passed");
