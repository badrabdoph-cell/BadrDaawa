"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Camera, Check, Loader2, MessageCircle } from "lucide-react";
import type { TemplateDefinition } from "@/lib/types";
import { getWhatsAppOrderUrl } from "@/lib/utils";

type FormState = {
  groomName: string;
  brideName: string;
  phone: string;
  weddingDate: string;
  mapUrl: string;
  venue: string;
  notes: string;
  templateSlug: string;
  language: "ar" | "en";
};

type OrderTemplateOption = Pick<TemplateDefinition, "slug" | "name" | "arabicName" | "previewImage">;

export function OrderForm({ initialTemplate, templates }: { initialTemplate?: string; templates: OrderTemplateOption[] }) {
  const fallbackTemplate = templates[0] || { slug: "royal-envelope", name: "Royal Envelope", arabicName: "Royal Envelope", previewImage: "/assets/templates/royal-envelope.svg" };
  const initialSlug = templates.some((template) => template.slug === initialTemplate) ? initialTemplate! : fallbackTemplate.slug;
  const [step, setStep] = useState<"template" | "details">("template");
  const [form, setForm] = useState<FormState>({
    groomName: "",
    brideName: "",
    phone: "",
    weddingDate: "",
    mapUrl: "",
    venue: "",
    notes: "",
    templateSlug: initialSlug,
    language: "ar",
  });
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.slug === form.templateSlug) || fallbackTemplate,
    [fallbackTemplate, form.templateSlug, templates],
  );

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function selectTemplate(slug: string) {
    updateField("templateSlug", slug);
    setStep("details");
  }

  function photographerWhatsAppUrl() {
    return getWhatsAppOrderUrl('دعوتي اعلانيه لمصور فوتوغرافي');
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    const message = [
      "طلب دعوة جديد من BadrDaawa",
      `القالب: ${selectedTemplate.arabicName} - ${selectedTemplate.name}`,
      `العريس: ${form.groomName}`,
      `العروسة: ${form.brideName}`,
      `رقم الموبايل: ${form.phone}`,
      `تاريخ الفرح: ${form.weddingDate}`,
      `العنوان / اسم القاعة: ${form.venue}`,
      `لوكيشن الخريطة: ${form.mapUrl}`,
      form.notes ? `ملاحظات: ${form.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          venue: `${form.venue}${form.mapUrl ? ` - ${form.mapUrl}` : ""}`,
          notes: [form.notes, form.mapUrl ? `لوكيشن الخريطة: ${form.mapUrl}` : ""].filter(Boolean).join("\n"),
        }),
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
    <div className="order-flow">
      <div className="order-steps" aria-label="مراحل الطلب">
        <span className={step === "template" ? "active" : ""}>1. اختر القالب</span>
        <span className={step === "details" ? "active" : ""}>2. املأ البيانات</span>
      </div>

      {step === "template" ? (
        <section className="template-picker">
          <div className="template-picker-head">
            <span className="eyebrow">المرحلة الأولى</span>
            <h2>اختر القالب</h2>
            <p>اختيار القالب مطلوب قبل كتابة البيانات. لما نضيف قوالب جديدة هتظهر هنا تلقائيًا بنفس الشكل.</p>
          </div>
          <div className="order-template-grid">
            {templates.map((template) => (
              <button
                className={`order-template-card ${form.templateSlug === template.slug ? "selected" : ""}`}
                key={template.slug}
                type="button"
                onClick={() => selectTemplate(template.slug)}
              >
                <span className="template-thumb">
                  <img src={template.previewImage} alt={template.arabicName} />
                </span>
                <span className="template-card-copy">
                  <strong>{template.arabicName}</strong>
                  <small>{template.name}</small>
                </span>
                <span className="template-select-mark">
                  <Check size={16} />
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : (
        <form className="form-panel details-form" onSubmit={submitOrder}>
          <div className="selected-template-strip">
            <button className="btn btn-soft btn-glass" type="button" onClick={() => setStep("template")}>
              <ArrowRight size={17} />
              تغيير القالب
            </button>
            <strong>{selectedTemplate.arabicName}</strong>
          </div>

          <div className="input-grid">
            <div className="field">
              <label htmlFor="groomName">اسم العريس</label>
              <input id="groomName" placeholder="مثال: بدر" value={form.groomName} onChange={(event) => updateField("groomName", event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="brideName">اسم العروسة</label>
              <input id="brideName" placeholder="مثال: Sara" value={form.brideName} onChange={(event) => updateField("brideName", event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="phone">رقم الموبايل</label>
              <input id="phone" inputMode="tel" placeholder="010..." value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="weddingDate">تاريخ الفرح</label>
              <input id="weddingDate" type="date" value={form.weddingDate} onChange={(event) => updateField("weddingDate", event.target.value)} required />
            </div>
            <div className="field full">
              <label htmlFor="mapUrl">اللوكيشن على الخريطة</label>
              <input id="mapUrl" inputMode="url" placeholder="رابط Google Maps" value={form.mapUrl} onChange={(event) => updateField("mapUrl", event.target.value)} required />
            </div>
            <div className="field full">
              <label htmlFor="venue">العنوان واسم القاعة</label>
              <input id="venue" placeholder="مثال: قاعة رويال - البحيرة" value={form.venue} onChange={(event) => updateField("venue", event.target.value)} required />
            </div>
            <div className="field full">
              <label htmlFor="notes">ملاحظات اختيارية</label>
              <textarea id="notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="أي تفاصيل مهمة" />
            </div>
          </div>

          <a className="photographer-cta" href={photographerWhatsAppUrl()} target="_blank" rel="noreferrer">
            <Camera size={20} />
            <span>
              <strong>هل انت مصور فوتوغرافي؟</strong>
              <small>تصميم خاص ليك دعائي 😃</small>
            </span>
          </a>

          <button className="btn btn-gold btn-glow order-submit" type="submit" disabled={state === "loading"}>
            {state === "loading" ? <Loader2 size={19} className="animate-float" /> : <MessageCircle size={19} />}
            {state === "loading" ? "جاري إرسال الطلب" : "تأكيد الطلب على واتساب"}
          </button>
          {message ? <p className="status danger">{message}</p> : null}
        </form>
      )}
    </div>
  );
}
