import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  BarChart3,
  Bell,
  Bug,
  CalendarClock,
  Camera,
  ClipboardList,
  Database,
  DatabaseBackup,
  FileImage,
  FilePenLine,
  FileText,
  Gauge,
  Github,
  History,
  LayoutDashboard,
  MapPinCheckInside,
  MessageCircleHeart,
  MessageSquareText,
  MonitorPlay,
  Music2,
  Palette,
  PlusCircle,
  RadioTower,
  RefreshCw,
  Search,
  ScrollText,
  Settings,
  Star,
  Trash2,
  Upload,
  UsersRound,
} from "lucide-react";

export type AdminNavAccent = "gold" | "teal" | "blue" | "rose" | "violet" | "slate" | "green";
export type AdminNavBadgeKey = "orders" | "messages" | "notifications";

export type AdminNavLink = {
  href: string;
  label: string;
  helper: string;
  icon: LucideIcon;
  badgeKey?: AdminNavBadgeKey;
  shortcutKey?: string;
};

export type AdminNavSection = {
  id: string;
  title: string;
  description: string;
  accent: AdminNavAccent;
  icon: LucideIcon;
  links: AdminNavLink[];
};

export const adminSections = [
  {
    id: "operations",
    title: "التشغيل والعملاء",
    description: "الطلبات والدعوات والعملاء",
    accent: "gold",
    icon: UsersRound,
    links: [
      { href: "/admin", label: "الرئيسية", helper: "ملخص اليوم والقرارات السريعة", icon: LayoutDashboard },
      { href: "/admin/orders", label: "الطلبات المعلقة", helper: "مراجعة طلبات الدعوات الجديدة", icon: FileText, badgeKey: "orders", shortcutKey: "O" },
      { href: "/admin/new-invitation", label: "إنشاء دعوة", helper: "إضافة دعوة عميل مباشرة", icon: PlusCircle, shortcutKey: "N" },
      { href: "/admin/invitations", label: "الدعوات المنشورة", helper: "إدارة روابط الدعوات وحالتها", icon: Archive, shortcutKey: "I" },
      { href: "/admin/invitations-customers", label: "عملاء الدعوات", helper: "حسابات العروسين المرتبطة بالدعوات", icon: UsersRound, shortcutKey: "U" },
      { href: "/admin/customers", label: "كل العملاء", helper: "بيانات العملاء والمتابعة", icon: UsersRound, shortcutKey: "C" },
      { href: "/admin/favorites", label: "المفضلة", helper: "عناصر مهمة للعودة السريعة", icon: Star },
      { href: "/admin/trash", label: "سلة المهملات", helper: "استعادة أو حذف العناصر المحذوفة", icon: Trash2 },
      { href: "/admin/search", label: "البحث العام", helper: "بحث عبر الدعوات والعملاء والمحتوى", icon: Search },
    ],
  },
  {
    id: "content",
    title: "المحتوى والهوية",
    description: "القوالب والوسائط ونصوص الموقع",
    accent: "rose",
    icon: Palette,
    links: [
      { href: "/admin/templates", label: "القوالب", helper: "تصاميم الدعوات ومحتواها", icon: Palette, shortcutKey: "T" },
      { href: "/admin/media", label: "الوسائط", helper: "الصور والفيديوهات وملفات العملاء", icon: FileImage, shortcutKey: "M" },
      { href: "/admin/music", label: "الموسيقى", helper: "مكتبة المقاطع الصوتية", icon: Music2 },
      { href: "/admin/pages", label: "الصفحات", helper: "محتوى صفحات الموقع العامة", icon: FilePenLine },
      { href: "/admin/legal", label: "الصفحات القانونية", helper: "الشروط والخصوصية وسياسات الموقع", icon: FileText },
      { href: "/admin/texts", label: "النصوص", helper: "نصوص الواجهة القابلة للتحرير", icon: FileText, shortcutKey: "X" },
      { href: "/admin/content-presets", label: "النصوص الجاهزة", helper: "مكتبة عبارات قابلة لإعادة الاستخدام", icon: FilePenLine },
      { href: "/admin/recent-edits", label: "آخر التعديلات", helper: "استعراض واسترجاع تغييرات المحتوى", icon: FilePenLine, shortcutKey: "R" },
      { href: "/admin/photographer-logo", label: "شعار المصور", helper: "هوية المصور داخل القوالب", icon: Camera },
      { href: "/admin/preview", label: "المعاينة", helper: "فحص شكل الموقع قبل النشر", icon: MonitorPlay },
    ],
  },
  {
    id: "engagement",
    title: "التفاعل والفعاليات",
    description: "الرسائل والحضور والبث والتحليلات",
    accent: "blue",
    icon: ClipboardList,
    links: [
      { href: "/admin/messages", label: "رسائل العملاء", helper: "رسائل لوحة العميل غير المقروءة", icon: MessageSquareText, badgeKey: "messages" },
      { href: "/admin/message-templates", label: "قوالب الرسائل", helper: "ردود جاهزة للواتساب ولوحة العميل", icon: MessageSquareText },
      { href: "/admin/guest-book", label: "التهاني", helper: "مراجعة رسائل المباركة", icon: MessageCircleHeart },
      { href: "/admin/notifications", label: "الإشعارات", helper: "مركز التنبيهات والمهام العاجلة", icon: Bell, badgeKey: "notifications" },
      { href: "/admin/attendance", label: "الحضور", helper: "ردود RSVP وقوائم الضيوف", icon: ClipboardList },
      { href: "/admin/check-ins", label: "تسجيل الوصول", helper: "إدارة الحضور يوم المناسبة", icon: MapPinCheckInside },
      { href: "/admin/live-mode", label: "البث المباشر", helper: "لوحة تجربة الدعوة المباشرة", icon: RadioTower },
      { href: "/admin/broadcast", label: "بث الموقع", helper: "رسائل وإعلانات تظهر للزوار", icon: RadioTower, shortcutKey: "B" },
      { href: "/admin/analytics", label: "التحليلات", helper: "مصادر الزيارات وأداء الدعوات", icon: BarChart3, shortcutKey: "A" },
    ],
  },
  {
    id: "publishing",
    title: "النشر والإصدارات",
    description: "النشر والاسترجاع وتاريخ النسخ",
    accent: "green",
    icon: Upload,
    links: [
      { href: "/admin/publish", label: "النشر", helper: "مراجعة المسودات ودفع الموقع للإنتاج", icon: Upload, shortcutKey: "P" },
      { href: "/admin/versions", label: "الإصدارات والاسترجاع", helper: "تاريخ الإصدارات والعودة لنسخة سابقة", icon: ScrollText, shortcutKey: "V" },
    ],
  },
  {
    id: "maintenance",
    title: "النسخ والتنظيف",
    description: "النسخ الاحتياطي وتنظيف التخزين",
    accent: "teal",
    icon: DatabaseBackup,
    links: [
      { href: "/admin/backups", label: "النسخ الاحتياطي", helper: "إنشاء واستعادة وفحص النسخ", icon: DatabaseBackup, shortcutKey: "K" },
      { href: "/admin/cleanup", label: "لوحة التنظيف", helper: "نظرة عامة على التنظيف الآمن", icon: Trash2, shortcutKey: "L" },
      { href: "/admin/cleanup/media", label: "تنظيف الوسائط", helper: "حذف ملفات غير مستخدمة", icon: FileImage },
      { href: "/admin/cleanup/backups", label: "تنظيف النسخ", helper: "إدارة ملفات النسخ القديمة", icon: DatabaseBackup },
      { href: "/admin/cleanup/scan", label: "الفحص", helper: "اكتشاف ملفات ومراجع غير متطابقة", icon: Activity },
      { href: "/admin/cleanup/optimization", label: "التحسين", helper: "تحسين التخزين والأداء", icon: Gauge },
      { href: "/admin/cleanup/database", label: "قاعدة البيانات", helper: "تنظيف سجلات قاعدة البيانات", icon: Database },
    ],
  },
  {
    id: "system",
    title: "النظام والتكاملات",
    description: "الإعدادات والمراقبة وGitHub",
    accent: "slate",
    icon: Settings,
    links: [
      { href: "/admin/settings", label: "إعدادات الموقع", helper: "الهوية والصيانة وإعدادات التشغيل", icon: Settings, shortcutKey: "S" },
      { href: "/admin/sync-settings", label: "إعدادات GitHub", helper: "ربط المستودع ومفاتيح المزامنة", icon: Github },
      { href: "/admin/sync", label: "المزامنة", helper: "مزامنة محتوى الموقع مع GitHub", icon: RefreshCw, shortcutKey: "Y" },
      { href: "/admin/sync-history", label: "سجل المزامنة", helper: "نتائج عمليات GitHub السابقة", icon: History, shortcutKey: "H" },
      { href: "/admin/tasks", label: "المهام المجدولة", helper: "مراقبة كرون والمهام الدورية", icon: CalendarClock },
      { href: "/admin/system-health", label: "صحة النظام", helper: "حالة الخدمات الحرجة", icon: Activity },
      { href: "/admin/monitoring", label: "المراقبة", helper: "مؤشرات التشغيل والتنبيهات", icon: Activity, shortcutKey: "W" },
      { href: "/admin/diagnostics", label: "التشخيص", helper: "أدوات فحص الأعطال", icon: Bug, shortcutKey: "D" },
      { href: "/admin/audit-log", label: "سجل الأحداث", helper: "تتبع إجراءات الإدارة", icon: ScrollText },
      { href: "/admin/errors", label: "تقارير الأخطاء", helper: "أخطاء الواجهة والخادم", icon: Bug },
    ],
  },
] satisfies AdminNavSection[];

export const allAdminLinks = adminSections.flatMap((group) => group.links);

export const mobilePrimaryHrefs = new Set([
  "/admin",
  "/admin/orders",
  "/admin/new-invitation",
  "/admin/invitations",
  "/admin/publish",
]);

export const mobilePrimaryLinks = allAdminLinks.filter((link) => mobilePrimaryHrefs.has(link.href));

export const shortcutHrefByKey = Object.fromEntries(
  allAdminLinks
    .filter((link) => link.shortcutKey)
    .map((link) => [link.shortcutKey as string, link.href]),
) as Record<string, string>;

export function findActiveAdminLink(pathname: string) {
  return (
    allAdminLinks
      .filter((link) => (link.href === "/admin" ? pathname === link.href : pathname.startsWith(link.href)))
      .sort((a, b) => b.href.length - a.href.length)[0] || allAdminLinks[0]
  );
}

export function findAdminSectionForHref(href: string) {
  return adminSections.find((section) => section.links.some((link) => link.href === href)) || adminSections[0];
}
