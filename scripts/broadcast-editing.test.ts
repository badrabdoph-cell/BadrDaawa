import assert from "node:assert/strict";
import { defaultHomeContent } from "../lib/home-content";
import { applyHomeContentTextUpdate } from "../lib/content-text-registry";
import { matchBroadcastEntry } from "../lib/broadcast-editing";

const content = JSON.parse(JSON.stringify(defaultHomeContent));

assert.equal(applyHomeContentTextUpdate(content, "quickBenefits.quick-2.title", "عنوان جديد"), true);
assert.equal(content.quickBenefits.find((item: { id: string }) => item.id === "quick-2")?.title, "عنوان جديد");
assert.equal(content.quickBenefits[0].title, defaultHomeContent.quickBenefits?.[0].title);

assert.equal(applyHomeContentTextUpdate(content, "ownerFeatures.owner-3.text", "وصف جديد"), true);
assert.equal(content.ownerFeatures.find((item: { id: string }) => item.id === "owner-3")?.text, "وصف جديد");
assert.equal(content.guestFeatures.find((item: { id: string }) => item.id === "guest-3")?.text, defaultHomeContent.guestFeatures?.[2].text);

assert.equal(applyHomeContentTextUpdate(content, "faqItems.faq-2.answer", "إجابة جديدة"), true);
assert.equal(content.faqItems.find((item: { id: string }) => item.id === "faq-2")?.answer, "إجابة جديدة");

assert.equal(applyHomeContentTextUpdate(content, "quickBenefits.missing.title", "لن يتم الحفظ"), false);

const entries = [
  { id: "home-content.hero.primaryCta", title: "زر", text: "ابدأ", sourceLabel: "الرئيسية", editable: true, href: "" },
  { id: "home-content.quickBenefits.quick-1.title", title: "كارت", text: "ابدأ", sourceLabel: "الرئيسية", editable: true, href: "" },
];

assert.equal(matchBroadcastEntry({ broadcastId: "home-content.quickBenefits.quick-1.title", text: "ابدأ" }, entries)?.id, "home-content.quickBenefits.quick-1.title");
assert.equal(matchBroadcastEntry({ text: "ابدأ" }, entries), null);
assert.equal(matchBroadcastEntry({ text: "نص فريد" }, [{ ...entries[0], text: "نص فريد" }])?.id, "home-content.hero.primaryCta");

console.log("broadcast editing helpers passed");
