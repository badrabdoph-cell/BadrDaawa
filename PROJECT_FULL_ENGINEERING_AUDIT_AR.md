# التقرير الفني الشامل للمشروع - BadrDaawa (Wedding Daawa)

**تاريخ التقرير:** 15 يونيو 2026  
**نسخة المشروع:** 0.1.0  
**نوع التقرير:** تدقيق هندسي كامل (Full Engineering Audit)

---

## جدول المحتويات

1. [معلومات أساسية عن المشروع](#1-معلومات-أساسية-عن-المشروع)
2. [نوع المشروع والفئة المستهدفة](#2-نوع-المشروع-والفئة-المستهدفة)
3. [التقنيات المستخدمة](#3-التقنيات-المستخدمة)
4. [بنية النظام العامة (Architecture Overview)](#4-بنية-النظام-العامة-architecture-overview)
5. [تحليل قاعدة البيانات (Prisma Schema)](#5-تحليل-قاعدة-البيانات-prisma-schema)
6. [تحليل جميع أقسام الموقع](#6-تحليل-جميع-أقسام-الموقع)
7. [دورة العمل الكاملة للنظام](#7-دورة-العمل-الكاملة-للنظام)
8. [تحليل أنواع المستخدمين والصلاحيات](#8-تحليل-أنواع-المستخدمين-والصلاحيات)
9. [تحليل صفحات لوحة الإدارة](#9-تحليل-صفحات-لوحة-الإدارة)
10. [تحليل نظام القوالب](#10-تحليل-نظام-القوالب)
11. [تحليل نظام الموسيقى](#11-تحليل-نظام-الموسيقى)
12. [تحليل نظام الإحصائيات والتقارير](#12-تحليل-نظام-الإحصائيات-والتقارير)
13. [تحليل نظام النسخ الاحتياطي والاستعادة](#13-تحليل-نظام-النسخ-الاحتياطي-والاستعادة)
14. [تحليل نظام SEO](#14-تحليل-نظام-seo)
15. [تحليل الـ API بالكامل](#15-تحليل-الـ-api-بالكامل)
16. [تحليل Frontend](#16-تحليل-frontend)
17. [تحليل Backend](#17-تحليل-backend)
18. [نقاط القوة](#18-نقاط-القوة)
19. [نقاط الضعف](#19-نقاط-الضعف)
20. [الأجزاء غير المكتملة أو التي تحتاج تحسين](#20-الأجزاء-غير-المكتملة-أو-التي-تحتاج-تحسين)
21. [اقتراحات تحسينية مستقبلية حسب الأولوية](#21-اقتراحات-تحسينية-مستقبلية-حسب-الأولوية)
22. [Project Feature Inventory](#22-project-feature-inventory)

---

## 1. معلومات أساسية عن المشروع

| الحقل | القيمة |
|-------|--------|
| **اسم المشروع** | BadrDaawa (Wedding Daawa) |
| **الاسم في package.json** | `badrdaawa` |
| **النسخة** | 0.1.0 |
| **حالة المشروع** | قيد التطوير (Pre-release) |
| **الغرض الأساسي** | منصة عربية لإنشاء وإدارة دعوات الزفاف الرقمية الفاخرة |
| **نظام التشغيل المستهدف** | Web (Responsive - جميع الأجهزة) |
| **اللغة الأساسية للواجهة** | العربية (RTL) مع دعم الإنجليزية |
| **نموذج العمل** | B2B2C - منصة وسيطة بين مقدم الخدمة (Admin) والعميل (الزوجين) وضيوفهم |

---

## 2. نوع المشروع والفئة المستهدفة

### نوع المشروع:
- **تطبيق ويب متكامل (Full-Stack Web Application)**
- **منصة SaaS لإدارة دعوات الزفاف الرقمية**
- **نظام إدارة محتوى (CMS) للدعوات**
- **لوحة تحكم إدارية (Admin Dashboard)**
- **بوابة عميل (Client Portal)**
- **صفحات دعوة تفاعلية (Dynamic Invitation Pages)**

### الفئة المستهدفة:
1. **المسؤول (Super Admin / Admin):** مدير المنصة الذي يشرف على جميع العمليات
2. **العملاء (العروسان):** الزوجان اللذان يطلبان دعوة رقمية ويديرانها
3. **الضيوف (Guests):** المدعوون الذين يتصفحون الدعوة ويؤكدون الحضور ويرسلون التهاني
4. **المصورون (Photographers):** شركاء المنصة من المصورين

---

## 3. التقنيات المستخدمة

### التقنيات الأساسية

| التقنية | الإصدار | الاستخدام |
|---------|---------|-----------|
| **Next.js** | ^15.5.6 | إطار العمل الأساسي (Full-Stack Framework) |
| **React** | ^19.2.1 | مكتبة واجهة المستخدم |
| **TypeScript** | 5.9.3 | لغة البرمجة الأساسية |
| **Prisma** | ^5.22.0 | ORM وإدارة قاعدة البيانات |
| **PostgreSQL** | - | قاعدة البيانات العلائقية |
| **pnpm** | 10.15.1 | مدير الحزم |

### المكتبات الرئيسية

| المكتبة | الإصدار | الاستخدام |
|---------|---------|-----------|
| **lucide-react** | ^0.453.0 | أيقونات SVG |
| **zod** | ^4.1.12 | التحقق من صحة البيانات (Validation) |
| **qrcode** | ^1.5.4 | إنشاء رموز QR |
| **pdfkit** | ^0.15.2 | تصدير PDF مع دعم العربية |
| **xlsx** | ^0.18.5 | تصدير Excel |
| **sharp** | ^0.34.5 | معالجة الصور |
| **heic-convert** | ^2.1.0 | تحويل صور HEIC إلى JPEG |
| **clsx** | ^2.1.1 | إدارة كلاسات CSS |
| **iconv-lite** | ^0.7.2 | ترميز النصوص |

### البنية التحتية والتشغيل

| الأداة | الاستخدام |
|--------|-----------|
| **Railway** | منصة الاستضافة والنشر الموصى بها |
| **Docker** | حاوية التطبيق (Dockerfile مرفق) |
| **Railway Cron** | جدولة المهام الدورية (النسخ الاحتياطي) |
| **GitHub Actions** | CI/CD |

---

## 4. بنية النظام العامة (Architecture Overview)

### الرسم المعماري للنظام

```
┌─────────────────────────────────────────────────────────────────┐
│                         العميل (المتصفح)                        │
│  Public Pages │ Admin Panel │ Client Portal │ Invitation Pages  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP/HTTPS
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Next.js 15 App Router                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Middleware   │  │   API Routes │  │    Server Components │   │
│  │  (Security,  │  │  (REST API)  │  │   (SSR/SSG) Pages    │   │
│  │   Auth, Rate │  │  67 Endpoints│  │                      │   │
│  │   Limiting)  │  │              │  │  [code]/page.tsx     │   │
│  └──────┬───────┘  └──────┬───────┘  │  admin/*/page.tsx    │   │
│         │                 │          │  templates/page.tsx   │   │
│         ▼                 ▼          │  order/page.tsx       │   │
│  ┌────────────────────────────────────┐                      │   │
│  │         Business Logic Layer       │                      │   │
│  │         (lib/ directory)           │                      │   │
│  │  86 modules covering all domains   │                      │   │
│  └────────────────┬───────────────────┘                      │   │
└───────────────────┼───────────────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────────┐
    ▼               ▼                   ▼
┌─────────┐  ┌────────────┐  ┌──────────────────┐
│ Prisma  │  │  File System │  │    GitHub Sync   │
│ ORM     │  │  (JSON,     │  │    (Admin State)  │
│         │  │   Media,    │  │                   │
│PostgreSQL│  │   Uploads)  │  │                   │
└─────────┘  └────────────┘  └──────────────────┘
```

### نظام التخزين

النظام يستخدم **نظام تخزين هجين (Hybrid Storage)**:

1. **قاعدة البيانات PostgreSQL (Prisma):**
   - المستخدمون الإداريون (AdminUser)
   - العملاء (Customer)
   - الدعوات (Invitation)
   - تأكيدات الحضور (GuestRsvp)
   - طلبات الدعوات (OrderRequest)
   - أحداث التحليلات (AnalyticsEvent)
   - الصفحات الديناميكية (DynamicPage)
   - سجل المزامنة (SyncLog)
   - سجل التدقيق (AuditLog)
   - وظائف النسخ الاحتياطي (BackupJob)
   - رسائل الضيوف (GuestBookMessage)
   - رسائل العملاء (ClientMessage)
   - تسجيلات الوصول (InvitationCheckIn)
   - وضع الحفل المباشر (WeddingLiveMode)
   - الملاحظات الداخلية (InternalNote)

2. **نظام الملفات JSON (File-based Storage):**
   - إعدادات الموقع (`data/site-settings.json`)
   - القوالب (`data/wedding-templates.json`)
   - مكتبة الموسيقى (`data/music-library.json`)
   - محتوى الصفحة الرئيسية (`data/home-content.json`)
   - إعدادات المعاينة (`data/home-preview-settings.json`)
   - إعدادات القوالب (`data/template-settings.json`)
   - معلومات معاينة القالب (`data/template-preview-info.json`)
   - موسيقى معاينة القوالب (`data/templates-preview-music.json`)
   - الصفحات القانونية (`data/dynamic-pages.json`)

3. **الملفات المرفوعة (Uploads):**
   - صور المعارض (`uploads/gallery/`)
   - صور الأبطال (`uploads/hero/`)
   - صور الطلبات (`uploads/order-previews/`)
   - الموسيقى (`uploads/music/`)
   - الصور الشخصية (`uploads/photographer-logos/`)
   - الصور المصغرة (`uploads/thumbnails/`)
   - النسخ الاحتياطي (`backups/`)

### نمط العرض (Rendering)

- **الدعوات:** Server-Side Rendering (SSR) مع `force-dynamic`
- **الصفحة الرئيسية:** SSR مع `force-dynamic`
- **لوحة الإدارة:** SSR مع `force-dynamic`
- **صفحة القوالب:** SSR مع `force-dynamic`
- **API Routes:** جميعها Edge/Node.js Runtime

---

## 5. تحليل قاعدة البيانات (Prisma Schema)

### قائمة الجداول (13 جدول)

#### 1. جدول `AdminUser` - المستخدمون الإداريون

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String (cuid) | المعرف الفريد |
| `email` | String (unique) | البريد الإلكتروني |
| `name` | String | الاسم |
| `passwordHash` | String | كلمة المرور المشفرة |
| `role` | String (default: "OWNER") | الدور (Owner) |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**الغرض:** تخزين بيانات المسؤولين عن النظام.

#### 2. جدول `Customer` - العملاء

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String (cuid) | المعرف الفريد |
| `name` | String | اسم العميل |
| `phone` | String | رقم الهاتف |
| `email` | String? | البريد الإلكتروني (اختياري) |
| `username` | String (unique) | اسم المستخدم |
| `passwordHash` | String | كلمة المرور المشفرة |
| `isActive` | Boolean (default: true) | حالة التفعيل |
| `deletedAt` | DateTime? | تاريخ الحذف الناعم |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**العلاقات:** `invitations[]`, `orders[]`  
**الأندكسات:** phone, deletedAt, createdAt  
**الغرض:** تخزين بيانات العملاء (العُرسان).

#### 3. جدول `WeddingTemplate` - قوالب الزفاف

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String (cuid) | المعرف الفريد |
| `slug` | String (unique) | المعرف النصي الفريد |
| `name` | String | الاسم بالإنجليزية |
| `arabicName` | String | الاسم بالعربية |
| `category` | String | التصنيف |
| `style` | String | النمط (featured, royal, noir, ...) |
| `concept` | String | وصف المفهوم |
| `opening` | String | نوع الافتتاحية |
| `layout` | String | وصف التخطيط |
| `typography` | String | وصف الخطوط |
| `palette` | Json | لوحة الألوان (primary, secondary, accent, etc.) |
| `previewUrl` | String | رابط الصورة المصغرة |
| `enabled` | Boolean (default: true) | حالة التفعيل |
| `sortOrder` | Int (default: 0) | ترتيب العرض |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**العلاقات:** `invitations[]`, `orders[]`  
**الأندكسات:** enabled+sortOrder, style  
**الغرض:** تخزين تعريفات قوالب الدعوات الجاهزة.

#### 4. جدول `Invitation` - الدعوات

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String (cuid) | المعرف الفريد |
| `code` | String (unique) | كود الدعوة الفريد |
| `customSlug` | String? (unique) | الرابط المخصص |
| `status` | InvitationStatus (DRAFT/ACTIVE/PAUSED/ARCHIVED) | حالة الدعوة |
| `language` | String (default: "ar") | اللغة |
| `groomName` | String | اسم العريس |
| `brideName` | String | اسم العروسة |
| `weddingDate` | DateTime | تاريخ الزفاف |
| `weddingTime` | String | وقت الزفاف |
| `venue` | String | مكان الزفاف |
| `city` | String? | المدينة |
| `mapUrl` | String? | رابط الموقع على الخريطة |
| `heroPhoto` | String? | الصورة الرئيسية |
| `gallery` | Json (default: "[]") | معرض الصور |
| `musicUrl` | String? | رابط الموسيقى |
| `musicEnabled` | Boolean (default: false) | تفعيل الموسيقى |
| `manageToken` | String? (unique) | رمز الإدارة (لرابط العميل السري) |
| `manageTokenExpiresAt` | DateTime? | صلاحية رمز الإدارة |
| `texts` | Json? | النصوص المخصصة |
| `photographer` | Json? | بيانات المصور |
| `qrCodeUrl` | String? | رابط QR Code |
| `viewCount` | Int (default: 0) | عدد المشاهدات |
| `customerId` | String (FK → Customer) | معرف العميل |
| `templateId` | String (FK → WeddingTemplate) | معرف القالب |
| `deletedAt` | DateTime? | تاريخ الحذف الناعم |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**العلاقات:** `customer`, `template`, `guests[]`, `events[]`  
**الأندكسات:** status+weddingDate, customerId+createdAt, templateId, deletedAt, manageTokenExpiresAt  
**الغرض:** الجدول الرئيسي لتخزين بيانات الدعوات.

#### 5. جدول `GuestRsvp` - تأكيدات الحضور

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String (cuid) | المعرف الفريد |
| `invitationId` | String (FK → Invitation) | معرف الدعوة |
| `name` | String | اسم الضيف |
| `phone` | String | رقم الهاتف |
| `attendees` | Int (default: 1) | عدد الحضور |
| `status` | RsvpStatus (CONFIRMED/DECLINED) | حالة الحضور |
| `note` | String? | ملاحظة |
| `ipHash` | String? | بصمة IP مشفرة |
| `userAgent` | String? | معلومات المتصفح |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**العلاقات:** `invitation` (Cascade Delete)  
**الأندكسات:** invitationId+createdAt, invitationId+status, phone  
**الغرض:** تخزين ردود الضيوف على الدعوات (تأكيد / اعتذار).

#### 6. جدول `OrderRequest` - طلبات الدعوات

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String (cuid) | المعرف الفريد |
| `orderNumber` | String? (unique) | رقم الطلب |
| `dedupeKey` | String? (unique) | مفتاح منع التكرار |
| `groomName` | String | اسم العريس |
| `brideName` | String | اسم العروسة |
| `phone` | String | رقم الهاتف |
| `weddingDate` | DateTime | تاريخ الزفاف |
| `venue` | String | المكان |
| `mapUrl` | String? | رابط الخريطة |
| `notes` | String? | ملاحظات |
| `imageUrls` | Json (default: "[]") | روابط الصور |
| `musicEnabled` | Boolean (default: false) | تفعيل الموسيقى |
| `musicChoice` | String? | اختيار الموسيقى |
| `musicUrl` | String? | رابط الموسيقى |
| `texts` | Json? | النصوص |
| `photographer` | Json? | بيانات المصور |
| `rejectionReason` | String? | سبب الرفض |
| `publishedInvitationCode` | String? | كود الدعوة المنشورة |
| `manageToken` | String? (unique) | رمز الإدارة |
| `manageTokenExpiresAt` | DateTime? | صلاحية الرمز |
| `language` | String (default: "ar") | اللغة |
| `status` | OrderStatus (NEW/REVIEWING/EDITED/PUBLISHED/ACCEPTED/REJECTED/CONVERTED) | حالة الطلب |
| `submittedAt` | DateTime (default: now()) | تاريخ التقديم |
| `templateId` | String? (FK → WeddingTemplate) | القالب المختار |
| `customerId` | String? (FK → Customer) | العميل المرتبط |
| `deletedAt` | DateTime? | تاريخ الحذف الناعم |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**العلاقات:** `template?`, `customer?`  
**الأندكسات:** status+createdAt, phone, submittedAt, deletedAt, manageTokenExpiresAt  
**الغرض:** تخزين طلبات الدعوات الجديدة المقدمة من الزوار.

#### 7. جدول `AnalyticsEvent` - أحداث التحليلات

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String (cuid) | المعرف الفريد |
| `invitationId` | String (FK → Invitation) | معرف الدعوة |
| `eventType` | String | نوع الحدث (view, rsvp, guest_book, ...) |
| `metadata` | Json? | بيانات إضافية |
| `ipHash` | String? | بصمة IP مشفرة |
| `createdAt` | DateTime | تاريخ الحدث |

**العلاقات:** `invitation` (Cascade Delete)  
**الأندكسات:** invitationId+eventType+createdAt, createdAt  
**الغرض:** تخزين أحداث التحليلات لمشاهدات الدعوات وتفاعلاتها.

#### 8. جدول `DynamicPage` - الصفحات الديناميكية

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String (cuid) | المعرف الفريد |
| `slug` | String (unique) | الرابط المختصر |
| `title` | String | العنوان |
| `description` | String | الوصف |
| `content` | String | المحتوى (نص طويل) |
| `coverImageUrl` | String? | صورة الغلاف |
| `isPublished` | Boolean (default: true) | حالة النشر |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**الأندكسات:** isPublished+updatedAt  
**الغرض:** إنشاء صفحات مخصصة (عن المنصة، FAQ، إلخ).

#### 9. جدول `BackupJob` - وظائف النسخ الاحتياطي

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String (cuid) | المعرف الفريد |
| `type` | String | النوع (manual, automatic, github) |
| `status` | BackupStatus (QUEUED/RUNNING/SUCCESS/FAILED) | الحالة |
| `fileName` | String? | اسم الملف |
| `githubSha` | String? | SHA في GitHub |
| `githubUrl` | String? | رابط GitHub |
| `sizeBytes` | BigInt? | الحجم بالبايت |
| `startedAt` | DateTime? | وقت البدء |
| `finishedAt` | DateTime? | وقت الانتهاء |
| `error` | String? | رسالة الخطأ |
| `createdAt` | DateTime | تاريخ الإنشاء |

**الأندكسات:** type+createdAt, status  
**الغرض:** تتبع عمليات النسخ الاحتياطي.

#### 10. جدول `SyncLog` - سجل المزامنة

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String (cuid) | المعرف الفريد |
| `timestamp` | DateTime (default: now()) | وقت الحدث |
| `reason` | String | سبب المزامنة |
| `status` | String | الحالة (completed, failed, processing) |
| `filesCount` | Int? | عدد الملفات |
| `commitSha` | String? | SHA في GitHub |
| `commitUrl` | String? | رابط GitHub |
| `errorMessage` | String? | رسالة الخطأ |
| `duration` | Int? | المدة بالثواني |
| `retryCount` | Int (default: 0) | عدد المحاولات |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**الأندكسات:** status+createdAt, createdAt  
**الغرض:** تتبع عمليات المزامنة مع GitHub.

#### 11. جدول `AppSetting` - إعدادات التطبيق

| الحقل | النوع | الوصف |
|-------|------|-------|
| `key` | String (PK) | المفتاح |
| `value` | Json | القيمة |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**الغرض:** تخزين إعدادات عامة للتطبيق في قاعدة البيانات (غير مستخدم حالياً بكثافة).

#### 12. جدول `GuestBookMessage` - رسائل الضيوف (التهاني)

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String | المعرف الفريد |
| `invitationCode` | String | كود الدعوة |
| `name` | String | اسم المُرسل |
| `message` | String | نص الرسالة |
| `status` | String (default: "pending") | الحالة (pending/approved/rejected) |
| `reviewedAt` | DateTime? | تاريخ المراجعة |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**الأندكسات:** invitationCode+status+createdAt, createdAt  
**الغرض:** تخزين رسائل التهاني والتعليقات من الضيوف.

#### 13. جدول `CoupleMessagesSetting` - إعدادات رسائل العرسان

| الحقل | النوع | الوصف |
|-------|------|-------|
| `invitationCode` | String (PK) | كود الدعوة |
| `mode` | String (default: "moderated") | الوضع (disabled/auto/moderated) |
| `updatedAt` | DateTime | تاريخ التحديث |

**الأندكسات:** mode  
**الغرض:** إعدادات وضع رسائل التهاني لكل دعوة.

#### 14. جدول `ClientMessage` - رسائل الإدارة للعملاء

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String | المعرف الفريد |
| `invitationCode` | String | كود الدعوة |
| `title` | String | عنوان الرسالة |
| `body` | String | نص الرسالة |
| `sender` | String (default: "admin") | المُرسل |
| `readAt` | DateTime? | تاريخ القراءة |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**الأندكسات:** invitationCode+createdAt, readAt  
**الغرض:** نظام الرسائل الداخلية بين الإدارة والعملاء.

#### 15. جدول `InvitationCheckIn` - تسجيلات الوصول الفعلي

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String | المعرف الفريد |
| `invitationCode` | String | كود الدعوة |
| `visitorKey` | String | مفتاح الزائر |
| `userAgent` | String? | معلومات المتصفح |
| `createdAt` | DateTime | تاريخ التسجيل |

**القيود:** unique(invitationCode, visitorKey)  
**الأندكسات:** invitationCode+createdAt, createdAt  
**الغرض:** تسجيل وصول الضيوف الفعلي لمكان الحفل.

#### 16. جدول `WeddingLiveMode` - وضع الحفل المباشر

| الحقل | النوع | الوصف |
|-------|------|-------|
| `invitationCode` | String (PK) | كود الدعوة |
| `enabled` | Boolean (default: false) | حالة التفعيل |
| `announcement` | String? | الإعلان |
| `events` | Json (default: "[]") | جدول الفعاليات |
| `updatedBy` | String (default: "admin") | من قام بالتحديث |
| `updatedAt` | DateTime | تاريخ التحديث |

**الأندكسات:** enabled+updatedAt  
**الغرض:** إدارة وضع البث المباشر للحفل.

#### 17. جدول `InternalNote` - الملاحظات الداخلية

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String | المعرف الفريد |
| `entityType` | String | نوع الكيان (order/invitation/customer) |
| `entityId` | String | معرف الكيان |
| `body` | String | نص الملاحظة |
| `authorLabel` | String | اسم الكاتب |
| `createdAt` | DateTime | تاريخ الإنشاء |
| `updatedAt` | DateTime | تاريخ التحديث |

**الأندكسات:** entityType+entityId+updatedAt, updatedAt  
**الغرض:** ملاحظات داخلية للمسؤولين على الطلبات والدعوات والعملاء.

#### 18. جدول `AuditLog` - سجل التدقيق

| الحقل | النوع | الوصف |
|-------|------|-------|
| `id` | String | المعرف الفريد |
| `actorType` | String | نوع الفاعل (admin/client/system) |
| `actorId` | String? | معرف الفاعل |
| `actorLabel` | String | اسم الفاعل |
| `action` | String | الإجراء (create/update/delete) |
| `entityType` | String | نوع الكيان |
| `entityId` | String | معرف الكيان |
| `entityLabel` | String? | اسم الكيان |
| `oldValues` | Json? | القيم القديمة |
| `newValues` | Json? | القيم الجديدة |
| `metadata` | Json? | بيانات إضافية |
| `createdAt` | DateTime | تاريخ الحدث |

**الأندكسات:** action+createdAt, entityType+entityId+createdAt, actorType+createdAt, createdAt  
**الغرض:** تسجيل جميع الإجراءات الهامة في النظام لأغراض التدقيق.

---

## 6. تحليل جميع أقسام الموقع

### الأقسام العامة (Public)

| القسم | المسار | الوظيفة |
|-------|--------|---------|
| **الصفحة الرئيسية** | `/` | المقدمة، عرض المميزات، معاينة القالب، الباقات والأسعار، إحصائيات المنصة، عداد الزوار المباشر |
| **القوالب** | `/templates` | استعراض جميع قوالب الدعوات مع إمكانية التصفية والمعاينة |
| **معاينة القالب** | `/templates/[slug]/preview` | معاينة تفاعلية كاملة للقالب في الإطار |
| **إنشاء طلب** | `/order` | نموذج طلب دعوة جديد (بيانات العروسين، الصور، الموسيقى، القالب) |
| **صفحة الدعوة** | `/[code]` | صفحة الدعوة التفاعلية الكاملة (للمدعوين) |
| **صفحة ديناميكية** | `/[slug]` | صفحات مخصصة (عن المنصة، FAQ، إلخ) |
| **قائمة الأسعار** | `/pricing` | باقات الأسعار والخدمات |
| **اتصل بنا** | `/contact` | صفحة التواصل |
| **الأسئلة الشائعة** | `/faq` | الأسئلة الشائعة |
| **سياسة الخصوصية** | `/privacy-policy` | صفحة قانونية |
| **الشروط والأحكام** | `/terms` | صفحة قانونية |
| **سياسة الاسترجاع** | `/refund-policy` | صفحة قانونية |
| **سياسة الاستخدام** | `/usage-policy` | صفحة قانونية |
| **Sitemap** | `/sitemap.xml` | خريطة الموقع لمحركات البحث |
| **Robots.txt** | `/robots.txt` | ملف تعليمات محركات البحث |

### أقسام العميل (Client Portal)

| القسم | المسار | الوظيفة |
|-------|--------|---------|
| **بوابة العميل** | `/[code]/ad_3399` | لوحة تحكم العميل (العروسان لإدارة دعوتهم) |
| **تسجيل الدخول** | `/[code]/ad_3399/login` | (معطل حالياً - الرابط السري بديل) |
| **رابط الإدارة** | `/manage/invitation/[token]` | رابط سري لتسجيل الدخول كعميل |
| **رابط غير صالح** | `/manage/invitation/invalid` | صفحة عند انتهاء صلاحية الرابط |

### أقسام الإدارة (Admin Panel) - 36 صفحة

(مفصلة في القسم 9)

### أقسام API (67 Endpoint)

(مفصلة في القسم 15)

---

## 7. دورة العمل الكاملة للنظام

### المرحلة 1: وصول الزائر للموقع

```
الزائر → الصفحة الرئيسية (/)
            │
            ├── يتصفح القوالب (/templates)
            ├── يشاهد معاينة القالب (/templates/[slug]/preview)
            ├── يتصفح الأسعار (/pricing)
            ├── يقرأ الأسئلة الشائعة (/faq)
            └── يقرأ الصفحات القانونية
```

### المرحلة 2: إنشاء الطلب

```
الزائر → صفحة الطلب (/order)
            │
            ├── يختار القالب
            ├── يدخل بيانات العروسين (الاسم، التاريخ، المكان، رقم الهاتف)
            ├── يرفع صور المعاينة (صورة بطل / فيديو / معرض)
            ├── يختار أو يرفع موسيقى (من المكتبة / رفع ملف / رابط / استخراج من فيديو)
            ├── يدخل نصوص مخصصة (اختياري)
            ├── يختار مصور (اختياري)
            └── يرسل الطلب
                    │
                    ├── POST /api/orders
                    ├── إنشاء سجل OrderRequest في PostgreSQL
                    ├── إنشاء رقم طلب فريد
                    ├── إنشاء管理Token للعميل
                    ├── إرسال إشعار واتساب للمسؤول
                    └── توجيه العميل إلى صفحة النجاح مع رابط المتابعة
```

### المرحلة 3: إدارة الطلب (Admin)

```
Admin → لوحة الإدارة → الطلبات (/admin/orders)
            │
            ├── مراجعة الطلب (بيانات + صور + موسيقى)
            ├── إضافة ملاحظات داخلية (Internal Notes)
            ├── إضافة إلى المفضلة
            │
            ├── قبول الطلب → تحويل الطلب إلى دعوة (Publish)
            │       │
            │       ├── إنشاء حساب عميل (Customer) في PostgreSQL
            │       ├── إنشاء دعوة (Invitation) في PostgreSQL
            │       ├── ربط القالب المختار
            │       ├── حفظ الصور والموسيقى والنصوص
            │       ├── إنشاء كود فريد ورابط إدارة سري
            │       ├── تحديث حالة الطلب إلى PUBLISHED
            │       └── الدعوة جاهزة للنشر
            │
            ├── طلب تعديل → تحديث الحالة إلى EDITED
            │
            └── رفض الطلب → تحديث الحالة إلى REJECTED مع سبب
```

### المرحلة 4: إدارة الدعوة

```
Admin → لوحة الإدارة → الدعوات (/admin/invitations)
            │
            ├── عرض جميع الدعوات
            ├── تصفية حسب الحالة (نشط/متوقف/مؤرشف)
            ├── بحث وبحث متقدم
            ├── نسخ رابط الدعوة
            │
            ├── إيقاف الدعوة (Pause)
            ├── استئناف الدعوة (Resume)
            ├── أرشفة الدعوة (Archive)
            ├── حذف ناعم (إلى سلة المهملات)
            └── تعيين رابط مخصص (Custom Slug)
```

### المرحلة 5: تفاعل الضيوف مع الدعوة

```
الضيف → الرابط العام ([code]) أو الرابط المخصص
            │
            ├── مشاهدة الدعوة التفاعلية
            │       ├── Opening (افتتاحية سينمائية / كلاسيكية)
            │       ├── التفاصيل (أسماء، تاريخ، وقت، مكان)
            │       ├── عداد تنازلي للزفاف
            │       ├── قصة العروسين (Timeline)
            │       ├── معرض الصور (Gallery)
            │       ├── خريطة المكان
            │       ├── مصور المناسبة
            │       ├── QR Code للحضور
            │       ├── تأثيرات التمرير (Parallax/Scroll Animations)
            │       └── موسيقى الخلفية (قابلة للتشغيل/الإيقاف)
            │
            ├── تأكيد الحضور (RSVP)
            │       ├── POST /api/invitations/[code]/rsvp
            │       ├── إدخال الاسم، الهاتف، عدد الحضور، الحالة (حاضر/معتذر)
            │       └── إنشاء سجل GuestRsvp في PostgreSQL
            │
            ├── إرسال تهنئة (Guest Book)
            │       ├── POST /api/invitations/[code]/guest-book
            │       ├── إدخال الاسم والرسالة
            │       ├── (Auto-approve / Moderated حسب الإعدادات)
            │       └── إنشاء سجل GuestBookMessage
            │
            ├── تسجيل الوصول (Check-In)
            │       ├── POST /api/invitations/[code]/check-in
            │       └── تسجيل وصول فعلي للحفل
            │
            ├── إضافة إلى التقويم (ICS Calendar)
            │       └── تحميل ملف .ics
            │
            ├── مشاركة الدعوة
            │       ├── رابط مباشر
            │       ├── QR Code
            │       ├── واتساب
            │       └── وسائل التواصل الاجتماعي
            │
            └── عرض وضع الحفل المباشر (Live Mode)
                    ├── إعلانات
                    ├── جدول الفعاليات
                    └── (إذا كان مفعلاً)
```

### المرحلة 6: إدارة العميل لدعوته

```
العميل → الرابط السري /manage/invitation/[token]
            │
            ├── إنشاء جلسة عميل (Client Session Cookie)
            ├── التوجيه إلى /[code]/ad_3399
            │
            ├── تعديل بيانات الدعوة:
            │       ├── الأسماء، التاريخ، الوقت، المكان
            │       ├── معرض الصور
            │       ├── الموسيقى
            │       ├── النصوص
            │       └── المصور
            │
            ├── عرض الحضور (قائمة الضيوف + RSVP)
            ├── عرض التهاني (Guest Book)
            │       └── تغيير إعدادات Guest Book (Auto/Moderated/Disabled)
            │
            ├── عرض QR Code الخاص بالدعوة
            ├── أدوات المشاركة
            ├── تفعيل/إيقاف وضع الحفل المباشر
            ├── إضافة الفعاليات للحفل المباشر
            ├── عرض إحصائيات الدعوة
            └── قراءة رسائل الإدارة
```

### المرحلة 7: التقارير والتحليلات

```
Admin → لوحة الإدارة → التحليلات (/admin/analytics)
            │
            ├── إحصائيات المشاهدات (كل الدعوات)
            ├── تحليل مصادر الزوار
            ├── تحليل RSVP
            ├── ترتيب الدعوات الأكثر مشاهدة
            ├── أيام وأوقات الذروة
            └── تصدير تقارير (CSV / Excel / PDF)
```

### المرحلة 8: الصيانة والنسخ الاحتياطي

```
تلقائي:
    ┌── Cron Job كل 6 ساعات → /api/cron/backup
    │       ├── إنشاء نسخة احتياطية لبيانات Runtime
    │       └── تسجيل في جدول BackupJob
    │
    └── GitHub Sync (عند كل تعديل)
            ├── مزامنة إعدادات الموقع
            ├── مزامنة القوالب
            ├── مزامنة المحتوى
            └── مزامنة مكتبة الموسيقى

يدوي (Admin):
    ├── إنشاء نسخة احتياطية يدوية
    ├── تنزيل النسخ الاحتياطية
    ├── التحقق من سلامة النسخ
    ├── تنظيف الوسائط (ملفات يتيمة، مكررة)
    └── استعادة (يدوي فقط - خارج التطبيق)
```

---

## 8. تحليل أنواع المستخدمين والصلاحيات

### 1. Super Admin / Admin

| الخاصية | الوصف |
|---------|-------|
| **طريقة الدخول** | نموذج تسجيل دخول في `/admin/login` |
| **المصادقة** | جلسة HTTP-only Cookie (admin_session) |
| **الصلاحية** | كاملة على جميع أقسام النظام |
| **عدد المستخدمين** | مخزن في ENV: `ADMIN_USERNAME` / `ADMIN_PASSWORD` |
| **الصلاحيات** | |

**الصلاحيات الكاملة:**
- إدارة جميع الدعوات (إنشاء، تعديل، إيقاف، حذف)
- إدارة جميع الطلبات (مراجعة، نشر، رفض)
- إدارة العملاء (عرض، حذف)
- إدارة القوالب (إنشاء، تعديل، استيراد)
- إدارة مكتبة الموسيقى
- إدارة الوسائط والملفات
- إدارة إعدادات الموقع
- إدارة الصفحات القانونية والديناميكية
- إدارة قوالب الرسائل والنصوص الجاهزة
- إدارة رسائل العملاء
- إدارة Guest Book لجميع الدعوات
- إدارة وضع الحفل المباشر
- إدارة سلة المهملات
- عرض التحليلات والتقارير (وتصديرها)
- إدارة النسخ الاحتياطي
- إدارة المزامنة مع GitHub
- إدارة المهام المجدولة
- عرض سجل التدقيق
- عرض صحة النظام
- عرض تتبع الأخطاء
- البحث العام
- إدارة الملاحظات الداخلية والمفضلة
- إدارة الإشعارات والبث المباشر (Broadcast)

### 2. Client (العميل - العروسان)

| الخاصية | الوصف |
|---------|-------|
| **طريقة الدخول** | رابط سري `/manage/invitation/[token]` - لا يوجد نموذج دخول |
| **المصادقة** | جلسة HTTP-only Cookie (client_session) مرتبطة بكود الدعوة |
| **الصلاحية** | على دعوته الخاصة فقط |
| **Token** | يتم إنشاؤه تلقائياً عند إنشاء الدعوة مع صلاحية زمنية |

**الصلاحيات:**
- تعديل بيانات دعوته (الأسماء، التاريخ، الوقت، المكان)
- إدارة معرض الصور
- إدارة الموسيقى
- تعديل النصوص المخصصة
- عرض قائمة الحضور
- إدارة إعدادات التهاني (Auto/Moderated/Disabled)
- تفعيل/إيقاف وضع الحفل المباشر وإضافة الفعاليات
- عرض QR Code
- عرض إحصائيات الدعوة
- قراءة رسائل الإدارة
- أدوات المشاركة

**القيود:**
- لا يمكنه تغيير القالب
- لا يمكنه حذف الدعوة
- لا يمكنه رؤية دعوات أخرى
- لا يمكنه الوصول للوحة الإدارة

### 3. Guest (الضيف)

| الخاصية | الوصف |
|---------|-------|
| **طريقة الدخول** | لا يوجد تسجيل دخول - الوصول المباشر للرابط العام |
| **المصادقة** | لا توجد |
| **الصلاحية** | فقط التفاعل مع الدعوة |

**الصلاحيات:**
- مشاهدة الدعوة
- تأكيد الحضور (RSVP)
- إرسال تهنئة (Guest Book)
- تسجيل الوصول (Check-In)
- تحميل ملف التقويم (ICS)
- مشاركة الدعوة
- عرض وضع الحفل المباشر

### 4. Public (الزائر)

| الخاصية | الوصف |
|---------|-------|
| **طريقة الدخول** | لا يوجد تسجيل دخول |
| **الصلاحية** | التصفح العام فقط |

**الصلاحيات:**
- تصفح الصفحة الرئيسية
- استعراض القوالب
- مشاهدة معاينات القوالب
- تصفح الأسعار
- تقديم طلب دعوة (Order Request)
- قراءة الصفحات القانونية

---

## 9. تحليل صفحات لوحة الإدارة

### جدول شامل لجميع صفحات الإدارة (36 صفحة)

| # | الصفحة | المسار | الوظيفة | البيانات التي تديرها |
|---|--------|--------|---------|---------------------|
| 1 | **لوحة التحكم** | `/admin` | نظرة شاملة على جميع مؤشرات الأداء | إحصائيات سريعة (الدعوات، العملاء، الزوار، الطلبات، الحضور، الرسائل) |
| 2 | **الدعوات** | `/admin/invitations` | إدارة جميع الدعوات مع فلترة وبحث | Invitation, GuestRsvp |
| 3 | **إنشاء دعوة** | `/admin/new-invitation` | معالج إنشاء دعوة جديد (Wizard) | Customer, Invitation, WeddingTemplate |
| 4 | **الدعوة** | `/admin/invitations/[code]` | تفاصيل وإدارة دعوة محددة | Invitation, GuestRsvp, AnalyticsEvent |
| 5 | **الطلبات** | `/admin/orders` | إدارة طلبات الدعوات الواردة | OrderRequest, Customer, Invitation |
| 6 | **العملاء** | `/admin/customers` | إدارة حسابات العملاء | Customer, InternalNote, AdminFavorite |
| 7 | **القوالب** | `/admin/templates` | إدارة وتحرير قوالب الدعوات | WeddingTemplate, TemplateSettings |
| 8 | **مكتبة الموسيقى** | `/admin/music` | إدارة ملفات الموسيقى | music-library.json, templates-preview-music.json |
| 9 | **مكتبة الوسائط** | `/admin/media` | إدارة جميع الملفات المرفوعة | ملفات التخزين (images, audio, video) |
| 10 | **الحضور** | `/admin/attendance` | إدارة ردود RSVP مع بحث وتصفية | GuestRsvp |
| 11 | **التحليلات** | `/admin/analytics` | تقارير وإحصائيات المنصة | AnalyticsEvent, Invitation, GuestRsvp |
| 12 | **التهاني** | `/admin/guest-book` | إدارة رسائل التهاني لجميع الدعوات | GuestBookMessage, CoupleMessagesSetting |
| 13 | **الرسائل** | `/admin/messages` | نظام الرسائل الداخلية للعملاء | ClientMessage |
| 14 | **المفضلة** | `/admin/favorites` | العناصر المفضلة للمسؤول | AdminFavorite |
| 15 | **الإعدادات** | `/admin/settings` | إعدادات الموقع العامة | site-settings.json |
| 16 | **الصفحات القانونية** | `/admin/legal` | تحرير الصفحات القانونية | dynamic-pages.json (legal pages) |
| 17 | **الصفحات** | `/admin/pages` | إنشاء وإدارة الصفحات الديناميكية | DynamicPage (PostgreSQL) |
| 18 | **النصوص الجاهزة** | `/admin/content-presets` | إدارة النصوص الجاهزة للدعوات | ContentPreset |
| 19 | **قوالب الرسائل** | `/admin/message-templates` | قوالب رسائل واتساب وتذكير | MessageTemplate |
| 20 | **وضع الحفل** | `/admin/live-mode` | تفعيل وإدارة الوضع المباشر للحفلات | WeddingLiveMode, InvitationCheckIn |
| 21 | **تسجيل الوصول** | `/admin/check-ins` | تتبع الوصول الفعلي للضيوف | InvitationCheckIn, GuestRsvp |
| 22 | **البث المباشر** | `/admin/broadcast` | استوديو البث لتعديل المحتوى المباشر | home-content.json, home-preview-settings.json |
| 23 | **المعاينة** | `/admin/preview` | إدارة معاينة الصفحة الرئيسية | home-preview-settings.json |
| 24 | **النسخ الاحتياطي** | `/admin/backups` | إدارة النسخ الاحتياطية | BackupJob, ملفات النسخ |
| 25 | **المزامنة** | `/admin/sync` | مركز المزامنة والنسخ (صفحة رئيسية) | - |
| 26 | **إعدادات المزامنة** | `/admin/sync-settings` | إعدادات مزامنة GitHub | GitHub sync configuration |
| 27 | **سجل المزامنة** | `/admin/sync-history` | تاريخ عمليات المزامنة | SyncLog |
| 28 | **المهام المجدولة** | `/admin/tasks` | تشغيل المهام الدورية يدوياً | ScheduledTasks, BackupJob |
| 29 | **سلة المهملات** | `/admin/trash` | العناصر المحذوفة (استعادة/حذف نهائي) | Invitation, OrderRequest, Customer |
| 30 | **سجل التدقيق** | `/admin/audit-log` | سجل جميع الإجراءات الهامة | AuditLog |
| 31 | **التعديلات الأخيرة** | `/admin/recent-edits` | نقاط الاستعادة من النسخ الاحتياطية | BackupJob (snapshots) |
| 32 | **صحة النظام** | `/admin/system-health` | مؤشرات صحة النظام | System Health Check |
| 33 | **تتبع الأخطاء** | `/admin/errors` | سجل أخطاء التطبيق | ErrorEvent |
| 34 | **الإشعارات** | `/admin/notifications` | مركز الإشعارات الداخلية | AdminNotification |
| 35 | **البحث** | `/admin/search` | بحث عام في جميع الكيانات | Invitation, Customer, Order, Guest, Template |
| 36 | **المراقبة** | `/admin/monitoring` | صفحة رئيسية للمراقبة (روابط سريعة) | - |
| 37 | **التشخيص** | `/admin/diagnostics` | تشخيص نظام النسخ الاحتياطي | Backup Diagnostics |
| 38 | **تسجيل الدخول** | `/admin/login` | صفحة دخول المسؤول | Admin Session |

---

## 10. تحليل نظام القوالب

### هيكل القالب

كل قالب في النظام يحتوي على:

```typescript
{
  id: string;           // معرف فريد (cuid)
  slug: string;         // معرف نصي (مثال: featured-1)
  name: string;         // اسم إنجليزي
  arabicName: string;   // اسم عربي
  category: string;     // تصنيف
  style: string;        // نمط (featured, royal, noir, ...)
  concept: string;      // وصف المفهوم
  opening: string;      // نوع الافتتاحية
  layout: string;       // وصف التخطيط
  typography: string;   // وصف الخطوط
  palette: {            // لوحة الألوان
    primary: string;
    secondary: string;
    accent: string;
    ink: string;
    surface: string;
  };
  previewUrl: string;   // رابط الصورة المصغرة
  enabled: boolean;     // مفعل أم لا
  sortOrder: number;    // ترتيب العرض
}
```

### طريقة تخزين القوالب

1. **مخزن مزدوج:**
   - **ملف JSON:** `data/wedding-templates.json` - يحتوي على جميع تعريفات القوالب
   - **قاعدة البيانات:** جدول `WeddingTemplate` في PostgreSQL (للدعوات المرتبطة)

2. **ملفات القوالب الفعلية:**
   - صور SVG/PNG للمعاينة في `/public/assets/templates/`
   - كود HTML المخصص للقوالب المخصصة (Custom Templates)

### إدارة القوالب

| الوظيفة | الطريقة |
|---------|---------|
| **عرض القوالب** | صفحة `/templates` مع مكون `TemplateBrowser` |
| **معاينة القالب** | صفحة `/templates/[slug]/preview` مع إطار iframe |
| **تعديل معلومات القالب** | واجهة `AdminTemplatePreviewInfoEditor` في `/admin/templates` |
| **تعديل نصوص القالب** | محرر نصوص مباشر (`AdminTextEditor`) |
| **تعديل الإعدادات** | `POST /api/admin/templates/music` (الألوان، الموسيقى، المصور) |
| **استيراد قالب جديد** | من كود HTML عبر `POST /api/admin/templates/import` |
| **تحديث المحتوى العام** | `POST /api/admin/templates/content` (وضع global/template) |
| **رفع وسائط القوالب** | `POST /api/admin/templates/media` (صور وفيديو) |

### آلية التخصيص

1. **المحتوى العام (Global):** ينطبق على جميع القوالب بشكل افتراضي
2. **التجاوزات (Template Overrides):** يمكن تخصيص كل قالب على حدة
3. **حل التعارضات:** عند اختلاف المحتوى العام عن المحتوى المخصص، يطلب النظام تأكيد المستخدم (Conflict Resolution)
4. **المرونة الكاملة:** يمكن تغيير (الأسماء، تاريخ الزفاف، المكان، معرض الصور، الموسيقى، النصوص، المصور)

### علاقة القوالب بالدعوات

```
WeddingTemplate ←── Invitation (templateId FK)
       │                    │
       │              (عند إنشاء دعوة،
       │               يتم تحديد القالب)
       │
       └── OrderRequest (templateId FK)
                    │
              (عند تقديم طلب،
               يختار الزائر القالب)
```

---

## 11. تحليل نظام الموسيقى

### بنية نظام الموسيقى

```
                ┌─────────────────────────────────┐
                │       Music Library System       │
                │       (data/music-library.json)  │
                │                                  │
                │  slots: [{ id, name, url,        │
                │    enabled, applyToAll,          │
                │    templateSlugs, source,        │
                │    sizeBytes, mimeType }]        │
                └────────────────┬────────────────┘
                                 │
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
    ┌──────────────┐   ┌────────────────┐   ┌──────────────────┐
    │  Default     │   │ Template       │   │ Per-Invitation   │
    │  Site Music  │   │ Preview Music  │   │ Music            │
    │              │   │                │   │                  │
    │  تطبق على    │   │ موسيقى خاصة   │   │ musicUrl         │
    │  كل الدعوات  │   │ لمعاينة القالب│   │ musicEnabled     │
    │  الافتراضي   │   │ (لا تؤثر على  │   │ musicSource      │
    │              │   │  الدعوات)     │   │ (default/library │
    └──────┬───────┘   └───────┬────────┘   │  /upload/video/  │
           │                  │             │   url)           │
           │                  │             └────────┬─────────┘
           ▼                  ▼                      ▼
    ┌──────────────────────────────────────────────────────┐
    │              Music Resolution Logic                   │
    │              (lib/music-library.ts)                   │
    │                                                       │
    │  1. إذا كانت الدعوة لها musicUrl → استخدمها          │
    │  2. إذا كان musicEnabled = false → لا موسيقى         │
    │  3. إذا كان هناك track في المكتبة → استخدمه          │
    │  4. إذا كان القالب له musicUrl → استخدمه             │
    │  5. وإلا → لا موسيقى                                 │
    └──────────────────────────────────────────────────────┘
```

### مصادر الموسيقى

| المصدر | الوصف | مكان التخزين |
|--------|-------|-------------|
| **رفع ملف (Upload)** | رفع ملف MP3 مباشر | `uploads/music/` |
| **رابط خارجي (URL)** | رابط موسيقى خارجي | يُخزن الرابط مباشرة |
| **مكتبة الموسيقى** | مسارات محددة مسبقاً في النظام | `data/music-library.json` والملفات في `uploads/music/` |
| **استخراج من فيديو (Video)** | استخراج MP3 من فيديو | `uploads/music/` بعد المعالجة |
| **الموسيقى الافتراضية (Default)** | المسار الافتراضي للمنصة | يتم تعيينه في مكتبة الموسيقى |

### أولويات التشغيل

1. الموسيقى المحددة للدعوة (إذا كان `musicEnabled = true`)
2. موسيقى القالب (إذا وجدت)
3. المسار الافتراضي من مكتبة الموسيقى (إذا كان `applyToAll = true`)
4. لا موسيقى

### إدارة الموسيقى في لوحة الإدارة

| الصفحة | الوظيفة |
|--------|---------|
| `/admin/music` | إدارة مكتبة الموسيقى كاملة |
| إضافة مسار | رفع ملف + اسم + إمكانية جعله افتراضي |
| تعديل | تغيير الاسم، استبدال الملف |
| تعيين كافتراضي | جعل المسار هو الافتراضي للمنصة |
| حذف | حذف مع تحذير إذا كان مستخدماً (تلقائياً يحول للافتراضي) |
| موسيقى معاينة القوالب | موسيقى منفصلة لمعاينة القوالب (لا تؤثر على الدعوات) |

---

## 12. تحليل نظام الإحصائيات والتقارير

### مصادر البيانات

| المصدر | البيانات |
|--------|----------|
| **AnalyticsEvent** (PostgreSQL) | مشاهدات الدعوات، نوع الحدث، التوقيت |
| **GuestRsvp** (PostgreSQL) | تأكيدات الحضور، عدد الحضور، الحالة |
| **Invitation.viewCount** (PostgreSQL) | عدد المشاهدات المباشر |
| **Visit Source Analytics** | تحليل مصدر الزائر (searchParams, referrer) |

### التحليلات المتوفرة

| التقرير | الوصف |
|---------|-------|
| **إجمالي الزيارات** | عدد مشاهدات جميع الدعوات |
| **RSVP المؤكد** | عدد الضيوف الذين أكدوا الحضور |
| **RSVP المعتذر** | عدد الضيوف الذين اعتذروا |
| **الحضور المتوقع** | إجمالي عدد الضيوف المتوقعين |
| **معدل التحويل** | نسبة المؤكدين إلى إجمالي الردود |
| **أفضل مصدر** | أكثر مصدر زوار |
| **نمو المشاهدات** | رسم بياني للزيارات خلال الفترة |
| **مصادر الزوار** | تحليل مصادر الدخول (مباشر، واتساب، مواقع تواصل، إلخ) |
| **أيام الذروة** | أكثر أيام الأسبوع زيارة |
| **ساعات الذروة** | أكثر ساعات اليوم زيارة |
| **أفضل الدعوات** | ترتيب الدعوات حسب المشاهدات |
| **آخر الردود** | أحدث ردود RSVP |
| **مقارنة الدعوات** | جدول مقارنة لجميع الدعوات |

### التصدير

| الصيغة | الوظيفة |
|--------|---------|
| **CSV** | تصدير التحليلات إلى CSV |
| **Excel (XLSX)** | تصدير التحليلات إلى Excel |
| **PDF** | تصدير التحليلات إلى PDF |
| **Excel للحضور** | تصدير قائمة الحضور لكل دعوة |
| **PDF للحضور** | تصدير قائمة الحضور إلى PDF مع دعم الخط العربي |

---

## 13. تحليل نظام النسخ الاحتياطي والاستعادة

### مكونات النظام

```
┌─────────────────────────────────────────────────────────────┐
│                    Backup System                            │
│                                                             │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │  Runtime Backup     │  │  GitHub Sync                 │  │
│  │  (ملفات JSON +      │  │  (إعدادات الموقع + القوالب  │  │
│  │   بيانات الملفات)   │  │   + المحتوى + الموسيقى)     │  │
│  └─────────┬───────────┘  └──────────────┬───────────────┘  │
│            │                             │                   │
│            ▼                             ▼                   │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │  ملف JSON في        │  │  Commit مباشر إلى            │  │
│  │  backups/ directory │  │  GitHub Repository            │  │
│  └─────────────────────┘  └──────────────────────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PostgreSQL Dump (اختياري - إذا كانت DB موجودة)      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### أنواع النسخ الاحتياطي

| النوع | التوقيت | المحتوى | الوجهة |
|-------|---------|---------|--------|
| **تلقائي (Cron)** | كل 6 ساعات (Railway Cron) | جميع ملفات Runtime | `backups/` directory |
| **يدوي (Manual)** | عند الطلب من Admin | جميع ملفات Runtime | `backups/` directory |
| **GitHub Sync** | عند كل تعديل في الإدارة | بيانات المشروع (إعدادات، قوالب، محتوى) | GitHub Repository |

### مكونات النسخة الاحتياطية (Runtime Snapshot)

- جميع إعدادات الموقع (`site-settings.json`)
- جميع القوالب (`wedding-templates.json`)
- مكتبة الموسيقى (`music-library.json`)
- إعدادات القوالب (`template-settings.json`)
- معلومات معاينة القوالب (`template-preview-info.json`)
- محتوى الصفحة الرئيسية (`home-content.json`)
- إعدادات المعاينة (`home-preview-settings.json`)
- جميع الصفحات القانونية والديناميكية (`dynamic-pages.json`)
- قائمة جميع الملفات المرفوعة مع تجزئة (hash)
- نسخة PostgreSQL (إذا كانت قاعدة البيانات متصلة)

### واجهة المستخدم

| الصفحة | الوظيفة |
|--------|---------|
| `/admin/backups` | عرض جميع النسخ، إنشاء نسخة يدوية، تنزيل |
| `/admin/sync` | مركز المزامنة (صفحة رئيسية) |
| `/admin/sync-settings` | إعدادات مزامنة GitHub |
| `/admin/sync-history` | سجل عمليات المزامنة |
| `/admin/recent-edits` | نقاط الاستعادة من النسخ الاحتياطية |
| `/admin/tasks` | تشغيل المهام الدورية يدوياً |
| `/admin/diagnostics` | تشخيص نظام النسخ الاحتياطي |

### مهم: الاستعادة يدوية فقط (Manual Restore Only)

النظام لا يدعم الاستعادة التلقائية من الواجهة. Endpoint `POST /api/admin/recent-edits/restore` هو مجرد placeholder يُرجع خطأ `manual-restore-only`. عملية الاستعادة تتم يدوياً بتحميل ملف النسخة وتطبيقه خارج التطبيق.

---

## 14. تحليل نظام SEO

### الميزات الحالية

| الميزة | الوصف | الملف المسؤول |
|--------|-------|---------------|
| **Meta tags ديناميكية** | Title, description, keywords, OG tags لكل صفحة | `app/layout.tsx` |
| **Sitemap.xml** | خريطة الموقع التلقائية (صفحات ثابتة + ديناميكية + دعوات نشطة) | `app/sitemap.ts` |
| **Robots.txt** | منع أرشفة /admin, /api, /manage, /ad_3399 | `app/robots.ts` |
| **Structured Data** | JSON-LD للدعوات (Event schema) | `app/[code]/page.tsx` |
| **Meta للدعوات** | عنوان ووصف مخصص لكل دعوة | `lib/invitation-seo.ts` |
| **OpenGraph** | og:title, og:description, og:image, og:site_name | `app/layout.tsx` |
| **Theme Color** | لون الثيم للمتصفح | `app/layout.tsx` (viewport) |
| **تحسين الصور** | AVIF, WebP, أحجام متعددة | `next.config.ts` |

### إعدادات SEO في لوحة الإدارة

| الإعداد | الموقع |
|---------|--------|
| عنوان الموقع (Title) | `/admin/settings` → قسم SEO |
| وصف الموقع (Description) | `/admin/settings` → قسم SEO |
| كلمات مفتاحية (Keywords) | `/admin/settings` → قسم SEO |
| OG Title | `/admin/settings` → قسم SEO |
| OG Description | `/admin/settings` → قسم SEO |
| رابط الموقع | `NEXT_PUBLIC_SITE_URL` في ENV |

### ملاحظات على SEO

- **Meta للصفحات الديناميكية:** تدعم `generateMetadata` في `[code]/page.tsx` مع `DynamicPageView`
- **الصفحات القانونية:** لا تحتوي على Meta tags مخصصة (تستخدم الـ default)
- **Sitemap:** يشمل الدعوات النشطة فقط (status = ACTIVE) مع حد أقصى 1000
- **Structured Data:** تستخدم `Event` schema من schema.org للدعوات

---

## 15. تحليل الـ API بالكامل

### إجمالي: 67 Endpoint

### Auth APIs (4 endpoints)

| الطريقة | المسار | الوظيفة | الصلاحية | المدخلات | المخرجات |
|---------|--------|---------|----------|----------|----------|
| POST | `/api/auth/admin/login` | تسجيل دخول المسؤول | عام (محدود المعدل) | username, password, next | Redirect مع Cookie |
| POST | `/api/auth/admin/logout` | تسجيل خروج المسؤول | عام | - | Redirect بعد حذف Cookie |
| POST | `/api/auth/client/login` | **معطل (410 Gone)** | - | - | خطأ 410 |
| POST | `/api/auth/client/logout` | تسجيل خروج العميل | عام | code | Redirect بعد حذف Cookie |

### Admin APIs (44 endpoints)

| الطريقة | المسار | الوظيفة |
|---------|--------|---------|
| POST | `/api/admin/invitations` | إنشاء دعوة جديدة |
| POST | `/api/admin/invitations/[code]` | إجراء على دعوة (pause/resume/archive/delete/custom-slug) |
| POST | `/api/admin/invitation-builder` | إنشاء/تعديل دعوة متقدم (JSON API) |
| POST | `/api/admin/customers/[id]` | حذف عميل (soft-delete) |
| POST | `/api/admin/templates/info` | تحديث معلومات معاينة القالب |
| POST | `/api/admin/templates/text` | تحديث حقل نصي واحد |
| GET/POST | `/api/admin/templates/content` | جلب/تحديث محتوى القوالب (global/template) |
| POST | `/api/admin/templates/media` | رفع وسائط للقوالب |
| POST | `/api/admin/templates/music` | تحديث إعدادات قالب واحد |
| POST | `/api/admin/templates/import` | استيراد قالب من HTML |
| POST | `/api/admin/music` | إدارة مكتبة الموسيقى (CRUD, default, preview) |
| GET/POST | `/api/admin/settings` | جلب/تحديث إعدادات الموقع |
| GET/POST | `/api/admin/backups` | عرض/إنشاء النسخ الاحتياطي |
| GET | `/api/admin/backups/[fileName]` | تحميل نسخة احتياطية |
| POST | `/api/admin/backups/verify` | التحقق من سلامة النسخة |
| GET | `/api/admin/analytics/export` | تصدير التحليلات (CSV/XLSX/PDF) |
| POST | `/api/admin/media/file` | حذف/استبدال ملف وسائط |
| POST | `/api/admin/media/cleanup` | تنظيف التخزين |
| GET/POST | `/api/admin/sync-status` | حالة/تشغيل مزامنة GitHub |
| POST | `/api/admin/sync/retry` | إعادة محاولة مزامنة فاشلة |
| GET | `/api/admin/sync/status` | حالة المزامنة |
| GET | `/api/admin/sync/history` | سجل المزامنة مع pagination |
| POST | `/api/admin/rsvp/[id]` | تعديل/حذف RSVP |
| GET | `/api/admin/attendance/export` | تصدير الحضور (CSV/XLSX) |
| POST | `/api/admin/guest-book` | إدارة التهاني (موافقة/رفض/حذف/مجموعات) |
| POST | `/api/admin/client-messages` | إرسال رسالة للعميل |
| GET | `/api/admin/client-messages/unread-count` | عدد الرسائل غير المقروءة |
| GET/POST | `/api/admin/notification-center` | عرض/تحديث الإشعارات |
| POST | `/api/admin/notifications/send` | إرسال إشعار Push |
| PATCH/POST | `/api/admin/broadcast` | تحديث محتوى البث المباشر |
| POST | `/api/admin/live-mode` | تكوين وضع الحفل المباشر |
| GET | `/api/admin/orders/count` | عدد الطلبات المعلقة |
| POST | `/api/admin/orders/[id]` | إدارة طلب (update/review/reject/publish/delete) |
| POST | `/api/admin/legal-pages` | تحديث صفحة قانونية |
| POST | `/api/admin/pages` | CRUD للصفحات الديناميكية |
| POST | `/api/admin/message-templates` | CRUD لقوالب الرسائل |
| POST | `/api/admin/content-presets` | CRUD للنصوص الجاهزة |
| POST | `/api/admin/internal-notes` | CRUD للملاحظات الداخلية |
| POST | `/api/admin/favorites` | تبديل المفضلة |
| POST | `/api/admin/trash` | استعادة/حذف نهائي من سلة المهملات |
| GET/POST | `/api/admin/tasks` | عرض/تشغيل المهام المجدولة |
| POST | `/api/admin/preview` | تحديث إعدادات معاينة الرئيسية |
| GET | `/api/admin/audit-log/export` | تصدير سجل التدقيق كـ CSV |
| POST | `/api/admin/recent-edits/restore` | **Placeholder** (manual restore only) |

### Client APIs (3 endpoints)

| الطريقة | المسار | الوظيفة |
|---------|--------|---------|
| POST | `/api/client/invitations/[code]` | تعديل العميل لدعوته |
| POST | `/api/client/guest-book/settings` | تحديث إعدادات التهاني |
| POST | `/api/client/messages/read` | تحديد قراءة الرسائل |
| POST | `/api/client/live-mode/[code]` | تفعيل/إيقاف الوضع المباشر |

### Public APIs (14 endpoints)

| الطريقة | المسار | الوظيفة |
|---------|--------|---------|
| POST | `/api/invitations/[code]/rsvp` | إرسال رد حضور |
| GET/POST | `/api/invitations/[code]/guest-book` | عرض/إرسال تهنئة |
| GET/POST | `/api/invitations/[code]/check-in` | التحقق/تسجيل وصول |
| GET | `/api/invitations/[code]/calendar/ics` | تحميل ملف تقويم |
| GET | `/api/invitations/[code]/export/[format]` | تصدير قائمة الحضور (Excel/PDF) |
| GET | `/api/invitations/[code]/live-mode` | بيانات الوضع المباشر |
| POST | `/api/orders` | إنشاء طلب دعوة |
| POST | `/api/orders/preview-images` | رفع صور المعاينة |
| POST | `/api/orders/preview-media` | رفع فيديو المعاينة |
| POST | `/api/orders/preview-music` | رفع/توفير موسيقى |
| POST | `/api/orders/extract-video-audio` | استخراج صوت من فيديو |
| POST | `/api/errors` | إبلاغ عن خطأ من المتصفح |
| POST | `/api/push/subscribe` | الاشتراك في الإشعارات |
| GET | `/api/push/latest` | آخر إشعار |

### Cron APIs (1 endpoint)

| الطريقة | المسار | الوظيفة |
|---------|--------|---------|
| GET/POST | `/api/cron/backup` | النسخ الاحتياطي التلقائي (Cron Job) |

---

## 16. تحليل Frontend

### الصفحات العامة (13 صفحة)

| المسار | المكون | نوع العرض |
|--------|--------|-----------|
| `/` | HomePage (Server Component) | SSR |
| `/templates` | TemplatesPage (Server Component) | SSR |
| `/templates/[slug]/preview` | TemplatePreviewPage | SSR |
| `/order` | OrderPage | SSR |
| `/[code]` | InvitationPage (Server Component) | SSR |
| `/pricing` | PricingPage | SSR |
| `/contact` | ContactPage | SSR |
| `/faq` | FaqPage | SSR |
| `/privacy-policy` | LegalPage | SSR |
| `/terms` | LegalPage | SSR |
| `/refund-policy` | LegalPage | SSR |
| `/usage-policy` | LegalPage | SSR |

### صفحات الإدارة (36 صفحة)

جميعها Server Components مع `force-dynamic`، تحت `admin-dark-shell` layout.

### مكونات React الرئيسية (70 مكوناً)

#### مكونات الدعوة (Invitation Components)

| المكون | الوظيفة |
|--------|---------|
| `InvitationExperience` | المكون الرئيسي لتجربة الدعوة الكاملة |
| `InviteOpening` | افتتاحية الدعوة (سينمائية/كلاسيكية) |
| `InviteMusic` | مشغل الموسيقى في الدعوة |
| `InviteGallery` | معرض الصور |
| `InviteMap` | خريطة المكان |
| `InviteParallax` | تأثيرات Parallax |
| `InviteScrollAnimations` | تأثيرات التمرير |
| `InviteCheckIn` | تسجيل الوصول |
| `InvitePoll` | استطلاع رأي |
| `InvitePermissions` | صلاحيات الإشعارات |
| `Countdown` | عداد تنازلي للزفاف |
| `CoupleStoryTimeline` | جدول زمني لقصة العروسين |
| `RsvpForm` | نموذج تأكيد الحضور |
| `GuestBook` | دفتر التهاني |
| `WeddingLiveMode` | وضع الحفل المباشر |
| `AddToCalendar` | إضافة إلى التقويم |
| `SmartCalendarButton` | زر التقويم الذكي |
| `QrCodeBlock` | كود QR |
| `AudioPlayer` | مشغل الصوت |
| `GuestTable` | جدول الضيوف |
| `SectionIntro` | مقدمة الأقسام |
| `InvitationQrTools` | أدوات QR Code |
| `ClientShareTools` | أدوات المشاركة للعميل |

#### مكونات لوحة الإدارة (Admin Components)

| المكون | الوظيفة |
|--------|---------|
| `DashboardShell` | الهيكل العام للوحة الإدارة |
| `AdminNewInvitationWizard` | معالج إنشاء دعوة جديد |
| `AdminOrderRequestsManager` | مدير طلبات الدعوات |
| `AdminInvitationTools` | أدوات إدارة الدعوات |
| `AdminActions` | إجراءات الإدارة العامة |
| `AdminNotificationCenter` | مركز الإشعارات |
| `AdminClientMessageForm` | نموذج إرسال رسالة للعميل |
| `AdminTextEditor` | محرر نصوص للقوالب |
| `AdminTemplateLookup` | بحث القوالب |
| `AdminTemplatePreviewInfoEditor` | محرر معلومات معاينة القالب |
| `AdminAttendancePrintButton` | زر طباعة الحضور |
| `FavoriteToggleButton` | زر المفضلة |
| `InternalNotesPanel` | لوحة الملاحظات الداخلية |
| `ContentPresetPicker` | منتقي النصوص الجاهزة |
| `MessageTemplatePicker` | منتقي قوالب الرسائل |
| `TemplatesPreviewMusicForm` | نموذج موسيقى معاينة القوالب |
| `BroadcastStudio` | استوديو البث المباشر |
| `BroadcastAnnotator` | أداة التعليق على البث |

#### مكونات العميل (Client Components)

| المكون | الوظيفة |
|--------|---------|
| `ClientInvitationEditor` | محرر الدعوة للعميل |
| `ClientWeddingLiveModePanel` | لوحة الوضع المباشر للعميل |
| `CustomerGuestBookPanel` | لوحة التهاني للعميل |
| `CustomerMessagesPanel` | لوحة الرسائل للعميل |
| `CustomerAnalyticsPanel` | لوحة الإحصائيات للعميل |
| `ClientShareTools` | أدوات المشاركة للعميل |
| `PendingInvitationNotice` | إشعار الدعوة المعلقة |
| `LoginPanel` | لوحة تسجيل الدخول |

#### مكونات عامة (Shared Components)

| المكون | الوظيفة |
|--------|---------|
| `SiteHeader` | الهيدر العام للموقع |
| `SiteFooter` | الفوتر العام للموقع |
| `TemplateBrowser` | متصفح القوالب |
| `TemplateCard` | بطاقة قالب |
| `LiveInvitationPreview` | معاينة مباشرة للدعوة |
| `LiveVisitorsCounter` | عداد الزوار المباشر |
| `StatsGrid` | شبكة إحصائيات |
| `OrderForm` | نموذج الطلب |
| `DynamicPageView` | عرض صفحة ديناميكية |
| `LegalPageView` | عرض صفحة قانونية |
| `ImageCropUploader` | رفع وقص الصور |
| `CopyButton` | زر نسخ |
| `ConfirmDialog` | حوار تأكيد |
| `ConfirmingSubmitButton` | زر إرسال مع تأكيد |
| `Pagination` | ترقيم الصفحات |
| `ScrollReveal` | كشف العناصر عند التمرير |
| `ScrollToTopOnRouteChange` | التمرير للأعلى عند تغيير المسار |
| `GlobalNotifications` | إشعارات عامة |
| `Toast` | إشعارات Toast |
| `ErrorRecoveryActions` | إجراءات استرداد الأخطاء |

---

## 17. تحليل Backend

### طبقة قاعدة البيانات (Database Layer)

| الملف | الوظيفة |
|-------|---------|
| `lib/db.ts` | تهيئة اتصال Prisma مع PostgreSQL مع fallback آمن |
| `prisma/schema.prisma` | تعريف جميع الجداول والعلاقات |

### طبقة المصادقة (Auth Layer)

| الملف | الوظيفة |
|-------|---------|
| `lib/admin-session.ts` | إدارة جلسات المسؤول (إنشاء، تحقق) |
| `lib/client-session.ts` | إدارة جلسات العميل (إنشاء، تحقق) |
| `lib/password.ts` | تشفير كلمات المرور (scrypt/sha256) |
| `lib/auth-config.ts` | إعدادات المصادقة |
| `middleware.ts` | وسيط المصادقة وحماية المسارات |

### طبقة الأعمال (Business Logic Layer) - 86 ملفاً

#### إدارة القوالب

| الملف | الوظيفة |
|-------|---------|
| `lib/templates.ts` | إدارة القوالب (جلب، تصفية، بحث) |
| `lib/custom-templates.ts` | إنشاء قوالب مخصصة من HTML |
| `lib/template-settings.ts` | إعدادات القوالب مع موسيقى المعاينة |
| `lib/template-preview-info.ts` | معلومات معاينة القوالب |
| `lib/templates-preview-music.ts` | موسيقى معاينة القوالب |

#### إدارة الدعوات

| الملف | الوظيفة |
|-------|---------|
| `lib/invitation-data.ts` | جلب بيانات الدعوات، تسجيل المشاهدات |
| `lib/invitation-texts.ts` | إدارة نصوص الدعوات |
| `lib/invitation-images.ts` | حفظ وتنظيم صور الدعوات |
| `lib/invitation-media.ts` | إدارة وسائط الدعوات |
| `lib/invitation-media-server.ts` | خادم الوسائط للدعوات |
| `lib/invitation-seo.ts` | SEO و Structured Data للدعوات |
| `lib/invitation-completeness.ts` | التحقق من اكتمال الدعوة |
| `lib/invitation-template-bindings.ts` | ربط الدعوات بالقوالب |
| `lib/invitation-deletion.ts` | حذف الدعوات بشكل كامل |
| `lib/invitation-archiving.ts` | أرشفة الدعوات |
| `lib/invitation-manage-token.ts` | إدارة روابط الوصول للعملاء |
| `lib/custom-invitation-url.ts` | الروابط المخصصة للدعوات |

#### إدارة الموسيقى

| الملف | الوظيفة |
|-------|---------|
| `lib/music-library.ts` | مكتبة الموسيقى وحل المسارات |
| `lib/audio-files.ts` | التعامل مع ملفات الصوت |

#### إدارة الضيوف والتفاعل

| الملف | الوظيفة |
|-------|---------|
| `lib/guest-book.ts` | إدارة التهاني والتعليقات |
| `lib/attendance.ts` | إدارة الحضور (RSVP) |
| `lib/check-ins.ts` | تسجيل الوصول الفعلي |
| `lib/calendar.ts` | إنشاء ملفات التقويم ICS |
| `lib/client-messages.ts` | رسائل الإدارة للعملاء |

#### التحليلات والإحصائيات

| الملف | الوظيفة |
|-------|---------|
| `lib/admin-analytics.ts` | تحليلات المنصة |
| `lib/customer-analytics.ts` | إحصائيات العميل |
| `lib/visit-source.ts` | كشف مصدر الزائر |
| `lib/visit-source-analytics.ts` | تحليل مصادر الزوار |
| `lib/home-stats.ts` | إحصائيات الصفحة الرئيسية |

#### النسخ الاحتياطي والمزامنة

| الملف | الوظيفة |
|-------|---------|
| `lib/backups.ts` | نظام النسخ الاحتياطي |
| `lib/github-sync.ts` | مزامنة GitHub |
| `lib/github-sync-queue.ts` | طابور المزامنة |
| `lib/sync-log.ts` | سجل المزامنة |

#### النظام والإعدادات

| الملف | الوظيفة |
|-------|---------|
| `lib/site-settings.ts` | إعدادات الموقع |
| `lib/app-settings.ts` | إعدادات التطبيق |
| `lib/preview-settings.ts` | إعدادات المعاينة |
| `lib/home-content.ts` | محتوى الصفحة الرئيسية |
| `lib/dynamic-pages.ts` | الصفحات الديناميكية |
| `lib/legal-pages.ts` | الصفحات القانونية |
| `lib/content-presets.ts` | النصوص الجاهزة |
| `lib/message-templates.ts` | قوالب الرسائل |
| `lib/message-template-render.ts` | عرض قوالب الرسائل |

#### الإدارة الداخلية

| الملف | الوظيفة |
|-------|---------|
| `lib/admin-data.ts` | بيانات الإدارة (طلبات، دعوات، عملاء) |
| `lib/admin-utils.ts` | أدوات الإدارة المساعدة |
| `lib/admin-session.ts` | جلسات المسؤول |
| `lib/admin-favorites.ts` | المفضلة |
| `lib/admin-notifications.ts` | الإشعارات الداخلية |
| `lib/admin-search.ts` | البحث العام |

#### الأمان والمراقبة

| الملف | الوظيفة |
|-------|---------|
| `lib/security-enhancements.ts` | رؤوس الأمان ومنع XSS/CSRF |
| `lib/rate-limiting.ts` | الحد من المعدل |
| `lib/validation.ts` | التحقق من صحة البيانات |
| `lib/validation-enhanced.ts` | تحقق متقدم |
| `lib/error-tracking.ts` | تتبع الأخطاء |
| `lib/error-handler.ts` | معالجة الأخطاء |
| `lib/system-health.ts` | صحة النظام |
| `lib/audit-log.ts` | سجل التدقيق |

#### الملفات والتخزين

| الملف | الوظيفة |
|-------|---------|
| `lib/storage-provider.ts` | مزود التخزين |
| `lib/media-cleanup.ts` | تنظيف الوسائط |
| `lib/display-images.ts` | عرض الصور |
| `lib/image-formats.ts` | تنسيقات الصور |
| `lib/browser-image-upload.ts` | رفع الصور من المتصفح |
| `lib/atomic-file.ts` | الكتابة الآمنة للملفات |
| `lib/json-file-safety.ts` | أمان ملفات JSON |
| `lib/runtime-paths.ts` | مسارات التشغيل |

#### أخرى

| الملف | الوظيفة |
|-------|---------|
| `lib/order-preview-images.ts` | صور معاينة الطلبات |
| `lib/order-request-links.ts` | روابط الطلبات |
| `lib/video-audio-extraction.ts` | استخراج الصوت من الفيديو |
| `lib/broadcast-fields.ts` | حقول البث المباشر |
| `lib/push-notifications.ts` | إشعارات Push |
| `lib/wedding-live-mode.ts` | وضع الحفل المباشر |
| `lib/task-scheduler.ts` | جدولة المهام |
| `lib/trash.ts` | سلة المهملات |
| `lib/internal-notes.ts` | الملاحظات الداخلية |
| `lib/demo-data.ts` | بيانات تجريبية |
| `lib/database-url.ts` | تحليل رابط قاعدة البيانات |
| `lib/slug.ts` | توليد المعرفات النصية |
| `lib/i18n.ts` | التدويل |
| `lib/utils.ts` | أدوات عامة |
| `lib/project-assets.ts` | أصول المشروع |
| `lib/project-content-store.ts` | مخزن محتوى المشروع |

---

## 18. نقاط القوة

### 1. بنية متكاملة وشاملة
- النظام يغطي دورة حياة كاملة من الطلب إلى النشر إلى تفاعل الضيوف
- لوحة إدارة غنية بـ 36 صفحة تغطي جميع جوانب الإدارة
- 70 مكون React يغطي جميع حالات الاستخدام

### 2. نظام هجين للتخزين
- الجمع بين PostgreSQL و JSON Files يمنح مرونة عالية
- يمكن تشغيل النظام بدون قاعدة بيانات (باستخدام الملفات فقط)
- النسخ الاحتياطي للملفات أسهل من قواعد البيانات

### 3. دعم كامل للغة العربية
- RTL كامل في جميع الصفحات
- أرقام عربية في لوحة الإدارة
- دعم الخط العربي في PDF
- تنسيق التاريخ والوقت بالعربية

### 4. أمان جيد
- HTTP-only Cookies للجلسات
- Rate Limiting على جميع النقاط الحساسة
- Same-Origin Check لـ API
- Sanitization للمدخلات (Zod Validation)
- Soft Delete (حذف ناعم) لجميع الكيانات
- سجل تدقيق كامل (Audit Log)
- رؤوس أمان (Security Headers)

### 5. تحكم كامل بالقوالب
- نظام قوالب مرن مع إمكانية التخصيص الكامل
- محتوى عام (Global) ومحتوى خاص (Template Override)
- نظام حل تعارضات
- استيراد قوالب من HTML

### 6. أدوات تفاعل غنية للضيوف
- RSVP (تأكيد حضور)
- Guest Book (تهاني)
- Check-In (تسجيل وصول فعلي)
- تقويم (ICS)
- QR Code
- مشاركة عبر واتساب ووسائل التواصل
- موسيقى
- وضع حفل مباشر

### 7. تحليلات وتقارير متقدمة
- إحصائيات شاملة مع رسوم بيانية
- تصدير متعدد الصيغ (CSV, Excel, PDF)
- تحليل مصادر الزوار
- تتبع المشاهدات والتفاعلات

### 8. نسخ احتياطي متعدد المستويات
- نسخ تلقائية عبر Cron
- نسخ يدوية
- مزامنة مع GitHub للمحتوى والإعدادات
- PostgreSQL Dump

### 9. أداء جيد
- استضافة على Next.js 15 مع SSR
- تحسين الصور (AVIF, WebP)
- تحميل مكتبات الـ Lucide Icons محسّن
- ملفات Cache طويلة الأمد للأصول

### 10. تجربة مستخدم متكاملة
- Broadcast Studio للتعديل المباشر
- معالج إنشاء دعوة (Wizard)
- بحث عام في جميع الكيانات
- مفضلة وملاحظات داخلية
- إشعارات داخلية

---

## 19. نقاط الضعف

### 1. اعتماد كبير على نظام الملفات (JSON)
- ملفات JSON (إعدادات الموقع، القوالب، الموسيقى) ليست آمنة في بيئة Serverless
- قد تحدث مشاكل تزامن (Race Conditions) عند التعديل المتزامن
- ليس مناسباً للتوسع الأفقي (Horizontal Scaling)

### 2. خلط بين التخزين (File + DB)
- بعض البيانات موجودة في الملفات JSON وأخرى في PostgreSQL دون تناسق واضح
- القوالب مخزنة في الملفات JSON وفي قاعدة البيانات في نفس الوقت
- قد يؤدي ذلك إلى تضارب البيانات

### 3. صلاحية واحدة فقط (Admin)
- كل المستخدمين الإداريين لديهم نفس الصلاحية (OWNER)
- لا يوجد نظام أدوار (Roles) داخل لوحة الإدارة
- لا يمكن تفويض مهام محددة لمساعدين

### 4. نظام المصادقة للعملاء محدود
- الرابط السري (Magic Link) هو الطريقة الوحيدة للدخول
- لا يوجد نموذج دخول تقليدي للعملاء (معطل حالياً)
- لا يوجد خيار لإعادة تعيين كلمة المرور للعميل
- انتهاء صلاحية الرابط السري قد يسبب مشاكل

### 5. الاستعادة اليدوية فقط
- نقطة ضعف كبيرة: الاستعادة من النسخ الاحتياطي يدوية بالكامل
- لا توجد واجهة لاستعادة الإعدادات أو القوالب
- Endpoint الاستعادة هو مجرد Placeholder

### 6. عدم وجود اختبارات (Tests)
- لا توجد اختبارات وحدة (Unit Tests) أو تكامل (Integration Tests)
- لا توجد اختبارات End-to-End

### 7. إدارة محدودة للمستخدمين
- لا يمكن إنشاء أكثر من Admin واحد من الواجهة
- لا توجد صفحة لإدارة المستخدمين الإداريين
- بيانات الدخول (Admin) مخزنة في ENV وليس في قاعدة البيانات

### 8. ضعف في معالجة الأخطاء
- بعض الأخطاء تعيد توجيه (Redirect) بدون رسالة واضحة
- لا يوجد توثيق موحد للأخطاء في API

### 9. مشاكل محتملة في الأداء
- كل صفحات الإدارة تستخدم `force-dynamic` مما يمنع التخزين المؤقت
- جلب جميع البيانات (بدون Pagination) في بعض الصفحات

### 10. نقص في بعض الميزات الأساسية
- نظام الباقات والأسعار مجرد عرض توضيحي (بدون مدفوعات فعلية)
- صفحة Contact, FAQ, Pricing قد تكون غير مكتملة أو مفقودة
- لا يوجد تكامل مع بوابات الدفع

### 11. كود ميت وخصائص غير مستخدمة
- `POST /api/auth/client/login` - معطل (410 Gone)
- `POST /api/admin/recent-edits/restore` - Placeholder فقط
- `AppSetting` جدول في PostgreSQL لكنه غير مستخدم بكثافة
- `POST /api/admin/orders/count` يمكن استبداله ب query مباشر
- بعض المتغيرات في `.env.example` قد لا تكون مستخدمة فعلياً

---

## 20. الأجزاء غير المكتملة أو التي تحتاج تحسين

### أولوية عالية (High Priority)

| الجزء | المشكلة | الحل المقترح |
|-------|---------|--------------|
| **دفع إلكتروني** | لا يوجد نظام دفع، الباقات مجرد عرض | إضافة Stripe أو Paymob |
| **اختبارات** | لا يوجد أي اختبارات | إضافة Unit Tests لـ lib/ و API Tests |
| **إدارة المستخدمين** | لا يمكن إدارة Admins من الواجهة | إنشاء صفحة إدارة Admins مع صلاحيات |
| **استعادة النسخ** | الاستعادة يدوية بالكامل | تطبيق واجهة استعادة من النسخ |
| **البيانات المكررة** | القوالب في JSON و DB معاً | توحيد مصدر البيانات |

### أولوية متوسطة (Medium Priority)

| الجزء | المشكلة | الحل المقترح |
|-------|---------|--------------|
| **تسجيل دخول العملاء** | معطل حالياً | تفعيل أو تطوير نظام Magic Link أفضل |
| **Pagination** | بعض الصفحات تجلب كل البيانات | إضافة Pagination للدعوات والطلبات |
| **إعادة تعيين كلمة المرور** | غير موجود للعملاء | إضافة Forgot Password |
| **تقارير مخصصة** | لا يمكن للعميل تخصيص التقارير | إضافة فلاتر مخصصة |
| **إشعارات Push** | VAPID keys في ENV لكن الإشعارات قد لا تعمل | اختبار وتفعيل push notifications |
| **الصفحات العامة** | ربما بعض الصفحات (pricing, faq, contact) غير مكتملة | التأكد من اكتمال المحتوى |

### أولوية منخفضة (Low Priority)

| الجزء | المشكلة | الحل المقترح |
|-------|---------|--------------|
| **تحسينات CSS** | بعض الأنماط قد تحتاج تحسين للتوافق | مراجعة الـ RTL و Responsive |
| **توثيق API** | لا يوجد توثيق تلقائي للـ API | إضافة Swagger/OpenAPI |
| **تحسين SEO** | الصفحات القانونية تفتقر لـ Meta مخصصة | إضافة generateMetadata لكل صفحة |
| **تحسين الأداء** | كل صفحات الإدارة force-dynamic | إضافة ISR أو caching ذكي |
| **تحسين الأمان** | كلمة المرور مخزنة في ENV | تطبيق Password Hashing وتخزين في DB |
| **Code Splitting** | بعض المكونات كبيرة | تقسيم المكونات الكبيرة |

---

## 21. اقتراحات تحسينية مستقبلية حسب الأولوية

### المرحلة الأولى (فورية - 1-2 أسبوع)

1. **إضافة اختبارات أساسية**
   - Unit Tests للمكتبات الأساسية (`lib/validation.ts`, `lib/invitation-data.ts`, `lib/music-library.ts`)
   - API Integration Tests للنقاط الحرجة (RSVP, Order, Guest Book)

2. **توحيد تخزين القوالب**
   - نقل القوالب من JSON إلى PostgreSQL بالكامل
   - أو إنشاء طبقة تجريد (Abstraction Layer) فوق مصدري البيانات

3. **تفعيل الاستعادة من النسخ الاحتياطي**
   - تطبيق واجهة استعادة كاملة (Restore Wizard)
   - اختبار عملية الاستعادة من البداية للنهاية

4. **تحسين نظام إدارة Admins**
   - إنشاء صفحة إدارة Admins مع صلاحيات مختلفة
   - تخزين بيانات Admins في قاعدة البيانات بدلاً من ENV

### المرحلة الثانية (قصيرة المدى - 2-4 أسابيع)

5. **نظام الدفع الإلكتروني**
   - تكامل مع Stripe, Paymob, أو Fawry
   - ربط الباقات بنظام الدفع الفعلي
   - إنشاء فواتير وإيصالات

6. **بوابة العميل المحسّنة**
   - إعادة تفعيل تسجيل الدخول للعملاء
   - إضافة إعادة تعيين كلمة المرور
   - لوحة تحكم عميل محسّنة

7. **إضافة Pagination في جميع الصفحات**
   - Pagination للدعوات، الطلبات، العملاء، الضيوف، التهاني
   - Server-side Pagination لتحسين الأداء

8. **تحسين الإشعارات**
   - تكامل مع WhatsApp Business API للإشعارات التلقائية
   - إشعارات للعملاء عند وصول ردود RSVP جديدة
   - إشعارات عبر البريد الإلكتروني

### المرحلة الثالثة (متوسطة المدى - 1-2 شهر)

9. **تحليلات متقدمة**
   - لوحة تحليلات محسّنة مع رسوم بيانية تفاعلية
   - تقارير مخصصة قابلة للتصدير
   - تتبع سلوك الضيوف داخل الدعوة

10. **تطبيقات الجوال (PWA)**
    - تحويل الموقع إلى Progressive Web App
    - إمكانية تنزيل الدعوة كتطبيق جوال

11. **تحسين SEO والظهور**
    - تحسين الصفحات القانونية بـ Meta Tags مخصصة
    - إضافة Breadcrumbs
    - تحسين Core Web Vitals

12. **نظام متعدد اللغات**
    - دعم كامل للإنجليزية بجانب العربية
    - ترجمة جميع محتويات الواجهة

### المرحلة الرابعة (بعيدة المدى - 3+ أشهر)

13. **سوق القوالب (Template Marketplace)**
    - السماح للمصممين بإضافة قوالبهم
    - نظام عمولة على القوالب المدفوعة

14. **تكامل مع وسائل التواصل الاجتماعي**
    - نشر الدعوة مباشرة على Instagram, Facebook
    - تتبع التحليلات من وسائل التواصل

15. **تطبيق جوال (Native)**
    - تطبيق iOS و Android للعملاء
    - إشعارات Push محسّنة

16. **الذكاء الاصطناعي**
    - اقتراح نصوص دعوة باستخدام AI
    - تحسين الصور تلقائياً
    - توصيات القوالب بناءً على تفضيلات العميل

---

## 22. Project Feature Inventory

### قائمة كاملة بجميع الميزات والخصائص الموجودة فعلياً داخل المشروع

#### الموقع العام (Public Site)

| # | الميزة | الحالة | الموقع في الكود |
|---|--------|--------|-----------------|
| 1 | الصفحة الرئيسية مع Hero Section | ✅ موجودة | `app/page.tsx` |
| 2 | عرض المميزات (Features Panel) | ✅ موجودة | `app/page.tsx` |
| 3 | معاينة القالب المباشرة (Live Preview) | ✅ موجودة | `app/page.tsx` |
| 4 | باقات الأسعار (Pricing Table) | ✅ موجودة | `app/page.tsx` |
| 5 | إحصائيات المنصة (Platform Stats) | ✅ موجودة | `app/page.tsx` |
| 6 | عداد الزوار المباشر (Live Visitors) | ✅ موجودة | `components/LiveVisitorsCounter.tsx` |
| 7 | عداد تصاعدي (CountUp) | ✅ موجودة | `components/CountUpNumber.tsx` |
| 8 | أيقونات مميزات متحركة | ✅ موجودة | `app/page.tsx` |
| 9 | تقسيمات مزخرفة (Section Dividers) | ✅ موجودة | `app/page.tsx` |
| 10 | الهيدر العام (SiteHeader) | ✅ موجودة | `components/SiteHeader.tsx` |
| 11 | الفوتر العام (SiteFooter) | ✅ موجودة | `components/SiteFooter.tsx` |
| 12 | إشعارات عامة (GlobalNotifications) | ✅ موجودة | `components/GlobalNotifications.tsx` |
| 13 | ScrollReveal (إظهار العناصر عند التمرير) | ✅ موجودة | `components/ScrollReveal.tsx` |
| 14 | ScrollToTop عند تغيير المسار | ✅ موجودة | `components/ScrollToTopOnRouteChange.tsx` |
| 15 | إشعارات Toast | ✅ موجودة | `components/Toast.tsx` |
| 16 | صفحة القوالب (Templates Browser) | ✅ موجودة | `app/templates/page.tsx` |
| 17 | بطاقة قالب (TemplateCard) | ✅ موجودة | `components/TemplateCard.tsx` |
| 18 | معاينة القالب الكاملة (Preview) | ✅ موجودة | `app/templates/[slug]/preview/page.tsx` |
| 19 | نموذج الطلب (OrderForm) | ✅ موجودة | `components/OrderForm.tsx` |
| 20 | إعادة توجيه نجاح الطلب (OrderSuccessRedirect) | ✅ موجودة | `components/OrderSuccessRedirect.tsx` |
| 21 | صفحة القوالب SVG Card Preview | ✅ موجودة | `app/templates/[slug]/card-preview.svg/route.ts` |
| 22 | صفحة Robots.txt | ✅ موجودة | `app/robots.ts` |
| 23 | Sitemap.xml ديناميكي | ✅ موجودة | `app/sitemap.ts` |

#### الدعوات (Invitations)

| # | الميزة | الحالة | الموقع في الكود |
|---|--------|--------|-----------------|
| 24 | صفحة دعوة كاملة (InvitationExperience) | ✅ موجودة | `components/InvitationExperience.tsx` |
| 25 | افتتاحية الدعوة (InviteOpening) | ✅ موجودة | `components/InviteOpening.tsx` |
| 26 | مشغل الموسيقى (InviteMusic) | ✅ موجودة | `components/InviteMusic.tsx` |
| 27 | مشغل صوت عام (AudioPlayer) | ✅ موجودة | `components/AudioPlayer.tsx` |
| 28 | معرض الصور (InviteGallery) | ✅ موجودة | `components/InviteGallery.tsx` |
| 29 | خريطة المكان (InviteMap) | ✅ موجودة | `components/InviteMap.tsx` |
| 30 | تأثيرات Parallax (InviteParallax) | ✅ موجودة | `components/InviteParallax.tsx` |
| 31 | تأثيرات التمرير (InviteScrollAnimations) | ✅ موجودة | `components/InviteScrollAnimations.tsx` |
| 32 | تسجيل الوصول (InviteCheckIn) | ✅ موجودة | `components/InviteCheckIn.tsx` |
| 33 | استطلاع رأي (InvitePoll) | ✅ موجودة | `components/InvitePoll.tsx` |
| 34 | صلاحيات الإشعارات (InvitePermissions) | ✅ موجودة | `components/InvitePermissions.tsx` |
| 35 | عداد تنازلي (Countdown) | ✅ موجودة | `components/Countdown.tsx` |
| 36 | قصة العروسين (CoupleStoryTimeline) | ✅ موجودة | `components/CoupleStoryTimeline.tsx` |
| 37 | نموذج RSVP (RsvpForm) | ✅ موجودة | `components/RsvpForm.tsx` |
| 38 | كتاب التهاني (GuestBook) | ✅ موجودة | `components/GuestBook.tsx` |
| 39 | QR Code (QrCodeBlock) | ✅ موجودة | `components/QrCodeBlock.tsx` |
| 40 | إضافة إلى التقويم (AddToCalendar) | ✅ موجودة | `components/AddToCalendar.tsx` |
| 41 | زر تقويم ذكي (SmartCalendarButton) | ✅ موجودة | `components/SmartCalendarButton.tsx` |
| 42 | جدول الضيوف (GuestTable) | ✅ موجودة | `components/GuestTable.tsx` |
| 43 | مقدمة الأقسام (SectionIntro) | ✅ موجودة | `components/SectionIntro.tsx` |
| 44 | وضع الحفل المباشر (WeddingLiveMode) | ✅ موجودة | `components/WeddingLiveMode.tsx` |
| 45 | معاينة مباشرة (LiveInvitationPreview) | ✅ موجودة | `components/LiveInvitationPreview.tsx` |
| 46 | إشعار الدعوة المعلقة (PendingInvitationNotice) | ✅ موجودة | `components/PendingInvitationNotice.tsx` |
| 47 | بيانات Structured Data (JSON-LD) | ✅ موجودة | `app/[code]/page.tsx` |
| 48 | كشف مصدر الزائر (Visit Source Detection) | ✅ موجودة | `lib/visit-source.ts` |
| 49 | إعادة توجيه الرابط المخصص (Custom Slug) | ✅ موجودة | `app/[code]/page.tsx` |
| 50 | صفحات ديناميكية (DynamicPageView) | ✅ موجودة | `components/DynamicPageView.tsx` |
| 51 | صفحات قانونية (LegalPageView) | ✅ موجودة | `components/LegalPageView.tsx` |
| 52 | تحميل ملف تقويم ICS | ✅ موجودة | `app/api/invitations/[code]/calendar/ics/route.ts` |
| 53 | تصدير قائمة الضيوف Excel | ✅ موجودة | `app/api/invitations/[code]/export/[format]/route.ts` |
| 54 | تصدير قائمة الضيوف PDF (مع خط عربي) | ✅ موجودة | `app/api/invitations/[code]/export/[format]/route.ts` |

#### لوحة الإدارة (Admin Panel)

| # | الميزة | الحالة | الموقع في الكود |
|---|--------|--------|-----------------|
| 55 | لوحة التحكم الرئيسية (Dashboard) مع مؤشرات | ✅ موجودة | `app/admin/page.tsx` |
| 56 | ملخص سريع (أحدث الطلبات والدعوات) | ✅ موجودة | `app/admin/page.tsx` |
| 57 | إدارة الدعوات (فلترة، بحث، فرز) | ✅ موجودة | `app/admin/invitations/page.tsx` |
| 58 | معالج إنشاء دعوة (Wizard) | ✅ موجودة | `components/AdminNewInvitationWizard.tsx` |
| 59 | إدارة الطلبات (Order Manager) | ✅ موجودة | `components/AdminOrderRequestsManager.tsx` |
| 60 | نشر طلب كدعوة (Order to Invitation) | ✅ موجودة | `app/api/admin/orders/[id]/route.ts` |
| 61 | إدارة العملاء | ✅ موجودة | `app/admin/customers/page.tsx` |
| 62 | إدارة القوالب (Template Manager) | ✅ موجودة | `app/admin/templates/page.tsx` |
| 63 | محرر معلومات القالب (Template Info Editor) | ✅ موجودة | `components/AdminTemplatePreviewInfoEditor.tsx` |
| 64 | محرر نصوص القوالب (AdminTextEditor) | ✅ موجودة | `components/AdminTextEditor.tsx` |
| 65 | بحث القوالب (AdminTemplateLookup) | ✅ موجودة | `components/AdminTemplateLookup.tsx` |
| 66 | استيراد قالب من HTML | ✅ موجودة | `app/api/admin/templates/import/route.ts` |
| 67 | تحديث محتوى القوالب (Global/Template) | ✅ موجودة | `app/api/admin/templates/content/route.ts` |
| 68 | رفع وسائط القوالب | ✅ موجودة | `app/api/admin/templates/media/route.ts` |
| 69 | مكتبة الموسيقى (Music Library) | ✅ موجودة | `app/admin/music/page.tsx` |
| 70 | إدارة مسارات الموسيقى (CRUD) | ✅ موجودة | `app/api/admin/music/route.ts` |
| 71 | موسيقى معاينة القوالب (TemplatesPreviewMusicForm) | ✅ موجودة | `components/TemplatesPreviewMusicForm.tsx` |
| 72 | مكتبة الوسائط (Media Library) | ✅ موجودة | `app/admin/media/page.tsx` |
| 73 | رفع ملفات وسائط | ✅ موجودة | `app/api/admin/media/file/route.ts` |
| 74 | تنظيف التخزين (Media Cleanup) | ✅ موجودة | `app/api/admin/media/cleanup/route.ts` |
| 75 | إدارة الحضور (Attendance Management) | ✅ موجودة | `app/admin/attendance/page.tsx` |
| 76 | تعديل RSVP مباشر في الجدول | ✅ موجودة | `app/admin/attendance/page.tsx` |
| 77 | طباعة الحضور (AdminAttendancePrintButton) | ✅ موجودة | `components/AdminAttendancePrintButton.tsx` |
| 78 | تصدير الحضور Excel/CSV | ✅ موجودة | `app/api/admin/attendance/export/route.ts` |
| 79 | إدارة التهاني (Guest Book per Invitation) | ✅ موجودة | `app/admin/guest-book/page.tsx` |
| 80 | إجراءات مجمعة على التهاني | ✅ موجودة | `app/api/admin/guest-book/route.ts` |
| 81 | إعدادات التهاني (Auto/Moderated/Disabled) | ✅ موجودة | `lib/guest-book.ts` |
| 82 | مركز الرسائل (Admin to Client) | ✅ موجودة | `app/admin/messages/page.tsx` |
| 83 | نموذج إرسال رسالة للعميل | ✅ موجودة | `components/AdminClientMessageForm.tsx` |
| 84 | المفضلة (Favorites) | ✅ موجودة | `app/admin/favorites/page.tsx` |
| 85 | زر المفضلة (FavoriteToggleButton) | ✅ موجودة | `components/FavoriteToggleButton.tsx` |
| 86 | الملاحظات الداخلية (InternalNotesPanel) | ✅ موجودة | `components/InternalNotesPanel.tsx` |
| 87 | إعدادات الموقع (Site Settings) | ✅ موجودة | `app/admin/settings/page.tsx` |
| 88 | إعدادات SEO | ✅ موجودة | `app/admin/settings/page.tsx` |
| 89 | إعدادات الصفحة الرئيسية | ✅ موجودة | `app/admin/settings/page.tsx` |
| 90 | رفع شعار الموقع | ✅ موجودة | `app/api/admin/settings/route.ts` |
| 91 | إدارة الصفحات القانونية | ✅ موجودة | `app/admin/legal/page.tsx` |
| 92 | إدارة الصفحات الديناميكية | ✅ موجودة | `app/admin/pages/page.tsx` |
| 93 | النصوص الجاهزة (ContentPresets) | ✅ موجودة | `app/admin/content-presets/page.tsx` |
| 94 | منتقي النصوص (ContentPresetPicker) | ✅ موجودة | `components/ContentPresetPicker.tsx` |
| 95 | قوالب الرسائل (MessageTemplates) | ✅ موجودة | `app/admin/message-templates/page.tsx` |
| 96 | منتقي قوالب الرسائل (MessageTemplatePicker) | ✅ موجودة | `components/MessageTemplatePicker.tsx` |
| 97 | وضع الحفل المباشر (Live Mode) | ✅ موجودة | `app/admin/live-mode/page.tsx` |
| 98 | تسجيل الوصول (Check-Ins Dashboard) | ✅ موجودة | `app/admin/check-ins/page.tsx` |
| 99 | استوديو البث (Broadcast Studio) | ✅ موجودة | `app/admin/broadcast/page.tsx` |
| 100 | أداة البث (BroadcastAnnotator) | ✅ موجودة | `components/BroadcastAnnotator.tsx` |
| 101 | استوديو البث (BroadcastStudio) | ✅ موجودة | `components/BroadcastStudio.tsx` |
| 102 | تحرير المحتوى المباشر (BroadcastMutation API) | ✅ موجودة | `app/api/admin/broadcast/route.ts` |
| 103 | إدارة المعاينة (Preview Settings) | ✅ موجودة | `app/admin/preview/page.tsx` |
| 104 | رفع وسائط المعاينة (صورة/فيديو/قالب) | ✅ موجودة | `app/api/admin/preview/route.ts` |
| 105 | النسخ الاحتياطي (Backups) | ✅ موجودة | `app/admin/backups/page.tsx` |
| 106 | إنشاء نسخة يدوية | ✅ موجودة | `app/api/admin/backups/route.ts` |
| 107 | تحميل النسخ الاحتياطية | ✅ موجودة | `app/api/admin/backups/[fileName]/route.ts` |
| 108 | التحقق من سلامة النسخ (VerifyBackupButton) | ✅ موجودة | `app/admin/backups/VerifyBackupButton.tsx` |
| 109 | المزامنة مع GitHub | ✅ موجودة | `lib/github-sync.ts` |
| 110 | إعدادات المزامنة (Sync Settings) | ✅ موجودة | `app/admin/sync-settings/page.tsx` |
| 111 | سجل المزامنة (Sync History) | ✅ موجودة | `app/admin/sync-history/page.tsx` |
| 112 | إعادة محاولة المزامنة الفاشلة | ✅ موجودة | `app/api/admin/sync/retry/route.ts` |
| 113 | المهام المجدولة (Scheduled Tasks) | ✅ موجودة | `app/admin/tasks/page.tsx` |
| 114 | تشغيل المهام يدوياً (Run Now) | ✅ موجودة | `app/api/admin/tasks/route.ts` |
| 115 | سلة المهملات (Trash) | ✅ موجودة | `app/admin/trash/page.tsx` |
| 116 | استعادة من سلة المهملات | ✅ موجودة | `app/api/admin/trash/route.ts` |
| 117 | حذف نهائي من سلة المهملات | ✅ موجودة | `app/api/admin/trash/route.ts` |
| 118 | سجل التدقيق (Audit Log) | ✅ موجودة | `app/admin/audit-log/page.tsx` |
| 119 | تصدير سجل التدقيق CSV | ✅ موجودة | `app/api/admin/audit-log/export/route.ts` |
| 120 | التعديلات الأخيرة (Recent Edits) | ✅ موجودة | `app/admin/recent-edits/page.tsx` |
| 121 | صحة النظام (System Health) | ✅ موجودة | `app/admin/system-health/page.tsx` |
| 122 | تتبع الأخطاء (Error Tracking) | ✅ موجودة | `app/admin/errors/page.tsx` |
| 123 | الإشعارات الداخلية (Notification Center) | ✅ موجودة | `app/admin/notifications/page.tsx` |
| 124 | مركز الإشعارات (AdminNotificationCenter) | ✅ موجودة | `components/AdminNotificationCenter.tsx` |
| 125 | تحديث حالة الإشعارات (قراءة/إخفاء) | ✅ موجودة | `app/api/admin/notification-center/route.ts` |
| 126 | إرسال إشعارات Push | ✅ موجودة | `app/api/admin/notifications/send/route.ts` |
| 127 | البحث العام (Global Search) | ✅ موجودة | `app/admin/search/page.tsx` |
| 128 | مركز المراقبة (Monitoring Hub) | ✅ موجودة | `app/admin/monitoring/page.tsx` |
| 129 | تشخيص النسخ الاحتياطي (Diagnostics) | ✅ موجودة | `app/admin/diagnostics/page.tsx` |
| 130 | تسجيل الدخول (Admin Login) | ✅ موجودة | `app/admin/login/page.tsx` |
| 131 | لوحة تسجيل الدخول (LoginPanel) | ✅ موجودة | `components/LoginPanel.tsx` |
| 132 | الهيكل العام للوحة الإدارة (DashboardShell) | ✅ موجودة | `components/DashboardShell.tsx` |
| 133 | أدوات الإدارة العامة (AdminActions) | ✅ موجودة | `components/AdminActions.tsx` |
| 134 | أدوات الدعوة (AdminInvitationTools) | ✅ موجودة | `components/AdminInvitationTools.tsx` |
| 135 | حوار تأكيد (ConfirmDialog) | ✅ موجودة | `components/ConfirmDialog.tsx` |
| 136 | زر تأكيد (ConfirmingSubmitButton) | ✅ موجودة | `components/ConfirmingSubmitButton.tsx` |
| 137 | زر نسخ (CopyButton) | ✅ موجودة | `components/CopyButton.tsx` |
| 138 | رفع وقص الصور (ImageCropUploader) | ✅ موجودة | `components/ImageCropUploader.tsx` |
| 139 | Pagination | ✅ موجودة | `components/Pagination.tsx` |
| 140 | إجراءات استرداد الأخطاء (ErrorRecoveryActions) | ✅ موجودة | `components/ErrorRecoveryActions.tsx` |

#### بوابة العميل (Client Portal)

| # | الميزة | الحالة | الموقع في الكود |
|---|--------|--------|-----------------|
| 141 | بوابة العميل (Client Dashboard) | ✅ موجودة | `app/[code]/ad_3399/page.tsx` |
| 142 | محرر الدعوة للعميل (ClientInvitationEditor) | ✅ موجودة | `components/ClientInvitationEditor.tsx` |
| 143 | أدوات QR Code للعميل (InvitationQrTools) | ✅ موجودة | `components/InvitationQrTools.tsx` |
| 144 | أدوات المشاركة (ClientShareTools) | ✅ موجودة | `components/ClientShareTools.tsx` |
| 145 | لوحة التهاني للعميل (CustomerGuestBookPanel) | ✅ موجودة | `components/CustomerGuestBookPanel.tsx` |
| 146 | لوحة الرسائل للعميل (CustomerMessagesPanel) | ✅ موجودة | `components/CustomerMessagesPanel.tsx` |
| 147 | لوحة الإحصائيات للعميل (CustomerAnalyticsPanel) | ✅ موجودة | `components/CustomerAnalyticsPanel.tsx` |
| 148 | لوحة الوضع المباشر للعميل (ClientWeddingLiveModePanel) | ✅ موجودة | `components/ClientWeddingLiveModePanel.tsx` |
| 149 | رابط إدارة سري (Magic Link) | ✅ موجودة | `app/manage/invitation/[token]/route.ts` |
| 150 | إنشاء جلسة عميل تلقائية | ✅ موجودة | `lib/client-session.ts` |
| 151 | تحديث بيانات الدعوة (Client API) | ✅ موجودة | `app/api/client/invitations/[code]/route.ts` |
| 152 | تحديث إعدادات التهاني (Client) | ✅ موجودة | `app/api/client/guest-book/settings/route.ts` |
| 153 | تحديث حالة القراءة للرسائل (Client) | ✅ موجودة | `app/api/client/messages/read/route.ts` |
| 154 | تفعيل/إيقاف الوضع المباشر (Client) | ✅ موجودة | `app/api/client/live-mode/[code]/route.ts` |
| 155 | صفحة الرابط غير صالح | ✅ موجودة | `app/manage/invitation/invalid/page.tsx` |
| 156 | إعادة توجيه العميل القديم | ✅ موجودة | `app/client/[code]/page.tsx` |

#### النظام (System Features)

| # | الميزة | الحالة | الموقع في الكود |
|---|--------|--------|-----------------|
| 157 | Cron Job للنسخ الاحتياطي التلقائي | ✅ موجودة | `app/api/cron/backup/route.ts` |
| 158 | مصادقة Cron بـ Secret | ✅ موجودة | `app/api/cron/backup/route.ts` |
| 159 | Rate Limiting (7/10min للدخول) | ✅ موجودة | `lib/rate-limiting.ts` |
| 160 | Rate Limiting (8/min لـ RSVP) | ✅ موجودة | `app/api/invitations/[code]/rsvp/route.ts` |
| 161 | Rate Limiting (6/min لـ Guest Book) | ✅ موجودة | `app/api/invitations/[code]/guest-book/route.ts` |
| 162 | Rate Limiting (10/min لـ Check-In) | ✅ موجودة | `app/api/invitations/[code]/check-in/route.ts` |
| 163 | Rate Limiting (8/hour لرفع الوسائط) | ✅ موجودة | `app/api/orders/preview-media/route.ts` |
| 164 | Rate Limiting (12/min للأخطاء) | ✅ موجودة | `app/api/errors/route.ts` |
| 165 | Rate Limiting (10/min لـ Push Subscribe) | ✅ موجودة | `app/api/push/subscribe/route.ts` |
| 166 | التحقق من Same-Origin (CSRF) | ✅ موجودة | `middleware.ts` |
| 167 | رؤوس أمان (Security Headers) | ✅ موجودة | `lib/security-enhancements.ts` |
| 168 | HTTP-only Session Cookies | ✅ موجودة | `lib/admin-session.ts`, `lib/client-session.ts` |
| 169 | Soft Delete (حذف ناعم) | ✅ موجودة | (deletedAt في جميع الجداول) |
| 170 | Hard Delete (حذف نهائي مع الملفات) | ✅ موجودة | `lib/invitation-deletion.ts` |
| 171 | تشفير كلمات المرور (scrypt/sha256) | ✅ موجودة | `lib/password.ts` |
| 172 | التحقق من صحة البيانات (Zod) | ✅ موجودة | `lib/validation.ts` |
| 173 | معالجة أخطاء المتصفح (Client Error Tracking) | ✅ موجودة | `app/api/errors/route.ts` |
| 174 | إشعارات Push (Web Push API) | ✅ موجودة | `lib/push-notifications.ts` |
| 175 | الاشتراك في Push Notifications | ✅ موجودة | `app/api/push/subscribe/route.ts` |
| 176 | اشتراكات VAPID | ✅ موجودة | `.env.example` |
| 177 | تحويل صور HEIC إلى JPEG | ✅ موجودة | `lib/image-formats.ts` |
| 178 | تحسين الصور بـ Sharp | ✅ موجودة | `lib/image-formats.ts` |
| 179 | استخراج الصوت من الفيديو (FFmpeg) | ✅ موجودة | `lib/video-audio-extraction.ts` |
| 180 | كتابة آمنة للملفات (Atomic File Write) | ✅ موجودة | `lib/atomic-file.ts` |
| 181 | أمان ملفات JSON (JSON File Safety) | ✅ موجودة | `lib/json-file-safety.ts` |
| 182 | مزامنة تلقائية مع GitHub بعد كل تعديل | ✅ موجودة | `lib/github-sync.ts` |
| 183 | طابور المزامنة (Sync Queue) | ✅ موجودة | `lib/github-sync-queue.ts` |
| 184 | تحليل رابط قاعدة البيانات (Multiple ENV formats) | ✅ موجودة | `lib/database-url.ts` |
| 185 | توليد المعرفات النصية (Slug Generation) | ✅ موجودة | `lib/slug.ts` |
| 186 | دعم التدويل (i18n) للعربية والإنجليزية | ✅ موجودة | `lib/i18n.ts` |
| 187 | بيانات تجريبية (Demo Data) | ✅ موجودة | `lib/demo-data.ts` |
| 188 | تجهيز الإنتاج (Prepare Production) | ✅ موجودة | `scripts/prepare-production.mjs` |
| 189 | توليد الأصول (Generate Assets) | ✅ موجودة | `scripts/generate-assets.mjs` |
| 190 | ضمان وجود مجلدات البيانات (Ensure Data Dirs) | ✅ موجودة | `scripts/ensure-data-dirs.mjs` |
| 191 | استعادة PostgreSQL من نسخة (Restore Script) | ✅ موجودة | `scripts/restore-postgres-backup.mjs` |
| 192 | تشغيل Cron يدوياً (Trigger Backup Cron) | ✅ موجودة | `scripts/trigger-backup-cron.mjs` |
| 193 | تنظيف آمن للتدقيق (Safe Cleanup Audit) | ✅ موجودة | `scripts/safe-cleanup-audit.mjs` |
| 194 | Dockerfile للتشغيل بحاوية | ✅ موجودة | `Dockerfile` |
| 195 | Railway Cron configuration | ✅ موجودة | `railway-cron.json` |
| 196 | تحسين الصور (AVIF, WebP) | ✅ موجودة | `next.config.ts` |
| 197 | تحميل Lucide Icons المحسّن | ✅ موجودة | `next.config.ts` |
| 198 | Cache طويل الأمد للملفات الثابتة | ✅ موجودة | `next.config.ts` |
| 199 | تنسيق عربي للأرقام (Arabic Number Format) | ✅ موجودة | `lib/utils.ts` |
| 200 | خط عربي لـ PDF | ✅ موجودة | `public/fonts/NotoNaskhArabic-Regular.ttf` |

#### خصائص إضافية

| # | الميزة | الحالة | الموقع في الكود |
|---|--------|--------|-----------------|
| 201 | تحليل إحصائيات المشرف (Admin Analytics) | ✅ موجودة | `lib/admin-analytics.ts` |
| 202 | تحليل إحصائيات العميل (Customer Analytics) | ✅ موجودة | `lib/customer-analytics.ts` |
| 203 | تحليل مصادر الزوار (Visit Source Analytics) | ✅ موجودة | `lib/visit-source-analytics.ts` |
| 204 | نظام العرض التقديمي (Preview Settings) | ✅ موجودة | `lib/preview-settings.ts` |
| 205 | التحقق من اكتمال الدعوة (Pre-publish Validation) | ✅ موجودة | `lib/pre-publish-validation.ts` |
| 206 | ربط الدعوات بالقوالب (Template Bindings) | ✅ موجودة | `lib/invitation-template-bindings.ts` |
| 207 | أرشفة الدعوات (Invitation Archiving) | ✅ موجودة | `lib/invitation-archiving.ts` |
| 208 | إدارة رمز الدعوة (Manage Token) | ✅ موجودة | `lib/invitation-manage-token.ts` |
| 209 | روابط الطلبات (Order Request Links) | ✅ موجودة | `lib/order-request-links.ts` |
| 210 | صور معاينة الطلبات (Order Preview Images) | ✅ موجودة | `lib/order-preview-images.ts` |
| 211 | عرض الصور (Display Images) | ✅ موجودة | `lib/display-images.ts` |
| 212 | رفع الصور من المتصفح (Browser Image Upload) | ✅ موجودة | `lib/browser-image-upload.ts` |
| 213 | مسارات التشغيل (Runtime Paths) | ✅ موجودة | `lib/runtime-paths.ts` |
| 214 | مخزن محتوى المشروع (Project Content Store) | ✅ موجودة | `lib/project-content-store.ts` |
| 215 | أصول المشروع (Project Assets) | ✅ موجودة | `lib/project-assets.ts` |
| 216 | نظام عرض القوالب المُحسّن (Enhanced Validation) | ✅ موجودة | `lib/validation-enhanced.ts` |
| 217 | مزود التخزين (Storage Provider) | ✅ موجودة | `lib/storage-provider.ts` |

#### خصائص معطلة/غير مكتملة/كود ميت

| # | الميزة | الحالة | الموقع في الكود | ملاحظة |
|---|--------|--------|-----------------|---------|
| 218 | تسجيل دخول العميل (Client Login) | ❌ معطل | `app/api/auth/client/login/route.ts` | يعيد 410 Gone |
| 219 | استعادة التعديلات الأخيرة (Recent Edits Restore) | ❌ Placeholder | `app/api/admin/recent-edits/restore/route.ts` | يعيد "manual-restore-only" |
| 220 | إعادة تعيين كلمة مرور العميل | ❌ غير موجودة | - | زر معطل في واجهة العملاء |
| 221 | نظام دفع إلكتروني | ❌ غير موجود | - | الباقات مجرد عرض توضيحي |
| 222 | صفحة Pricing مخصصة | ❌ غير موجودة | `app/pricing/` - قد لا تكون مكتملة | سلة الملفات قد لا تحتوي على التنفيذ الفعلي |
| 223 | صفحة Contact مخصصة | ❌ غير موجودة | `app/contact/` - قد لا تكون مكتملة | كما أعلاه |
| 224 | صفحة FAQ مخصصة | ❌ غير موجودة | `app/faq/` - قد لا تكون مكتملة | كما أعلاه |
| 225 | إدارة Admins من الواجهة | ❌ غير موجودة | - | Admins في ENV فقط |
| 226 | اختبارات (Tests) | ❌ غير موجودة | - | لا يوجد ملفات اختبار |
| 227 | توثيق API (Swagger/OpenAPI) | ❌ غير موجود | - | لا يوجد |
| 228 | تكامل مع وسائل التواصل (API) | ❌ غير موجود | - | نشر مباشر غير متاح |
| 229 | تطبيق جوال (PWA) | ❌ غير موجود | - | ليس PWA حالياً |
| 230 | نظام متعدد اللغات كامل | ⚠️ جزئي | `lib/i18n.ts` | دعم أساسي للعربية والإنجليزية لكن غير كامل |
| 231 | إشعارات WhatsApp Business API | ⚠️ جزئي | - | فقط رابط واتساب مبدئي |
| 232 | نظام صلاحيات متعدد (RBAC) | ❌ غير موجود | - | كل Admins بنفس الصلاحية |

---

## خريطة النظام الموجزة (System Architecture Summary)

```
BadrDaawa (Wedding Daawa)
├── Next.js 15 App Router (TypeScript)
│   ├── Public Pages (13)
│   ├── Admin Panel (36 pages)
│   ├── Client Portal (1 page + magic link)
│   ├── API Routes (67 endpoints)
│   └── Middleware (Auth + Security)
│
├── Frontend Components (70 components)
│   ├── Invitation Experience (16)
│   ├── Admin Panel (20)
│   ├── Client Portal (7)
│   ├── Shared/Public (27)
│
├── Business Logic (86 lib modules)
│   ├── Auth & Security (4)
│   ├── Invitations & Templates (13)
│   ├── Music System (2)
│   ├── Guests & Interaction (5)
│   ├── Analytics (4)
│   ├── Admin Data (5)
│   ├── Backup & Sync (4)
│   ├── Settings & Content (9)
│   ├── Storage & Media (7)
│   ├── System & Monitoring (11)
│   └── Utilities & Other (22)
│
├── Database (PostgreSQL via Prisma)
│   └── 18 tables + 4 enums
│
├── File Storage (JSON + Uploads)
│   ├── Settings: 9 JSON files
│   ├── Uploads: gallery, hero, music, etc.
│   └── Backups: versioned snapshots
│
├── Infrastructure
│   ├── Dockerfile
│   ├── Railway Cron Config
│   ├── GitHub Sync
│   └── Environment Variables (28 vars)
│
└── Scripts (6 utilities)
    ├── Asset generation
    ├── Backup/Restore
    └── Production setup
```

---

**نهاية التقرير الفني الشامل**

*تم إعداد هذا التقرير بناءً على تحليل الكود المصدري الفعلي للمشروع في 15 يونيو 2026.*
