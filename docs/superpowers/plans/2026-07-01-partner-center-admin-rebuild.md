# Partner Center Admin Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the admin “مركز الشركاء” into a scalable, Arabic-first partner operations center with separated pages for dashboard, partners, creation, details, discounts, and activity while preserving all current data and routes.

**Architecture:** Keep the existing Prisma schema and APIs intact. Reorganize App Router pages around one task per page: `/admin/partners` as dashboard-only, `/admin/partners/directory` as partner cards, `/admin/partners/new` for creation, `/admin/partners/[id]` as tabbed partner workspace, `/admin/promo-codes/discounts` for standalone discounts, and `/admin/partners/activity` for unified operations. Preserve existing partner/promo actions and extend them only with return paths and partner-message sending.

**Tech Stack:** Next.js App Router, React Server Components, Server Actions, Prisma, lucide-react, existing admin dark/gold CSS system, script tests with `node --import tsx`.

## Global Constraints

- Do not delete partner, promo, order, invitation, discount, message, backup, or analytics data.
- Do not remove existing routes; old paths must remain valid.
- Do not change backup/restore behavior.
- Keep the current admin visual identity: dark theme, gold accents, compact operational UI.
- Partner cards must hide secondary actions behind a three-dot menu.
- Dashboard page must not include creation forms, data tables, or dense logs.
- Partner detail page must use tabs: Overview, الدعوات, الإحصائيات, الرسائل, النشاط.
- The system must support future partner types without redesign: photographers, halls, planners, DJs, decorators, makeup artists, and others.

---

### Task 1: Map and Protect Existing Behavior

**Files:**
- Test: `scripts/partner-center-rebuild.test.ts`
- Read-only context: `prisma/schema.prisma`, `app/admin/partners/actions.ts`, `app/api/orders/route.ts`

**Interfaces:**
- Consumes existing models: `Partner`, `PartnerPromoCode`, `DiscountPromoCode`, `OrderRequest`, `PartnerUsageLog`, `PartnerActivityLog`, `PartnerMessage`, `ClientMessage`.
- Produces structural regression tests for the new information architecture.

- [ ] **Step 1: Write failing test**
  Assert that:
  - `components/DashboardShell.tsx` has an independent `partners` section.
  - `/admin/partners` does not include `admin-table-toolbar`, `<table`, or `partner-editor-form`.
  - `/admin/partners/directory/page.tsx` exists and contains partner cards.
  - `/admin/partners/[id]/page.tsx` contains all required tab labels.
  - `/admin/partners/activity/page.tsx` exists.

- [ ] **Step 2: Run test and confirm failure**
  Run: `node --import tsx scripts/partner-center-rebuild.test.ts`

### Task 2: Sidebar and Section Navigation

**Files:**
- Modify: `components/DashboardShell.tsx`
- Create: `components/AdminPartnerCenterNav.tsx`

**Interfaces:**
- Produces independent sidebar section “مركز الشركاء”.
- Produces internal nav links: لوحة التحكم, الشركاء, إنشاء شريك, أكواد الخصم, سجل العمليات.

- [ ] **Step 1: Move partner links**
  Remove partner/promo links from “جهات الاتصال” and place them under the new top-level partners section.

- [ ] **Step 2: Add internal section nav**
  Use active route highlighting and links to existing pages.

### Task 3: Partner Dashboard Page

**Files:**
- Modify: `app/admin/partners/page.tsx`

**Interfaces:**
- Consumes aggregated counts from partners, promo codes, orders, usage logs, activity logs.
- Produces dashboard-only page with stat cards, top partner, last activity, last partner orders.

- [ ] **Step 1: Remove mixed UI**
  No form, no table, no creation controls inside dashboard body.

- [ ] **Step 2: Add operational summary**
  Cards for partners, active/paused, total invitations/orders, uses, visits, conversion, top partner, and latest partner-created invitations.

### Task 4: Partner Cards Directory

**Files:**
- Create: `app/admin/partners/directory/page.tsx`
- Create: `components/PartnerCardActions.tsx`
- Modify: `app/admin/partners/actions.ts`

**Interfaces:**
- Consumes partner list with primary promo code, order count, usage count, activity.
- Produces card-based list with visible essentials and three-dot action menu.
- Extends `updatePartnerStatusAction` with optional `returnTo`.

- [ ] **Step 1: Build card list**
  Show image, name, code, status, invitations/orders, usage, visits, conversion, latest activity.

- [ ] **Step 2: Build actions menu**
  Include: عرض, تعديل, نسخ البروموكود, نسخ الرابط, تنزيل QR, تعطيل, تفعيل, حذف/أرشفة, إرسال رسالة.

### Task 5: Partner Creation Page

**Files:**
- Modify: `app/admin/partners/new/page.tsx`
- Create: `components/PartnerPromoPreviewFields.tsx`

**Interfaces:**
- Consumes existing `createPartnerAction`.
- Produces standalone creation form with QR preview and short link preview.

- [ ] **Step 1: Add QR/short-link preview**
  Keep existing fields and add live preview for `/r/CODE`.

### Task 6: Tabbed Partner Details

**Files:**
- Modify: `app/admin/partners/[id]/page.tsx`
- Modify: `app/admin/partners/actions.ts`

**Interfaces:**
- Consumes partner, promo codes, orders, usage logs, messages, activity.
- Produces tabs: Overview, الدعوات, الإحصائيات, الرسائل, النشاط.
- Adds `createPartnerMessageAction(formData)` that records `PartnerMessage` and creates visible `ClientMessage` rows for related invitation codes.

- [ ] **Step 1: Add tab navigation**
  Use `?tab=overview|invitations|stats|messages|activity`.

- [ ] **Step 2: Split content**
  Render one focused content area per tab.

- [ ] **Step 3: Add partner message form**
  Support durations: دائم, 24 ساعة, 3 أيام, أسبوع, شهر.

### Task 7: Unified Activity

**Files:**
- Create: `app/admin/partners/activity/page.tsx`

**Interfaces:**
- Consumes `PartnerActivityLog` and related partner information.
- Produces searchable/filterable operations timeline with export-ready structure.

### Task 8: Styling and Verification

**Files:**
- Modify: `app/globals.css`
- Test: `scripts/partner-center-rebuild.test.ts`
- Existing tests: `scripts/promo-admin-layout.test.ts`, `scripts/partner-promo-engine.test.ts`, `scripts/public-site-url.test.ts`, `scripts/order-form-layout.test.ts`, `scripts/short-link-route.test.ts`

- [ ] **Step 1: Add partner center CSS**
  Cards, action menu, dashboard bands, tabs, timeline, and responsive behavior.

- [ ] **Step 2: Run focused tests**
  Run all script tests.

- [ ] **Step 3: Run type check**
  Run: `npm run check`

- [ ] **Step 4: Run production build**
  Run: `npm run build`
