"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { invitationTemplates } from "@/lib/templates";
import { getWhatsAppOrderUrl } from "@/lib/utils";

type FormState = {
  groomName: string;
  brideName: string;
  phone: string;
  weddingDate: string;
  venue: string;
  notes: string;
  templateSlug: string;
  language: "ar" | "en";
};

export function OrderForm({ initialTemplate }: { initialTemplate?: string }) {
  const [form, setForm] = useState<FormState>({
    groomName: "",
    brideName: "",
    phone: "",
    weddingDate: "",
    venue: "",
    notes: "",
    templateSlug: initialTemplate || invitationTemplates[0].slug,
    language: "ar",
  });
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const selectedTemplate = useMemo(
    () => invitationTemplates.find((template) => template.slug === form.templateSlug) || invitationTemplates[0],
    [form.templateSlug],
  );

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    const message = [
      "طلب دعوة جديد من BadrDaawa",
      `اسم العميل: ${form.groomName || "غير مكتمل"} و ${form.brideName || "غير مكتمل"}`,
      `العريس: ${form.groomName}`,
      `العروسة: ${form.brideName}`,
      `رقم الهاتف: ${form.phone}`,
      `القالب: ${selectedTemplate.arabicName} - ${selectedTemplate.name}`,
      `لغة الدعوة: ${form.language === "ar" ? "عربي" : "English"}`,
      `تاريخ الفرح: ${form.weddingDate}`,
      `مكان الفرح: ${form.venue}`,
      form.notes ? `ملاحظات: ${form.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setState("error");
        setMessage(data?.error || "راجع بيانات الطلب وحاول مرة أخرى.");
        return;
      }

      window.location.href = getWhatsAppOrderUrl(message);
    } catch {
      setState("error");
      setMessage("تعذر إرسال الطلب للخادم. حاول مرة أخرى.");
    }
  }

  return (
    <form className="form-panel" onSubmit={submitOrder}>
      <div className="input-grid">
        <div className="field">
          <label htmlFor="groomName">اسم العريس</label>
          <input id="groomName" value={form.groomName} onChange={(event) => updateField("groomName", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="brideName">اسم العروسة</label>
          <input id="brideName" value={form.brideName} onChange={(event) => updateField("brideName", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="phone">رقم الهاتف</label>
          <input id="phone" inputMode="tel" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="weddingDate">تاريخ الفرح</label>
          <input id="weddingDate" type="date" value={form.weddingDate} onChange={(event) => updateField("weddingDate", event.target.value)} required />
        </div>
        <div className="field full">
          <label htmlFor="venue">مكان الفرح</label>
          <input id="venue" value={form.venue} onChange={(event) => updateField("venue", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="templateSlug">اختيار القالب</label>
          <select id="templateSlug" value={form.templateSlug} onChange={(event) => updateField("templateSlug", event.target.value)}>
            {invitationTemplates.map((template) => (
              <option key={template.slug} value={template.slug}>
                {template.arabicName}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="language">لغة الدعوة</label>
          <select id="language" value={form.language} onChange={(event) => updateField("language", event.target.value)}>
            <option value="ar">عربي</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="field full">
          <label htmlFor="notes">ملاحظات</label>
          <textarea id="notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="اكتب أي تفاصيل مهمة عن الصور، الموسيقى، أو شكل الدعوة" />
        </div>
      </div>
      <div className="button-row" style={{ marginTop: 18 }}>
        <button className="btn btn-gold" type="submit" disabled={state === "loading"}>
          {state === "loading" ? <Loader2 size={19} className="animate-float" /> : <MessageCircle size={19} />}
          {state === "loading" ? "جاري إرسال الطلب" : "إرسال الطلب على واتساب"}
        </button>
        <a className="btn btn-soft" href={`/templates?preview=${selectedTemplate.slug}`}>
          <Send size={18} />
          معاينة القالب المختار
        </a>
      </div>
      {message ? <p className="status danger">{message}</p> : null}
    </form>
  );
}
