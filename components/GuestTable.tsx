import { Copy, MessageCircle, Trash2 } from "lucide-react";
import type { GuestRsvp } from "@/lib/types";

export function GuestTable({ guests }: { guests: GuestRsvp[] }) {
  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>الاسم</th>
            <th>الهاتف</th>
            <th>عدد الأفراد</th>
            <th>الحالة</th>
            <th>تاريخ التسجيل</th>
            <th>أدوات</th>
          </tr>
        </thead>
        <tbody>
          {guests.map((guest) => (
            <tr key={guest.id}>
              <td>{guest.name}</td>
              <td>{guest.phone}</td>
              <td>{guest.attendees}</td>
              <td>
                <span className={guest.status === "confirmed" ? "status success" : "status danger"}>{guest.status === "confirmed" ? "حاضر" : "معتذر"}</span>
              </td>
              <td>{new Date(guest.createdAt).toLocaleDateString("ar-EG")}</td>
              <td>
                <div className="button-row">
                  <a className="btn btn-soft btn-icon" href={`https://wa.me/2${guest.phone.replace(/^0/, "")}`} title="واتساب">
                    <MessageCircle size={17} />
                  </a>
                  <button className="btn btn-soft btn-icon" type="button" title="نسخ الرقم">
                    <Copy size={17} />
                  </button>
                  <button className="btn btn-soft btn-icon" type="button" title="حذف الرد">
                    <Trash2 size={17} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
