import { KeyRound, UserPlus } from "lucide-react";
import { getAdminCustomers } from "@/lib/admin-data";

export default async function CustomersPage() {
  const customers = await getAdminCustomers();

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Customers</span>
          <h1>العملاء وبيانات الدخول</h1>
        </div>
        <button className="btn btn-gold" type="button">
          <UserPlus size={18} />
          عميل جديد
        </button>
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
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.username}>
                <td>{customer.name}</td>
                <td>{customer.phone}</td>
                <td>{customer.username}</td>
                <td>{customer.invitations}</td>
                <td>
                  <span className={customer.isActive ? "status success" : "status danger"}>{customer.isActive ? "نشط" : "متوقف"}</span>
                </td>
                <td>
                  <button className="btn btn-soft" type="button">
                    <KeyRound size={17} />
                    Reset Password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
