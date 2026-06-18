import { generateCsrfToken } from "@/lib/csrf";
import { ArchiveRestore, RotateCcw, Search, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { getTrashItems, type TrashEntityType } from "@/lib/trash";
import { formatArabicNumber } from "@/lib/utils";
import { TrashBulkActions } from "@/components/TrashBulkActions";

export const dynamic = "force-dynamic";

type TrashPageParams = {
  q?: string;
  type?: string;
  status?: string;
  count?: string;
};

const typeLabels: Record<TrashEntityType, string> = {
  invitation: "دعوة",
  order: "طلب",
  customer: "عميل",
};

function statusMessage(value?: string) {
  if (value === "restored") return "تمت استعادة العنصر/العناصر بنجاح.";
  if (value === "deleted") return "تم حذف العنصر/العناصر نهائياً.";
  if (value === "missing") return "لم يتم العثور على العنصر داخل المهملات.";
  if (value === "invalid") return "الإجراء غير صالح.";
  return "";
}

export default async function TrashPage({
  searchParams,
}: {
  searchParams: Promise<TrashPageParams>;
}) {
  const [params, items, csrfToken] = await Promise.all([searchParams, getTrashItems(), generateCsrfToken()]);
  const query = (params.q || "").trim().toLowerCase();
  const selectedType = params.type || "all";
  const filteredItems = items.filter((item) => {
    const searchable = [item.title, item.subtitle, item.meta, typeLabels[item.type]].join(" ").toLowerCase();
    return (!query || searchable.includes(query)) && (selectedType === "all" || item.type === selectedType);
  });
  const invitationsCount = items.filter((item) => item.type === "invitation").length;
  const ordersCount = items.filter((item) => item.type === "order").length;
  const customersCount = items.filter((item) => item.type === "customer").length;
  const message = statusMessage(params.status);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Trash</span>
          <h1>سلة المهملات</h1>
          <p>العناصر المحذوفة لا تُزال مباشرة من قاعدة البيانات. يمكنك استعادتها أو حذفها نهائياً من هنا فقط.</p>
        </div>
      </div>

      {message ? <div className={params.status === "missing" || params.status === "invalid" ? "notice danger" : "notice success"}>{message}</div> : null}
      {params.status === "deleted" && params.count ? (
        <div className="notice success">تم حذف {params.count} عنصر/عناصر نهائياً بنجاح.</div>
      ) : null}

      <section className="admin-list-overview trash-overview" aria-label="ملخص سلة المهملات">
        <div className="admin-list-stat">
          <Trash2 size={19} />
          <span>إجمالي العناصر</span>
          <strong>{formatArabicNumber(items.length)}</strong>
        </div>
        <div className="admin-list-stat">
          <ArchiveRestore size={19} />
          <span>دعوات</span>
          <strong>{formatArabicNumber(invitationsCount)}</strong>
        </div>
        <div className="admin-list-stat">
          <ArchiveRestore size={19} />
          <span>طلبات</span>
          <strong>{formatArabicNumber(ordersCount)}</strong>
        </div>
        <div className="admin-list-stat">
          <ArchiveRestore size={19} />
          <span>عملاء</span>
          <strong>{formatArabicNumber(customersCount)}</strong>
        </div>
      </section>

      <div className="notice warning">
        <TriangleAlert size={18} />
        <span>الحذف النهائي من هذه الصفحة يزيل السجل فعلياً وقد يؤثر على البيانات المرتبطة، لذلك استخدمه فقط بعد التأكد.</span>
      </div>

      <form className="admin-table-toolbar trash-toolbar" action="/admin/trash" method="get">
        <label className="admin-search-field">
          <Search size={17} />
          <input name="q" placeholder="ابحث بالاسم، الكود، رقم الطلب أو الهاتف" defaultValue={params.q || ""} />
        </label>
        <label className="admin-select-field">
          <Trash2 size={17} />
          <select name="type" defaultValue={selectedType} aria-label="نوع العنصر">
            <option value="all">كل الأنواع</option>
            <option value="invitation">الدعوات</option>
            <option value="order">الطلبات</option>
            <option value="customer">العملاء</option>
          </select>
        </label>
        <button className="btn btn-soft" type="submit">تطبيق</button>
        {query || selectedType !== "all" ? <Link className="btn btn-soft" href="/admin/trash">مسح</Link> : null}
      </form>

      <TrashBulkActions items={filteredItems} csrfToken={csrfToken} filterType={selectedType} />
    </>
  );
}
