import assert from "node:assert/strict";
import { calculateKeyboardInset, getIncompleteRequiredStoryStage, getStoryPresetById, orderStoryPresets, requiredOrderStoryStages } from "../lib/order-mobile-ux";

assert.equal(calculateKeyboardInset({ innerHeight: 844, viewportHeight: 844, viewportOffsetTop: 0, safeAreaBottom: 12 }), 0);
assert.equal(calculateKeyboardInset({ innerHeight: 844, viewportHeight: 520, viewportOffsetTop: 0, safeAreaBottom: 12 }), 312);
assert.equal(calculateKeyboardInset({ innerHeight: 844, viewportHeight: 520, viewportOffsetTop: 24, safeAreaBottom: 12 }), 288);
assert.equal(calculateKeyboardInset({ innerHeight: 844, viewportHeight: 760, viewportOffsetTop: 0, safeAreaBottom: 12 }), 72);
assert.equal(calculateKeyboardInset({ innerHeight: 844, viewportHeight: 830, viewportOffsetTop: 0, safeAreaBottom: 12 }), 0);

assert.deepEqual(requiredOrderStoryStages.map((stage) => stage.label), ["أول لقاء", "منتصف الطريق", "يوم الزفاف"]);
assert.ok(orderStoryPresets.length >= 3);
assert.equal(getStoryPresetById("first-look")?.title, "أول لقاء");
assert.equal(getStoryPresetById("missing"), null);
assert.equal(getIncompleteRequiredStoryStage([], { requireAll: false }), null);
assert.equal(
  getIncompleteRequiredStoryStage(
    [
      { date: "2024", title: "أول لقاء", description: "بدأت الحكاية" },
      { date: "", title: "", description: "" },
    ],
    { requireAll: false },
  )?.index,
  1,
);
assert.equal(getIncompleteRequiredStoryStage([{ date: "", title: "", description: "" }], { requireAll: true })?.index, 0);

console.log("order mobile ux helpers passed");
