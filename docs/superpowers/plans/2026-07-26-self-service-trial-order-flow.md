# Self-Service Trial Order Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** نشر دعوة العميل تلقائيًا بفترة تجريبية بعد اكتمال الطلب، وإعادة توجيه دور الأدمن إلى إدارة الاستثناءات ودورة حياة التجربة.

**Architecture:** يستمر `OrderRequest` و`Invitation` و`Customer` كنماذج النظام الحالية دون Prisma migration. تُستخرج عملية تحويل الطلب إلى دعوة في خدمة مشتركة Idempotent يستخدمها المسار العام ومسار الأدمن، بينما تبقى إعدادات التجربة ضمن `SiteSettings.order` وتظل صفحة النجاح مسؤولة عن عرض روابط الدعوة والإدارة دون تحويل إجباري إلى واتساب.

**Tech Stack:** Next.js 15 App Router، React 19، TypeScript 5.9، Prisma 5، PostgreSQL، واختبارات Node assertions عبر `node --import tsx`.

## Global Constraints

- لا تغيّر `prisma/schema.prisma` ولا تضف نماذج اشتراك أو دفع.
- مدة التجربة الافتراضية `3` أيام، والحد المسموح من `1` إلى `10` أيام.
- لا ترسل مدة التجربة من المتصفح العام؛ اقرأها من إعدادات الموقع المنشورة.
- لا تضع `manageToken` أو `adminUrl` في Query String أو رسائل الخطأ أو Audit Log.
- لا تحذف الطلب عند فشل النشر التلقائي؛ اتركه قابلًا لإعادة المحاولة.
- لا تمدد التجربة عند تكرار نفس `dedupeKey`.
- لا تغيّر أنظمة RSVP أو الضيوف أو القوالب أو النسخ الاحتياطي أو GitHub Sync أو Publish Pipeline أو Railway.
- احتفظ بواتساب للدعم والمشاركة فقط، واحذف العد التنازلي والتحويل الإجباري بعد الطلب.
- نفّذ كل تغيير سلوكي باختبار فاشل أولًا، ثم أقل تنفيذ يجعله ينجح.

---

## File map

- `lib/order-trial-policy.ts`: أنواع وحسابات مدة التجربة وحمولة نجاح الطلب، بلا اعتماد على Prisma.
- `lib/order-publishing.ts`: تحويل `OrderRequest` إلى `Invitation` بطريقة مشتركة وIdempotent.
- `lib/site-settings.ts`: المصدر الوحيد لإعداد تفعيل النشر التلقائي والمدة الافتراضية.
- `app/api/orders/route.ts`: إنشاء الطلب ثم محاولة النشر التلقائي وإرجاع حالة `ready` أو `pending`.
- `app/api/admin/orders/[id]/route.ts`: أوامر الأدمن وإعادة المحاولة عبر خدمة النشر المشتركة.
- `components/OrderForm.tsx`: حفظ حمولة النجاح الجديدة في `sessionStorage`.
- `components/OrderSuccessRedirect.tsx`: عرض النجاح والروابط دون تحويل تلقائي.
- `app/api/admin/invitations/[code]/route.ts`: تمديد التجربة والتفعيل النهائي.
- `lib/admin-crm-status.ts`: اشتقاق «منتهي تجريبي» من التاريخ مباشرة.
- `components/AdminInvitationRow.tsx`: أزرار تمديد التجربة والتفعيل النهائي.
- `components/AdminOrderRequestsManager.tsx`: طابور «تحتاج تدخل» وإعادة محاولة النشر.
- `app/admin/orders/page.tsx`, `app/api/admin/orders/count/route.ts`, `lib/admin-notifications.ts`: عدادات ونصوص الاستثناءات.
- `scripts/*.test.ts`: اختبارات سلوك ووصلات التكامل الساكنة المتوافقة مع أسلوب المشروع.

### Task 1: Add the trial policy and persist order settings

**Files:**
- Create: `lib/order-trial-policy.ts`
- Modify: `lib/site-settings.ts`
- Modify: `app/admin/settings/page.tsx`
- Modify: `app/api/admin/settings/route.ts`
- Create: `scripts/order-trial-settings.test.ts`

**Interfaces:**
- Produces: `normalizeTrialDays(value: unknown, fallback?: number): number`
- Produces: `buildTrialWindow(days: unknown, now?: Date): { trialDays: number; trialEndsAt: Date }`
- Produces: `SiteSettings.order.autoTrialPublishEnabled: boolean`
- Produces: `SiteSettings.order.defaultTrialDays: number`

- [ ] **Step 1: Write the failing settings test**

Create `scripts/order-trial-settings.test.ts` with behavioral assertions for the pure policy and structural assertions for the settings UI and route:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildTrialWindow, normalizeTrialDays } from "../lib/order-trial-policy";

assert.equal(normalizeTrialDays(undefined), 3);
assert.equal(normalizeTrialDays("7"), 7);
assert.equal(normalizeTrialDays(0), 1);
assert.equal(normalizeTrialDays(99), 10);
assert.deepEqual(
  buildTrialWindow(3, new Date("2026-07-26T00:00:00.000Z")),
  { trialDays: 3, trialEndsAt: new Date("2026-07-29T00:00:00.000Z") },
);

const settings = readFileSync("lib/site-settings.ts", "utf8");
const page = readFileSync("app/admin/settings/page.tsx", "utf8");
const route = readFileSync("app/api/admin/settings/route.ts", "utf8");
assert.match(settings, /autoTrialPublishEnabled:\s*boolean/);
assert.match(settings, /defaultTrialDays:\s*number/);
assert.match(page, /name="autoTrialPublishEnabled"/);
assert.match(page, /name="defaultTrialDays"/);
assert.match(route, /order:\s*\{/);
assert.match(route, /defaultTrialDays/);
console.log("order trial settings tests passed");
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run: `node --import tsx scripts/order-trial-settings.test.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `lib/order-trial-policy.ts`.

- [ ] **Step 3: Add the pure trial policy**

Create `lib/order-trial-policy.ts`:

```ts
export const DEFAULT_TRIAL_DAYS = 3;
export const MIN_TRIAL_DAYS = 1;
export const MAX_TRIAL_DAYS = 10;

export function normalizeTrialDays(value: unknown, fallback = DEFAULT_TRIAL_DAYS) {
  const parsed = Number(value);
  const safeFallback = Number.isFinite(fallback) ? Math.round(fallback) : DEFAULT_TRIAL_DAYS;
  if (!Number.isFinite(parsed)) return Math.min(MAX_TRIAL_DAYS, Math.max(MIN_TRIAL_DAYS, safeFallback));
  return Math.min(MAX_TRIAL_DAYS, Math.max(MIN_TRIAL_DAYS, Math.round(parsed)));
}

export function buildTrialWindow(value: unknown, now = new Date()) {
  const trialDays = normalizeTrialDays(value);
  return {
    trialDays,
    trialEndsAt: new Date(now.getTime() + trialDays * 86_400_000),
  };
}
```

- [ ] **Step 4: Extend and normalize `SiteSettings.order`**

Add both properties to the type, defaults, and `normalizeSettings()`:

```ts
order: {
  showPaymentMethods: boolean;
  postImageEnabled: boolean;
  autoTrialPublishEnabled: boolean;
  defaultTrialDays: number;
};
```

Use `true` and `DEFAULT_TRIAL_DAYS` in `defaultSiteSettings`, and use `normalizeBoolean()` plus `normalizeTrialDays()` when reading saved settings.

- [ ] **Step 5: Add and save the admin controls**

In the Order settings card, add:

```tsx
<label className="admin-toggle-row template-inline-toggle">
  <input
    name="autoTrialPublishEnabled"
    type="checkbox"
    defaultChecked={settings.order.autoTrialPublishEnabled}
  />
  نشر الدعوة تلقائيًا بفترة تجريبية بعد اكتمال الطلب
</label>
<label className="field">
  <span>مدة التجربة الافتراضية بالأيام</span>
  <input
    name="defaultTrialDays"
    type="number"
    min={1}
    max={10}
    defaultValue={settings.order.defaultTrialDays}
  />
</label>
```

Pass the complete order settings object to `updateSiteSettings()`:

```ts
order: {
  showPaymentMethods: formData.has("showPaymentMethods"),
  postImageEnabled: formData.has("postImageEnabled"),
  autoTrialPublishEnabled: formData.has("autoTrialPublishEnabled"),
  defaultTrialDays: normalizeTrialDays(text(formData, "defaultTrialDays")),
},
```

- [ ] **Step 6: Run the focused test and typecheck**

Run: `node --import tsx scripts/order-trial-settings.test.ts`

Expected: `order trial settings tests passed`.

Run: `npm run check`

Expected: exit code `0`.

- [ ] **Step 7: Commit the settings slice**

```bash
git add lib/order-trial-policy.ts lib/site-settings.ts app/admin/settings/page.tsx app/api/admin/settings/route.ts scripts/order-trial-settings.test.ts
git commit -m "feat: configure automatic invitation trials"
```

### Task 2: Extract an idempotent shared order publishing service

**Files:**
- Create: `lib/order-publishing.ts`
- Modify: `lib/customer-identity.ts`
- Modify: `app/api/admin/orders/[id]/route.ts`
- Modify: `scripts/customer-identity.test.ts`
- Create: `scripts/order-publishing-service.test.ts`

**Interfaces:**
- Consumes: `buildTrialWindow()` from Task 1
- Produces: `OrderPublishMode = "AUTO_TRIAL" | "MANUAL_TRIAL" | "FINAL"`
- Produces: `publishOrder(input: PublishOrderInput): Promise<PublishOrderResult>`
- `PublishOrderInput` includes `orderId`, `mode`, `templateVisibility`, optional `trialDays`, optional admin `overrides`, and optional `now`
- `PublishOrderResult` includes `code`, `customerId`, `invitationId`, `trialDays`, `trialEndsAt`, and `reused`

- [ ] **Step 1: Write the failing service contract test**

Create `scripts/order-publishing-service.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const service = readFileSync("lib/order-publishing.ts", "utf8");
const route = readFileSync("app/api/admin/orders/[id]/route.ts", "utf8");

assert.match(service, /export type OrderPublishMode/);
assert.match(service, /export async function publishOrder/);
assert.match(service, /AUTO_TRIAL/);
assert.match(service, /MANUAL_TRIAL/);
assert.match(service, /FINAL/);
assert.match(service, /prisma\.\$transaction/);
assert.match(service, /status:\s*"PUBLISHED"/);
assert.doesNotMatch(route, /async function publishPrismaOrder/);
assert.match(route, /publishOrder\(/);
console.log("order publishing service tests passed");
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --import tsx scripts/order-publishing-service.test.ts`

Expected: FAIL because `lib/order-publishing.ts` does not exist.

- [ ] **Step 3: Define the shared service contract and move draft normalization**

Create the service with the exact public contract:

```ts
export type OrderPublishMode = "AUTO_TRIAL" | "MANUAL_TRIAL" | "FINAL";

export type PublishOrderInput = {
  orderId: string;
  mode: OrderPublishMode;
  templateVisibility: "published" | "admin";
  trialDays?: number;
  overrides?: AdminOrderOverrides;
  now?: Date;
};

export type PublishOrderResult = {
  code: string;
  invitationId: string;
  customerId: string;
  trialDays: number | null;
  trialEndsAt: Date | null;
  reused: boolean;
};
```

Move `cleanText`, URL/date/image normalization, photographer normalization, music resolution, `getOrderDraft`, `validateDraft`, template upsert, and the body of `publishPrismaOrder` into the service. Keep snapshot formatting and HTTP response helpers in the route. Use `getPublicPublishedTemplateWithSettings()` when `templateVisibility === "published"`, and use `getTemplateWithSettings()` when it equals `"admin"`; the public flow must never publish a draft template.

- [ ] **Step 4: Make lifecycle updates explicit and idempotent**

Derive lifecycle fields once:

```ts
const trial = input.mode === "FINAL"
  ? { trialDays: null, trialEndsAt: null }
  : buildTrialWindow(input.trialDays, input.now);

const lifecycleData = input.mode === "FINAL"
  ? {
      trialDays: null,
      trialEndsAt: null,
      disabledAt: null,
      disabledReason: null,
      disabledBy: null,
      status: "ACTIVE" as const,
    }
  : {
      ...trial,
      status: "ACTIVE" as const,
    };
```

Before copying media, check whether the reserved invitation already exists. When both the invitation and a `PUBLISHED` order exist, return the existing relationship immediately. When the invitation exists but the order update failed, repair the order relationship without copying media or changing the original trial window. Only `MANUAL_TRIAL` may intentionally replace or extend that window.

- [ ] **Step 5: Put database relationship changes in one transaction**

Prepare files first. Then use a transaction to resolve/create the customer, upsert the invitation, and update the order. Change `resolveOrCreateCustomerForInvitation()` to accept `PrismaClient | Prisma.TransactionClient`, and extend `scripts/customer-identity.test.ts` with a source assertion that the transaction client type is accepted. Return the created or reused invitation ID from inside the transaction.

The order update must set:

```ts
{
  status: "PUBLISHED",
  publishedInvitationCode: code,
  customerId,
  templateId,
  rejectionReason: null,
}
```

- [ ] **Step 6: Replace the admin route's private publisher**

Map actions explicitly:

```ts
const mode = action === "trial-publish" ? "MANUAL_TRIAL" : "FINAL";
const result = await publishOrder({
  orderId: id,
  mode,
  templateVisibility: "admin",
  trialDays: payload.trialDays,
  overrides: payload,
});
const code = result.code;
```

Keep admin authentication, `revalidatePath`, post-image generation, snapshot response, and Audit Log behavior in the route.

- [ ] **Step 7: Run service and existing admin order tests**

Run: `node --import tsx scripts/order-publishing-service.test.ts`

Expected: `order publishing service tests passed`.

Run: `node --import tsx scripts/customer-identity.test.ts`

Expected: customer identity tests pass.

Run: `node --import tsx scripts/admin-orders-post-image-panel.test.ts`

Expected: `admin orders post image panel tests passed`.

Run: `npm run check`

Expected: exit code `0`.

- [ ] **Step 8: Commit the shared service**

```bash
git add lib/order-publishing.ts lib/customer-identity.ts app/api/admin/orders/[id]/route.ts scripts/customer-identity.test.ts scripts/order-publishing-service.test.ts
git commit -m "refactor: share order invitation publishing"
```

### Task 3: Auto-publish public orders and recover duplicate submissions

**Files:**
- Modify: `app/api/orders/route.ts`
- Modify: `lib/order-request-links.ts`
- Create: `scripts/order-auto-trial-flow.test.ts`

**Interfaces:**
- Consumes: `publishOrder({ mode: "AUTO_TRIAL" })`
- Consumes: published `SiteSettings.order`
- Produces API field: `activationStatus: "ready" | "pending"`
- Produces optional API fields: `publicUrl`, `adminUrl`, `trialDays`, `trialEndsAt`

- [ ] **Step 1: Write the failing public-flow test**

Create `scripts/order-auto-trial-flow.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/orders/route.ts", "utf8");
assert.match(route, /publishOrder\(/);
assert.match(route, /mode:\s*"AUTO_TRIAL"/);
assert.match(route, /activationStatus:\s*"ready"/);
assert.match(route, /activationStatus:\s*"pending"/);
assert.match(route, /autoTrialPublishEnabled/);
assert.match(route, /defaultTrialDays/);
assert.doesNotMatch(route, /buildOrderWhatsAppMessage/);
assert.doesNotMatch(route, /getWhatsAppOrderUrl/);
console.log("order automatic trial flow tests passed");
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --import tsx scripts/order-auto-trial-flow.test.ts`

Expected: FAIL because the route does not call `publishOrder()`.

- [ ] **Step 3: Replace duplicate WhatsApp handling with recovery**

Select the duplicate order status together with its code and token. If it is already `PUBLISHED`, confirm the invitation exists and return `ready`. Otherwise call `publishOrder()` for the existing order ID with the stored code and token.

Never generate a new code or token for a duplicate order that already has reserved values.

- [ ] **Step 4: Publish a newly created order after persistence**

After the order transaction and `order.create` audit event:

```ts
if (!siteSettings.order.autoTrialPublishEnabled) {
  return NextResponse.json({
    ok: true,
    activationStatus: "pending",
    orderId,
    orderNumber: effectiveOrderNumber,
    invitationCode: effectiveInvitationCode,
  });
}

try {
  const published = await publishOrder({
    orderId,
    mode: "AUTO_TRIAL",
    templateVisibility: "published",
    trialDays: siteSettings.order.defaultTrialDays,
  });
  const links = buildReservedInvitationLinks(siteUrl, published.code, effectiveManageToken);
  return NextResponse.json({
    ok: true,
    activationStatus: "ready",
    orderId,
    orderNumber: effectiveOrderNumber,
    invitationCode: published.code,
    trialDays: published.trialDays,
    trialEndsAt: published.trialEndsAt?.toISOString(),
    ...links,
  });
} catch (error) {
  console.error("[Order API] Automatic trial publish failed", { orderId, error });
  return NextResponse.json({
    ok: true,
    activationStatus: "pending",
    orderId,
    orderNumber: effectiveOrderNumber,
    invitationCode: effectiveInvitationCode,
  });
}
```

Record success and failure audit events without including `manageToken`.

- [ ] **Step 5: Remove mandatory WhatsApp response construction**

Delete `buildOrderWhatsAppMessage`, `getWhatsAppOrderUrl`, and the forced recipient lookup. Keep the published site settings read because it provides the automatic trial policy.

- [ ] **Step 6: Run focused and existing order tests**

Run: `node --import tsx scripts/order-auto-trial-flow.test.ts`

Expected: `order automatic trial flow tests passed`.

Run: `node --import tsx scripts/order-form-layout.test.ts`

Expected: existing order form test passes.

Run: `node --import tsx scripts/promo-order-ux-regression.test.ts`

Expected: existing promo order regression test passes.

Run: `npm run check`

Expected: exit code `0`.

- [ ] **Step 7: Commit the public auto-publish flow**

```bash
git add app/api/orders/route.ts lib/order-request-links.ts scripts/order-auto-trial-flow.test.ts
git commit -m "feat: publish completed orders as trials"
```

### Task 4: Replace the WhatsApp redirect with invitation success actions

**Files:**
- Modify: `components/OrderForm.tsx`
- Modify: `components/OrderSuccessRedirect.tsx`
- Modify: `app/order/success/page.tsx`
- Create: `scripts/order-success-trial-ux.test.ts`

**Interfaces:**
- Consumes: `activationStatus`, `publicUrl`, `adminUrl`, `trialDays`, `trialEndsAt`
- Produces: `sessionStorage["badrdaawa-order-success"]` without mandatory `whatsappUrl`

- [ ] **Step 1: Write the failing success UX test**

Create `scripts/order-success-trial-ux.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const form = readFileSync("components/OrderForm.tsx", "utf8");
const success = readFileSync("components/OrderSuccessRedirect.tsx", "utf8");
assert.match(form, /activationStatus/);
assert.match(form, /publicUrl/);
assert.match(form, /adminUrl/);
assert.match(success, /دعوتك جاهزة للتجربة/);
assert.match(success, /فتح لوحة التحكم/);
assert.match(success, /مشاهدة الدعوة/);
assert.doesNotMatch(success, /redirectCountdownSeconds/);
assert.doesNotMatch(success, /window\.location\.assign\(payload\.whatsappUrl\)/);
console.log("order success trial UX tests passed");
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --import tsx scripts/order-success-trial-ux.test.ts`

Expected: FAIL because the current component still defines the WhatsApp countdown.

- [ ] **Step 3: Save the new API payload in the order form**

Extend the response type and stored object with `activationStatus`, links, and trial dates. Do not add `adminUrl` to `successParams`; store it only in `sessionStorage`.

- [ ] **Step 4: Replace the success component state and rendering**

Use this payload shape:

```ts
type OrderSuccessPayload = {
  activationStatus: "ready" | "pending";
  orderNumber?: string;
  invitationCode?: string;
  publicUrl?: string;
  adminUrl?: string;
  trialDays?: number;
  trialEndsAt?: string;
  groomName?: string;
  brideName?: string;
  weddingDate?: string;
  venue?: string;
};
```

Remove countdown timers, auto-redirect effects, cancellation state, WhatsApp URL cleaning, and phone extraction. Render links only when `activationStatus === "ready"` and both URLs are present. Render the saved/pending message otherwise.

- [ ] **Step 5: Keep support optional**

Read the published support URL on the server page only if the existing page pattern can do so without exposing `adminUrl`. Render it as a secondary anchor labeled «تواصل مع الدعم» and never trigger it automatically.

- [ ] **Step 6: Run the focused UX test and typecheck**

Run: `node --import tsx scripts/order-success-trial-ux.test.ts`

Expected: `order success trial UX tests passed`.

Run: `npm run check`

Expected: exit code `0`.

- [ ] **Step 7: Commit the client success experience**

```bash
git add components/OrderForm.tsx components/OrderSuccessRedirect.tsx app/order/success/page.tsx scripts/order-success-trial-ux.test.ts
git commit -m "feat: show trial invitation success actions"
```

### Task 5: Add trial extension and final activation to invitation administration

**Files:**
- Modify: `lib/admin-crm-status.ts`
- Modify: `app/api/admin/invitations/[code]/route.ts`
- Modify: `components/AdminInvitationRow.tsx`
- Modify: `app/admin/invitations/page.tsx`
- Create: `scripts/admin-invitation-trial-lifecycle.test.ts`

**Interfaces:**
- Consumes: `normalizeTrialDays()`
- Produces admin action: `extend-trial`
- Produces admin action: `final-activate`

- [ ] **Step 1: Write the failing lifecycle test**

Create `scripts/admin-invitation-trial-lifecycle.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getInvitationState } from "../lib/admin-crm-status";

assert.equal(getInvitationState({
  isActive: true,
  status: "ACTIVE",
  weddingDate: "2026-08-20T00:00:00.000Z",
  trialEndsAt: "2026-07-20T00:00:00.000Z",
}, Date.parse("2026-07-26T00:00:00.000Z")), "trial-ended");

const route = readFileSync("app/api/admin/invitations/[code]/route.ts", "utf8");
const row = readFileSync("components/AdminInvitationRow.tsx", "utf8");
assert.match(route, /extend-trial/);
assert.match(route, /final-activate/);
assert.match(route, /trialEndsAt:\s*null/);
assert.match(route, /disabledAt:\s*null/);
assert.match(row, /تمديد التجربة/);
assert.match(row, /تفعيل نهائي/);
console.log("admin invitation trial lifecycle tests passed");
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --import tsx scripts/admin-invitation-trial-lifecycle.test.ts`

Expected: FAIL because an expired date without `disabledAt` currently returns `active`.

- [ ] **Step 3: Derive expired trial state from the date**

In `getInvitationState()`, after the disabled check and before the active trial check:

```ts
if (invitation.trialEndsAt && trialEndsAt <= now) return "trial-ended";
if (trialEndsAt > now) return "trial";
```

- [ ] **Step 4: Implement `extend-trial`**

Accept `trialDays` from authenticated admin JSON or form data, normalize it to 1–10, and update the invitation:

```ts
{
  trialDays,
  trialEndsAt: new Date(Date.now() + trialDays * 86_400_000),
  disabledAt: null,
  disabledReason: null,
  disabledBy: null,
  status: "ACTIVE",
}
```

Record Audit Log action `invitation.trial-extend` and revalidate the public, customer, and admin paths.

- [ ] **Step 5: Implement `final-activate`**

Update the invitation atomically:

```ts
{
  trialDays: null,
  trialEndsAt: null,
  disabledAt: null,
  disabledReason: null,
  disabledBy: null,
  status: "ACTIVE",
}
```

Record Audit Log action `invitation.final-activate`.

- [ ] **Step 6: Add row actions**

Add «تمديد التجربة» with a 1–10 day selector for trial invitations and «تفعيل نهائي» for active or ended trial invitations. Use the existing JSON action request and `router.refresh()` pattern; disable both while `actionLoading` is true.

- [ ] **Step 7: Run lifecycle and related tests**

Run: `node --import tsx scripts/admin-invitation-trial-lifecycle.test.ts`

Expected: `admin invitation trial lifecycle tests passed`.

Run: `node --import tsx scripts/admin-customer-profile.test.ts`

Expected: existing customer profile test passes.

Run: `npm run check`

Expected: exit code `0`.

- [ ] **Step 8: Commit invitation lifecycle controls**

```bash
git add lib/admin-crm-status.ts app/api/admin/invitations/[code]/route.ts components/AdminInvitationRow.tsx app/admin/invitations/page.tsx scripts/admin-invitation-trial-lifecycle.test.ts
git commit -m "feat: manage invitation trial lifecycle"
```

### Task 6: Turn admin orders into an exception queue

**Files:**
- Modify: `components/AdminOrderRequestsManager.tsx`
- Modify: `app/admin/orders/page.tsx`
- Modify: `app/api/admin/orders/count/route.ts`
- Modify: `lib/admin-notifications.ts`
- Create: `scripts/admin-order-exception-queue.test.ts`

**Interfaces:**
- Consumes: admin `trial-publish` action through shared publisher
- Produces UI wording: «تحتاج تدخل» and «إعادة محاولة النشر التجريبي»

- [ ] **Step 1: Write the failing exception queue test**

Create `scripts/admin-order-exception-queue.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manager = readFileSync("components/AdminOrderRequestsManager.tsx", "utf8");
const page = readFileSync("app/admin/orders/page.tsx", "utf8");
const notifications = readFileSync("lib/admin-notifications.ts", "utf8");
assert.match(manager, /تحتاج تدخل/);
assert.match(manager, /إعادة محاولة النشر التجريبي/);
assert.match(page, /طلبات تحتاج تدخل/);
assert.match(notifications, /يحتاج تدخل/);
assert.doesNotMatch(notifications, /وصل طلب جديد أو طلب يحتاج مراجعة/);
console.log("admin order exception queue tests passed");
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --import tsx scripts/admin-order-exception-queue.test.ts`

Expected: FAIL because the current copy still describes manual review.

- [ ] **Step 3: Update page and tab copy**

Use «طلبات تحتاج تدخل» for the count heading and «تحتاج تدخل» for the pending tab. Explain that successful requests publish automatically and only incomplete or failed requests remain here.

- [ ] **Step 4: Add retry action copy without changing the endpoint contract**

For an unpublished selected order, label the existing `trial-publish` operation «إعادة محاولة النشر التجريبي». Keep the day selector for manual recovery and keep final publish available to the admin.

- [ ] **Step 5: Update counts and notifications**

Keep the status filter `NEW`, `REVIEWING`, `EDITED`, and `ACCEPTED`, because successful auto-publish sets `PUBLISHED`. Change notification title and message to describe a failed or incomplete request that needs intervention.

- [ ] **Step 6: Run focused and existing admin tests**

Run: `node --import tsx scripts/admin-order-exception-queue.test.ts`

Expected: `admin order exception queue tests passed`.

Run: `node --import tsx scripts/admin-orders-post-image-panel.test.ts`

Expected: existing post-image admin test passes after updating any copy assertion to the approved final wording.

Run: `npm run check`

Expected: exit code `0`.

- [ ] **Step 7: Commit the admin queue adaptation**

```bash
git add components/AdminOrderRequestsManager.tsx app/admin/orders/page.tsx app/api/admin/orders/count/route.ts lib/admin-notifications.ts scripts/admin-order-exception-queue.test.ts scripts/admin-orders-post-image-panel.test.ts
git commit -m "feat: make admin orders an exception queue"
```

### Task 7: Verify the complete flow and document the result

**Files:**
- Modify only if verification reveals an in-scope defect
- Test: all new tests and existing order/customer tests

**Interfaces:**
- Consumes all earlier tasks
- Produces a buildable, regression-tested implementation

- [ ] **Step 1: Run every new focused test**

```bash
node --import tsx scripts/order-trial-settings.test.ts
node --import tsx scripts/order-publishing-service.test.ts
node --import tsx scripts/order-auto-trial-flow.test.ts
node --import tsx scripts/order-success-trial-ux.test.ts
node --import tsx scripts/admin-invitation-trial-lifecycle.test.ts
node --import tsx scripts/admin-order-exception-queue.test.ts
```

Expected: all six commands exit `0` and print their success messages.

- [ ] **Step 2: Run related regressions**

```bash
node --import tsx scripts/customer-identity.test.ts
node --import tsx scripts/admin-customer-profile.test.ts
node --import tsx scripts/admin-orders-post-image-panel.test.ts
node --import tsx scripts/order-form-layout.test.ts
node --import tsx scripts/promo-order-ux-regression.test.ts
node --import tsx scripts/order-post-image-stage.test.ts
```

Expected: all commands exit `0`.

- [ ] **Step 3: Run static and production verification**

Run: `npm run check`

Expected: exit code `0`.

Run: `npm run build`

Expected: exit code `0` with all Next.js routes compiled.

- [ ] **Step 4: Inspect the final diff**

Run: `git diff --check HEAD~6..HEAD`

Expected: no whitespace errors.

Run: `git status --short`

Expected: clean worktree.

- [ ] **Step 5: Manual acceptance pass**

Run the app locally and verify on a mobile viewport:

1. Complete a new invitation order.
2. Confirm the success page shows the three-day trial and both links.
3. Open the public invitation.
4. Open the secret management link and confirm the customer session works.
5. Confirm the order appears as published, not as an intervention.
6. Disable automatic publishing and confirm a new order remains in «تحتاج تدخل».
7. Re-enable it, retry the order, expire its trial, extend it, then activate it finally.

- [ ] **Step 6: Create a verification-only commit if Step 3 required fixes**

If verification required code changes, stage the in-scope implementation and test files that `git status --short` reports as modified:

```bash
git add lib/order-trial-policy.ts lib/order-publishing.ts lib/customer-identity.ts lib/site-settings.ts lib/admin-crm-status.ts lib/admin-notifications.ts app/api/orders/route.ts app/api/admin/orders/[id]/route.ts app/api/admin/invitations/[code]/route.ts app/api/admin/settings/route.ts app/api/admin/orders/count/route.ts app/admin/settings/page.tsx app/admin/orders/page.tsx app/admin/invitations/page.tsx app/order/success/page.tsx components/OrderForm.tsx components/OrderSuccessRedirect.tsx components/AdminInvitationRow.tsx components/AdminOrderRequestsManager.tsx scripts/order-trial-settings.test.ts scripts/order-publishing-service.test.ts scripts/order-auto-trial-flow.test.ts scripts/order-success-trial-ux.test.ts scripts/admin-invitation-trial-lifecycle.test.ts scripts/admin-order-exception-queue.test.ts scripts/customer-identity.test.ts scripts/admin-orders-post-image-panel.test.ts
git commit -m "fix: harden automatic trial publishing"
```

If no fixes were needed, do not create an empty commit.
