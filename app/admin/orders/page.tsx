import { Check, ImageIcon, RefreshCw, Save, Send, Trash2, X } from "lucide-react";
import { getAdminOrders } from "@/lib/admin-data";
import { getTemplatesWithSettings } from "@/lib/template-settings";

function formatDateInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function statusLabel(status: string) {
  if (status === "new") return "جديد";
  if (status === "accepted") return "مقبول";
  if (status === "converted") return "تم نشره";
  if (status === "rejected") return "مرفوض";
  return status;
}

function statusMessage(value?: string) {
  if (!value) return "";
  if (value === "updated") return "تم حفظ تعديل الطلب.";
  if (value === "accepted") return "تم قبول الطلب.";
  if (value === "rejected") return "تم رفض الطلب.";
  if (value === "deleted") return "تم حذف الطلب.";
  if (value === "missing") return "راجع البيانات المطلوبة.";
  if (value.startsWith("converted-")) return `تم نشر الدعوة: ${value.replace("converted-", "")}`;
  return "";
}

export default async function OrdersPage({ searchParams }: { searchParams?: Promise<{ status?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const [orders, templates] = await Promise.all([getAdminOrders(), getTemplatesWithSettings()]);
  const message = statusMessage(params.status);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Orders</span>
          <h1>طلبات العملاء</h1>
          <p>كل طلب بيتسجل هنا قبل ما يفتح واتساب. عدّل، اقبل، احذف، أو انشر الدعوة مباشرة.</p>
        </div>
      </div>

      {message ? <p className={params.status === "missing" ? "status danger" : "status success"}>{message}</p> : null}

      <div className="admin-orders-list">
        {orders.length ? (
          orders.map((order) => {
            const template = templates.find((item) => item.slug === order.templateSlug);
            const imageUrls = order.imageUrls || [];
            return (
              <article className="admin-order-card" key={order.id}>
                <form action={`/api/admin/orders/${order.id}`} method="post">
                  <div className="admin-order-card-head">
                    <div>
                      <span className="eyebrow">{template?.arabicName || order.templateSlug}</span>
                      <h2>
                        {order.groomName} &amp; {order.brideName}
                      </h2>
                    </div>
                    <span className={order.status === "accepted" || order.status === "converted" ? "status success" : order.status === "rejected" ? "status danger" : "status"}>{statusLabel(order.status)}</span>
                  </div>

                  <div className="admin-order-edit-grid">
                    <label>
                      <span>اسم العريس</span>
                      <input name="groomName" defaultValue={order.groomName} required />
                    </label>
                    <label>
                      <span>اسم العروسة</span>
                      <input name="brideName" defaultValue={order.brideName} required />
                    </label>
                    <label>
                      <span>رقم التواصل</span>
                      <input name="phone" defaultValue={order.phone} />
                    </label>
                    <label>
                      <span>تاريخ الفرح</span>
                      <input name="weddingDate" type="date" defaultValue={formatDateInput(order.weddingDate)} required />
                    </label>
                    <label className="wide">
                      <span>المكان / اللوكيشن</span>
                      <input name="venue" defaultValue={order.venue} />
                    </label>
                    <label>
                      <span>القالب</span>
                      <select name="templateSlug" defaultValue={order.templateSlug}>
                        {templates.map((item) => (
                          <option value={item.slug} key={item.slug}>
                            {item.arabicName}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="wide">
                      <span>ملاحظات الطلب</span>
                      <textarea name="notes" defaultValue={order.notes || ""} rows={3} />
                    </label>
                  </div>

                  <div className="admin-order-images">
                    <div className="admin-order-images-head">
                      <ImageIcon size={18} />
                      <span>الصور المتزامنة من الطلب</span>
                    </div>
                    {imageUrls.length ? (
                      <div className="admin-order-image-grid">
                        {imageUrls.slice(0, 3).map((url, index) => (
                          <a href={url} target="_blank" rel="noreferrer" key={`${order.id}-${url}`}>
                            <img src={url} alt={`صورة الطلب ${index + 1}`} loading="lazy" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p>لا توجد صور مرفوعة لهذا الطلب.</p>
                    )}
                  </div>

                  <div className="admin-order-actions">
                    <button className="btn btn-soft" name="action" value="update" type="submit">
                      <Save size={17} />
                      حفظ التعديل
                    </button>
                    <button className="btn btn-soft" name="action" value="accept" type="submit">
                      <Check size={17} />
                      قبول
                    </button>
                    <button className="btn btn-soft" name="action" value="reject" type="submit">
                      <X size={17} />
                      رفض
                    </button>
                    <button className="btn btn-gold btn-glow" name="action" value="convert" type="submit">
                      <Send size={17} />
                      نشر كدعوة
                    </button>
                    <button className="btn btn-soft danger-button" name="action" value="delete" type="submit">
                      <Trash2 size={17} />
                      حذف
                    </button>
                  </div>
                </form>
              </article>
            );
          })
        ) : (
          <div className="admin-empty-state">
            <RefreshCw size={22} />
            <strong>لا توجد طلبات حتى الآن</strong>
            <p>أي طلب مؤكد من الموقع سيظهر هنا تلقائيًا قبل فتح واتساب للعميل.</p>
          </div>
        )}
      </div>
    </>
  );
}
