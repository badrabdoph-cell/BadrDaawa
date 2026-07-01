# Post Image Stage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a final “صورة البوست” preview stage to the public invitation wizard, generate a professional invitation post image after publishing, store it as an official invitation asset, expose it in admin/client surfaces, and keep it covered by existing backup/restore/sync/storage flows.

**Architecture:** The public wizard shows a fast, no-save React/CSS preview from already-entered data. Final generation is server-side and non-blocking around invitation create/update flows, using a template registry, payload signature, QR generation, Sharp SVG composition, and the existing upload storage provider. Invitation rows store the post-image template id, URL, status, signature, timestamps, and failure text so future templates/sizes can be added without changing wizard logic.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Prisma 5/PostgreSQL, Sharp, qrcode, existing `/uploads` storage provider, existing admin/client panels, existing backup v1/v2 GitHub flows.

## Global Constraints

- No new client-entered fields in the public order wizard.
- The new wizard stage is Preview only: no settings, options, edit buttons, fields, click actions, modal, final QR file, or saved image.
- The final saved image size is 1080 x 1350 px, with the renderer designed for future sizes such as 1200 x 630 and 1080 x 1080.
- The first template follows the attached reference visually but must not use the image file itself as an asset, crop, or background.
- Data sources are existing invitation data: groom name, bride name, cover image, wedding date, invitation URL.
- Title text is always `خبر عاجل!!`.
- Couple text is `{اسم العريس} هيتجوز {اسم العروسة}` as one consistent text treatment.
- Date text hides the day and renders as `❤️ / الشهر / السنة`.
- QR is generated from the real invitation URL after creation.
- If post-image generation fails, invitation/order creation must not fail.
- If visible data changes, mark/regenerate automatically; if unchanged, do not regenerate.
- Store the image using the current upload storage system; do not create a parallel storage system.
- Existing Backup/Restore/Export/Import/Sync should include it naturally via DB rows and `/uploads`.
- Hard deleting an invitation must delete the post image if no longer referenced.
- Save Template ID with invitation data.

---

## Project Analysis Report

### Current Structure

The app is a Next.js 15 project using Prisma/PostgreSQL. Public customer orders are created from `app/order/page.tsx` through `components/OrderForm.tsx` and submitted to `app/api/orders/route.ts`. The order API stores `OrderRequest` rows and reserves an invitation code/manage token, but does not create the final `Invitation` yet.

Publishing happens in admin flows:

- `components/AdminOrderRequestsManager.tsx` sends `publish` / `trial-publish` to `app/api/admin/orders/[id]/route.ts`.
- `publishPrismaOrder()` in that route creates or updates the `Invitation` row.
- `components/AdminNewInvitationWizard.tsx` sends direct invitation creation to `app/api/admin/invitation-builder/route.ts`.
- Client-side edits happen through `components/ClientInvitationEditor.tsx` and `app/api/client/invitations/[code]/route.ts`.

Storage is centralized in `lib/storage-provider.ts`. Uploads are publicly served through `app/uploads/[...path]/route.ts`, which allows existing first-level runtime upload subdirectories such as `client-invitations`. Storing under `client-invitations/post-images/...` uses the current storage route without changing the public route whitelist.

Backups are centralized:

- `lib/backups.ts` v1 reads all Prisma runtime data and all upload files via `listUploadFiles()`.
- `lib/backups-v2.ts` database/upload/full backups also read all Prisma rows and upload files.
- GitHub backup upload and restore already include all upload entries.

Deletion is centralized in `lib/invitation-deletion.ts`. It collects upload URLs from selected invitation fields, then deletes unreferenced files after hard deletion. Media cleanup in `lib/media-cleanup.ts` currently selects invitation media fields explicitly, so post image fields should be added there to avoid false orphan detection.

QR rendering currently exists mostly client-side (`components/QrCodeBlock.tsx`, `components/InvitationQrTools.tsx`) and partner promo server-side via `qrcode`. Invitation `qrCodeUrl` exists in Prisma but is not broadly populated for invitations.

### Design Reference Analysis

Reference image dimensions are 1157 x 1450, close to a 4:5 composition. The target output is 1080 x 1350.

Visual structure:

- Paper-like warm background, roughly `#eee8dc`, with subtle gray handwritten marks and low-contrast texture.
- Outer content margins around 70 px on target width.
- Top masthead row around y=35-70: English serif label left, bold small brand text right.
- Double horizontal black rule near the top, one heavy and one thin.
- Main Arabic headline `خبر عاجل!!` centered, red, very large, rounded/heavy, around y=120-270.
- Another double horizontal rule below headline around y=300-325.
- Couple sentence centered, dark charcoal, heavy Arabic display, around y=380-470.
- Thin rule below names around y=515.
- Photo block centered, about 74% width and 39% height, around x=165, y=555, with a dark border.
- “SAVE THE DATE” uppercase serif centered below image.
- Date area: hearts left/right, boxed date centered. For this project the day becomes `❤️`, so text should be `❤️ / M / YYYY`.
- Bottom double rule and small venue/brand text.
- Layering order: background texture, decorative rules, typography, image frame, date row, bottom label, QR badge if included.

Adaptation for product requirement:

- Use the invitation cover image (`heroPhoto` / first `gallery` item), not a new upload.
- Include QR from the real public URL. The reference does not show QR, so add it as a restrained bottom-right newspaper seal area without stealing focus from the reference composition.
- Use Noto Naskh Arabic from `public/fonts/NotoNaskhArabic-Regular.ttf` as the Arabic fallback. Use Georgia/serif for English masthead/date label in React preview and similar font-family in SVG renderer.

### Files Expected To Be Affected

Database/model:

- `prisma/schema.prisma`
- New Prisma migration under `prisma/migrations/...`
- `lib/types.ts`
- `lib/admin-data.ts`
- `lib/invitation-data.ts`

Post image architecture:

- New `lib/post-image/types.ts`
- New `lib/post-image/date.ts`
- New `lib/post-image/signature.ts`
- New `lib/post-image/templates/news-card.ts`
- New `lib/post-image/registry.ts`
- New `lib/post-image/render-svg.ts`
- New `lib/post-image/generator.ts`
- New `lib/post-image/service.ts`

Public wizard preview:

- New `components/post-image/PostImagePreviewCard.tsx`
- `components/OrderForm.tsx`
- `app/globals.css`
- Possibly `app/order/order-visual-polish.module.css` if scoped polish is needed.

Admin UI/API:

- New `components/PostImageAdminPanel.tsx`
- New `app/api/admin/invitations/[code]/post-image/route.ts`
- `app/admin/invitations/[code]/page.tsx`
- `components/AdminOrderRequestsManager.tsx` for post-publish response display if needed.

Generation hook points:

- `app/api/admin/orders/[id]/route.ts`
- `app/api/admin/invitation-builder/route.ts`
- `app/api/client/invitations/[code]/route.ts`

SEO/client usage:

- `lib/invitation-seo.ts`
- `components/ClientDashboardShell.tsx`
- `components/ClientShareTools.tsx` only if adding post image actions to client share.

Storage/media/delete:

- `lib/storage-provider.ts` only if content type support needs adjustment; likely not needed for PNG/WebP.
- `lib/media-cleanup.ts`
- `lib/invitation-deletion.ts`
- `scripts/safe-cleanup-audit.mjs` if its explicit selects need post-image fields.

Tests/verification:

- New `scripts/post-image-signature.test.ts`
- New `scripts/post-image-renderer.test.ts`
- New `scripts/order-post-image-stage.test.ts`
- Possibly update `scripts/order-form-layout.test.ts`.
- `package.json` only if adding test scripts; prefer direct `node`/`tsx` commands without package churn.

### What Will Change And Why

The `Invitation` model needs post-image fields so the image is a first-class invitation asset. This preserves template ID, generation state, URL, signature, dimensions, generated time, and error state.

The wizard needs a new step before review. It must be non-interactive and driven by existing form state and uploaded cover image URL. It should not add payload fields to `/api/orders`.

The generation service needs to run after final invitation URL exists. That means after `publishPrismaOrder()` has created/updated the invitation, and after `invitation-builder` direct creation. Client edits that affect name/date/cover should trigger regeneration or mark as needing regeneration.

The admin details page needs a new section and navigation tab for “صورة البوست” with preview, enlarge, download, clipboard copy, regenerate, and status.

SEO can switch Open Graph image to the generated post image when available, falling back to current hero image otherwise.

Media cleanup and hard delete need post-image URLs in their reference/deletion collection, otherwise stored images may be mistaken as unused or left behind after hard delete.

### Risks And Avoidance

- **Arabic text shaping in server-rendered image:** Use SVG rendered by Sharp/librsvg with Noto Naskh Arabic, verify with a generated PNG.
- **Generation failure blocking publishing:** Wrap generation in a non-fatal service that records `FAILED` and error text.
- **Unnecessary regeneration:** Use a stable signature from template ID, size, groom/bride names, wedding month/year, cover URL, and public URL. Skip generation when the stored signature matches and status is generated.
- **Backup compatibility:** Prefer adding nullable columns to `Invitation` instead of creating a new table. Existing backup table serialization then includes the new fields naturally.
- **Edge runtime bundling:** Keep Sharp/qrcode generation inside nodejs route/service imports used by node routes; avoid importing generation code into client components or Edge-only files.
- **Clipboard image support varies:** Admin panel should use `navigator.clipboard.write([ClipboardItem])` when available and show/download fallback when unsupported.
- **Storage orphan mistakes:** Add post image fields to media cleanup references and hard delete collection.
- **Wizard performance:** Preview is pure React/CSS using existing uploaded image URLs; no server generation, no QR final file.

## Detailed Execution Plan

- [ ] **Step 1: Add failing signature tests**
  - Goal: Prove post-image signatures change only when visible data changes.
  - Files: create `scripts/post-image-signature.test.ts`.
  - Reason: Prevent accidental regeneration loops.
  - Result: Tests fail because post-image modules do not exist.
  - Next: Implement types/signature.

- [ ] **Step 2: Run signature test and confirm RED**
  - Goal: Confirm test fails for missing module.
  - Files: none.
  - Reason: TDD gate.
  - Result: Expected module-not-found failure.
  - Next: Create post image types.

- [ ] **Step 3: Create core post-image types**
  - Goal: Define template IDs, sizes, statuses, payloads, assets.
  - Files: create `lib/post-image/types.ts`.
  - Reason: Shared interfaces for preview, generator, service, UI.
  - Result: Type names exist for later modules.
  - Next: Add date helper.

- [ ] **Step 4: Create date formatting helper**
  - Goal: Render date as `❤️ / month / year`.
  - Files: create `lib/post-image/date.ts`.
  - Reason: Keeps hidden-day rule centralized.
  - Result: Preview and final renderer share one date rule.
  - Next: Add signature helper.

- [ ] **Step 5: Create signature helper**
  - Goal: Produce stable hash from visible post-image inputs.
  - Files: create `lib/post-image/signature.ts`.
  - Reason: Skip unnecessary regeneration.
  - Result: Signature tests can pass.
  - Next: Run signature test.

- [ ] **Step 6: Run signature test and confirm GREEN**
  - Goal: Verify signature/date behavior.
  - Files: none.
  - Reason: Lock core regeneration logic.
  - Result: Signature test passes.
  - Next: Add database fields.

- [ ] **Step 7: Extend Prisma Invitation model**
  - Goal: Add nullable post-image fields to `Invitation`.
  - Files: modify `prisma/schema.prisma`.
  - Reason: Store asset state without a separate table.
  - Result: Prisma schema has post image URL/template/status/signature/error/dimensions timestamps.
  - Next: Add migration.

- [ ] **Step 8: Add Prisma migration**
  - Goal: Add DB columns with safe nullable defaults.
  - Files: create `prisma/migrations/20260701090000_add_invitation_post_image/migration.sql`.
  - Reason: Deployable schema change.
  - Result: Existing rows remain compatible.
  - Next: Regenerate Prisma client.

- [ ] **Step 9: Regenerate Prisma client**
  - Goal: Make new fields available to TypeScript.
  - Files: generated client only.
  - Reason: Avoid type errors.
  - Result: Prisma client knows post-image fields.
  - Next: Update project types.

- [ ] **Step 10: Extend public Invitation type**
  - Goal: Add post-image asset fields to `lib/types.ts`.
  - Files: modify `lib/types.ts`.
  - Reason: Admin/client/SEO can read the asset.
  - Result: `Invitation` type exposes status/url/template/signature dimensions.
  - Next: Map DB rows.

- [ ] **Step 11: Map post-image fields in admin data**
  - Goal: Include post-image fields in `getAdminInvitations()`.
  - Files: modify `lib/admin-data.ts`.
  - Reason: Admin details page uses this data source.
  - Result: Admin invitation objects include post image asset.
  - Next: Map public invitation data.

- [ ] **Step 12: Map post-image fields in public invitation data**
  - Goal: Include post-image fields in `getInvitationByCode()`.
  - Files: modify `lib/invitation-data.ts`.
  - Reason: Client dashboard and SEO can use the asset.
  - Result: Public invitation objects include post image asset.
  - Next: Add template registry tests.

- [ ] **Step 13: Add renderer smoke test**
  - Goal: Verify template registry can produce SVG/PNG dimensions.
  - Files: create `scripts/post-image-renderer.test.ts`.
  - Reason: Protect first template and extensible size logic.
  - Result: Test fails because renderer does not exist.
  - Next: Implement registry.

- [ ] **Step 14: Create template registry**
  - Goal: Register `breaking-news-v1` as default post-image template.
  - Files: create `lib/post-image/registry.ts`.
  - Reason: Future templates should not alter wizard/generator logic.
  - Result: Registry resolves template by ID and default ID.
  - Next: Implement template geometry.

- [ ] **Step 15: Create first template definition**
  - Goal: Define all layout tokens for the reference-inspired card.
  - Files: create `lib/post-image/templates/news-card.ts`.
  - Reason: Encapsulate visual layout and sizes.
  - Result: Template supports 1080x1350 and can scale to other sizes.
  - Next: SVG renderer.

- [ ] **Step 16: Create SVG renderer**
  - Goal: Convert payload + template + size into SVG markup.
  - Files: create `lib/post-image/render-svg.ts`.
  - Reason: Reusable server rendering layer.
  - Result: Renderer outputs layered paper/card/image/QR SVG.
  - Next: PNG generator.

- [ ] **Step 17: Create generator**
  - Goal: Use Sharp and qrcode to generate final image bytes.
  - Files: create `lib/post-image/generator.ts`.
  - Reason: Server-side final asset creation.
  - Result: Generator returns PNG/WebP bytes and metadata.
  - Next: Run renderer test.

- [ ] **Step 18: Run renderer test and confirm GREEN**
  - Goal: Verify dimensions and basic visible strings.
  - Files: none.
  - Reason: Lock generator behavior.
  - Result: Renderer test passes.
  - Next: Add service tests.

- [ ] **Step 19: Add service behavior test**
  - Goal: Verify skip/regenerate/failure semantics.
  - Files: create `scripts/post-image-service.test.ts`.
  - Reason: Generation should be non-fatal and cached by signature.
  - Result: Test fails until service exists.
  - Next: Implement service.

- [ ] **Step 20: Create post-image service**
  - Goal: Load invitation, compute payload, skip or generate, store result.
  - Files: create `lib/post-image/service.ts`.
  - Reason: Keep route logic thin and reusable.
  - Result: `ensureInvitationPostImage()`, `markPostImageNeedsRegeneration()`, `regenerateInvitationPostImage()` exist.
  - Next: Run service test.

- [ ] **Step 21: Run service test and confirm GREEN**
  - Goal: Confirm service state transitions.
  - Files: none.
  - Reason: Protect non-fatal generation and cache.
  - Result: Service test passes.
  - Next: Hook into admin order publishing.

- [ ] **Step 22: Hook generation after order publish**
  - Goal: Generate final post image after `publishPrismaOrder()`.
  - Files: modify `app/api/admin/orders/[id]/route.ts`.
  - Reason: Customer order flow creates real URL here.
  - Result: Publish response includes post image state where available; failures logged but publish succeeds.
  - Next: Hook direct builder.

- [ ] **Step 23: Hook generation after direct invitation builder publish**
  - Goal: Generate final post image for admin-created invitations.
  - Files: modify `app/api/admin/invitation-builder/route.ts`.
  - Reason: Post image must be official for all invitation creation paths.
  - Result: Published direct invitations get post images; drafts can be marked pending/not generated.
  - Next: Hook client edits.

- [ ] **Step 24: Hook relevant client edits**
  - Goal: Regenerate or mark post image when client changes groom/bride/date/gallery.
  - Files: modify `app/api/client/invitations/[code]/route.ts`.
  - Reason: Visible data changes must refresh the asset.
  - Result: Relevant client saves trigger non-fatal regeneration; unrelated saves skip.
  - Next: Hook admin order updates if published.

- [ ] **Step 25: Hook published order updates**
  - Goal: Regenerate when admin edits an already-published order that updates invitation.
  - Files: modify `app/api/admin/orders/[id]/route.ts`.
  - Reason: Re-publishing existing invitation can change visible data.
  - Result: Existing published invitation gets fresh post image if signature changed.
  - Next: Hook direct invitation updates.

- [ ] **Step 26: Hook direct invitation updates**
  - Goal: Regenerate when builder updates an existing published invitation.
  - Files: modify `app/api/admin/invitation-builder/route.ts`.
  - Reason: Builder can edit existing invitation with visible data.
  - Result: Existing published invite asset stays current.
  - Next: Add admin API.

- [ ] **Step 27: Add admin post-image API**
  - Goal: Provide GET/POST for status and manual regenerate.
  - Files: create `app/api/admin/invitations/[code]/post-image/route.ts`.
  - Reason: Admin panel needs refresh/regenerate/download data.
  - Result: Admin can fetch and regenerate image.
  - Next: Add admin UI client component.

- [ ] **Step 28: Create admin panel component**
  - Goal: Preview, enlarge, download, copy image, regenerate, show status.
  - Files: create `components/PostImageAdminPanel.tsx`.
  - Reason: Keep client clipboard logic out of server page.
  - Result: Component handles browser capabilities and fallback.
  - Next: Mount in details page.

- [ ] **Step 29: Add admin details section**
  - Goal: Add “صورة البوست” tab/section to invitation details.
  - Files: modify `app/admin/invitations/[code]/page.tsx`.
  - Reason: Required admin workflow.
  - Result: Admin can manage asset from invitation details.
  - Next: Update CSS.

- [ ] **Step 30: Add admin panel styles**
  - Goal: Style preview, modal/enlarge, buttons, statuses.
  - Files: modify `app/globals.css`.
  - Reason: Match admin UI without nested-card clutter.
  - Result: Responsive admin post image section.
  - Next: Add public wizard preview component.

- [ ] **Step 31: Create reusable preview card component**
  - Goal: Render no-save post card preview in React/CSS.
  - Files: create `components/post-image/PostImagePreviewCard.tsx`.
  - Reason: Wizard should not import server generator.
  - Result: Preview card uses same template tokens conceptually.
  - Next: Test wizard step.

- [ ] **Step 32: Add wizard step structure test**
  - Goal: Assert `صورة البوست` step appears before review and payload remains unchanged.
  - Files: create `scripts/order-post-image-stage.test.ts`.
  - Reason: Prevent accidental payload/input additions.
  - Result: Test fails until wizard changes.
  - Next: Update wizard steps.

- [ ] **Step 33: Insert public wizard step**
  - Goal: Add `postImage` step before `review`.
  - Files: modify `components/OrderForm.tsx`.
  - Reason: Required new stage.
  - Result: Progress/tabs include 10 steps.
  - Next: Render preview step.

- [ ] **Step 34: Render public post-image preview step**
  - Goal: Show big non-clickable preview card using current form data.
  - Files: modify `components/OrderForm.tsx`.
  - Reason: Customer sees final concept before review.
  - Result: Preview stage has no inputs/actions except existing navigation.
  - Next: Update review summary step indexes.

- [ ] **Step 35: Update wizard navigation indexes**
  - Goal: Ensure review summary buttons still go to correct steps.
  - Files: modify `components/OrderForm.tsx`.
  - Reason: New step shifts indexes.
  - Result: Summary edit buttons target correct stages.
  - Next: Add preview styles.

- [ ] **Step 36: Add public preview styles**
  - Goal: Style 4:5 card preview responsively.
  - Files: modify `app/globals.css`.
  - Reason: Match reference and fit mobile/desktop.
  - Result: Preview is polished and non-overlapping.
  - Next: Run wizard test.

- [ ] **Step 37: Run wizard test and confirm GREEN**
  - Goal: Verify step exists and no payload expansion.
  - Files: none.
  - Reason: Protect public form behavior.
  - Result: Wizard test passes.
  - Next: Add admin/client share use.

- [ ] **Step 38: Use post image for SEO Open Graph**
  - Goal: Prefer generated post image for OG/Twitter image.
  - Files: modify `lib/invitation-seo.ts`.
  - Reason: Future official usage.
  - Result: Falls back to hero image if missing or not generated.
  - Next: Add client share panel.

- [ ] **Step 39: Add client share post image section**
  - Goal: Show/download/copy post image in client share tab when generated.
  - Files: modify `components/ClientDashboardShell.tsx`; optionally `components/ClientShareTools.tsx`.
  - Reason: Future client usage without admin dependency.
  - Result: Client can access official post image where available.
  - Next: Add CSS if needed.

- [ ] **Step 40: Style client post image share controls**
  - Goal: Keep share UI compact.
  - Files: modify `app/globals.css`.
  - Reason: Avoid visual clutter in dashboard.
  - Result: Responsive client share section.
  - Next: Update media cleanup.

- [ ] **Step 41: Add post fields to media cleanup references**
  - Goal: Prevent generated post image from being marked orphan.
  - Files: modify `lib/media-cleanup.ts`.
  - Reason: Cleanup reads selected DB fields explicitly.
  - Result: Post images are recognized as used.
  - Next: Update hard delete.

- [ ] **Step 42: Add post image to hard delete media collection**
  - Goal: Delete post image when invitation is hard deleted and unreferenced.
  - Files: modify `lib/invitation-deletion.ts`.
  - Reason: Required deletion behavior.
  - Result: Hard delete collects postImageUrl.
  - Next: Update audit script.

- [ ] **Step 43: Update safe cleanup audit selects**
  - Goal: Include post-image fields in operational media reference audit.
  - Files: modify `scripts/safe-cleanup-audit.mjs`.
  - Reason: Keep audit report accurate.
  - Result: Audit detects post image references.
  - Next: Add schema/type verification.

- [ ] **Step 44: Verify backup compatibility**
  - Goal: Ensure no restore table-order change is needed.
  - Files: inspect `lib/backups.ts`, `lib/backups-v2.ts`.
  - Reason: Nullable columns on existing `Invitation` are automatically included.
  - Result: No new table updates needed.
  - Next: Add API copy/download details.

- [ ] **Step 45: Add download-safe response metadata**
  - Goal: Ensure admin download link uses proper filename.
  - Files: `components/PostImageAdminPanel.tsx`, `app/api/admin/invitations/[code]/post-image/route.ts`.
  - Reason: “تحميل الصورة الأصلية” should be clear.
  - Result: Download filename includes invitation code.
  - Next: Add manual regenerate status handling.

- [ ] **Step 46: Implement generating state**
  - Goal: Set status `GENERATING` before manual/server regeneration.
  - Files: `lib/post-image/service.ts`.
  - Reason: Admin status should be accurate.
  - Result: Status transitions are Generated/Needs Regeneration/Generating/Failed.
  - Next: Update panel labels.

- [ ] **Step 47: Add status label mapping**
  - Goal: Display required English statuses exactly.
  - Files: `components/PostImageAdminPanel.tsx`.
  - Reason: User requested labels Generated/Needs Regeneration/Generating/Failed.
  - Result: Admin status text matches requirement.
  - Next: Add QR persistence decision.

- [ ] **Step 48: Generate QR inside post image service**
  - Goal: Create real QR from final public URL for the image.
  - Files: `lib/post-image/generator.ts`.
  - Reason: Required final sequence.
  - Result: QR is rendered into post image; no separate QR file required unless existing `qrCodeUrl` is intentionally populated.
  - Next: Consider `qrCodeUrl`.

- [ ] **Step 49: Populate invitation qrCodeUrl opportunistically**
  - Goal: Save QR data URL or leave existing field untouched based on storage choice.
  - Files: `lib/post-image/service.ts`.
  - Reason: Existing model has `qrCodeUrl`; final QR can be recorded without new storage.
  - Result: QR availability improves without blocking post image.
  - Next: Verify size impact.

- [ ] **Step 50: Keep QR storage non-blocking**
  - Goal: If QR persistence fails, still generate post image.
  - Files: `lib/post-image/service.ts`.
  - Reason: Main requirement is no publish failure.
  - Result: QR errors logged in postImageError if relevant.
  - Next: Polish visual output.

- [ ] **Step 51: Generate a local sample post image**
  - Goal: Create a sample PNG from fixture data for visual inspection.
  - Files: use temporary output under `/private/tmp` or `/tmp`.
  - Reason: Verify renderer has nonblank output.
  - Result: Sample image exists for inspection.
  - Next: Inspect image.

- [ ] **Step 52: Inspect sample image visually**
  - Goal: Check Arabic text, photo crop, QR, spacing, 4:5 dimensions.
  - Files: none.
  - Reason: Visual quality matters.
  - Result: Notes for adjustments.
  - Next: Adjust renderer if needed.

- [ ] **Step 53: Adjust renderer geometry**
  - Goal: Fix any layout issues from sample.
  - Files: `lib/post-image/templates/news-card.ts`, `lib/post-image/render-svg.ts`.
  - Reason: Match reference better.
  - Result: Professional first template.
  - Next: Regenerate sample.

- [ ] **Step 54: Regenerate and re-inspect sample**
  - Goal: Confirm visual fixes.
  - Files: temp output only.
  - Reason: Avoid shipping broken layout.
  - Result: Sample accepted.
  - Next: Run unit tests.

- [ ] **Step 55: Run post-image tests**
  - Goal: Verify signature/renderer/service tests.
  - Files: none.
  - Reason: Feature-level correctness.
  - Result: Tests pass.
  - Next: Run typecheck.

- [ ] **Step 56: Run TypeScript check**
  - Goal: Catch type errors.
  - Files: none.
  - Reason: Schema/type changes are broad.
  - Result: `npm run check` passes or issues are fixed.
  - Next: Run build.

- [ ] **Step 57: Run production build**
  - Goal: Confirm Next build succeeds.
  - Files: none.
  - Reason: Avoid runtime bundle and route errors.
  - Result: `npm run build` passes.
  - Next: Optional dev server.

- [ ] **Step 58: Start local dev server**
  - Goal: Manually test pages in browser.
  - Files: none.
  - Reason: UI integration needs runtime check.
  - Result: Local URL available.
  - Next: Browser test public wizard.

- [ ] **Step 59: Browser-test public order wizard desktop**
  - Goal: Confirm new step renders before review.
  - Files: none.
  - Reason: Catch layout and navigation issues.
  - Result: Desktop preview is visible and non-clickable.
  - Next: Browser-test mobile.

- [ ] **Step 60: Browser-test public order wizard mobile**
  - Goal: Confirm no text overflow/overlap.
  - Files: none.
  - Reason: Wizard is customer-facing.
  - Result: Mobile preview fits.
  - Next: Browser-test admin details.

- [ ] **Step 61: Browser-test admin details post image section**
  - Goal: Verify preview/download/copy/regenerate/status.
  - Files: none.
  - Reason: Admin workflow is core.
  - Result: Section works and degrades gracefully.
  - Next: Test publish flow.

- [ ] **Step 62: Test publish flow**
  - Goal: Publish an order or use seeded data to trigger generation.
  - Files: none.
  - Reason: Final sequence must work.
  - Result: Invitation has generated post image.
  - Next: Test failure path.

- [ ] **Step 63: Test generation failure path**
  - Goal: Simulate missing image/invalid storage and verify publish still succeeds.
  - Files: none.
  - Reason: Non-fatal requirement.
  - Result: Status becomes Failed and invitation remains created.
  - Next: Test client edit.

- [ ] **Step 64: Test client edit regeneration**
  - Goal: Change name/date/gallery and confirm regeneration/needs-regeneration.
  - Files: none.
  - Reason: Automatic refresh requirement.
  - Result: Signature changes and asset updates.
  - Next: Test unchanged edit.

- [ ] **Step 65: Test unchanged edit skip**
  - Goal: Save unrelated data and confirm no regeneration.
  - Files: none.
  - Reason: Performance requirement.
  - Result: Signature unchanged and image file not replaced.
  - Next: Test deletion.

- [ ] **Step 66: Test hard delete cleanup logic**
  - Goal: Ensure post image URL is collected for deletion.
  - Files: none or targeted script inspection.
  - Reason: Required delete behavior.
  - Result: Post image is deleted if unused.
  - Next: Test media cleanup.

- [ ] **Step 67: Test media cleanup references**
  - Goal: Ensure generated post image is reported as used.
  - Files: none.
  - Reason: Prevent accidental cleanup.
  - Result: Media report includes Invitation source.
  - Next: Test backup inclusion.

- [ ] **Step 68: Test backup inclusion**
  - Goal: Confirm post image file appears in upload snapshot and fields in DB snapshot.
  - Files: none.
  - Reason: Backup/restore requirement.
  - Result: Backup payload includes URL and upload file.
  - Next: Review code.

- [ ] **Step 69: Review all changed files**
  - Goal: Check for stray imports, client/server boundary issues, over-broad edits.
  - Files: all modified files.
  - Reason: Keep implementation tight.
  - Result: Clean diff.
  - Next: Fix issues.

- [ ] **Step 70: Fix review issues**
  - Goal: Address anything found in Step 69.
  - Files: as needed.
  - Reason: Quality pass.
  - Result: Diff is ready for final verification.
  - Next: Re-run tests.

- [ ] **Step 71: Re-run focused tests**
  - Goal: Ensure fixes did not regress.
  - Files: none.
  - Reason: Verification after changes.
  - Result: Focused tests pass.
  - Next: Re-run build.

- [ ] **Step 72: Re-run build**
  - Goal: Final build evidence.
  - Files: none.
  - Reason: Final confidence.
  - Result: Build passes.
  - Next: Capture final status.

- [ ] **Step 73: Capture final changed-file summary**
  - Goal: Summarize changed files and behavior.
  - Files: none.
  - Reason: User asked final review.
  - Result: Clear final report.
  - Next: Final response.

- [ ] **Step 74: Final response**
  - Goal: Tell user what was implemented and verified.
  - Files: none.
  - Reason: Close the work cleanly.
  - Result: User receives concise completion report and any remaining risks.
  - Next: None.
