"use client";

import { useMemo, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
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
  packageId: "starter" | "premium" | "royal";
  deliverySpeed: "normal" | "fast";
  addons: string[];
};

const packages = [
  { id: "starter", name: "Starter", price: "750 ج" },
  { id: "premium", name: "Premium", price: "1500 ج" },
  { id: "royal", name: "Royal", price: "3000 ج" },
] as const;

const deliverySpeeds = [
  { id: "normal", name: "تجهيز عادي", text: "خلال 48 ساعة" },
  { id: "fast", name: "تجهيز سريع", text: "خلال 24 ساعة" },
] as const;

const addons = ["صور", "موسيقى", "خريطة", "QR"];

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
    packageId: "premium",
    deliverySpeed: "normal",
    addons: ["خريطة القاعة", "QR للطباعة"],
  });
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const selectedTemplate = useMemo(
    () => invitationTemplates.find((template) => template.slug === form.templateSlug) || invitationTemplates[0],
    [form.templateSlug],
  );

  function updateField<K extends Exclude<keyof FormState, "addons">>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleAddon(addon: string) {
    setForm((current) => ({
      ...current,
      addons: current.addons.includes(addon) ? current.addons.filter((item) => item !== addon) : [...current.addons, addon],
    }));
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
      `الباقة: ${packages.find((item) => item.id === form.packageId)?.name}`,
      `سرعة التجهيز: ${deliverySpeeds.find((item) => item.id === form.deliverySpeed)?.name}`,
      `الإضافات: ${form.addons.length ? form.addons.join(", ") : "بدون إضافات"}`,
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
      <div className="choice-section">
        <h2>اختر الباقة</h2>
        <div className="choice-grid">
          {packages.map((item) => (
            <button
              className={`choice-card ${form.packageId === item.id ? "selected" : ""}`}
              key={item.id}
              type="button"
              onClick={() => updateField("packageId", item.id)}
            >
              <strong>{item.name}</strong>
              <span>{item.price}</span>
            </button>
          ))}
        </div>
        <h2>سرعة التجهيز</h2>
        <div className="choice-grid two">
          {deliverySpeeds.map((item) => (
            <button
              className={`choice-card ${form.deliverySpeed === item.id ? "selected" : ""}`}
              key={item.id}
              type="button"
              onClick={() => updateField("deliverySpeed", item.id)}
            >
              <strong>{item.name}</strong>
              <small>{item.text}</small>
            </button>
          ))}
        </div>
        <h2>إضافات</h2>
        <div className="chip-grid" aria-label="إضافات الطلب">
          {addons.map((addon) => (
            <button className={`choice-chip ${form.addons.includes(addon) ? "selected" : ""}`} key={addon} type="button" onClick={() => toggleAddon(addon)}>
              {addon}
            </button>
          ))}
        </div>
      </div>
      <div className="input-grid">
        <div className="field">
          <label htmlFor="groomName">اسم العريس</label>
          <input id="groomName" placeholder="مثال: أحمد" value={form.groomName} onChange={(event) => updateField("groomName", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="brideName">اسم العروسة</label>
          <input id="brideName" placeholder="مثال: سارة" value={form.brideName} onChange={(event) => updateField("brideName", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="phone">رقم الهاتف</label>
          <input id="phone" inputMode="tel" placeholder="010..." value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="weddingDate">تاريخ الفرح</label>
          <input id="weddingDate" type="date" value={form.weddingDate} onChange={(event) => updateField("weddingDate", event.target.value)} required />
        </div>
        <div className="field full">
          <label htmlFor="venue">مكان الفرح</label>
          <input id="venue" placeholder="اسم القاعة أو المكان" value={form.venue} onChange={(event) => updateField("venue", event.target.value)} required />
        </div>
        <div className="field full">
          <label htmlFor="notes">ملاحظات</label>
          <textarea id="notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="أي تفاصيل إضافية" />
        </div>
      </div>
      <div className="button-row" style={{ marginTop: 18 }}>
        <button className="btn btn-gold" type="submit" disabled={state === "loading"}>
          {state === "loading" ? <Loader2 size={19} className="animate-float" /> : <MessageCircle size={19} />}
          {state === "loading" ? "جاري إرسال الطلب" : "إرسال الطلب على واتساب"}
        </button>
      </div>
      {message ? <p className="status danger">{message}</p> : null}
    </form>
  );
}
