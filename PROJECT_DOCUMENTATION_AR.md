# BadrDaawa - وثيقة هندسية شاملة للمشروع

آخر فحص محلي: 2026-06-08  
مسار المشروع: `/Users/mac/Documents/GitHub/BadrDaawa`  
حالة Git وقت الفحص: الفرع `main` متقدم محلياً عن `origin/main` بواحد commit.  
مصدر التوثيق: هذه الوثيقة مستخرجة من ملفات المشروع الحالية: `app/`, `components/`, `lib/`, `prisma/schema.prisma`, `package.json`, `.env.example`, وملفات البيانات داخل `data/`.

> ملاحظة مهمة: هذه الوثيقة لا تعتمد على تخمين خارجي. أي جزء غير واضح أو غير مكتمل من الكود مذكور صراحة في قسم المشاكل والديون التقنية.

---

## 1. نظرة عامة على المشروع

### اسم المشروع

اسم الحزمة في `package.json` هو `badrdaawa`. الاسم الظاهر في الواجهة ولوحة الإدارة هو `BadrDaawa`.

### الهدف

المشروع منصة دعوات زفاف رقمية كاملة. تسمح المنصة بعرض موقع عام، استعراض قوالب دعوات، استقبال طلبات من العملاء، إدارة الطلبات من لوحة أدمن، تحويل الطلبات إلى دعوات منشورة، السماح للعميل بتعديل دعوته، استقبال RSVP من الضيوف، إدارة الصور والموسيقى، عمل نسخ احتياطية، ومزامنة بيانات التشغيل وملفات الرفع مع GitHub.

### فكرة المشروع

المنصة تعمل حول كيان أساسي اسمه `Invitation`. الدعوة تحتوي على بيانات العروسين، التاريخ، الوقت، القاعة، المدينة، رابط الخريطة، الصور، الموسيقى، النصوص، بيانات المصور، القالب المستخدم، حالة الدعوة، وعدد المشاهدات. كل دعوة لها رابط عام مثل:

```text
/{code}
```

ولها لوحة تعديل للعميل:

```text
/{code}/ad_3399
```

### أنواع المستخدمين

- `Guest`: زائر عام يفتح الدعوة ويرسل RSVP.
- `Client`: صاحب الدعوة، يدخل لوحة دعوته الخاصة ويعدل البيانات والصور والموسيقى.
- `Admin`: صاحب المنصة، يدير الطلبات، الدعوات، العملاء، القوالب، الموسيقى، النسخ، المزامنة، والتحليلات.

### المشاكل التي يحلها المشروع

- تحويل دعوات الزفاف من تصميمات ثابتة إلى تجربة رقمية قابلة للمشاركة.
- تسهيل اختيار قالب وطلب دعوة من الموقع العام.
- تمكين صاحب المنصة من إدارة عشرات الدعوات من لوحة واحدة.
- تقليل تواصل واتساب اليدوي عبر نموذج طلب وصور وموسيقى ومعلومات مصور.
- جمع RSVP وعدد المرافقين والاعتذارات.
- الحفاظ على بيانات التشغيل عبر نسخ احتياطية ومزامنة GitHub.

### سير العمل الكامل للمستخدم

1. الزائر يدخل الموقع العام `/`.
2. يستعرض القوالب من `/templates` أو معاينة قالب `/templates/[slug]/preview`.
3. يفتح صفحة الطلب `/order`.
4. يدخل بيانات العريس والعروس والتاريخ والقاعة والصور والموسيقى وبيانات المصور.
5. يتم إرسال الطلب إلى `POST /api/orders`.
6. الطلب يحفظ في قاعدة البيانات أو fallback file store.
7. الأدمن يفتح `/admin/orders`.
8. الأدمن يراجع الطلب ويعدله ويشاهده Live Preview.
9. الأدمن ينشر الطلب كدعوة، فينشأ `Customer` و`Invitation`.
10. العميل يحصل على رابط الدعوة ورابط لوحة التعديل.
11. العميل يدخل `/{code}/ad_3399/login` ثم `/{code}/ad_3399`.
12. العميل يعدل بيانات الدعوة والصور والموسيقى والنصوص.
13. الضيوف يفتحون `/{code}` ويرسلون RSVP عبر `POST /api/invitations/[code]/rsvp`.
14. الأدمن يرى الإحصائيات في `/admin`, `/admin/analytics`, `/admin/client-invitations`.
15. أي تغييرات مهمة تستدعي `queueGitHubSync` لإنشاء Backup ومزامنة `data/` و`public/uploads/` مع GitHub عند ضبط المتغيرات.

---

## 2. بنية المشروع بالكامل

### شجرة عالية المستوى

```text
BadrDaawa/
├── app/                       تطبيق Next.js App Router: صفحات وAPI routes.
├── components/                مكونات React المستخدمة في الواجهة العامة ولوحات التحكم.
├── lib/                       منطق الأعمال والخدمات والمساعدات والتخزين والتحقق.
├── prisma/                    Prisma schema والمigrations.
├── public/                    أصول ثابتة: صور، SVG، صوت، خطوط، uploads، service worker.
├── data/                      بيانات runtime JSON والنسخ الاحتياطية وإعدادات القوالب والموسيقى.
├── scripts/                   سكربتات تجهيز الإنتاج والنسخ وتوليد الأصول.
├── package.json               تعريف الحزمة والسكريبتات والاعتماديات.
├── next.config.ts             إعدادات Next.js.
├── middleware.ts              حماية مسارات الأدمن والعميل.
├── tsconfig.json              إعداد TypeScript.
├── .env.example               نموذج المتغيرات البيئية.
├── README.md                  توثيق مختصر موجود مسبقاً.
├── FINAL_REPORT.md            تقرير سابق موجود بالمشروع.
└── PROJECT_DOCUMENTATION_AR.md هذه الوثيقة.
```

### مجلد `app/`

المشروع يستخدم Next.js App Router. الصفحات المهمة:

```text
app/page.tsx                         الصفحة الرئيسية العامة.
app/order/page.tsx                   صفحة طلب دعوة جديدة.
app/templates/page.tsx               قائمة القوالب العامة.
app/templates/[slug]/preview/page.tsx معاينة قالب محدد.
app/[code]/page.tsx                  صفحة الدعوة العامة.
app/[code]/ad_3399/login/page.tsx    دخول العميل للوحة دعوته.
app/[code]/ad_3399/page.tsx          لوحة تعديل دعوة العميل.
app/client/page.tsx                  صفحة دخول/مدخل العميل.
app/client/[code]/page.tsx           صفحة عميل مرتبطة بالكود.
app/client-invitations/page.tsx      صفحة عامة/legacy لدعوات العملاء.
app/pricing/page.tsx                 الأسعار.
app/contact/page.tsx                 التواصل.
app/faq/page.tsx                     الأسئلة الشائعة.
app/error.tsx                        Error boundary عام.
app/global-error.tsx                 Global error boundary.
app/layout.tsx                       Root layout.
app/globals.css                      كل CSS العام للمنصة.
```

صفحات لوحة الإدارة:

```text
app/admin/page.tsx                   مركز إدارة المنصة ومؤشرات التشغيل.
app/admin/layout.tsx                 يلف صفحات الإدارة داخل DashboardShell.
app/admin/login/page.tsx             صفحة دخول الأدمن.
app/admin/orders/page.tsx            إدارة طلبات الدعوات.
app/admin/client-invitations/page.tsx إدارة دعوات العملاء وإنشاء دعوة مباشرة.
app/admin/new-invitation/page.tsx    منشئ دعوة إداري.
app/admin/templates/page.tsx         إدارة القوالب والنصوص والاستيراد.
app/admin/music/page.tsx             مكتبة الموسيقى العامة.
app/admin/analytics/page.tsx         تحليلات المشاهدات وRSVP والقوالب.
app/admin/customers/page.tsx         عرض العملاء.
app/admin/backups/page.tsx           النسخ الاحتياطي والتنزيل والاستعادة.
app/admin/sync-history/page.tsx      سجل مزامنة GitHub.
app/admin/sync-settings/page.tsx     تشخيص إعدادات GitHub Sync.
app/admin/preview/page.tsx           اختيار محتوى/معاينة الرئيسية.
app/admin/recent-edits/page.tsx      آخر التعديلات واستعادة نسخ.
app/admin/broadcast/page.tsx         شاشة بث/تعليقات الموقع.
app/admin/invitations/page.tsx       صفحة إدارية legacy/قائمة دعوات.
app/admin/loading.tsx                Loading UI.
app/admin/error.tsx                  Error boundary داخل الأدمن.
```

### مجلد `app/api/`

كل API routes موجودة في قسم 15 بالتفصيل. أهم المجموعات:

- `app/api/auth/*`: دخول وخروج الأدمن والعميل.
- `app/api/orders/*`: إنشاء طلبات الدعوات ورفع preview images/music.
- `app/api/admin/*`: عمليات الإدارة.
- `app/api/client/invitations/[code]`: تحديث دعوة العميل.
- `app/api/invitations/[code]/*`: RSVP وتصدير الدعوة.
- `app/api/push/*`: Push notifications.
- `app/uploads/[...path]/route.ts`: تقديم ملفات uploads بطريقة آمنة مع range streaming.

### مجلد `components/`

أهم المكونات:

- `InvitationExperience.tsx`: المكون المركزي لعرض الدعوة حسب القالب. يحتوي على dispatch بين القوالب الثابتة والقوالب المخصصة.
- `OrderForm.tsx`: نموذج طلب الدعوة في الموقع العام.
- `TemplateBrowser.tsx` و`TemplateCard.tsx`: استعراض القوالب العامة.
- `AdminOrderRequestsManager.tsx`: واجهة إدارة الطلبات وتحويلها إلى دعوات مع Live Preview.
- `AdminInvitationTools.tsx`: أدوات تحرير بيانات الدعوة/الصور/الموسيقى/النصوص داخل الإدارة.
- `AdminCreateInvitationForm.tsx`: إنشاء دعوة عميل من الأدمن.
- `ClientInvitationEditor.tsx`: محرر العميل لدعوته.
- `LiveInvitationPreview.tsx`: إرسال payload للمعاينة الحية داخل iframe.
- `GuestTable.tsx`: عرض RSVP.
- `RsvpForm.tsx` و`InvitePoll.tsx`: إرسال حضور/اعتذار.
- `InviteMusic.tsx`: تشغيل الموسيقى داخل الدعوة.
- `InviteMap.tsx`: عرض الخريطة.
- `InviteOpening.tsx`: افتتاحية الدعوة.
- `InvitePermissions.tsx`: طلب صلاحيات notifications عندما تكون متاحة.
- `QrCodeBlock.tsx`: توليد QR.
- `DashboardShell.tsx`: تخطيط لوحة الإدارة والتنقل.
- `LoginPanel.tsx`: واجهة تسجيل الدخول.
- `CopyButton.tsx`: نسخ روابط.
- `ImageCropUploader.tsx`: رفع/قص صور.
- `BroadcastStudio.tsx` و`BroadcastAnnotator.tsx`: أدوات شاشة البث.
- `AdminTemplateLookup.tsx` و`AdminTextEditor.tsx`: أدوات إدارة القوالب والنصوص.
- `GlobalNotifications.tsx`: عرض إشعارات عامة.
- `Toast.tsx`, `ConfirmDialog.tsx`, `Pagination.tsx`, `StatsGrid.tsx`, `SiteHeader.tsx`, `SiteFooter.tsx`: مكونات UI مساعدة.

### مجلد `lib/`

ملفات الخدمات الأساسية:

- `db.ts`: تهيئة Prisma Client عند توفر رابط قاعدة بيانات.
- `database-url.ts`: اكتشاف `DATABASE_URL` أو بدائل Railway/Postgres.
- `admin-session.ts`: إنشاء/تحقق cookie الأدمن HMAC.
- `client-session.ts`: إنشاء/تحقق cookie العميل HMAC حسب كود الدعوة.
- `auth-config.ts`: قراءة إعدادات دخول الأدمن والأسرار.
- `password.ts`: hash/verify passwords.
- `admin-data.ts`: تجميع بيانات الأدمن من Prisma أو file store.
- `invitation-data.ts`: جلب الدعوة العامة والضيوف وتسجيل المشاهدات.
- `file-store.ts`: fallback JSON storage داخل `data/runtime-store.json`.
- `templates.ts`: تعريف القوالب الثابتة.
- `template-settings.ts`: تطبيق إعدادات القوالب من `data/template-settings.json` والموسيقى العامة.
- `custom-templates.ts`: إنشاء قوالب HTML مخصصة من لوحة الأدمن.
- `invitation-template-bindings.ts`: ربط متغيرات القالب المخصص ببيانات الدعوة.
- `invitation-images.ts`, `order-preview-images.ts`, `display-images.ts`, `image-formats.ts`, `browser-image-upload.ts`: حفظ وتحويل والتحقق من الصور.
- `audio-files.ts`: حفظ والتحقق من ملفات وروابط الصوت.
- `music-library.ts`: إدارة مكتبة الموسيقى العامة في `data/music-library.json`.
- `backups.ts`: إنشاء/list/download/restore النسخ الاحتياطية.
- `github-sync.ts`: مزامنة `data/` و`public/uploads/` إلى GitHub عبر REST API.
- `github-sync-queue.ts`: جدولة المزامنة بدون انتظار الطلب.
- `push-notifications.ts`: Web Push.
- `rate-limiting.ts`: rate limit داخلي لبعض APIs العامة.
- `validation.ts`, `validation-enhanced.ts`: Zod schemas والتحقق.
- `home-content.ts`, `preview-settings.ts`, `site-settings.ts`, `broadcast-fields.ts`: إعدادات ومحتوى الواجهة.
- `runtime-paths.ts`: مسارات runtime data/uploads/backups.
- `slug.ts`: توليد slug/code وروابط لوحة العميل.
- `utils.ts`: تنسيق تواريخ وأرقام وروابط الموقع وWhatsApp.
- `error-handler.ts`, `security-enhancements.ts`, `sync-middleware.ts`, `admin-utils.ts`: مساعدات إضافية.

### مجلد `prisma/`

- `schema.prisma`: نماذج قاعدة البيانات، enums، العلاقات والفهارس.
- `migrations/`: سبع migrations تقريباً:
  - `20260607193000_init`
  - `20260607202000_invitation_builder_fields`
  - `20260608003000_order_requests_full_workflow`
  - `20260608005500_order_request_map_url`
  - `20260608013000_invitation_texts`
  - `20260608014500_order_request_texts`
  - `20260608015000_invitation_music_default`

### مجلد `data/`

ملفات runtime:

- `runtime-store.json`: التخزين الاحتياطي للطلبات والدعوات والعملاء والضيوف عند غياب DB.
- `template-settings.json`: تعديلات القوالب.
- `music-library.json`: مكتبة الموسيقى العامة.
- `home-content.json`: محتوى الرئيسية/المعاينة.
- `backups/*.json`: نسخ احتياطية.

### مجلد `public/`

- `assets/templates/*.svg|png`: صور معاينة القوالب.
- `assets/invite/*.jpeg`: صور demo/fallback للدعوات.
- `assets/audio/badr-sara-wedding-3.mp3`: الصوت الافتراضي.
- `assets/brand/*`: صور العلامة/الرئيسية.
- `fonts/NotoNaskhArabic-Regular.ttf`: خط عربي.
- `uploads/order-previews`, `uploads/order-requests`, `uploads/client-invitations`, `uploads/music`: ملفات رفع runtime.
- `sw.js`: Service Worker.

---

## 3. التقنيات المستخدمة

### Framework

- `Next.js 15.5.x`: App Router، Server Components، Route Handlers، Middleware.
- `React 19.2.x`: واجهات Client Components.
- `TypeScript 5.9.3`: typing كامل تقريباً.

### Database و ORM

- `PostgreSQL`: datasource في Prisma.
- `Prisma 5.22`: ORM ونماذج DB ومigrations.
- fallback storage عبر JSON عند عدم توفر DB.

### UI و Icons

- CSS مخصص داخل `app/globals.css`.
- `lucide-react`: أيقونات.
- لا توجد مكتبة UI جاهزة مثل Tailwind أو MUI في `package.json`.

### Validation

- `zod`: schemas للطلبات وRSVP وبعض عمليات الإدارة.

### Media Processing

- `sharp`: تحويل/ضغط الصور.
- `heic-convert`: دعم تحويل HEIC.
- `qrcode`: QR.
- `pdfkit`: تصدير PDF.
- `xlsx`: تصدير Excel/جداول عند الحاجة.

### Authentication

- جلسات موقعة HMAC في cookies:
  - أدمن: `bd_admin_session`.
  - عميل: `bd_client_session`.
- كلمات المرور:
  - الأدمن من ENV plain أو hash.
  - العملاء من DB/File store باستخدام `hashPassword`/`verifyPassword`.

### Storage

- DB أساسي عبر Prisma/PostgreSQL.
- ملفات JSON كـ fallback.
- uploads تحفظ داخل `public/uploads`.
- backups تحفظ داخل `data/backups`.

### Hosting/Deployment

- الكود يحتوي إعدادات صريحة لـ Railway من خلال:
  - دعم `DATABASE_PRIVATE_URL`, `DATABASE_PUBLIC_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`.
  - `scripts/prepare-production.mjs`.
  - رسائل في التقارير تشير إلى Railway.

### Notifications

- Web Push عبر `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
- APIs:
  - `POST /api/push/subscribe`
  - `GET /api/push/latest`
  - `POST /api/admin/notifications/send`

### GitHub Integration

- `lib/github-sync.ts` يستخدم GitHub REST API:
  - blobs
  - trees
  - commits
  - update branch ref
- يزامن `data/` و`public/uploads/`.

---

## 4. قاعدة البيانات

### Enums

```prisma
InvitationStatus = DRAFT | ACTIVE | PAUSED | ARCHIVED
OrderStatus = NEW | REVIEWING | EDITED | PUBLISHED | ACCEPTED | REJECTED | CONVERTED
RsvpStatus = CONFIRMED | DECLINED
BackupStatus = QUEUED | RUNNING | SUCCESS | FAILED
```

### AdminUser

الغرض: نموذج لمستخدم أدمن داخل DB، لكن تسجيل الدخول الحالي يعتمد أساساً على ENV في `auth-config.ts`.

الحقول:

- `id`: String cuid primary key.
- `email`: unique.
- `name`.
- `passwordHash`.
- `role`: default `OWNER`.
- `createdAt`, `updatedAt`.

### Customer

الغرض: صاحب/عميل الدعوة.

الحقول:

- `id`: primary key.
- `name`, `phone`, `email?`.
- `username`: unique.
- `passwordHash`.
- `isActive`: default true.
- `invitations`: علاقة one-to-many مع Invitation.
- `orders`: علاقة one-to-many مع OrderRequest.
- `createdAt`, `updatedAt`.

الفهارس:

- `phone`
- `createdAt`

### WeddingTemplate

الغرض: تمثيل القوالب داخل DB لضمان العلاقات مع الدعوات والطلبات.

الحقول:

- `id`
- `slug`: unique.
- `name`, `arabicName`, `category`, `style`, `concept`, `opening`, `layout`, `typography`.
- `palette`: Json.
- `previewUrl`.
- `enabled`: default true.
- `sortOrder`: default 0.
- علاقات: `invitations`, `orders`.
- `createdAt`, `updatedAt`.

الفهارس:

- `[enabled, sortOrder]`
- `[style]`

### Invitation

الغرض: الدعوة المنشورة أو draft.

الحقول:

- `id`
- `code`: unique، الرابط العام.
- `status`: `InvitationStatus`, default `DRAFT`.
- `language`: default `ar`.
- `groomName`, `brideName`.
- `weddingDate`: DateTime.
- `weddingTime`.
- `venue`, `city?`, `mapUrl?`.
- `heroPhoto?`.
- `gallery`: Json default `[]`.
- `musicUrl?`, `musicEnabled`.
- `texts?`: Json لنصوص الدعوة.
- `photographer?`: Json.
- `qrCodeUrl?`.
- `viewCount`: default 0.
- `customerId`: FK إلى Customer مع cascade delete.
- `templateId`: FK إلى WeddingTemplate.
- `guests`: GuestRsvp[].
- `events`: AnalyticsEvent[].
- `createdAt`, `updatedAt`.

الفهارس:

- `[status, weddingDate]`
- `[customerId, createdAt]`
- `[templateId]`

### GuestRsvp

الغرض: ردود الحضور.

الحقول:

- `id`
- `invitationId`: FK إلى Invitation مع cascade delete.
- `name`, `phone`.
- `attendees`: default 1.
- `status`: CONFIRMED أو DECLINED.
- `note?`.
- `ipHash?`, `userAgent?`: موجودة في schema لكن API الحالي لا يملؤها عند RSVP.
- `createdAt`, `updatedAt`.

الفهارس:

- `[invitationId, createdAt]`
- `[invitationId, status]`
- `[phone]`

### OrderRequest

الغرض: طلب دعوة قبل النشر.

الحقول:

- `id`
- `orderNumber?`: unique.
- `dedupeKey?`: unique لمنع تكرار نفس الطلب.
- `groomName`, `brideName`, `phone`.
- `weddingDate`.
- `venue`, `mapUrl?`, `notes?`.
- `imageUrls`: Json default `[]`.
- `musicEnabled`, `musicChoice`, `musicUrl`.
- `texts?`, `photographer?`.
- `rejectionReason?`.
- `publishedInvitationCode?`.
- `language`: default `ar`.
- `status`: default NEW.
- `submittedAt`: default now.
- `templateId?`: FK اختياري.
- `customerId?`: FK اختياري.
- `createdAt`, `updatedAt`.

الفهارس:

- `[status, createdAt]`
- `[phone]`
- `[submittedAt]`

### AnalyticsEvent

الغرض: تسجيل أحداث الدعوات، حالياً `VIEW` عند فتح الدعوة.

الحقول:

- `id`
- `invitationId`: FK مع cascade delete.
- `eventType`.
- `metadata?`: Json.
- `ipHash?`.
- `createdAt`.

الفهارس:

- `[invitationId, eventType, createdAt]`
- `[createdAt]`

### BackupJob

الغرض: تسجيل عمليات النسخ الاحتياطي داخل DB.

الحقول:

- `id`, `type`, `status`.
- `fileName?`, `githubSha?`, `sizeBytes?`.
- `startedAt?`, `finishedAt?`, `error?`.
- `createdAt`.

الفهارس:

- `[type, createdAt]`
- `[status]`

### SyncLog

الغرض: سجل GitHub Sync.

الحقول:

- `id`
- `timestamp`: default now.
- `reason`
- `status`
- `filesCount?`
- `commitSha?`, `commitUrl?`
- `errorMessage?`
- `duration?`
- `retryCount`: default 0
- `nextRetryAt?`
- `createdAt`, `updatedAt`

الفهارس:

- `[status, createdAt]`
- `[createdAt]`

### ERD نصي

```text
Customer 1 ──── * Invitation
Customer 1 ──── * OrderRequest

WeddingTemplate 1 ──── * Invitation
WeddingTemplate 1 ──── * OrderRequest

Invitation 1 ──── * GuestRsvp
Invitation 1 ──── * AnalyticsEvent

BackupJob مستقل
SyncLog مستقل
AdminUser مستقل حالياً
```

---

## 5. نظام الدعوات

### مصادر الدعوات

الدعوات تأتي من:

1. Prisma/PostgreSQL عند توفر DB.
2. `data/runtime-store.json` عبر `lib/file-store.ts` عند غياب DB أو حدوث خطأ.
3. Demo data عبر `lib/demo-data.ts` في العرض العام عند عدم وجود دعوة في DB/file store.

### إنشاء الدعوة من الأدمن

المسار:

```text
POST /api/admin/invitations
```

الملف:

```text
app/api/admin/invitations/route.ts
```

البيانات المطلوبة:

- `groomName`
- `brideName`
- `phone`
- `username`
- `password`
- `weddingDate`
- `venue`

البيانات الاختيارية:

- `groomEnglish`, `brideEnglish`: لبناء slug.
- `weddingTime`
- `city`
- `mapUrl`
- `templateSlug`
- صور gallery.
- `musicUrl` أو `audioFile`.

الخطوات:

1. يتحقق من جلسة الأدمن.
2. يقرأ `FormData`.
3. يتحقق من الحقول الأساسية وصحة التاريخ.
4. يمنع YouTube كمصدر صوت مباشر.
5. يحفظ الصور عبر `saveInvitationGalleryImages`.
6. يحفظ الصوت عبر `saveUploadedAudioFile` أو ينظف الرابط عبر `cleanPlayableAudioUrl`.
7. يبني base slug من أسماء إنجليزية أو الأسماء الأصلية.
8. إذا لا يوجد Prisma: يستخدم `createFileInvitation`.
9. إذا يوجد Prisma:
   - upsert للقالب داخل `WeddingTemplate`.
   - upsert للعميل داخل `Customer`.
   - توليد code فريد.
   - إنشاء `Invitation` بحالة `ACTIVE`.
10. يعيد revalidate للمسارات.
11. يضيف GitHub Sync إلى queue مع snapshot.

### إنشاء الدعوة من طلب منشور

المسار:

```text
POST /api/admin/orders/[id]
```

عند `action = publish` أو legacy `convert`:

1. يقرأ الطلب.
2. ينظف البيانات والصور والموسيقى والنصوص والمصور.
3. ينشئ/يحدث Template.
4. ينشئ Customer.
5. ينشئ Invitation.
6. يربط `publishedInvitationCode` بالطلب ويحدث status إلى `PUBLISHED`.
7. يعيد روابط:
   - `publicUrl`
   - `adminUrl`

### تعديل الدعوة من العميل

المسار:

```text
POST /api/client/invitations/[code]
```

يدعم وضعين:

- JSON: تحديث حي من المحرر.
- FormData: تحديث تقليدي.

الحقول المدعومة:

- `groomName`, `brideName`
- `weddingDate`, `weddingTime`
- `venue`, `city`, `mapUrl`
- `gallery`
- `musicEnabled`, `musicUrl`, `musicDataUrl`, `audioFile`
- `texts`
- `photographer`

الحماية:

- لازم cookie عميل صالح `bd_client_session` مطابق لنفس `code`.

### إيقاف/تشغيل/حذف الدعوة

المسار:

```text
POST /api/admin/invitations/[code]
```

الأفعال:

- `pause`: يحول DB status إلى `PAUSED` أو file `isActive=false`.
- `resume`: يحول DB status إلى `ACTIVE` أو file `isActive=true`.
- `delete`: يحذف الدعوة من DB أو file store، ويحذف guests في file store مع حذف العميل إذا لم يعد لديه دعوات.

### عرض الدعوة

المسار:

```text
GET /[code]
```

الملف:

```text
app/[code]/page.tsx
```

يعتمد على:

- `getInvitationByCode(code)`
- `recordInvitationView(code)`
- `getTemplateWithSettings(invitation.templateSlug)`
- `InvitationExperience`

### دورة حياة الدعوة

```text
طلب عام NEW
    ↓ review/update/reject داخل /admin/orders
REVIEWING / EDITED / REJECTED
    ↓ publish
Invitation ACTIVE + Order PUBLISHED
    ↓ العميل يعدل
ACTIVE مع updatedAt جديد
    ↓ الأدمن يوقف
PAUSED / isActive=false
    ↓ الأدمن يعيد التشغيل
ACTIVE
    ↓ الأدمن يحذف
Deleted
```

---

## 6. نظام القوالب

### مكان القوالب

القوالب الثابتة موجودة في:

```text
lib/templates.ts
```

تعريف كل قالب مطابق لـ `TemplateDefinition` في `lib/types.ts`:

- `id`
- `slug`
- `name`
- `arabicName`
- `category`
- `style`
- `concept`
- `opening`
- `layout`
- `typography`
- `palette`
- `previewImage`
- `accentImage`
- `musicUrl`
- `enabled`
- `score`

### قائمة القوالب الثابتة

| slug | الاسم | الاسم العربي | التصنيف | style |
|---|---|---|---|---|
| `featured-1` | Featured 1 | مميز 1 | كوكتيل مميز | featured |
| `cinematic-rose` | Cinematic Rose | سينمائي وردي | قالب سينمائي رومانسي | cinematic |
| `modern-cinematic` | Modern Cinematic | سينمائي حديث | قالب فيلم حديث | cinematic |
| `ethereal-glass` | Ethereal Glass | زجاجي حالم | قالب زجاجي رومانسي | glass |
| `botanical-theme` | Botanical Theme | نباتي هادئ | قالب نباتي هادئ | garden |
| `royal-gold` | Royal Gold | ملكي ذهبي | قالب ملكي أسود ذهبي | royal |
| `boho-sand` | Boho Sand | بوهو رملي | قالب بوهو دافئ | boho |
| `pure-white` | Pure White | أبيض نقي | قالب مينيمال أبيض | minimal |
| `neon-theme` | Neon Theme | نيون مودرن | قالب نيون عصري | neon |
| `vintage-theme` | Vintage Theme | فينتاج كلاسيك | قالب فينتاج ورقي | vintage |
| `fairytale-theme` | Fairytale Theme | حكاية وردية | قالب رومانسي حالم | ivory |
| `ocean-theme` | Ocean Theme | أوشن أزرق | قالب أزرق منعش | ocean |
| `art-deco-theme` | Art Deco Theme | آرت ديكو ذهبي | قالب أسود وذهبي فاخر | artdeco |
| `magazine-theme` | Magazine Theme | غلاف مجلة | قالب Editorial جرئ | magazine |
| `royal-envelope` | Royal Envelope | كلاسيك ملكي | قالب ملكي فاتح | royal |
| `luxe-noir` | Luxe Noir | فخم داكن | قالب فاخر داكن | noir |
| `ivory-arches` | Ivory Arches | رومانسي ناعم | قالب رومانسي كريمي | ivory |
| `mobile-gold` | Mobile Gold | ذهبي عصري | باقة موبايل ذهبية | mobile |
| `soft-gold` | Soft Gold | ذهبي بسيط | قالب ذهبي ناعم | mobile |
| `boho-chic` | Boho Chic | بوهو ترندي | قالب Boho Sage | boho |
| `garden-elegance` | Garden Elegance | حدائق أنيقة | قالب حديقة أنيق | garden |
| `cinematic-story` | Cinematic Story | سينمائي فاخر | قالب سينمائي داكن | cinematic |

### عرض القوالب

- القائمة العامة: `/templates`.
- المعاينة: `/templates/[slug]/preview`.
- بطاقة القالب: `TemplateCard`.
- المتصفح: `TemplateBrowser`.
- المعاينة النهائية تستخدم `InvitationExperience`.

### ربط البيانات بالقالب

في القوالب الثابتة، `InvitationExperience` يختار Component حسب `template.slug` ويحقن:

- أسماء العروسين.
- التاريخ والوقت.
- القاعة والمدينة والخريطة.
- صور hero/secondary/detail.
- الموسيقى.
- نصوص الدعوة.
- RSVP.
- QR.
- بيانات المصور.

في القوالب المخصصة `customHtml`:

- تستخدم `CustomHtmlInvitationExperience`.
- الربط يتم عبر `invitation-template-bindings.ts`.
- القالب يعرض داخل iframe sandbox.

### إعدادات القوالب

`data/template-settings.json` يحفظ تعديلات:

- الاسم العربي.
- التصنيف.
- الفكرة/الوصف.
- طريقة الفتح.
- layout.
- typography.
- enabled.
- preview/accent images.
- palette.
- photographer.
- musicUrl أو musicMuted.

### القوالب المخصصة

تضاف من `/admin/templates` عبر:

```text
POST /api/admin/templates/import
```

وتحفظ في:

```text
data/custom-templates.json
```

---

## 7. لوحة الإدارة الرئيسية

### الحماية

كل `/admin/*` محمي عبر `middleware.ts` باستثناء `/admin/login`.

Cookie:

```text
bd_admin_session
```

### `/admin`

ملف:

```text
app/admin/page.tsx
```

الغرض: مركز إدارة المنصة. يعرض:

- إجمالي الدعوات.
- الدعوات النشطة والمنتهية.
- إجمالي زيارات الدعوات.
- الطلبات المفتوحة والجديدة.
- ردود الحضور والضيوف المتوقعين.
- أحدث الدعوات.
- تنبيهات تشغيل.
- حالة قاعدة البيانات.
- حالة GitHub Sync.
- حالة النسخ الاحتياطي.
- حالة الموسيقى.
- أحدث الطلبات.
- اختصارات العملاء/النسخ/السجل/آخر التعديلات/التحليلات.

مصادر البيانات:

- `getAdminInvitations`
- `getAdminOrders`
- `getAdminGuests`
- `listBackupSnapshots`
- `getMusicLibrary`
- `hasDatabaseConfig`

### `/admin/orders`

ملف:

```text
app/admin/orders/page.tsx
```

الغرض: إدارة الطلبات من الموقع العام.

المكون الرئيسي:

```text
AdminOrderRequestsManager
```

الوظائف:

- عرض الطلبات.
- اختيار طلب.
- تعديل بيانات الطلب.
- رفع/تعديل صور.
- اختيار قالب.
- معاينة مباشرة.
- تشغيل/تغيير موسيقى.
- بيانات المصور.
- تغيير نصوص الدعوة.
- نقل الطلب إلى review.
- update.
- publish كدعوة.
- reject.
- delete.

APIs:

- `POST /api/admin/orders/[id]`

الجداول:

- `OrderRequest`
- عند النشر: `Invitation`, `Customer`, `WeddingTemplate`.

### `/admin/client-invitations`

الغرض: إنشاء وإدارة دعوات العملاء.

الوظائف:

- إنشاء دعوة جديدة من الأدمن.
- عرض ملخص الدعوات.
- بحث وفلترة وترتيب.
- عرض code، أسماء، تاريخ الفرح، القالب، المشاهدات، الحضور، الحالة.
- فتح الدعوة.
- فتح لوحة تعديل العميل.
- نسخ رابط الدعوة.
- pause/resume/delete.

APIs:

- `POST /api/admin/invitations`
- `POST /api/admin/invitations/[code]`

الجداول:

- `Invitation`
- `Customer`
- `WeddingTemplate`
- `GuestRsvp`

### `/admin/templates`

الغرض: إدارة القوالب والنصوص والاستيراد.

الوظائف:

- استيراد قالب HTML.
- البحث عن دعوة/قالب.
- تعديل النصوص.
- معاينة كل قالب داخل iframe.
- تعديل بيانات القالب.
- تعديل palette.
- صور preview/accent.
- الموسيقى.
- بيانات المصور.

APIs:

- `POST /api/admin/templates/import`
- `POST /api/admin/templates/music`

مصادر البيانات:

- `lib/templates.ts`
- `data/template-settings.json`
- `data/custom-templates.json`

### `/admin/music`

الغرض: مكتبة موسيقى عامة تطبق على القوالب.

الوظائف:

- عرض المقطع النشط.
- عرض المقاطع المحفوظة.
- تشغيل/إيقاف/حذف.
- إضافة أو تحديث مقطع بالاسم.
- رفع ملف صوت أو إدخال رابط مباشر.

API:

- `POST /api/admin/music`

ملف التخزين:

- `data/music-library.json`
- ملفات الرفع في `public/uploads/music`.

### `/admin/backups`

الغرض: إدارة النسخ الاحتياطية.

الوظائف:

- إنشاء نسخة يدوية.
- عرض النسخ.
- تحميل نسخة.
- استعادة نسخة بشرط كتابة اسم الملف.

APIs:

- `GET /api/admin/backups`
- `POST /api/admin/backups`
- `GET /api/admin/backups/[fileName]`
- `POST /api/admin/recent-edits/restore`

### `/admin/sync-history`

الغرض: عرض سجل GitHub Sync.

الوظائف:

- فلترة حسب status.
- بحث في reason.
- Pagination.
- عرض commit/duration/retries/errors.
- زر مزامنة الآن.

APIs:

- `GET /api/admin/sync/history`
- `POST /api/admin/sync-status`
- `POST /api/admin/sync/retry`

جدول:

- `SyncLog`

### `/admin/sync-settings`

الغرض: تشخيص إعدادات GitHub Sync.

يعرض:

- هل token موجود.
- هل repo موجود.
- هل branch مضبوط.
- مصدر token/repo/branch.
- readiness.
- آخر عمليات sync.

### `/admin/analytics`

الغرض: تحليلات المنصة.

يعرض:

- إجمالي المشاهدات.
- RSVP conversion.
- عدد القوالب.
- متوسط الضيوف.
- حضور مؤكد.
- اعتذارات.
- أكثر الدعوات مشاهدة.
- أداء القوالب.
- آخر RSVP.

مصادر:

- `getAdminGuests`
- `getAdminInvitations`
- `getTemplatesWithSettings`

### `/admin/customers`

الغرض: عرض العملاء.

مصدر:

- `getAdminCustomers`

جدول:

- `Customer`

### `/admin/preview`

الغرض: إدارة معاينة/محتوى الصفحة الرئيسية.

API:

- `POST /api/admin/preview`

### `/admin/broadcast`

الغرض: شاشة بث/تعليقات على الموقع.

APIs:

- `PATCH /api/admin/broadcast`
- `POST /api/admin/broadcast`

### `/admin/recent-edits`

الغرض: عرض/استعادة تعديلات أو backups حديثة.

API:

- `POST /api/admin/recent-edits/restore`

---

## 8. لوحة العميل

### المسارات

```text
/{code}/ad_3399/login
/{code}/ad_3399
```

### الحماية

`middleware.ts` يطابق:

```regex
^/([^/]+)/ad_3399(?:/.*)?$
```

إذا المسار ليس صفحة login، يتحقق من cookie:

```text
bd_client_session
```

ويجب أن يحتوي payload موقّعاً فيه نفس `code`.

### تسجيل الدخول

API:

```text
POST /api/auth/client/login
```

يتحقق من:

1. `CLIENT_ADMIN_USERNAME` + `CLIENT_ADMIN_PASSWORD` كدخول عام اختياري.
2. file store عبر `validateFileClientLogin`.
3. DB عبر `Invitation -> Customer.username/passwordHash/isActive`.

### صلاحيات العميل

العميل يستطيع فقط تعديل الدعوة ذات `code` المطابق للـ cookie.

العمليات المتاحة:

- تعديل أسماء العروسين.
- تعديل التاريخ والوقت.
- تعديل القاعة والمدينة والخريطة.
- رفع/تعديل صور الدعوة.
- رفع/تغيير الموسيقى.
- تفعيل/تعطيل الموسيقى.
- تعديل النصوص.
- تعديل بيانات المصور.

لا يستطيع:

- حذف الدعوة.
- تغيير حالة active/paused.
- رؤية دعوات أخرى.
- إدارة القوالب العامة.
- إدارة النسخ أو sync.

---

## 9. نظام RSVP والحضور

### الواجهة

RSVP يظهر داخل الدعوة عبر:

- `InvitePoll`
- `RsvpForm`

### API

```text
POST /api/invitations/[code]/rsvp
```

التحقق:

```ts
rsvpSchema = {
  name: string min 2,
  phone: string min 8,
  attendees: int 1..20,
  status: "confirmed" | "declined",
  note?: string max 500
}
```

### التخزين

في DB:

- يجد `Invitation` بالـ `code`.
- يجب أن تكون `status === ACTIVE`.
- ينشئ `GuestRsvp`.

في file store:

- يجد الدعوة في `runtime-store.json`.
- يجب `isActive`.
- يضيف guest داخل `guests`.

### الإحصائيات

تُحسب من `getAdminGuests`:

- confirmed.
- declined.
- total responses.
- attendees sum.
- conversion = confirmed / total guests.

### ملاحظة

حقول `ipHash` و`userAgent` موجودة في DB لكنها غير معبأة حالياً في API RSVP.

---

## 10. نظام الصور والملفات

### رفع الصور

مصادر رفع الصور:

- طلب الدعوة العام: `POST /api/orders`, `POST /api/orders/preview-images`.
- إنشاء دعوة من الأدمن: `POST /api/admin/invitations`.
- تعديل دعوة العميل: `POST /api/client/invitations/[code]`.
- أدوات الأدمن/الطلب: upload helpers داخل `AdminInvitationTools`.

### التخزين

المجلدات:

```text
public/uploads/order-previews
public/uploads/order-requests
public/uploads/client-invitations
public/uploads/music
```

### التحويل والضغط

الملفات:

- `lib/order-preview-images.ts`
- `lib/invitation-images.ts`
- `lib/display-images.ts`
- `lib/image-formats.ts`

المبادئ:

- قبول صيغ صور محددة.
- تحويل HEIC وغير العرضية إلى صيغة قابلة للمتصفح.
- استخدام `sharp` للمعالجة.
- منع SVG كصورة upload قابلة للعرض.
- حد أقصى لصور الطلب preview: 32MB.
- حفظ 3 صور رئيسية غالباً: cover/secondary/detail.

### عرض ملفات uploads

المسار:

```text
GET /uploads/[...path]
```

الملف:

```text
app/uploads/[...path]/route.ts
```

الخصائص:

- يتحقق من path traversal.
- يخدم من `public/uploads`.
- يدعم Range requests للوسائط.
- يستخدم streaming بدل قراءة الملف كاملاً.
- يحدد content-type آمن.

### حذف الصور

لا يوجد نظام حذف صور كامل ومركزي لكل الصور القديمة. يوجد حذف واضح للموسيقى المرفوعة عبر `deleteUploadedMusicFile`. الصور القديمة قد تبقى في uploads عند استبدالها.

---

## 11. نظام الصوت والموسيقى

### مصادر الصوت

1. صوت خاص بالدعوة: `Invitation.musicUrl` مع `musicEnabled`.
2. صوت القالب: `TemplateDefinition.musicUrl`.
3. مكتبة الموسيقى العامة: `data/music-library.json`.

### أولوية الصوت في العرض

داخل `InvitationExperience`:

```ts
const templateMusicUrl = disableMusic || invitation.musicEnabled !== true
  ? null
  : invitation.musicUrl || template.musicUrl;
```

المعنى:

- إذا `disableMusic` true: لا صوت.
- إذا الدعوة `musicEnabled !== true`: لا صوت.
- إذا الدعوة مفعلة موسيقى:
  - يستخدم `invitation.musicUrl` إن وجد.
  - وإلا يستخدم `template.musicUrl`.

`template.musicUrl` قد يكون من:

- القالب الثابت.
- override في `template-settings.json`.
- الموسيقى العامة النشطة من `music-library.json`.

### الملفات المدعومة

من `audio-files.ts`:

- mp3
- wav
- ogg
- webm
- m4a
- aac
- mp4 كصوت m4a
- aif/aiff
- flac

الحد:

- 35MB للملف الصوتي.

### منع YouTube

`isYouTubeUrl` يمنع YouTube لأن الرابط ليس ملف صوت مباشر.

---

## 12. نظام الإشعارات

### الملفات

- `lib/push-notifications.ts`
- `components/InvitePermissions.tsx`
- `components/GlobalNotifications.tsx`
- `public/sw.js`

### APIs

```text
POST /api/push/subscribe
GET  /api/push/latest
POST /api/admin/notifications/send
```

### المتغيرات

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `ADMIN_EMAIL` fallback للـ subject.

### الاستخدام

الدعوة يمكن أن تعرض `InvitePermissions` لطلب صلاحية notifications. الأدمن يمكنه إرسال إشعار من API الإدارة. تفاصيل التخزين الدائم للاشتراكات تحتاج مراجعة أعمق في `push-notifications.ts` إذا سيتم توسيع النظام.

---

## 13. نظام النسخ الاحتياطي

### إنشاء النسخة

الدالة:

```ts
createBackupSnapshot(type = "manual")
```

الملف:

```text
lib/backups.ts
```

الخطوات:

1. `ensureRuntimeDirectories`.
2. قراءة snapshot من DB إن كان Prisma متاحاً:
   - customers
   - templates
   - invitations
   - guests
   - orders
   - analyticsEvents
   - backupJobs
3. قراءة ملفات JSON داخل `data/` ما عدا ملفات backup.
4. قراءة uploads بشروط:
   - كل ملف <= 5MB.
   - مجموع uploads <= 40MB.
5. إنشاء ملف JSON في `data/backups`.
6. تسجيل `BackupJob` في DB إذا متاح.
7. تنظيف النسخ القديمة:
   - النسخ الأقدم من 7 أيام.
   - أكثر من 5 نسخ لكل type.

### اسم الملف

```text
{type}-{timestamp}.json
```

مثل:

```text
manual-20260606T232016Z.json
admin-auto-20260608T173544Z.json
```

### محتوى النسخة

```json
{
  "version": 1,
  "type": "manual",
  "createdAt": "...",
  "source": "database أو files",
  "app": "BadrDaawa",
  "database": {},
  "dataFiles": {},
  "uploads": []
}
```

### الاستعادة

الدالة:

```ts
restoreBackupSnapshot(fileName)
```

الخطوات:

1. قراءة ملف backup آمن الاسم.
2. إنشاء نسخة قبل الاستعادة من نوع `restore-before`.
3. استعادة `dataFiles` إلى `data/`.
4. استعادة uploads إلى `public/uploads`.
5. إرجاع ملخص.

قيود مهمة:

- الاستعادة الحالية تعيد ملفات `data` و`uploads`.
- إذا النسخة تحتوي dump DB، الكود يعلّم `includesDatabaseDump=true` لكنه لا يعيد كتابة PostgreSQL فعلياً.

---

## 14. نظام GitHub Sync

### الملفات

- `lib/github-sync.ts`
- `lib/github-sync-queue.ts`
- `app/api/admin/sync-status/route.ts`
- `app/api/admin/sync/status/route.ts`
- `app/api/admin/sync/history/route.ts`
- `app/api/admin/sync/retry/route.ts`

### ما الذي تتم مزامنته؟

```ts
syncRoots = ["data", "public/uploads"]
```

أي:

- ملفات JSON runtime.
- backups.
- uploads.

الحد الأقصى للملف الواحد:

```text
90MB
```

### المتغيرات المطلوبة

- `GITHUB_SYNC_TOKEN` أو fallback:
  - `BACKUP_GITHUB_TOKEN`
  - `GITHUB_TOKEN`
  - `GH_TOKEN`
- `GITHUB_SYNC_REPO` أو `BACKUP_GITHUB_REPO`
- `GITHUB_SYNC_BRANCH` أو `RAILWAY_GIT_BRANCH` أو default `main`
- `GITHUB_SYNC_ENABLED` إذا كانت `false` توقف النظام.

### خطوات التنفيذ

1. قراءة config.
2. إنشاء backup snapshot إذا `createSnapshot=true`.
3. جمع الملفات من `data` و`public/uploads`.
4. قراءة branch ref من GitHub.
5. قراءة head commit/tree.
6. إنشاء blob لكل ملف.
7. إنشاء tree جديد.
8. إذا tree لم يتغير: `unchanged`.
9. إنشاء commit برسالة:

```text
chore(admin): sync admin changes
```

10. تحديث ref للفرع بـ `PATCH`.
11. تسجيل النتيجة في `SyncLog`.

### معالجة الأخطاء

- 401 أو Bad credentials: `authFailed=true` ورسالة واضحة تطلب token جديد.
- 403/resource not accessible: token صحيح لكن لا يملك write access.
- retry فقط للأخطاء غير auth.
- retry delays:
  - 5s
  - 15s
  - 45s
- max retries = 3.

### تشخيص token

الكود ينظف token من:

- مسافات.
- newlines.
- علامات اقتباس.
- prefix مثل `GITHUB_SYNC_TOKEN=...`.
- zero-width chars.

ويعرض diagnostics بدون كشف token:

- rawLength
- normalizedLength
- normalizedChanged
- fingerprint أول 12 من SHA256.

### ملاحظة حالية

كان هناك خطأ عملي في البيئة المحلية عند `git push origin main`:

```text
fatal: could not read Username for 'https://github.com': Device not configured
```

هذا يخص git المحلي وليس بالضرورة GitHub Sync داخل التطبيق، لأن التطبيق يستخدم GitHub REST API وtoken من ENV.

---

## 15. جميع الـ APIs

### Auth

#### `POST /api/auth/admin/login`

Purpose: تسجيل دخول الأدمن.  
Input: `FormData(username,password,next?)`.  
Validation:

- origin/referer trusted.
- max 7 محاولات لكل IP+username خلال 10 دقائق.
- username من `ADMIN_USERNAME | ADMIN_USER | ADMIN_EMAIL`.
- password من `ADMIN_PASSWORD | ADMIN_PASS` أو hash.

Response:

- Redirect إلى `next` أو `/admin`.
- Set cookie `bd_admin_session`.
- عند الفشل redirect إلى `/admin/login?error=1`.

#### `POST /api/auth/admin/logout`

Purpose: خروج الأدمن.  
Response: يمسح `bd_admin_session`.

#### `POST /api/auth/client/login`

Purpose: دخول العميل للوحة دعوته.  
Input: `FormData(code, username, password)`.  
Response:

- نجاح: redirect إلى `/{code}/ad_3399` مع cookie `bd_client_session`.
- فشل: redirect إلى `/{code}/ad_3399/login?error=1`.

#### `POST /api/auth/client/logout`

Purpose: خروج العميل.  
Response: يمسح `bd_client_session`.

### Public Orders

#### `POST /api/orders`

Purpose: إنشاء طلب دعوة من الموقع العام.  
Input JSON مطابق لـ `orderRequestSchema`:

- `groomName`, `brideName`, `phone?`
- `weddingDate`, `venue?`, `mapUrl?`, `notes?`
- `orderImages`: array max 3
- `photographerEnabled`, `photographerName`, `photographerFacebookUrl`, `photographerInstagramUrl`
- `musicEnabled`, `musicChoice`, `musicUrl`, `orderMusic`
- `idempotencyKey`
- `templateSlug`
- `language`

Protection:

- Rate limit.
- content-length <= 36MB.

Response:

```json
{
  "ok": true,
  "orderId": "...",
  "orderNumber": "...",
  "imageUrls": [],
  "musicUrl": "...",
  "whatsappUrl": "..."
}
```

Errors: 400 validation/music/template, 413 payload too large, 429 rate limited.

#### `POST /api/orders/preview-images`

Purpose: حفظ صور preview قبل إرسال الطلب.  
Input: صور/data URLs.  
Output: روابط uploads.

#### `POST /api/orders/preview-music`

Purpose: حفظ موسيقى preview للطلب.  
Output: رابط `/uploads/music/...`.

### Public Invitation

#### `POST /api/invitations/[code]/rsvp`

Purpose: تسجيل حضور/اعتذار.  
Input:

```json
{
  "name": "...",
  "phone": "...",
  "attendees": 1,
  "status": "confirmed|declined",
  "note": "..."
}
```

Response:

- `{ "ok": true }`
- 400 عند validation.
- 404 عند دعوة غير موجودة أو غير نشطة.

#### `GET /api/invitations/[code]/export/[format]`

Purpose: تصدير بيانات الدعوة.  
Formats من اسم المسار؛ الكود يستخدم `pdfkit` و`xlsx` في المشروع. راجع الملف للتفاصيل الدقيقة عند إضافة format جديد.

### Client Invitation

#### `POST /api/client/invitations/[code]`

Purpose: تحديث دعوة العميل.  
Auth: cookie `bd_client_session` مطابق للكود.  
Input:

- JSON للتحديث الحي.
- أو FormData للتحديث التقليدي.

Response:

- JSON: `{ ok: true, updated: boolean }`.
- Form: redirect إلى `/{code}/ad_3399?saved=1`.

### Admin Invitations

#### `POST /api/admin/invitations`

Purpose: إنشاء دعوة عميل من الأدمن.  
Auth: admin cookie.  
Input: FormData.  
Response: redirect إلى `/admin/client-invitations?created={code}`.

#### `POST /api/admin/invitations/[code]`

Purpose: pause/resume/delete دعوة.  
Input FormData:

- `action=pause|resume|delete`

Response: redirect إلى `/admin/client-invitations?status=...`.

### Admin Orders

#### `POST /api/admin/orders/[id]`

Purpose: إدارة طلب.  
Auth: admin cookie.  
يدعم JSON أو FormData.

Actions:

- `review`
- `update`
- `publish`
- `reject`
- `delete`

Response JSON:

- update/review/reject: `{ ok: true, order }`
- publish: `{ ok: true, code, publicUrl, adminUrl, order }`
- delete: `{ ok: true, deleted: true }`

Form redirects إلى `/admin/orders?status=...`.

#### `GET /api/admin/orders/count`

Purpose: عدد الطلبات للأدمن.  
Auth: admin.  
Response: JSON بعدد الطلبات/المفتوحة حسب الكود.

### Admin Templates

#### `POST /api/admin/templates/import`

Purpose: إنشاء قالب HTML مخصص.  
Input FormData:

- `name`
- `slug`
- `category`
- `concept`
- `musicUrl`
- `html`

Response: redirect إلى `/admin/templates?imported={slug}` أو `imported=0`.

#### `POST /api/admin/templates/music`

Purpose: تحديث إعدادات قالب، موسيقى، ألوان، صور، مصور.  
Input FormData.  
Response: redirect إلى `/admin/templates?saved=...`.

### Admin Music

#### `POST /api/admin/music`

Purpose: إدارة مكتبة الموسيقى.  
Actions:

- `save`
- `enable`
- `disable`
- `delete`
- `clear`

Input:

- `slotId`
- `trackName`
- `audioFile`
- `audioUrl`
- `trackEnabled`

Response: redirect إلى `/admin/music?saved=...&count=...` أو error.

### Admin Backups

#### `GET /api/admin/backups`

Purpose: list backups.  
Response: JSON summaries.

#### `POST /api/admin/backups`

Purpose: إنشاء نسخة يدوية.  
Response: redirect إلى `/admin/backups?created=...`.

#### `GET /api/admin/backups/[fileName]`

Purpose: تنزيل backup JSON.  
Safety: يتحقق من اسم الملف.

#### `POST /api/admin/recent-edits/restore`

Purpose: استعادة backup.  
Input:

- `fileName`
- `confirmFileName`
- `returnTo`

Response: redirect مع restored/before أو error.

### Admin GitHub Sync

#### `GET /api/admin/sync-status`

Purpose: حالة sync/readiness.  
Response: JSON.

#### `POST /api/admin/sync-status`

Purpose: مزامنة يدوية من الأدمن.  
Response:

- Form: redirect.
- JSON: نتيجة sync.

#### `GET /api/admin/sync/status`

Purpose: API جديد/موازٍ لحالة sync.  
Response: JSON status/readiness.

#### `GET /api/admin/sync/history`

Purpose: سجل sync.  
Query:

- `limit`
- `offset`
- `status`
- `reason`

Response: `{ logs, total }`.

#### `POST /api/admin/sync/retry`

Purpose: إعادة محاولة sync فاشل/معلق.

### Admin Preview/Broadcast/Notifications

#### `POST /api/admin/preview`

Purpose: حفظ إعدادات معاينة/محتوى الرئيسية.

#### `PATCH /api/admin/broadcast`

Purpose: تحديث حقل/عنصر broadcast.

#### `POST /api/admin/broadcast`

Purpose: إنشاء/حفظ broadcast data.

#### `POST /api/admin/notifications/send`

Purpose: إرسال Push notification من الأدمن.

### Push APIs

#### `POST /api/push/subscribe`

Purpose: تسجيل subscription.

#### `GET /api/push/latest`

Purpose: جلب آخر إشعار.

### Uploads

#### `GET /uploads/[...path]`

Purpose: خدمة ملفات uploads.  
Features:

- path safety.
- range requests.
- streaming.
- content type.

---

## 16. الصلاحيات

### Admin

يمكنه:

- دخول `/admin`.
- إنشاء دعوة.
- إدارة الطلبات.
- نشر الطلب كدعوة.
- رفض/حذف/تعديل الطلبات.
- إيقاف/تشغيل/حذف الدعوات.
- إدارة القوالب.
- إنشاء قوالب HTML مخصصة.
- إدارة الموسيقى العامة.
- عرض العملاء.
- عرض التحليلات.
- إنشاء وتحميل واستعادة backups.
- تشغيل ومتابعة GitHub Sync.
- إرسال إشعارات.

### Client

يمكنه:

- دخول لوحة دعوة واحدة فقط.
- تعديل بيانات الدعوة.
- رفع صور.
- رفع/تغيير موسيقى.
- تعديل النصوص والمصور.

لا يمكنه:

- إدارة دعوات أخرى.
- حذف الدعوة.
- تعديل القوالب العامة.
- رؤية لوحة الأدمن.

### Guest

يمكنه:

- فتح الدعوة العامة.
- مشاركة الدعوة.
- رؤية الصور والخريطة والQR.
- إرسال RSVP.

لا يحتاج تسجيل دخول.

---

## 17. المتغيرات البيئية

### قاعدة البيانات

- `DATABASE_URL`: الأساسي لـ Prisma.
- `POSTGRES_PRISMA_URL`: fallback.
- `POSTGRES_URL`: fallback.
- `DATABASE_PRIVATE_URL`: fallback Railway.
- `DATABASE_PUBLIC_URL`: fallback Railway.
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: fallback لبناء URL.

الإجباري للإنتاج الحقيقي: أحد روابط DB أو PG variables. إذا غابت، يعمل المشروع على file store جزئياً.

### الموقع

- `NEXT_PUBLIC_SITE_URL`: رابط الموقع العام. يستخدم للروابط المطلقة وWhatsApp والـ redirects.
- `WHATSAPP_ORDER_PHONE`: رقم واتساب لاستقبال الطلبات.
- `SHOW_PHOTOGRAPHER_CARD`: إظهار/إخفاء كارت المصور.

### Auth

- `ADMIN_USERNAME`, `ADMIN_USER`, `ADMIN_EMAIL`: أسماء دخول الأدمن.
- `ADMIN_PASSWORD`, `ADMIN_PASS`: كلمة مرور الأدمن.
- `ADMIN_PASSWORD_HASH`, `ADMIN_PASS_HASH`: hash بديل لكلمة مرور الأدمن.
- `ADMIN_SESSION_SECRET`, `JWT_SECRET`, `AUTH_SECRET`: أسرار توقيع جلسة الأدمن.
- `CLIENT_SESSION_SECRET`, `AUTH_SECRET`: أسرار توقيع جلسة العميل.
- `CLIENT_ADMIN_USERNAME`, `CLIENT_ADMIN_PASSWORD`: دخول عام اختياري للعميل.

الإجباري للإنتاج:

- admin username.
- admin password أو hash.
- secret قوي لجلسة الأدمن.
- secret قوي لجلسة العميل.

### Push Notifications

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `ADMIN_EMAIL` يستخدم كfallback للsubject.

اختيارية إذا لا يتم استخدام push.

### GitHub Sync

- `GITHUB_SYNC_ENABLED`: `false` يعطل.
- `GITHUB_SYNC_REPO`: مثل `badrabdoph-cell/BadrDaawa`.
- `BACKUP_GITHUB_REPO`: fallback repo.
- `GITHUB_SYNC_BRANCH`: default `main`.
- `RAILWAY_GIT_BRANCH`: fallback branch.
- `GITHUB_SYNC_TOKEN`: token أساسي.
- `BACKUP_GITHUB_TOKEN`, `GITHUB_TOKEN`, `GH_TOKEN`: fallbacks.

### Runtime

- `NODE_ENV`: يؤثر على secure cookies وdev defaults.

### متغيرات مذكورة في `.env.example` لكنها قد تكون اختيارية

- `BACKUP_GITHUB_REPO` و`BACKUP_GITHUB_TOKEN`: تستخدم كfallback في sync.
- `CLIENT_ADMIN_USERNAME` و`CLIENT_ADMIN_PASSWORD`: bypass عام للعملاء إذا تم ضبطهما.

---

## 18. تدفق البيانات

### طلب دعوة من الموقع

```text
OrderForm
  ↓ JSON إلى POST /api/orders
orderRequestSchema
  ↓
saveOrderPreviewImages + resolveOrderMusic
  ↓
Prisma OrderRequest أو createFileOrder
  ↓
WhatsApp URL response
  ↓
queueGitHubSync(createSnapshot=true)
```

### نشر طلب كدعوة

```text
AdminOrderRequestsManager
  ↓ POST /api/admin/orders/[id] action=publish
validate/clean payload
  ↓
WeddingTemplate upsert
  ↓
Customer create/upsert
  ↓
Invitation create
  ↓
OrderRequest status=PUBLISHED + publishedInvitationCode
  ↓
revalidate paths
  ↓
queueGitHubSync
```

### عرض الدعوة

```text
GET /[code]
  ↓
getInvitationByCode
  ↓
Prisma Invitation أو file store أو demo
  ↓
recordInvitationView
  ↓
getTemplateWithSettings
  ↓
InvitationExperience
  ↓
InviteMusic + InvitePoll + InviteMap + QR
```

### RSVP

```text
InvitePoll/RsvpForm
  ↓ POST /api/invitations/[code]/rsvp
rsvpSchema
  ↓
Invitation lookup + active check
  ↓
GuestRsvp create أو addFileGuest
  ↓
revalidate admin analytics/client panel
  ↓
queueGitHubSync
```

### تعديل العميل للدعوة

```text
ClientInvitationEditor
  ↓ POST /api/client/invitations/[code]
verify bd_client_session
  ↓
saveInvitationGalleryImages / saveAudioDataUrl / saveUploadedAudioFile
  ↓
Prisma Invitation update أو updateFileInvitation
  ↓
revalidate /[code] و /[code]/ad_3399
  ↓
queueGitHubSync
```

### Backup + GitHub Sync

```text
Admin action أو queue
  ↓
createBackupSnapshot
  ↓
data/backups/*.json
  ↓
collect data + public/uploads files
  ↓
GitHub blobs/tree/commit/ref update
  ↓
SyncLog update
```

---

## 19. المشاكل الحالية والديون التقنية

هذه النقاط مستخرجة من قراءة الكود والحالة الحالية:

1. المشروع يعتمد على ملف CSS ضخم جداً `app/globals.css`، ما يجعل الصيانة طويلة المدى أصعب.
2. منطق الجلسات في `admin-session.ts` و`client-session.ts` متكرر بنسبة كبيرة ويمكن توحيده في helper عام.
3. يوجد fallback file store قوي، لكنه قد يسبب اختلافات سلوكية عن DB، مثل ترتيب وتطبيع بعض الحقول.
4. الاستعادة من backup لا تعيد PostgreSQL فعلياً، رغم أن backup قد يحتوي `database` dump مختصر.
5. `GuestRsvp.ipHash` و`userAgent` موجودان في schema لكن لا يتم ملؤهما حالياً.
6. حذف/استبدال الصور لا يبدو أنه ينظف كل الصور القديمة من `public/uploads`، بخلاف الموسيقى التي لها delete helper.
7. `AdminUser` موجود في Prisma لكن تسجيل دخول الأدمن الحالي يعتمد على ENV، لذلك النموذج غير مستخدم بوضوح.
8. بعض APIs متشعبة وتدعم JSON وFormData في نفس route، خصوصاً `admin/orders/[id]` و`client/invitations/[code]`، ما يزيد تعقيد الاختبار.
9. لا توجد tests واضحة في `package.json` غير `tsc --noEmit`.
10. بعض الوظائف مثل Web Push تحتاج توثيق/اختبار أعمق إذا ستستخدم إنتاجياً.
11. GitHub Sync يعتمد على token من ENV؛ الخطأ الحالي المحلي في `git push` لا يمنع API sync لكنه يشير أن git CLI المحلي غير مهيأ.
12. بعض صفحات الإدارة legacy أو متداخلة وظيفياً مثل `/admin/invitations`, `/admin/client-invitations`, `/admin/new-invitation`.
13. القوالب الثابتة كثيرة داخل ملف واحد كبير `InvitationExperience.tsx`، ما يصعب عزل كل قالب واختباره.
14. custom HTML templates تعتمد على iframe وbindings، ويجب اختبارها أمنياً عند السماح لأدمن بلصق HTML.
15. لا يوجد نظام centralized audit log لكل تعديل، باستثناء SyncLog/Backup وبعض recent edits.

---

## 20. ملخص المشروع الكامل

BadrDaawa منصة دعوات زفاف رقمية مبنية بـ Next.js وReact وPrisma/PostgreSQL. الكيان المركزي هو `Invitation`، ويحيط به `Customer`, `WeddingTemplate`, `GuestRsvp`, `OrderRequest`, `AnalyticsEvent`, `BackupJob`, و`SyncLog`.

النظام له ثلاث واجهات:

1. واجهة عامة للزوار: الرئيسية، القوالب، الطلب، الدعوة العامة، RSVP.
2. لوحة العميل: تعديل دعوة واحدة محمية بجلسة مرتبطة بكود الدعوة.
3. لوحة الأدمن: مركز إدارة شامل للطلبات والدعوات والقوالب والموسيقى والعملاء والتحليلات والنسخ والمزامنة.

التخزين الأساسي PostgreSQL عبر Prisma، لكن المشروع مصمم ليستمر في العمل جزئياً بدون DB من خلال `data/runtime-store.json`. هذا مهم جداً في فهم أي bug: أغلب عمليات القراءة/الكتابة لديها مسارين، DB أولاً ثم file fallback.

القوالب ثابتة في `lib/templates.ts` وتعرض عبر `InvitationExperience.tsx`. يمكن تعديل إعدادات القوالب في `data/template-settings.json`، ويمكن إنشاء قوالب HTML مخصصة تحفظ في `data/custom-templates.json`.

الصور تحفظ داخل `public/uploads` بعد تحقق وتحويل للصيغ القابلة للعرض، والموسيقى تحفظ في `public/uploads/music` أو تستخدم روابط صوت مباشرة. ملفات YouTube مرفوضة كمصدر موسيقى لأنها ليست ملفات صوت مباشرة.

GitHub Sync ليس git CLI؛ هو GitHub REST API يقرأ `data/` و`public/uploads/` ويصنع blobs/tree/commit ثم يحدث branch ref. أي تغيير إداري مهم يستدعي `queueGitHubSync` غالباً مع backup snapshot.

لأي مطور جديد يبدأ العمل:

1. اقرأ `prisma/schema.prisma`.
2. اقرأ `lib/types.ts`.
3. افهم `lib/admin-data.ts`, `lib/invitation-data.ts`, `lib/file-store.ts`.
4. افهم `app/api/orders/route.ts` و`app/api/admin/orders/[id]/route.ts`.
5. افهم `components/InvitationExperience.tsx`.
6. افهم `lib/github-sync.ts` و`lib/backups.ts`.
7. شغّل:

```bash
pnpm install
pnpm run db:generate
pnpm run check
pnpm run build
pnpm run dev
```

8. اضبط `.env` بناءً على `.env.example`.

هذه الوثيقة يجب أن تكون نقطة البداية لأي مطور أو نموذج ذكاء اصطناعي آخر يريد فهم المنصة والعمل عليها بدون قراءة كل ملف من الصفر.
