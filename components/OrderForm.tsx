"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Camera, Check, Eye, Loader2, MessageCircle, Palette } from "lucide-react";
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
  const [step, setStep] = useState<"template" | "details">(initialTemplate ? "details" : "template");
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

  function fieldValue(value: string, fallback = "لم يكتب بعد") {
    return value.trim() || fallback;
  }

  function previewHref() {
    const params = new URLSearchParams();
    params.set("groomName", form.groomName || "اسم العريس");
    params.set("brideName", form.brideName || "اسم العروسة");
    if (form.weddingDate) params.set("weddingDate", form.weddingDate);
    if (form.venue) params.set("venue", form.venue);
    if (form.mapUrl) params.set("mapUrl", form.mapUrl);
    return `/templates/${form.templateSlug}/preview?${params.toString()}`;
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    const message = [
      "طلب دعوة جديد من BadrDaawa",
      `القالب: ${selectedTemplate.arabicName} - ${selectedTemplate.name}`,
      `العريس: ${fieldValue(form.groomName)}`,
      `العروسة: ${fieldValue(form.brideName)}`,
      `رقم الموبايل: ${fieldValue(form.phone)}`,
      `تاريخ الفرح: ${form.weddingDate}`,
      `العنوان / اسم القاعة: ${fieldValue(form.venue)}`,
      `لوكيشن الخريطة: ${fieldValue(form.mapUrl)}`,
      form.notes ? `ملاحظات: ${form.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const orderVenue = [form.venue, form.mapUrl].filter((value) => value.trim()).join(" - ");
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          venue: orderVenue,
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
        <span className={step === "details" ? "active" : ""}>2. بيانات الفرح</span>
      </div>

      {step === "template" ? (
        <section className="template-picker">
          <div className="template-picker-head">
            <span className="eyebrow">المرحلة الأولى</span>
            <h2>اختار الاستايل الأقرب لفرحتك</h2>
            <p>دوس على القالب اللي عجبك، وتقدر ترجع تغيره في أي وقت قبل تأكيد الطلب.</p>
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
            <div>
              <span className="eyebrow">القالب المختار</span>
              <strong>{selectedTemplate.arabicName}</strong>
            </div>
            <div className="selected-template-actions">
              <button className="btn btn-soft btn-glass" type="button" onClick={() => setStep("template")}>
                <Palette size={17} />
                تغيير القالب
              </button>
              <a className="btn btn-soft btn-glass" href={previewHref()} target="_blank" rel="noreferrer">
                <Eye size={17} />
                عاين ببياناتي
              </a>
            </div>
          </div>

          <div className="input-grid">
            <div className="field">
              <label htmlFor="groomName">اسم العريس *</label>
              <input id="groomName" placeholder="اكتب الاسم كما تحب ظهوره في الدعوة، مثال: Badr" value={form.groomName} onChange={(event) => updateField("groomName", event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="brideName">اسم العروسة *</label>
              <input id="brideName" placeholder="اكتب الاسم كما تحب ظهوره في الدعوة، مثال: Sara" value={form.brideName} onChange={(event) => updateField("brideName", event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="phone">رقم الموبايل</label>
              <input id="phone" inputMode="tel" placeholder="اختياري، لكن يسهّل علينا التواصل السريع معاك" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="weddingDate">تاريخ الفرح *</label>
              <input id="weddingDate" type="date" value={form.weddingDate} onChange={(event) => updateField("weddingDate", event.target.value)} required />
            </div>
            <div className="field full">
              <label htmlFor="mapUrl">اللوكيشن على الخريطة</label>
              <input id="mapUrl" inputMode="url" placeholder="اختياري: انسخ رابط Google Maps هنا لو متاح، أو اتركه ونضيفه معاك لاحقًا" value={form.mapUrl} onChange={(event) => updateField("mapUrl", event.target.value)} />
            </div>
            <div className="field full">
              <label htmlFor="venue">العنوان واسم القاعة</label>
              <input id="venue" placeholder="اختياري: مثال قاعة رويال - البحيرة. ينفع نكمله معاك بعد الطلب" value={form.venue} onChange={(event) => updateField("venue", event.target.value)} />
            </div>
            <div className="field full">
              <label htmlFor="notes">ملاحظات اختيارية</label>
              <textarea id="notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="اكتب أي ذوق تفضله، ألوان معينة، نص خاص، أو أي تعديل تحب نشوفه في الدعوة" />
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
          <button className="btn btn-soft order-back-button" type="button" onClick={() => setStep("template")}>
            <ArrowRight size={17} />
            رجوع لاختيار قالب آخر
          </button>
        </form>
      )}
    </div>
  );
}
