import assert from "node:assert/strict";
import { calculateKeyboardInset, getStoryPresetById, orderStoryPresets } from "../lib/order-mobile-ux";

assert.equal(calculateKeyboardInset({ innerHeight: 844, viewportHeight: 844, viewportOffsetTop: 0, safeAreaBottom: 12 }), 0);
assert.equal(calculateKeyboardInset({ innerHeight: 844, viewportHeight: 520, viewportOffsetTop: 0, safeAreaBottom: 12 }), 312);
assert.equal(calculateKeyboardInset({ innerHeight: 844, viewportHeight: 520, viewportOffsetTop: 24, safeAreaBottom: 12 }), 288);
assert.equal(calculateKeyboardInset({ innerHeight: 844, viewportHeight: 760, viewportOffsetTop: 0, safeAreaBottom: 12 }), 72);
assert.equal(calculateKeyboardInset({ innerHeight: 844, viewportHeight: 830, viewportOffsetTop: 0, safeAreaBottom: 12 }), 0);

assert.ok(orderStoryPresets.length >= 4);
assert.equal(getStoryPresetById("first-look")?.title, "أول لقاء");
assert.equal(getStoryPresetById("missing"), null);

console.log("order mobile ux helpers passed");
