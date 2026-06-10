"use client";

import { useMemo, useState } from "react";
import { Download, MessageCircle, Search } from "lucide-react";
import { CopyButton } from "./CopyButton";
import type { GuestRsvp } from "@/lib/types";
import { formatArabicNumber, normalizePhoneForWhatsApp } from "@/lib/utils";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function GuestTable({ guests, invitationCode }: { guests: GuestRsvp[]; invitationCode?: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | GuestRsvp["status"]>("all");
  const filteredGuests = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesStatus = status === "all" || guest.status === status;
      if (!matchesStatus) return false;
      if (!cleanQuery) return true;
      return [guest.name, guest.phone, guest.note || ""].join(" ").toLowerCase().includes(cleanQuery);
    });
  }, [guests, query, status]);

  return (
    <div className="guest-table-mobile">
      <div className="guest-table-toolbar">
        <label className="guest-search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث بالاسم أو الرقم" />
        </label>
        <div className="guest-filter-tabs" role="tablist" aria-label="فلترة قائمة الحضور">
          <button className={status === "all" ? "active" : ""} type="button" onClick={() => setStatus("all")}>
            الكل
          </button>
          <button className={status === "confirmed" ? "active" : ""} type="button" onClick={() => setStatus("confirmed")}>
            حاضر
          </button>
          <button className={status === "declined" ? "active" : ""} type="button" onClick={() => setStatus("declined")}>
            معتذر
          </button>
        </div>
        {invitationCode ? (
          <div className="guest-export-actions">
            <a className="btn btn-soft" href={`/api/invitations/${invitationCode}/export/excel`}>
              <Download size={16} />
              Excel
            </a>
            <a className="btn btn-soft" href={`/api/invitations/${invitationCode}/export/pdf`}>
              <Download size={16} />
              PDF
            </a>
          </div>
        ) : null}
        <small>{formatArabicNumber(filteredGuests.length)} من {formatArabicNumber(guests.length)} رد</small>
      </div>

      <div className="guest-mobile-list">
        {filteredGuests.map((guest) => (
          <article className="guest-mobile-card" key={guest.id}>
            <div>
              <strong>{guest.name}</strong>
              <span className={guest.status === "confirmed" ? "status success" : "status danger"}>{guest.status === "confirmed" ? "حاضر" : "معتذر"}</span>
            </div>
            <p>{formatArabicNumber(guest.attendees)} فرد · {formatDate(guest.createdAt)}</p>
            <footer>
              <span dir="ltr">{guest.phone || "بدون رقم"}</span>
              <div className="button-row">
                {guest.phone ? (
                  <a className="btn btn-soft btn-icon" href={`https://wa.me/${normalizePhoneForWhatsApp(guest.phone)}`} title="واتساب">
                    <MessageCircle size={17} />
                  </a>
                ) : null}
                {guest.phone ? <CopyButton className="btn btn-soft btn-icon" value={guest.phone} title="نسخ الرقم" iconOnly /> : null}
              </div>
            </footer>
          </article>
        ))}
      </div>

      <div className="table-shell guest-table-desktop">
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
            {filteredGuests.map((guest) => (
              <tr key={guest.id}>
                <td>{guest.name}</td>
                <td>{guest.phone}</td>
                <td>{formatArabicNumber(guest.attendees)}</td>
                <td>
                  <span className={guest.status === "confirmed" ? "status success" : "status danger"}>{guest.status === "confirmed" ? "حاضر" : "معتذر"}</span>
                </td>
                <td>{formatDate(guest.createdAt)}</td>
                <td>
                  <div className="button-row">
                    {guest.phone ? (
                      <a className="btn btn-soft btn-icon" href={`https://wa.me/${normalizePhoneForWhatsApp(guest.phone)}`} title="واتساب">
                        <MessageCircle size={17} />
                      </a>
                    ) : null}
                    {guest.phone ? <CopyButton className="btn btn-soft btn-icon" value={guest.phone} title="نسخ الرقم" iconOnly /> : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!filteredGuests.length ? (
        <div className="admin-empty-state compact">
          <strong>لا توجد نتائج مطابقة.</strong>
        </div>
      ) : null}
    </div>
  );
}
