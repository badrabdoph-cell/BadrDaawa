"use client";

import { useMemo, useState } from "react";
import { Download, MessageCircle, Search, ChevronLeft, ChevronRight, Send } from "lucide-react";
import { CopyButton } from "./CopyButton";
import { BulkWhatsAppSender } from "./BulkWhatsAppSender";
import { GuestExcelImport } from "./GuestExcelImport";
import type { GuestRsvp } from "@/lib/types";
import { formatArabicNumber, formatDateTime, normalizePhoneForWhatsApp } from "@/lib/utils";

const PAGE_SIZE = 25;

function copyGuestValue(guest: GuestRsvp) {
  return `${guest.name}\n${guest.phone || "بدون رقم"}`;
}

export function GuestTable({ guests, invitationCode, invitationViews }: { guests: GuestRsvp[]; invitationCode?: string; invitationViews?: number }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | GuestRsvp["status"]>("all");
  const [page, setPage] = useState(0);
  const [showBulk, setShowBulk] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const filteredGuests = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    return guests.filter((guest) => {
      const matchesStatus = status === "all" || guest.status === status;
      if (!matchesStatus) return false;
      if (!cleanQuery) return true;
      return [guest.name, guest.phone, guest.note || ""].join(" ").toLowerCase().includes(cleanQuery);
    });
  }, [guests, query, status]);

  const totalPages = Math.max(1, Math.ceil(filteredGuests.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageGuests = filteredGuests.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function handleRefresh() {
    setQuery("");
    setStatus("all");
    setPage(0);
  }

  return (
    <div className="guest-table-mobile">
      <div className="guest-table-toolbar">
        <label className="guest-search-field">
          <Search size={17} />
          <input value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="بحث بالاسم أو الرقم" />
        </label>
        <div className="guest-filter-tabs" role="tablist" aria-label="فلترة قائمة الحضور">
          <button className={status === "all" ? "active" : ""} type="button" onClick={() => { setStatus("all"); setPage(0); }}>
            الكل
          </button>
          <button className={status === "confirmed" ? "active" : ""} type="button" onClick={() => { setStatus("confirmed"); setPage(0); }}>
            حاضر
          </button>
          <button className={status === "declined" ? "active" : ""} type="button" onClick={() => { setStatus("declined"); setPage(0); }}>
            معتذر
          </button>
        </div>
        <div className="guest-table-actions">
          {invitationCode ? (
            <>
              <a className="btn btn-soft" href={`/api/invitations/${invitationCode}/export/excel`}>
                <Download size={16} /> Excel
              </a>
              <a className="btn btn-soft" href={`/api/invitations/${invitationCode}/export/pdf`}>
                <Download size={16} /> PDF
              </a>
              <button className="btn btn-soft" type="button" onClick={() => setShowBulk(!showBulk)}>
                <Send size={16} /> إرسال جماعي
              </button>
              <button className="btn btn-soft" type="button" onClick={() => setShowImport(!showImport)}>
                <Download size={16} /> استيراد
              </button>
            </>
          ) : null}
        </div>
        <small>{formatArabicNumber(filteredGuests.length)} من {formatArabicNumber(guests.length)} رد</small>
      </div>

      {showBulk && invitationCode ? (
        <div className="bulk-whatsapp-wrapper">
          <BulkWhatsAppSender guests={guests} invitationViews={invitationViews} />
        </div>
      ) : null}

      {showImport && invitationCode ? (
        <div className="guest-excel-import-wrapper">
          <GuestExcelImport invitationCode={invitationCode} onImport={handleRefresh} />
        </div>
      ) : null}

      <div className="guest-mobile-list">
        {pageGuests.map((guest) => (
          <article className="guest-mobile-row" key={guest.id}>
            <div className="guest-mobile-row-main">
              <div className="guest-mobile-identity">
                <strong>{guest.name}</strong>
                <span className={guest.status === "confirmed" ? "status success" : "status danger"}>{guest.status === "confirmed" ? "حاضر" : "معتذر"}</span>
              </div>
              <span className="guest-mobile-phone" dir="ltr">{guest.phone || "بدون رقم"}</span>
              <div className="guest-mobile-actions">
                {guest.phone ? (
                  <a className="btn btn-soft btn-icon" href={`https://wa.me/${normalizePhoneForWhatsApp(guest.phone)}?text=${encodeURIComponent("مرحباً! نحن في انتظارك في حفل الزفاف 🎉")}`} title="واتساب" aria-label={`مراسلة ${guest.name} عبر واتساب`}>
                    <MessageCircle size={16} />
                  </a>
                ) : null}
                <CopyButton className="btn btn-soft btn-icon" value={copyGuestValue(guest)} title="نسخ الاسم والرقم" iconOnly />
              </div>
            </div>
            <p>{formatArabicNumber(guest.attendees)} فرد • {formatDateTime(guest.createdAt)}</p>
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
            {pageGuests.map((guest) => (
              <tr key={guest.id}>
                <td>{guest.name}</td>
                <td>{guest.phone}</td>
                <td>{formatArabicNumber(guest.attendees)}</td>
                <td>
                  <span className={guest.status === "confirmed" ? "status success" : "status danger"}>{guest.status === "confirmed" ? "حاضر" : "معتذر"}</span>
                </td>
                <td>{formatDateTime(guest.createdAt)}</td>
                <td>
                  <div className="button-row">
                    {guest.phone ? (
                      <a className="btn btn-soft btn-icon" href={`https://wa.me/${normalizePhoneForWhatsApp(guest.phone)}?text=${encodeURIComponent("مرحباً! نحن في انتظارك في حفل الزفاف 🎉")}`} title="واتساب">
                        <MessageCircle size={17} />
                      </a>
                    ) : null}
                    <CopyButton className="btn btn-soft btn-icon" value={copyGuestValue(guest)} title="نسخ الاسم والرقم" iconOnly />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="guest-pagination">
          <button className="btn btn-soft" type="button" onClick={() => setPage(Math.max(0, safePage - 1))} disabled={safePage === 0}>
            <ChevronRight size={16} /> السابق
          </button>
          <span>{safePage + 1} / {totalPages}</span>
          <button className="btn btn-soft" type="button" onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))} disabled={safePage >= totalPages - 1}>
            التالي <ChevronLeft size={16} />
          </button>
        </div>
      ) : null}

      {!filteredGuests.length ? (
        <div className="admin-empty-state compact">
          <strong>لا توجد نتائج مطابقة.</strong>
        </div>
      ) : null}
    </div>
  );
}
