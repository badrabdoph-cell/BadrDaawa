# توثيق هندسي شامل لمشروع BadrDaawa

تاريخ الفحص: 2026-06-09  
مسار المشروع: `/Users/mac/Documents/GitHub/BadrDaawa`  
حالة Git عند الفحص: `main...origin/main` بدون تغييرات غير ملتزم بها.  
الفحص الآلي: نجح `./node_modules/.bin/tsc --noEmit`. تعذر تشغيل `pnpm check` لأن `pnpm` غير موجود في PATH، لكن السكربت نفسه يساوي `tsc --noEmit`.

## 1. نظرة عامة على المشروع

`BadrDaawa` منصة Next.js عربية لإدارة دعوات الزفاف الرقمية الفاخرة. المشروع يخدم ثلاثة مسارات رئيسية:

- زائر عام يستعرض القوالب ويطلب دعوة من صفحة `/order`.
- مدير يدير الطلبات والدعوات والقوالب والموسيقى والتحليلات والنسخ الاحتياطي من `/admin`.
- عميل يحرر دعوته المنشورة من `/:code/ad_3399` أو من رابط إدارة مؤقت `/manage/invitation/:token`.

الفكرة الأساسية هي تحويل طلب دعوة زفاف إلى تجربة رقمية منشورة تحتوي صوراً، موسيقى، خريطة، RSVP، QR، تقويم، سجل رسائل، تسجيل وصول، ووضع مباشر للحفل. المشروع يحل مشكلة إنشاء دعوات مخصصة بسرعة مع إدارة مركزية للطلبات والتعديلات ومزامنة بيانات التشغيل إلى GitHub ونسخ احتياطية.

دورة العمل الأساسية:

1. الزائر يختار قالباً من `/templates` أو يصل إلى `/order?template=...`.
2. نموذج `OrderForm` يضغط/يرفع الصور مبدئياً، يرفع أو يستخرج الموسيقى، ثم يرسل الطلب إلى `POST /api/orders`.
3. الطلب يخزن في PostgreSQL عبر Prisma أو في `data/runtime-store.json` عند غياب قاعدة البيانات.
4. الأدمن يفتح `/admin/orders`، يراجع الطلب، يعدل الحقول، ثم ينشره عبر `POST /api/admin/orders/[id]`.
5. النشر ينشئ `Customer` و`Invitation`، ويولد كود دعوة ورابط إدارة عميل.
6. الدعوة العامة تظهر في `/:code` أو `/:customSlug`.
7. العميل يدخل من `/:code/ad_3399/login` أو رابط token ويعدل الدعوة عبر `POST /api/client/invitations/[code]`.
8. الضيوف يسجلون RSVP وCheck-in ورسائل سجل الضيوف، وتظهر التحليلات في الإدارة والعميل.

## 2. نطاق الفحص وهيكل المشروع

تم فحص ملفات المصدر والتشغيل المرتبطة بالمشروع، مع استبعاد `node_modules` و`.next` و`.git` و`tsconfig.tsbuildinfo` و`.DS_Store` لأنها مولدة أو خارجية. الفهرس المصدر غير المستبعد يحتوي 374 ملفاً، منها 390 ملفاً متتبعاً في Git عند الفحص. يوجد ملف أرشيف `homepage-related-files.zip` متتبع يحتوي 70 ملفاً كحزمة/نسخة من ملفات الصفحة الرئيسية والقوالب والأصول.

توزيع الملفات غير المستبعدة:

- `app`: 122 ملفاً، صفحات App Router وAPI routes وCSS العام.
- `lib`: 78 ملفاً، الخدمات والمخازن والـ helpers.
- `components`: 62 ملفاً، واجهات عامة وأدمن وعميل وتجربة الدعوة.
- `public`: 54 ملفاً، أصول صور/SVG/صوت/خط وملفات مرفوعة.
- `data`: 40 ملفاً، JSON runtime ونسخ احتياطية.
- `prisma`: 13 ملفاً، schema وmigrations.
- `scripts`: 4 ملفات تشغيلية.

الملفات الجذرية:

- `package.json`: يعرف Next 15، React 19، Prisma، sharp، pdfkit، xlsx، zod، qrcode، heic-convert، وسكربتات التشغيل.
- `next.config.ts`: يضبط `serverExternalPackages` لحزم media/PDF ويقيد صيغ الصور ويستعمل `optimizePackageImports` لـ `lucide-react`.
- `tsconfig.json`: TypeScript strict مع alias `@/*`.
- `middleware.ts`: حماية `/admin/*` و`/:code/ad_3399/*`.
- `.env.example`: قائمة متغيرات قاعدة البيانات، الجلسات، GitHub Sync، VAPID، واتساب، التخزين، إعدادات المصور.
- `.github/workflows/postgres-backups.yml`: نسخ PostgreSQL كل ساعة ويومياً عبر `scripts/backup.mjs`.
- `README.md`, `AI_DESIGN_CONTEXT.md`, `FINAL_REPORT.md`, `PROJECT_DOCUMENTATION_AR.md`: توثيقات سابقة/مساعدة. الملف الحالي هو توثيق جديد مبني على الكود الحالي.

## 3. التقنيات المستخدمة

- Framework: Next.js App Router 15.5.x.
- UI runtime: React 19.
- ORM: Prisma 5 مع PostgreSQL.
- تخزين احتياطي: JSON داخل `data/*.json` عند غياب Prisma أو عند فشل بعض عمليات DB.
- تخزين ملفات: `lib/storage-provider.ts` يدعم local فعلياً، ويحتوي واجهات S3/R2 لكنها غير مفعلة بدون إعدادات provider.
- معالجة الصور: browser canvas في `lib/browser-image-upload.ts`، و`sharp`/`heic-convert` في الخادم عبر `lib/display-images.ts`.
- PDF/Excel: `pdfkit` و`xlsx` لتصدير RSVP والتحليلات والحضور.
- QR: `qrcode` في `InvitationQrTools` و`QrCodeBlock`.
- Push: Web Push يدوي باستخدام VAPID وraw SQL لجداول `push_subscriptions` و`push_notifications`.
- GitHub Sync: GitHub REST API عبر `lib/github-sync.ts` لمزامنة `data` و`public/uploads`.
- جدولة مهام: in-process scheduler في `lib/task-scheduler.ts`.

## 4. قاعدة البيانات

المصدر: `prisma/schema.prisma` مع migrations من `20260607193000_init` إلى `20260609043000_invitation_manage_tokens`.

Enums:

- `InvitationStatus`: `DRAFT`, `ACTIVE`, `PAUSED`, `ARCHIVED`.
- `OrderStatus`: `NEW`, `REVIEWING`, `EDITED`, `PUBLISHED`, مع قيم legacy `ACCEPTED`, `REJECTED`, `CONVERTED`.
- `RsvpStatus`: `CONFIRMED`, `DECLINED`.
- `BackupStatus`: `QUEUED`, `RUNNING`, `SUCCESS`, `FAILED`.

Models:

- `AdminUser`: مستخدم إدارة داخلي، حقوله `id,email,name,passwordHash,role,createdAt,updatedAt`. البريد unique.
- `Customer`: عميل له `username` unique و`passwordHash` و`isActive/deletedAt` وعلاقات `invitations/orders`. فهارس على `phone`, `deletedAt`, `createdAt`.
- `WeddingTemplate`: نسخة DB من القالب، `slug` unique، بيانات الاسم والتصنيف والأسلوب والـ palette و`previewUrl` و`enabled/sortOrder`. علاقاته مع الدعوات والطلبات.
- `Invitation`: الدعوة المنشورة/المسودة. أهم الحقول `code` unique، `customSlug` unique اختياري، `status`, `language`, أسماء العروسين، التاريخ، الوقت، المكان، `gallery`, `musicUrl/musicEnabled`, `manageToken`, `texts`, `photographer`, `viewCount`, soft delete. يرتبط بـ `Customer` cascade وبـ `WeddingTemplate`.
- `GuestRsvp`: رد الضيف، يرتبط بالدعوة cascade، ويخزن الاسم والهاتف والعدد والحالة والملاحظة و`ipHash/userAgent`.
- `OrderRequest`: طلب قبل النشر، مع `orderNumber/dedupeKey` unique، بيانات الفرح، صور، موسيقى، نصوص، مصور، `publishedInvitationCode`, status, علاقات اختيارية بـ template/customer، وsoft delete.
- `AnalyticsEvent`: حدث تحليلي مرتبط بالدعوة cascade، `eventType`, `metadata`, `ipHash`.
- `DynamicPage`: صفحات ديناميكية عامة، `slug` unique، `title/description/content/coverImageUrl/isPublished`.
- `BackupJob`: سجل نسخ احتياطي.
- `SyncLog`: سجل GitHub Sync مع status، عدد الملفات، commit، خطأ، retry.

ERD نصي:

```text
Customer 1 ── * Invitation * ── 1 WeddingTemplate
Customer 1 ── * OrderRequest * ── 0..1 WeddingTemplate
Invitation 1 ── * GuestRsvp
Invitation 1 ── * AnalyticsEvent
DynamicPage مستقل
BackupJob مستقل
SyncLog مستقل
AdminUser مستقل
```

## 5. المصادقة والصلاحيات

Admin:

- ملفات: `lib/admin-session.ts`, `lib/auth-config.ts`, `app/api/auth/admin/login/route.ts`, `middleware.ts`.
- Cookie: `bd_admin_session`, HMAC SHA-256، payload `{sub,iat,exp,nonce}`، max age 12 ساعة.
- تسجيل الدخول يراجع origin/referer، يطبق rate limit in-memory 7 محاولات/10 دقائق لكل IP+username، ويدعم كلمة مرور raw أو hash `scrypt`/`sha256`.
- Middleware يحمي `/admin/*` باستثناء `/admin/login`.

Client:

- ملفات: `lib/client-session.ts`, `app/api/auth/client/login/route.ts`, `app/manage/invitation/[token]/route.ts`.
- Cookie: `bd_client_session`, HMAC، payload `{code,iat,exp,nonce}`، max age 12 ساعة.
- الدخول يقبل بيانات env العامة `CLIENT_ADMIN_USERNAME/PASSWORD` أو بيانات العميل المرتبطة بالدعوة في DB/file store.
- Middleware يحمي `/:code/ad_3399` باستثناء login.
- token الإدارة المؤقتة يمر عبر `resolveInvitationManageToken` ثم يضع cookie للعميل.

صلاحيات API:

- كل `app/api/admin/*` تقريباً يتحقق من `verifyAdminSessionCookie`.
- `app/api/client/*` يتحقق من `verifyClientSessionCookie`.
- APIs العامة: الطلب، RSVP، guest book، check-in، calendar/export، push subscribe، error tracking، uploads.
- uploads العامة تقرأ من مجلدات محددة فقط داخل `runtimeUploadSubdirs` مع منع segments غير آمنة.

## 6. الصفحات العامة

- `/`: `app/page.tsx`. يعرض الهيرو، إحصاءات المنصة، معاينة حية template/image/video، المزايا والتسعير حسب `home-content`, `site-settings`, `home-preview-settings`.
- `/templates`: `app/templates/page.tsx`. يعرض القوالب العامة عبر `TemplateBrowser`.
- `/templates/[slug]/preview`: معاينة قالب، يدعم query parameters و`builderPreview/silentPreview/embed`.
- `/order`: نموذج الطلب العام `OrderForm` مع قوالب عامة ومسودة من query/sessionStorage.
- `/:code`: `app/[code]/page.tsx`. أولاً يبحث DynamicPage بالـ slug، ثم دعوة بالكود أو customSlug. يسجل view إلا في silent preview.
- `/client`: صفحة Login تسويقية/قديمة وليست نموذج login الحقيقي.
- `/client/[code]`: redirect legacy إلى `/:code/ad_3399`.
- `/client-invitations`: قائمة عامة بالدعوات النشطة التي يديرها الأدمن.
- `/pricing`, `/contact`, `/faq`: صفحات عامة، بعضها يستبدل المحتوى بـ DynamicPage إن وجد.
- `/privacy-policy`, `/terms`, `/refund-policy`, `/usage-policy`: صفحات قانونية عبر `LegalPageView`.
- `/manage/invitation/invalid`: صفحة خطأ token.

## 7. لوحة الإدارة

كل صفحات `/admin` ضمن `app/admin/layout.tsx` وتستخدم `DashboardShell` عند وجود session.

- `/admin`: Dashboard يجمع الدعوات والطلبات والضيوف والنسخ والـ music/check-ins/guest-book وSyncStatus.
- `/admin/login`: نموذج LoginPanel.
- `/admin/orders`: `AdminOrderRequestsManager` لإدارة الطلبات وتحويلها لدعوات.
- `/admin/invitations`: قائمة الدعوات مع completeness وروابط الإدارة وnotes/favorites وإجراءات pause/resume/archive/delete/custom slug.
- `/admin/new-invitation`: Wizard إنشاء دعوة مباشرة.
- `/admin/templates`: إدارة إعدادات القوالب واستيراد HTML مخصص ومعاينات.
- `/admin/music`: إدارة مكتبة الموسيقى والملف الافتراضي وموسيقى معاينة القوالب.
- `/admin/analytics`: تقارير views/sources/conversion.
- `/admin/attendance`: جدول RSVP مع فلاتر وتصدير.
- `/admin/customers`: العملاء مع notes/favorites.
- `/admin/backups`: عرض وإنشاء backups.
- `/admin/sync-history`, `/admin/sync-settings`: سجلات GitHub Sync وحالة الإعدادات.
- `/admin/system-health`: فحوص DB/storage/sync/backups/push.
- `/admin/tasks`: المهام المجدولة.
- `/admin/media`: تقرير وسائط مستخدمة/غير مستخدمة وحذف/استبدال.
- `/admin/pages`: Dynamic pages CRUD.
- `/admin/legal`: تحرير الصفحات القانونية.
- `/admin/guest-book`: moderation ورسائل الضيوف وإعداداتها.
- `/admin/check-ins`, `/admin/live-mode`: حضور فعلي ووضع مباشر.
- `/admin/messages`: رسائل من الإدارة للعميل.
- `/admin/message-templates`, `/admin/content-presets`: قوالب رسائل ونصوص جاهزة.
- `/admin/notifications`: مركز تنبيهات إداري.
- `/admin/errors`, `/admin/audit-log`, `/admin/recent-edits`, `/admin/trash`, `/admin/search`, `/admin/favorites`, `/admin/preview`, `/admin/broadcast`, `/admin/settings`: إدارة تشغيلية ومحتوى.

## 8. لوحة العميل

المسار الحقيقي: `/:code/ad_3399`.

- Login: `/:code/ad_3399/login` يستخدم `LoginPanel` ويرسل إلى `/api/auth/client/login`.
- الصفحة المحمية تجمع الدعوة، القالب، RSVP، رسائل العميل، guest book، live mode، تحليلات العميل، مكتبة الموسيقى، presets.
- المحرر: `ClientInvitationEditor`.
- التعديل عبر `POST /api/client/invitations/[code]` يدعم JSON live editor وFormData legacy.
- الصور ترفع عبر `/api/orders/preview-images` ثم تحفظ في الدعوة عبر client API.
- الموسيقى ترفع أو تستخرج من فيديو عبر `/api/orders/preview-music` و`/api/orders/extract-video-audio`.
- الحماية: session cookie مرتبط بنفس code فقط، وmiddleware يمنع الدخول للوحة غير مصرح بها.

## 9. نظام الدعوات

مصادر إنشاء الدعوة:

- من طلب: `POST /api/admin/orders/[id]` action `publish`.
- مباشرة من الأدمن: `POST /api/admin/invitation-builder` أو legacy `POST /api/admin/invitations`.
- fallback file store: `createFileInvitation` في `lib/file-store.ts`.

دورة الحياة:

```text
DRAFT -> ACTIVE -> PAUSED -> ACTIVE
ACTIVE/PAUSED -> ARCHIVED
أي حالة -> soft delete عبر deletedAt
ARCHIVED/soft delete -> restore من trash لبعض الحالات
```

الروابط:

- public: `/{customSlug || code}`.
- client admin: `/{code}/ad_3399`.
- manage token: `/manage/invitation/{token}` يضع session ثم يعيد التوجيه.
- custom slug يمنع الكلمات المحجوزة ويفحص DB/file store.

الأرشفة:

- `archiveExpiredInvitations` تؤرشف الدعوات بعد يومين من تاريخ الزفاف، وتستدعى في قراءة بيانات الإدارة والعامة.

## 10. نظام القوالب

القوالب الثابتة في `lib/templates.ts`: 22 قالباً، كلها `enabled: true` وقت الفحص. الإعدادات القابلة للتعديل في `data/template-settings.json` عبر `lib/template-settings.ts`. القوالب المخصصة في `data/custom-templates.json` عبر `lib/custom-templates.ts`، وتعرض داخل iframe بـ `srcDoc` مع bridge `window.BADR_INVITE`.

القوالب:

| slug | الاسم العربي | style | التصنيف |
| --- | --- | --- | --- |
| `featured-1` | مميز 1 | featured | كوكتيل مميز |
| `cinematic-rose` | سينمائي وردي | cinematic | قالب سينمائي رومانسي |
| `modern-cinematic` | سينمائي حديث | cinematic | قالب فيلم حديث |
| `ethereal-glass` | زجاجي حالم | glass | قالب زجاجي رومانسي |
| `botanical-theme` | نباتي هادئ | garden | قالب نباتي هادئ |
| `royal-gold` | ملكي ذهبي | royal | قالب ملكي أسود ذهبي |
| `boho-sand` | بوهو رملي | boho | قالب بوهو دافئ |
| `pure-white` | أبيض نقي | minimal | قالب مينيمال أبيض |
| `neon-theme` | نيون مودرن | neon | قالب نيون عصري |
| `vintage-theme` | فينتاج كلاسيك | vintage | قالب فينتاج ورقي |
| `fairytale-theme` | حكاية وردية | ivory | قالب رومانسي حالم |
| `ocean-theme` | أوشن أزرق | ocean | قالب أزرق منعش |
| `art-deco-theme` | آرت ديكو ذهبي | artdeco | قالب أسود وذهبي فاخر |
| `magazine-theme` | غلاف مجلة | magazine | قالب Editorial جرئ |
| `royal-envelope` | كلاسيك ملكي | royal | قالب ملكي فاتح |
| `luxe-noir` | فخم داكن | noir | قالب فاخر داكن |
| `ivory-arches` | رومانسي ناعم | ivory | قالب رومانسي كريمي |
| `mobile-gold` | ذهبي عصري | mobile | باقة موبايل ذهبية |
| `soft-gold` | ذهبي بسيط | mobile | قالب ذهبي ناعم |
| `boho-chic` | بوهو ترندي | boho | قالب Boho Sage |
| `garden-elegance` | حدائق أنيقة | garden | قالب حديقة أنيق |
| `cinematic-story` | سينمائي فاخر | cinematic | قالب سينمائي داكن |

الربط بالبيانات يتم في `InvitationExperience`: يحدد الصور، النصوص، الموسيقى، المصور، الخريطة، RSVP، QR، guest book، check-in، live mode، ثم ينتقل إلى مكوّن القالب حسب slug.

## 11. نظام الطلبات

`OrderForm` يلتقط بيانات العروسين والتاريخ والمكان والقالب والصور والموسيقى والمصور. قبل الإرسال:

- الصور تضغط في المتصفح إلى WebP/JPEG بحد أقصى 1800px، أو ترفع أصلية حتى 32MB.
- الموسيقى ترفع MP3 أو تستخرج من فيديو أو تقبل رابط صوت مباشر.
- draft يحفظ في `sessionStorage` وفي query string.
- request idempotency key يولد من المتصفح.

`POST /api/orders`:

- rate limit: `API_GENERAL`.
- max body: 36MB.
- Zod: `orderRequestSchema`.
- يحفظ الصور إلى `order-requests`.
- ينشئ `orderNumber` و`dedupeKey`.
- يخزن الطلب في DB أو file store.
- يرجع WhatsApp URL يحتوي ملخص الطلب والروابط.

حالات الطلب في التطبيق: `new`, `reviewing`, `edited`, `published`, `rejected`، مع mapping legacy `accepted -> reviewing`, `converted -> published`.

## 12. نظام RSVP

المكونات:

- `InvitePoll`: نموذج مختصر داخل الدعوة.
- `RsvpForm`: نموذج كامل بديل.
- `GuestTable`: عرض إداري/عميل.

API: `POST /api/invitations/[code]/rsvp`.

- يتحقق من وجود الدعوة وكونها active.
- يتحقق بـ `rsvpSchema`: name, phone, attendees, status, note.
- يخزن في `GuestRsvp` أو `data/runtime-store.json`.
- يعيد revalidate للدعوة ولوحة الإدارة.
- يطلق GitHub Sync snapshot.

التصدير:

- `/api/invitations/[code]/export/excel`
- `/api/invitations/[code]/export/pdf`
- `/api/admin/attendance/export?format=xlsx|csv`

## 13. نظام الصور

مسارات الرفع:

- `/api/orders/preview-images`: endpoint عام مع rate limit `API_UPLOAD`.
- `saveOrderPreviewImages`: يحفظ order previews وguest book images.
- `saveInvitationGalleryImages`: يحفظ صور الدعوات.
- `writeUploadFile`: يكتب إلى storage provider.

المعالجة:

- Browser: `lib/browser-image-upload.ts` يضغط للـ WebP/JPEG، 32MB حد أصل المتصفح، 1800px max side، retries = 2.
- Server: `lib/display-images.ts` يستخدم `sharp` إلى WebP quality 82، max 1800x2200، HEIC fallback إلى JPEG عبر `heic-convert`.

الصيغ المدعومة تشمل jpg/jpeg/png/webp/gif/raw/cr3/cr2/dng/tiff/psd/ai/eps/bmp/heic/heif/ico/avif/nef/arw وغيرها. صيغ العرض الآمنة في المتصفح: jpg/jpeg/png/webp/gif/bmp/ico/avif.

الحذف/التنظيف:

- `lib/media-cleanup.ts` يفحص كل ملفات uploads ويقارنها بمراجع DB/file/templates/settings/data.
- حذف غير المستخدم ينشئ backup أولاً.

## 14. نظام الموسيقى

الملفات الرئيسية: `lib/audio-files.ts`, `lib/music-library.ts`, `lib/templates-preview-music.ts`, `InviteMusic`, `AudioPlayer`.

الأولويات:

1. موسيقى الدعوة `invitation.musicUrl` إذا `musicEnabled`.
2. موسيقى القالب أو مكتبة الموقع حسب السياق.
3. تعطيل الموسيقى إذا `disableMusic` أو `musicEnabled=false`.

الحماية:

- تمنع روابط صفحات YouTube/Spotify/SoundCloud وغيرها كروابط تشغيل، وتطلب رابط ملف صوت مباشر.
- الصيغ الصوتية المدعومة في الرفع/URL: mp3, wav, ogg, webm, m4a, aac, flac.
- استخراج صوت الفيديو: MP4/MOV/WEBM حتى 120MB، يعتمد على `ffmpeg/ffprobe` أو env `FFMPEG_PATH/FFPROBE_PATH`.

## 15. نظام التحليلات

الزيارات تسجل في `recordInvitationView`:

- DB: increment `viewCount` وإنشاء `AnalyticsEvent`.
- file fallback: `analyticsEvents` داخل `runtime-store`.
- metadata تأتي من `visit-source.ts`: WhatsApp, Facebook, Instagram, Telegram, Direct, Unknown.

تقارير الأدمن في `lib/admin-analytics.ts`:

- فترات today/7d/30d/all.
- إجماليات views وRSVP والتحويل.
- المصادر، النمو، الساعات، top invitations.

تحليلات العميل في `lib/customer-analytics.ts` لكل دعوة.

## 16. النسخ الاحتياطي

`lib/backups.ts` ينشئ snapshot JSON في `data/backups`:

- source: `database` إذا Prisma متاح وقراءة DB نجحت، وإلا `files`.
- يضم جداول DB الأساسية وملفات data وuploads ضمن حدود: ملف upload فردي 5MB، إجمالي uploads 40MB.
- يحتفظ بعدد محدود لكل نوع وبعمر محدود.
- الاستعادة `restoreBackupSnapshot` تكتب `data/*.json` وuploads الآمنة، وتنشئ backup قبل الاستعادة.
- `scripts/backup.mjs` مختلف: يستعمل `pg_dump` إلى مجلد `backups/hourly|daily` من GitHub Actions.

## 17. GitHub Sync

`lib/github-sync.ts` يزامن:

- `data`
- `runtimeUploadsDir` إلى `public/uploads`

الآلية:

1. يقرأ token من `GITHUB_SYNC_TOKEN` أو `BACKUP_GITHUB_TOKEN` أو `GITHUB_TOKEN` أو `GH_TOKEN`.
2. يقرأ repo من `GITHUB_SYNC_REPO` أو `BACKUP_GITHUB_REPO`.
3. يجمع الملفات حتى 90MB لكل ملف.
4. ينشئ blobs/tree/commit عبر GitHub API.
5. يحدث ref للفرع بدون force.
6. يسجل `SyncLog` في DB.

الطابور `github-sync-queue.ts`:

- retries: 5s, 15s, 45s، max 3.
- لا يعيد المحاولة عند 401/403.
- يسجل audit log لكل نتيجة.

## 18. جميع APIs

| Method | Route | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/api/admin/analytics/export` | admin | تصدير analytics إلى xlsx/csv/pdf |
| GET | `/api/admin/attendance/export` | admin | تصدير الحضور |
| GET | `/api/admin/audit-log/export` | admin | CSV audit log |
| GET | `/api/admin/backups/[fileName]` | admin | تحميل backup JSON |
| GET/POST | `/api/admin/backups` | admin | قائمة/إنشاء backup |
| PATCH/POST | `/api/admin/broadcast` | admin | تعديل محتوى الصفحة الرئيسية ومعاينتها |
| POST | `/api/admin/client-messages` | admin | إرسال رسالة للعميل |
| GET | `/api/admin/client-messages/unread-count` | admin | عدد رسائل العميل غير المقروءة |
| POST | `/api/admin/content-presets` | admin | إنشاء/تحديث/حذف presets |
| POST | `/api/admin/customers/[id]` | admin | تفعيل/تعطيل/حذف عميل |
| POST | `/api/admin/favorites` | admin | إضافة/إزالة favorites |
| POST | `/api/admin/guest-book` | admin | moderation وإعدادات guest book |
| POST | `/api/admin/internal-notes` | admin | ملاحظات داخلية |
| POST | `/api/admin/invitation-builder` | admin | إنشاء/تحديث/نشر دعوة من wizard |
| POST | `/api/admin/invitations/[code]` | admin | custom slug/delete/pause/resume/archive |
| POST | `/api/admin/invitations` | admin | إنشاء دعوة legacy |
| POST | `/api/admin/legal-pages` | admin | تحديث الصفحات القانونية |
| POST | `/api/admin/live-mode` | admin | تحديث live mode |
| POST | `/api/admin/media/cleanup` | admin | حذف وسائط غير مستخدمة |
| POST | `/api/admin/media/file` | admin | حذف/استبدال ملف وسائط |
| POST | `/api/admin/message-templates` | admin | CRUD قوالب رسائل |
| POST | `/api/admin/music` | admin | إدارة مكتبة الموسيقى |
| GET/POST | `/api/admin/notification-center` | admin | قراءة/تحديث مركز التنبيهات |
| POST | `/api/admin/notifications/send` | admin | إرسال Push |
| POST | `/api/admin/orders/[id]` | admin | review/update/publish/reject/delete طلب |
| GET | `/api/admin/orders/count` | admin | badge عدد الطلبات المفتوحة |
| POST | `/api/admin/pages` | admin | CRUD صفحات ديناميكية |
| POST | `/api/admin/preview` | admin | إعداد معاينة الصفحة الرئيسية |
| POST | `/api/admin/recent-edits/restore` | admin | restore backup |
| POST | `/api/admin/rsvp/[id]` | admin | تعديل/حذف RSVP |
| POST | `/api/admin/settings` | admin | إعدادات الموقع |
| GET/POST | `/api/admin/sync-status` | admin | حالة ومزامنة يدوية |
| GET | `/api/admin/sync/history` | admin | سجل sync |
| POST | `/api/admin/sync/retry` | admin | إعادة sync |
| GET | `/api/admin/sync/status` | admin | حالة sync مختصرة |
| GET/POST | `/api/admin/tasks` | admin | قائمة/تشغيل/تعطيل مهام |
| POST | `/api/admin/templates/import` | admin | استيراد HTML custom template |
| POST | `/api/admin/templates/music` | admin | إعدادات القالب وصوره وموسيقاه |
| POST | `/api/admin/trash` | admin | restore/hard-delete |
| POST | `/api/auth/admin/login` | public form | دخول أدمن مع rate limit |
| POST | `/api/auth/admin/logout` | admin cookie delete | خروج أدمن |
| POST | `/api/auth/client/login` | public form | دخول عميل |
| POST | `/api/auth/client/logout` | client cookie delete | خروج عميل |
| POST | `/api/client/guest-book/settings` | client | إعداد guest book للدعوة |
| POST | `/api/client/invitations/[code]` | client | تعديل دعوة العميل |
| POST | `/api/client/live-mode/[code]` | client | تشغيل/إيقاف live mode |
| POST | `/api/client/messages/read` | client | تعليم رسائل مقروءة |
| POST | `/api/errors` | public | تسجيل أخطاء الواجهة |
| GET | `/api/invitations/[code]/calendar/ics` | public | ملف تقويم ICS |
| GET/POST | `/api/invitations/[code]/check-in` | public | حالة/إنشاء check-in |
| GET | `/api/invitations/[code]/export/[format]` | public | تصدير RSVP excel/pdf |
| GET/POST | `/api/invitations/[code]/guest-book` | public | قراءة/إرسال رسائل ضيوف |
| GET | `/api/invitations/[code]/live-mode` | public | live mode payload |
| POST | `/api/invitations/[code]/rsvp` | public | تسجيل RSVP |
| POST | `/api/orders/extract-video-audio` | public rate-limited | استخراج MP3 من فيديو |
| POST | `/api/orders/preview-images` | public rate-limited | رفع صور مبدئية |
| POST | `/api/orders/preview-music` | public rate-limited | رفع/تحقق موسيقى مبدئية |
| POST | `/api/orders` | public rate-limited | إنشاء طلب |
| GET | `/api/push/latest` | public | آخر push payload |
| POST | `/api/push/subscribe` | public | حفظ subscription |
| GET | `/manage/invitation/[token]` | public token | تحويل token إلى client session |
| GET/HEAD | `/uploads/[...path]` | public constrained | قراءة uploads مع Range |

## 19. Components

المكوّنات المحورية:

- `InvitationExperience`: أكبر مكوّن، يختار القالب، يحقن custom HTML، ويربط الموسيقى والـ permissions وlive mode وopening وpoll وguest book وcalendar وQR.
- `OrderForm`: نموذج الطلب العام، مسودة URL/sessionStorage، ضغط/رفع صور، موسيقى، استخراج فيديو، submit إلى `/api/orders`.
- `AdminOrderRequestsManager`: queue طلبات، مراجعة تلقائية، تحديث/نشر/رفض، معاينة حية iframe.
- `AdminNewInvitationWizard`: wizard من 8 خطوات، autosave localStorage، crop، رفع صور/موسيقى، preview postMessage، publish/draft.
- `ClientInvitationEditor`: تحرير العميل، dirty guard، رفع صور/موسيقى، preview clickable داخل iframe.
- `AdminInvitationTools`: حقول مشتركة بين إدارة الطلبات والدعوات.
- `GlobalNotifications`: Toast system، يعترض route params، window errors، unhandled rejections، console.error، fetch failures ويرسل `/api/errors`.
- `DashboardShell`: shell لوحة الإدارة مع badges polling.
- `BroadcastStudio`: محرر محتوى الصفحة الرئيسية ومعاينتها.
- `TemplateBrowser/TemplateCard`: تصفح القوالب.
- `GuestBook`, `InvitePoll`, `RsvpForm`, `InviteCheckIn`, `WeddingLiveMode`, `InviteMusic`, `InviteMap`, `AddToCalendar`, `QrCodeBlock`: عناصر الدعوة العامة.
- `InvitationQrTools`: أدوات QR للعميل.
- `AudioPlayer`, `Toast`, `ConfirmDialog`, `Pagination`, `CopyButton`, `FavoriteToggleButton`, `InternalNotesPanel`: مكوّنات تشغيلية مساعدة.

كل ملفات `components` البالغ عددها 62 تمت فهرستها، وأكبرها: `InvitationExperience.tsx`, `OrderForm.tsx`, `AdminNewInvitationWizard.tsx`, `ClientInvitationEditor.tsx`, `AdminOrderRequestsManager.tsx`, `BroadcastStudio.tsx`, `GlobalNotifications.tsx`.

## 20. Services وHelpers في lib

تصنيف ملفات `lib`:

- بيانات وإدارة: `admin-data`, `invitation-data`, `file-store`, `demo-data`.
- Auth: `admin-session`, `client-session`, `auth-config`, `password`.
- DB/URLs: `db`, `database-url`, `utils`, `slug`, `custom-invitation-url`, `runtime-paths`.
- قوالب: `templates`, `template-settings`, `custom-templates`, `templates-preview-music`, `invitation-template-bindings`.
- محتوى: `home-content`, `site-settings`, `preview-settings`, `broadcast-fields`, `dynamic-pages`, `legal-pages`.
- صور/وسائط: `image-formats`, `display-images`, `browser-image-upload`, `invitation-images`, `order-preview-images`, `audio-files`, `video-audio-extraction`, `music-library`, `media-cleanup`, `storage-provider`.
- RSVP وتجربة الدعوة: `attendance`, `check-ins`, `guest-book`, `wedding-live-mode`, `calendar`, `i18n`, `invitation-texts`, `pre-publish-validation`, `invitation-completeness`.
- تشغيل: `backups`, `github-sync`, `github-sync-queue`, `sync-middleware`, `task-scheduler`, `system-health`, `push-notifications`.
- مراقبة: `audit-log`, `error-tracking`, `error-handler`, `admin-notifications`, `admin-search`, `customer-analytics`, `admin-analytics`, `visit-source`, `visit-source-analytics`.
- إعدادات مساعدة/قديمة: `admin-utils`, `security-enhancements`, `validation`, `validation-enhanced`, `types`, `heic-convert.d.ts`.

## 21. Environment Variables

متغيرات مستخدمة فعلياً:

- `DATABASE_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL`, `DATABASE_PRIVATE_URL`, `DATABASE_PUBLIC_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`: قاعدة البيانات.
- `NEXT_PUBLIC_SITE_URL`: بناء الروابط والmetadata والredirects.
- `AUTH_SECRET`, `ADMIN_SESSION_SECRET`, `JWT_SECRET`: أسرار hashing/admin session.
- `ADMIN_USERNAME`, `ADMIN_USER`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_PASS`, `ADMIN_PASSWORD_HASH`, `ADMIN_PASS_HASH`: دخول الأدمن.
- `CLIENT_SESSION_SECRET`, `CLIENT_ADMIN_USERNAME`, `CLIENT_ADMIN_PASSWORD`: دخول العميل.
- `SHOW_PHOTOGRAPHER_CARD`: إظهار بطاقة المصور.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: push notifications.
- `WHATSAPP_ORDER_PHONE`: رقم واتساب الطلبات.
- `GITHUB_SYNC_ENABLED`, `GITHUB_SYNC_REPO`, `BACKUP_GITHUB_REPO`, `GITHUB_SYNC_BRANCH`, `RAILWAY_GIT_BRANCH`, `GITHUB_SYNC_TOKEN`, `BACKUP_GITHUB_TOKEN`, `GITHUB_TOKEN`, `GH_TOKEN`: GitHub Sync.
- `STORAGE_PROVIDER`, `NEXT_PUBLIC_STORAGE_PROVIDER`, `STORAGE_LOCAL_ROOT`, `RAILWAY_VOLUME_MOUNT_PATH`, `AWS_S3_PUBLIC_URL`, `CLOUDFLARE_R2_PUBLIC_URL`: التخزين.
- `FFMPEG_PATH`, `FFPROBE_PATH`: استخراج صوت الفيديو.
- `STORAGE_WARNING_BYTES`, `ADMIN_STORAGE_WARNING_BYTES`: تحذير حجم التخزين.
- `NODE_ENV`: فروع dev/prod للأمان والكوكيز واللوغ.

غياب DATABASE_URL لا يوقف التطبيق كلياً، بل يفعّل file fallback. غياب أسرار الجلسة في production يجعل auth غير مهيأ. غياب VAPID يعطل push. غياب GitHub Sync يوقف المزامنة ويظهر warning.

## 22. تدفق البيانات

إنشاء الطلب:

```text
OrderForm -> /api/orders/preview-images
OrderForm -> /api/orders/preview-music أو extract-video-audio
OrderForm -> POST /api/orders
POST /api/orders -> Prisma OrderRequest أو data/runtime-store.json
POST /api/orders -> WhatsApp URL + GitHub Sync queue
```

نشر الدعوة:

```text
/admin/orders -> AdminOrderRequestsManager
POST /api/admin/orders/[id] action=publish
validate draft + prePublish
upsert Customer + WeddingTemplate
create/update Invitation
OrderRequest.status=PUBLISHED
ensure manage token
revalidate + audit log + GitHub Sync
```

RSVP:

```text
InvitePoll/RsvpForm -> POST /api/invitations/[code]/rsvp
validate -> GuestRsvp أو file guests
revalidate الدعوة والإدارة -> sync queue
analytics/attendance تقرأ لاحقاً
```

تعديل العميل:

```text
/:code/ad_3399 -> ClientInvitationEditor
uploads مبدئية -> preview APIs
POST /api/client/invitations/[code]
verify client cookie(code)
update Invitation أو file invitation
revalidate public/client/admin -> sync queue -> audit log
```

Backup/Sync:

```text
createBackupSnapshot -> data/backups/*.json
queueGitHubSync -> github-sync-queue
syncAdminStateToGitHub -> collect data/uploads -> GitHub commit -> SyncLog
```

## 23. المشكلات الحالية والديون التقنية

ملاحظات مستخرجة من الكود:

- `app/globals.css` ضخم جداً: 23,786 سطراً، يجمع أنماط الموقع والإدارة والدعوات والقوالب. هذا يزيد صعوبة الصيانة ويجعل أي تعديل CSS عالي المخاطر.
- `InvitationExperience.tsx` ضخم جداً: 2,282 سطراً ويحتوي منطق كل القوالب. فصل كل قالب إلى ملف مستقل سيقلل المخاطر.
- `OrderForm`, `AdminNewInvitationWizard`, `ClientInvitationEditor`, `AdminOrderRequestsManager` تحتوي منطق رفع/موسيقى/معاينة متكرر رغم وجود `AdminInvitationTools`.
- `GlobalNotifications` يعترض `window.fetch` و`console.error` عالمياً؛ مفيد للتشخيص لكنه قد ينتج ضجيجاً أو تداخلات مع مكتبات خارجية.
- custom HTML templates تعرض داخل iframe `srcDoc` مع `allow-scripts allow-forms allow-popups`، وهذا مقيد بالـ sandbox لكنه يبقى سطح مخاطرة محتوى مخصص.
- Push notifications تستخدم raw SQL وجداول ليست في Prisma schema، ما يصعب migrations والتتبع.
- التخزين يدعي دعم S3/R2 جزئياً، لكن remote provider غير مكتمل بدون تنفيذ فعلي واضح للكتابة/القراءة.
- يوجد fallback JSON واسع. هذا جيد للتشغيل، لكنه يخلق مسارين منطقيين يجب اختبارهما دائماً: DB وfile store.
- `/client` صفحة عامة قديمة/استعراضية وليست login الحقيقي، وقد تربك المستخدم أو المطور.
- ملف `PROJECT_DOCUMENTATION_AR.md` القديم يحتوي معلومات تبدو غير مطابقة لبعض أسماء الملفات الحالية، لذلك لا يجب اعتباره مصدر الحقيقة.
- `homepage-related-files.zip` يحفظ نسخاً من 70 ملفاً داخل Git؛ إن لم يكن مقصوداً كأرشيف تسليم فهو يزيد حجم repo وقد يربك الفحص.
- `data/backups` يحتوي backups كبيرة متتبعة في Git؛ هذا مقصود جزئياً للمزامنة، لكنه يرفع حجم المشروع.

## 24. ملخص تنفيذي

المشروع تطبيق Next.js كامل لدعوات الزفاف الرقمية، مبني حول ثلاث طبقات: تجربة عامة جذابة للعميل والزائر، لوحة إدارة كثيفة لإنتاج الدعوات، وطبقة تشغيل قوية للنسخ والمزامنة والتخزين والتحليلات. قاعدة البيانات الأساسية PostgreSQL/Prisma، لكن معظم الوظائف تملك file fallback في `data/*.json`. الدعوة هي الكيان المركزي؛ الطلب يتحول إلى دعوة، والعميل يعدل الدعوة، والضيوف يتفاعلون مع الدعوة عبر RSVP وguest book وcheck-in.

للدخول على المشروع كمطور جديد، ابدأ بهذه الملفات:

1. `prisma/schema.prisma` لفهم الكيانات.
2. `lib/types.ts` لفهم أنواع التطبيق.
3. `app/api/orders/route.ts` و`app/api/admin/orders/[id]/route.ts` لفهم دورة الطلب.
4. `app/api/admin/invitation-builder/route.ts` لفهم إنشاء الدعوة مباشرة.
5. `components/InvitationExperience.tsx` و`lib/templates.ts` لفهم العرض والقوالب.
6. `lib/file-store.ts`, `lib/admin-data.ts`, `lib/invitation-data.ts` لفهم DB/file fallback.
7. `middleware.ts`, `lib/admin-session.ts`, `lib/client-session.ts` لفهم الحماية.
8. `lib/github-sync.ts`, `lib/backups.ts`, `lib/task-scheduler.ts` لفهم التشغيل.

هذا الفحص لم يعدل أي كود تشغيلي. الملف الحالي توثيق جديد فقط.
