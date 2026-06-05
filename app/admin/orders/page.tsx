import { Check, RefreshCw, X } from "lucide-react";
import { demoOrders } from "@/lib/demo-data";
import { invitationTemplates } from "@/lib/templates";

export default function OrdersPage() {
  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Orders</span>
          <h1>طلبات العملاء</h1>
        </div>
      </div>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>العريس والعروسة</th>
              <th>الهاتف</th>
              <th>التاريخ</th>
              <th>القالب</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {demoOrders.map((order) => {
              const template = invitationTemplates.find((item) => item.slug === order.templateSlug);
              return (
                <tr key={order.id}>
                  <td>
                    {order.groomName} &amp; {order.brideName}
                  </td>
                  <td>{order.phone}</td>
                  <td>{new Date(order.weddingDate).toLocaleDateString("ar-EG")}</td>
                  <td>{template?.arabicName}</td>
                  <td>
                    <span className={order.status === "accepted" ? "status success" : "status"}>{order.status === "new" ? "جديد" : "مقبول"}</span>
                  </td>
                  <td>
                    <div className="button-row">
                      <button className="btn btn-soft btn-icon" title="قبول" type="button">
                        <Check size={17} />
                      </button>
                      <button className="btn btn-soft btn-icon" title="رفض" type="button">
                        <X size={17} />
                      </button>
                      <button className="btn btn-soft" type="button">
                        <RefreshCw size={17} />
                        تحويل لدعوة
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
