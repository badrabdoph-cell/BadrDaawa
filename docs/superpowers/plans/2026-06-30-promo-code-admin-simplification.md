# Promo Code Admin Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a simple, Arabic-first promo code admin experience where creating, copying, testing, and analyzing a promo code is obvious in one screen.

**Architecture:** Keep the existing `Partner` + `PartnerPromoCode` database model. Add a dedicated `/admin/promo-codes` page as the main UX surface, while leaving `/admin/partners` available for deeper partner management. Reuse the existing public `/r/[slug]` short-link route and existing validation engine.

**Tech Stack:** Next.js App Router, React Server Components, Server Actions, Prisma, existing CSS in `app/globals.css`, lucide-react icons, `qrcode`.

## Global Constraints

- UI copy must be Arabic and non-technical.
- Generated promo links must stay short, using `/r/CODE`.
- Promo logo upload remains optional; fallback remains the published site logo.
- Existing partner promo links must keep working.
- Do not introduce a new database dependency unless required.
- Test behavior with small script tests plus `npm run check` and `npm run build`.

---

### Task 1: Promo Admin URL Helpers And Tests

**Files:**
- Modify: `lib/partner-promo.ts`
- Test: `scripts/partner-promo-engine.test.ts`
- Create: `scripts/promo-admin-layout.test.ts`

**Interfaces:**
- Consumes: `buildShortReferralUrl(siteUrl, slug)`
- Produces: stable checks that `/admin/promo-codes` exists and partner pages no longer present fake tabs.

- [ ] Add layout assertions that dedicated promo admin files exist.
- [ ] Run: `node --import tsx scripts/promo-admin-layout.test.ts`
- [ ] Expected first run: fails until the page exists.

### Task 2: Dedicated Promo Codes Page

**Files:**
- Create: `app/admin/promo-codes/page.tsx`
- Modify: `components/DashboardShell.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Page reads `PartnerPromoCode` with partner, usage logs, and short-link visits.
- Page displays: quick create form, metrics, simplified table, latest activity.

- [ ] Create a page header: `أكواد البرومو`.
- [ ] Add a primary action area: quick form on the right and “آخر كود تم إنشاؤه”/empty hint on the left.
- [ ] Add metrics: total active codes, link visits, promo uses, conversion rate.
- [ ] Add sidebar navigation link labeled `أكواد البرومو`.
- [ ] Run layout test and TypeScript check.

### Task 3: Quick Create Server Action

**Files:**
- Create: `app/admin/promo-codes/actions.ts`
- Modify: `app/admin/promo-codes/page.tsx`
- Modify: `app/admin/partners/actions.ts` only if reusable helpers need exporting.

**Interfaces:**
- Produces: `createQuickPromoCodeAction(formData: FormData)`.
- Redirects to `/admin/promo-codes?created=<promoId>`.

- [ ] Accept `displayName`, `promoCode`, `logoFile`, `discountType`, `discountValue`, `showPartnerCard`.
- [ ] Generate partner, promo code, `/r/CODE`, QR, subscription, activity log, audit log.
- [ ] Validate: partner name min length 2, unique promo code, discount value only required for percentage/fixed.
- [ ] On success, redirect back to promo codes page with created id.

### Task 4: Success Result And Copy Actions

**Files:**
- Create: `components/AdminPromoCopyPanel.tsx`
- Modify: `app/admin/promo-codes/page.tsx`
- Modify: `components/CopyButton.tsx` if needed for better feedback.

**Interfaces:**
- Consumes: `code`, `shortUrl`, `qrCodeUrl`, `partnerName`, `discountLabel`.
- Produces: clear copy buttons for code, link, QR, and ready message.

- [ ] Show a success panel after creation.
- [ ] Include buttons: `نسخ الكود`, `نسخ الرابط`, `نسخ رسالة جاهزة`, `فتح الرابط`, `تحميل QR`.
- [ ] Message format: partner name + promo code + short link.

### Task 5: Simplify Existing Partner Center

**Files:**
- Modify: `app/admin/partners/page.tsx`
- Modify: `app/admin/partners/[id]/page.tsx`
- Modify: `app/admin/partners/new/page.tsx`
- Modify: `app/admin/partners/[id]/edit/page.tsx`

**Interfaces:**
- Partners center remains for partner management.
- Promo code admin becomes the primary route for promo work.

- [ ] Remove fake tabs or make the promo tab link to `/admin/promo-codes`.
- [ ] Replace crowded row actions with: `عرض`, `تعديل`, `إدارة البرومو`.
- [ ] Remove disabled `توليد برومو جديد` unless implemented.
- [ ] Point “بروموكود والخصم” helpers to the dedicated promo page.

### Task 6: Verification

**Files:**
- Test: `scripts/promo-admin-layout.test.ts`
- Existing tests: `scripts/partner-promo-engine.test.ts`, `scripts/public-site-url.test.ts`, `scripts/order-form-layout.test.ts`

- [ ] Run: `node --import tsx scripts/promo-admin-layout.test.ts`
- [ ] Run: `node --import tsx scripts/partner-promo-engine.test.ts`
- [ ] Run: `node --import tsx scripts/public-site-url.test.ts`
- [ ] Run: `node --import tsx scripts/order-form-layout.test.ts`
- [ ] Run: `npm run check`
- [ ] Run: `npm run build`

---

## Self-Review

- Spec coverage: The plan creates a dedicated promo admin, quick create, copy result, simplified list, analytics, and removes confusing partner-page elements.
- Placeholder scan: No task depends on unspecified files or future database work.
- Type consistency: New action name is `createQuickPromoCodeAction`; route is `/admin/promo-codes`; short-link helpers stay in `lib/partner-promo.ts`.
