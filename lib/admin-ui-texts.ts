import { unstable_noStore as noStore } from "next/cache";
import { readAppSetting, writeAppSetting } from "./app-settings";

const ADMIN_UI_TEXTS_KEY = "project-content:admin-ui-texts";

export type AdminUiTextEntry = {
  id: string;
  group: string;
  title: string;
  text: string;
};

const defaultAdminTexts: AdminUiTextEntry[] = [
  // Dashboard Shell - Sidebar Sections
  { id: "sidebar.section.invitations", group: "الشريط الجانبي", title: "قسم الدعوات", text: "الدعوات" },
  { id: "sidebar.section.customers", group: "الشريط الجانبي", title: "قسم العملاء", text: "العملاء" },
  { id: "sidebar.section.events", group: "الشريط الجانبي", title: "قسم الفعاليات", text: "الفعاليات" },
  { id: "sidebar.section.content", group: "الشريط الجانبي", title: "قسم المحتوى", text: "المحتوى" },
  { id: "sidebar.section.cleanup", group: "الشريط الجانبي", title: "قسم التنظيف", text: "التنظيف والصيانة" },
  { id: "sidebar.section.sync", group: "الشريط الجانبي", title: "قسم النسخ", text: "النسخ والمزامنة" },
  { id: "sidebar.section.system", group: "الشريط الجانبي", title: "قسم الإعدادات", text: "الإعدادات والنظام" },
  { id: "sidebar.section.workspace", group: "الشريط الجانبي", title: "قسم مساحة العمل", text: "مساحة العمل" },

  // Dashboard Shell - Section Descriptions
  { id: "sidebar.description.invitations", group: "الشريط الجانبي", title: "وصف قسم الدعوات", text: "إنشاء ومتابعة الدعوات والطلبات" },
  { id: "sidebar.description.customers", group: "الشريط الجانبي", title: "وصف قسم العملاء", text: "حسابات العملاء والتواصل والملاحظات" },
  { id: "sidebar.description.events", group: "الشريط الجانبي", title: "وصف قسم الفعاليات", text: "الحضور والتحليلات وتشغيل يوم الفرح" },
  { id: "sidebar.description.content", group: "الشريط الجانبي", title: "وصف قسم المحتوى", text: "القوالب والوسائط والصفحات العامة" },
  { id: "sidebar.description.cleanup", group: "الشريط الجانبي", title: "وصف قسم التنظيف", text: "تنظيف وتحسين وأداء النظام" },
  { id: "sidebar.description.sync", group: "الشريط الجانبي", title: "وصف قسم النسخ", text: "النسخ الاحتياطي وGitHub والمهام" },
  { id: "sidebar.description.system", group: "الشريط الجانبي", title: "وصف قسم الإعدادات", text: "الإشعارات والمراقبة والسجلات" },
  { id: "sidebar.description.workspace", group: "الشريط الجانبي", title: "وصف مساحة العمل", text: "بحث ومفضلة وروابط يومية" },

  // Dashboard Shell - Sidebar Links
  { id: "sidebar.link.home", group: "الشريط الجانبي", title: "رابط الرئيسية", text: "الرئيسية" },
  { id: "sidebar.link.invitations", group: "الشريط الجانبي", title: "رابط الدعوات المنشورة", text: "الدعوات المنشورة" },
  { id: "sidebar.link.orders", group: "الشريط الجانبي", title: "رابط الدعوات المعلقة", text: "الدعوات المعلقة" },
  { id: "sidebar.link.new-invitation", group: "الشريط الجانبي", title: "رابط إنشاء دعوة", text: "إنشاء دعوة" },
  { id: "sidebar.link.customers", group: "الشريط الجانبي", title: "رابط العملاء", text: "العملاء" },
  { id: "sidebar.link.messages", group: "الشريط الجانبي", title: "رابط الرسائل", text: "الرسائل" },
  { id: "sidebar.link.guest-book", group: "الشريط الجانبي", title: "رابط التهاني", text: "التهاني" },
  { id: "sidebar.link.message-templates", group: "الشريط الجانبي", title: "رابط قوالب الرسائل", text: "قوالب الرسائل" },
  { id: "sidebar.link.attendance", group: "الشريط الجانبي", title: "رابط الحضور", text: "الحضور" },
  { id: "sidebar.link.check-ins", group: "الشريط الجانبي", title: "رابط تسجيل الوصول", text: "تسجيل الوصول" },
  { id: "sidebar.link.live-mode", group: "الشريط الجانبي", title: "رابط البث المباشر", text: "البث المباشر" },
  { id: "sidebar.link.analytics", group: "الشريط الجانبي", title: "رابط التحليلات", text: "التحليلات" },
  { id: "sidebar.link.templates", group: "الشريط الجانبي", title: "رابط القوالب", text: "القوالب" },
  { id: "sidebar.link.music", group: "الشريط الجانبي", title: "رابط الموسيقى", text: "الموسيقى" },
  { id: "sidebar.link.media", group: "الشريط الجانبي", title: "رابط الوسائط", text: "الوسائط" },
  { id: "sidebar.link.pages", group: "الشريط الجانبي", title: "رابط الصفحات", text: "الصفحات" },
  { id: "sidebar.link.preview", group: "الشريط الجانبي", title: "رابط المعاينة", text: "المعاينة" },
  { id: "sidebar.link.content-presets", group: "الشريط الجانبي", title: "رابط النصوص الجاهزة", text: "النصوص الجاهزة" },
  { id: "sidebar.link.legal", group: "الشريط الجانبي", title: "رابط الصفحات القانونية", text: "الصفحات القانونية" },
  { id: "sidebar.link.broadcast", group: "الشريط الجانبي", title: "رابط شاشة البث", text: "شاشة البث" },
  { id: "sidebar.link.cleanup", group: "الشريط الجانبي", title: "رابط مركز التنظيف", text: "مركز التنظيف" },
  { id: "sidebar.link.scan", group: "الشريط الجانبي", title: "رابط الفحص الشامل", text: "الفحص الشامل" },
  { id: "sidebar.link.database", group: "الشريط الجانبي", title: "رابط قاعدة البيانات", text: "قاعدة البيانات" },
  { id: "sidebar.link.trash", group: "الشريط الجانبي", title: "رابط سلة المهملات", text: "سلة المهملات" },
  { id: "sidebar.link.sync", group: "الشريط الجانبي", title: "رابط مركز النسخ", text: "مركز النسخ والمزامنة" },
  { id: "sidebar.link.backups", group: "الشريط الجانبي", title: "رابط النسخ الاحتياطي", text: "النسخ الاحتياطي" },
  { id: "sidebar.link.emergency", group: "الشريط الجانبي", title: "رابط طوارئ", text: "طوارئ" },
  { id: "sidebar.link.sync-history", group: "الشريط الجانبي", title: "رابط سجل GitHub", text: "سجل GitHub" },
  { id: "sidebar.link.sync-settings", group: "الشريط الجانبي", title: "رابط إعدادات GitHub", text: "GitHub" },
  { id: "sidebar.link.tasks", group: "الشريط الجانبي", title: "رابط المهام المجدولة", text: "المهام المجدولة" },
  { id: "sidebar.link.site-settings", group: "الشريط الجانبي", title: "رابط إعدادات الموقع", text: "إعدادات الموقع" },
  { id: "sidebar.link.photographer-logo", group: "الشريط الجانبي", title: "رابط شعار المصور", text: "شعار المصور" },
  { id: "sidebar.link.notifications", group: "الشريط الجانبي", title: "رابط الإشعارات", text: "الإشعارات" },
  { id: "sidebar.link.system-health", group: "الشريط الجانبي", title: "رابط صحة النظام", text: "صحة النظام" },
  { id: "sidebar.link.errors", group: "الشريط الجانبي", title: "رابط الأخطاء", text: "الأخطاء" },
  { id: "sidebar.link.audit-log", group: "الشريط الجانبي", title: "رابط السجل", text: "السجل" },
  { id: "sidebar.link.recent-edits", group: "الشريط الجانبي", title: "رابط التعديلات الأخيرة", text: "التعديلات الأخيرة" },
  { id: "sidebar.link.search", group: "الشريط الجانبي", title: "رابط البحث العام", text: "البحث العام" },
  { id: "sidebar.link.favorites", group: "الشريط الجانبي", title: "رابط المفضلة", text: "المفضلة" },

  // Dashboard Home Page
  { id: "dashboard.hero.eyebrow", group: "لوحة التحكم", title: "شعار الرئيسية", text: "الرئيسية" },
  { id: "dashboard.hero.title", group: "لوحة التحكم", title: "عنوان الرئيسية", text: "مركز إدارة المنصة" },
  { id: "dashboard.hero.description", group: "لوحة التحكم", title: "وصف الرئيسية", text: "نظرة تشغيلية واحدة للطلبات والدعوات والحضور والنسخ الاحتياطي حتى تبدأ قرارك من الرقم الصحيح." },
  { id: "dashboard.hero.new-orders", group: "لوحة التحكم", title: "زر الطلبات الجديدة", text: "الطلبات الجديدة" },
  { id: "dashboard.hero.create-invitation", group: "لوحة التحكم", title: "زر إنشاء دعوة", text: "إنشاء دعوة" },
  { id: "dashboard.summary.title", group: "لوحة التحكم", title: "عنوان نظرة مختصرة", text: "نظرة مختصرة" },
  { id: "dashboard.no-database", group: "لوحة التحكم", title: "رسالة عدم اتصال DB", text: "قاعدة البيانات غير متصلة. اربط DATABASE_URL عشان الطلبات والدعوات تظهر من قاعدة البيانات الحقيقية." },

  // Search Page
  { id: "search.hero.title", group: "البحث", title: "عنوان البحث", text: "البحث العام" },
  { id: "search.hero.description", group: "البحث", title: "وصف البحث", text: "ابحث في الدعوات، العملاء، الطلبات، الحضور، والقوالب من مكان واحد." },
  { id: "search.hero.placeholder", group: "البحث", title: "placeholder البحث", text: "اكتب اسم، هاتف، كود دعوة، رقم طلب أو اسم قالب" },
  { id: "search.suggestions.new", group: "البحث", title: "اقتراح جديد", text: "جديد" },
  { id: "search.suggestions.active", group: "البحث", title: "اقتراح نشط", text: "نشط" },
  { id: "search.suggestions.archived", group: "البحث", title: "اقتراح مؤرشفة", text: "مؤرشفة" },
  { id: "search.suggestions.expired", group: "البحث", title: "اقتراح منتهية", text: "منتهية" },
  { id: "search.suggestions.paused", group: "البحث", title: "اقتراح متوقفة", text: "متوقفة" },
  { id: "search.suggestions.disabled", group: "البحث", title: "اقتراح معطلة", text: "معطلة" },
  { id: "search.recent.heading", group: "البحث", title: "عنوان عمليات بحث حديثة", text: "عمليات بحث حديثة" },
  { id: "search.recent.clear", group: "البحث", title: "زر مسح البحث", text: "مسح" },
  { id: "search.empty.title", group: "البحث", title: "عنوان البحث الفارغ", text: "ابدأ البحث من الأعلى" },
  { id: "search.empty.description", group: "البحث", title: "وصف البحث الفارغ", text: "يمكنك البحث باسم العريس أو العروس، رقم الهاتف، كود الدعوة، رقم الطلب، اسم الضيف أو اسم القالب." },
  { id: "search.empty.hint", group: "البحث", title: "اختصار البحث", text: "اضغط Ctrl+K للبحث السريع من أي مكان في لوحة الإدارة." },
  { id: "search.all-results", group: "البحث", title: "كل النتائج", text: "كل النتائج" },
  { id: "search.no-results-group", group: "البحث", title: "لا توجد نتائج في قسم", text: "لا توجد نتائج في هذا القسم" },
  { id: "search.no-results", group: "البحث", title: "لا توجد نتائج", text: "لا توجد نتائج مطابقة" },
  { id: "search.no-results-hint", group: "البحث", title: "تلميحة لا نتائج", text: "جرّب البحث بكود الدعوة، رقم الهاتف، اسم العميل أو اسم القالب." },
  { id: "search.suggestions.heading", group: "البحث", title: "عنوان اقتراحات", text: "هل تبحث عن" },
  { id: "search.result.count", group: "البحث", title: "نتيجة", text: "نتيجة" },
  { id: "search.show-first", group: "البحث", title: "عرض أول", text: "عرض أول" },

  // Invitations List
  { id: "invitations.state.all", group: "الدعوات", title: "كل الحالات", text: "كل الحالات" },
  { id: "invitations.state.active", group: "الدعوات", title: "حالة نشطة", text: "نشطة" },
  { id: "invitations.state.paused", group: "الدعوات", title: "حالة متوقفة", text: "متوقفة" },
  { id: "invitations.state.expired", group: "الدعوات", title: "حالة منتهية", text: "منتهية" },
  { id: "invitations.state.archived", group: "الدعوات", title: "حالة مؤرشفة", text: "مؤرشفة" },
  { id: "invitations.state.disabled", group: "الدعوات", title: "حالة معطلة", text: "معطلة" },
  { id: "invitations.state.trial", group: "الدعوات", title: "حالة تجريبي", text: "تجريبي" },
  { id: "invitations.state.trial-ended", group: "الدعوات", title: "حالة منتهي تجريبي", text: "منتهي تجريبي" },

  // Orders Status
  { id: "orders.status.new", group: "الطلبات", title: "حالة جديد", text: "جديد" },
  { id: "orders.status.reviewing", group: "الطلبات", title: "حالة قيد المراجعة", text: "قيد المراجعة" },
  { id: "orders.status.edited", group: "الطلبات", title: "حالة معدل", text: "معدل" },
  { id: "orders.status.published", group: "الطلبات", title: "حالة منشور", text: "منشور" },
  { id: "orders.status.rejected", group: "الطلبات", title: "حالة مرفوض", text: "مرفوض" },
  { id: "orders.status.accepted", group: "الطلبات", title: "حالة مقبول", text: "مقبول" },
  { id: "orders.status.converted", group: "الطلبات", title: "حالة محول", text: "محول" },
  { id: "orders.status.published-or-converted", group: "الطلبات", title: "تم النشر", text: "تم النشر" },

  // Guest Status
  { id: "guests.status.confirmed", group: "الحضور", title: "حالة حاضر", text: "حاضر" },
  { id: "guests.status.declined", group: "الحضور", title: "حالة معتذر", text: "معتذر" },
  { id: "guests.individual", group: "الحضور", title: "فرد", text: "فرد" },

  // Template Status
  { id: "templates.status.enabled", group: "القوالب", title: "حالة مفعل", text: "مفعل" },
  { id: "templates.status.disabled", group: "القوالب", title: "حالة متوقف", text: "متوقف" },

  // Invitation Status Labels (admin-data)
  { id: "invitations.status.active", group: "الدعوات", title: "حالة نشطة", text: "نشطة" },
  { id: "invitations.status.disabled", group: "الدعوات", title: "حالة معطلة", text: "🔴 معطلة" },
  { id: "invitations.status.archived", group: "الدعوات", title: "حالة مؤرشفة", text: "مؤرشفة" },
  { id: "invitations.status.paused", group: "الدعوات", title: "حالة متوقفة", text: "متوقفة" },

  // Notification Messages
  { id: "notification.success", group: "الإشعارات", title: "نجاح", text: "تم بنجاح" },
  { id: "notification.error", group: "الإشعارات", title: "خطأ", text: "حدث خطأ" },
  { id: "notification.loading", group: "الإشعارات", title: "جاري التحميل", text: "جاري التحميل" },
  { id: "notification.saved", group: "الإشعارات", title: "تم الحفظ", text: "تم الحفظ" },
  { id: "notification.saving", group: "الإشعارات", title: "جاري الحفظ", text: "جاري الحفظ" },
  { id: "notification.submitting", group: "الإشعارات", title: "جاري الإرسال", text: "جاري الإرسال" },
  { id: "notification.submitted", group: "الإشعارات", title: "تم الإرسال", text: "تم الإرسال" },
  { id: "notification.page-loaded", group: "الإشعارات", title: "تم تحميل الصفحة", text: "تم تحميل الصفحة" },
  { id: "notification.page-loaded-message", group: "الإشعارات", title: "رسالة تحميل الصفحة", text: "اكتمل الانتقال داخل لوحة الإدارة." },
  { id: "notification.results-loaded", group: "الإشعارات", title: "تم تحميل النتائج", text: "تم تحميل النتائج" },
  { id: "notification.section-opened", group: "الإشعارات", title: "تم فتح القسم", text: "تم فتح القسم" },

  // Common Actions
  { id: "action.save", group: "إجراءات", title: "حفظ", text: "حفظ" },
  { id: "action.cancel", group: "إجراءات", title: "إلغاء", text: "إلغاء" },
  { id: "action.delete", group: "إجراءات", title: "حذف", text: "حذف" },
  { id: "action.edit", group: "إجراءات", title: "تعديل", text: "تعديل" },
  { id: "action.create", group: "إجراءات", title: "إنشاء", text: "إنشاء" },
  { id: "action.search", group: "إجراءات", title: "بحث", text: "بحث" },
  { id: "action.filter", group: "إجراءات", title: "تصفية", text: "تصفية" },
  { id: "action.close", group: "إجراءات", title: "إغلاق", text: "إغلاق" },
  { id: "action.back", group: "إجراءات", title: "رجوع", text: "رجوع" },
  { id: "action.confirm", group: "إجراءات", title: "تأكيد", text: "تأكيد" },
  { id: "action.copy", group: "إجراءات", title: "نسخ", text: "نسخ" },
  { id: "action.share", group: "إجراءات", title: "مشاركة", text: "مشاركة" },
  { id: "action.view", group: "إجراءات", title: "عرض", text: "عرض" },
  { id: "action.download", group: "إجراءات", title: "تحميل", text: "تحميل" },
  { id: "action.print", group: "إجراءات", title: "طباعة", text: "طباعة" },
  { id: "action.refresh", group: "إجراءات", title: "تحديث", text: "تحديث" },
  { id: "action.more", group: "إجراءات", title: "المزيد", text: "المزيد" },
  { id: "action.less", group: "إجراءات", title: "أقل", text: "أقل" },

  // Content Presets
  { id: "content-presets.kind.opening", group: "النصوص الجاهزة", title: "افتتاحيات", text: "افتتاحيات" },
  { id: "content-presets.kind.welcome", group: "النصوص الجاهزة", title: "رسائل ترحيب", text: "رسائل ترحيب" },
  { id: "content-presets.kind.rsvp", group: "النصوص الجاهزة", title: "رسائل RSVP", text: "رسائل RSVP" },

  // Message Templates
  { id: "message-templates.kind.whatsapp", group: "قوالب الرسائل", title: "رسائل واتساب", text: "رسائل واتساب" },
  { id: "message-templates.kind.welcome", group: "قوالب الرسائل", title: "رسائل ترحيب", text: "رسائل ترحيب" },
  { id: "message-templates.kind.reminder", group: "قوالب الرسائل", title: "رسائل تذكير", text: "رسائل تذكير" },

  // Search Group Labels
  { id: "search.group.invitations", group: "البحث", title: "مجموعة الدعوات", text: "الدعوات" },
  { id: "search.group.customers", group: "البحث", title: "مجموعة العملاء", text: "العملاء" },
  { id: "search.group.orders", group: "البحث", title: "مجموعة الطلبات", text: "الطلبات" },
  { id: "search.group.guests", group: "البحث", title: "مجموعة الحضور", text: "الحضور" },
  { id: "search.group.templates", group: "البحث", title: "مجموعة القوالب", text: "القوالب" },
  { id: "search.group.content", group: "البحث", title: "مجموعة المحتوى", text: "المحتوى" },
  { id: "search.group.admin-ui", group: "البحث", title: "مجموعة نصوص الإدارة", text: "نصوص الإدارة" },
  { id: "search.group.i18n", group: "البحث", title: "مجموعة الترجمة", text: "ترجمة الواجهة" },

  // i18n Group Labels
  { id: "i18n.group.common", group: "الترجمة", title: "عام", text: "عام" },
  { id: "i18n.group.invitation", group: "الترجمة", title: "الدعوة", text: "الدعوة" },
  { id: "i18n.group.admin", group: "الترجمة", title: "الإدارة", text: "الإدارة" },
];

function normalizeAdminTexts(value: unknown): AdminUiTextEntry[] {
  if (!Array.isArray(value)) return defaultAdminTexts;
  const validEntries: AdminUiTextEntry[] = [];
  const idSet = new Set<string>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Partial<AdminUiTextEntry>;
    if (typeof item.id !== "string" || !item.id.trim()) continue;
    if (idSet.has(item.id)) continue;
    const fallback = defaultAdminTexts.find((d) => d.id === item.id);
    validEntries.push({
      id: item.id.trim(),
      group: typeof item.group === "string" && item.group.trim() ? item.group.trim() : fallback?.group || "عام",
      title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : fallback?.title || item.id,
      text: typeof item.text === "string" && item.text.trim() ? item.text.trim() : fallback?.text || "",
    });
    idSet.add(item.id);
  }

  for (const def of defaultAdminTexts) {
    if (!idSet.has(def.id)) {
      validEntries.push(def);
      idSet.add(def.id);
    }
  }

  return validEntries;
}

export async function getAdminUiTexts(): Promise<AdminUiTextEntry[]> {
  noStore();
  try {
    const saved = await readAppSetting<AdminUiTextEntry[]>(ADMIN_UI_TEXTS_KEY);
    if (saved !== null) return normalizeAdminTexts(saved);
  } catch {
    // fallback to defaults
  }
  return defaultAdminTexts;
}

export async function updateAdminUiText(id: string, value: string): Promise<boolean> {
  const entries = await getAdminUiTexts();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) return false;

  const fallback = defaultAdminTexts.find((d) => d.id === id);
  entries[index] = {
    ...entries[index],
    text: value,
    title: fallback?.title || entries[index].title,
    group: fallback?.group || entries[index].group,
  };

  try {
    await writeAppSetting(ADMIN_UI_TEXTS_KEY, entries);
    return true;
  } catch {
    return false;
  }
}
