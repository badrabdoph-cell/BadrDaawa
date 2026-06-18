import { headers } from "next/headers";
import { AdminExportButton } from "@/components/AdminExportButton";
import { AdminOrderRequestsManager } from "@/components/AdminOrderRequestsManager";
import { getAdminOrders } from "@/lib/admin-data";
import { getAdminFavorites } from "@/lib/admin-favorites";
import { getContentPresets } from "@/lib/content-presets";
import { getInternalNotes } from "@/lib/internal-notes";
import { getInvitationManagePath } from "@/lib/invitation-manage-token";
import { getMusicLibrary } from "@/lib/music-library";
import { getTemplatePreviewInfo } from "@/lib/template-preview-info";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getPublicSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type OrdersPageParams = {
  noteStatus?: string;
  favoriteStatus?: string;
  tab?: string;
};

function noteStatusMessage(value?: string) {
  if (value === "created") return "تمت إضافة الملاحظة الداخلية.";
  if (value === "updated") return "تم تحديث الملاحظة الداخلية.";
  if (value === "deleted") return "تم حذف الملاحظة الداخلية.";
  if (value === "missing") return "لم يتم العثور على الملاحظة المطلوبة.";
  if (value === "invalid") return "اكتب ملاحظة صالحة قبل الحفظ.";
  return "";
}

function favoriteStatusMessage(value?: string) {
  if (value === "added") return "تمت إضافة الطلب إلى المفضلة.";
  if (value === "removed") return "تمت إزالة الطلب من المفضلة.";
  if (value === "missing") return "العنصر غير موجود في المفضلة.";
  if (value === "invalid") return "تعذر تحديث المفضلة.";
  return "";
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<OrdersPageParams>;
}) {
  const [params, orders, templates, musicLibrary, contentPresets, requestHeaders, internalNotes, favorites, previewInfo] = await Promise.all([searchParams, getAdminOrders(), getTemplatesWithSettings(), getMusicLibrary(), getContentPresets(), headers(), getInternalNotes({ entityType: "order" }), getAdminFavorites({ entityType: "order" }), getTemplatePreviewInfo()]);
  const siteUrl = getPublicSiteUrl(requestHeaders);
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");
  const ordersWithLinks = await Promise.all(
    orders.map(async (order) => {
      if (!order.publishedInvitationCode) return order;
      const managePath = await getInvitationManagePath(order.publishedInvitationCode);
      return {
        ...order,
        publicUrl: `${cleanSiteUrl}/${order.publishedInvitationCode}`,
        adminUrl: `${cleanSiteUrl}${managePath}`,
      };
    }),
  );
  const initialTab = params.tab === "pending" || params.tab === "published" || params.tab === "rejected" ? params.tab : undefined;
  const DISPLAY_LIMIT = 100;
  const displayOrders = ordersWithLinks.length > DISPLAY_LIMIT ? ordersWithLinks.slice(0, DISPLAY_LIMIT) : ordersWithLinks;
  const openCount = ordersWithLinks.filter((order) => !["published", "converted", "rejected"].includes(order.status)).length;
  const noteMessage = noteStatusMessage(params.noteStatus);
  const favoriteMessage = favoriteStatusMessage(params.favoriteStatus);
  const templateOptions = templates.map(({ slug, name, arabicName, opening, concept, layout, typography }) => ({
    slug,
    name,
    arabicName,
    opening,
    concept,
    layout,
    typography,
  }));

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Order Requests</span>
          <h1>طلبات الدعوات ({openCount})</h1>
          <p>كل طلب من الموقع يتسجل هنا بالصور والموسيقى وبيانات المصور، تراجعه في نفس الصفحة ثم تنشره كدعوة جاهزة.</p>
        </div>
        <div className="dashboard-actions">
          <AdminExportButton
            label="تصدير Excel"
            filename={`orders-${new Date().toISOString().slice(0, 10)}.csv`}
            headers={["رقم الطلب", "العريس", "العروسة", "الهاتف", "تاريخ المناسبة", "القاعة", "الحالة", "تاريخ الطلب"]}
            rows={displayOrders.map((order) => [
              order.orderNumber || "",
              order.groomName,
              order.brideName,
              order.phone,
              order.weddingDate,
              order.venue,
              order.status,
              order.createdAt,
            ])}
          />
        </div>
      </div>
      {noteMessage ? <div className={params.noteStatus === "created" || params.noteStatus === "updated" || params.noteStatus === "deleted" ? "notice success" : "notice danger"}>{noteMessage}</div> : null}
      {favoriteMessage ? <div className={params.favoriteStatus === "added" || params.favoriteStatus === "removed" ? "notice success" : "notice danger"}>{favoriteMessage}</div> : null}
      <AdminOrderRequestsManager orders={displayOrders} templates={templateOptions} musicFiles={musicLibrary.slots.filter((slot) => slot.url).map((slot) => ({ id: slot.id, name: slot.name, url: slot.url, modifiedAt: Date.parse(slot.updatedAt || slot.createdAt || "") || 0, sizeBytes: slot.sizeBytes, extension: slot.extension }))} contentPresets={contentPresets} internalNotes={internalNotes} favorites={favorites} siteUrl={siteUrl} templatePreviewInfo={previewInfo} initialTab={initialTab} />
      {ordersWithLinks.length > DISPLAY_LIMIT && (
        <p className="text-sm text-gray-500 mt-4 text-center">
          عرض أول {DISPLAY_LIMIT} من أصل {ordersWithLinks.length}. استخدم خاصية البحث للتصفية.
        </p>
      )}
    </>
  );
}
