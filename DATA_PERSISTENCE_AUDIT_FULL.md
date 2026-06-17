# BadrDaawa — Data Persistence System Complete Audit
## تاريخ التقرير: 2026-06-17
## الهدف: تحديد نقاط الفشل وضمان عدم فقدان أي بيانات

---

## PHASE 1 — DATA FLOW ANALYSIS

### 1.1 إنشاء طلب جديد (Order Request)

| الخطوة | المكان | الملف | السطر |
|--------|--------|-------|-------|
| استقبال البيانات | Public API Route | `app/api/orders/route.ts` | POST |
| التحقق | Zod Schema | `lib/validation.ts` | orderRequestSchema |
| حفظ الصور | Storage Provider | `lib/order-preview-images.ts:61` → `lib/storage-provider.ts:146` | writeFile |
| حفظ الموسيقى | Storage Provider | `lib/audio-files.ts:150-161` → `lib/storage-provider.ts:146` | writeFile |
| حفظ الطلب | Prisma Layer | `app/api/orders/route.ts` → `prisma.orderRequest.create()` | PostgreSQL |
| تسجيل المراجعة | Audit Log | `lib/audit-log.ts` → `prisma.auditLog.create()` | PostgreSQL |
| **الموقع النهائي** | PostgreSQL + Volume | `OrderRequest` table + `public/uploads/order-requests/` | |

**البيانات المحفوظة فعلياً:**
- PostgreSQL: `OrderRequest` row (groomName, brideName, phone, weddingDate, venue, mapUrl, notes, imageUrls[], musicUrl, texts, photographer, status, templateId, publishedInvitationCode, manageToken)
- Storage Volume: صور الطلب (حتى 3) تحت `uploads/order-requests/`
- Storage Volume: ملف الموسيقى المرفوع تحت `uploads/music/`
- **لا يوجد تخزين احتياطي لحظي — إذا فشل PostgreSQL يرفض الطلب** (خط 88-89: `"PostgreSQL is not configured. Refusing operational write."`)

---

### 1.2 تعديل دعوة (Edit Invitation)

| الخطوة | المكان | الملف | السطر |
|--------|--------|-------|-------|
| استقبال البيانات | Admin API Route | `app/api/admin/invitations/[code]/route.ts` | POST |
| تحديث الدعوة | Prisma | `prisma.invitation.updateMany()` | PostgreSQL |
| تحديث العميل | Prisma | `prisma.customer.upsert()` | PostgreSQL |
| حفظ الصور | Storage | `lib/invitation-images.ts:33` → `lib/storage-provider.ts:146` | writeFile |
| تسجيل المراجعة | Audit Log | `lib/audit-log.ts` → `prisma.auditLog.create()` | PostgreSQL |
| **الموقع النهائي** | PostgreSQL | `Invitation` table | |

**ملاحظة:** لا يوجد GitHub Sync أو Backup فوري. التعديل محفوظ فقط في PostgreSQL.

---

### 1.3 رفع صورة (Upload Image)

| الخطوة | المكان | الملف | السطر |
|--------|--------|-------|-------|
| استقبال | Media Server | `lib/invitation-media-server.ts:20` | writeUploadFile |
| حفظ الملف | Storage Provider | `lib/storage-provider.ts:146` | writeFile |
| مرجع الصورة | Prisma | `prisma.invitation.update({ gallery, heroPhoto })` | PostgreSQL |
| **الموقع النهائي** | Volume + PostgreSQL | ملف على `uploads/client-invitations/` + مرجع في `Invitation.gallery[]` | |

**ملاحظة:** الملف الفعلي يحفظ على Volume Railway فقط. PostgreSQL يحفظ الروابط (URLs) فقط.

---

### 1.4 رفع موسيقى (Upload Music)

| الخطوة | المكان | الملف | السطر |
|--------|--------|-------|-------|
| استقبال | Admin/Order API | `lib/audio-files.ts:150,161` | writeUploadFile |
| حفظ الملف | Storage Provider | `lib/storage-provider.ts:146` | writeFile |
| مرجع الموسيقى | Prisma | `prisma.invitation.update({ musicUrl })` | PostgreSQL |
| **الموقع النهائي** | Volume + PostgreSQL | ملف على `uploads/music/` + رابط في `Invitation.musicUrl` | |

**ملاحظة:** إذا حذف Volume تفقد الملفات ولكن تبقى الروابط في PostgreSQL (broken references).

---

### 1.5 تعديل قالب (Edit Template)

| الخطوة | المكان | الملف | السطر |
|--------|--------|-------|-------|
| استقبال | Admin API | `app/api/admin/templates/content/route.ts` | POST |
| حفظ الإعدادات | App Settings | `lib/project-content-store.ts:100` → `writeAppSetting()` | PostgreSQL |
| GitHub Sync | Sync Queue | `lib/github-sync-queue.ts` → `syncAdminStateToGitHub()` | GitHub API |
| **الموقع النهائي** | PostgreSQL + GitHub | `AppSetting` row + GitHub `data/*.json` | |

**ملاحظة:** هذا هو المسار الوحيد الذي يصل إلى GitHub. GitHub Sync يعمل فقط للمحتوى الثابت (project content).

---

### 1.6 تعديل إعدادات النظام (Edit System Settings)

| الخطوة | المكان | الملف | السطر |
|--------|--------|-------|-------|
| استقبال | Admin API | `app/api/admin/settings/route.ts` | POST |
| حفظ الإعدادات | App Settings | `lib/site-settings.ts` → `writeAppSetting()` | PostgreSQL |
| GitHub Sync | Sync Queue | `lib/github-sync-queue.ts` | GitHub API |
| **الموقع النهائي** | PostgreSQL + GitHub | `AppSetting` + `data/site-settings.json` | |

---

### 1.7 إنشاء عميل (Create Customer)

| الخطوة | المكان | الملف | السطر |
|--------|--------|-------|-------|
| استقبال | Admin Invitation Route | `app/api/admin/invitations/route.ts:137-152` | prisma.customer.upsert() |
| حفظ | Prisma | `prisma.customer.create/upsert` | PostgreSQL |
| **الموقع النهائي** | PostgreSQL فقط | `Customer` table | |

**ملاحظة:** العملاء لا يدخلون GitHub Sync ولا مشمولين في Project Content. يدخلون فقط في Runtime Backup.

---

### 1.8 إنشاء RSVP

| الخطوة | المكان | الملف | السطر |
|--------|--------|-------|-------|
| استقبال | Public API | `app/api/invitations/[code]/rsvp/route.ts` | POST |
| حفظ | Prisma | `prisma.guestRsvp.create()` | PostgreSQL |
| **الموقع النهائي** | PostgreSQL | `GuestRsvp` table | |

**ملاحظة:** RSVP يحفظ فقط في PostgreSQL. لا يوجد fallback.

---

### 1.9 إنشاء Guest Book Message

| الخطوة | المكان | الملف | السطر |
|--------|--------|-------|-------|
| استقبال | Public API | `app/api/invitations/[code]/guest-book/route.ts` | POST |
| حفظ | Prisma | `lib/guest-book.ts:186` → `prisma.guestBookMessage.create()` | PostgreSQL |
| **الموقع النهائي** | PostgreSQL | `GuestBookMessage` table | |

**ملاحظة:** يرفض الكتابة إذا PostgreSQL غير متاح (`GuestBookStorageError`).

---

## PHASE 2 — SOURCE OF TRUTH

### الإجابة المباشرة: **PostgreSQL هو المصدر الوحيد والحقيقي للبيانات.**

**الأدلة من الكود:**

1. **`lib/app-settings.ts:33-34`**:
   ```
   if (!prisma) {
     throw new Error("DATABASE_URL is required. PostgreSQL is the only live source of truth.");
   }
   ```
   هذا يظهر في كل من `readAppSetting()` و `writeAppSetting()`.

2. **`lib/project-content-store.ts:78-95`**:
   - عند القراءة: يحاول PostgreSQL أولاً
   - إذا نجح: يعيد البيانات من PostgreSQL (لا يقرأ JSON files)
   - إذا فشل في الإنتاج: **يرمي خطأ** (لا يقعط على JSON)
   - إذا فشل في التطوير: يقرأ من legacy JSON كـ *fallback*
   ```
   if (process.env.NODE_ENV === "production") throw error;
   ```

3. **`lib/project-content-store.ts:104`**:
   عند الكتابة في الإنتاج: إذا فشل PostgreSQL يرمي خطأ دون محاولة JSON
   ```
   if (process.env.NODE_ENV === "production") throw dbError;
   ```

4. **ترتيب التحميل عند بدء التشغيل**:
   ```
   PostgreSQL → (إذا نجح) → استخدم PG data
            ↓ (إذا فشل في DEVELOPMENT)
            → Legacy JSON file
            ↓ (إذا فشل JSON)
            → Defaults/fallback
   ```

**ماذا يحدث عند الاختلاف بين PostgreSQL و runtime-store.json؟**

**PostgreSQL ينتصر.** النظام لا يقارن ولا يكتشف الاختلافات. إذا اختلفت البيانات:
- في الإنتاج: يستخدم PostgreSQL فقط (JSON files لا تُقرأ ولا تُستخدم)
- في التطوير: يقرأ JSON فقط إذا PostgreSQL فشل تماماً (ليس عند اختلاف البيانات)

**خلاصة:**
- `PostgreSQL` = المصدر الحي الوحيد
- `data/*.json` files = legacy development fallback (غير مقروءة في الإنتاج)
- `data/backups/*.json` = نسخ احتياطية يدوية (غير مقروءة في التشغيل العادي)
- `GitHub data/*.json` = نسخ من Project Content للتتبع التاريخي فقط

---

## PHASE 3 — WRITE PATH AUDIT

### جدول جميع عمليات الكتابة:

| # | الملف | الدالة | البيانات المكتوبة | Risk Level |
|---|-------|--------|-------------------|------------|
| 1 | `lib/storage-provider.ts:146` | `LocalStorageProvider.write()` | جميع رفع الملفات (صور, موسيقى, فيديو) | **HIGH** - يكتب على Volume, لا يوجد نسخ احتياطي لحظي |
| 2 | `lib/backups.ts:413` | `createBackupSnapshot()` | نسخة كاملة من Runtime Data + Uploads كـ base64 | **HIGH** - النسخة الوحيدة الكاملة |
| 3 | `lib/github-sync.ts:488` | `uploadRuntimeBackupToGitHub()` | Runtime Backup JSON إلى GitHub | **MEDIUM** - خطوة ثانية بعد الحفظ المحلي |
| 4 | `lib/github-sync.ts:543-758` | `syncAdminStateToGitHub()` | Project Content إلى GitHub (blobs, tree, commit, ref) | **MEDIUM** - المحتوى موجود أصلاً في PostgreSQL |
| 5 | `lib/project-content-store.ts:108` | `writeProjectContentSetting()` (fallback) | Legacy JSON (DEV فقط) | **LOW** - DEV فقط |
| 6 | `lib/project-content-store.ts:140` | `writeLegacyProjectContentSnapshotForLocalReview()` | Snapshots for local review | **LOW** - يدوي |
| 7 | `lib/audio-files.ts:150` | `saveAudioBytes()` | ملفات موسيقى للرفع | **HIGH** - بيانات العميل على Volume |
| 8 | `lib/invitation-images.ts:33` | `saveInvitationGalleryImages()` | صور الدعوات | **HIGH** - بيانات العميل على Volume |
| 9 | `lib/invitation-media-server.ts:20` | Media server upload | ملفات وسائط الدعوات | **HIGH** - بيانات العميل على Volume |
| 10 | `lib/order-preview-images.ts:61` | `saveOrderPreviewImages()` | صور الطلبات | **HIGH** - بيانات العميل على Volume |
| 11 | `lib/backups.ts:1008` | `restoreFromBackup()` | استعادة الملفات | **HIGH** - كتابة استرجاع (محروس) |
| 12 | `lib/atomic-file.ts:8` | `writeTextFileAtomic()` | كتابة مؤقتة للنسخ الاحتياطي | **LOW** - مؤقت |
| 13 | `lib/video-audio-extraction.ts:101` | Temp file for ffmpeg | ملف فيديو مؤقت | **LOW** - يحذف بعد المعالجة |
| 14 | `scripts/generate-assets.mjs:211` | Asset generation | صور القوالب | **LOW** - build time |
| 15 | `scripts/restore-postgres-backup.mjs:78` | Temp pg dump | تفريغ PostgreSQL مؤقت | **MEDIUM** - محروس بـALLOW_DESTRUCTIVE_RESTORE |
| 16 | `scripts/migrate-storage.mjs:110` | Storage migration | نسخ الملفات أثناء الترحيل | **LOW** - مرة واحدة |
| 17 | `lib/storage-provider.ts:202` | `delete()` (unlink) | حذف الملفات المرفوعة | **HIGH** - فقدان دائم |
| 18 | `lib/backups.ts:359` | `cleanupOldBackups()` (unlink) | حذف النسخ القديمة (آخر 20 تبقى) | **MEDIUM** - متوقع |
| 19 | `lib/github-sync.ts:449` | `pruneOldRuntimeBackups()` | حذف النسخ القديمة من GitHub (آخر 30 تبقى) | **MEDIUM** - متوقع |
| 20 | `lib/app-settings.ts:37` | `writeAppSetting()` | كتابة AppSetting في PostgreSQL | **CRITICAL** - كل الـ Project Content |

### نقاط الضعف:

- **CRITICAL**: لا يوجد `write` queue/transaction لكتابة متعددة في وقت واحد
- **HIGH**: `storage-provider.ts:146` يكتب على Volume بدون confirmation من النسخ الاحتياطي
- **HIGH**: `audio-files.ts:150` و `invitation-images.ts:33` يكتبون الملفات سريعاً قبل التأكد من حفظ المرجع في PostgreSQL
- **MEDIUM**: `backups.ts:413` يكتب الملف المحلي ثم يرفع إلى GitHub — إذا فشل الرفع، النسخة (قد) تبقى محلياً لكن `BackupJob` تكون FAILED

---

## PHASE 4 — BACKUP SYSTEM AUDIT

### موقع إنشاء النسخة:
- **محلياً**: `data/backups/{type}-{timestamp}.json`
- **GitHub**: `backups/{YYYY}/{MM}/{filename}.json` في repo `GITHUB_SYNC_REPO`

### محتويات النسخة (من `lib/backups.ts:244-293`):

| المجموعة | هل تدخل النسخة؟ | المصدر |
|----------|-----------------|--------|
| Admin Users | ✅ نعم | `prisma.adminUser.findMany()` |
| Customers | ✅ نعم | `prisma.customer.findMany()` |
| Invitations | ✅ نعم | `prisma.invitation.findMany()` |
| Guest RSVPs | ✅ نعم | `prisma.guestRsvp.findMany()` |
| Order Requests | ✅ نعم | `prisma.orderRequest.findMany()` |
| Analytics Events | ✅ نعم | `prisma.analyticsEvent.findMany()` |
| Guest Book Messages | ✅ نعم | `prisma.guestBookMessage.findMany()` |
| Couple Messages Settings | ✅ نعم | `prisma.coupleMessagesSetting.findMany()` |
| Client Messages | ✅ نعم | `prisma.clientMessage.findMany()` |
| Check-ins | ✅ نعم | `prisma.invitationCheckIn.findMany()` |
| Live Modes | ✅ نعم | `prisma.weddingLiveMode.findMany()` |
| Internal Notes | ✅ نعم | `prisma.internalNote.findMany()` |
| Audit Logs | ✅ نعم | `prisma.auditLog.findMany()` |
| Backup Jobs | ✅ نعم | `prisma.backupJob.findMany()` |
| Sync Logs | ✅ نعم | `prisma.syncLog.findMany()` |
| Non-project AppSettings | ✅ نعم | Filtered: `!isProjectContentAppSettingKey()` |
| Customer Uploads (صور/موسيقى) | ✅ نعم - **كـ base64** | `readRuntimeUploadSnapshot()` |
| Project Content AppSettings | ❌ لا - مستبعدة عمداً | `isProjectContentAppSettingKey()` filter |
| Dynamic Pages | ❌ لا | غير مشمولة في runtimeData |
| Wedding Templates | ❌ لا | غير مشمولة في runtimeData |
| Admin Assets (public/assets/admin) | ❌ لا | غير مشمولة |

### هل النسخة كافية لاستعادة 100%؟

**لا.** النسخة تستعيد Runtime Data (العملاء, الطلبات, الدعوات, RSVPs, إلخ) لكنها **لا تستعيد**:

1. **Project Content** (site-settings, home-content, template-settings, music-library, legal-pages, message-templates, content-presets, custom-templates, templates-preview-music, template-preview-info, home-preview-settings)
2. **Dynamic Pages** (منفصل في PostgreSQL)
3. **Wedding Templates** (منفصل في PostgreSQL)

والأسوأ: Project Content غير موجود في النسخة الاحتياطية إطلاقاً — يعتمد فقط على PostgreSQL + GitHub Sync.

**إذا فقد PostgreSQL بالكامل وفقدت النسخة الاحتياطية (أو كانت قديمة):**
- Project Content يضيع إذا لم يكن GitHub Sync شغال
- Dynamic Pages و Wedding Templates يضيعون أيضاً

---

## PHASE 5 — RESTORE AUDIT

### ملفات الاستعادة الموجودة:

1. **`lib/backups.ts:941-1038` — `restoreFromBackup()`**
   - يستقبل `fileName` ويقرأ JSON من `data/backups/`
   - يحذف كل Runtime Data بترتيب آمن (FK-safe)
   - يعيد إدراج البيانات بنفس الترتيب
   - يستعيد ملفات uploads من base64
   - **محروس** بـ `ALLOW_DESTRUCTIVE_RESTORE` env var

2. **`app/api/admin/backups/[fileName]/restore/route.ts`**
   - واجهة API للاستعادة من واجهة الأدمن
   - يتحقق من `ALLOW_DESTRUCTIVE_RESTORE`
   - يستدعي `restoreFromBackup()`

3. **`scripts/restore-postgres-backup.mjs`**
   - هذا السكريبت **مصمم فقط لاستعادة pg_dump** (postgresDump)
   - **يرفض Runtime Backup JSON files** (خط 66-68):
     ```
     if (payload?.runtimeData || payload?.uploads) {
       throw new Error("This is a Runtime Data backup package. Automatic restore is disabled...");
     }
     ```
   - يحتاج `ALLOW_DESTRUCTIVE_RESTORE` + `--confirm-manual-restore`
   - إضافي: `ALLOW_PRODUCTION_RESTORE` للإنتاج

4. **`scripts/auto-restore-from-github.mjs`** — **غير موجود** (ملف وهمي)
   - لا يوجد auto-restore من GitHub في المشروع

### عند فقدان PostgreSQL بالكامل:

| السيناريو | النتيجة |
|-----------|---------|
| هل يستعيد النظام نفسه تلقائياً؟ | **لا.** الاستعادة يدوية 100% |
| هل API الاستعادة تعمل عبر UI؟ | نعم (إذا ALLOW_DESTRUCTIVE_RESTORE مفعل) |
| هل الاستعادة تحتاج ملف النسخة محلياً؟ | نعم — إذا الملف غير موجود محلياً، يجب تنزيله من GitHub أولاً |
| ماذا عن Project Content؟ | لا تتم استعادته من Backup — يجب استعادته يدوياً أو من GitHub Sync |
| ماذا عن Dynamic Pages / Wedding Templates؟ | لا تتم استعادتهم من Backup |
| ماذا يضيع إذا كانت آخر نسخة عمرها 6 ساعات؟ | كل التغييرات خلال آخر 6 ساعات |

**خطوات الاستعادة اليدوية الكاملة لفقدان PostgreSQL:**

```
1. ALLOW_DESTRUCTIVE_RESTORE=I_UNDERSTAND_THIS_OVERWRITES_POSTGRESQL
2. DATABASE_URL=postgresql://...
3. node scripts/restore-postgres-backup.mjs ./backup.json --confirm-manual-restore
   (هذا يفشل لأن backup.json يحتوي runtimeData)

الطريقة الصحيحة:
1. تأكد أن ملف النسخة موجود محلياً في data/backups/ أو حمله من GitHub
2. اذهب إلى /admin/backups
3. اختر نسخة → Restore
4. أكد
5. بعد الاستعادة: اذهب إلى /admin/sync → Trigger Sync لاستعادة Project Content
6. Dynamic Pages و Wedding Templates يحتاجون استعادة يدوية من GitHub
```

---

## PHASE 6 — GITHUB SYNC AUDIT

### متى يبدأ GitHub Sync؟

| المشغل | الملف | السطر | متى؟ |
|--------|-------|-------|------|
| تغيير Project Content | `lib/github-sync-queue.ts:59` | `queueGitHubSync()` | فوراً بعد الحفظ في PostgreSQL |
| Manual Sync من الأدمن | `app/api/admin/sync-status/route.ts:38` | POST | بضغطة زر |
| Retry | `app/api/admin/sync/retry/route.ts:32` | POST | إعادة محاولة بعد فشل |

### من الذي يشغله؟

- **queueGitHubSync()** تُستدعى من دوال كتابة Project Content (site-settings, home-content, templates, etc.)
- **يعتمد على زيارة الأدمن** — لأنه يُستدعى فقط عندما يقوم الأدمن بتغيير Project Content
- **لا يعتمد على Scheduler** — لا يوجد Cron أو setInterval لـ GitHub Sync
- **لا يعتمد على Server Restart** — ولكن يجب أن يكون هناك request inbound لتشغيل queue processor

### سير العمل:
```
أدمن يعدل إعداد → writeProjectContentSetting() → writeAppSetting() إلى PostgreSQL
                                                      ↓
                                              queueGitHubSync()
                                                      ↓
                                              in-memory syncQueue[]
                                                      ↓
                                              processSyncQueue() ← يستخدم `after()` أو `setImmediate`
                                                      ↓
                                              syncAdminStateToGitHub()
                                                      ↓
                                              collectProjectSyncFiles()
                                                      ↓
                                              GitHub Git Data API (blobs → tree → commit → ref)
```

### المشاكل:

1. **Sync Queue in-memory** (`lib/github-sync-queue.ts:23`):
   ```
   const syncQueue: SyncQueueItem[] = [];
   ```
   إذا توقف السيرفر أو حدث crash، **تضيع كل الـ sync jobs المعلقة**.

2. **لا يعيد المحاولة تلقائياً للفشل المؤقت**:
   الفشل بسبب network/timeout لا يعاد. فقط الفشل بسبب auth يوقف.

3. **`after()` يعتمد على Next.js request context**:
   خارج request context يستخدم `setImmediate` — قد لا يعمل بشكل موثوق في Serverless.

4. **المشغلات محدودة جداً**:
   فقط تغيير Project Content يشغل sync. تغيير العملاء/الدعوات/الطلبات لا يشغل sync أبداً (وهذا مقصود — "Runtime backups are intentionally excluded from GitHub sync")

### ما الذي قد يمنع رفع النسخة إلى GitHub:

1. `GITHUB_SYNC_ENABLED=false`
2. `GITHUB_SYNC_TOKEN` غير صحيح أو منتهي الصلاحية
3. `GITHUB_SYNC_REPO` غير صحيح
4. التوكن لا يملك صلاحيات الكتابة (`Contents: Read and write`)
5. السيرفر يقرأ GitHub token line (مع `\n`) أو محاط باقتباسات
6. انتهاء Rate Limit (GitHub API: 5000 request/hour)
7. Network failure/timeout (10 دقائق timeout)
8. الملف كبير جداً (>95MB عبر `maxSyncFileBytes`)
9. السيرفر أو العملية تموت قبل اكتمال الـ queue

---

## PHASE 7 — DISASTER SCENARIOS

### SCENARIO A: حذف حساب Railway بالكامل

| البند | المصير |
|-------|--------|
| PostgreSQL | **ضاع بالكامل.** Railway يحذف DB مع الحساب. |
| Volume (uploads) | **ضاع بالكامل.** الصور والموسيقى والملفات. |
| Environment Variables | **ضاعت بالكامل.** |
| Project Content (site-settings, etc.) | **ضاع** من PostgreSQL. موجود في GitHub إذا كان Sync شغال. |
| Dynamic Pages / Wedding Templates | **ضاع** من PostgreSQL. موجود في GitHub إذا آخر Sync كان ناجحاً. |
| Customers / Orders / Invitations / RSVPs | **ضاع** من PostgreSQL. يعتمد على Backup. |
| GitHub Backups | **ينجو.** إذا كان آخر Runtime Backup (<6h) رفع إلى GitHub بنجاح. |
| GitHub Repo (code + data/*.json) | **ينجو.** |
| Railway Volume Files (الصور-الموسيقى) | **ضائعة.** آخر نسخة احتياطية تحتويها (كـ base64). |

**هل يمكن الاستعادة الكاملة؟**
- **نعم، إذا:**
  1. آخر Runtime Backup أقل من 6 ساعات ورفع إلى GitHub بنجاح
  2. آخر GitHub Sync كان ناجحاً (Project Content)
  3. Dynamic Pages و Wedding Templates موجودين في آخر GitHub Sync
  4. الملفات في backup JSON base64 كاملة

- **لا، إذا:**
  1. آخر Backup أقدم من 6 ساعات → تفقد آخر 6+ ساعات من العملاء/الطلبات
  2. GitHub Sync لم يكن شغالاً → تفقد Project Content
  3. ملفات الصور/الموسيقى كبيرة جداً → base64 في backup قد يكون تالفاً أو ناقصاً

**خطوات الاستعادة:**
1. أنشئ حساب Railway جديد
2. أنشئ PostgreSQL Database جديد
3. انشر المشروع من GitHub repo
4. ضع Environment Variables
5. استخدم ALLOW_DESTRUCTIVE_RESTORE
6. نزل آخر Runtime Backup من GitHub (من `backups/YYYY/MM/`)
7. ضعه في `data/backups/` في السيرفر الجديد
8. استخدم API `/admin/backups/{file}/restore`
9. اذهب لـ /admin/sync و Trigger Sync يدوياً
10. Project Content سيعود من GitHub
11. Dynamic Pages و Wedding Templates سيعودون من `data/dynamic-pages.json` و `data/wedding-templates.json`

### SCENARIO B: تعطل PostgreSQL فقط

| البند | المصير |
|-------|--------|
| التطبيق (السيرفر) | يبقى شغالاً لكن يرفض أي كتابة |
| قراءة البيانات | جميع APIs تعيد أخطاء |
| UI (واجهة المستخدم) | كل الصفحات التي تحتاج بيانات تظهر أخطاء |
| Volume (الملفات) | سليم — الصور والموسيقى موجودة |
| GitHub Backups | آخر نسخة موجودة |
| Project Content in GitHub | آخر Sync موجود |

**هل يمكن الاستعادة؟**
- نعم، السيناريو الأخف — فقط PostgreSQL يحتاج إصلاحاً.
- إذا كان Railway PostgreSQL: اتصل بـ Railway Support أو Restore from Railway Backup
- إذا كان خارجي: استخدم pg_restore إذا كان عندك pg_dump

### SCENARIO C: حذف Volume الخاص بالموقع

| البند | المصير |
|-------|--------|
| PostgreSQL | سليم — جميع السجلات والمراجع موجودة |
| صور الدعوات | **ضائعة.** الروابط في PostgreSQL لا تشير لشيء |
| ملفات الموسيقى المرفوعة | **ضائعة.** |
| صور الطلبات | **ضائعة.** |
| ملفات الأدمن | **ضائعة.** |
| Backup files (data/backups/) | **ضائعة.** إذا كانت على Volume |
| Backup files on GitHub | سليمة — تبقى في GitHub |

**هل يمكن الاستعادة؟**
- **جزئياً:** إذا آخر Runtime Backup رفع إلى GitHub، الملفات موجودة كـ base64 في backup JSON.
- **صعب جداً:** استخراج base64 من backup JSON لاستعادة كل ملف يحتاج script.
- **بدون backup:** جميع الملفات تضيع للأبد — لكن بيانات العملاء/الطلبات في PostgreSQL سليمة.

### SCENARIO D: تعطل GitHub Sync أسبوع كامل

| البند | المصير |
|-------|--------|
| PostgreSQL | سليم — كل شيء محفوظ محلياً |
| Project Content changes (site-settings, etc.) | محفوظة في PostgreSQL لكن ليس في GitHub |
| GitHub data/*.json files | قديمة (آخر Sync قبل أسبوع) |
| Runtime Backups | يتوقف تأثير: backup يكتب محلياً ويرفع إلى GitHub — إذا GitHub مش شغال، فشل الرفع يسبب FAILED للـ BackupJob |
| **ماذا يحدث للـ Backup أثناء تعطل Sync؟** | `createBackupSnapshot()` يرمي خطأ إذا GitHub فشل (خط 422-424) |

**كود المشكلة (lib/backups.ts:415-424):**
```typescript
const githubUpload = await uploadRuntimeBackupToGitHub({...});
if (githubUpload.status !== "synced" || !githubUpload.verified) {
  throw new Error(githubUpload.message || "GitHub backup upload failed.");
}
```

**النتيجة الكارثية:** النسخة الاحتياطية تفشل بالكامل (حتى المحلية) إذا GitHub غير متاح.

**هل يمكن الاستعادة؟**
- كل شيء في PostgreSQL سليم
- آخر backup محلي موجود لكن `BackupJob` يكون FAILED
- Project Content changes للسنة الماضية كلها في PostgreSQL فقط

### SCENARIO E: توقف Scheduler

| البند | المصير |
|-------|--------|
| Railway Cron (scheduled backup) | يتوقف — لا توجد نسخ احتياطية تلقائية جديدة |
| Manual backup | لا يزال متاحاً عبر واجهة الأدمن |
| PostgreSQL | سليم |
| GitHub Sync | لا يتأثر — يعتمد على تعديلات الأدمن وليس على Scheduler |
| آخر نسخة موجودة | آخر نسخة قبل توقف Scheduler |

**ملاحظة:** "Scheduler" الحالي هو Railway Cron فقط (`railway-cron.json`). لا يوجد scheduler داخل التطبيق نفسه. `lib/task-scheduler.ts` هو مجرد واجهة API — لا يحتوي على setInterval أو cron داخلي.

### SCENARIO F: إضافة عميل جديد قبل دقيقة من الكارثة

ما ينجو وما يضيع حسب نوع الكارثة:

| الكارثة | العميل الجديد |
|---------|---------------|
| حذف Railway | **يضيع** إذا لم تكن هناك نسخة احتياطية بعد الإضافة |
| تعطل PostgreSQL | **يضيع من DB** لكن البيانات في الطلب (form) قد تكون في المتصفح أو اللوج |
| فقدان Volume | **ينجو** لأنه في PostgreSQL |
| تعطل GitHub Sync | **ينجو** لأنه في PostgreSQL |

**السبب الجذري:** لا يوجد write-ahead log أو event sourcing. البيانات تكتب مباشرة إلى PostgreSQL بدون تخزين مؤقت.

---

## PHASE 8 — MIGRATION TO NEW RAILWAY ACCOUNT

### خطة مؤكدة لنقل المشروع بالكامل دون فقدان أي عميل

### 1. ما يجب تنزيله قبل النقل

| العنصر | المصدر | طريقة التنزيل |
|--------|--------|--------------|
| **PostgreSQL Dump** | Railway PostgreSQL | `pg_dump --clean --if-exists --no-owner --no-privileges -F c -f badrdaawa_full.dump "$DATABASE_URL"` |
| **Runtime Backup** | `/admin/backups` | حمّل آخر backup من صفحة Backups أو من GitHub (`backups/YYYY/MM/`) |
| **Upload Files** | Volume | `rsync -avz user@railway:/path/to/uploads/ ./uploads-backup/` أو استخدم `scripts/migrate-storage.mjs` |
| **Environment Variables** | Railway Dashboard | صوّر كل المتغيرات من Railway Dashboard |
| **GitHub Repo** | GitHub | موجود بالفعل — إعادة نشر منه |

### 2. ما يجب رفعه بعد النقل

| العنصر | طريقة الرفع |
|--------|------------|
| **Code** | انشر من GitHub repo إلى Railway الجديد |
| **Environment Variables** | ضع كل المتغيرات في Railway Dashboard (أو `railway env`) |
| **PostgreSQL Dump** | أنشئ DB جديد → `pg_restore --clean --if-exists --no-owner --no-privileges -d "$NEW_DATABASE_URL" ./badrdaawa_full.dump` |
| **Upload Files** | انسخ الملفات إلى Volume الجديد |
| **Backup Files** | ضع `data/backups/` في Volume أو انسخها |

### 3. متغيرات البيئة المطلوبة

```
# Database (مطلوب)
DATABASE_URL=postgresql://...(الجديد)
POSTGRES_PRISMA_URL=...(نفس الشيء)
POSTGRES_URL=...(نفس الشيء)

# Admin (مطلوب)
AUTH_SECRET=
ADMIN_USERNAME=
ADMIN_EMAIL=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
CLIENT_ADMIN_USERNAME=
CLIENT_ADMIN_PASSWORD=
CLIENT_SESSION_SECRET=

# Backup (مطلوب)
BACKUP_CRON_SECRET=
BACKUP_CRON_URL=https://new-domain.railway.app/api/cron/backup

# GitHub Sync (مهم)
GITHUB_SYNC_ENABLED=true
GITHUB_SYNC_TOKEN=ghp_...
GITHUB_SYNC_REPO=owner/repo
GITHUB_SYNC_BRANCH=main

# Push Notifications (إذا مستخدمة)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=

# Other
NEXT_PUBLIC_SITE_URL=https://new-domain.railway.app
GOOGLE_MAPS_API_KEY=
WHATSAPP_ORDER_PHONE=
SHOW_PHOTOGRAPHER_CARD=
ENABLE_LEGACY_FILE_STORE=
```

### 4. قواعد البيانات المطلوبة
- PostgreSQL واحد فقط — كل شيء في نفس الـ schema

### 5. Volumes المطلوبة
- Volume واحد (أو STORAGE_LOCAL_ROOT)
- المسارات الداخلية:
  `client-invitations/` ← صور الدعوات
  `order-requests/` ← صور الطلبات
  `order-previews/` ← معاينات الطلبات
  `music/` ← الملفات الصوتية
  `previews/` ← المعاينات
  `template-previews/` ← معاينات القوالب
  `assets/admin/` ← أصول الأدمن

### 6. خطوات الاختبار بعد النقل

```
1. تحقق من PostgreSQL:     SELECT count(*) FROM "Customer";
2. تحقق من Volume:         قارن عدد الملفات مع النسخة الأصلية
3. تحقق من واجهة الأدمن:   /admin/login → /admin/customers
4. تحقق من الدعوات:        /admin/invitations → افتح دعوة
5. تحقق من الصور:          افتح دعوة وتأكد من ظهور الصور
6. تحقق من الموسيقى:       شغل أغنية من معرض الموسيقى
7. تحقق من الطلبات:        /admin/orders → تأكد من وجودها
8. تحقق من RSVP:           اختبر إرسال RSVP
9. تحقق من Guest Book:     اختبر إرسال رسالة
10. تحقق من GitHub Sync:   /admin/sync → Trigger Sync
11. تحقق من Backup:        /admin/backups → Create Manual Backup
12. تحقق من Cron:          انتظر أول Railway Cron run
```

---

## PHASE 9 — CRITICAL RISKS

### أخطر 25 نقطة فشل

| # | الوصف | الملف | السبب | الاحتمال | الخسارة | العلاج |
|---|-------|-------|-------|---------|---------|--------|
| **R1** | PostgreSQL هو Single Point of Failure | `lib/db.ts` | كل شيء يعتمد على PostgreSQL. لا fallback كتابي. | **عالي** | **كلية** — فقدان جميع البيانات | إضافة write-ahead log أو change data capture |
| **R2** | Volume هو Single Point of Failure للملفات | `lib/storage-provider.ts:146` | كل الصور والموسيقى على Volume واحد. لا تكرار. | **متوسط** | **كبيرة** — فقدان جميع ملفات العملاء | استخدم S3/R2 للتخزين المتكرر |
| **R3** | Backup يفشل بالكامل إذا GitHub غير متاح | `lib/backups.ts:422-424` | `createBackupSnapshot()` يرمي خطأ إذا GitHub upload فشل. | **متوسط** | **كبيرة** — لا توجد نسخة حتى محلياً | افصل GitHub upload عن backup; اكتب محلياً دائماً |
| **R4** | Restore script يرفض Runtime Backup | `scripts/restore-postgres-backup.mjs:66-68` | الـ restore CLI script لا يقبل runtime backup — يقبل فقط pg_dump | **منخفض** | **متوسطة** — لا يمكن استعادة CLI | عدّل script ليقبل runtime backup |
| **R5** | GitHub Sync Queue in-memory | `lib/github-sync-queue.ts:23` | الـ sync queue يضيع عند إعادة تشغيل السيرفر | **متوسط** | **متوسطة** — فقدان sync jobs المعلقة | استخدم PostgreSQL queue أو Redis |
| **R6** | Project Content خارج Backup | `lib/backups.ts:228-242` | Project Content مستبعد عمداً من backup | **ثابت** | **متوسطة** — Project Content يعتمد على GitHub Sync فقط | أضف Project Content للـ backup |
| **R7** | Dynamic Pages و Wedding Templates خارج Backup | `lib/backups.ts:244-267` | غير مشمولين في `readRuntimeDataSnapshot()` | **ثابت** | **متوسطة** — يفقدون إذا فشل PostgreSQL + GitHub | أضفهم للـ backup |
| **R8** | Admin Assets خارج Backup | `lib/backups.ts` | `public/assets/admin/` غير مشمول | **ثابت** | **صغيرة** — صور/أيقونات القوالب | أضف assets للـ backup |
| **R9** | لا يوجد Backup تلقائي عند كل كتابة | النظام كامل | Backup يعمل كل 6 ساعات فقط — وليس عند كل تغيير | **متوسط** | **متوسطة** — فقدان 6 ساعات من البيانات | قلّف الفاصل الزمني أو استخدم WAL |
| **R10** | Backup Retention 20 فقط محلياً | `lib/backups.ts:132` | فقط آخر 20 نسخة تبقى — الباقي يُحذف | **متوسط** | **صغيرة** — فقدان النسخ القديمة | زد الـ retention أو انقل لـ S3 |
| **R11** | uploadRuntimeBackupToGitHub يحذف القديم | `lib/github-sync.ts:513` | يحتفظ بآخر 30 نسخة فقط على GitHub | **متوسط** | **صغيرة** | زد `keepLast` |
| **R12** | restore من UI يحتاج ملف محلي | `lib/backups.ts:956-957` | إذا الملف غير موجود محلياً (فقط على GitHub)، لا يمكن الاستعادة | **متوسط** | **متوسطة** | أضف خيار تنزيل من GitHub قبل الاستعادة |
| **R13** | Password hashing غير معروف (SHA256?) | `lib/password.ts` | غير واضح من الكود — قد لا يكون bcrypt | **متوسط** | **أمنية** | تحقق من خوارزمية hashing |
| **R14** | No database transaction wrapping | جميع ملفات API | كل عملية تكتب لـ PostgreSQL بدون transaction | **متوسط** | **متوسطة** — فقدان اتساق البيانات | استخدم Prisma transactions |
| **R15** | `after()` depends on Next.js context | `lib/github-sync-queue.ts:35-47` | خارج request context يقعط على setImmediate | **منخفض** | **صغيرة** — sync قد لا يعمل | استخدم queue ثابت |
| **R16** | Railway cron json `restartPolicyMaxRetries: 1` | `railway-cron.json:7` | إذا فشل cron مرة، لا يعيد المحاولة | **منخفض** | **صغيرة** | زد `restartPolicyMaxRetries` |
| **R17** | Backup Job timeout 10 minutes | `scripts/trigger-backup-cron.mjs:31` | `BACKUP_CRON_TIMEOUT_MS` default = 10 min | **منخفض** | **صغيرة** | زد timeout إذا backup كبير |
| **R18** | `restore-postgres-backup.mjs` فقط لـ `DATABASE_URL` | `scripts/restore-postgres-backup.mjs` | لا يعمل مع `PGHOST/PGPORT/PGUSER` parts | **منخفض** | **صغيرة** | حسّن script |
| **R19** | No scheduled GitHub Sync | `lib/github-sync.ts` | GitHub Sync يعمل فقط عند تعديل الأدمن — لا periodic sync | **متوسط** | **متوسطة** | أضف Cron-based sync |
| **R20** | Media Cleanup يحذف دون Backup تحذيري | `lib/media-cleanup.ts:587,618,671` | قبل الحذف يعمل backup (جيد) — لكن إذا backup فشل, ماذا؟ | **منخفض** | **صغيرة** | تأكد من نجاح backup قبل الحذف |
| **R21** | No rate limiting for backup API | `app/api/cron/backup/route.ts` | يمكن إرسال طلبات كثيرة للـ backup API | **منخفض** | **صغيرة** | أضف rate limit |
| **R22** | Project Content legacy JSON write in DEV | `lib/project-content-store.ts:108` | يكتب legacy JSON في DEV — قد يسبب confusion | **منخفض** | **صغيرة** | تنبيه في الـ log |
| **R23** | `ensureRuntimeDirectories()` يخلق Volume directories | `lib/runtime-paths.ts:15-23` | إذا Volume مش mounted، يخلق directories في `public/uploads/` | **متوسط** | **متوسطة** | تحقق من Volume mount أولاً |
| **R24** | ALLOW_DESTRUCTIVE_RESTORE هو guard وحيد | `app/api/admin/backups/[fileName]/restore/route.ts:24` | لا يوجد 2FA أو تأكيد إضافي | **منخفض** | **أمنية** | أضف تأكيد إضافي |
| **R25** | لا يوجد Backup للـ Admin Assets (SVG, icons) | `lib/backups.ts` | القوالب تحتاج أصولها  | **منخفض** | **صغيرة** | أدرج assets في sync أو backup |

---

## PHASE 10 — ACTION PLAN

### P0 — يجب إصلاحه اليوم

| # | النقطة | الإجراء | الملفات المتأثرة |
|---|--------|---------|-----------------|
| P0.1 | **Backup يفشل إذا GitHub غير متاح (R3)** | افصل GitHub upload عن backup. اكتب local backup أولاً دائماً. ثم حاول GitHub upload بشكل منفصل (لا تؤثر على status). | `lib/backups.ts:415-424` |
| P0.2 | **Sync Queue in-memory يضيع عند Restart (R5)** | استخدم PostgreSQL table أو Redis للـ sync queue بدلاً من array في الذاكرة. | `lib/github-sync-queue.ts` |
| P0.3 | **Project Content خارج Backup (R6)** | أضف Project Content, Dynamic Pages, Wedding Templates إلى `readRuntimeDataSnapshot()`. | `lib/backups.ts:244-267` |
| P0.4 | **Restore CLI يرفض Runtime Backup (R4)** | اجعل `restore-postgres-backup.mjs` يقبل runtime backup كخيار (مع تحذير). | `scripts/restore-postgres-backup.mjs` |

### P1 — خلال 24 ساعة

| # | النقطة | الإجراء | الملفات المتأثرة |
|---|--------|---------|-----------------|
| P1.1 | **أضف Backup عند كل كتابة عملية** | استخدم Prisma middleware أو function interceptor لحفظ نسخة عند كل تغيير مهم (order, invitation, customer). | جميع API routes |
| P1.2 | **استخدم S3/R2 للتخزين المتكرر (R2)** | نفذ `StorageProvider` لـ S3/R2. اجعل Volume cache مع S3 كـ primary. | `lib/storage-provider.ts` |
| P1.3 | **أضف Database Transactions (R14)** | لفّ عمليات الكتابة المتعددة في `prisma.$transaction()`. | `app/api/admin/invitations/route.ts`, `app/api/admin/orders/[id]/route.ts` |
| P1.4 | **Zاد Retention للـ Backups (R10, R11)** | زد `backupRetentionCount` من 20 إلى 90. زد GitHub `keepLast` من 30 إلى 90. | `lib/backups.ts:132`, `lib/github-sync.ts:513` |
| P1.5 | **أضف تنزيل من GitHub قبل Restore (R12)** | في `restoreFromBackup()`, إذا الملف غير موجود محلياً, ابحث وحمل من GitHub. | `lib/backups.ts:941-1038` |
| P1.6 | **أضف Periodic GitHub Sync** | استخدم Railway Cron لـ sync دوري (كل 6 ساعات) لضمان Project Content في GitHub. | `railway-cron.json` |

### P2 — خلال أسبوع

| # | النقطة | الإجراء |
|---|--------|---------|
| P2.1 | **Admin Assets خارج Backup (R8)** | أضف `public/assets/admin/` إلى backup. |
| P2.2 | **تحقق من Password Hashing (R13)** | تأكد من استخدام bcrypt/argon2. |
| P2.3 | **أضف 2FA للـ Restore (R24)** | أضف تأكيد كتابي أو OTP إضافي. |
| P2.4 | **تحسين railway-cron.json retries (R16)** | زد `restartPolicyMaxRetries` إلى 3. |
| P2.5 | **أضف scheduled backup عند الفشل** | أضف retry logic للـ backup إذا فشل. |
| P2.6 | **أضف Monitoring للـ Backup/Sync** | أضف تنبيهات (email/Telegram) عند فشل backup أو sync. |
| P2.7 | **اختبار الاستعادة الكاملة** | نفّذ اختبار شهري لاستعادة كاملة من backup + GitHub + Volume. |

---

## EXECUTIVE SUMMARY

**الوضع الحالي:** النظام يعتمد كلياً على PostgreSQL + Volume واحد. Backup يعمل كل 6 ساعات عبر Railway Cron. استعادة البيانات يدوية 100%.

**أخطر نقطة فشل:** إذا فشل PostgreSQL, كل شيء يتوقف. إذا فُقد PostgreSQL + Volume, فقط GitHub Backup يمكن أن ينقذ البيانات — لكن Project Content خارج الـ backup.

**أخطر مشكلة في الكود:** `lib/backups.ts:422-424` — إذا GitHub غير متاح, الـ backup يفشل بالكامل (حتى المحلي). هذا يعني أن تعطل GitHub لمدة أسبوع يعني **لا توجد نسخ احتياطية جديدة لمدة أسبوع**.

**أخطر مشكلة معمارية:** Sync queue في الذاكرة (`github-sync-queue.ts:23`) — إذا توقف السيرفر, تضيع كل الـ sync jobs.

**التوصية الأولى:** افصل GitHub upload عن local backup. اكتب محلياً أولاً, ثم حاول الرفع إلى GitHub بشكل منفصل.

**التوصية الثانية:** أضف Project Content, Dynamic Pages, و Wedding Templates إلى الـ runtime backup.

**التوصية الثالثة:** استخدم PostgreSQL queue بدلاً من in-memory array للـ GitHub sync queue.
