# تقرير التدقيق المعماري الشامل
## Architectural Audit & Compatibility Report
### BadrDaawa — منصة الدعوات الإلكترونية

**تاريخ التقرير:** 6 يوليو 2026
**المراجع:** Senior Software Architect
**الغرض:** تدقيق النظام الحالي بالكامل قبل إضافة نظام الاشتراكات والمدفوعات

---

## القسم الأول: نظرة عامة على المشروع

### 1.1 فكرة المشروع

منصة إلكترونية متكاملة لإنشاء وإدارة دعوات الزفاف الإسلامية. تتيح للمستخدم (العروسين) إنشاء دعوة زفاف رقمية من خلال اختيار قالب وتعبئة بيانات الحفل (التاريخ، المكان، الصور، الموسيقى، قصة الحب)، ثم نشرها كصفحة ويب قابلة للمشاركة مع الضيوف.

### 1.2 الهدف

تقديم بديل رقمي متكامل لدعوات الزفاف الورقية مع ميزات تفاعلية:
- RSVP (تأكيد الحضور)
- مشاركة الصور والموسيقى
- QR Code للدعوة
- إحصائيات الزوار والمؤكدين
- بث مباشر للحفل
- سجل التهاني (Guest Book)
- تسجيل الوصول (Check-in) يوم الزفاف

### 1.3 أنواع المستخدمين

1. **الزوار (عامة)** — يشاهدون الدعوة المنشورة
2. **الضيوف (مدعوون)** — يؤكدون الحضور، يكتبون تهنئة
3. **العروسان (عملاء)** — يدخلون لوحة التحكم الخاصة بدعوتهم عبر `/code/ad_3399`
4. **المشرفون (Admin)** — يديرون المنصة بالكامل عبر `/admin/`
5. **الشركاء (Partners)** — مصورين، قاعات، منظمين... إلخ

### 1.4 رحلة المستخدم الحالية

```
الزائر → /order → يملأ OrderForm (7 خطوات) → يرسل الطلب
  ← يُعرض له رابط واتساب لإرسال الطلب للأدمن
  ← الأدمن يراجع الطلب في /admin/orders
  ← الأدمن ينشئ الدعوة (يحول الطلب إلى Invitation)
  ← يتم إنشاء Customer تلقائياً
  ← العميل يدخل لوحة التحكم عبر /{code}/ad_3399
  ← العميل يعدل بياناته، يشاهد الحضور، يرسل رسائل
  ← الدعوة منشورة على /{code} أو /{customSlug}
```

### 1.5 طريقة التشغيل

- **Runtime:** Node.js 22 (Docker)
- **Framework:** Next.js 15.5.6 (App Router)
- **Database:** PostgreSQL عبر Prisma ORM
- **Storage:** محلي (Railway Volume) مع دعم S3/R2
- **Cache:** لا يوجد (Redis, Memcached)
- **Queue:** لا يوجد (تنفيذ مباشر)
- **Cron:** Railway Cron Job (كل ساعة)
- **Git Sync:** GitHub API للمحتوى والنسخ الاحتياطي

### 1.6 تدفق البيانات داخل النظام

```
Client Browser (User)
    ↓ HTTPS
Next.js Edge (Middleware)
    ↓
Next.js Server Components (RSC)
    ↓
API Routes (Node.js runtime)
    ↓
lib/ Services
    ↓
Prisma ORM → PostgreSQL
Storage Provider → Local Filesystem / S3
GitHub API → Remote Backup
    ↓
Response → Client Browser
```

---

## القسم الثاني: Architecture

### 2.1 App Router Structure

```
app/
├── (page.tsx)        ← الصفحة الرئيسية (SSR)
├── layout.tsx         ← Root Layout (RTL, fonts)
├── globals.css        ← 32,000+ سطر CSS
├── [code]/            ← Route param: invitation code
│   ├── page.tsx       ← عرض الدعوة العامة
│   └── ad_3399/       ← لوحة العميل (محمية)
│       ├── page.tsx   ← Dashboard
│       └── login/     
├── admin/             ← لوحة الإدارة (محمية)
│   ├── layout.tsx     ← Admin Shell + DashboardShell
│   └── 40+ صفحة
├── api/               ← REST API
│   ├── admin/         ← ~80 route file
│   ├── client/        ← ~5 route files
│   ├── auth/          ← 4 route files
│   ├── cron/          ← 2 route files
│   ├── invitations/   ← 6 route files
│   ├── orders/        ← 5 route files
│   └── ...
├── client/            ← Public client pages
├── manage/            ← Manage token-based access
├── order/             ← Order creation flow
└── templates/          ← Template browsing
```

### 2.2 Data Flow Architecture

```
                        ┌─────────────┐
                        │   Browser   │
                        └──────┬──────┘
                               │
                     ┌─────────▼─────────┐
                     │    Middleware      │
                     │  (auth check)      │
                     └─────────┬─────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐    ┌───────▼───────┐    ┌───────▼───────┐
   │ Server      │    │  Server       │    │  API Route    │
   │ Components  │    │  Actions      │    │  (REST)       │
   └──────┬──────┘    └───────┬───────┘    └───────┬───────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
          ┌────────────────────▼────────────────────┐
          │            lib/ Services                │
          │  (admin-data, invitation-data, backups) │
          └────────────────────┬────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   ┌──────▼──────┐    ┌───────▼───────┐    ┌───────▼───────┐
   │   Prisma    │    │    Storage    │    │   GitHub API  │
   │ (PostgreSQL)│    │  (local/S3)   │    │   (sync/backup)│
   └─────────────┘    └───────────────┘    └───────────────┘
```

### 2.3 Authentication Architecture

```
Admin Auth:
  POST /api/auth/admin/login → createAdminSession()
    ← Cookie: bd_admin_session (HMAC-SHA256, 12hr)
    ← Middleware يتحقق لكل /admin/* و /api/admin/*

Client Auth:
  POST /api/auth/client/login → createClientSession()
    ← Cookie: bd_client_session (HMAC-SHA256, 12hr)
    ← Middleware يتحقق لكل /{code}/ad_3399/*

Custom Session Implementation:
  - لا JWT
  - لا NextAuth.js
  - HMAC-SHA256 مع nonce عشوائي
  - صلاحية 12 ساعة
```

### 2.4 Content Management Architecture

```
Content Store (Git-based CMS):
  - المحتوى يُخزن كـ JSON في data/ (draft)
  - عند النشر: يُرفع إلى GitHub + يُسجل في ContentVersion
  - كل نوع محتوى له draft/published نسختين
  - أنواع المحتوى: site-settings, home-content, legal-pages, 
    music-library, template-settings, content-presets, message-templates

  project-content-store.ts ← يدير كل عمليات القراءة/الكتابة
  publish-pipeline.ts ← ينشر كل المحتوى دفعة واحدة
  publish-rollback.ts ← يسترجع إصدار سابق
```

---

## القسم الثالث: قاعدة البيانات

### 3.1 قائمة الجداول (21 Model)

| # | الجدول | عدد الحقول | الغرض | يستخدم فعلاً؟ |
|---|--------|-----------|-------|-------------|
| 1 | Customer | 12 | العملاء (اسم، هاتف، username، passwordHash) | ✅ |
| 2 | WeddingTemplate | 17 | تعريف القوالب (16 قالباً) | ✅ |
| 3 | Invitation | 45 | الدعوات الأساسية | ✅ |
| 4 | GuestRsvp | 10 | تأكيد الحضور | ✅ |
| 5 | OrderRequest | 31 | طلبات الدعوات | ✅ |
| 6 | Partner | 25 | الشركاء (مصورين، قاعات...) | ✅ |
| 7 | PartnerPromoCode | 19 | أكواد خصم الشركاء | ✅ |
| 8 | PartnerSubscription | 9 | اشتراكات الشركاء | ✅ |
| 9 | PartnerMessage | 16 | رسائل للشركاء | ✅ |
| 10 | PartnerMessageRecipient | 7 | مستلمي رسائل الشركاء | ✅ |
| 11 | PartnerUsageLog | 12 | سجل استخدام أكواد الشركاء | ✅ |
| 12 | PartnerActivityLog | 8 | سجل نشاط الشركاء | ✅ |
| 13 | PartnerFile | 7 | ملفات الشركاء | ✅ |
| 14 | PartnerTag | 4 | tags الشركاء | ✅ |
| 15 | PartnerTagAssignment | 4 | ربط tags بالشركاء | ✅ |
| 16 | DiscountPromoCode | 15 | أكواد الخصم المباشرة | ✅ |
| 17 | AnalyticsEvent | 6 | أحداث التحليلات (زيارات، نقرات) | ✅ |
| 18 | DynamicPage | 8 | صفحات ديناميكية مخصصة | ✅ |
| 19 | BackupJob | 11 | سجل النسخ الاحتياطي | ✅ |
| 20 | ContentVersion | 6 | إصدارات المحتوى | ✅ |
| 21 | SafeBackup | 6 | النسخ الآمنة المعلّمة | ✅ |
| 22 | SyncLog | 10 | سجل المزامنة مع GitHub | ✅ |
| 23 | RestoreLog | 9 | سجل عمليات الاسترجاع | ✅ |
| 24 | AppSetting | 3 | إعدادات التطبيق (key-value JSON) | ✅ |
| 25 | GuestBookMessage | 7 | رسائل التهاني | ✅ |
| 26 | CoupleMessagesSetting | 3 | إعدادات guest book | ✅ |
| 27 | ClientMessage | 8 | رسائل الإدارة للعملاء | ✅ |
| 28 | InvitationCheckIn | 5 | تسجيل الوصول | ✅ |
| 29 | WeddingLiveMode | 5 | البث المباشر | ✅ |
| 30 | InternalNote | 6 | ملاحظات داخلية | ✅ |
| 31 | AuditLog | 9 | سجل أحداث الإدارة | ✅ |

### 3.2 جداول إضافية (منشأة يدوياً)

| الجدول | Created via | الغرض |
|--------|------------|-------|
| push_subscriptions | CREATE TABLE IF NOT EXISTS | Web Push subscriptions |
| push_notifications | CREATE TABLE IF NOT EXISTS | Push notification history |

### 3.3 تحليل الجداول الهامة

#### Customer
- **وظيفته:** العملاء (العروسان)
- **حالات موجودة:** `isActive` (boolean) فقط
- **لا يوجد:** `subscriptionStatus`, `subscriptionEndDate`, `trialEndsAt`, `suspendedAt`
- **الملاحظة:** الحقول التالية موجودة بالفعل في `Invitation` وليست في `Customer`:
  - `trialDays`, `trialEndsAt`, `disabledAt`, `disabledBy`
- **هذا يعني:** حالياً الـ Trial مربوط بالـ Invitation وليس بالـ Customer

#### Invitation
- **وظيفته:** الدعوة الأساسية — يحتوي على 45 حقلاً
- **حالات موجودة:** `status` (DRAFT/ACTIVE/PAUSED/ARCHIVED) + `disabledAt` (system/manual)
- **موجود فعلاً:** `trialDays`, `trialEndsAt`, `disabledAt`, `disabledBy`, `isActive`
- **قاعدة حساب الحالة:** `getInvitationState()` في `lib/admin-crm-status.ts`
- **ملاحظة:** هذا الجدول كبير جداً (45 حقلاً) ويحتوي على حقول منفصلة للـ Trial

#### OrderRequest
- **وظيفته:** طلبات الدعوات قبل الموافقة
- **حالات موجودة:** `status` (NEW/REVIEWING/EDITED/PUBLISHED/ACCEPTED/REJECTED/CONVERTED)
- **غير موجود:** لا يوجد حقل `customerId` إلزامي (nullable)
- **ملاحظة:** تم إنشاء الطلب أولاً، ثم يتم ربطه بـ Customer لاحقاً

#### PartnerSubscription (موجود فعلاً!)
- **وظيفته:** إدارة اشتراكات الشركاء
- **حالات موجودة:** TRIAL, ACTIVE, PAST_DUE, EXPIRED, CANCELLED
- **هذا نموذج جاهز لإعادة الاستخدام** لنظام اشتراكات العملاء

### 3.4 العلاقات بين الجداول

```
Customer ──< Invitation
Customer ──< OrderRequest
Customer ──< Payment (مقترح)

WeddingTemplate ──< Invitation
WeddingTemplate ──< OrderRequest

Invitation ──< GuestRsvp
Invitation ──< AnalyticsEvent
Invitation ──< PartnerMessageRecipient
Invitation ──< ClientMessage
Invitation ──< GuestBookMessage
Invitation ──< InvitationCheckIn
Invitation ──< WeddingLiveMode
Invitation ──< CouplesMessagesSetting

OrderRequest ──< Partner (optional)
OrderRequest ──< PartnerPromoCode (optional)
OrderRequest ──< DiscountPromoCode (optional)

Partner ──< PartnerPromoCode
Partner ──< PartnerSubscription
Partner ──< PartnerMessage
Partner ──< PartnerFile
Partner ──< PartnerTagAssignment
Partner ──< PartnerUsageLog
Partner ──< PartnerActivityLog

AppSetting (standalone)
ContentVersion (standalone)
BackupJob (standalone)
SafeBackup (standalone)
SyncLog (standalone)
RestoreLog (standalone)
DynamicPage (standalone)
InternalNote (standalone)
AuditLog (standalone)
```

### 3.5 مشاكل في التصميم الحالي

1. **Trial مربوط بالـ Invitation وليس الـ Customer** — هذا يعني أن Customer قد يكون له دعوتان، كل واحدة بحالة Trial مختلفة
2. **OrderRequest.customerId nullable** — لا يوجد إلزام بربط الطلب بعميل
3. **Invitation يحتوي 45 حقلاً** — كبير جداً، بعض الحقول ممكن تكون في جدول منفصل (مثل postImage*)
4. **لا يوجد `Payment` model** — لا توجد أية بنية للمدفوعات
5. **لا يوجد `CustomerSubscription` model** — الاشتراكات موجودة للـ Partner فقط
6. **جدول `ClientMessage` يدعم `scope: "all"`** — هذا أقرب ما يكون لنظام إشعارات للعملاء
7. **الـ AuditLog يُستخدم لكل شيء** — قد يصبح عنق زجاجة مع كثرة العمليات

---

## القسم الرابع: دورة إنشاء الدعوة

### 4.1 التدفق الكامل خطوة بخطوة

#### الخطوة 1: المستخدم يفتح /order
```
ملف: app/order/page.tsx
المكون: OrderForm.tsx (2,712 سطر)
المدة: 7 خطوات (template → info → images → music → story → photographer → review)
```

#### الخطوة 2: إرسال الطلب POST /api/orders
```
ملف: app/api/orders/route.ts (420 سطر)

التحقق:
  1. isSameOriginRequest() — منع CSRF
  2. checkRateLimit() — تحديد المعدل
  3. content-length check — حد حجم 36MB
  4. orderRequestSchema.safeParse() — Zod validation

معالجة:
  5. saveOrderImages() — حفظ الصور في /uploads/
  6. resolveOrderMusic() — معالجة الموسيقى (رفع/رابط/فيديو)
  7. PromoCodeService.validatePromoCode() — التحقق من كود الخصم
  8. createReservedInvitationCode() — إنشاء كود دعوة فريد
  9. createReservedManageToken() — إنشاء token إدارة فريد

حفظ:
  10. WeddingTemplate.upsert() — تحديث/إنشاء القالب
  11. Deduplication check — منع التكرار
  12. Prisma $transaction — إنشاء OrderRequest
  13. PromoCodeService.recordPromoOrderApplication() — تسجيل استخدام الكود
  14. recordAuditLog() — تسجيل في audit log

الرد:
  15. buildReservedInvitationLinks() — إنشاء روابط الدعوة
  16. buildOrderWhatsAppMessage() — بناء رسالة واتساب
  17. ← إرجاع { ok, whatsappUrl, invitationCode, adminUrl, publicUrl }
```

#### الخطوة 3: صفحة النجاح
```
ملف: app/order/success/page.tsx

المحتوى الحالي:
  - يعرض كود الدعوة
  - يعرض رابط الإدارة (/{code}/ad_3399)
  - يعرض رابط المشاركة
  - الزر الأساسي: "أرسل للأدمن عبر واتساب" (whatsappUrl)
  - نص: "فقط أرسل هذه الرسالة إلى الأدمن وسوف نقوم بمراجعة الدعوة ونشرها"
```

#### الخطوة 4: مراجعة الأدمن
```
ملف: app/admin/orders/page.tsx
المكون: AdminOrderRequestsManager

الإجراءات:
  - عرض الطلب
  - تغيير الحالة (NEW → REVIEWING → PUBLISHED/REJECTED)
  - تحويل الطلب إلى دعوة (CONVERTED)
  - إضافة ملاحظات داخلية
```

#### الخطوة 5: تحويل الطلب إلى دعوة
```
ملف: app/api/admin/orders/ (route.ts + [id]/route.ts)

العمليات:
  1. إنشاء Customer عبر resolveOrCreateCustomerForInvitation()
     (lib/customer-identity.ts)
  2. إنشاء Invitation وربطه بـ Customer
  3. تعيين trialEndsAt (إذا موجود)
  4. تعيين status = ACTIVE (أو DRAFT)
  5. تحديث OrderRequest.status = CONVERTED
```

#### الخطوة 6: العميل يدخل لوحة التحكم
```
مسار: /{code}/ad_3399
ملف: app/[code]/ad_3399/page.tsx

التحقق:
  - Middleware يتحقق من Client Session Cookie
  - autoDisableExpiredTrial() — لو انتهت التجربة
  - التحقق من disabledAt, pending/rejected orders

تحميل البيانات:
  - getInvitationByCode() — الدعوة
  - getGuestsByInvitation() — الضيوف
  - getClientMessages() — رسائل الإدارة
  - 10+ دوال أخرى للبيانات

العرض:
  - AdminMessagesBanner — رسائل الإدارة
  - ClientDashboardShell — لوحة التحكم الكاملة
```

### 4.2 ملاحظات هامة

- **الواتساب هو قناة التواصل الأساسية** بعد إنشاء الطلب
- **لا يوجد توجيه تلقائي** إلى لوحة التحكم بعد النجاح
- **إنشاء Customer** يحدث متأخراً (عند التحويل وليس عند تقديم الطلب)
- **الـ manageToken** يُستخدم للدخول إلى لوحة التحكم (بدون كلمة مرور ثابتة)

---

## القسم الخامس: لوحة الإدارة

### 5.1 جميع الصفحات والأقسام

```
الأقسام الرئيسية (7 أقسام، 40+ صفحة):

1. جهات الاتصال (9 صفحات)
   ├── /admin                    ← الرئيسية (Dashboard)
   ├── /admin/invitations        ← الدعوات المنشورة
   ├── /admin/orders             ← الدعوات المعلقة
   ├── /admin/new-invitation     ← إنشاء دعوة
   ├── /admin/invitations-customers  ← عملاء الدعوات (CRM)
   ├── /admin/customers          ← كل العملاء
   ├── /admin/messages           ← الرسائل
   ├── /admin/guest-book         ← التهاني
   └── /admin/message-templates  ← قوالب الرسائل

2. أكواد الخصم (4 صفحات)
   ├── /admin/promo-codes/photographers
   ├── /admin/promo-codes/discounts
   ├── /admin/promo-codes/history
   └── /admin/promo-codes/health

3. المحتوى ومساحة العمل (11 صفحة)
   ├── /admin/templates → القوالب
   ├── /admin/music → الموسيقى
   ├── /admin/media → الوسائط
   ├── /admin/pages → الصفحات
   ├── /admin/preview → المعاينة
   ├── /admin/broadcast → تصفح الموقع
   ├── /admin/content-presets → النصوص الجاهزة
   ├── /admin/legal → الصفحات القانونية
   ├── /admin/search → البحث العام
   ├── /admin/texts → النصوص
   ├── /admin/recent-edits → آخر التعديلات
   └── /admin/favorites → المفضلة

4. الفعاليات (4 صفحات)
   ├── /admin/attendance → الحضور
   ├── /admin/check-ins → تسجيل الوصول
   ├── /admin/live-mode → البث المباشر
   └── /admin/analytics → التحليلات

5. التغيرات والإصدارات (2 صفحة)
   ├── /admin/publish → التغيرات والإصدارات
   └── /admin/versions → الإصدارات والاسترجاع

6. التنظيف والصيانة (1 صفحة)
   └── /admin/cleanup → لوحة التنظيف

7. النظام والنسخ الاحتياطي (12 صفحة)
   ├── /admin/settings → إعدادات الموقع
   ├── /admin/photographer-logo → شعار المصور
   ├── /admin/notifications → الإشعارات
   ├── /admin/backups → النسخ الاحتياطي
   ├── /admin/system-health → صحة النظام
   ├── /admin/monitoring → المراقبة
   ├── /admin/diagnostics → التشخيص
   ├── /admin/audit-log → سجل الأحداث
   ├── /admin/errors → تقارير الأخطاء
   ├── /admin/trash → سلة المهملات
   ├── /admin/sync-settings → إعدادات GitHub
   ├── /admin/sync → المزامنة
   ├── /admin/sync-history → سجل المزامنة
   └── /admin/tasks → المهام المجدولة
```

### 5.2 تحليل الأقسام الأساسية

| الصفحة | ملف الـ Page | المكون المسؤول | يستخدم Prisma؟ | قابل للتوسع؟ |
|--------|------------|---------------|---------------|-------------|
| /admin/invitations | `page.tsx` (251 سطر) | — | ✅ getAdminInvitations() | ✅ |
| /admin/orders | `page.tsx` | AdminOrderRequestsManager | ✅ | ✅ |
| /admin/invitations-customers | `page.tsx` (252 سطر) | AdminContactsCommandCenter, AdminInvitationFiltersV2 | ✅ admin-data.ts | ✅ |
| /admin/customers | `page.tsx` | — | ✅ | ✅ |
| /admin/customers/[id] | `page.tsx` (294 سطر) | ClientCustomerEditor | ✅ admin-crm.ts | ✅ |
| /admin/invitations-customers/[code] | `page.tsx` (453 سطر) | CopyButton, InternalNotesPanel, FavoriteToggleButton | ✅ | ✅ |

### 5.3 الصفحات التي لا يجب المساس بها

- `/admin/backups/*` — نظام النسخ الاحتياطي (حساس)
- `/admin/publish/*` — نظام النشر (حساس)
- `/admin/versions/*` — إدارة الإصدارات
- `/admin/sync/*` — المزامنة مع GitHub
- `/admin/cleanup/*` — التنظيف (حساس)
- `/admin/system-health/*` — صحة النظام
- `/admin/tasks/*` — المهام المجدولة

### 5.4 الصفحات القابلة للتوسع

- `/admin/invitations-customers` — إضافة فلاتر الاشتراك + إجراءات CRM
- `/admin/invitations-customers/[code]` — إضافة بطاقة الاشتراك
- `/admin/customers/[id]` — إضافة بيانات الاشتراك
- `/admin/notifications` — إضافة قسم "إشعارات العملاء"
- `/admin/messages` — إضافة مراسلات الدفع
- `/admin/orders` — إظهار حالة اشتراك العميل

---

## القسم السادس: لوحة العميل

### 6.1 كيف تعمل

**الدخول:**
```
مسار: /{code}/ad_3399
طريقة الدخول: 
  1. العميل يدخل كود الدعوة + كلمة المرور في /client
  2. أو عبر رابط مباشر مع manageToken: /manage/invitation/{token}
  3. الـ middleware يتحقق من Client Session Cookie
```

**تحميل البيانات:**
```
صفحة: app/[code]/ad_3399/page.tsx (156 سطر — Server Component)

التحميلات المتزامنة (11 Promise.all):
  1. getInvitationByCode() ← Prisma
  2. autoDisableExpiredTrial() ← Prisma (يفحص trialEndsAt)
  3. getGuestsByInvitation() ← Prisma
  4. getPublishedTemplateWithSettings() ← JSON Store
  5. getPublishedMusicLibrary() ← JSON Store
  6. getClientMessages() ← Prisma
  7. getPublishedContentPresets() ← JSON Store
  8. getPublishedMessageTemplates() ← JSON Store
  9. getWeddingLiveMode() ← Prisma
  10. getGuestBookMessages() ← Prisma
  11. getPublishedSiteSettings() ← JSON Store
```

**المكون الرئيسي:**
```
ClientDashboardShell — لوحة التحكم الكاملة (يحتوي على التبويبات:
  - الإعدادات (تعديل الدعوة)
  - الحضور (قائمة الضيوف)
  - التهاني (Guest Book)
  - المشاركة (QR Code + روابط)
  - التحليلات (إحصائيات)
  - رسائل الإدارة
  - البث المباشر
)
```

**كيف تحفظ التعديلات:**
- التعديلات ترسل عبر `POST /api/client/invitations/[code]`
- الصور ترفع عبر `lib/display-images.ts` → `storage-provider.ts`
- الموسيقى عبر `lib/audio-files.ts`

**كيف تنشر الدعوة:**
- النشر يتم يدوياً من الأدمن عبر `/admin/orders`
- العميل لا يستطيع نشر الدعوة بنفسه حالياً

### 6.2 نقاط الضعف الحالية

1. **لا توجد رسالة ترحيبية** بعد إنشاء الدعوة (توجيه تلقائي إلى dashboard)
2. **لا توجد إشارة إلى حالة الاشتراك** في لوحة العميل
3. **لا يوجد زر "تفعيل الدعوة"** — كل شيء يعتمد على الأدمن
4. **صفحة انتهاء التجربة** غير موجودة (autoDisableExpiredTrial يعطل الدعوة فقط)

---

## القسم السابع: تحليل الخدمات الداخلية

### 7.1 Backup System
- **الملفات:** `lib/backups.ts`, `backups-v2.ts`, `auto-backup.ts`, `backup-display.ts`
- **النوع:** Database dump + file archive
- **التخزين:** محلي (backups/) + GitHub
- **الجدولة:** كل ساعة عبر Railway Cron
- **API:** `/api/admin/backups/*` (15+ route file)
- **ملاحظة:** نظام متقدم جداً مع restore, verify, safe marking

### 7.2 Sync System
- **الملفات:** `lib/github-sync.ts`, `github-sync-queue.ts`, `github-content.ts`, `github-url.ts`
- **الوظيفة:** مزامنة المحتوى مع GitHub (push + pull)
- **API:** `/api/admin/sync/*`, `/api/admin/sync-status/*`
- **ملاحظة:** `github-sync.ts` ~33K حرف (من أكبر الملفات)

### 7.3 Upload / Storage
- **الملفات:** `lib/storage-provider.ts`, `lib/display-images.ts`, `lib/image-formats.ts`, `lib/browser-image-upload.ts`, `lib/audio-files.ts`, `lib/invitation-images.ts`, `lib/invitation-media.ts`
- **المسارات:** `public/uploads/` (client-invitations, music, order-previews, order-requests, share-posters, template-previews)
- **مزود التخزين:** محلي (تلقائي) + يدعم S3/R2

### 7.4 Scheduler / Cron
- **الملفات:** `railway-cron.json`, `lib/task-scheduler.ts`, `lib/auto-publish-scheduler.ts`
- **المهام:**
  - `api/cron/backup` — كل ساعة
  - `api/cron/auto-publish` — كل ساعة
- **API:** `/api/admin/tasks/*`

### 7.5 Notifications
- **الملفات:** 
  - `lib/admin-notifications.ts` — إشعارات الأدمن الداخلية
  - `lib/client-messages.ts` — رسائل الإدارة للعملاء
  - `lib/push-notifications.ts` — Web Push API
  - `lib/whatsapp.ts` — WhatsApp API (غير مفعل)
- **API:** `/api/admin/notification-center`, `/api/admin/notifications/send`, `/api/push/*`

### 7.6 Analytics
- **الملفات:** `lib/customer-analytics.ts`, `lib/visit-source.ts`, `lib/visit-source-analytics.ts`, `lib/home-stats.ts`
- **API:** `/api/admin/analytics/export`

### 7.7 Audit
- **الملفات:** `lib/audit-log.ts`
- **الإجراءات المدعومة:** 25 إجراءً
- **التخزين:** PostgreSQL (جدول AuditLog)

### 7.8 Content Store
- **الملفات:** `lib/project-content-store.ts`, `lib/publish-pipeline.ts`, `lib/publish-rollback.ts`
- **الوظيفة:** إدارة المحتوى (draft/published) عبر JSON files + GitHub
- **أنواع المحتوى:** 12 نوعاً

### 7.9 Helpers / Utilities
- **الملفات:** `lib/utils.ts`, `lib/validation.ts`, `lib/types.ts`, `lib/slug.ts`, `lib/phone-utils.ts`, `lib/map-url.ts`, `lib/calendar.ts`, `lib/export-utils.ts`, `lib/atomic-file.ts`, `lib/runtime-paths.ts`

---

## القسم الثامن: APIs

### 8.1 Public APIs

| المسار | Method | الوظيفة | مصدر الطلب | قابل لإعادة الاستخدام |
|--------|--------|---------|-----------|---------------------|
| `/api/orders` | POST | إنشاء طلب دعوة | OrderForm | **نعم — لكن يحتاج تعديل مسار ما بعد النجاح** |
| `/api/orders/preview-images` | POST | حفظ صور المعاينة | OrderForm | نعم |
| `/api/orders/preview-music` | POST | حفظ موسيقى المعاينة | OrderForm | نعم |
| `/api/orders/preview-media` | POST | حفظ وسائط المعاينة | OrderForm | نعم |
| `/api/orders/extract-video-audio` | POST | استخراج صوت من فيديو | OrderForm | نعم |
| `/api/invitations/[code]/rsvp` | POST | تأكيد الحضور | Guests | نعم |
| `/api/invitations/[code]/guest-book` | GET/POST | رسائل التهاني | Guests | نعم |
| `/api/invitations/[code]/check-in` | POST | تسجيل الوصول | Guests | نعم |
| `/api/invitations/[code]/calendar/ics` | GET | تحميل ملف ICS | Guests | نعم |
| `/api/invitations/[code]/live-mode` | GET | بيانات البث المباشر | Guests | نعم |
| `/api/invitations/[code]/export/[format]` | GET | تصدير الضيوف | Admin | نعم |
| `/api/promo/validate` | POST | التحقق من كود الخصم | OrderForm | نعم |
| `/api/auth/admin/login` | POST | دخول الأدمن | Admin Login | — |
| `/api/auth/admin/logout` | POST | خروج الأدمن | Admin | — |
| `/api/auth/client/login` | POST | دخول العميل | Client Login | — |
| `/api/auth/client/logout` | POST | خروج العميل | Client | — |
| `/api/resolve-url` | GET | حل الروابط المختصرة | General | نعم |
| `/api/health` | GET | فحص الصحة | Railway | — |
| `/api/errors` | POST | تسجيل أخطاء المتصفح | Browser | — |

### 8.2 Admin APIs

| المسار | Method | الوظيفة | قابل لإعادة الاستخدام |
|--------|--------|---------|---------------------|
| `/api/admin/invitations` | GET/POST | CRUD الدعوات | نعم |
| `/api/admin/invitations/[code]` | GET/PUT/DELETE | إدارة دعوة محددة | نعم |
| `/api/admin/invitations/[code]/post-image` | POST | توليد صورة المنشور | نعم |
| `/api/admin/orders` | GET/POST | CRUD الطلبات | **نعم — لكن يحتاج إضافة بيانات الاشتراك** |
| `/api/admin/orders/[id]` | GET/PUT/DELETE | إدارة طلب محدد | نعم |
| `/api/admin/orders/count` | GET | عدد الطلبات المعلقة | نعم |
| `/api/admin/customers/[id]` | GET/PUT | إدارة عميل محدد | **نعم — توسعة بحقول الاشتراك** |
| `/api/admin/client-messages` | GET/POST | إدارة رسائل العملاء | **نعم — يمكن البناء عليه للإشعارات** |
| `/api/admin/notification-center` | GET/POST | إشعارات الأدمن | — |
| `/api/admin/search` | GET | البحث العام | نعم |
| `/api/admin/settings` | GET/PUT | إعدادات الموقع | نعم |
| `/api/admin/backups/*` | متعدد | نظام النسخ الاحتياطي | — |
| `/api/admin/publish/*` | متعدد | نظام النشر | — |
| `/api/admin/versions` | GET | إصدارات المحتوى | — |
| `/api/admin/templates/*` | متعدد | إدارة القوالب | نعم |
| `/api/admin/content-presets` | GET/POST | النصوص الجاهزة | نعم |
| `/api/admin/message-templates` | GET/POST | قوالب الرسائل | نعم |
| `/api/admin/text-edit` | POST | تعديل النصوص | نعم |
| `/api/admin/internal-notes` | GET/POST/DELETE | الملاحظات الداخلية | نعم |
| `/api/admin/favorites` | GET/POST/DELETE | المفضلة | نعم |
| `/api/admin/trash` | GET/POST | سلة المهملات | نعم |
| `/api/admin/audit-log/export` | GET | تصدير سجل الأحداث | نعم |
| `/api/admin/system-health` | GET | صحة النظام | — |
| `/api/admin/tasks` | GET/POST | المهام المجدولة | — |

### 8.3 Client APIs

| المسار | Method | الوظيفة | قابل لإعادة الاستخدام |
|--------|--------|---------|---------------------|
| `/api/client/invitations/[code]` | GET/PUT | قراءة/تعديل الدعوة | **نعم — لكن يحتاج إضافة حالة الاشتراك في الرد** |
| `/api/client/guest-book/moderate` | POST | الموافقة على التهاني | نعم |
| `/api/client/guest-book/settings` | PUT | إعدادات guest book | نعم |
| `/api/client/live-mode/[code]` | POST | تحديث البث المباشر | نعم |
| `/api/client/messages/read` | POST | قراءة الرسائل | نعم |

### 8.4 Cron APIs

| المسار | Method | Schedule | الوظيفة |
|--------|--------|----------|---------|
| `/api/cron/backup` | GET | كل ساعة | نسخ احتياطي تلقائي |
| `/api/cron/auto-publish` | GET | كل ساعة | نشر تلقائي |

---

## القسم التاسع: Components

### 9.1 المكونات الضخمة

| المكون | عدد الأسطر | الملف | المشكلة |
|--------|-----------|-------|---------|
| **OrderForm** | 2,712 | `components/OrderForm.tsx` | **ضخم جداً** — يحتوي على 7 خطوات في ملف واحد |
| **DashboardShell** | 796 | `components/DashboardShell.tsx` | كبير — إدارة شريط التنقل + badges + shortcuts |
| **ClientDashboardShell** | ~800+ | `components/ClientDashboardShell.tsx` | كبير — لوحة العميل الكاملة |

### 9.2 المكونات القابلة لإعادة الاستخدام

| المكون | الاستخدام | قابلية إعادة الاستخدام |
|--------|----------|----------------------|
| `CopyButton` | نصوص قابلة للنسخ | ✅ عالية |
| `CopySuccessButton` | نصوص مع تأكيد | ✅ عالية |
| `ConfirmDialog` | تأكيد الإجراءات | ✅ عالية |
| `ConfirmingSubmitButton` | أزرار مع تأكيد | ✅ عالية |
| `Pagination` | صفحات الجداول | ✅ عالية |
| `StatsGrid` | إحصائيات | ✅ عالية |
| `AudioPlayer` | تشغيل الموسيقى | ✅ عالية |
| `InternalNotesPanel` | ملاحظات داخلية | ✅ عالية |
| `FavoriteToggleButton` | المفضلة | ✅ عالية |
| `AdminMessagesBanner` | Banner الرسائل للعميل | ✅ يمكن تطويره للإشعارات |
| `ThemeToggle` | تغيير الثيم | ✅ عالية |
| `SimpleDateInput` | إدخال تاريخ | ✅ عالية |

### 9.3 مكونات لا تحتاج تعديل

- `BackupDashboardWidget` — واجهة النسخ الاحتياطي
- `SystemHealthClient` — صحة النظام
- `PostImageAdminPanel` — صورة المنشور
- `PartnerPromoPreviewFields` — أكواد الشركاء
- `BulkWhatsAppSender` — إرسال واتساب جماعي

---

## القسم العاشر: Libraries (lib/)

### 10.1 وجود تكرار

| الملفات المكررة | المشكلة |
|----------------|---------|
| `backups.ts` + `backups-v2.ts` | نسختان من نظام النسخ الاحتياطي (v1 + v2) |
| `check-ins.ts` + `check-in-system.ts` | وظائف متداخلة |
| `invitation-media.ts` + `invitation-media-server.ts` | فصل غير واضح بين client/server |
| `validation.ts` + `validation-enhanced.ts` | الملف الأصلي + تحسينات |
| `invitation-data.ts` + `admin-data.ts` | تداخل في جلب بيانات الدعوات |
| `github-sync.ts` + `github-content.ts` + `github-url.ts` | تقسيم مفرط لملفات GitHub |

### 10.2 الملفات الأكثر أهمية (لا يمكن الاستغناء عنها)

| الملف | الوظيفة | درجة الأهمية |
|-------|---------|-------------|
| `lib/db.ts` | اتصال Prisma | 🟢 حرجة |
| `lib/auth-config.ts` | إعدادات المصادقة | 🟢 حرجة |
| `lib/admin-session.ts` | جلسات الأدمن | 🟢 حرجة |
| `lib/client-session.ts` | جلسات العملاء | 🟢 حرجة |
| `lib/password.ts` | تشفير كلمات المرور | 🟢 حرجة |
| `lib/storage-provider.ts` | تخزين الملفات | 🟢 حرجة |
| `lib/types.ts` | أنواع TypeScript | 🟢 مركزية |
| `lib/utils.ts` | أدوات عامة | 🟢 مركزية |

### 10.3 الملفات الجاهزة للتوسع

| الملف | إمكانية التوسع |
|-------|---------------|
| `lib/admin-crm-status.ts` | إضافة حالات الاشتراك للعميل |
| `lib/admin-crm.ts` | إضافة بيانات الاشتراك في Profile |
| `lib/admin-data.ts` | إضافة indexedBy للاشتراكات |
| `lib/client-messages.ts` | إضافة أنواع إشعارات (Banner/Popup) |
| `lib/promo-code-service.ts` | إضافة خصومات على الاشتراكات |
| `lib/pricing.ts` (غير موجود) | **جديد** — تعريف الباقات |
| `lib/subscription.ts` (غير موجود) | **جديد** — دوال الاشتراك |
| `lib/payment.ts` (غير موجود) | **جديد** — دوال الدفع |

---

## القسم الحادي عشر: Data Flow

### 11.1 تدفق إنشاء العميل
```
OrderForm → POST /api/orders → OrderRequest created (بدون Customer)
  ↓
Admin reviews → POST /api/admin/orders/[id] → Invitation created
  ↓
resolveOrCreateCustomerForInvitation() → Customer created/updated
  ↓
Customer مرتبط بـ Invitation عبر customerId
```

### 11.2 تدفق الدخول إلى لوحة العميل
```
Browser → /{code}/ad_3399 → Middleware (check session)
  ↓
verifyClientSessionCookie(cookie, code)
  ↓
إذا نجح → Server Component → 11 parallel data loads
  ↓
ClientDashboardShell → عرض البيانات
  ↓
إذا فشل → redirect → /manage/invitation/invalid
```

### 11.3 تدفق الحفظ
```
ClientDashboardShell → POST /api/client/invitations/[code]
  ↓
invitation-data.ts → prisma.invitation.update()
  ↓
إعادة تحميل Server Component → عرض البيانات الجديدة
```

### 11.4 تدفق النشر
```
Admin Publish Page → runPublishPipeline()
  ↓
قراءة كل المحتوى من data/ (draft)
  ↓
رفع إلى GitHub
  ↓
تسجيل في ContentVersion
  ↓
عرض المحتوى الجديد
```

### 11.5 تدفق النسخ الاحتياطي
```
Cron → /api/cron/backup → runScheduledBackup()
  ↓
تصدير قاعدة البيانات (SQL dump)
  ↓
ضغط الملفات (uploads/, data/)
  ↓
رفع إلى GitHub
  ↓
تسجيل في BackupJob
```

---

## القسم الثاني عشر: تحليل الأداء

### 12.1 الملفات الضخمة

| الملف | الحجم/الأسطر | المشكلة |
|-------|------------|---------|
| `app/globals.css` | **32,000+ سطر** | ضخم جداً — يحتوي على كل الـ CSS في ملف واحد |
| `components/OrderForm.tsx` | **2,712 سطر** | يحتاج تقسيم إلى مكونات أصغر |
| `components/DashboardShell.tsx` | 796 سطر | كبير لكن مقبول (navigation state management) |
| `components/ClientDashboardShell.tsx` | ~800+ سطر | كبير — لوحة العميل الكاملة |
| `lib/github-sync.ts` | ~33K حرف | كبير — نظام المزامنة الكامل |
| `lib/media-cleanup.ts` | 810 سطر | كبير — فحص وتنظيف |
| `lib/cleanup/index.ts` | 799 سطر | كبير — الفحص الشامل |
| `lib/promo-code-service.ts` | 559 سطر | كبير — خدمة أكواد الخصم |
| `lib/content-text-registry.ts` | 597 سطر | كبير — سجل النصوص |

### 12.2 استعلامات ثقيلة محتملة

1. **`getAdminInvitations()`** — تجلب كل الدعوات بدون pagination
2. **`getAdminCustomers()`** — تجلب كل العملاء
3. **`getAdminDashboardStats()`** — Counts متعددة
4. **`media-cleanup.ts`** — استعلامات متعددة على كل الجداول
5. **`cleanup/index.ts`** — مسح كامل لقاعدة البيانات

### 12.3 Dead Code / غير مستخدم

1. **`lib/startup-restore.ts`** — كانت للاستعادة التلقائية، تم استبدالها بـ `instrumentation.ts`
2. **`lib/heic-convert.d.ts`** — ملف types قديم
3. **`backups/` الدليل المحلي** — النسخ موجودة محلياً وقد لا تكون ضرورية مع GitHub backup
4. **`lib/invitation-media-server.ts`** — قد لا يستخدم (فصل client/server غير واضح)

### 12.4 مشاكل أداء

1. **لا يوجد Pagination** في `getAdminInvitations()` — مع 1000+ دعوة سيصبح بطيئاً
2. **لا يوجد Caching** — كل طلب يذهب إلى قاعدة البيانات مباشرة (لا Redis)
3. **Server Components تصل إلى DB مباشرة** — بدون data cache layer
4. **CSS في ملف واحد** — 32K سطر في globals.css (يؤثر على وقت البناء)

---

## القسم الثالث عشر: التحليل المعماري

### 13.1 نقاط القوة

1. **هندسة نظيفة** — فصل واضح بين lib/ و components/ و app/
2. **Server Components** — استخدام جيد لـ RSC (تحميل البيانات في السيرفر)
3. **نظام متكامل للنسخ الاحتياطي** — يدعم المحلي + GitHub + verify
4. **Git-based CMS** — المحتوى في GitHub (version control + backup)
5. **Custom Auth** — بدون اعتماد على مكتبات خارجية (HMAC-SHA256)
6. **RTL أولاً** — دعـم كامل للغة العربية
7. **نظام أكواد خصم متقدم** — يدعم الشركاء والخصومات المباشرة
8. **نظام شركاء كامل** — مصورين، قاعات، tags، إحصائيات
9. **Post Image Generator** — توليد صور للمشاركة (SVG + sharp)
10. **Railway IaC** — البنية التحتية ككود

### 13.2 نقاط الضعف

1. **CSS في ملف واحد** — 32K سطر في globals.css (كارثة صيانة)
2. **OrderForm 2,712 سطر** — أصعب مكون في الصيانة
3. **لا يوجد نظام Caching** — كل طلب يضرب DB
4. **لا يوجد Queue System** — العمليات الثقيلة (نسخ احتياطي) تنفذ مباشرة
5. **عدم استخدام TypeScript Strict في كل مكان** — بعض الملفات تستخدم `any`
6. **تكرار في الملفات** — backups-v1/v2, validation/validation-enhanced
7. **الاعتماد على JSON files للمحتوى** — قد يسبب مشاكل توافق مع تعدد الـ instances
8. **عدم وجود طبقة Service وسطية** — الـ lib/ تخلط بين service و utility و helper

### 13.3 ما قد يسبب مشاكل مستقبلاً

1. **Invitation يحتوي 45 حقلاً** — مع إضافة الاشتراكات سيزيد التعقيد
2. **Trial مربوط بالـ Invitation** — يجب نقله إلى الـ Customer
3. **لا يوجد CustomerSubscription** — الـ PartnerSubscription موجود لكن Customer لا
4. **الاعتماد على واتساب** — تدفق الدعوة يعتمد على قناة خارجية
5. **OrderForm 2,712 سطر** — أي تغيير في flow الدعوة سيؤثر على هذا المكون
6. **قاعدة البيانات ليس فيها Pagination** — مع النمو ستصبح استعلامات admin-data.ts مشكلة
7. **عدم وجود اختبارات للـ API** — الاختبارات الموجودة (33 اختبار) تركز على edge cases

---

## القسم الرابع عشر: Compatibility Report

### 14.1 ما يمكن إعادة استخدامه كما هو

| المكون | لماذا؟ |
|--------|--------|
| **التسلسل الهرمي** — كل صفحة لها layout خاص | لا يحتاج تغيير |
| **Admin middleware** | يحمي /admin/* فقط |
| **Client middleware** | يحمي /{code}/ad_3399/* فقط |
| **Admin Layout (DashboardShell)** | شريط التنقل + الأقسام — نضيف قسم "الاشتراكات" فقط |
| **Client Dashboard Shell** | نضيف SubscriptionBanner + زر "تفعيل" |
| **AdminMessagesBanner** | يمكن تطويره ليشمل Banner الاشتراك |
| **ConfirmDialog** | لتأكيد الدفع / التفعيل |
| **Pagination** | لقوائم المدفوعات |
| **StatsGrid** | لإحصائيات الاشتراكات |
| **AuditLog** | تسجيل عمليات الدفع والتفعيل |
| **InternalNotes** | ملاحظات على المدفوعات |
| **AppSetting** | تخزين إعدادات الباقات والأسعار |
| **Storage Provider** | رفع إيصالات الدفع |
| **Image Formats** | التحقق من صورة الإيصال |
| **All PartnerSubscription logic** | **جاهز تماماً** لإعادة استخدامه للعملاء |
| **PromoCodeService** | تطبيق خصومات على الاشتراكات |
| **Phone Utils** | التحقق من رقم المحفظة |
| **Export Utils** | تصدير سجل المدفوعات |
| **Rate Limiting** | حماية API الاشتراكات |
| **CSRF Protection** | حماية نماذج الدفع |
| **All 33 test files** | لا تتأثر — تختبر edge cases غير مرتبطة |

### 14.2 ما يمكن تعديله بدلاً من إنشائه من الصفر

| الملف الحالي | التعديل المقترح |
|-------------|----------------|
| `prisma/schema.prisma` | إضافة SubscriptionPlan, Payment, ClientNotification models + توسيع Customer |
| `lib/admin-crm-status.ts` | إضافة `getCustomerState()` مع حالات الاشتراك |
| `lib/admin-crm.ts` | إضافة بيانات الاشتراك في `getAdminCustomerProfile()` |
| `lib/admin-data.ts` | إضافة فلاتر الاشتراك في `getAdminCustomers()` |
| `lib/client-messages.ts` | توسيع ليشمل ClientNotification (Banner/Popup) |
| `lib/admin-notifications.ts` | إضافة إشعارات الأدمن للمدفوعات الجديدة |
| `components/DashboardShell.tsx` | إضافة قسم "الاشتراكات" في شريط التنقل |
| `app/admin/layout.tsx` | لا تغيير — DashboardShell يديره |
| `app/admin/invitations-customers/page.tsx` | إضافة فلاتر حالة الاشتراك |
| `app/admin/invitations-customers/[code]/page.tsx` | إضافة بطاقة الاشتراك |
| `app/admin/customers/[id]/page.tsx` | إضافة بيانات الاشتراك |
| `app/admin/orders/page.tsx` | إظهار حالة اشتراك العميل في الجدول |
| `app/admin/notifications/page.tsx` | إضافة قسم "إشعارات العملاء" |
| `app/[code]/ad_3399/page.tsx` | إضافة SubscriptionBanner + زر "فعل دعوتك" |
| `app/order/success/page.tsx` | تغيير مسار ما بعد النجاح (بدلاً من واتساب) |
| `app/api/orders/route.ts` | إضافة إنشاء Customer مع الطلب بدلاً من التأخير |
| `app/api/admin/orders/[id]/route.ts` | إضافة ربط الاشتراك مع تحويل الطلب |
| `app/api/admin/client-messages/route.ts` | توسيع ليشمل ClientNotification CRUD |

### 14.3 ما يجب إنشاؤه من الصفر (لا يوجد بديل)

| الملف الجديد | السبب |
|-------------|-------|
| `lib/pricing.ts` | تعريف الباقات — لا يوجد نظام أسعار أساساً |
| `lib/subscription.ts` | دوال الاشتراك — لا توجد حالياً |
| `lib/payment.ts` | دوال الدفع — لا توجد حالياً |
| `lib/subscription-status.ts` | حالات اشتراك العميل — توسعة لـ admin-crm-status |
| `lib/activate.ts` | دوال التفعيل — عملية جديدة بالكامل |
| `lib/client-notifications.ts` | نظام إشعارات متقدم للعملاء |
| `app/activate/` | صفحة التفعيل — جديدة بالكامل |
| `app/admin/subscriptions/` | لوحة إدارة الاشتراكات — جديدة بالكامل |
| `app/client/[code]/subscription/page.tsx` | صفحة "اشتراكي" — جديدة بالكامل |
| `app/client/[code]/orders/page.tsx` | مركز الطلبات — جديدة بالكامل |
| `app/client/expired/page.tsx` | صفحة انتهاء التجربة — جديدة بالكامل |
| API Routes للمدفوعات والتفعيل | ~18 route جديد |

### 14.4 ما لا يجب لمسه إطلاقاً

| الملف/النظام | السبب |
|-------------|-------|
| `lib/backups.ts` + `backups-v2.ts` | نظام النسخ الاحتياطي — حساس جداً |
| `lib/github-sync.ts` | المزامنة مع GitHub — معقد وحساس |
| `lib/publish-pipeline.ts` | خط النشر — أي خطأ يسبب فقدان محتوى |
| `lib/publish-rollback.ts` | الاسترجاع — حساس جداً |
| `lib/instrumentation.ts` | تشغيل Auto Restore — تم إصلاحه مؤخراً |
| `app/admin/backups/*` | واجهة النسخ الاحتياطي |
| `app/admin/publish/*` | واجهة النشر |
| `app/admin/versions/*` | واجهة الإصدارات |
| `app/admin/sync/*` | واجهة المزامنة |
| `app/admin/cleanup/*` | واجهة التنظيف |
| `app/admin/system-health/*` | واجهة صحة النظام |
| `app/admin/tasks/*` | واجهة المهام المجدولة |
| `middleware.ts` | الأمان — أي تغيير قد يكسر الوصول |
| `next.config.ts` | إعدادات البناء |
| `Dockerfile` | البنية التحتية |
| `.railway/railway.ts` | البنية التحتية |
| جميع ملفات الاختبار (scripts/*.test.ts) | لا تتأثر |

### 14.5 المكان المناسب لكل نظام جديد

| النظام الجديد | أفضل مكان للبدء | المبرر |
|--------------|----------------|--------|
| **Subscription Plans** | `prisma/schema.prisma` + `lib/pricing.ts` | بنية بيانات جديدة |
| **Customer Status** | `lib/subscription-status.ts` + توسعة `admin-crm-status.ts` | يعتمد على حالة Customer |
| **Payment** | `prisma/schema.prisma` (Payment model) + `lib/payment.ts` | جدول + خدمة جديدة |
| **Activation Flow** | `app/activate/` + `lib/activate.ts` | صفحات جديدة + خدمة |
| **Admin Subscription Dashboard** | `app/admin/subscriptions/` | قسم إدارة جديد |
| **Client "My Subscription"** | `app/client/[code]/subscription/` | صفحة عميل جديدة |
| **Orders Center** | `app/client/[code]/orders/` | صفحة عميل جديدة |
| **Notifications (Banner/Popup)** | توسعة `lib/client-messages.ts` + مكونات جديدة | البناء على كود موجود |
| **Integration with existing flow** | تعديل `app/api/orders/route.ts` + `app/order/success/page.tsx` | تغيير مسار ما بعد الطلب |

---

## القسم الخامس عشر: مخاطر التنفيذ

### 15.1 المخاطر المحتملة وطرق منعها

| الخطر | التأثير | طريقة المنع |
|-------|---------|------------|
| **1. كسر الدعوات الحالية** | الدعوات المنشورة حالياً قد تتعطل إذا تغيرت حالة Customer | **عدم تغيير الحقول الحالية** — إضافة حقول جديدة فقط (subscriptionStatus, subscriptionEndDate). الحقول القديمة (isActive, trialEndsAt, disabledAt) تبقى كما هي. |
| **2. فقدان بيانات Trial** | بعض الدعوات لديها trialEndsAt — إذا تم تجاهلها قد نفقد حالة Trial | **قراءة القيم الحالية** — تحويل trialEndsAt من Invitation إلى Customer عند أول تشغيل. |
| **3. كسر التوافق مع CRM الحالي** | `getInvitationState()` يعتمد على trialEndsAt في Invitation | **الحفاظ على `autoDisableExpiredTrial()`** — لا نمسحها، نضيف مساراً موازياً مع Customer. |
| **4. تعارض API Routes** | الـ API Routes الجديدة قد تتعارض مع الموجودة | **استخدام مسارات منفصلة**: `/api/admin/subscriptions/*`, `/api/activate/*` بدلاً من تغيير المسارات الموجودة. |
| **5. فقدان المدفوعات** | لا يوجد ACID transactions بين إنشاء الدفع والتفعيل | **استخدام Prisma $transaction** لكل عملية دفع + تفعيل. |
| **6. رفع ملفات ضارة** | رفع إيصالات وهمية أو ضارة | **استخدام `image-formats.ts`** للتحقق من نوع الملف + حد حجم (5MB). |
| **7. مشاكل الأداء مع كثرة المدفوعات** | استعلامات payments ثقيلة | **إضافة Pagination** من البداية في `lib/payment.ts`. |
| **8. خطأ في حساب حالة الاشتراك** | عميل نشط يظهر كمنتهي أو العكس | **كتابة 20+ اختبار** لجميع حالات `getCustomerState()` مع كل combinations. |
| **9. عدم تطابق الصلاحية** | عميل Expired يستطيع تعديل الدعوة | **إضافة check في Middleware** أو في `verifyClientSessionCookie()` (فحص subscriptionStatus). |
| **10. مشكلة الـ Migration** | الـ Prisma migration قد يمسح بيانات إذا لم ينفذ صح | **استخدام `prisma migrate deploy`** (وليس `prisma db push`). اختبار الـ migration على نسخة من DB أولاً. |

### 15.2 استراتيجية التنفيذ الآمن

```
1. إنشاء الـ Prisma models الجديدة أولاً (SubscriptionPlan, Payment, ClientNotification)
2. إضافة الحقول الجديدة إلى Customer (subscriptionStatus, subscriptionEndDate...)
3. تشغيل prisma migrate deploy (فقط إضافة — لا حذف أو تغيير)
4. إنشاء lib/ جديدة (pricing, subscription, payment, activate, client-notifications)
5. إنشاء API Routes جديدة تحت /api/admin/subscriptions/ و /api/activate/
6. إنشاء صفحات جديدة (activate, client/subscription, admin/subscriptions)
7. ربط الـ Subscription مع الـ Customer في resolveOrCreateCustomerForInvitation()
8. تعديل واجهة العميل (إضافة Banner + زر تفعيل)
9. تعديل واجهة الإدارة (إضافة أزرار CRM + فلاتر)
10. تعديل تدفق الطلب (توجيه إلى dashboard بدلاً من واتساب)
```

---

## القسم السادس عشر: خارطة التنفيذ المقترحة

### المرحلة 1: البنية التحتية (3 أيام — خطورة: عالية)

**الهدف:** تجهيز قاعدة البيانات والمكتبات الأساسية

**الملفات المتأثرة:**
- `prisma/schema.prisma` — إضافة SubscriptionPlan, Payment, ClientNotification models + توسعة Customer
- `lib/pricing.ts` — جديد — تعريف الباقات
- `lib/subscription.ts` — جديد — دوال الاشتراك
- `lib/payment.ts` — جديد — دوال الدفع
- `lib/subscription-status.ts` — جديد — حالات الاشتراك
- `lib/client-notifications.ts` — جديد — نظام الإشعارات
- `lib/activate.ts` — جديد — دوال التفعيل

**الاعتماديات:** لا شيء
**مستوى الخطورة:** 🔴 عالي (تغيير قاعدة البيانات)
**التخفيف:** Testing migration على نسخة DB

### المرحلة 2: توسعة الـ CRM الحالي (3 أيام — خطورة: متوسطة)

**الهدف:** إضافة حالات الاشتراك في CRM + أزرار الإجراءات

**الملفات المتأثرة:**
- `lib/admin-crm-status.ts` — إضافة `getCustomerState()`
- `lib/admin-crm.ts` — إضافة بيانات الاشتراك
- `lib/admin-data.ts` — إضافة فلاتر الاشتراك
- `app/admin/invitations-customers/page.tsx` — فلاتر + أزرار
- `app/admin/invitations-customers/[code]/page.tsx` — بطاقة اشتراك
- `app/admin/customers/[id]/page.tsx` — بيانات اشتراك
- `components/DashboardShell.tsx` — إضافة قسم "الاشتراكات"

**الاعتماديات:** المرحلة 1
**مستوى الخطورة:** 🟡 متوسط

### المرحلة 3: نظام الإشعارات للعملاء (يومان — خطورة: منخفضة)

**الهدف:** Banner + Popup + رسائل داخلية

**الملفات المتأثرة:**
- `lib/client-messages.ts` — توسعة
- مكونات جديدة: ClientNotificationBanner, ClientNotificationPopup
- `app/admin/notifications/page.tsx` — إضافة قسم جديد
- API Routes جديدة للإشعارات

**الاعتماديات:** المرحلة 1
**مستوى الخطورة:** 🟢 منخفض

### المرحلة 4: صفحة التفعيل + الدفع (4 أيام — خطورة: متوسطة)

**الهدف:** تدفق التفعيل الكامل

**الملفات الجديدة:**
- `app/activate/page.tsx` + `app/activate/payment/page.tsx` + `app/activate/success/page.tsx`
- `app/client/[code]/subscription/page.tsx`
- `app/client/[code]/orders/page.tsx`
- `app/client/expired/page.tsx`
- API Routes للدفع والتفعيل (~18 route)
- مكونات: PricingCards, PaymentForm, SubscriptionSummary, PaymentHistory

**الاعتماديات:** المرحلة 1 + 2
**مستوى الخطورة:** 🟡 متوسط

### المرحلة 5: لوحة إدارة الاشتراكات (3 أيام — خطورة: منخفضة)

**الهدف:** قسم إدارة كامل للاشتراكات والمدفوعات

**الملفات الجديدة:**
- `app/admin/subscriptions/` — 6 صفحات
- `app/api/admin/subscriptions/*` — ~10 routes
- مكونات: AdminPaymentReviewCard, AdminCustomerActions, AdminSubscriptionFilters

**الاعتماديات:** المرحلة 1 + 4
**مستوى الخطورة:** 🟢 منخفض

### المرحلة 6: التكامل النهائي + تغيير التدفق (يومان — خطورة: عالية)

**الهدف:** تغيير مسار ما بعد الطلب من واتساب إلى dashboard

**الملفات المتأثرة:**
- `lib/customer-identity.ts` — إنشاء Customer مع الطلب
- `app/api/orders/route.ts` — تعديل مسار النجاح
- `app/order/success/page.tsx` — توجيه إلى dashboard
- `app/[code]/ad_3399/page.tsx` — إضافة SubscriptionBanner
- `app/api/admin/orders/[id]/route.ts` — ربط الاشتراك

**الاعتماديات:** المرحلة 2 + 4
**مستوى الخطورة:** 🔴 عالي (يغير تدفق المستخدم الأساسي)

---

## Before We Start

### 1. هل المشروع الحالي مهيأ لإضافة نظام اشتراكات؟

**نعم، جزئياً.** المشروع لديه:
- ✅ بنية مرنة (App Router + Server Components)
- ✅ نظام Partners موجود فعلاً مع `PartnerSubscription` (نموذج جاهز)
- ✅ نظام أكواد خصم متكامل (`PromoCodeService`)
- ✅ نظام تدقيق كامل (`AuditLog`)
- ✅ نظام رسائل للعملاء (`ClientMessages` — أساس الإشعارات)
- ✅ نظام تخزين للملفات (`StorageProvider` — لرفع الإيصالات)
- ❌ **Trial مربوط بالـ Invitation وليس Customer**
- ❌ **لا يوجد Payment model**
- ❌ **لا توجد حالة اشتراك للـ Customer**
- ❌ **لا يوجد تعريف للباقات (Pricing)**

### 2. ما نسبة جاهزية المشروع؟

**65-70%.** البنية التحتية والأنظمة المساندة موجودة. النواقص الأساسية:
- 30% نماذج Prisma جديدة
- 20% دوال الاشتراك (logic)
- 30% صفحات واجهة المستخدم
- 20% تكامل مع التدفق الحالي

### 3. ما أكبر نقطة ضعف في البنية الحالية؟

**توزيع الـ Trial بين Invitation و Customer.** حالياً، `trialDays` و `trialEndsAt` و `disabledAt` كلها في جدول `Invitation`. هذا يعني:
- Customer واحد قد يكون له دعوتان بحالتين Trial مختلفتين
- لا توجد طريقة لمعرفة "هل هذا العميل جرب قبل كده؟"
- `autoDisableExpiredTrial()` في `invitation-data.ts` تفحص كل دعوة على حدة

**الحل:** نقل الـ Trial إلى Customer وإضافة `subscriptionStatus` شامل.

### 4. ما أكثر شيء أعجبك في المشروع؟

**نظام إدارة المحتوى (Content Store).** فكرة تخزين كل المحتوى القابل للتعديل كـ JSON مع نسختين (draft/published) والنشر عبر GitHub — هذه بنية متقنة تسمح بـ:
- Version Control كامل
- Rollback لأي إصدار
- فصل تام بين التعديل والنشر
- تكامل مع GitHub كـ backup تلقائي

**ونظام الشركاء (Partner System).** كامل جداً: أنواع، مستويات، أكواد خصم، إحصائيات، رسائل، tags — وهذا جاهز تقريباً لإعادة استخدامه للعملاء.

### 5. ما أول شيء تنصح بتعديله قبل البدء؟

**فصل Trial من Invitation إلى Customer.** هذا هو أكبر تغيير يجب فعله قبل أي شيء آخر. الخطوات:
1. إضافة `subscriptionStatus` و `subscriptionEndDate` و `trialEndsAt` إلى Customer
2. كتابة `lib/subscription-status.ts` مع `getCustomerState()`
3. إنشاء `lib/subscription.ts` مع دوال `activateSubscription()`, `extendTrial()`, `suspendCustomer()`
4. الحفاظ على الحقول القديمة في Invitation للتوافق مع الدعوات الحالية

**لماذا هذا أولاً؟** لأن كل شيء آخر (مدفوعات، إشعارات، تفعيل) يعتمد على حالة الاشتراك.

### 6. هل تنصح بإعادة هيكلة أي جزء قبل التنفيذ؟

**أوصي بإعادة هيكلة محدودة فقط:**

1. **`lib/invitation-data.ts`** (اختياري) — فصل دوال Trial إلى `lib/subscription.ts` (لتجنب Circular dependencies)
2. **`lib/admin-crm-status.ts`** — إضافة `getCustomerState()` مع الحفاظ على `getInvitationState()`
3. **`OrderForm.tsx`** (لا تلمسه حالياً) — 2,712 سطر كبير جداً لكن تغييره قد يكسر flow الطلب. **أتركه للمرحلة 6.**

لا أوصي بإعادة هيكلة واسعة لأنها ستؤخر إضافة الاشتراكات وقد تسبب مشاكل في نظام قائم.

### 7. ما أفضل طريقة لدمج النظام الجديد مع الحالي؟

**استراتيجية "النظام الموازي" (Parallel System):**

| الخطوة | الوصف |
|--------|-------|
| 1 | إنشاء `SubscriptionPlan` و `Payment` models جدد |
| 2 | إضافة حقول `subscription*` إلى Customer (بجانب الحقول القديمة) |
| 3 | العملاء الحاليون يحصلون على `subscriptionStatus: TRIAL` تلقائياً |
| 4 | الـ API الجديدة تحت `/api/admin/subscriptions/*` و `/api/activate/*` |
| 5 | الصفحات الجديدة تحت `/admin/subscriptions/` و `/activate/` |
| 6 | التعديلات على الصفحات الحالية تكون **إضافية فقط** (additive) |
| 7 | `autoDisableExpiredTrial()` تبقى كما هي للتوافق مع الدعوات الحالية |
| 8 | الدعوات الجديدة فقط تستخدم النظام الجديد (من تاريخ deployment) |

### 8. ما أكثر شيء قد يسبب مشاكل مستقبلاً إذا لم يتم إصلاحه الآن؟

**1. ربط Trial بالـ Invitation بدلاً من Customer.** هذا هو الخطر الأكبر:
- عميل قديم له 3 دعوات (واحدة Trial منتهية، اثنتان نشطتان) — أي حالة نعرضها؟
- لا يمكن معرفة "هل هذا العميل جرب من قبل؟"
- إحصائيات الاشتراكات ستكون غير دقيقة

**2. عدم وجود Pagination في استعلامات Admin.**
- `getAdminInvitations()` بدون limit
- `getAdminCustomers()` بدون limit
- مع 1000+ دعوة/عميل، الصفحات ستصبح بطيئة جداً
- الحل: إضافة `take` و `skip` مع `orderBy` فوراً

**3. CSS في ملف واحد (globals.css — 32K سطر).**
- ليس خطراً مباشراً على الاشتراكات
- لكنه يجعل الصيانة صعبة جداً
- أي تغيير في واجهة الاشتراكات سيضيف إلى هذا الملف الكبير
- الحل: استخدام CSS Modules للمكونات الجديدة

**4. الاعتماد على واتساب كقناة أساسية.**
- خطر استراتيجي: إذا تعطل واتساب، توقف تدفق الطلبات
- الحل (النهائي): نظام الاشتراكات هذا يلغي الحاجة لواتساب تماماً

---

*نهاية التقرير — 6 يوليو 2026*
*إجمالي الملفات المدققة: 119 lib + 31 models + 80+ API routes + 50+ pages + 100+ components + 7 config files*
