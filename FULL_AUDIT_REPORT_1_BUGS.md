# تقرير الفحص الشامل - الجزء الأول: المشاكل والأعطال
## Full Audit Report 1: Bugs, Errors & Critical Issues

---

## 🔴 أخطاء حرجة (Critical Bugs)

### 1.1 صفحة تفاصيل القالب مفقودة (404)
| الملف | `app/templates/[slug]/page.tsx` |
|-------|-------------------------------|
| **الوصف** | الملف غير موجود نهائياً، لا يوجد له أي أثر في المجلد. عند زيارة `/templates/some-slug` يحصل المستخدم على صفحة 404 |
| **التأثير** | لا يمكن للمستخدمين رؤية تفاصيل أي قالب، فقط معاينة مباشرة (iframe) |
| **الحل** | إنشاء صفحة ملف تفاصيل القالب |

---

### 1.2 ثغرة أمنية في Middleware - التحقق من الجلسة لا يعمل مع "/"
| الملف | `middleware.ts:63` |
|-------|-------------------|
| **الوصف** | الماتشر `"/:code/ad_3399"` لا يغطي الرابط `"/:code/ad_3399/"` (trailing slash). أي طلب بـ slash في النهاية يتجاوز الميدل وير تماماً |
| **التأثير** | يمكن لأي مستخدم غير مصرح له الوصول إلى لوحة تحكم العميل عبر إضافة `/` في نهاية الرابط |
| **الحل** | إضافة `"/:code/ad_3399/:path?"` للماتشر أو إضافة قاعدة rewriter |

---

### 1.3 iframe بدون sandbox في الصفحة الرئيسية
| الملف | `app/page.tsx:355` |
|-------|-------------------|
| **الوصف** | الـ iframe يفتقر إلى خاصية `sandbox` ويسمح بصلاحيات `geolocation; notifications` |
| **التأثير** | يمكن للمحتوى المعروض في iframe تنفيذ سكريبتات، فتح popups، استخدام الـ geolocation للمستخدم، وإرسال إشعارات |
| **الحل** | إضافة `sandbox="allow-scripts allow-same-origin"` على الأقل |

---

### 1.4 Silent Preview bug مع Query Parameters مكررة
| الملف | `app/[code]/page.tsx:69` |
|-------|-------------------------|
| **الوصف** | عند تمرير باراميتر مكرر `?silentPreview=1&silentPreview=2`، يصبح `silentPreview` array `["1", "2"]` والمقارنة `["1","2"] === "1"` تفشل |
| **التأثير** | silent preview لا يعمل مع الباراميترات المكررة |
| **الحل** | استخدام `Array.isArray() ? arr[0] : val` وثم المقارنة |

---

### 1.5 ScrollReveal يقتل الـ badrNotify في Admin Dashboard
| الملف | `components/ScrollReveal.tsx:100-103` + `components/DashboardShell.tsx:190` |
|-------|----------------------------------------------------------------------------|
| **الوصف** | `ScrollReveal` يستبدل `window.badrNotify` بدالة لا تتعامل إلا مع `type === "error"`. كل استدعاءات `badrNotify` في DashboardShell من نوع `"info"` و `"success"` يتم تجاهلها بصمت |
| **التأثير** | إشعارات النجاح والمعلومات في لوحة التحكم لا تظهر أبداً للمستخدم. المستخدم لا يعلم إن كان الإجراء نجح أم لا |
| **الحل** | إما دمج النظامين أو استخدام Context بدلاً من window global |

---

### 1.6 Countdown - كشف خاطئ لـ PM
| الملف | `components/Countdown.tsx:42-43` |
|-------|----------------------------------|
| **الوصف** | الـ regex `(?:^|\s)م(?:\s|$)` يطابق أي كلمة تحتوي على حرف "م" بين مسافتين، وليس فقط مؤشر "مساءً". كلمة "من" أو "م" وحدها تسبب إضافة 12 ساعة |
| **التأثير** | توقيت العد التنازلي غير صحيح في حالات معينة، قد يظهر خطأ بمقدار 12 ساعة |
| **الحل** | استخدام `matchesArabicTime` بشكل أكثر تحديداً: `/(?:مساءً?|م)$/` أو البحث عن النمط الكامل للوقت |

---

### 1.7 Admin Layout لا يمنع الوصول غير المصرح به
| الملف | `app/admin/layout.tsx` |
|-------|------------------------|
| **الوصف** | الـ layout يتحقق من الجلسة ولكن لا يعيد توجيه (redirect) - فقط يخفي الـ sidebar. المحتوى (الداتا) يظهر للمستخدم غير المسجل |
| **التأثير** | أي زائر يمكنه رؤية جميع بيانات الداشبورد (الطلبات، الدعوات، العملاء، إلخ) بدون تسجيل دخول |
| **الحل** | إضافة `redirect("/admin/login")` عند فشل التحقق من الجلسة |

---

### 1.8 استدعاءات لوحة التحكم الرئيسية بدون Error Handling
| الملف | `app/admin/page.tsx:41` |
|-------|-------------------------|
| **الوصف** | `Promise.all` مع 5 استدعاءات بيانات بدون أي `.catch()`. إذا فشل أي استدعاء، الصفحة بأكملها تتعطل |
| **التأثير** | لوحة التحكم الرئيسية قد تظهر خطأ 500 عند أي مشكلة في قاعدة البيانات |
| **الحل** | إضافة try-catch أو .catch() لكل استدعاء على حدة مع fallbacks منفصلة |

---

### 1.9 ثغرة XSS في Guest Book API
| الملف | `app/api/admin/guest-book/route.ts:125-129` |
|-------|--------------------------------------------|
| **الوصف** | الـ `name` و `message` من formData يتم تخزينها مباشرة بدون sanitization. عند عرضها في صفحة الدعوة، يمكن تنفيذ سكريبتات ضارة |
| **التأثير** | أي زائر لدعوة مع رسالة ضارة قد يتعرض لهجوم XSS. المسؤول يمكنه زرع كود ضار في أي رسالة |
| **الحل** | إضافة HTML sanitization قبل التخزين (مثل DOMPurify) أو التشفير عند الإخراج |

---

### 1.10 ثغرة XSS في Client Messages API
| الملف | `app/api/admin/client-messages/route.ts:30` |
|-------|--------------------------------------------|
| **الوصف** | `title` و `body` من formData يتم تخزينها مباشرة بدون sanitization |
| **التأثير** | رسائل تحتوي على كود ضار يتم تخزينها وعرضها للعملاء |
| **الحل** | إضافة sanitization أو تشفير النصوص |

---

### 1.11 إفشاء Secret في رابط Cron
| الملف | `app/api/cron/backup/route.ts:22` |
|-------|-----------------------------------|
| **الوصف** | Cron secret يتم استقباله كـ query parameter في الرابط. هذا يعني ظهوره في server logs, CDN logs, وربما Referer headers |
| **التأثير** | إفشاء الـ cron secret يمكن أن يسمح لأي شخص بتشغيل النسخ الاحتياطية بدون تصريح |
| **الحل** | استقبال secret من headers فقط (`Authorization: Bearer`) مع log التحذير عن استخدام query parameters |

---

### 1.12 فشل التحقق من Content-Length القابل للتجاوز
| الملف | `app/api/orders/route.ts:116` |
|-------|-------------------------------|
| **الوصف** | `Number(request.headers.get("content-length") \|\| 0)` - إذا لم يتم إرسال content-length، القيمة تكون 0 ويتم تخطي الفحص |
| **التأثير** | يمكن إرسال ملفات ضخمة بدون تحديد الحجم، مما يسبب Out-of-Memory أو DoS |
| **الحل** | استخدام `request.body` مع ReadableStream محدود الحجم بدلاً من الاعتماد على content-length header |

---

### 1.13 Admin Login - Fallback لكلمة مرور نصية
| الملف | `app/api/auth/admin/login/route.ts:60-62` |
|-------|------------------------------------------|
| **الوصف** | عند عدم وجود hash لكلمة المرور، يتم استخدام مقارنة نصية `safeCompare(password, getAdminPassword())` |
| **التأثير** | كلمة المرور مخزنة بنص واضح في متغير البيئة - انتهاك أمني خطير |
| **الحل** | التأكد دائماً من وجود hash وتخزينه |

---

### 1.14 Pagination في Attendance يظهر فقط 10 صفحات
| الملف | `app/admin/attendance/page.tsx:256` |
|-------|--------------------------------------|
| **الوصف** | `Array.from(...).slice(0, 10)` يحدد عدد الصفحات المعروضة بـ 10 صفحات فقط |
| **التأثير** | المستخدم لا يمكنه الوصول للصفحات 11+ |
| **الحل** | إزالة `slice(0, 10)` واستخدام pagination ديناميكي أو pages显示的 كامل |

---

### 1.15 Order Form - Submit Timing معقد جداً
| الملف | `components/OrderForm.tsx:1460-1465` |
|-------|--------------------------------------|
| **الوصف** | المستخدم يجب أن ينتظر 700ms ثم يؤكد خلال ثانيتين. إذا تأخر أو أسرع، يظهر خطأ مربك |
| **التأثير** | تجربة مستخدم سيئة جداً في لحظة حاسمة (إرسال الطلب) |
| **الحل** | إزالة نظام timing المعقد أو تبسيطه |

---

### 1.16 Gallery Stories يفترض وجود JSON صحيح
| الملف | `components/InvitationExperience.tsx:341, 568-569` |
|-------|---------------------------------------------------|
| **الوصف** | `texts.galleryStories` يتم تعيينه مباشرة بدون التحقق من null، و `JSON.stringify` يستدعى عليه بدون null-safety |
| **التأثير** | خطأ في عرض JSON للمشاهد (stories) يمكن أن يكسر عرض معرض الصور |
| **الحل** | إضافة التحقق من القيمة مع fallback |

---

### 1.17 طلبات متعددة لـ getSiteSettings في نفس الصفحة
| الملف | `app/[code]/page.tsx:75,79,106,118-119` |
|-------|-----------------------------------------|
| **الوصف** | `getSiteSettings()` يستدعى 4 مرات في فروع مختلفة |
| **التأثير** | 4 استعلامات متكررة لنفس البيانات - إبطاء الأداء |
| **الحل** | استدعاء مرة واحدة وتخزين النتيجة |

---

### 1.18 N+1 Query في Live Mode صفحة
| الملف | `app/admin/live-mode/page.tsx:34-38` |
|-------|--------------------------------------|
| **الوصف** | لكل دعوة، يتم استعلام منفصل `getApprovedGuestBookMessages(invitation.code)` |
| **التأثير** | مع 100 دعوة، 101 استعلام لقاعدة البيانات |
| **الحل** | تجميع الاستعلامات أو استخدام batch query |

---

### 1.19 Missing alt text على الصور في Media و Pages
| الملف | `app/admin/media/page.tsx:133`, `app/admin/pages/page.tsx:133` |
|-------|---------------------------------------------------------------|
| **الوصف** | `alt=""` فارغ على الصور |
| **التأثير** | مشكلة وصول للمكفوفين، والصفحات لا تمر اختبارات SEO |
| **الحل** | إضافة وصف مناسب للصور |

---

## 🟠 مشاكل متوسطة (Medium Issues)

### 2.1 force-dynamic مكرر في Root Layout وصفحات منفردة
| الملف | `app/layout.tsx:9`, `app/page.tsx:54`, `app/[code]/page.tsx:20` |
|-------|---------------------------------------------------------------|
| **الوصف** | force-dynamic في root layout يلغي التخزين المؤقت لكل الصفحات. ثم يتكرر في الصفحات المنفردة |
| **التأثير** | لا استفادة من التخزين المؤقت لـ Next.js على الإطلاق |
| **الحل** | إزالة force-dynamic من layout والاحتفاظ به فقط في الصفحات التي تحتاجه حقاً |

---

### 2.2 new Date() داخل Sort Comparator
| الملف | `app/admin/invitations/page.tsx:98` |
|-------|------------------------------------|
| **الوصف** | إنشاء كائنات Date جديدة داخل دالة المقارنة O(n log n) مرات |
| **التأثير** | إبطاء الترتيب مع زيادة عدد الدعوات |
| **الحل** | تحويل التواريخ لرقم (timestamp) مرة واحدة خارج الـ sort |

---

### 2.3 layout.tsx لا يتحقق من null في siteName
| الملف | `app/layout.tsx:17,20` |
|-------|------------------------|
| **الوصف** | `settings.siteName` و `settings.seo.keywords` يمكن أن تكون undefined بدون fallback |
| **التأثير** | عنوان الصفحة يصبح `"%s | undefined"` واستدعاء `.split(",")` على undefined يرفع خطأ |
| **الحل** | إضافة fallback مثل `settings?.siteName ?? "BadrDaawa"` |

---

### 2.4 لا remotePatterns في next.config
| الملف | `next.config.ts:6-9` |
|-------|---------------------|
| **التوصيف** | لم يتم تعيين remotePatterns لـ next/image. إذا تم استخدام CDN خارجي للصور، next/image سيرفضها |
| **التأثير** | استخدام `<img>` بدلاً من `<Image>` يؤدي إلى فقدان الـ optimization |
| **الحل** | إضافة remotePatterns للسرفرات الخارجية المتوقعة |

---

### 2.5 فحص silentPreview ينهار مع array
| الملف | `app/[code]/page.tsx:69` - تفصيل في 1.4 |
|-------|----------------------------------------|

---

### 2.6 N+1 في Client Messages صفحة
| الملف | `app/admin/messages/page.tsx:104` |
|-------|-----------------------------------|
| **الوصف** | `invitations.find(...)` لكل رسالة داخل map - O(n²) |
| **التأثير** | إبطاء مع زيادة عدد الرسائل |
| **الحل** | استخدام Map للبحث: `new Map(invitations.map(i => [i.code, i]))` |

---

### 2.7 لا Pagination في معظم صفحات Admin
**الملفات**: `invitations/page.tsx`, `customers/page.tsx`, `messages/page.tsx`, `guest-book/page.tsx`, `check-ins/page.tsx`, `audit-log/page.tsx`, `errors/page.tsx`, `media/page.tsx`, `trash/page.tsx`
- كل البيانات تُحمل دفعة واحدة
- مع نمو قاعدة البيانات، ستكون الصفحات بطيئة جداً

---

### 2.8 لا CSRF Tokens في أي POST Form في Admin
**جميع صفحات Admin**:
- كل الفورم تستخدم `method="post"` بدون CSRF token
- الاعتماد فقط على `SameSite: Strict` الذي يمكن تجاوزه تحت ظروف معينة

---

### 2.9 Auth API يستخدم rate limiting في الذاكرة
| الملف | `app/api/auth/admin/login/route.ts:8-10` |
|-------|------------------------------------------|
| **الوصف** | Rate limit في Map داخل الذاكرة. يختفي عند إعادة تشغيل السيرفر ولا يشتغل عبر عدة instances |
| **التأثير** | في الإنتاج بعدة instances، يمكن تجاوز الـ rate limit بمقدار عدد الـ instances |
| **الحل** | استخدام Redis أو قاعدة بيانات مشتركة للتخزين المؤقت للـ rate limits |

---

### 2.10 silent error .catch(() => null) يخفي أخطاء الـ deduplication
| الملف | `app/api/orders/route.ts:235` |
|-------|-------------------------------|
| **الوصف** | `.catch(() => null)` يخفي أي خطأ في قاعدة البيانات أثناء التحقق من الـ duplicate |
| **التأثير** | يمكن إنشاء طلبات مكررة عند فشل قاعدة البيانات (عطل يخفي نفسه) |
| **الحل** | تسجيل الخطأ على الأقل `catch(e) { console.error(e); return null; }` |

---

### 2.11 radio buttons في البث 403 معلومات مفصلة
| الملف | `middleware.ts:13,19,27` |
|-------|--------------------------|
| **الوصف** | رسائل الخطأ تفصل سبب رفض الطلب "تم رفض الطلب بسبب مصدر غير موثوق" |
| **التأثير** | معلومات أمنية تساعد المهاجم |
| **الحل** | رسالة عامة "Forbidden" أو "403" |

---

### 2.12 لا يوجد validate على phone في order form
| الملف | `components/OrderForm.tsx:1844` |
|-------|--------------------------------|
| **الوصف** | حقل رقم الهاتف لا يوجد عليه validate رغم استخدامه لروابط WhatsApp |
| **التأثير** | روابط واتساب غير صحيحة لأرقام غير صالحة |
| **الحل** | إضافة pattern validate للرقم السعودي/المصري إلخ |

---

### 2.13 السكريت في Async admin operations fire-and-forget
| الملف | `app/api/admin/settings/route.ts:114` |
|-------|---------------------------------------|
| **الوصف** | `queueGitHubSync` بدون await أو error handling |
| **التأثير** | إذا فشل GitHub sync، لا يعلم المسؤول |
| **الحل** | إضافة try-catch وتسجيل الخطأ على الأقل |

---

### 2.14 إنشاء OrderRequest يستخدم outer try-catch غير فعال
| الملف | `app/api/orders/route.ts:200-302` |
|-------|-----------------------------------|
| **الوصف** | الـ outer try-catch يحيط فقط بكود بعد inner catch return. أي خطأ في Prisma لا يتم التقاطه |
| **التأثير** | خطأ غير معالج يؤدي إلى 500 Internal Server Error بدون رسالة واضحة |
| **الحل** | إعادة هيكلة كود الـ try-catch |

---

### 2.15 لا sanitization لـ search params في order page
| الملف | `app/order/page.tsx:58-77` |
|-------|----------------------------|
| **الوصف** | search params تنتقل مباشرة إلى `initialDraft` بدون sanitization |
| **التأثير** | إذا استخدم أي component `dangerouslySetInnerHTML`، فهذا XSS |
| **الحل** | إضافة validation/sanitization للقيم المستلمة من الرابط |

---

### 2.16 OrderForm - Idempotency key من جانب العميل
| الملف | `components/OrderForm.tsx:1473-1475` |
|-------|--------------------------------------|
| **الوصف** | يتم إنشاء idempotency key في المتصفح باستخدام `Date.now() + Math.random()` |
| **التأثير** | أي retry من العميل يولد key جديد، مما يلغي الـ idempotency |
| **الحل** | إنشاء الـ key من السيرفر وإعادته للعميل |

---

### 2.17 DashboardShell - badrNotify info/success لا يعمل
| الملف | `components/DashboardShell.tsx` مقارنة بـ `ScrollReveal.tsx:100-103` |
|-------|----------------------------------------------------------------------|
| **الوصف** | الـ badrNotify في DashboardShell يستخدم `type: "info"` و `type: "success"` ولكن ScrollReveal يكتب دالة تتعامل فقط مع `error` |
| **التأثير** | لا تظهر إشعارات النجاح والمعلومات أبداً |

---

### 2.18 أقسام الميزات في الصفحة الرئيسية غير قابلة للتعديل من CMS
| الملف | `app/page.tsx:293-294` |
|-------|------------------------|
| **الوصف** | عنوان الميزات hardcoded "المميزات ال هتاخدها في دعوت فرحك ✨" ولا يمكن تغييره من الإعدادات |
| **التأثير** | المسؤول لا يمكنه تعديل النص دون تعديل الكود |

---

### 2.19 GuestBook في Invitation يتم جلب البيانات حتى لو كان mode = disabled
| الملف | `components/GuestBook.tsx:36-50,94` |
|-------|------------------------------------|
| **الوصف** | يتم جلب الرسائل على mount بغض النظر عن الإعدادات، ثم يعيد null إذا كان mode disabled |
| **التأثير** | طلب API مهدر |

---

### 2.20 Gallery Stories في InviteGallery يعيد تعريف canUseOptimizedImage
| ملفات متعددة | `InviteGallery.tsx:50-52` و `InvitationExperience.tsx:60-62` |
|--------------|--------------------------------------------------------------|
| **الوصف** | نفس الدالة معرفة في مكانين. يجب مشاركتها |

---

### 2.21 إطار iframe للقوالب المخصصة يسمح لـ popups بالخروج من sandbox
| الملف | `components/InvitationExperience.tsx:603` |
|-------|------------------------------------------|
| **الوصف** | `allow-popups-to-escape-sandbox` يسمح للـ popups بالخروج من قيود الـ sandbox |
| **التأثير** | مخاطرة أمنية إذا كان القالب المخصص يحتوي على user-generated content |

---

### 2.22 لا exists check لـ Customer قبل إرسال ClientMessage
| الملف | `app/api/admin/client-messages/route.ts:24-25` |
|-------|-----------------------------------------------|
| **الوصف** | يجلب كل الدعوات للعثور على واحدة بدلاً من `prisma.invitation.findUnique` |
| **التأثير** | بطء مع زيادة عدد الدعوات |

---

## 🔵 مشاكل صغيرة (Minor Issues)

| # | الملف | المشكلة |
|---|-------|---------|
| 1 | `app/page.tsx:63-67` | أرقام سحرية hardcoded (`113`, `31640`) |
| 2 | `app/page.tsx:16` | أيقونات مكررة في `featureIcons` (SlidersHorizontal, Sparkles) |
| 3 | `app/admin/invitations/[code]/page.tsx:46-50` | إيموجي hardcoded في حالات الدعوة |
| 4 | `app/admin/guest-book/page.tsx:85` | إيموجي ❤️ في العنوان |
| 5 | `app/admin/invitations/[code]/page.tsx:173` | حد 12 ضيف فقط بدون "عرض المزيد" |
| 6 | `app/admin/invitations/[code]/page.tsx:204` | حد 8 رسائل فقط بدون "عرض المزيد" |
| 7 | `app/admin/customers/page.tsx:127` | زر تعطيل كلمة المرور معطل وبدون إجراء فعلي |
| 8 | `app/admin/customers/page.tsx:61` | زر إضافة عميل معطل وبدون إجراء فعلي |
| 9 | `app/admin/settings/page.tsx:88` | `contactPhones.join("\n")` بدون fallback إذا كان undefined |
| 10 | `components/Pagination.tsx:56,77,89` | روابط التنقل تعمل حتى مع `disabled` class و `aria-disabled` |
| 11 | `components/Countdown.tsx:45` | وقت افتراضي 8 مساءً إذا لم يتم تحديد وقت - غير مناسب لجميع الثقافات |
| 12 | `components/InviteMap.tsx:148-150` | طلب تحديد الموقع الجغرافي مباشرة على mount بدون consent |
| 13 | `components/OrderForm.tsx:1696` | `persistDraft` عند كل keystroke - استهلاك sessionStorage |
| 14 | `app/api/cron/backup/route.ts:19` | مقارنة strings بدون timing-safe |
| 15 | `app/api/admin/invitations/route.ts:61` | رسالة خطأ واحدة فقط لكل validation failures |
| 16 | `app/admin/pages/page.tsx:7-9` | `formatDate` بدون التحقق من صحة التاريخ (`Invalid Date`) |
| 17 | `app/order/page.tsx:265` | أيقونة `ArrowRight` في موقع RTL - السهم يشير لليمين بدلاً من اليسار |
| 18 | `app/admin/audit-log/page.tsx:43` | قص JSON عند 700 حرف بدون expand/collapse |
| 19 | `app/api/admin/backups/route.ts:18` | لا try-catch على `listBackupSnapshots` |
| 20 | `app/admin/settings/page.tsx:204` | حقل Media URL يعتمد على وضع المعاينة - يفقد القيمة عند تغيير الوضع |
