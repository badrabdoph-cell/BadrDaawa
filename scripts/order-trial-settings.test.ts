import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_ORDER_TRIAL_DAYS,
  MAX_ORDER_TRIAL_DAYS,
  MIN_ORDER_TRIAL_DAYS,
  normalizeOrderTrialDays,
} from "../lib/order-trial-policy";

assert.equal(DEFAULT_ORDER_TRIAL_DAYS, 3);
assert.equal(MIN_ORDER_TRIAL_DAYS, 1);
assert.equal(MAX_ORDER_TRIAL_DAYS, 10);
assert.equal(normalizeOrderTrialDays(undefined), 3);
assert.equal(normalizeOrderTrialDays("7"), 7);
assert.equal(normalizeOrderTrialDays(0), 1);
assert.equal(normalizeOrderTrialDays(99), 10);
assert.equal(normalizeOrderTrialDays("invalid"), 3);

const root = process.cwd();
const settingsSource = fs.readFileSync(path.join(root, "lib/site-settings.ts"), "utf8");
const settingsRouteSource = fs.readFileSync(path.join(root, "app/api/admin/settings/route.ts"), "utf8");
const settingsPageSource = fs.readFileSync(path.join(root, "app/admin/settings/page.tsx"), "utf8");

assert.match(settingsSource, /autoTrialPublishEnabled:\s*boolean/);
assert.match(settingsSource, /defaultTrialDays:\s*number/);
assert.match(settingsRouteSource, /autoTrialPublishEnabled:\s*formData\.has\("autoTrialPublishEnabled"\)/);
assert.match(settingsRouteSource, /defaultTrialDays:\s*normalizeOrderTrialDays\(text\(formData, "defaultTrialDays"\)\)/);
assert.match(settingsPageSource, /name="autoTrialPublishEnabled"/);
assert.match(settingsPageSource, /name="defaultTrialDays"/);

console.log("order trial settings tests passed");
