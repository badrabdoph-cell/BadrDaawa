# Promo Code Section Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild promo-code administration as a clear standalone admin section, fix short-link generation from the root, and expose actionable usage/order history per code.

**Architecture:** Keep partner referral promo codes and discount-only promo codes as separate admin surfaces. Use shared URL helpers for safe public links, server actions for code lifecycle changes, and focused server pages for summary, lists, details, and history.

**Tech Stack:** Next.js App Router, React Server Components, Server Actions, Prisma, TypeScript, CSS in `app/globals.css`, local script tests with `node --import tsx`.

## Global Constraints

- Arabic-first admin copy.
- Generated promo links must be short and stable: `/r/CODE`.
- Public share URLs must never use localhost, internal Railway hosts, or unresolved template placeholders.
- Photographer/partner promo codes and discount-only promo codes must be separated in the admin UI.
- Every promo code row must expose copy code, copy link, open link, and manage actions.
- Every promo detail page must show related usage, orders, and published invitation access when available.
- Lifecycle actions must support pause, activate, archive/delete, and restore where safe.

---

### Task 1: Root Link Safety

**Files:**
- Modify: `lib/utils.ts`
- Modify: `scripts/public-site-url.test.ts`
- Test: `scripts/public-site-url.test.ts`

**Interfaces:**
- Consumes: `getShareableSiteUrl(headers?: Headers, fallbackOrigin?: string)`
- Produces: safe public base URL selection that rejects unresolved placeholders and localhost for share links.

- [ ] **Step 1: Write failing tests**
  Add assertions that `NEXT_PUBLIC_SITE_URL="https://${{RAILWAY_PUBLIC_DOMAIN}}"` is ignored and that request headers or default domain produce `https://daawa.up.railway.app`.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --import tsx scripts/public-site-url.test.ts`

- [ ] **Step 3: Implement safe URL rejection**
  Update URL normalization to reject strings containing `${`, `}}`, `railway.internal`, `0.0.0.0`, or malformed hosts before share links are built.

- [ ] **Step 4: Run URL and promo route tests**
  Run: `node --import tsx scripts/public-site-url.test.ts`

### Task 2: Promo Admin Structure Tests

**Files:**
- Modify: `scripts/promo-admin-layout.test.ts`
- Test: `scripts/promo-admin-layout.test.ts`

**Interfaces:**
- Produces structural expectations for:
  - `app/admin/promo-codes/page.tsx`
  - `app/admin/promo-codes/partners/page.tsx`
  - `app/admin/promo-codes/discounts/page.tsx`
  - `app/admin/promo-codes/history/page.tsx`
  - `app/admin/promo-codes/[id]/page.tsx`
  - `app/admin/promo-codes/actions.ts`

- [ ] **Step 1: Write failing structure tests**
  Assert the new subpages exist, the dashboard shell links to the main section, and fake partner tabs are absent.

- [ ] **Step 2: Run test to verify it fails**
  Run: `node --import tsx scripts/promo-admin-layout.test.ts`

### Task 3: Promo Section Pages

**Files:**
- Create: `components/AdminPromoSectionNav.tsx`
- Create: `app/admin/promo-codes/partners/page.tsx`
- Create: `app/admin/promo-codes/discounts/page.tsx`
- Create: `app/admin/promo-codes/history/page.tsx`
- Modify: `app/admin/promo-codes/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: Prisma partner promo and discount promo models.
- Produces: clear admin pages with Arabic navigation and focused task areas.

- [ ] **Step 1: Build a shared subnav**
  Links: overview, photographer/partner promo codes, discount codes, history.

- [ ] **Step 2: Rework overview page**
  Make it a gateway dashboard with quick actions and summary cards, not an overloaded table.

- [ ] **Step 3: Build partner promo list**
  Show code, partner, short link, visits, orders, conversion, status, and actions.

- [ ] **Step 4: Build discount code list**
  Show independent discount code records from `DiscountPromoCode`, with clear status and usage.

- [ ] **Step 5: Build unified history**
  Show recent created/visited/applied/paused/activated/archived events.

### Task 4: Promo Lifecycle Management

**Files:**
- Modify: `app/admin/promo-codes/actions.ts`
- Create: `app/admin/promo-codes/[id]/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Produces server actions:
  - `updatePartnerPromoStatusAction(formData)`
  - `softDeletePartnerPromoAction(formData)`
  - `restorePartnerPromoAction(formData)`

- [ ] **Step 1: Write detail page**
  Detail page shows code, link, QR/copy actions, current status, partner, visits, uses, orders, and activity.

- [ ] **Step 2: Add lifecycle forms**
  Provide buttons for pause, activate, archive/delete, and restore.

- [ ] **Step 3: Log every lifecycle action**
  Write `PartnerActivityLog` and `AuditLog` entries for each admin action.

### Task 5: Orders and Invitation Access

**Files:**
- Modify: `app/admin/promo-codes/[id]/page.tsx`

**Interfaces:**
- Consumes: `OrderRequest` rows by `partnerPromoId`.
- Produces: table showing customer/order status, published invitation code, and direct admin/public links where available.

- [ ] **Step 1: Query related orders**
  Include latest orders where `partnerPromoId` equals the promo id.

- [ ] **Step 2: Render clear action links**
  Link to `/admin/orders`, public invitation `/${publishedInvitationCode}`, and partner page when available.

### Task 6: Verification

**Files:**
- Test: `scripts/promo-admin-layout.test.ts`
- Test: `scripts/public-site-url.test.ts`
- Test: `scripts/partner-promo-engine.test.ts`
- Test: `scripts/order-form-layout.test.ts`

- [ ] **Step 1: Run focused tests**
  Run all four script tests.

- [ ] **Step 2: Run type check**
  Run: `npm run check`

- [ ] **Step 3: Run production build**
  Run: `npm run build`

- [ ] **Step 4: Browser smoke test**
  Open `/admin/promo-codes`, `/admin/promo-codes/partners`, `/admin/promo-codes/history`, and a sample `/r/BADR` route locally when server access is available.
