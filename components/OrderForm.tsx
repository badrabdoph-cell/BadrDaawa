"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowRight, Camera, Check, Eye, Loader2, MessageCircle, Palette } from "lucide-react";
import { ImageCropUploader } from "@/components/ImageCropUploader";
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

const orderImageSlots = [
  {
    title: "الصورة الأولى",
    hint: "الصورة الأساسية اللي تظهر في أول الدعوة والمعاينة.",
  },
  {
    title: "الصورة الثانية",
    hint: "لقطة قريبة أو تفصيلة تكمل شكل القالب.",
  },
  {
    title: "الصورة الثالثة",
    hint: "صورة إضافية للجاليري والحركة داخل الدعوة.",
  },
];

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
  const formRef = useRef<HTMLFormElement | null>(null);

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

  function previewHref(values: Partial<FormState> = form) {
    const params = new URLSearchParams();
    params.set("groomName", values.groomName || "اسم العريس");
    params.set("brideName", values.brideName || "اسم العروسة");
    if (values.weddingDate) params.set("weddingDate", values.weddingDate);
    if (values.venue) params.set("venue", values.venue);
    if (values.mapUrl) params.set("mapUrl", values.mapUrl);
    return `/templates/${form.templateSlug}/preview?${params.toString()}`;
  }

  function getCurrentFormFromDom() {
    const formData = new FormData(formRef.current || undefined);
    return {
      groomName: String(formData.get("groomName") || "").trim(),
      brideName: String(formData.get("brideName") || "").trim(),
      weddingDate: String(formData.get("weddingDate") || "").trim(),
      venue: String(formData.get("venue") || "").trim(),
      mapUrl: String(formData.get("mapUrl") || "").trim(),
    };
  }

  function openPreview() {
    window.location.href = previewHref(getCurrentFormFromDom());
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const orderImages = formData.getAll("orderImage").map((value) => String(value)).filter(Boolean).slice(0, 3);
    const currentForm: FormState = {
      ...form,
      templateSlug: selectedTemplate.slug,
      groomName: String(formData.get("groomName") || "").trim(),
      brideName: String(formData.get("brideName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      weddingDate: String(formData.get("weddingDate") || "").trim(),
      mapUrl: String(formData.get("mapUrl") || "").trim(),
      venue: String(formData.get("venue") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
    };

    const baseMessage = [
      "طلب دعوة جديد من BadrDaawa",
      `القالب: ${selectedTemplate.arabicName} - ${selectedTemplate.name}`,
      `العريس: ${fieldValue(currentForm.groomName)}`,
      `العروسة: ${fieldValue(currentForm.brideName)}`,
      `رقم الموبايل: ${fieldValue(currentForm.phone)}`,
      `تاريخ الفرح: ${currentForm.weddingDate}`,
      `العنوان / اسم القاعة: ${fieldValue(currentForm.venue)}`,
      `لوكيشن الخريطة: ${fieldValue(currentForm.mapUrl)}`,
      currentForm.notes ? `ملاحظات: ${currentForm.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const orderVenue = [currentForm.venue, currentForm.mapUrl].filter((value) => value.trim()).join(" - ");
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentForm,
          venue: orderVenue,
          notes: [currentForm.notes, currentForm.mapUrl ? `لوكيشن الخريطة: ${currentForm.mapUrl}` : ""].filter(Boolean).join("\n"),
          orderImages,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setState("error");
        setMessage(data?.error || "حصل خطأ مؤقت أثناء تأكيد الطلب. جرّب مرة تانية أو افتح واتساب من زر المصور/التواصل.");
        return;
      }

      const data = (await response.json().catch(() => null)) as { imageUrls?: string[] } | null;
      const imageLines = data?.imageUrls?.length ? `\n\nصور الدعوة بالترتيب:\n${data.imageUrls.map((url, index) => `${index + 1}. ${url}`).join("\n")}` : "";
      window.location.href = getWhatsAppOrderUrl(`${baseMessage}${imageLines}`);
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
        <form className="form-panel details-form" onSubmit={submitOrder} ref={formRef}>
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
              <button className="btn btn-soft btn-glass" type="button" onClick={openPreview}>
                <Eye size={17} />
                عاين ببياناتي
              </button>
            </div>
          </div>

          <div className="input-grid">
            <div className="field">
              <label htmlFor="groomName">اسم العريس *</label>
              <input id="groomName" name="groomName" placeholder="اكتب الاسم كما تحب ظهوره في الدعوة، مثال: Badr" value={form.groomName} onChange={(event) => updateField("groomName", event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="brideName">اسم العروسة *</label>
              <input id="brideName" name="brideName" placeholder="اكتب الاسم كما تحب ظهوره في الدعوة، مثال: Sara" value={form.brideName} onChange={(event) => updateField("brideName", event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="phone">رقم الموبايل</label>
              <input id="phone" name="phone" inputMode="tel" placeholder="اختياري، لكن يسهّل علينا التواصل السريع معاك" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="weddingDate">تاريخ الفرح *</label>
              <input id="weddingDate" name="weddingDate" type="date" value={form.weddingDate} onChange={(event) => updateField("weddingDate", event.target.value)} required />
            </div>
            <div className="field full">
              <label htmlFor="mapUrl">اللوكيشن على الخريطة</label>
              <input id="mapUrl" name="mapUrl" inputMode="url" placeholder="اختياري: انسخ رابط Google Maps هنا لو متاح، أو اتركه ونضيفه معاك لاحقًا" value={form.mapUrl} onChange={(event) => updateField("mapUrl", event.target.value)} />
            </div>
            <div className="field full">
              <label htmlFor="venue">العنوان واسم القاعة</label>
              <input id="venue" name="venue" placeholder="اختياري: مثال قاعة رويال - البحيرة. ينفع نكمله معاك بعد الطلب" value={form.venue} onChange={(event) => updateField("venue", event.target.value)} />
            </div>
            <div className="field full">
              <label htmlFor="notes">ملاحظات اختيارية</label>
              <textarea id="notes" name="notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="اكتب أي ذوق تفضله، ألوان معينة، نص خاص، أو أي تعديل تحب نشوفه في الدعوة" />
            </div>
            <div className="field full order-images-field">
              <span>صور الدعوة</span>
              <p>ارفع كل صورة في خانتها حسب ترتيب ظهورها. كل صورة لها كروب ومعاينة منفصلة لتناسب شكل القالب المختار.</p>
              <div className="order-image-slots">
                {orderImageSlots.map((slot, index) => (
                  <div className="order-image-slot" key={slot.title}>
                    <div className="order-image-slot-head">
                      <strong className="order-image-slot-number">{index + 1}</strong>
                      <div>
                        <h3>{slot.title}</h3>
                        <p>{slot.hint}</p>
                      </div>
                    </div>
                    <ImageCropUploader name="orderImage" label={`إضافة ${slot.title}`} targetWidth={1200} targetHeight={1500} maxFiles={1} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <a className="photographer-cta" href={photographerWhatsAppUrl()} target="_blank" rel="noreferrer">
            <Camera size={20} />
            <span>
              <strong>هل انت مصور فوتوغرافي؟</strong>
              <small>تصميم خاص ليك دعائي 😃</small>
            </span>
          </a>

          <button className="btn btn-soft btn-glass order-preview-button" type="button" onClick={openPreview}>
            <Eye size={19} />
            معاينة الدعوة
          </button>

          <button className="btn btn-gold btn-glow order-submit" type="submit" disabled={state === "loading"}>
            {state === "loading" ? <Loader2 size={19} className="animate-float" /> : <MessageCircle size={19} />}
            {state === "loading" ? "جاري تأكيد الطلب" : "تأكيد الطلب"}
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
