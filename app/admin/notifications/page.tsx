import { Bell, CheckCircle2, EyeOff, Inbox, ShieldAlert } from "lucide-react";
import { AdminNotificationCenter } from "@/components/AdminNotificationCenter";
import { getAdminNotifications } from "@/lib/admin-notifications";
import { formatArabicNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const summary = await getAdminNotifications({ includeHidden: true });
  const errorCount = summary.notifications.filter((notification) => notification.severity === "error" && !notification.hiddenAt && !notification.completedAt).length;

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Notification Center</span>
          <h1>مركز التنبيهات</h1>
          <p>تنبيهات داخلية للأحداث التشغيلية المهمة داخل لوحة الإدارة بدون استخدام Push Notifications.</p>
        </div>
      </div>

      <section className="admin-list-overview notification-overview" aria-label="ملخص التنبيهات">
        <div className="admin-list-stat warning">
          <Bell size={19} />
          <span>غير مقروءة</span>
          <strong>{formatArabicNumber(summary.unreadCount)}</strong>
        </div>
        <div className="admin-list-stat">
          <Inbox size={19} />
          <span>نشطة</span>
          <strong>{formatArabicNumber(summary.activeCount)}</strong>
        </div>
        <div className="admin-list-stat danger">
          <ShieldAlert size={19} />
          <span>خطيرة</span>
          <strong>{formatArabicNumber(errorCount)}</strong>
        </div>
        <div className="admin-list-stat">
          <CheckCircle2 size={19} />
          <span>مكتملة</span>
          <strong>{formatArabicNumber(summary.completedCount)}</strong>
        </div>
        <div className="admin-list-stat">
          <EyeOff size={19} />
          <span>مخفية</span>
          <strong>{formatArabicNumber(summary.hiddenCount)}</strong>
        </div>
      </section>

      <AdminNotificationCenter initialSummary={summary} />
    </>
  );
}
