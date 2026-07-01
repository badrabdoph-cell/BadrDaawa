# Unified Discount Codes Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** دمج مركز الشركاء ومركز أكواد الخصم في قسم إداري واحد باسم **أكواد الخصم** بثلاث صفحات فقط: **المصورين**، **كود الخصم**، **السجل**، مع إصلاح إنشاء الأكواد والروابط المختصرة من الجذر.

**Architecture:** يتم الحفاظ على قاعدة البيانات الحالية لأنها تفصل بشكل صحيح بين `PartnerPromoCode` للمصورين والشركاء و`DiscountPromoCode` لأكواد الخصم العامة. إعادة البناء ستكون في طبقة الإدارة وتجربة الاستخدام والتحقق من الكود، مع إبقاء routes القديمة كتحويلات أو aliases حتى لا تنكسر روابط موجودة. صفحة الطلب يجب أن تدعم نوعين من الأكواد: كود مصور يملأ بيانات المصور ويملك رابطًا مختصرًا، وكود خصم عام يطبق خصمًا فقط ولا ينتج رابطًا.

**Tech Stack:** Next.js App Router, Server Components, Prisma, TypeScript, CSS in `app/globals.css`, route handlers, server actions, structural tests under `scripts/`.

## Global Constraints

- لا حذف لأي بيانات حالية.
- لا كسر لأي route حالي؛ routes القديمة تتحول أو تبقى aliases.
- لا كسر لنظام الطلبات أو الدعوات أو النسخ الاحتياطي.
- لا تغيير تخريبي في Prisma schema إلا إذا أثبت التنفيذ ضرورة ذلك.
- واجهة الإدارة تبقى Dark Theme + Gold.
- المصورين والشركاء يستخدمون `Partner` + `PartnerPromoCode`.
- أكواد الخصم العامة تستخدم `DiscountPromoCode` فقط.
- الرابط المختصر للمصورين فقط، بالشكل `/r/BADR`، مع دعم `/p/BADR` كتحويل آمن.
- كود الخصم العام لا يولد رابطًا.

---

## التقرير الحالي

### ملاحظات من الصور

- يوجد قسمان متجاوران في القائمة الجانبية: **مركز الشركاء** و**مركز أكواد الخصم**، وهذا يعاكس المطلوب الحالي ويخلق قرارًا زائدًا للمستخدم.
- داخل **مركز الشركاء** تظهر لوحة تحكم وبطاقات وإحصائيات وتبويبات، بينما المستخدم يريد عملية مباشرة: إنشاء كود مصور، نسخ الكود والرابط، ثم متابعة السجل.
- داخل **مركز أكواد الخصم** تظهر لوحة خصومات مستقلة مع Dashboard وفلاتر وجدول، لكنها تبدو كقسم كامل منفصل، بينما المطلوب أن تكون صفحة فرعية داخل قسم واحد اسمه **أكواد الخصم**.
- النسخ الحالية في الشاشة تستخدم ألفاظًا كثيرة: مركز الشركاء، مركز أكواد الخصم، أكواد البرومو، لوحة الخصومات. هذا يضعف الفهم.
- قسم السجل الحالي مقسم بين سجل شركاء وسجل بروموكود وسجل استخدام خصومات، بينما المطلوب سجل واحد منظم ببطاقتين واضحتين.

### تحليل المشروع الحالي

- `DashboardShell.tsx` يحتوي حاليًا على قسمين مستقلين: `partners` و`discounts`.
- يوجد تنقل قديم باسم `AdminPromoSectionNav` لصفحات `/admin/promo-codes`.
- يوجد تنقل جديد منفصل للشركاء `AdminPartnerCenterNav`.
- يوجد تنقل جديد منفصل للخصومات `AdminDiscountCenterNav`.
- إنشاء كود مصور يتم عبر `createQuickPromoCodeAction()` في `app/admin/promo-codes/actions.ts`.
- إنشاء كود خصم عام يتم عبر `createDiscountPromoCodeAction()` في نفس ملف actions.
- الرابط المختصر `/r/[slug]` يفحص `PartnerPromoCode` فقط، ثم يحفظ الكود في cookie، ثم يحول إلى `/order`.
- `/p/[slug]` يحول إلى `/r/[slug]`.
- صفحة الطلب `app/order/page.tsx` تقرأ cookie البروموكود وتغذي `OrderForm`.
- `OrderForm` يرسل `/api/promo/validate`، وهذا endpoint يتحقق من `PartnerPromoCode` فقط.
- `DiscountPromoCode` موجود في قاعدة البيانات، لكن لا يوجد مسار تطبيق واضح داخل نموذج الطلب يعامله ككود خصم عام مستقل.
- `OrderRequest` يحتوي `partnerPromoId` و`discountPromoId`، لكن إنشاء الطلب الحالي يربط فعليًا كود المصور فقط، ولا يربط كود الخصم العام.

### تشخيص سبب المشاكل

- المشكلة الأولى: الواجهة قسمت المجال إلى أكثر من مركز، ثم أبقت صفحات قديمة تعمل بجانب الصفحات الجديدة. هذا يسبب إحساس أن النظام "مش بيشتغل" لأن نفس المهمة موجودة في أكثر من مكان.
- المشكلة الثانية: أكواد الخصم العامة يتم إنشاؤها إداريًا، لكن تدفق استخدامها في صفحة الطلب غير مكتمل. لذلك كود الخصم قد يكون موجودًا في الجدول لكنه لا يطبق مثل كود المصور.
- المشكلة الثالثة: رسائل الخطأ عند الإنشاء مختصرة جدًا، وتعود كـ query مثل `?error=discount` بدون توضيح الحقل الذي فشل.
- المشكلة الرابعة: إنشاء كود المصور يطلب بيانات ليست كلها في واجهة الإنشاء السريع المطلوبة حاليًا، مثل فيسبوك وإنستجرام، بينما المستخدم يريدها في نفس الصفحة.
- المشكلة الخامسة: اختبار الرابط المختصر الحالي يعتمد على cookie وهذا أفضل من query، لكن لا توجد صفحة فحص إدارية تعرض "الرابط يعمل/لا يعمل" قبل النسخ.
- المشكلة السادسة: إدارة كود المصور موجودة في صفحة detail، لكنها ليست جزءًا واضحًا من سجل واحد موحد كما طلب المستخدم.

## البناء المقترح

### القسم الرئيسي الجديد

القائمة الجانبية تحتوي قسمًا واحدًا فقط:

**أكواد الخصم**

والروابط الفرعية:

- **المصورين**: إنشاء وإدارة أكواد المصورين/القاعات/الشركاء، وتوليد كود + رابط مختصر.
- **كود الخصم**: إنشاء وإدارة أكواد الخصم العامة، وتوليد كود فقط بدون رابط.
- **السجل**: بطاقة أكواد الخصم العامة، ثم بطاقة المصورين/القاعات مع الإجراءات والإحصائيات.

### صفحة المصورين

وظيفتها واحدة: إنشاء كود مصور أو مزود خدمة ومشاهدة الناتج مباشرة.

الحقول:

- اسم المصور/الشريك.
- النوع: مصور، قاعة، منظم حفلات، DJ، ميكب، ديكور، مزود خدمة.
- رفع الشعار.
- Facebook.
- Instagram.
- البروموكود اختياري؛ إذا ترك فارغًا يتم توليده.
- نوع الخصم اختياري: بدون، نسبة، مجاني.
- قيمة الخصم عند اختيار نسبة.

الناتج بعد الإنشاء:

- الكود وحده.
- الرابط المختصر `/r/CODE`.
- زر نسخ الكود.
- زر نسخ الرابط.
- زر اختبار الرابط.
- QR اختياري.

### صفحة كود الخصم

وظيفتها واحدة: إنشاء كود خصم عام بدون رابط.

الحقول:

- اسم الخصم الداخلي.
- نوع الخصم: نسبة أو مجاني 100%.
- قيمة النسبة عند اختيار نسبة.
- الجملة التي تظهر عند تطبيق الكود.
- حد الاستخدام اختياري.
- تاريخ البداية والنهاية اختياريان.
- ملاحظات داخلية اختيارية.

الناتج:

- الكود فقط.
- زر نسخ الكود.
- رسالة نجاح واضحة.
- لا رابط مختصر ولا QR إجباري.

### صفحة السجل

تحتوي على كرتين رئيسيين:

1. **أكواد الخصم**
   - الكود.
   - النسبة أو مجاني.
   - الجملة التي تظهر للعميل.
   - الحالة.
   - الاستخدامات.
   - الإجراءات: نسخ، تعديل، تعطيل، تفعيل، حذف آمن.

2. **المصورين والشركاء**
   - الاسم.
   - الصفة: مصور/قاعة/الخ.
   - الكود.
   - الرابط المختصر.
   - الحالة.
   - الدعوات.
   - الزيارات.
   - التحويل.
   - الإجراءات: عرض السجل، نسخ الكود، نسخ الرابط، اختبار الرابط، تعطيل مؤقت، إعادة تشغيل، حذف آمن.

تفاصيل المصور عند الضغط على "السجل":

- كل الدعوات التي جاءت من الكود.
- الإحصائيات.
- آخر الزيارات.
- آخر الاستخدامات.
- أدوات الإيقاف والتشغيل.

---

## خطة التنفيذ التفصيلية

### Task 1: اختبار الشكل الجديد للقسم الواحد

**Files:**
- Modify: `scripts/promo-unified-center.test.ts`
- Modify: `components/DashboardShell.tsx`
- Delete or stop using: `components/AdminPartnerCenterNav.tsx`
- Delete or stop using: `components/AdminDiscountCenterNav.tsx`
- Keep: `components/AdminPromoSectionNav.tsx`

**Interfaces:**
- Sidebar exposes one section named `أكواد الخصم`.
- Section links only to `/admin/promo-codes/photographers`, `/admin/promo-codes/discounts`, `/admin/promo-codes/history`.

- [ ] **Step 1: Write failing test**

Create `scripts/promo-unified-center.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync("components/DashboardShell.tsx", "utf8");

assert.match(shell, /title:\s*"أكواد الخصم"/);
assert.doesNotMatch(shell, /title:\s*"مركز الشركاء"/);
assert.doesNotMatch(shell, /title:\s*"مركز أكواد الخصم"/);
assert.match(shell, /\/admin\/promo-codes\/photographers/);
assert.match(shell, /\/admin\/promo-codes\/discounts/);
assert.match(shell, /\/admin\/promo-codes\/history/);

console.log("promo-unified-center tests passed");
```

- [ ] **Step 2: Run test and verify fail**

Run:

```bash
node --import tsx scripts/promo-unified-center.test.ts
```

Expected: FAIL because current sidebar still has two sections.

- [ ] **Step 3: Implement sidebar merge**

In `components/DashboardShell.tsx`:

- Remove the `partners` section.
- Remove the `discounts` section.
- Add one section:

```ts
{
  id: "promo-codes",
  title: "أكواد الخصم",
  description: "أكواد المصورين والخصومات والسجل",
  accent: "gold",
  icon: Percent,
  links: [
    { href: "/admin/promo-codes/photographers", label: "المصورين", icon: Camera },
    { href: "/admin/promo-codes/discounts", label: "كود الخصم", icon: Percent },
    { href: "/admin/promo-codes/history", label: "السجل", icon: History },
  ],
}
```

- [ ] **Step 4: Run test**

Run:

```bash
node --import tsx scripts/promo-unified-center.test.ts
```

Expected: PASS.

### Task 2: توحيد التنقل الداخلي

**Files:**
- Modify: `components/AdminPromoSectionNav.tsx`
- Modify: all pages under `app/admin/promo-codes/**`

**Interfaces:**
- Nav labels are exactly: `المصورين`, `كود الخصم`, `السجل`.
- Old `/admin/promo-codes/partners` route remains as redirect/alias to `/admin/promo-codes/photographers`.

- [ ] **Step 1: Write failing test**

Extend `scripts/promo-unified-center.test.ts`:

```ts
const nav = readFileSync("components/AdminPromoSectionNav.tsx", "utf8");
assert.match(nav, /المصورين/);
assert.match(nav, /كود الخصم/);
assert.match(nav, /السجل/);
assert.doesNotMatch(nav, /مركز الشركاء|مركز أكواد الخصم|لوحة الخصومات/);
```

- [ ] **Step 2: Run test**

Run:

```bash
node --import tsx scripts/promo-unified-center.test.ts
```

Expected: FAIL until nav is simplified.

- [ ] **Step 3: Implement nav**

Update `AdminPromoSectionNav` links to:

```ts
const promoLinks = [
  { href: "/admin/promo-codes/photographers", label: "المصورين", icon: Camera },
  { href: "/admin/promo-codes/discounts", label: "كود الخصم", icon: Percent },
  { href: "/admin/promo-codes/history", label: "السجل", icon: History },
];
```

- [ ] **Step 4: Keep old route safe**

Create `app/admin/promo-codes/partners/page.tsx` as a server redirect:

```ts
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function OldPartnerPromoPage() {
  redirect("/admin/promo-codes/photographers");
}
```

- [ ] **Step 5: Run test**

Run:

```bash
node --import tsx scripts/promo-unified-center.test.ts
```

Expected: PASS.

### Task 3: صفحة المصورين الجديدة

**Files:**
- Create: `app/admin/promo-codes/photographers/page.tsx`
- Create: `components/PhotographerPromoForm.tsx`
- Modify: `app/admin/promo-codes/actions.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Uses existing `createQuickPromoCodeAction`.
- Adds form fields: `partnerType`, `facebookUrl`, `instagramUrl`.
- Redirects to `/admin/promo-codes/photographers?created=<promoId>`.

- [ ] **Step 1: Write failing test**

Extend `scripts/promo-unified-center.test.ts`:

```ts
const photographers = readFileSync("app/admin/promo-codes/photographers/page.tsx", "utf8");
assert.match(photographers, /اسم المصور/);
assert.match(photographers, /رفع الشعار/);
assert.match(photographers, /Facebook/);
assert.match(photographers, /Instagram/);
assert.match(photographers, /الرابط المختصر/);
assert.match(photographers, /نسخ الكود/);
assert.match(photographers, /نسخ الرابط/);
```

- [ ] **Step 2: Run test**

Run:

```bash
node --import tsx scripts/promo-unified-center.test.ts
```

Expected: FAIL because page does not exist.

- [ ] **Step 3: Update action**

In `createQuickPromoCodeAction`, read:

```ts
const partnerType = formString(formData, "partnerType") || "PHOTOGRAPHER";
const facebookUrl = formString(formData, "facebookUrl") || null;
const instagramUrl = formString(formData, "instagramUrl") || null;
const returnTo = safeReturnPath(formString(formData, "returnTo"), "/admin/promo-codes/photographers");
```

When creating partner:

```ts
partnerType: partnerType as never,
facebookUrl,
instagramUrl,
```

Redirect:

```ts
redirect(`${returnTo}?created=${created.promoId}`);
```

- [ ] **Step 4: Implement page**

Create page with:

- Header: `المصورين`.
- Compact form.
- Result panel if `created` exists.
- Copy code/link actions.
- Test link action to `/r/CODE`.

- [ ] **Step 5: Run test**

Run:

```bash
node --import tsx scripts/promo-unified-center.test.ts
```

Expected: PASS.

### Task 4: إصلاح كود الخصم العام عبر API موحد فقط

**Files:**
- Create: `lib/promo-code-service.ts`
- Modify: `components/OrderForm.tsx`
- Modify: `app/api/promo/validate/route.ts`
- Modify: `app/api/orders/route.ts`
- Modify: `lib/validation.ts`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/YYYYMMDDHHMMSS_discount_display_message/migration.sql`

**Interfaces:**
- `PromoCodeService.validatePromoCode(rawCode)` searches `PartnerPromoCode` first, then `DiscountPromoCode`.
- `POST /api/promo/validate` is the only validation endpoint.
- Response shape is unified: `{ ok, type, status, promoId, code, discount, partner, message }`.
- `OrderForm` sends only `promoCode`; it does not know if the code is partner or discount.
- General discount saves `discountPromoId` and `discountSnapshot`.
- `DiscountPromoCode.displayMessage` stores the customer-facing message.

- [ ] **Step 1: Write failing test**

Create `scripts/promo-unified-validation-flow.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("lib/promo-code-service.ts", "utf8");
const route = readFileSync("app/api/promo/validate/route.ts", "utf8");
const orderForm = readFileSync("components/OrderForm.tsx", "utf8");
const orderApi = readFileSync("app/api/orders/route.ts", "utf8");
const schema = readFileSync("prisma/schema.prisma", "utf8");

assert.match(service, /class PromoCodeService|export const PromoCodeService/);
assert.match(service, /partnerPromoCode\.findUnique/);
assert.match(service, /discountPromoCode\.findUnique/);
assert.match(route, /PromoCodeService\.validatePromoCode/);
assert.doesNotMatch(orderForm, /api\/discount-promo\/validate/);
assert.match(orderForm, /api\/promo\/validate/);
assert.match(orderApi, /discountPromoId/);
assert.match(orderApi, /DiscountPromoCode/);
assert.match(schema, /displayMessage\s+String\?/);

console.log("promo-unified-validation-flow tests passed");
```

- [ ] **Step 2: Run test**

Run:

```bash
node --import tsx scripts/promo-unified-validation-flow.test.ts
```

Expected: FAIL because discount flow is incomplete.

- [ ] **Step 3: Add DB field**

Add to `DiscountPromoCode`:

```prisma
displayMessage String?
```

Add migration:

```sql
ALTER TABLE "DiscountPromoCode" ADD COLUMN IF NOT EXISTS "displayMessage" TEXT;
```

- [ ] **Step 4: Implement `lib/promo-code-service.ts`**

Functions:

- `normalizePromoCodeInput()`.
- `formatDiscountLabel()`.
- `validatePromoCode()`.
- `recordPromoOrderApplication()`.
- `createPartnerPromo()`.
- `createDiscountPromo()`.
- `testShortLink()`.
- `getPromoHealth()`.

Validation checks:

- exists.
- not deleted.
- active.
- date window.
- usage limit.

- [ ] **Step 5: Implement unified API route**

`POST /api/promo/validate` validates same-origin + rate limit + code via `PromoCodeService.validatePromoCode`.

- [ ] **Step 6: Update OrderForm**

In `applyPromoCode`:

1. Call `/api/promo/validate` once.
2. If response `type === "partner"`, fill partner data and lock photographer fields.
3. If response `type === "discount"`, set discount data only and do not lock photographer fields.
4. Set success message from `message`.

- [ ] **Step 7: Update order validation and API**

Add `discountPromoId` to schema.

In `app/api/orders/route.ts`:

- Validate applied code using `PromoCodeService.validatePromoCode`.
- Save `discountPromoId`.
- Save `discountSnapshot`.
- Increment `DiscountPromoCode.currentUsage`.
- Do not set `partnerId` for general discount.

- [ ] **Step 8: Run test**

Run:

```bash
node --import tsx scripts/promo-unified-validation-flow.test.ts
```

Expected: PASS.

### Task 5: صفحة كود الخصم المبسطة

**Files:**
- Modify: `app/admin/promo-codes/discounts/page.tsx`
- Modify: `app/admin/promo-codes/discounts/new/page.tsx`
- Modify: `app/admin/promo-codes/actions.ts`

**Interfaces:**
- Only one creation page surface.
- Fields: percentage/free, display sentence, usage limit, dates.
- No short link.

- [ ] **Step 1: Write failing test**

Extend `scripts/promo-unified-center.test.ts`:

```ts
const discounts = readFileSync("app/admin/promo-codes/discounts/page.tsx", "utf8");
assert.match(discounts, /الجملة التي تظهر/);
assert.match(discounts, /مجاني 100%/);
assert.doesNotMatch(discounts, /الرابط المختصر|\/r\//);
```

- [ ] **Step 2: Run test**

Run:

```bash
node --import tsx scripts/promo-unified-center.test.ts
```

Expected: FAIL until page is simplified.

- [ ] **Step 3: Add display sentence**

Store sentence in `DiscountPromoCode.displayMessage`:

```ts
displayMessage: formString(formData, "displayMessage") || null
```

- [ ] **Step 4: Update UI copy**

Rename page title to `كود الخصم`.

- [ ] **Step 5: Run test**

Run:

```bash
node --import tsx scripts/promo-unified-center.test.ts
```

Expected: PASS.

### Task 6: صفحة السجل الموحدة

**Files:**
- Modify: `app/admin/promo-codes/history/page.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Two cards in one page: discount codes, photographers/partners.
- Partner row links to existing detail page `/admin/promo-codes/[id]`.

- [ ] **Step 1: Write failing test**

Extend `scripts/promo-unified-center.test.ts`:

```ts
const history = readFileSync("app/admin/promo-codes/history/page.tsx", "utf8");
assert.match(history, /أكواد الخصم/);
assert.match(history, /المصورين والقاعات/);
assert.match(history, /تعطيل مؤقت/);
assert.match(history, /إعادة تشغيل/);
assert.match(history, /كل الدعوات/);
```

- [ ] **Step 2: Run test**

Run:

```bash
node --import tsx scripts/promo-unified-center.test.ts
```

Expected: FAIL until history is rebuilt.

- [ ] **Step 3: Implement discount card**

Query:

```ts
prisma.discountPromoCode.findMany({
  where: { deletedAt: null },
  orderBy: { createdAt: "desc" },
  take: 100,
})
```

- [ ] **Step 4: Implement photographer card**

Query:

```ts
prisma.partnerPromoCode.findMany({
  orderBy: { createdAt: "desc" },
  take: 100,
  include: {
    partner: true,
    _count: { select: { orders: true, usageLogs: true } },
  },
})
```

- [ ] **Step 5: Implement actions**

Use existing actions:

- `updatePartnerPromoStatusAction`.
- `softDeletePartnerPromoAction`.
- `restorePartnerPromoAction`.

Add new optional action later for timed pause:

- `pausePartnerPromoUntilAction`.

- [ ] **Step 6: Run test**

Run:

```bash
node --import tsx scripts/promo-unified-center.test.ts
```

Expected: PASS.

### Task 7: إصلاح الرابط المختصر بفحص عملي

**Files:**
- Modify: `app/r/[slug]/route.ts`
- Modify: `scripts/short-link-route.test.ts`
- Create: `scripts/short-link-runtime-smoke.test.ts`

**Interfaces:**
- `/r/BADR` always redirects to `/order`.
- Valid promo cookie is set.
- Invalid promo status cookie is set.
- No 404 for invalid code.

- [ ] **Step 1: Extend structural test**

In `scripts/short-link-route.test.ts`, assert:

```ts
assert.match(route, /NextResponse\.redirect\(buildOrderFallbackUrl\(request\), 307\)/);
assert.doesNotMatch(route, /searchParams\.set\("promo"/);
```

- [ ] **Step 2: Create runtime smoke test**

Create a script that can run when DB URL is available:

```ts
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const response = await fetch(`${base}/r/BADR`, { redirect: "manual" });
assert.equal(response.status, 307);
assert.match(response.headers.get("location") || "", /\/order$/);

console.log("short-link-runtime-smoke tests passed");
```

- [ ] **Step 3: Run structural test**

Run:

```bash
node --import tsx scripts/short-link-route.test.ts
```

Expected: PASS.

### Task 8: تحسين رسائل الخطأ

**Files:**
- Modify: `app/admin/promo-codes/actions.ts`
- Modify: `app/admin/promo-codes/photographers/page.tsx`
- Modify: `app/admin/promo-codes/discounts/page.tsx`

**Interfaces:**
- Every failure query maps to a clear Arabic message.

- [ ] **Step 1: Add error codes**

Use:

- `database`
- `name`
- `discount`
- `duplicate`
- `upload`
- `invalid-url`
- `unknown`

- [ ] **Step 2: Add clear messages**

Example:

```ts
if (value === "duplicate") return "هذا الكود مستخدم بالفعل. اختر كودًا آخر أو اتركه فارغًا ليتم توليده تلقائيًا.";
```

- [ ] **Step 3: Run checks**

Run:

```bash
npm run check
```

Expected: exit 0.

### Task 9: تنظيف routes القديمة بدون كسرها

**Files:**
- Modify: `app/admin/partners/page.tsx`
- Modify: `app/admin/partners/directory/page.tsx`
- Modify: `app/admin/promo-codes/page.tsx`
- Modify: `app/admin/promo-codes/partners/page.tsx`

**Interfaces:**
- Old routes either redirect to unified center or remain hidden from sidebar.

- [ ] **Step 1: Decide compatibility map**

Use:

- `/admin/promo-codes` -> redirect `/admin/promo-codes/photographers`.
- `/admin/promo-codes/partners` -> redirect `/admin/promo-codes/photographers`.
- `/admin/partners` stays accessible but removed from sidebar.
- `/admin/promo-codes/discounts/new` can redirect to `/admin/promo-codes/discounts`.

- [ ] **Step 2: Implement redirects**

Use server `redirect()` from `next/navigation`.

- [ ] **Step 3: Run route build**

Run:

```bash
npm run build
```

Expected: exit 0.

### Task 10: Final verification

**Files:**
- All touched files.

**Interfaces:**
- Tests and build must pass.

- [ ] **Step 1: Run structural tests**

Run:

```bash
node --import tsx scripts/promo-unified-center.test.ts
node --import tsx scripts/promo-unified-validation-flow.test.ts
node --import tsx scripts/short-link-route.test.ts
node --import tsx scripts/promo-referral-flow.test.ts
```

Expected: all pass.

- [ ] **Step 2: Run type check**

Run:

```bash
npm run check
```

Expected: exit 0.

- [ ] **Step 3: Run build**

Run:

```bash
npm run build
```

Expected: exit 0. If local PostgreSQL is unavailable, Prisma may print a connectivity warning during static generation, but build must still exit 0.

- [ ] **Step 4: Manual smoke with DB available**

Steps:

1. Open `/admin/promo-codes/photographers`.
2. Create photographer code `BADR`.
3. Copy `/r/BADR`.
4. Open `/r/BADR`.
5. Confirm redirect to `/order`.
6. Confirm code is applied automatically.
7. Submit an order.
8. Open `/admin/promo-codes/history`.
9. Confirm photographer row has order/visit/use counts.
10. Create general discount code.
11. Apply it in order form manually.
12. Confirm it saves `discountPromoId`.

Expected: full flow works without 404 and without unclear errors.

## Self Review

- Spec coverage: covered one unified section, three pages, photographer code + link, discount code without link, unified history, actions, short link fix, order application.
- Data preservation: no destructive schema changes planned.
- Compatibility: old routes preserved by redirect/hidden aliases.
- Known requirement needing DB verification: full order submission and counter increments require a running PostgreSQL database.
