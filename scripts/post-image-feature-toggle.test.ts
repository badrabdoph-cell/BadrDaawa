import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const siteSettings = readFileSync("lib/site-settings.ts", "utf8");
const featureFlag = readFileSync("lib/post-image/feature-flag.ts", "utf8");
const orderPage = readFileSync("app/order/page.tsx", "utf8");
const orderForm = readFileSync("components/OrderForm.tsx", "utf8");
const adminSettingsPage = readFileSync("app/admin/settings/page.tsx", "utf8");
const adminSettingsRoute = readFileSync("app/api/admin/settings/route.ts", "utf8");
const postImageService = readFileSync("lib/post-image/service.ts", "utf8");
const postImageAdminRoute = readFileSync("app/api/admin/invitations/[code]/post-image/route.ts", "utf8");
const adminInvitationPage = readFileSync("app/admin/invitations/[code]/page.tsx", "utf8");
const customerDashboardPage = readFileSync("app/[code]/ad_3399/page.tsx", "utf8");
const clientDashboardShell = readFileSync("components/ClientDashboardShell.tsx", "utf8");
const invitationSeo = readFileSync("lib/invitation-seo.ts", "utf8");
const invitationPage = readFileSync("app/[code]/page.tsx", "utf8");

assert.match(siteSettings, /postImageEnabled:\s*boolean/, "site order settings should define postImageEnabled");
assert.match(siteSettings, /postImageEnabled:\s*true/, "post image feature should default to enabled for old settings");
assert.match(featureFlag, /function isPostImageFeatureEnabled|const isPostImageFeatureEnabled|export function isPostImageFeatureEnabled/, "central post image feature flag helper is required");
assert.match(featureFlag, /postImageEnabled\s*!==\s*false/, "feature flag should default missing settings to enabled");

assert.match(adminSettingsPage, /name="postImageEnabled"/, "admin settings page should expose the post image toggle");
assert.match(adminSettingsRoute, /postImageEnabled:\s*formData\.has\("postImageEnabled"\)/, "admin settings route should persist the post image toggle");

assert.match(orderPage, /postImageFeatureEnabled=\{isPostImageFeatureEnabled\(siteSettings\)\}/, "order page should pass published feature flag into OrderForm");
assert.match(orderForm, /postImageFeatureEnabled\s*=\s*true/, "OrderForm should default post image stage to enabled");
assert.match(orderForm, /postImageFeatureEnabled\s*\?\s*baseOrderWizardSteps\s*:\s*baseOrderWizardSteps\.filter/, "OrderForm should filter the post image step when disabled");

assert.match(postImageService, /isPostImageFeatureEnabled/, "post image service should guard generation with the feature flag");
assert.match(postImageService, /status:\s*"DISABLED"/, "disabled generation should return a DISABLED status");
assert.match(postImageAdminRoute, /post-image-disabled/, "admin post image route should be unavailable when the feature is disabled");

assert.match(adminInvitationPage, /postImageFeatureEnabled/, "admin invitation details should hide post image section when disabled");
assert.match(customerDashboardPage, /postImageFeatureEnabled=\{isPostImageFeatureEnabled\(siteSettings\)\}/, "customer dashboard should receive published feature flag");
assert.match(clientDashboardShell, /postImageFeatureEnabled/, "customer dashboard shell should hide post image sharing when disabled");
assert.match(invitationSeo, /postImageEnabled/, "SEO metadata should be able to ignore post image when disabled");
assert.match(invitationPage, /getInvitationSeoMetadata\(invitation,\s*\{\s*postImageEnabled: isPostImageFeatureEnabled\(siteSettings\)\s*\}\)/, "invitation page should pass setting into metadata");

console.log("post-image feature toggle tests passed");
