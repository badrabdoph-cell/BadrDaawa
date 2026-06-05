import { MessageCircle } from "lucide-react";
import { CopyButton } from "./CopyButton";
import type { GuestRsvp } from "@/lib/types";
import { normalizePhoneForWhatsApp } from "@/lib/utils";

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
                  <a className="btn btn-soft btn-icon" href={`https://wa.me/${normalizePhoneForWhatsApp(guest.phone)}`} title="واتساب">
                    <MessageCircle size={17} />
                  </a>
                  <CopyButton className="btn btn-soft btn-icon" value={guest.phone} title="نسخ الرقم" iconOnly />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
