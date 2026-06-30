import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("components/OrderForm.tsx", "utf8");

const promoCardCall = source.lastIndexOf("{isLastStep ? renderPromoCard() : null}");
const reviewStep = source.indexOf('<section className={`order-wizard-step ${activeStep.id === "review"');
const wizardActions = source.indexOf("order-wizard-actions");
const photographerStep = source.indexOf('<section className={`order-wizard-step ${activeStep.id === "photographer"');

assert.ok(promoCardCall > -1, "promo card must be rendered");
assert.ok(reviewStep > -1, "review step must exist");
assert.ok(wizardActions > -1, "wizard actions must exist");
assert.ok(photographerStep > -1, "photographer step must exist");
assert.ok(promoCardCall > reviewStep, "promo card should be inside the review step");
assert.ok(promoCardCall < wizardActions, "promo card should appear before the final action buttons");
assert.ok(promoCardCall > photographerStep, "promo card should no longer be rendered in the photographer step");

console.log("order-form-layout tests passed");
