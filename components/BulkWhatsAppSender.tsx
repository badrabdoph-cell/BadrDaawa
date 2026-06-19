"use client";

import { MessageCircle, Loader2, Send, Users, Smartphone, Bell, AlertTriangle } from "lucide-react";
import type { GuestRsvp } from "@/lib/types";
import { normalizePhoneForWhatsApp } from "@/lib/utils";
import { useState } from "react";

type SendMode = "whatsapp" | "sms" | "notification";

export function BulkWhatsAppSender({ guests, invitationViews }: { guests: GuestRsvp[]; invitationViews?: number }) {
  const [message, setMessage] = useState("مرحباً! نحن في انتظارك في حفل الزفاف 🎉");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(0);
  const [mode, setMode] = useState<SendMode>("whatsapp");
  const [showError, setShowError] = useState(false);

  const phoneGuests = guests.filter((g) => g.phone && g.status === "confirmed");

  function handleSend() {
    if (!message.trim()) return;
    setShowError(true);
    setTimeout(() => setShowError(false), 5000);
  }

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

  const MODE_ICONS: Record<SendMode, React.ReactNode> = {
    whatsapp: <MessageCircle size={18} />,
    sms: <Smartphone size={18} />,
    notification: <Bell size={18} />,
  };

  const MODE_LABELS: Record<SendMode, string> = {
    whatsapp: "واتساب",
    sms: "SMS",
    notification: "إشعارات الموقع",
  };

  return (
    <div className="bulk-whatsapp-panel">
      {showError ? (
        <div className="bulk-send-error-alert">
          <AlertTriangle size={20} />
          <div>
            <strong>لم يتم تفعيل ميزه الرسائل لك</strong>
            <p>هذه الخاصية قيد التطوير، سيتم تفعيلها قريباً.</p>
          </div>
        </div>
      ) : null}

      <div className="bulk-send-mode-tabs">
        {(Object.keys(MODE_LABELS) as SendMode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={mode === m ? "active" : ""}
            onClick={() => { setMode(m); setShowError(false); }}
          >
            {MODE_ICONS[m]}
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      <div className="bulk-whatsapp-head">
        {MODE_ICONS[mode]}
        <div>
          <strong>إرسال جماعي عبر {MODE_LABELS[mode]}</strong>
          {mode === "notification" ? (
            <p>{invitationViews ?? 0} زيارة</p>
          ) : (
            <p>{phoneGuests.length} ضيف مؤكد لديه رقم هاتف</p>
          )}
        </div>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        placeholder={`رسالتك... استخدم {name} لاسم الضيف`}
      />

      <button className="btn btn-gold" type="button" onClick={handleSend} disabled={busy}>
        {busy ? <Loader2 size={17} /> : <Send size={17} />}
        {mode === "notification"
          ? `إرسال إشعار إلى ${invitationViews ?? 0} زيارة`
          : `إرسال إلى ${phoneGuests.length} ضيف`
        }
      </button>

      {mode === "whatsapp" ? (
        <small>سيتم فتح نافذة واتساب لكل ضيف على حدة. قد يطلب المتصفح السماح بالنوافذ المنبثقة.</small>
      ) : mode === "sms" ? (
        <small>سيتم إرسال رسالة SMS لكل ضيف لديه رقم هاتف.</small>
      ) : (
        <small>سيظهر الإشعار لكل زائر عند فتح الدعوة.</small>
      )}
    </div>
  );
}
