"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CalendarDays, Camera, Eye, Images, Loader2, MapPin, MessageCircle, UserRound } from "lucide-react";
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
type FieldErrors = Partial<Record<keyof FormState, string>>;
type OrderFormValues = Pick<FormState, "groomName" | "brideName" | "phone" | "weddingDate" | "mapUrl" | "venue" | "notes">;
type OrderDraft = Partial<FormState> & { imageUrls?: string[] };
export type OrderInitialDraft = Pick<FormState, "groomName" | "brideName" | "phone" | "weddingDate" | "mapUrl" | "venue" | "notes"> & { imageUrls: string[] };

const orderDraftStorageKey = "badrdaawa-order-draft";

const orderImageSlots = [
  {
    title: "الغلاف",
    hint: "الصورة الأساسية",
  },
  {
    title: "لقطة 2",
    hint: "تفصيلة قريبة",
  },
  {
    title: "لقطة 3",
    hint: "صورة إضافية",
  },
];

function cleanOrderDraftImageUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .filter((item) => item.startsWith("/uploads/") || item.startsWith("http://") || item.startsWith("https://"))
    .slice(0, 3);
}

export function OrderForm({ initialTemplate, initialDraft, templates }: { initialTemplate?: string; initialDraft?: OrderInitialDraft; templates: OrderTemplateOption[] }) {
  const fallbackTemplate = templates[0] || { slug: "royal-envelope", name: "Royal Envelope", arabicName: "Royal Envelope", previewImage: "/assets/templates/royal-envelope.svg" };
  const initialSlug = templates.some((template) => template.slug === initialTemplate) ? initialTemplate! : fallbackTemplate.slug;
  const [form, setForm] = useState<FormState>({
    groomName: initialDraft?.groomName || "",
    brideName: initialDraft?.brideName || "",
    phone: initialDraft?.phone || "",
    weddingDate: initialDraft?.weddingDate || "",
    mapUrl: initialDraft?.mapUrl || "",
    venue: initialDraft?.venue || "",
    notes: initialDraft?.notes || "",
    templateSlug: initialSlug,
    language: "ar",
  });
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [draftImageUrls, setDraftImageUrls] = useState<string[]>(() => cleanOrderDraftImageUrls(initialDraft?.imageUrls));
  const [draftReady, setDraftReady] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.slug === form.templateSlug) || fallbackTemplate,
    [fallbackTemplate, form.templateSlug, templates],
  );

  function getUrlDraft(): OrderDraft {
    if (typeof window === "undefined") return {};
    const params = new URLSearchParams(window.location.search);
    const imageUrls = cleanOrderDraftImageUrls((params.get("gallery") || "").split(","));
    return {
      groomName: params.get("groomName") || undefined,
      brideName: params.get("brideName") || undefined,
      phone: params.get("phone") || undefined,
      weddingDate: params.get("weddingDate") || undefined,
      mapUrl: params.get("mapUrl") || undefined,
      venue: params.get("venue") || undefined,
      notes: params.get("notes") || undefined,
      templateSlug: params.get("template") || undefined,
      imageUrls,
    };
  }

  function replaceDraftUrl(nextForm: Partial<FormState> = form, nextImageUrls = draftImageUrls) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    params.set("template", nextForm.templateSlug || selectedTemplate.slug);
    const fields: Array<keyof OrderFormValues> = ["groomName", "brideName", "phone", "weddingDate", "mapUrl", "venue", "notes"];
    fields.forEach((field) => {
      const value = String(nextForm[field] || "").trim();
      if (value) params.set(field, value);
    });
    if (nextImageUrls.length) params.set("gallery", nextImageUrls.join(","));
    window.history.replaceState(window.history.state, "", `/order?${params.toString()}`);
  }

  function persistDraft(nextForm: Partial<FormState> = form, nextImageUrls = draftImageUrls) {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(orderDraftStorageKey, JSON.stringify({ ...form, ...nextForm, imageUrls: nextImageUrls }));
    } catch {
      // Keeping the URL draft is enough to restore the form if browser storage is unavailable.
    }
    replaceDraftUrl({ ...form, ...nextForm }, nextImageUrls);
  }

  function persistCurrentDomDraft() {
    if (!formRef.current) return;
    const currentForm = getCurrentFormFromDom();
    persistDraft({ ...currentForm, templateSlug: selectedTemplate.slug }, draftImageUrls);
  }

  function getStoredDraft() {
    if (typeof window === "undefined") return {};
    try {
      const rawDraft = window.sessionStorage?.getItem(orderDraftStorageKey);
      return rawDraft ? (JSON.parse(rawDraft) as OrderDraft) : {};
    } catch {
      return {};
    }
  }

  useEffect(() => {
    try {
      const storedDraft = getStoredDraft();
      const urlDraft = getUrlDraft();
      const draft = { ...storedDraft, ...urlDraft, imageUrls: urlDraft.imageUrls?.length ? urlDraft.imageUrls : storedDraft.imageUrls };
      if (!Object.keys(draft).length) {
        setDraftReady(true);
        return;
      }

      const draftTemplate = typeof draft.templateSlug === "string" && templates.some((template) => template.slug === draft.templateSlug) ? draft.templateSlug : initialSlug;
      setForm((current) => ({
        ...current,
        groomName: typeof draft.groomName === "string" ? draft.groomName : current.groomName,
        brideName: typeof draft.brideName === "string" ? draft.brideName : current.brideName,
        phone: typeof draft.phone === "string" ? draft.phone : current.phone,
        weddingDate: typeof draft.weddingDate === "string" ? draft.weddingDate : current.weddingDate,
        mapUrl: typeof draft.mapUrl === "string" ? draft.mapUrl : current.mapUrl,
        venue: typeof draft.venue === "string" ? draft.venue : current.venue,
        notes: typeof draft.notes === "string" ? draft.notes : current.notes,
        templateSlug: draftTemplate,
        language: draft.language === "en" ? "en" : "ar",
      }));
      setDraftImageUrls(cleanOrderDraftImageUrls(draft.imageUrls));
    } catch {
      try {
        window.sessionStorage?.removeItem(orderDraftStorageKey);
      } catch {}
    } finally {
      setDraftReady(true);
    }
  }, [initialSlug, templates]);

  useEffect(() => {
    if (!draftReady) return;
    persistDraft();
  }, [draftReady, form, draftImageUrls]);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    if (message) setMessage("");
  }

  function goToTemplates() {
    window.location.href = "/templates";
  }

  function photographerWhatsAppUrl() {
    return getWhatsAppOrderUrl('دعوتي اعلانيه لمصور فوتوغرافي');
  }

  function fieldValue(value: string, fallback = "لم يكتب بعد") {
    return value.trim() || fallback;
  }

  function toEnglishDigits(value: string) {
    const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
    const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
    return value.replace(/[٠-٩۰-۹]/g, (digit) => {
      const arabicIndex = arabicDigits.indexOf(digit);
      if (arabicIndex >= 0) return String(arabicIndex);
      const persianIndex = persianDigits.indexOf(digit);
      return persianIndex >= 0 ? String(persianIndex) : digit;
    });
  }

  function normalizeWeddingDate(value: string) {
    const clean = toEnglishDigits(value).trim().replace(/\s*([\\/.-])\s*/g, "$1").replace(/\s+/g, " ");
    const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    const dmyMatch = clean.match(/^(\d{1,2})[\\/.\- ](\d{1,2})[\\/.\- ](\d{4})$/);
    const match = isoMatch
      ? { year: Number(isoMatch[1]), month: Number(isoMatch[2]), day: Number(isoMatch[3]) }
      : dmyMatch
        ? { year: Number(dmyMatch[3]), month: Number(dmyMatch[2]), day: Number(dmyMatch[1]) }
        : null;
    if (!match) return "";
    const date = new Date(match.year, match.month - 1, match.day);
    if (date.getFullYear() !== match.year || date.getMonth() !== match.month - 1 || date.getDate() !== match.day) return "";
    return `${match.year}-${String(match.month).padStart(2, "0")}-${String(match.day).padStart(2, "0")}`;
  }

  function displayWeddingDate(value: string) {
    const normalized = normalizeWeddingDate(value) || value;
    const date = new Date(`${normalized}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("ar-EG", { dateStyle: "full" }).format(date);
  }

  const normalizedDate = normalizeWeddingDate(form.weddingDate);
  const readableDate = normalizedDate ? displayWeddingDate(normalizedDate) : "";

  function previewHref(values: Partial<FormState> = form, imageUrls: string[] = []) {
    const params = new URLSearchParams();
    params.set("groomName", values.groomName || "اسم العريس");
    params.set("brideName", values.brideName || "اسم العروسة");
    const weddingDate = normalizeWeddingDate(values.weddingDate || "");
    if (weddingDate) params.set("weddingDate", weddingDate);
    if (values.venue) params.set("venue", values.venue);
    if (values.mapUrl) params.set("mapUrl", values.mapUrl);
    if (imageUrls.length) params.set("gallery", imageUrls.join(","));
    return `/templates/${values.templateSlug || form.templateSlug}/preview?${params.toString()}`;
  }

  function getCurrentFormFromDom(): OrderFormValues {
    const formData = new FormData(formRef.current || undefined);
    return {
      groomName: String(formData.get("groomName") || "").trim(),
      brideName: String(formData.get("brideName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      weddingDate: String(formData.get("weddingDate") || "").trim(),
      venue: String(formData.get("venue") || "").trim(),
      mapUrl: String(formData.get("mapUrl") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
    };
  }

  function readFileAsDataUrl(file: File) {
    return new Promise<string>((resolve) => {
      if (!file.size) {
        resolve("");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  }

  async function getOrderImageDataUrls(formData: FormData) {
    const slotImages = await Promise.all(
      orderImageSlots.map(async (_, index) => {
        const optimized = String(formData.get(`orderImage${index}`) || "");
        if (optimized) return optimized;
        const rawFile = formData.get(`orderImage${index}Raw`);
        if (rawFile instanceof File && rawFile.size > 0) return readFileAsDataUrl(rawFile);
        if (draftImageUrls[index]) return draftImageUrls[index];
        return "";
      }),
    );

    const orderedSlotImages = slotImages.filter(Boolean).slice(0, 3);
    if (orderedSlotImages.length) return orderedSlotImages;

    const optimized = formData.getAll("orderImage").map((value) => String(value)).filter(Boolean).slice(0, 3);
    const rawFiles = formData.getAll("orderImageRaw").filter((value): value is File => value instanceof File && value.size > 0).slice(0, 3);

    if (!optimized.length && !rawFiles.length && draftImageUrls.length) return draftImageUrls;
    if (!rawFiles.length || optimized.length >= rawFiles.length) return optimized;

    const rawDataUrls = (await Promise.all(rawFiles.slice(optimized.length).map(readFileAsDataUrl))).filter(Boolean);
    return [...optimized, ...rawDataUrls].slice(0, 3);
  }

  function validateOrder(values: OrderFormValues) {
    const nextErrors: FieldErrors = {};
    if (!values.groomName) nextErrors.groomName = "اكتب اسم العريس كما تحب ظهوره في الدعوة.";
    if (!values.brideName) nextErrors.brideName = "اكتب اسم العروسة كما تحب ظهوره في الدعوة.";
    if (!values.weddingDate) nextErrors.weddingDate = "اكتب تاريخ الفرح عشان نجهز الدعوة والعداد.";
    else if (!normalizeWeddingDate(values.weddingDate)) nextErrors.weddingDate = "اختار تاريخ صحيح من التقويم.";
    if (values.phone && values.phone.replace(/\D/g, "").length < 8) nextErrors.phone = "رقم الموبايل قصير. اكتب رقم صحيح أو اتركه فارغ.";
    if (values.mapUrl && !/^https?:\/\/\S+\.\S+/.test(values.mapUrl)) nextErrors.mapUrl = "رابط اللوكيشن غير واضح. انسخ رابط Google Maps كامل أو اترك الخانة فارغة.";
    return nextErrors;
  }

  function showValidationErrors(nextErrors: FieldErrors) {
    setErrors(nextErrors);
    const entries = Object.entries(nextErrors);
    if (!entries.length) return false;
    setState("error");
    setMessage(`راجع ${entries.length === 1 ? "الخانة المحددة" : "الخانات المحددة"} باللون الأحمر قبل المتابعة.`);
    const firstField = entries[0]?.[0];
    window.setTimeout(() => {
      const element = formRef.current?.querySelector<HTMLElement>(`[name="${firstField}"]`);
      element?.focus();
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 60);
    return true;
  }

  async function openPreview() {
    const currentForm = getCurrentFormFromDom();
    if (showValidationErrors(validateOrder(currentForm))) return;
    setIsPreviewing(true);
    setMessage("");

    try {
      const formData = new FormData(formRef.current || undefined);
      const orderImages = await getOrderImageDataUrls(formData);
      let imageUrls: string[] = [];

      if (orderImages.length) {
        const response = await fetch("/api/orders/preview-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images: orderImages }),
        });
        const data = (await response.json().catch(() => null)) as { imageUrls?: string[] } | null;
        imageUrls = Array.isArray(data?.imageUrls) ? data.imageUrls : [];
      }

      const nextImageUrls = imageUrls.length ? imageUrls : draftImageUrls;
      if (nextImageUrls.length) setDraftImageUrls(nextImageUrls);
      persistDraft({ ...currentForm, weddingDate: normalizeWeddingDate(currentForm.weddingDate), templateSlug: selectedTemplate.slug }, nextImageUrls);
      window.location.href = previewHref({ ...currentForm, weddingDate: normalizeWeddingDate(currentForm.weddingDate), templateSlug: selectedTemplate.slug }, nextImageUrls);
    } catch {
      setState("error");
      setMessage("تعذر تجهيز صور المعاينة. جرّب مرة أخرى أو اضغط تأكيد الطلب.");
      setIsPreviewing(false);
    }
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const orderImages = await getOrderImageDataUrls(formData);
    const rawWeddingDate = String(formData.get("weddingDate") || "").trim();
    const currentForm: FormState = {
      ...form,
      templateSlug: selectedTemplate.slug,
      groomName: String(formData.get("groomName") || "").trim(),
      brideName: String(formData.get("brideName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      weddingDate: normalizeWeddingDate(rawWeddingDate) || rawWeddingDate,
      mapUrl: String(formData.get("mapUrl") || "").trim(),
      venue: String(formData.get("venue") || "").trim(),
      notes: String(formData.get("notes") || "").trim(),
    };
    if (showValidationErrors(validateOrder({ ...currentForm, weddingDate: rawWeddingDate }))) return;
    setState("loading");
    setMessage("");

    const baseMessage = [
      "طلب دعوة جديد من BadrDaawa",
      `القالب: ${selectedTemplate.arabicName} - ${selectedTemplate.name}`,
      `العريس: ${fieldValue(currentForm.groomName)}`,
      `العروسة: ${fieldValue(currentForm.brideName)}`,
      `رقم الموبايل: ${fieldValue(currentForm.phone)}`,
      `تاريخ الفرح: ${displayWeddingDate(currentForm.weddingDate)}`,
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
      try {
        window.sessionStorage?.removeItem(orderDraftStorageKey);
      } catch {}
      window.location.href = getWhatsAppOrderUrl(`${baseMessage}${imageLines}`);
    } catch {
      setState("error");
      setMessage("تعذر إرسال الطلب للخادم. حاول مرة أخرى.");
    }
  }

  return (
    <div className="order-flow">
      <div className="order-steps" aria-label="مراحل الطلب">
        <span>1. شوف الأشكال</span>
        <span className="active">2. بيانات الفرح</span>
      </div>

      <form className="form-panel details-form" onSubmit={submitOrder} onInput={persistCurrentDomDraft} onChange={persistCurrentDomDraft} ref={formRef} noValidate>
          <div className="selected-template-dot">
            <span aria-hidden="true" />
            <p>
              القالب المختار: <strong>{selectedTemplate.arabicName}</strong>
            </p>
          </div>
          {message ? (
            <div className={`order-alert ${state === "error" ? "danger" : "success"}`} role="alert">
              <strong>{state === "error" ? "فيه بيانات محتاجة مراجعة" : "تمام"}</strong>
              <p>{message}</p>
            </div>
          ) : null}

          <div className="input-grid">
            <div className="order-section-label full">
              <UserRound size={18} />
              <div>
                <strong>الأسماء والتواصل</strong>
                <span>اكتب الأسماء زي ما تحب تشوفها في أول الدعوة.</span>
              </div>
            </div>
            <div className={`field ${errors.groomName ? "has-error" : ""}`}>
              <label htmlFor="groomName">اسم العريس *</label>
              <input id="groomName" name="groomName" placeholder="مثال: بدر" value={form.groomName} onChange={(event) => updateField("groomName", event.target.value)} required aria-invalid={Boolean(errors.groomName)} aria-describedby={errors.groomName ? "groomName-error" : undefined} />
              {errors.groomName ? <small className="field-error" id="groomName-error">{errors.groomName}</small> : null}
            </div>
            <div className={`field ${errors.brideName ? "has-error" : ""}`}>
              <label htmlFor="brideName">اسم العروسة *</label>
              <input id="brideName" name="brideName" placeholder="مثال: سارة" value={form.brideName} onChange={(event) => updateField("brideName", event.target.value)} required aria-invalid={Boolean(errors.brideName)} aria-describedby={errors.brideName ? "brideName-error" : undefined} />
              {errors.brideName ? <small className="field-error" id="brideName-error">{errors.brideName}</small> : null}
            </div>
            <div className={`field ${errors.phone ? "has-error" : ""}`}>
              <label htmlFor="phone">رقم الموبايل</label>
              <input id="phone" name="phone" inputMode="tel" placeholder="رقم للتواصل على واتساب" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} />
              {errors.phone ? <small className="field-error" id="phone-error">{errors.phone}</small> : null}
            </div>
            <div className="order-section-label full">
              <CalendarDays size={18} />
              <div>
                <strong>الموعد والمكان</strong>
                <span>التاريخ يتحول تلقائيًا لصيغة عربية داخل الدعوة.</span>
              </div>
            </div>
            <div className={`field ${errors.weddingDate ? "has-error" : ""}`}>
              <label htmlFor="weddingDate">تاريخ الفرح *</label>
              <input id="weddingDate" name="weddingDate" type="date" value={normalizedDate || form.weddingDate} onChange={(event) => updateField("weddingDate", event.target.value)} required aria-invalid={Boolean(errors.weddingDate)} aria-describedby={errors.weddingDate ? "weddingDate-error weddingDate-hint" : "weddingDate-hint"} />
              <small className="field-hint" id="weddingDate-hint">اختار اليوم من التقويم، وهيظهر داخل الدعوة بصيغة عربية.</small>
              {readableDate ? <small className="field-preview">هيظهر في الدعوة: {readableDate}</small> : null}
              {errors.weddingDate ? <small className="field-error" id="weddingDate-error">{errors.weddingDate}</small> : null}
            </div>
            <div className={`field full ${errors.mapUrl ? "has-error" : ""}`}>
              <label htmlFor="mapUrl">اللوكيشن على الخريطة</label>
              <input id="mapUrl" name="mapUrl" inputMode="url" placeholder="انسخ رابط Google Maps لو موجود" value={form.mapUrl} onChange={(event) => updateField("mapUrl", event.target.value)} aria-invalid={Boolean(errors.mapUrl)} aria-describedby={errors.mapUrl ? "mapUrl-error" : undefined} />
              {errors.mapUrl ? <small className="field-error" id="mapUrl-error">{errors.mapUrl}</small> : null}
            </div>
            <div className="field full">
              <label htmlFor="venue">العنوان واسم القاعة</label>
              <input id="venue" name="venue" placeholder="مثال: قاعة رويال - البحيرة" value={form.venue} onChange={(event) => updateField("venue", event.target.value)} />
            </div>
            <div className="order-section-label full">
              <MapPin size={18} />
              <div>
                <strong>لمساتك الخاصة</strong>
                <span>أي أغنية أو لون أو جملة ناعمة تحب تضيفها.</span>
              </div>
            </div>
            <div className="field full">
              <label htmlFor="notes">ملاحظات اختيارية</label>
              <textarea id="notes" name="notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="ألوان مفضلة، أغنية، جملة خاصة، أو أي تعديل تحب تضيفه" />
            </div>
            <div className="field full order-images-field">
              <span className="order-images-title">
                <Images size={17} />
                صور الدعوة
              </span>
              <p>اختار لحد 3 صور. الخانات صغيرة ومترتبة: غلاف، لقطة ثانية، ولقطة ثالثة.</p>
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
                    <ImageCropUploader name={`orderImage${index}`} label="اختار صورة" targetWidth={1200} targetHeight={1500} maxFiles={1} defaultImages={draftImageUrls[index] ? [draftImageUrls[index]] : []} />
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

          <div className="order-action-grid">
            <button className="btn btn-gold btn-glow order-preview-button" type="button" onClick={openPreview} disabled={isPreviewing || state === "loading"}>
              {isPreviewing ? <Loader2 size={19} className="animate-float" /> : <Eye size={19} />}
              {isPreviewing ? "جاري تجهيز المعاينة" : "معاينة الدعوة"}
            </button>

            <button className="btn btn-gold btn-glow order-submit" type="submit" disabled={state === "loading"}>
              {state === "loading" ? <Loader2 size={19} className="animate-float" /> : <MessageCircle size={19} />}
              {state === "loading" ? "جاري التأكيد" : "تأكيد الطلب"}
            </button>
            <button className="btn btn-gold btn-glow order-back-button" type="button" onClick={goToTemplates}>
              <ArrowRight size={17} />
              رجوع للأشكال
            </button>
          </div>
        </form>
    </div>
  );
}
