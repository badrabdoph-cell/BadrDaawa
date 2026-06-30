# Partner And Discount Centers Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** فصل مركز الشركاء عن مركز أكواد الخصم، وتحويل الشركاء إلى تجربة CRM قابلة للتوسع بدون حذف بيانات أو كسر routes قائمة.

**Architecture:** الشركاء يبقون على `Partner` و`PartnerPromoCode` لأن البروموكود جزء من هوية الشريك التشغيلية، بينما الخصومات العامة تبقى على `DiscountPromoCode`. القائمة الجانبية والتنقل الداخلي يفصلان المسارين، مع إبقاء routes القديمة مثل `/admin/promo-codes` و`/admin/promo-codes/partners` للتوافق.

**Tech Stack:** Next.js App Router, Server Components, Prisma, TypeScript, CSS في `app/globals.css`, route handlers للتصدير.

## Global Constraints

- لا يتم حذف أي بيانات موجودة.
- لا يتم كسر أي API أو route حالي.
- لا يتم تغيير نظام النسخ الاحتياطي.
- لا يتم تغيير روابط `/r/[slug]` أو `/p/[slug]`.
- أي تغيير UI يحافظ على هوية لوحة الإدارة الداكنة مع الذهبي.
- `Partner.id` هو UUID الداخلي الثابت؛ العلاقات لا تعتمد على الكود النصي.

---

### Task 1: Navigation Separation

**Files:**
- Modify: `components/DashboardShell.tsx`
- Modify: `components/AdminPartnerCenterNav.tsx`
- Create: `components/AdminDiscountCenterNav.tsx`

**Interfaces:**
- Produces `AdminDiscountCenterNav` for all discount-center pages.
- Partner Center links only to `/admin/partners`, `/admin/partners/directory`, `/admin/partners/new`, `/admin/partners/activity`.

- [ ] **Step 1: Write failing test**

Add assertions in `scripts/partner-discount-centers.test.ts` that Partner Center has no `/admin/promo-codes/discounts`, and Discount Center exists as a sidebar section.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx scripts/partner-discount-centers.test.ts`
Expected: FAIL because Discount Center does not exist and Partner Center still links to discounts.

- [ ] **Step 3: Implement navigation split**

Add `discounts` section in `DashboardShell`, remove discounts from Partner Center, create `AdminDiscountCenterNav`.

- [ ] **Step 4: Run test**

Run: `node --import tsx scripts/partner-discount-centers.test.ts`
Expected: PASS.

### Task 2: Partner CRM Directory

**Files:**
- Modify: `app/admin/partners/directory/page.tsx`
- Modify: `components/PartnerCardActions.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Directory renders a `.partner-crm-table`.
- Actions stay inside one menu component.

- [ ] **Step 1: Test CRM table**

Assert directory has table columns: الصورة، الاسم، النوع، البروموكود، نسبة الخصم، الحالة، الدعوات، الطلبات، الزيارات، التحويل، آخر نشاط، الإجراءات.

- [ ] **Step 2: Implement CRM table**

Replace cards with a dense admin table using the existing data query, keep the one action menu.

### Task 3: Partner Wizard Creation

**Files:**
- Modify: `app/admin/partners/new/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Form remains one server action `createPartnerAction`.
- UI groups fields into four wizard steps without changing posted field names.

- [ ] **Step 1: Test wizard labels**

Assert page includes بيانات الشريك، البروموكود، الخصم، المراجعة.

- [ ] **Step 2: Implement wizard layout**

Wrap existing fields into wizard panels and keep all current inputs.

### Task 4: Partner Detail Dashboard Tabs

**Files:**
- Modify: `app/admin/partners/[id]/page.tsx`

**Interfaces:**
- Tabs: نظرة عامة، الدعوات، الطلبات، الرسائل، الإحصائيات، سجل النشاط، الإعدادات.
- Summary stays at page top for all tabs.

- [ ] **Step 1: Test labels**

Assert all tabs and summary fields exist.

- [ ] **Step 2: Implement labels and settings tab**

Rename/add tabs without removing existing data.

### Task 5: Discount Center Pages

**Files:**
- Modify: `app/admin/promo-codes/discounts/page.tsx`
- Create: `app/admin/promo-codes/discounts/new/page.tsx`
- Create: `app/admin/promo-codes/discounts/history/page.tsx`
- Create: `app/admin/promo-codes/discounts/export/route.ts`

**Interfaces:**
- Discount Center uses `DiscountPromoCode` only.
- Export supports CSV immediately; Excel-compatible output is UTF-8 CSV opened by Excel.

- [ ] **Step 1: Test discount isolation**

Assert discount pages do not import `AdminPartnerCenterNav` and do not query `PartnerPromoCode`.

- [ ] **Step 2: Implement nav and export**

Use `AdminDiscountCenterNav`; add CSV export for discount codes and usage summary.

### Task 6: Verification

Run:
- `node --import tsx scripts/partner-discount-centers.test.ts`
- `node --import tsx scripts/partner-center-rebuild.test.ts`
- `node --import tsx scripts/promo-admin-layout.test.ts`
- `node --import tsx scripts/promo-referral-flow.test.ts`
- `node --import tsx scripts/short-link-route.test.ts`
- `npm run check`
- `npm run build`

Expected: all exit 0. If local PostgreSQL is unavailable, build may print Prisma connectivity warning but must exit 0.
