import { Trash2, UserCheck, UsersRound } from "lucide-react";
import { AdminExportButton } from "@/components/AdminExportButton";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { InternalNotesPanel } from "@/components/InternalNotesPanel";
import { StatsGrid } from "@/components/StatsGrid";
import { getAdminCustomers } from "@/lib/admin-data";
import { getAdminFavorites, isAdminFavorite } from "@/lib/admin-favorites";
import { getInternalNotes, groupInternalNotesByEntity } from "@/lib/internal-notes";

export const dynamic = "force-dynamic";

type CustomersPageParams = {
  status?: string;
  noteStatus?: string;
  favoriteStatus?: string;
};

function statusMessage(value?: string) {
  if (value === "deleted") return "تم نقل العميل إلى سلة المهملات.";
  if (value === "missing") return "لم يتم العثور على العميل.";
  if (value === "invalid") return "الإجراء غير صالح.";
  return "";
}

function noteStatusMessage(value?: string) {
  if (value === "created") return "تمت إضافة الملاحظة الداخلية.";
  if (value === "updated") return "تم تحديث الملاحظة الداخلية.";
  if (value === "deleted") return "تم حذف الملاحظة الداخلية.";
  if (value === "missing") return "لم يتم العثور على الملاحظة المطلوبة.";
  if (value === "invalid") return "اكتب ملاحظة صالحة قبل الحفظ.";
  return "";
}

function favoriteStatusMessage(value?: string) {
  if (value === "added") return "تمت إضافة العميل إلى المفضلة.";
  if (value === "removed") return "تمت إزالة العميل من المفضلة.";
  if (value === "missing") return "العنصر غير موجود في المفضلة.";
  if (value === "invalid") return "تعذر تحديث المفضلة.";
  return "";
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<CustomersPageParams>;
}) {
  const [params, customers, internalNotes, favorites] = await Promise.all([searchParams, getAdminCustomers(), getInternalNotes({ entityType: "customer" }), getAdminFavorites({ entityType: "customer" })]);
  const activeCustomers = customers.filter((customer) => customer.isActive).length;
  const totalInvitations = customers.reduce((sum, customer) => sum + customer.invitations, 0);
  const message = statusMessage(params.status);
  const noteMessage = noteStatusMessage(params.noteStatus);
  const favoriteMessage = favoriteStatusMessage(params.favoriteStatus);
  const notesByEntity = groupInternalNotesByEntity(internalNotes);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Customers</span>
          <h1>العملاء وبيانات الدخول</h1>
        </div>
        <div className="dashboard-actions">
          <AdminExportButton
            label="تصدير Excel"
            filename={`customers-${new Date().toISOString().slice(0, 10)}.csv`}
            headers={["الاسم", "الهاتف", "اسم الدخول", "عدد الدعوات", "الحالة"]}
            rows={customers.map((c) => [
              c.name,
              c.phone,
              c.username,
              String(c.invitations),
              c.isActive ? "نشط" : "متوقف",
            ])}
          />
        </div>
      </div>
      {message ? <div className={params.status === "deleted" ? "notice success" : "notice danger"}>{message}</div> : null}
      {noteMessage ? <div className={params.noteStatus === "created" || params.noteStatus === "updated" || params.noteStatus === "deleted" ? "notice success" : "notice danger"}>{noteMessage}</div> : null}
      {favoriteMessage ? <div className={params.favoriteStatus === "added" || params.favoriteStatus === "removed" ? "notice success" : "notice danger"}>{favoriteMessage}</div> : null}
      <StatsGrid
        stats={[
          { label: "إجمالي العملاء", value: customers.length, hint: "متزامن من حسابات الدعوات المنشأة" },
          { label: "عملاء نشطين", value: activeCustomers, hint: "الحسابات المتاحة للدخول" },
          { label: "دعوات مرتبطة", value: totalInvitations, hint: "عدد الدعوات المملوكة للعملاء" },
        ]}
      />
      <div className="customer-sync-note">
        <UsersRound size={18} />
        <span>أي دعوة جديدة من الأدمن أو تحويل طلب لدعوة بتنشئ/تحدث حساب العميل هنا تلقائيًا.</span>
        <strong>
          <UserCheck size={15} />
          متزامن
        </strong>
      </div>
      <div className="table-shell">
        <table className="data-table">
          <thead>
            <tr>
              <th>العميل</th>
              <th>الهاتف</th>
              <th>اسم الدخول</th>
              <th>عدد الدعوات</th>
              <th>الحالة</th>
              <th>ملاحظات داخلية</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {customers.slice(0, 50).map((customer) => (
              <tr key={customer.username}>
                <td>{customer.name}</td>
                <td>{customer.phone}</td>
                <td>{customer.username}</td>
                <td>{customer.invitations}</td>
                <td>
                  <span className={customer.isActive ? "status success" : "status danger"}>{customer.isActive ? "نشط" : "متوقف"}</span>
                </td>
                <td>
                  <InternalNotesPanel
                    entityType="customer"
                    entityId={customer.id}
                    notes={notesByEntity.get(`customer:${customer.id}`) || []}
                    returnTo="/admin/customers"
                    compact
                  />
                </td>
                <td>
                  <div className="button-row">
                    <FavoriteToggleButton
                      entityType="customer"
                      entityId={customer.id}
                      label={customer.name}
                      href="/admin/customers"
                      returnTo="/admin/customers"
                      active={isAdminFavorite(favorites, "customer", customer.id)}
                      iconOnly
                    />

                    <form action={`/api/admin/customers/${customer.id}`} method="post">
                      <button className="btn btn-soft danger-button" name="action" value="delete" type="submit">
                        <Trash2 size={17} />
                        نقل للمهملات
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {customers.length > 50 ? <p className="admin-note">عرض أول 50 عميلاً من أصل {customers.length}.</p> : null}
      </div>
    </>
  );
}
