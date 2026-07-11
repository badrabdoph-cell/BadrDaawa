# وثيقة متطلبات المنتج (PRD)
## نظام الاشتراكات والمدفوعات وإدارة العملاء (CRM)
### BadrDaawa — منصة الدعوات الإلكترونية

---

## جدول المحتويات

1. [ملخص تنفيذي](#1-ملخص-تنفيذي)
2. [الفلسفة](#2-الفلسفة)
3. [حالات العميل (Customer Status)](#3-حالات-العميل-customer-status)
4. [سيناريوهات تدفق المستخدم](#4-سيناريوهات-تدفق-المستخدم)
5. [نظام الإشعارات للعملاء](#5-نظام-الإشعارات-للعملاء)
6. [الباقات والأسعار](#6-الباقات-والأسعار)
7. [نظام الدفع](#7-نظام-الدفع)
8. [لوحة إدارة الاشتراكات](#8-لوحة-إدارة-الاشتراكات)
9. [صفحة "اشتراكي" — لوحة العميل](#9-صفحة-اشتراكي--لوحة-العميل)
10. [مركز الطلبات](#10-مركز-الطلبات)
11. [المخطط التقني (Technical Architecture)](#11-المخطط-التقني-technical-architecture)
12. [قائمة الملفات](#12-قائمة-الملفات)
13. [الجدول الزمني](#13-الجدول-الزمني)

---

## 1. ملخص تنفيذي

### 1.1 المشكلة الحالية

1. **لا يوجد نظام اشتراكات للعملاء** — الباقات حالياً مجانية بالكامل، ولا يوجد تدفق إيرادات
2. **الاعتماد على واتساب** — بعد تقديم الطلب، يتم التواصل مع العميل عبر واتساب بدلاً من إدارته داخل المنصة
3. **لا توجد حالات واضحة للعميل** — لا فرق بين عميل تجريبي وعميل مدفوع وعميل منتهي
4. **لا توجد لوحة تحكم موحدة للعميل** — العميل لا يملك واجهة لمتابعة اشتراكه ومدفوعاته
5. **لا يوجد CRM مصغر** — إدارة العملاء محدودة بالبيانات الأساسية فقط

### 1.2 الحل المقترح

نظام متكامل لإدارة دورة حياة العميل — من التسجيل التجريبي مروراً بالتفعيل والاشتراك وصولاً إلى الإدارة المستمرة — مع توفير أدوات CRM داخلية وفصل كامل عن واتساب.

### 1.3 الأهداف

- تحويل المنصة إلى مصدر دخل (Monetization)
- أتمتة عملية الاشتراك بالكامل
- توفير تجربة مستخدم سلسة بدون احتكاك (Frictionless)
- تمكين الإدارة من التحكم بكل عميل دون مغادرة المنصة

---

## 2. الفلسفة

### 2.1 مبدأ "تفعيل دعوتي" بدلاً من "اشترك الآن"

**القاعدة الذهبية:** المستخدم لا يشتري اشتراكاً، بل يُفَعِّل دعوته.

| أين نستخدم | النص الجديد | النص القديم (ممنوع) |
|-----------|------------|-------------------|
| Banner التجربة | فَعِّل دعوتك الآن | اشترك الآن |
| صفحة الإعدادات | تفعيل الدعوة | شراء الباقة |
| بعد انتهاء التجربة | فعِّل دعوتك للعودة | اشترك للعودة |
| زر رئيسي | تفعيل دعوتي | شراء الاشتراك |

### 2.2 مبدأ عدم الحذف

عند انتهاء التجربة أو الاشتراك:

- **لا تُحذف الدعوة أبداً**
- تتحول حالتها إلى `EXPIRED`
- الموقع العام يعرض صفحة بسيطة "انتهت الفترة التجريبية"
- لوحة التحكم متاحة بالكامل مع Banner تنبيهي
- يمكن إعادة التفعيل بنقرة واحدة

### 2.3 مبدأ الإدارة الذاتية

العميل يدير كل شيء من داخل المنصة دون الحاجة للتواصل مع الإدارة:
- رفع إيصال الدفع
- متابعة حالة الطلب
- تجديد الاشتراك
- ترقية الباقة

---

## 3. حالات العميل (Customer Status)

### 3.1 حالات الاشتراك

```
🟡 تجريبي (TRIAL)
  → مدة: يومان (قابلة للتمديد من الإدارة)
  → صلاحية: الباقة الأساسية فقط
  → عرض Banner: "⏳ باقي X يوم على انتهاء الفترة التجريبية"
  → زر: "فَعِّل دعوتك الآن"

🟢 نشط (ACTIVE)
  → الاشتراك ساري المفعول
  → كل ميزات الباقة متاحة
  → عدم عرض أي Banner

🟠 منتهي (EXPIRED)
  → انتهت صلاحية الاشتراك (Trial أو مدفوع)
  → الموقع العام يعرض صفحة "انتهت الفترة التجريبية"
  → لوحة التحكم تعمل مع Banner: "⚠️ اشتراكك منتهي"
  → زر: "فَعِّل دعوتك للعودة"

🔴 موقوف (SUSPENDED)
  → تم إيقافه يدوياً من الإدارة
  → الموقع العام لا يعرض شيئاً
  → لوحة التحكم تعمل مع رسالة: "تم إيقاف الدعوة"

⚫ محذوف (DELETED) — Soft Delete
  → `deletedAt` غير null
  → غير ظاهر في أي مكان
  → يمكن استعادته من لوحة الإدارة
```

### 3.2 آلية الانتقال بين الحالات

```
[TRIAL]
  │
  ├─ (يدفع + الإدارة توافق) → [ACTIVE]
  ├─ (تنتهي المدة) → [EXPIRED]
  ├─ (الإدارة توقف) → [SUSPENDED]
  └─ (الإدارة تحذف) → [DELETED]

[ACTIVE]
  ├─ (ينتهي الاشتراك) → [EXPIRED]
  ├─ (الإدارة توقف) → [SUSPENDED]
  └─ (الإدارة تحذف) → [DELETED]

[EXPIRED]
  ├─ (يدفع + الإدارة توافق) → [ACTIVE]
  ├─ (الإدارة تمدد التجربة) → [TRIAL]
  ├─ (الإدارة توقف) → [SUSPENDED]
  └─ (الإدارة تحذف) → [DELETED]

[SUSPENDED]
  ├─ (الإدارة تفعّل) → [ACTIVE]
  └─ (الإدارة تحذف) → [DELETED]
```

### 3.3 دوال الحالة (Code)

```typescript
// lib/subscription-status.ts
type CustomerSubscriptionStatus = "trial" | "active" | "expired" | "suspended" | "deleted";

function getCustomerStatus(customer: CustomerInput): CustomerSubscriptionStatus {
  // 1. deletedAt موجود → "deleted"
  // 2. suspendedAt موجود → "suspended"
  // 3. subscriptionStatus === "ACTIVE" ∧ subscriptionEndDate > now → "active"
  // 4. trialEndsAt > now → "trial"
  // 5. غير ذلك → "expired"
}
```

---

## 4. سيناريوهات تدفق المستخدم

### 4.1 سيناريو: عميل جديد يقدم طلب دعوة

```
1. العميل يملأ OrderForm (الوضع الحالي)
2. بعد الإرسال → تظهر صفحة النجاح
3. يتم إنشاء حساب Customer تلقائياً:
   - username: client_{phone}
   - passwordHash: مولد عشوائياً (يُطلب من العميل تغييره)
   - subscriptionStatus: TRIAL
   - trialEndsAt: now + 2 days
4. يُوجه العميل إلى لوحة التحكم: /{code}/ad_3399
5. يظهر Banner: "⏳ باقي يومان على انتهاء الفترة التجريبية"
6. الزر: "فَعِّل دعوتك الآن" → /activate
```

### 4.2 سيناريو: انتهاء الفترة التجريبية

```
1. في اليوم الثالث:
   - subscriptionStatus ← EXPIRED
   - الموقع العام ({code}) يعرض صفحة "انتهت التجربة"
   - لوحة التحكم تعرض Banner أحمر مع زر "فَعِّل دعوتك"
   - الإدارة ترى حالة العميل Expired في الـ CRM
```

### 4.3 سيناريو: العميل يفعّل الدعوة

```
1. يضغط "فَعِّل دعوتك" (من Banner / صفحة Expired / الإعدادات)
2. → /activate
3. يختار الباقة (Starter / Pro / Business)
4. → /activate/payment
5. يختار طريقة الدفع (فودافون كاش / InstaPay)
6. تظهر بيانات التحويل (رقم، QR، المبلغ)
7. يضغط "تم التحويل"
8. يرفع لقطة شاشة + يكتب رقم المحفظة
9. → /activate/success
10. الحالة: "🟡 في انتظار المراجعة"
```

### 4.4 سيناريو: الإدارة تراجع الدفع

```
1. في /admin/subscriptions/payments
2. ترى طلب جديد مع الإيصال
3. تضغط "تفعيل الاشتراك" → ثانية واحدة
   - subscriptionStatus ← ACTIVE
   - subscriptionPlanId ← الباقة المختارة
   - subscriptionStartDate ← now
   - subscriptionEndDate ← now + durationDays
   - يختفي Banner التجربة
   - الموقع يعمل بكامل طاقته
4. أو تضغط "رفض" → تكتب سبب → يظهر في مركز الطلبات
```

### 4.5 سيناريو: مشكلة في الدفع

```
1. الإدارة تكتب ملاحظة: "المبلغ أقل من المطلوب"
2. → تظهر في مركز الطلبات للعميل
3. العميل يعيد رفع الإيصال أو يكتب رداً
4. الإدارة تراجع مرة أخرى
```

---

## 5. نظام الإشعارات للعملاء

### 5.1 أنواع الإشعارات

| النوع | المكان | المدة | مثال |
|-------|--------|-------|------|
| **Banner** | أعلى لوحة التحكم | محددة (start/end) | "⚠️ تبقى يوم واحد على انتهاء التجربة" بلون أصفر |
| **Popup** | نافذة منبثقة | مرة واحدة | "🎉 تم إضافة قالب جديد" مع زر إغلاق |
| **رسالة داخلية** | قسم الرسائل | دائمة | إشعارات عامة من الإدارة |

### 5.2 خصائص كل إشعار

| الخاصية | Banner | Popup | رسالة |
|---------|--------|-------|-------|
| عنوان | ✅ | ✅ | ✅ |
| محتوى | ✅ | ✅ | ✅ |
| لون (مخصص) | ✅ | — | — |
| تاريخ بداية | ✅ | ✅ | — |
| تاريخ نهاية | ✅ | ✅ | — |
| قابل للإزالة | ✅ | ✅ | ✅ |
| مستهدف (كل/دعوة) | ✅ | ✅ | ✅ |

### 5.3 لوحة إدارة الإشعارات

```
/admin/notifications (قسم "إشعارات العملاء")

نموذج الإنشاء:
┌─────────────────────────────────────────────┐
│ العنوان:    [________________________]      │
│ المحتوى:    [________________________]      │
│ اللون:      [🔴 🟡 🟢 🔵 🟣 ⬛]            │
│ النوع:      [Banner] [Popup] [رسالة]        │
│ المستهدف:   [كل العملاء] أو [رمز الدعوة]     │
│ البداية:    [____/____/____]                │
│ النهاية:    [____/____/____]                │
│ قابل للإزالة: [✅]                          │
│                                             │
│ [إرسال الإشعار]                              │
└─────────────────────────────────────────────┘
```

---

## 6. الباقات والأسعار

### 6.1 الباقات المقترحة (مبدئية — قابلة للتعديل من الإدارة)

| الميزة | Starter | Pro | Business |
|--------|---------|-----|----------|
| السعر (سنة) | 600 ج | 1,200 ج | 2,400 ج |
| مدة العرض | غير محدود | غير محدود | غير محدود |
| عدد الضيوف | 100 | غير محدود | غير محدود |
| قوالب | جميع القوالب | جميع القوالب | جميع القوالب |
| رفع صور | ✅ | ✅ | ✅ |
| موسيقى | — | ✅ | ✅ |
| قصة حب | — | ✅ | ✅ |
| RSVP | ✅ | ✅ | ✅ |
| QR Code | ✅ | ✅ | ✅ |
| إحصائيات | أساسية | متقدمة | متقدمة |
| شريك (مصور) | — | — | ✅ |
| دعم مخصص | — | — | ✅ |
| تصدير ضيوف | — | ✅ | ✅ |
| البث المباشر | — | — | ✅ |

### 6.2 نموذج الباقة في قاعدة البيانات

```prisma
model SubscriptionPlan {
  id             String   @id
  slug           String   @unique    // "starter", "pro", "business"
  nameAr         String              // "ستارتر", "برو", "بيزنس"
  nameEn         String
  description    String?
  priceYearly    Decimal
  durationDays   Int      @default(365)
  features       Json                // string[] — قائمة الميزات
  recommended    Boolean  @default(false)  // Pro مُوصى بها
  enabled        Boolean  @default(true)
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

### 6.3 ملاحظات

- الأسعار قابلة للتعديل من `/admin/subscriptions/plans`
- يمكن إضافة/إخفاء باقات من لوحة الإدارة
- الخصم عبر كود خصم (موجود فعلاً — `DiscountPromoCode`)
- فترة التجربة: يومان (قابلة للتعديل)

---

## 7. نظام الدفع

### 7.1 طرق الدفع المدعومة (مرحلة أولى)

1. **فودافون كاش (Vodafone Cash)**
2. **InstaPay**

كل طريقة تحتاج تفعيل من لوحة الإدارة (إظهار/إخفاء).

### 7.2 تدفق الدفع

```
عند اختيار طريقة الدفع:
┌─────────────────────────────────────────────┐
│               الدفع عبر فودافون كاش          │
│                                             │
│  📱 رقم المحفظة: 010XXXXXXXX               │
│  👤 الاسم: أحمد محمد                        │
│  📷 QR Code: [████████████]                 │
│                                             │
│  💰 المبلغ: 1,200 ج                         │
│                                             │
│  ┌──────────────────────────────────┐       │
│  │ رقم المحفظة المحول منها: [____]  │       │
│  │ لقطة شاشة الإيصال:   [اختيار]   │       │
│  └──────────────────────────────────┘       │
│                                             │
│  [✅ تم التحويل — أرسل للمراجعة]             │
└─────────────────────────────────────────────┘
```

### 7.3 نموذج الدفع في قاعدة البيانات

```prisma
model Payment {
  id               String    @id
  customerId       String
  invitationCode   String?
  planId           String
  amount           Decimal
  method           String    // "vodafone_cash", "instapay"
  referenceNumber  String?   // رقم التحويل (إدخال العميل)
  walletNumber     String?   // رقم المحفظة المحول منها
  receiptImageUrl  String?   // لقطة الشاشة
  notes            String?   // ملاحظات العميل
  status           String    // "pending" | "reviewing" | "approved" | "rejected"
  adminNote        String?   // سبب الرفض (يُعرض للعميل)
  adminReply       String?   // رد الإدارة على استفسار العميل
  reviewedBy       String?
  reviewedAt       DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([customerId, createdAt])
  @@index([status, createdAt])
}

// جدول لمتابعة محادثة الدفع (اختياري)
model PaymentConversation {
  id        String   @id
  paymentId String
  sender    String   // "admin" | "client"
  message   String
  createdAt DateTime @default(now())

  @@index([paymentId, createdAt])
}
```

### 7.4 حالات الدفع

```
🟡 PENDING     — العميل أرسل طلب الدفع
🔵 REVIEWING   — الإادة تتفقده حالياً
🟢 APPROVED    — تم التفعيل
🔴 REJECTED    — مرفوض مع سبب
```

---

## 8. لوحة إدارة الاشتراكات

### 8.1 هيكل القسم الجديد

```
/admin/subscriptions/
├── page.tsx                    # الرئيسية — ملخص الاشتراكات
├── payments/
│   └── page.tsx                # إدارة المدفوعات (الطلبات الجديدة)
├── requests/
│   └── page.tsx                # كل طلبات الاشتراك
├── active/
│   └── page.tsx                # الاشتراكات النشطة
├── expired/
│   └── page.tsx                # المنتهية
├── plans/
│   └── page.tsx                # إدارة الباقات
└── history/
    └── page.tsx                # سجل المدفوعات
```

### 8.2 صفحة المدفوعات (Payments)

```
┌────────────────────────────────────────────────────┐
│ 💳 إدارة المدفوعات                                 │
│                                                    │
│ [الكل] [🟡 معلقة: 3] [🟢 مقبولة: 15] [🔴 مرفوضة: 2] │
│                                                    │
│ ┌──────────────────────────────────────────────┐  │
│ │ 🟡  #P2401  أحمد ومريم   1,200 ج  فودافون كاش │  │
│ │    ‏منذ 15 دقيقة    [تفعيل] [رفض] [عرض]       │  │
│ ├──────────────────────────────────────────────┤  │
│ │ 🟡  #P2402  خالد وسارة   600 ج   InstaPay    │  │
│ │    ‏منذ ساعتين      [تفعيل] [رفض] [عرض]       │  │
│ └──────────────────────────────────────────────┘  │
│                                                    │
│ عند الضغط على [عرض]:                               │
│ ┌──────────────────────────────────────────────┐  │
│ │ بيانات العميل                                  │  │
│ │ الاسم: أحمد محمد                               │  │
│ │ الدعوة: badr-sarah-1                          │  │
│ │ الباقة: Pro — 1,200 ج                         │  │
│ │ طريقة الدفع: فودافون كاش                       │  │
│ │ رقم التحويل: 123456789                        │  │
│ │ من محفظة: 01012345678                         │  │
│ │ الإيصال: [🖼 عرض الصورة]                      │  │
│ │                                               │  │
│ │ [✅ تفعيل الاشتراك]  [❌ رفض — اكتب سبباً]     │  │
│ └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### 8.3 إجراءات سريعة على كل عميل (في CRM)

عند فتح ملف أي عميل (`/admin/customers/[id]` أو `/admin/invitations-customers/[code]`):

```
┌─────────────────────────────────────┐
│  حالة العميل: 🟡 تجريبي             │
│  باقي: يوم واحد                     │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔓 فتح الدعوة               │   │
│  │ 👤 فتح لوحة التحكم (Impersonate)│  │
│  │ ✅ تفعيل الاشتراك            │   │
│  │ ⏸ إيقاف الدعوة              │   │
│  │ ⏱ تمديد التجربة (+3 أيام)   │   │
│  │ 🔔 إرسال إشعار              │   │
│  │ ✏️ تغيير الرسالة            │   │
│  │ 🗑 حذف                      │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 8.4 API Routes للإدارة

| المسار | الوظيفة |
|--------|---------|
| `GET /api/admin/subscriptions/payments` | قائمة المدفوعات مع فلترة |
| `GET /api/admin/subscriptions/payments/[id]` | تفاصيل دفع |
| `POST /api/admin/subscriptions/payments/[id]/approve` | تفعيل الاشتراك |
| `POST /api/admin/subscriptions/payments/[id]/reject` | رفض مع سبب |
| `GET /api/admin/subscriptions/plans` | قائمة الباقات |
| `POST /api/admin/subscriptions/plans` | إضافة/تعديل باقة |
| `DELETE /api/admin/subscriptions/plans/[id]` | حذف باقة |
| `POST /api/admin/customers/[id]/activate` | تفعيل مباشر |
| `POST /api/admin/customers/[id]/suspend` | إيقاف |
| `POST /api/admin/customers/[id]/unsuspend` | إلغاء الإيقاف |
| `POST /api/admin/customers/[id]/extend-trial` | تمديد التجربة (أيام+) |
| `DELETE /api/admin/customers/[id]` | حذف (Soft) |
| `POST /api/admin/customers/[id]/restore` | استعادة محذوف |

---

## 9. صفحة "اشتراكي" — لوحة العميل

### 9.1 الموقع

```
/client/[code]/subscription
```

### 9.2 المحتوى

```
┌─────────────────────────────────────────────┐
│  💳 اشتراكي                                 │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  🟢 نشط                               │ │
│  │                                       │ │
│  │  الباقة:     Pro                      │ │
│  │  المدة:     سنوي                      │ │
│  │  البداية:   1 يونيو 2026              │ │
│  │  النهاية:   1 يونيو 2027              │ │
│  │  المتبقي:   324 يوم                   │ │
│  │                                       │ │
│  │  [تجديد الاشتراك]  [ترقية الباقة]     │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ─── سجل المدفوعات ───                      │
│  ┌───────────────────────────────────────┐ │
│  │ 🟢  1 يونيو 2026  Pro  سنة  1,200 ج  │ │
│  │ 🔴  1 مارس 2026   لقطة غير واضحة     │ │
│  │    ملاحظة الإدارة: يرجى إعادة رفع     │ │
│  │    الإيصال بصورة أوضح                 │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 9.3 الأزرار حسب الحالة

| الحالة | الزر الأساسي | الزر الثانوي |
|--------|-------------|-------------|
| TRIAL | فَعِّل دعوتك | — |
| ACTIVE | تجديد الاشتراك | ترقية الباقة |
| EXPIRED | فَعِّل دعوتك للعودة | — |
| SUSPENDED | (لا شيء — الرجاء التواصل) | — |

---

## 10. مركز الطلبات

### 10.1 الموقع

```
/client/[code]/orders
```

### 10.2 الوظيفة

بعد أن يضغط العميل "تم التحويل"، يقصد هذه الصفحة لمتابعة حالة طلبه:

```
┌─────────────────────────────────────────────┐
│  📋 مركز الطلبات                            │
│                                             │
│  ┌───────────────────────────────────────┐ │
│  │  🟡 في انتظار المراجعة                │ │
│  │                                       │ │
│  │  الطلب:    #P2401                     │ │
│  │  الباقة:   Pro — سنوي — 1,200 ج      │ │
│  │  الدفع:    فودافون كاش                │ │
│  │  التاريخ:  1 يونيو 2026               │ │
│  │                                       │ │
│  │  🖼 [الإيصال المرفوع]                  │ │
│  │                                       │ │
│  │  ملاحظات: لا توجد                     │ │
│  └───────────────────────────────────────┘ │
│                                             │
│  ─── أرشيف الطلبات ───                     │
│  ┌───────────────────────────────────────┐ │
│  │ 🟢  15 مايو 2026  تفعيل Pro — 1,200 ج│ │
│  │ 🟢  1 يناير 2026  تفعيل Starter — 0  │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 10.3 حالات الطلب في مركز الطلبات

| الحالة | الشكل | المعنى |
|--------|-------|--------|
| 🟡 في انتظار المراجعة | Badge أصفر | الإدارة لم تراجع بعد |
| 🔵 جاري التحقق | Badge أزرق | الإادة تتفقد الدفع |
| 🟢 تم التفعيل | Badge أخضر | تم تفعيل الاشتراك |
| 🔴 يوجد مشكلة | Badge أحمر + رسالة | الإدارة كتبت ملاحظة |

---

## 11. المخطط التقني (Technical Architecture)

### 11.1 هيكل قاعدة البيانات — التعديلات

```prisma
// === إضافات جديدة ===

enum CustomerSubscriptionStatus {
  TRIAL
  ACTIVE
  EXPIRED
  SUSPENDED
  CANCELLED
}

model SubscriptionPlan {
  id             String   @id @default(cuid())
  slug           String   @unique
  nameAr         String
  nameEn         String
  description    String?
  priceYearly    Decimal  @db.Decimal(10, 2)
  durationDays   Int      @default(365)
  features       Json     @default("[]")
  recommended    Boolean  @default(false)
  enabled        Boolean  @default(true)
  sortOrder      Int      @default(0)
  payments       Payment[]
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([enabled, sortOrder])
}

model Payment {
  id               String    @id @default(cuid())
  customerId       String
  customer         Customer  @relation(fields: [customerId], references: [id])
  invitationCode   String?
  planId           String
  plan             SubscriptionPlan @relation(fields: [planId], references: [id])
  amount           Decimal   @db.Decimal(10, 2)
  method           String    // "vodafone_cash" | "instapay"
  referenceNumber  String?
  walletNumber     String?
  receiptImageUrl  String?
  notes            String?
  status           String    @default("pending") // pending | reviewing | approved | rejected
  adminNote        String?
  reviewedBy       String?
  reviewedAt       DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([customerId, createdAt])
  @@index([status, createdAt])
}

model ClientNotification {
  id             String    @id @default(cuid())
  invitationCode String?   // null = جميع الدعوات
  type           String    // "banner" | "popup" | "in-app"
  title          String
  body           String
  color          String?   // hex or named color
  startDate      DateTime?
  expiryDate     DateTime?
  dismissible    Boolean   @default(true)
  dismissedBy    Json?     // { invitationCode: string; dismissedAt: string }[]
  createdBy      String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([type, startDate, expiryDate])
  @@index([invitationCode])
}

// === تعديلات على Customer ===

model Customer {
  // ... الحقول الموجودة ...

  subscriptionStatus      CustomerSubscriptionStatus @default(TRIAL)
  subscriptionPlanId      String?
  subscriptionPlan        SubscriptionPlan? @relation(fields: [subscriptionPlanId], references: [id])
  subscriptionStartDate   DateTime?
  subscriptionEndDate     DateTime?
  trialEndsAt             DateTime?
  suspendedAt             DateTime?
  suspendedReason         String?
  payments                Payment[]
}
```

### 11.2 مكتبات جديدة (lib/)

| الملف | المسؤولية |
|-------|-----------|
| `lib/pricing.ts` | تعريف الباقات الافتراضية، مقارنة الباقات، دوال التنسيق |
| `lib/subscription.ts` | `getCustomerStatus()`, `activateSubscription()`, `extendTrial()`, `suspendCustomer()`, `getRemainingDays()`, `isSubscriptionExpired()`, `canAccessFeature()` |
| `lib/payment.ts` | `createPayment()`, `approvePayment()`, `rejectPayment()`, `getPaymentsByCustomer()` |
| `lib/activate.ts` | `createActivationOrder()`, `submitPaymentReceipt()`, `getActivationStatus()` |
| `lib/client-notifications.ts` | `createNotification()`, `getActiveNotifications()`, `dismissNotification()`, `getDismissedNotifications()` |

### 11.3 الـ API Routes الجديدة

```
/app/api/
├── activate/
│   ├── route.ts              POST — بدء طلب تفعيل
│   └── submit-payment/
│       └── route.ts          POST — رفع إيصال الدفع
├── admin/
│   ├── subscriptions/
│   │   ├── route.ts          GET — إحصائيات الاشتراكات
│   │   ├── payments/
│   │   │   ├── route.ts      GET — قائمة المدفوعات
│   │   │   └── [id]/
│   │   │       ├── approve/
│   │   │       │   └── route.ts  POST — تفعيل
│   │   │       └── reject/
│   │   │           └── route.ts  POST — رفض
│   │   ├── plans/
│   │   │   ├── route.ts      GET/POST — الباقات
│   │   │   └── [id]/
│   │   │       └── route.ts  PUT/DELETE
│   │   └── customers/
│   │       └── [id]/
│   │           ├── activate/
│   │           │   └── route.ts  POST
│   │           ├── suspend/
│   │           │   └── route.ts  POST
│   │           ├── unsuspend/
│   │           │   └── route.ts  POST
│   │           ├── extend-trial/
│   │           │   └── route.ts  POST
│   │           └── restore/
│   │               └── route.ts  POST
│   └── client-notifications/
│       ├── route.ts          GET/POST
│       └── [id]/
│           └── route.ts      DELETE
└── client/
    └── [code]/
        ├── notifications/
        │   └── route.ts      GET — الإشعارات النشطة
        ├── payments/
        │   └── route.ts      GET — سجل المدفوعات
        └── subscription/
            └── route.ts      GET — بيانات الاشتراك
```

### 11.4 المكونات الجديدة (components/)

| المكون | الوظيفة |
|--------|---------|
| `SubscriptionStatusBadge.tsx` | شارة 🟢 🟡 🟠 🔴 حسب الحالة |
| `SubscriptionBanner.tsx` | Banner التجربة مع العد التنازلي |
| `PricingCards.tsx` | بطاقات الباقات مع المقارنة |
| `PaymentForm.tsx` | نموذج الدفع (إدخال رقم المحفظة + رفع الإيصال) |
| `SubscriptionSummary.tsx` | ملخص الاشتراك قبل الدفع |
| `PaymentHistory.tsx` | سجل المدفوعات |
| `ClientNotificationBanner.tsx` | Banner الإشعار في لوحة العميل |
| `ClientNotificationPopup.tsx` | Popup الإشعار |
| `AdminPaymentReviewCard.tsx` | بطاقة مراجعة الدفع للأدمن |
| `AdminCustomerActions.tsx` | أزرار الإجراءات السريعة (تفعيل، إيقاف، تمديد...) |
| `AdminSubscriptionFilters.tsx` | فلاتر الاشتراكات للأدمن |
| `ActivateSubscriptionFlow.tsx` | تدفق التفعيل الكامل (Stepper) |

---

## 12. قائمة الملفات

### 12.1 ملفات جديدة

```
# البنية التحتية
prisma/schema.prisma                          # (تعديل)
lib/pricing.ts                                # تعريف الباقات
lib/subscription.ts                           # دوال الاشتراك
lib/subscription-status.ts                    # حالات العميل المحسوبة
lib/payment.ts                                # دوال المدفوعات
lib/activate.ts                               # دوال التفعيل
lib/client-notifications.ts                   # دوال الإشعارات

# المكونات
components/SubscriptionStatusBadge.tsx
components/SubscriptionBanner.tsx
components/PricingCards.tsx
components/PaymentForm.tsx
components/SubscriptionSummary.tsx
components/PaymentHistory.tsx
components/ClientNotificationBanner.tsx
components/ClientNotificationPopup.tsx
components/AdminPaymentReviewCard.tsx
components/AdminCustomerActions.tsx
components/AdminSubscriptionFilters.tsx
components/ActivateSubscriptionFlow.tsx

# صفحات التفعيل (عام)
app/activate/page.tsx
app/activate/layout.tsx
app/activate/payment/page.tsx
app/activate/success/page.tsx

# صفحات العميل
app/client/[code]/subscription/page.tsx
app/client/[code]/orders/page.tsx

# صفحة انتهاء التجربة
app/client/expired/page.tsx

# صفحات الإدارة
app/admin/subscriptions/page.tsx
app/admin/subscriptions/layout.tsx
app/admin/subscriptions/payments/page.tsx
app/admin/subscriptions/requests/page.tsx
app/admin/subscriptions/active/page.tsx
app/admin/subscriptions/expired/page.tsx
app/admin/subscriptions/plans/page.tsx
app/admin/subscriptions/history/page.tsx

# API Routes
app/api/activate/route.ts
app/api/activate/submit-payment/route.ts
app/api/admin/subscriptions/route.ts
app/api/admin/subscriptions/payments/route.ts
app/api/admin/subscriptions/payments/[id]/approve/route.ts
app/api/admin/subscriptions/payments/[id]/reject/route.ts
app/api/admin/subscriptions/plans/route.ts
app/api/admin/subscriptions/plans/[id]/route.ts
app/api/admin/subscriptions/customers/[id]/activate/route.ts
app/api/admin/subscriptions/customers/[id]/suspend/route.ts
app/api/admin/subscriptions/customers/[id]/unsuspend/route.ts
app/api/admin/subscriptions/customers/[id]/extend-trial/route.ts
app/api/admin/subscriptions/customers/[id]/restore/route.ts
app/api/admin/client-notifications/route.ts
app/api/admin/client-notifications/[id]/route.ts
app/api/client/[code]/notifications/route.ts
app/api/client/[code]/payments/route.ts
app/api/client/[code]/subscription/route.ts
```

### 12.2 ملفات قابلة للتعديل

```
lib/admin-crm-status.ts       # إضافة حالات الاشتراك
lib/admin-crm.ts              # إضافة بيانات الاشتراك إلى Profile
lib/admin-data.ts             # إضافة indexedBy للحالات الجديدة
lib/admin-partners.ts         # (قد) نحتاج ربط اشتراكات الشركاء
lib/client-messages.ts        # تكامل مع ClientNotification
prisma/seed.ts                # (إن وجد) إضافة الباقات الافتراضية

app/admin/invitations-customers/page.tsx      # فلاتر + أزرار إجراءات
app/admin/invitations-customers/[code]/page.tsx # بطاقة الاشتراك + أزرار
app/admin/customers/[id]/page.tsx             # بطاقة الاشتراك
app/admin/orders/page.tsx                    # إظهار حالة اشتراك العميل
app/admin/layout.tsx                         # إضافة رابط "الاشتراكات" في الشريط الجانبي
app/admin/notifications/page.tsx             # إضافة قسم إشعارات العملاء
app/order/success/page.tsx                   # توجيه للوحة التحكم بدلاً من واتساب
app/[code]/ad_3399/page.tsx                  # إضافة Banner + زر تفعيل
```

---

## 13. الجدول الزمني

### المرحلة 1: البنية التحتية (3 أيام)
**اليوم 1:**
- إضافة `CustomerSubscriptionStatus` enum + `SubscriptionPlan` model + `Payment` model + `ClientNotification` model
- إضافة حقول `subscription*` إلى `Customer`
- تشغيل `prisma migrate`
- إنشاء ملفات `lib/pricing.ts`, `lib/subscription.ts`, `lib/subscription-status.ts`

**اليوم 2:**
- إنشاء `lib/payment.ts`, `lib/activate.ts`, `lib/client-notifications.ts`
- إنشاء API Routes الأساسية (GET للخطط، إنشاء دفع، إلخ)

**اليوم 3:**
- إنشاء الـ seed data للباقات الافتراضية
- كتابة اختبارات للدوال الأساسية

### المرحلة 2: حالات العميل + CRM (3 أيام)
**اليوم 4:**
- تعديل `lib/admin-crm-status.ts` لدعم حالات الاشتراك
- إنشاء `SubscriptionStatusBadge.tsx` و `SubscriptionBanner.tsx`

**اليوم 5:**
- إضافة أزرار الإجراءات السريعة في صفحة `invitations-customers`
- تعديل صفحة `customers/[id]` بإظهار بيانات الاشتراك

**اليوم 6:**
- إنشاء `AdminCustomerActions.tsx`
- تعديل صفحة `invitations-customers/[code]` بإظهار بطاقة الاشتراك
- إنشاء صفحة `client/expired`

### المرحلة 3: الإشعارات (يومان)
**اليوم 7:**
- إنشاء `ClientNotificationBanner.tsx` و `ClientNotificationPopup.tsx`
- إنشاء API Routes للإشعارات
- تعديل صفحة `admin/notifications` بإضافة قسم إشعارات العملاء

**اليوم 8:**
- دمج الإشعارات في لوحة العميل (`[code]/ad_3399`)
- اختبار نظام العرض والإخفاء

### المرحلة 4: صفحة التفعيل + الدفع (4 أيام)
**اليوم 9:**
- إنشاء `PricingCards.tsx` و `SubscriptionSummary.tsx`
- إنشاء `app/activate/page.tsx` مع اختيار الباقة

**اليوم 10:**
- إنشاء `PaymentForm.tsx`
- إنشاء `app/activate/payment/page.tsx`

**اليوم 11:**
- إنشاء `app/activate/success/page.tsx`
- إنشاء API Routes للتفعيل ورفع الإيصال

**اليوم 12:**
- رفع الصور (الإيصالات) وتخزينها
- الربط بين صفحة التفعيل ونظام الاشتراكات

### المرحلة 5: لوحة إدارة الاشتراكات (3 أيام)
**اليوم 13:**
- إنشاء `app/admin/subscriptions/layout.tsx` مع tabs
- إنشاء صفحة `subscriptions/payments` مع `AdminPaymentReviewCard.tsx`

**اليوم 14:**
- إنشاء API Routes للموافقة/الرفض على المدفوعات
- إنشاء صفحات `active`, `expired`, `requests`, `history`

**اليوم 15:**
- إنشاء صفحة `subscriptions/plans` لإدارة الباقات
- إضافة القسم إلى شريط التنقل الجانبي للأدمن

### المرحلة 6: التكامل النهائي (يومان)
**اليوم 16:**
- إنشاء صفحة "اشتراكي" (`client/[code]/subscription`)
- إنشاء مركز الطلبات (`client/[code]/orders`)
- دمج Banner في `[code]/ad_3399`

**اليوم 17:**
- تعديل `order/success` لتحويل المسار إلى لوحة التحكم
- اختبار شامل لجميع السيناريوهات
- تعديلات وتحسينات نهائية

---

## ملاحظات إضافية

### الأمان
- جميع API Routes محمية بـ middleware
- رفع الإيصالات: فحص نوع الملف (images only: jpg, png, webp)
- التحقق من حجم الملف (max 5MB)
- الـ Impersonate: متاح فقط للأدمن مع تسجيل Audit Log

### الأداء
- استخدام `unstable_noStore()` للبيانات الحية (المدفوعات، الحالة)
- استخدام `React.cache()` للبيانات الثابتة (الباقات)
- Pagination في قائمة المدفوعات

### التوسع المستقبلي
- إضافة بوابة دفع إلكترونية (Paymob, Fawry, Stripe) — فقط نضيف `method` جديد
- إضافة تذكير تلقائي بانتهاء الاشتراك (نظام الإشعارات جاهز)
- تقارير الإيرادات (كل البيانات موجودة في `Payment`)
- كوبونات خصم على الاشتراكات (موجود فعلاً نظام `DiscountPromoCode`)

---

*آخر تحديث: 6 يوليو 2026*
