"use client";

import { MessageCircle, Loader2, Send, Users } from "lucide-react";
import type { GuestRsvp } from "@/lib/types";
import { normalizePhoneForWhatsApp } from "@/lib/utils";
import { useState } from "react";

export function BulkWhatsAppSender({ guests }: { guests: GuestRsvp[] }) {
  const [message, setMessage] = useState("مرحباً! نحن في انتظارك في حفل الزفاف 🎉");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(0);

  const phoneGuests = guests.filter((g) => g.phone && g.status === "confirmed");

  function openAll() {
    setBusy(true);
    setSent(0);
    let index = 0;
    function openNext() {
      if (index >= phoneGuests.length) {
        setBusy(false);
        return;
      }
      const guest = phoneGuests[index];
      const personalMessage = message.replace(/{name}/g, guest.name);
      window.open(`https://wa.me/${normalizePhoneForWhatsApp(guest.phone)}?text=${encodeURIComponent(personalMessage)}`, "_blank");
      index++;
      setSent(index);
      setTimeout(openNext, 800);
    }
    openNext();
  }

  return (
    <div className="bulk-whatsapp-panel">
      <div className="bulk-whatsapp-head">
        <MessageCircle size={20} />
        <div>
          <strong>إرسال جماعي عبر واتساب</strong>
          <p>{phoneGuests.length} ضيف مؤكد لديه رقم هاتف</p>
        </div>
      </div>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder="رسالتك... استخدم {name} لاسم الضيف"
      />
      <button className="btn btn-gold" type="button" onClick={openAll} disabled={busy || phoneGuests.length === 0}>
        {busy ? <Loader2 size={17} /> : <Send size={17} />}
        {busy ? `جاري الإرسال... ${sent}/${phoneGuests.length}` : `إرسال إلى ${phoneGuests.length} ضيف`}
      </button>
      <small>سيتم فتح نافذة واتساب لكل ضيف على حدة. قد يطلب المتصفح السماح بالنوافذ المنبثقة.</small>
    </div>
  );
}
