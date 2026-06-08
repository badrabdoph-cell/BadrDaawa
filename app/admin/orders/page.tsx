import { headers } from "next/headers";
import { AdminOrderRequestsManager } from "@/components/AdminOrderRequestsManager";
import { getAdminOrders } from "@/lib/admin-data";
import { getContentPresets } from "@/lib/content-presets";
import { getMusicLibrary } from "@/lib/music-library";
import { getTemplatesWithSettings } from "@/lib/template-settings";
import { getPublicSiteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [orders, templates, musicLibrary, contentPresets, requestHeaders] = await Promise.all([getAdminOrders(), getTemplatesWithSettings(), getMusicLibrary(), getContentPresets(), headers()]);
  const siteUrl = getPublicSiteUrl(requestHeaders);
  const openCount = orders.filter((order) => !["published", "converted", "rejected"].includes(order.status)).length;
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
      </div>
      <AdminOrderRequestsManager orders={orders} templates={templateOptions} musicFiles={musicLibrary.slots.filter((slot) => slot.url).map((slot) => ({ id: slot.id, name: slot.name, url: slot.url, modifiedAt: Date.parse(slot.updatedAt || slot.createdAt || "") || 0, sizeBytes: slot.sizeBytes, extension: slot.extension }))} contentPresets={contentPresets} siteUrl={siteUrl} />
    </>
  );
}
