# Post Image Feature Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one admin setting that turns the Post Image feature on or off across the full system.

**Architecture:** Store the toggle in existing site order settings with a backward-compatible default of enabled. Use one central helper to decide whether post-image behavior is active, then apply that decision at the wizard, generation service, admin route, admin details page, customer dashboard, and SEO layer.

**Tech Stack:** Next.js App Router, React, TypeScript, Prisma-backed invitation data, existing project-content site settings, Node route handlers.

## Global Constraints

- The setting lives inside the existing admin site settings page.
- Disabled means the post image stage and all visible post-image surfaces disappear.
- Disabled means no automatic or manual post-image generation should run.
- Existing stored post-image assets are not deleted by toggling the setting off.
- Backward compatibility: missing setting defaults to enabled.

---

### Task 1: Add Failing Coverage

**Files:**
- Create: `scripts/post-image-feature-toggle.test.ts`
- Modify: `scripts/order-post-image-stage.test.ts`

**Interfaces:**
- Produces expected source contracts for later implementation:
  - `SiteOrderSettings.postImageEnabled: boolean`
  - `isPostImageFeatureEnabled(settings?: Pick<SiteSettings, "order"> | null): boolean`
  - `OrderForm` prop `postImageFeatureEnabled?: boolean`

- [ ] Step 1: Add a source-level test that fails until the setting/helper/UI/API guards exist.
- [ ] Step 2: Run the test and confirm failure.

### Task 2: Add Setting and Helper

**Files:**
- Modify: `lib/site-settings.ts`
- Create: `lib/post-image/feature-flag.ts`
- Modify: `app/admin/settings/page.tsx`
- Modify: `app/api/admin/settings/route.ts`

**Interfaces:**
- `SiteOrderSettings` gains `postImageEnabled`.
- `defaultSiteSettings.order.postImageEnabled` is `true`.
- `normalizeSettings()` preserves old settings by defaulting missing values to `true`.
- `isPostImageFeatureEnabled()` returns `settings?.order?.postImageEnabled !== false`.

- [ ] Step 3: Add `postImageEnabled` to the type/default/normalization.
- [ ] Step 4: Add the admin checkbox under “إعدادات الطلب”.
- [ ] Step 5: Persist checkbox value from the settings POST route.

### Task 3: Hide Wizard Stage

**Files:**
- Modify: `app/order/page.tsx`
- Modify: `components/OrderForm.tsx`

**Interfaces:**
- `OrderForm` receives `postImageFeatureEnabled?: boolean`.
- Wizard steps are derived from base steps and filter out `postImage` when disabled.
- PostImagePreviewCard section renders only when enabled.

- [ ] Step 6: Pass the published setting into `OrderForm`.
- [ ] Step 7: Derive active wizard steps from the flag.
- [ ] Step 8: Use the derived steps for progress, navigation, validation, and rendering.

### Task 4: Stop Generation When Disabled

**Files:**
- Modify: `lib/post-image/service.ts`
- Modify: `app/api/admin/invitations/[code]/post-image/route.ts`

**Interfaces:**
- `ensureInvitationPostImage()` returns `{ ok: true, generated: false, skipped: true, status: "DISABLED" }` when disabled.
- Admin post-image API returns 404 when the feature is disabled.

- [ ] Step 9: Guard `ensureInvitationPostImage()` before reading/writing invitation data.
- [ ] Step 10: Guard `markPostImageNeedsRegeneration()`.
- [ ] Step 11: Guard the admin post-image route.

### Task 5: Hide Admin, Customer, and SEO Surfaces

**Files:**
- Modify: `app/admin/invitations/[code]/page.tsx`
- Modify: `app/[code]/ad_3399/page.tsx`
- Modify: `components/ClientDashboardShell.tsx`
- Modify: `lib/invitation-seo.ts`
- Modify: `app/[code]/page.tsx`

**Interfaces:**
- Admin tab and section hidden when disabled.
- Customer share tools receive no post image when disabled.
- Invitation metadata and structured data ignore post image when disabled.

- [ ] Step 12: Read draft site setting in admin details and hide the tab/section.
- [ ] Step 13: Pass published feature flag to the customer dashboard.
- [ ] Step 14: Make SEO image selection accept `postImageEnabled`.
- [ ] Step 15: Pass published setting to metadata/structured data.

### Task 6: Verify

**Files:**
- Modify tests only if assertions need the new feature flag contract.

- [ ] Step 16: Run the new toggle test and existing post-image tests.
- [ ] Step 17: Run TypeScript/build verification.
- [ ] Step 18: Do a quick browser check for enabled/disabled wizard behavior if the local app can run.
