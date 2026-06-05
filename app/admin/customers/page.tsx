import { KeyRound, UserPlus } from "lucide-react";

const customers = [
  { name: "سيف وليلى", phone: "01012345678", username: "saif-laila", invitations: 1 },
  { name: "آدم ومريم", phone: "01198765432", username: "adam-mariam", invitations: 1 },
];

export default function CustomersPage() {
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
