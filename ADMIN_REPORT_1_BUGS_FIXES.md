# تقرير إصلاح المشاكل والأعطال - لوحة الأدمن (Admin Panel)
## تاريخ الفحص: 18 يونيو 2026

---

## 🔴 مشاكل حرجة (Critical)

### 1. إعادة تعيين كلمة مرور العميل غير مفعلة
- **الملف:** `app/admin/customers/page.tsx:127`
- **الوصف:** زر "Reset Password" معطل (`disabled`) مع رسالة "تغيير كلمة مرور العميل غير مربوط بإجراء حالي."
- **الخطورة:** حرجة - لا يمكن للعميل استعادة حسابه أو إعادة تعيين كلمة السر عبر الأدمن
- **الحل:** تنفيذ API endpoint مخصص لإعادة تعيين كلمة مرور العميل

### 2. استعادة التعديلات (Recent Edits Restore) معطلة بالكامل
- **الملف:** `app/api/admin/recent-edits/restore/route.ts`
- **الوصف:** دائمًا يرجع `manual-restore-only` ولا يوجد أي مسار استعادة فعلي
- **الخطورة:** حرجة - لا يمكن استعادة البيانات المحذوفة من الواجهة
- **الحل:** إما إزالة الميزة أو تنفيذ استعادة آمنة

### 3. لا يوجد Pagination في معظم صفحات القوائم
- **الملفات:** `app/admin/invitations/page.tsx`, `app/admin/customers/page.tsx`, `app/admin/messages/page.tsx`, `app/admin/guest-book/page.tsx`
- **الوصف:** كل الصفحات تجلب ALL البيانات دفعة واحدة بدون pagination أو infinite scroll. مع نمو قاعدة البيانات سيؤدي إلى بطء شديد أو تعطل
- **الخطورة:** حرجة - مشكلة أداء مع نمو البيانات
- **الحل:** إضافة pagination لكل قوائم البيانات الكبيرة

### 4. AdminNotificationCenter و AdminMessagesBanner يستخدمون polling بدون fallback
- **الملفات:** `components/AdminNotificationCenter.tsx`, `components/DashboardShell.tsx`
- **الوصف:** يعتمدون على setInterval للـ polling بدون تحديد أقصى وقت أو fallback عند الفشل
- **الخطورة:** عالية - استهلاك موارد الشبكة باستمرار
- **الحل:** إضافة retry logic، max interval، WebSocket بديل

### 5. No input validation/sanitization on some form fields
- **الملفات المتعددة:** بعض حقول الإدخال تفتقر إلى التحقق من الصحة في client-side
- **الوصف:** بالرغم من وجود CSRF origin check، بعض الحقول قد تسمح بـ XSS
- **الخطورة:** عالية
- **الحل:** إضافة sanitization للبيانات النصية

---

## 🟡 مشاكل متوسطة (Medium)

### 6. تكرار إعدادات المعاينة (Preview)
- **الملفات:** `app/admin/settings/page.tsx` و `app/admin/preview/page.tsx`
- **الوصف:** إعدادات المعاينة موجودة في صفحتين مختلفتين مما يسبب ارتباكًا وعدم اتساق
- **الحل:** دمج الصفحتين أو إزالة الإعدادات المكررة من صفحة الإعدادات العامة

### 7. Sync-status و sync (endpoints متكررة)
- **الملفات:** `app/api/admin/sync-status/route.ts` و `app/api/admin/sync/status/route.ts`
- **الوصف:** وظيفتان متطابقتان (GET) ترجعان نفس البيانات
- **الحل:** توحيد endpoint واحد

### 8. Mix بين form data و JSON في API routes
- **الملفات:** `app/api/admin/orders/[id]/route.ts`, `app/api/admin/invitations/[code]/route.ts`
- **الوصف:** بعض endpoints تدعم form data و JSON معًا مما يزيد التعقيد واحتمال الأخطاء
- **الحل:** اختيار standard واحد (JSON يفضل)

### 9. No TypeScript strict mode
- **الملف:** `tsconfig.json`
- **الوصف:** المشروع لا يستخدم strict mode مما يسمح بأخطاء types صامتة
- **الحل:** تفعيل strict mode وإصلاح الأخطاء

### 10. AdminInvitationWizard (1553 سطر) كبير جدًا
- **الملف:** `components/AdminNewInvitationWizard.tsx`
- **الوصف:** مكون ضخم جدًا يصعب صيانته وتطويره
- **الحل:** تقسيمه لمكونات أصغر

### 11. AdminOrderRequestsManager (996 سطر) كبير جدًا
- **الملف:** `components/AdminOrderRequestsManager.tsx`
- **الوصف:** مكون ضخم يحتوي على tabs متعددة مع form submission
- **الحل:** تقسيمه لمكونات منفصلة

### 12. AdminInvitationTools (476 سطر) كبير
- **الملف:** `components/AdminInvitationTools.tsx`
- **الحل:** تقسيم المنطق

### 13. بعض البيانات المحذوفة لا يتم تنظيفها بالكامل
- **الملف:** `app/admin/trash/page.tsx`
- **الوصف:** الحذف النهائي يحتاج متغيرات بيئة أو تأكيد لكن بعض العناصر المرتبطة قد تبقى
- **الحل:** إضافة cascade delete كامل

---

## 🟢 مشاكل بسيطة (Low)

### 14. لا يوجد زر "رجوع" في معظم الصفحات
- **الوصف:** معظم صفحات التفاصيل (زي invitation detail) تفتقر إلى breadcrumbs
- **الحل:** إضافة breadcrumbs موحدة

### 15. DashboardShell لا يعرض breadcrumbs بشكل ثابت
- **الملف:** `components/DashboardShell.tsx`
- **الوصف:** الـ breadcrumbs موجودة لكنها read-only ومضمنة في الـ component
- **الحل:** جعلها ديناميكية

### 16. Admin Login لا يسجل محاولات الدخول الفاشلة
- **الملف:** `app/api/auth/admin/login/route.ts`
- **الوصف:** لا يوجد Audit log لمحاولات login الفاشلة
- **الحل:** إضافة تسجيل لمحاولات الدخول

### 17. AdminDarkShell layout يستخدم `div` بدلاً من `section` أو `main`
- **الملف:** `app/admin/layout.tsx`
- **الوصف:** عدم استخدام semantic HTML
- **الحل:** استخدام `<main>` element

### 18. بعض التواريخ تستخدم Cairo timezone hardcoded
- **الوصف:** `timeZone: "Africa/Cairo"` في كثير من صفحات التنسيق
- **الحل:** جعل الـ timezone قابلة للتكوين من الإعدادات

### 19. media-cleanup لا يتحقق من الملفات المفتوحة/قيد الاستخدام
- **الملف:** `lib/media-cleanup.ts`
- **الوصف:** قد يحذف ملفات ما زالت قيد الرفع أو المعالجة
- **الحل:** إضافة lock files أو checksum verification قبل الحذف

### 20. Favorites تستخدم localStorage غير متاح في Server Components
- **الملف:** `lib/admin-favorites.ts`
- **الوصف:** المفضلة مخزنة في قاعدة البيانات لكن الواجهة قد تعتمد على client
- **الحل:** توحيد طريقة التخزين
