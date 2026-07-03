# Post Image Platform Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing post image feature into a scalable template platform with reliable rendering, Open Graph support, admin controls, and future-template documentation.

**Architecture:** Keep the current `lib/post-image` boundary, but upgrade it with a single template manifest, reusable SVG/layout helpers, deterministic font embedding, multi-size generation, and safer service orchestration. Persist the main portrait asset in existing fields and the Open Graph asset in new optional fields so old invitations remain compatible.

**Tech Stack:** Next.js 15 route handlers, React client components, Prisma/PostgreSQL, Sharp, SVG rendering, existing upload storage provider, Node.js runtime.

## Global Constraints

- Work directly in `/Users/mac/Documents/GitHub/BadrDaawa` on `main`.
- Use the existing storage provider; do not create a new asset system.
- Preserve existing invitation and order behavior.
- Keep the wizard preview-only; no file generation before final publish.
- Add tests before production-code behavior changes.
- Do not use generated bitmap assets or AI image generation.

---

### Task 1: Template Manifest + SDK Foundation

**Files:**
- Modify: `lib/post-image/types.ts`
- Modify: `lib/post-image/registry.ts`
- Create: `lib/post-image/layout.ts`
- Create: `lib/post-image/font.ts`
- Modify: `lib/post-image/svg-utils.ts`
- Test: `scripts/post-image-platform-hardening.test.ts`

**Interfaces:**
- Produces: `PostImageTemplate.manifest`, `getPostImageTemplateManifests()`, `fitTextOneLine()`, `embedPostImageFonts()`, `postImageSafeArea()`.
- Consumes: current `PostImageTemplate`, `PostImageSize`, and renderer payload types.

- [ ] Step 1: Write failing tests asserting templates expose manifest metadata, supported sizes, preview identifiers, and helper exports.
- [ ] Step 2: Run `node --import tsx scripts/post-image-platform-hardening.test.ts` and verify failure.
- [ ] Step 3: Extend types and registry without breaking existing callers.
- [ ] Step 4: Add layout/font helpers.
- [ ] Step 5: Run post-image tests and TypeScript.

### Task 2: Deterministic Fonts + Rendering Utilities

**Files:**
- Modify: `lib/post-image/font.ts`
- Modify: `lib/post-image/generator.ts`
- Modify: `lib/post-image/templates/news-card.ts`
- Modify: `lib/post-image/templates/whatsapp-chat.ts`
- Test: `scripts/post-image-platform-hardening.test.ts`

**Interfaces:**
- Produces: `fontCss` injected into every SVG payload.
- Consumes: `public/fonts/NotoNaskhArabic-Regular.ttf`.

- [ ] Step 1: Add failing test that final SVG includes `@font-face` for `BadrDaawaArabic`.
- [ ] Step 2: Run test and verify failure.
- [ ] Step 3: Base64-embed the local Arabic font in SVG output.
- [ ] Step 4: Switch template font-family declarations to `BadrDaawaArabic`.
- [ ] Step 5: Render sample PNGs to ensure Sharp accepts embedded fonts.

### Task 3: Multi-Variant Generation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260702170000_add_post_image_open_graph/migration.sql`
- Modify: `lib/post-image/types.ts`
- Modify: `lib/post-image/generator.ts`
- Modify: `lib/post-image/service.ts`
- Modify: `lib/invitation-data.ts`
- Modify: `lib/admin-data.ts`
- Modify: `lib/types.ts`
- Test: `scripts/post-image-variants.test.ts`

**Interfaces:**
- Produces: `generatePostImageSet()`, `PostImageVariantAsset`, `postImageOgUrl`, `postImageOgSignature`, `postImageOgWidth`, `postImageOgHeight`.
- Consumes: existing `ensureInvitationPostImage()`.

- [ ] Step 1: Write failing tests for portrait + Open Graph generation metadata.
- [ ] Step 2: Run test and verify failure.
- [ ] Step 3: Add Prisma fields and migration.
- [ ] Step 4: Implement generator set API.
- [ ] Step 5: Save both portrait and Open Graph assets through existing storage.
- [ ] Step 6: Keep portrait fields backward-compatible.

### Task 4: SEO Uses Correct OG Asset

**Files:**
- Modify: `lib/invitation-seo.ts`
- Test: `scripts/post-image-seo.test.ts`

**Interfaces:**
- Produces: `getInvitationSeoMetadata()` preferring `postImageOgUrl` with `1200 x 630`.
- Consumes: invitation post image state.

- [ ] Step 1: Write failing test proving OG uses the OG asset, not portrait, when available.
- [ ] Step 2: Run test and verify failure.
- [ ] Step 3: Update SEO image selection and dimensions.
- [ ] Step 4: Preserve hero-photo fallback when post image is disabled or missing.

### Task 5: Generation Lock + Safer Statuses

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260702171000_add_post_image_generation_lock/migration.sql`
- Modify: `lib/post-image/service.ts`
- Test: `scripts/post-image-service.test.ts`

**Interfaces:**
- Produces: `postImageGenerationToken`, `postImageGenerationStartedAt`, stale lock handling.
- Consumes: existing `ensureInvitationPostImage()`.

- [ ] Step 1: Write failing tests for skip-on-active-generation and stale-lock override.
- [ ] Step 2: Run test and verify failure.
- [ ] Step 3: Add lock fields and migration.
- [ ] Step 4: Implement token lock in service.
- [ ] Step 5: Ensure failed generation clears/updates state predictably.

### Task 6: Admin Control Surface Upgrade

**Files:**
- Modify: `components/PostImageAdminPanel.tsx`
- Modify: `app/api/admin/invitations/[code]/post-image/route.ts`
- Modify: `app/admin/invitations/[code]/page.tsx`
- Modify: `components/AdminOrderRequestsManager.tsx`
- Modify: `app/globals.css`
- Test: `scripts/admin-orders-post-image-panel.test.ts`

**Interfaces:**
- Produces: visible portrait + Open Graph metadata, copy image URL, copy OG URL, status refresh, variant labels.
- Consumes: API post image payload.

- [ ] Step 1: Add failing source tests for OG controls and copy-link controls.
- [ ] Step 2: Run test and verify failure.
- [ ] Step 3: Extend API payload with OG fields.
- [ ] Step 4: Add compact admin UI without nested card clutter.
- [ ] Step 5: Keep direct clipboard image copy and download fallback.

### Task 7: Future Template Developer Guide

**Files:**
- Create: `docs/post-image-templates.md`
- Test: `scripts/post-image-template-extensibility.test.ts`

**Interfaces:**
- Produces: documented checklist for adding templates from image or code.

- [ ] Step 1: Add failing test that docs exist and name required files/functions.
- [ ] Step 2: Run test and verify failure.
- [ ] Step 3: Write concise guide covering manifest, preview, renderer, sizes, tests, and visual QA.

### Task 8: Final Verification

**Files:**
- All modified files.

- [ ] Step 1: Run all post image scripts.
- [ ] Step 2: Run `npm run check`.
- [ ] Step 3: Run `npm run build`.
- [ ] Step 4: Review `git diff`.
- [ ] Step 5: Commit and attempt push to `origin/main`.
