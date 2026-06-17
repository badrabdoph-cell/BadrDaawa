# تقرير الفحص الشامل - الجزء الثاني: التحسينات
## Full Audit Report 2: Improvements (Per Section)

---

## 1. تحسينات الصفحة الرئيسية (Homepage)

### تجربة المستخدم
- [ ] إضافة معرض للدعوات المنشورة فعلياً بدلاً من المعاينة الثابتة
- [ ] إضافة شريط تمرير لآخر الدعوات المنشورة
- [ ] إضافة قسم "قصص نجاح" (شهادات العملاء)
- [ ] جعل عناوين الأقسام (مثل "المميزات") قابلة للتعديل من CMS

### الأداء
- [ ] استخراج inline `<style>` إلى CSS module خارجي
- [ ] تخزين أرقام الإحصائيات مؤقتاً بدلاً من جلبها في كل طلب
- [ ] إضافة Lazy Loading للصور في قسم المعرض

### الأمان
- [ ] إضافة `sandbox` للـ iframe مع الحد الأدنى من الصلاحيات
- [ ] عدم إظهار template slug في data attributes

### المحتوى
- [ ] إزالة الأيقونات المكررة من `featureIcons`
- [ ] جعل أرقام الإحصائيات قابلة للتعديل من CMS
- [ ] إضافة قسم FAQ مباشر في الصفحة الرئيسية

### الـ SEO
- [ ] إضافة h1 منفصل وذي معنى في hero section
- [ ] تحسين structured data للموقع
- [ ] إرفاق a سريعة للـ sitemap

---

## 2. تحسينات القوالب (Templates)

### تجربة المستخدم
- [ ] **إنشاء صفحة تفاصيل القالب** (`app/templates/[slug]/page.tsx`) - الأهم
- [ ] إضافة معاينة حية داخل الصفحة (بدلاً من iframe منفصل)
- [ ] إضافة مقارنة بين القوالب
- [ ] إضافة قسم الأسئلة الشائعة لكل قالب
- [ ] إظهار أيقونات توضيحية للـ style/layout

### الأداء
- [ ] إضافة pagination أو infinite scroll للقوالب
- [ ] تخزين صور القوالب مؤقتاً (CDN)
- [ ] تحميل preview images بشكل Lazy

### التقنية
- [ ] إضافة width/height لصور الـ TemplateCard لمنع CLS
- [ ] التأكد من وجود `card-preview.svg` لكل قالب أو استخدام fallback

---

## 3. تحسينات نموذج الطلب (Order Form)

### تجربة المستخدم
- [ ] **تبسيط آلية التأكيد النهائي** (حذف نظام الـ 700ms/2s)
- [ ] إضافة مؤشر تقدم أكثر وضوحاً (progress steps)
- [ ] إضافة معاينة حية عند اختيار القالب
- [ ] السماح بالرجوع للخطوات السابقة بدون فقدان البيانات
- [ ] إضافة اقتراحات ذكية عند كتابة اسم العريس/العروس

### الأداء
- [ ] تقليل استدعاءات `persistDraft` (debounce بدلاً من كل keystroke)
- [ ] تحسين رفع الصور (ضغط قبل الرفع، رفع متوازي)

### الصحة
- [ ] إضافة validation لرقم الهاتف
- [ ] إضافة validation للصورة (الحجم، النوع)
- [ ] إضافة التحقق من صحة التاريخ والوقت

### الأمان
- [ ] تحسين idempotency key (إنشاء من السيرفر)
- [ ] Sanitize الـ search params

---

## 4. تحسينات عرض الدعوة (Invitation Page [code])

### تجربة المستخدم
- [ ] إضافة تأثيرات انتقالية بين أقسام الدعوة
- [ ] إضافة شريط تقدم لقراءة الدعوة
- [ ] إضافة زر "حفظ الدعوة" (للإضافة للتقويم)
- [ ] إضافة خيار "مشاركة الدعوة" مباشرة
- [ ] تحسين تجربة عدّاد الوقت (Countdown)

### الأداء
- [ ] جعل `recordInvitationView` غير متزامن (fire-and-forget)
- [ ] استدعاء `getSiteSettings` مرة واحدة فقط
- [ ] تقليل عدد الـ waterfalls في تحميل البيانات
- [ ] إضافة `loading="lazy"` للصور في المعرض

### الصحة
- [ ] إصلاح خطأ التعامل مع `silentPreview` كمصفوفة
- [ ] إضافة error fallback للقالب المحذوف

### الـ SEO
- [ ] تحسين الـ structured data للدعوات
- [ ] إضافة breadcrumbs

---

## 5. تحسينات لوحة تحكم المسؤول (Admin Login/Auth)

### الأمان
- [x] **إضافة redirect للجلسات غير المصرح بها** (الموجود حالياً مجرد إخفاء sidebar)
- [ ] إضافة rate limiting مستمر (Redis أو قاعدة بيانات)
- [ ] إضافة 2FA اختياري
- [ ] تسجيل محاولات الدخول الفاشلة
- [ ] إضافة CSP headers أقوى
- [ ] إضافة CSRF tokens لجميع الـ POST forms

### تجربة المستخدم
- [ ] إضافة "تذكرني" (Remember Me)
- [ ] إضافة توثيق بالبريد الإلكتروني (OTP)
- [ ] إضافة شاشة تحميل أفضل أثناء التحقق

---

## 6. تحسينات لوحة التحكم الرئيسية (Admin Dashboard)

### تجربة المستخدم
- [ ] إضافة رسوم بيانية تفاعلية (بدلاً من الأعمدة النصية)
- [ ] إضافة إحصائيات في الوقت الحقيقي
- [ ] إضافة خيار تخصيص الـ dashboard (widgets قابلة للسحب)
- [ ] إضافة تنبيهات ذكية (طلبات تحتاج مراجعة، أخطاء)
- [ ] إضافة زر "إجراء سريع" (Quick Actions)

### الأداء
- [ ] استبدال `Promise.all` بدون `.catch()` بـ per-promise error handling
- [ ] إضافة pagination لجميع قوائم البيانات
- [ ] تقليل جلب البيانات غير الضرورية (مثل كل guest book messages لحساب count)

### التقنية
- [ ] إزالة إيموجي hardcoded واستخدام CSS classes
- [ ] إضافة مصفوفات بحث بدلاً من `Array.find` داخل loops

---

## 7. تحسينات الطلبات (Orders)

### تجربة المستخدم
- [ ] إضافة إشعارات فورية للطلبات الجديدة
- [ ] إضافة خيار تغيير حالة الطلب من نفس الصفحة (Inline editing)
- [ ] إضافة خيار إرسال رسالة جماعية للعملاء بحالة معينة
- [ ] إضافة خاصية "الطلبات العاجلة" (للتذكير بالمواعيد القريبة)
- [ ] إضافة تقويم لعرض حفلات الزفاف حسب الشهر

### الأداء
- [ ] Pagination للطلبات
- [ ] إضافة filtering من السيرفر (بدلاً من client-side)
- [ ] إضافة sort من السيرفر

### التقنية
- [ ] تحسين `getInvitationManagePath` مع error handling
- [ ] تحسين `Date.parse("")` fallback

---

## 8. تحسينات الدعوات (Invitations in Admin)

### تجربة المستخدم
- [ ] إضافة معاينة حية أثناء التعديل
- [ ] إضافة drag-and-drop لترتيب معرض الصور
- [ ] إضافة نسخ دعوة موجودة (clone)
- [ ] إضافة دفع جماعي لعدة دعوات للـ PUBLISHED
- [ ] إضافة إشعارات عند إنشاء الدعوة

### الأداء
- [ ] Server-side sort و filter
- [ ] Pagination
- [ ] تحسين `new Date()` داخل sort comparator

### التقنية
- [ ] التحقق من صحة `code` (decodeURIComponent)
- [ ] إضافة "show more" للضيوف والرسائل

---

## 9. تحسينات العملاء (Customers)

### تجربة المستخدم
- [ ] تفعيل زر "إضافة عميل" (حالياً معطل)
- [ ] تفعيل زر "تغيير كلمة المرور" (حالياً معطل)
- [ ] إضافة إحصائيات لكل عميل (عدد الدعوات، الحالة)
- [ ] إضافة خيار إرسال رسائل جماعية للعملاء
- [ ] إضافة خاصية البحث المتقدم في العملاء

### الأداء
- [ ] Pagination
- [ ] Server-side search

### التقنية
- [ ] إضافة تأكيد حذف العميل
- [ ] إضافة soft-delete verification

---

## 10. تحسينات الإعدادات (Settings)

### تجربة المستخدم
- [ ] إضافة معاينة حية للتغييرات (SEO، social links)
- [ ] إضافة زر "إعادة التعيين للإعدادات الافتراضية"
- [ ] إضافة history للتغييرات (من قام بالتغيير ومتى)
- [ ] تبويب الإعدادات (General, SEO, Social, Contact)

### الأمان
- [ ] إضافة CSRF token للـ form
- [ ] إضافة validation لجميع الحقول (URL, Email, phones)
- [ ] إضافة تأكيد للتغييرات المهمة

### التقنية
- [ ] عدم فقدان URL الآخر عند تغيير وضع المعاينة
- [ ] إضافة error handling لـ `queueGitHubSync`

---

## 11. تحسينات التحليلات (Analytics)

### تجربة المستخدم
- [ ] إضافة رسوم بيانية تفاعلية
- [ ] إضافة تقارير PDF/Excel قابلة للتحميل
- [ ] إضافة مقارنة بالفترات السابقة
- [ ] إضافة توقعات (Forecasting)
- [ ] إضافة heatmap للزوار حسب الوقت

### التقنية
- [ ] إضافة error handling للـ data fetching
- [ ] تحسين حساب `maxGrowth` للأراي الفارغة
- [ ] إضافة cache للتقارير

---

## 12. تحسينات النسخ الاحتياطي (Backups)

### تجربة المستخدم
- [ ] إضافة جدول زمني للنسخ الاحتياطية
- [ ] إضافة إشعارات عند فشل النسخ
- [ ] إضافة مقارنة بين النسخ (Diff)
- [ ] إضافة خاصية "Flashback" (معاينة حالة الموقع من نسخة سابقة)

### التقنية
- [ ] إضافة Pagination لسجل النسخ
- [ ] إضافة optional chaining في `healthLevel`
- [ ] عدم السماح بـ ALLOW_DESTRUCTIVE_RESTORE لأي قيمة truthy

---

## 13. تحسينات الوسائط (Media)

### تجربة المستخدم
- [ ] إضافة معرض شبكي (Grid view) بدلاً من القائمة
- [ ] إضافة خاصية البحث في الملفات
- [ ] إضافة تصنيف الملفات (Images, Videos, Documents)
- [ ] إضافة رفع متعدد للملفات (Drag & Drop)
- [ ] إضافة معاينة للصور بتكبير (Lightbox)

### التقنية
- [ ] إضافة alt text للصور
- [ ] استخدام مفاتيح فريدة لـ React (غير URL)
- [ ] إضافة validation لـ `file.kind`

---

## 14. تحسينات الموسيقى (Music)

### تجربة المستخدم
- [ ] إضافة معاينة مسموعة قبل التحميل/الاختيار
- [ ] إضافة تصنيف الموسيقى (أفراح، خلفية، دينية)
- [ ] إضافة خاصية البحث
- [ ] إضافة علامات (Tags) للمقطوعات

### التقنية
- [ ] إضافة تأكيد للحذف
- [ ] عدم إظهار track ID في URL

---

## 15. تحسينات الرسائل (Messages)

### تجربة المستخدم
- [ ] إضافة محادثة مباشرة (Chat) بدلاً من الرسائل الأحادية
- [ ] إضافة إشعارات فورية
- [ ] إضافة خاصية الرد السريع (Quick Replies)
- [ ] إضافة قوالب رسائل قابلة للتخصيص

### الأداء
- [ ] Pagination للرسائل
- [ ] استخدام Map للبحث عن الدعوات بدلاً من find

---

## 16. تحسينات سجل الزوار (Guest Book)

### تجربة المستخدم
- [ ] إضافة تحليلات للرسائل (word cloud، أكثر الكلمات استخداماً)
- [ ] إضافة ردود من العرسان على الرسائل
- [ ] إضافة تصفية حسب التاريخ/الحالة
- [ ] إضافة معرض للصور المرفوعة مع الرسائل

### الأداء
- [ ] Pagination
- [ ] Server-side filtering

### التقنية
- [ ] إضافة XSS sanitization
- [ ] إضافة CSRF tokens

---

## 17. تحسينات Attendance و Check-ins

### تجربة المستخدم
- [ ] إضافة جداول تفاعلية (DataTables)
- [ ] إضافة تقارير إحصائية مرئية
- [ ] إضافة خيار طباعة بطاقات الضيوف
- [ ] إضافة QR code لكل ضيف للتحقق

### التقنية
- [ ] إزالة حد 10 صفحات (Pagination كامل)
- [ ] Server-side filtering للبيانات

---

## 18. تحسينات Live Mode و Broadcast

### تجربة المستخدم
- [ ] إضافة دعم البث المباشر (YouTube Live, Facebook Live)
- [ ] إضافة غرفة دردشة حية مع الضيوف
- [ ] إضافة إشعارات للأحداث المباشرة
- [ ] إضافة تفاعلات (إعجابات، تفاعلات)

### التقنية
- [ ] إزالة N+1 query
- [ ] إضافة Pagination للدعوات
- [ ] استخدام WebSocket بدلاً من polling

---

## 19. تحسينات المزامنة (Sync)

### تجربة المستخدم
- [ ] إضافة دعم للمزامنة التلقائية عند التغيير
- [ ] إضافة إشعارات عند فشل المزامنة
- [ ] إضافة تاريخ المزامنة مع إمكانية التراجع
- [ ] إضافة مقارنة النسخ المحلية مع GitHub

### التقنية
- [ ] إضافة error handling
- [ ] إضافة status check منتظم

---

## 20. تحسينات المكونات المشتركة (Shared Components)

### Pagination
- [ ] إضافة `event.preventDefault()` عند استخدام `onPageChange`
- [ ] تعطيل الروابط مع `disabled` بشكل صحيح
- [ ] تحسين استخراج origin من URL

### Toast/Notifications
- [ ] توحيد نظام الإشعارات (إزالة التناقض بين ScrollReveal و DashboardShell)
- [ ] إضافة أزرار إجراء في الإشعارات
- [ ] إضافة مدة عرض قابلة للتخصيص

### ConfirmDialog
- [ ] إضافة focus trap
- [ ] إعادة التركيز للعنصر الذي فتح الحوار بعد الإغلاق
- [ ] إضافة زر ESC للإغلاق

### ScrollReveal
- [ ] فصل الـ badrNotify عن الـ ScrollReveal
- [ ] إضافة IntersectionObserver بدلاً من scroll events
- [ ] تحسين أداء MutationObserver (debounce)

### Countdown
- [ ] تحسين كشف PM/AM العربي (regex أكثر دقة)
- [ ] إضافة fallback أفضل للتاريخ والوقت
- [ ] إضافة timezone support

### GuestTable
- [ ] إضافة رسالة مسبقة في رابط WhatsApp
- [ ] إضافة Pagination/Virtualization
- [ ] تحسين عرض Invalid Date

### InviteMap
- [ ] طلب الموقع الجغرافي بعد موافقة المستخدم (وليس على mount)
- [ ] إضافة error handling أفضل للـ share
- [ ] دعم Google Maps short links

### ImageCropUploader
- [ ] استخدام Blob بدلاً من Data URL (لتوفير الذاكرة)
- [ ] تحسين Race Condition في `queueOptimize`
- [ ] إزالة side effects من `setItems` callback

---

## 21. تحسينات المكونات الخلفية (Lib / Server)

### db.ts
- [ ] إضافة connection pooling مع Prisma
- [ ] إضافة retry logic للاتصال
- [ ] إضافة health check دوري

### security-enhancements.ts
- [ ] إضافة CSRF token generation
- [ ] تحسين rate limiting (Redis بدلاً من in-memory)
- [ ] إضافة XSS sanitization function
- [ ] إضافة request size limiting

### validation.ts
- [ ] إضافة Zod schemas لجميع API endpoints
- [ ] إضافة validation للـ phone numbers
- [ ] إضافة validation للـ URLs
- [ ] إضافة validation لـ file uploads (type, size, dimensions)

### github-sync.ts
- [ ] إضافة rate limiting لـ GitHub API
- [ ] إضافة retry with backoff
- [ ] إضافة diff preview قبل المزامنة

### storage-provider.ts
- [ ] إضافة S3/R2 support كامل
- [ ] إضافة file compression
- [ ] إضافة CDN purging

---

## 22. تحسينات هيكلية شاملة (Cross-Cutting)

### الأداء
- [ ] **إزالة** `force-dynamic` من root layout - يلغي كل cache
- [ ] إضافة ISR (Incremental Static Regeneration) للصفحات العامة
- [ ] إضافة CDN للصور والملفات الثابتة
- [ ] إضافة Redis caching layer للاستعلامات المتكررة
- [ ] تحسين lazy loading للصور
- [ ] إضافة bundle analysis وتقليل الحجم

### TypeScript
- [ ] إضافة strict mode في tsconfig
- [ ] تعريف أنواع لجميع API responses
- [ ] إضافة generics للـ data fetching patterns
- [ ] إزالة `any` types

### إدارة الأخطاء
- [ ] إضافة global error boundary مع تفاصيل مفيدة
- [ ] توحيد تنسيق errors API (ErrorResponse type)
- [ ] إضافة error logging server-side (Sentry أو custom)
- [ ] إضافة toast notifications شاملة لجميع الأخطاء

### الأمان
- [ ] إضافة Helmet-like headers
- [ ] إضافة Content Security Policy (CSP)
- [ ] إضافة rate limiting لجميع API endpoints
- [ ] إضافة CSRF protection كامل
- [ ] إضافة input validation شامل
- [ ] إضافة XSS sanitization لكل user input
- [ ] إضافة SQL injection protection (Prisma يفعل ذلك جزئياً)

### التوثيق
- [ ] إضافة API documentation (OpenAPI/Swagger)
- [ ] إضافة JSDoc للوظائف الهامة
- [ ] إضافة README محدث لكل مجلد رئيسي
- [ ] إضافة changelog

### الاختبارات
- [ ] إضافة unit tests للمكونات
- [ ] إضافة integration tests للـ API
- [ ] إضافة E2E tests لتدفقات المستخدم الرئيسية
- [ ] إضافة Lighthouse CI للـ performance monitoring
- [ ] إنشاء test coverage report

### الـ SEO
- [ ] تحسين meta tags لكل صفحة
- [ ] إضافة Open Graph و Twitter Cards
- [ ] إضافة pages missing في الـ sitemap
- [ ] تحسين Core Web Vitals (LCP, CLS, INP)
- [ ] إضافة breadcrumbs structured data

### التوطين (i18n)
- [ ] استخراج جميع النصوص إلى ملفات لغوية
- [ ] إضافة دعم اللغة الإنجليزية
- [ ] إضافة دعم RTL/LTR التلقائي
- [ ] إضافة مترجم آلي (باستخدام API)

### إمكانية الوصول (Accessibility)
- [ ] إضافة aria-labels لجميع الأزرار
- [ ] تحسين contrast ratio
- [ ] إضافة keyboard navigation
- [ ] إضافة screen reader announcements
- [ ] إضافة focus indicators
