# Partner & Promo Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a generic Partner & Promo Center that starts with photographer promo workflows but is ready for future partner types, discount codes, messages, logs, snapshots, and runtime backup.

**Architecture:** Add generic Partner, Promo, Discount, Subscription, Message, Usage, Activity, File, Tag, and Snapshot models in Prisma. Keep the existing order and invitation journey intact by attaching partner/promo references and immutable JSON snapshots to current `OrderRequest` and `Invitation` records. Implement promo validation as a small service used by the public form, order API, and admin UI.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript strict, Prisma 5, PostgreSQL, Zod, lucide-react, existing admin CSS/components.

## Global Constraints

- No model named `Photographer`; photographer is only a `PartnerType`.
- `PromoCode` is independent and one Partner can own many promo codes.
- `DiscountPromo` is independent from Partner.
- Runtime data lives in PostgreSQL backups and must not become project content.
- Use soft delete, archive, pause, and restore instead of hard delete for used operational records.
- Do not change the current phone design, desktop design, order journey, invitation system, approval system, backup system, or shared components without need.
- Published invitation snapshots must not change after publish.

---

### Task 1: Data Model Foundation

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260630150000_partner_promo_center/migration.sql`
- Test: `scripts/partner-promo-engine.test.ts`

**Interfaces:**
- Produces: Prisma models `Partner`, `PartnerPromoCode`, `DiscountPromoCode`, `PartnerUsageLog`, `PartnerActivityLog`, `PartnerMessage`, `PartnerSubscription`, `PartnerFile`, `PartnerTag`, `PartnerTagAssignment`.
- Produces: `OrderRequest.partnerId`, `OrderRequest.partnerPromoId`, `OrderRequest.discountPromoId`, `OrderRequest.partnerSnapshot`, `OrderRequest.discountSnapshot`, `OrderRequest.partnerAppliedAt`, `OrderRequest.referralSource`.
- Produces: `Invitation.partnerSnapshot`, `Invitation.promoSnapshot`, `Invitation.partnerPublishedAt`.

- [ ] Add the Prisma models and indexes with UUID defaults and restrictive relations.
- [ ] Add nullable integration fields to `OrderRequest` and `Invitation`.
- [ ] Add a SQL migration for PostgreSQL.
- [ ] Run Prisma generate.

### Task 2: Promo Engine

**Files:**
- Create: `lib/partner-promo.ts`
- Modify: `lib/validation.ts`
- Test: `scripts/partner-promo-engine.test.ts`

**Interfaces:**
- Produces: `normalizePromoCode(value: string): string`
- Produces: `validatePartnerPromoCode(code: string, context?: PartnerPromoValidationContext): Promise<PartnerPromoValidationResult>`
- Produces: `recordPartnerPromoOrderApplication(input: PartnerPromoOrderApplicationInput): Promise<void>`

- [ ] Write tests for normalization and validation result shaping.
- [ ] Verify tests fail because the engine does not exist.
- [ ] Implement code normalization, public snapshot mapping, discount message mapping, and DB validation.
- [ ] Run tests until green.

### Task 3: Public Order Form Integration

**Files:**
- Modify: `components/OrderForm.tsx`
- Modify: `app/order/page.tsx`
- Modify: `app/api/orders/route.ts`
- Create: `app/api/promo/validate/route.ts`

**Interfaces:**
- Consumes: `validatePartnerPromoCode`
- Consumes: `recordPartnerPromoOrderApplication`
- Produces: public form fields `appliedPromoCode`, `partnerPromoId`, `discountPromoId`, `referralSource`.

- [ ] Add a promo card before final submission in the existing partner step/review flow.
- [ ] Auto-apply `/order?promo=CODE` and preserve it in draft storage/URL.
- [ ] Lock photographer fields after a partner promo is applied and provide “remove promo”.
- [ ] On order creation, validate again inside a Prisma transaction, increment usage only after order creation, write usage/activity logs, and save snapshots.

### Task 4: Admin Center MVP

**Files:**
- Modify: `components/DashboardShell.tsx`
- Create: `app/admin/partners/page.tsx`
- Create: `app/admin/partners/new/page.tsx`
- Create: `app/admin/partners/[id]/page.tsx`
- Create: `app/admin/partners/actions.ts`

**Interfaces:**
- Consumes: Prisma partner models.
- Produces: admin create/edit/pause/archive/restore flows.

- [ ] Add sidebar entry “Partner & Promo Center”.
- [ ] Build dashboard statistics, tabs, partner table, search, filters, and empty states.
- [ ] Build new partner page that creates a partner, subscription, default promo, referral slug, and activity/audit rows.
- [ ] Build partner details dashboard with quick actions, promo list, timeline, and related orders.

### Task 5: Discount And Messages Foundation

**Files:**
- Create: `app/admin/partners/discounts/page.tsx`
- Create: `app/admin/partners/messages/page.tsx`
- Create: `lib/partner-messages.ts`

**Interfaces:**
- Consumes: `DiscountPromoCode`, `PartnerMessage`.
- Produces: basic admin management for discount codes and partner/global messages.

- [ ] Add discount table/create flow and validation-ready model support.
- [ ] Add partner/global message table/create flow with schedule, expiry, pinned, dismissible, and target.
- [ ] Prepare recipient rows for specific invitations.

### Task 6: Verification

**Files:**
- Modify as needed from previous tasks.

- [ ] Run `npx prisma generate`.
- [ ] Run `npx tsx scripts/partner-promo-engine.test.ts`.
- [ ] Run `npm run check`.
- [ ] Run `npm run build`.
- [ ] Review regression risk for orders, invitations, backups, and GitHub sync.
