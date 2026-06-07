"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Copy, Eye, ImagePlus, Link2, Loader2, Music2, Send, SlidersHorizontal, UploadCloud, UserRound, XCircle } from "lucide-react";
import type { LiveInvitationPreviewPayload } from "@/components/LiveInvitationPreview";
import { acceptedImageFormats } from "@/lib/image-formats";
import { unifiedImageSlots } from "@/lib/invitation-template-bindings";
import type { OrderRequest, TemplateDefinition } from "@/lib/types";

type BuilderTemplate = Pick<TemplateDefinition, "slug" | "name" | "arabicName" | "opening" | "concept" | "layout" | "typography">;
type MusicFile = { url: string; modifiedAt: number };
type ImageSlotState = { url: string; name: string; loading: boolean };
type StatusKind = OrderRequest["status"];

type OrderFormState = {
  groomName: string;
  brideName: string;
  phone: string;
  weddingDate: string;
  venue: string;
  mapUrl: string;
  notes: string;
  templateSlug: string;
  imageUrls: ImageSlotState[];
  musicEnabled: boolean;
  musicChoice: "default" | "upload" | "url";
  musicUrl: string;
  musicBusy: boolean;
  photographerEnabled: boolean;
  photographerName: string;
  photographerLogoUrl: string;
  photographerFacebookUrl: string;
  photographerInstagramUrl: string;
  rejectionReason: string;
};

const emptyImages: ImageSlotState[] = unifiedImageSlots.map(() => ({ url: "", name: "", loading: false }));

const statusMap: Record<StatusKind, { label: string; className: string }> = {
  new: { label: "جديد", className: "new" },
  reviewing: { label: "قيد المراجعة", className: "reviewing" },
  edited: { label: "تم التعديل", className: "edited" },
  published: { label: "تم النشر", className: "published" },
  rejected: { label: "مرفوض", className: "rejected" },
  accepted: { label: "قيد المراجعة", className: "reviewing" },
  converted: { label: "تم النشر", className: "published" },
};

function formatDateInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function formatDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function formFromOrder(order: OrderRequest, fallbackTemplate: string): OrderFormState {
  const photographer = order.photographer;
  const imageUrls = [...(order.imageUrls || [])].slice(0, 3);
  return {
    groomName: order.groomName || "",
    brideName: order.brideName || "",
    phone: order.phone || "",
    weddingDate: formatDateInput(order.weddingDate),
    venue: order.venue || "",
    mapUrl: order.mapUrl || "",
    notes: order.notes || "",
    templateSlug: order.templateSlug || fallbackTemplate,
    imageUrls: emptyImages.map((slot, index) => ({ ...slot, url: imageUrls[index] || "", name: imageUrls[index]?.split("/").pop() || "" })),
    musicEnabled: Boolean(order.musicEnabled),
    musicChoice: order.musicChoice || (order.musicUrl ? "url" : "default"),
    musicUrl: order.musicUrl || "",
    musicBusy: false,
    photographerEnabled: Boolean(photographer?.enabled),
    photographerName: photographer?.name || "",
    photographerLogoUrl: photographer?.logoUrl || "",
    photographerFacebookUrl: photographer?.facebookUrl || "",
    photographerInstagramUrl: photographer?.instagramUrl || "",
    rejectionReason: order.rejectionReason || "",
  };
}

function orderTitle(order: OrderRequest, index: number) {
  return `طلب ${order.orderNumber || `#${index + 1}`} - ${order.groomName} & ${order.brideName}`;
}

export function AdminOrderRequestsManager({ orders, templates, musicFiles, siteUrl }: { orders: OrderRequest[]; templates: BuilderTemplate[]; musicFiles: MusicFile[]; siteUrl: string }) {
  const fallbackTemplate = templates[0]?.slug || "featured-1";
  const [items, setItems] = useState<OrderRequest[]>(orders);
  const [selectedId, setSelectedId] = useState(orders[0]?.id || "");
  const selectedOrder = useMemo(() => items.find((order) => order.id === selectedId) || items[0] || null, [items, selectedId]);
  const [form, setForm] = useState<OrderFormState>(() => (selectedOrder ? formFromOrder(selectedOrder, fallbackTemplate) : formFromOrder({ id: "", groomName: "", brideName: "", phone: "", weddingDate: "", venue: "", templateSlug: fallbackTemplate, language: "ar", status: "new", createdAt: "" }, fallbackTemplate)));
  const [busy, setBusy] = useState<"idle" | "review" | "update" | "publish" | "reject">("idle");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [links, setLinks] = useState<{ publicUrl: string; adminUrl: string } | null>(null);
  const imageInputs = useRef<Array<HTMLInputElement | null>>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");

  useEffect(() => {
    if (!selectedOrder) return;
    setForm(formFromOrder(selectedOrder, fallbackTemplate));
    setLinks(
      selectedOrder.publishedInvitationCode
        ? {
            publicUrl: `${cleanSiteUrl}/${selectedOrder.publishedInvitationCode}`,
            adminUrl: `${cleanSiteUrl}/${selectedOrder.publishedInvitationCode}/ad_3399`,
          }
        : null,
    );
  }, [cleanSiteUrl, fallbackTemplate, selectedOrder]);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({ builderPreview: "1", silentPreview: "1" });
    return `/templates/${form.templateSlug || fallbackTemplate}/preview?${params.toString()}`;
  }, [fallbackTemplate, form.templateSlug]);

  const previewPayload = useMemo<LiveInvitationPreviewPayload>(
    () => ({
      groomName: form.groomName,
      brideName: form.brideName,
      weddingDate: form.weddingDate,
      weddingTime: "07:00 مساءً",
      venue: form.venue,
      city: "",
      mapUrl: form.mapUrl,
      gallery: form.imageUrls.map((image) => image.url).filter(Boolean),
      musicEnabled: form.musicEnabled,
      musicUrl: form.musicChoice === "default" ? "" : form.musicUrl,
      disableMusic: !form.musicEnabled,
      photographer: {
        enabled: form.photographerEnabled,
        name: form.photographerName,
        logoUrl: form.photographerLogoUrl,
        facebookUrl: form.photographerFacebookUrl,
        instagramUrl: form.photographerInstagramUrl,
      },
    }),
    [form],
  );

  const postPreviewUpdate = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ source: "badr-admin-preview", type: "preview:update", payload: previewPayload }, window.location.origin);
  }, [previewPayload]);

  useEffect(() => {
    postPreviewUpdate();
  }, [postPreviewUpdate]);

  useEffect(() => {
    function onPreviewReady(event: MessageEvent<{ source?: string; type?: string }>) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source === "badr-admin-preview" && event.data.type === "preview:ready") postPreviewUpdate();
    }

    window.addEventListener("message", onPreviewReady);
    return () => window.removeEventListener("message", onPreviewReady);
  }, [postPreviewUpdate]);

  const openCount = items.filter((order) => !["published", "converted", "rejected"].includes(order.status)).length;

  function patchForm(update: Partial<OrderFormState>) {
    setForm((current) => ({ ...current, ...update }));
    setNotice(null);
  }

  function payload(action: "review" | "update" | "publish" | "reject") {
    return {
      action,
      groomName: form.groomName,
      brideName: form.brideName,
      phone: form.phone,
      weddingDate: form.weddingDate,
      venue: form.venue,
      mapUrl: form.mapUrl,
      notes: form.notes,
      templateSlug: form.templateSlug,
      imageUrls: form.imageUrls.map((image) => image.url).filter(Boolean),
      musicEnabled: form.musicEnabled,
      musicChoice: form.musicChoice,
      musicUrl: form.musicChoice === "default" ? "" : form.musicUrl,
      photographer: {
        enabled: form.photographerEnabled,
        name: form.photographerName,
        logoUrl: form.photographerLogoUrl,
        facebookUrl: form.photographerFacebookUrl,
        instagramUrl: form.photographerInstagramUrl,
      },
      rejectionReason: form.rejectionReason,
    };
  }

  async function selectOrder(order: OrderRequest) {
    setSelectedId(order.id);
    setNotice(null);
    setLinks(null);
    if (order.status !== "new") return;
    setBusy("review");
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action: "review" }),
    });
    const data = (await response.json().catch(() => null)) as { order?: OrderRequest; error?: string } | null;
    setBusy("idle");
    if (response.ok && data?.order) {
      setItems((current) => current.map((item) => (item.id === order.id ? data.order! : item)));
    }
  }

  async function runAction(action: "update" | "publish" | "reject") {
    if (!selectedOrder) return;
    if (!form.groomName.trim() || !form.brideName.trim() || !form.weddingDate || !form.venue.trim()) {
      setNotice({ kind: "error", text: "اكتب اسم العريس والعروسة والتاريخ والعنوان قبل الحفظ أو النشر." });
      return;
    }
    if (action === "reject" && !form.rejectionReason.trim()) {
      setNotice({ kind: "error", text: "اكتب سبب الرفض قبل تغيير حالة الطلب إلى مرفوض." });
      return;
    }
    setBusy(action);
    const response = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload(action)),
    });
    const data = (await response.json().catch(() => null)) as { order?: OrderRequest; error?: string; publicUrl?: string; adminUrl?: string } | null;
    setBusy("idle");
    if (!response.ok || !data?.order) {
      setNotice({ kind: "error", text: data?.error || "تعذر تنفيذ الإجراء. راجع البيانات أو حاول مرة أخرى." });
      return;
    }
    setItems((current) => current.map((item) => (item.id === selectedOrder.id ? data.order! : item)));
    setSelectedId(data.order.id);
    window.dispatchEvent(new Event("admin-orders-count-refresh"));
    if (data.publicUrl && data.adminUrl) setLinks({ publicUrl: data.publicUrl, adminUrl: data.adminUrl });
    setNotice({
      kind: "success",
      text: action === "publish" ? "تم نشر الدعوة وإنشاء الروابط." : action === "reject" ? "تم رفض الطلب وحفظ السبب." : "تم حفظ التعديلات.",
    });
  }

  async function handleImageFile(index: number, file?: File | null) {
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setForm((current) => ({
      ...current,
      imageUrls: current.imageUrls.map((image, imageIndex) => (imageIndex === index ? { ...image, name: file.name, loading: true } : image)),
    }));
    const response = await fetch("/api/orders/preview-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: [dataUrl] }),
    });
    const data = (await response.json().catch(() => null)) as { imageUrls?: string[] } | null;
    const url = data?.imageUrls?.[0] || "";
    setForm((current) => ({
      ...current,
      imageUrls: current.imageUrls.map((image, imageIndex) => (imageIndex === index ? { ...image, url, name: file.name, loading: false } : image)),
    }));
    setNotice(url ? { kind: "success", text: `تم رفع Photo ${index + 1} وظهرت في المعاينة.` } : { kind: "error", text: "تعذر رفع الصورة. جرّب صيغة أخرى أو صورة أصغر." });
  }

  async function handleMusicFile(file?: File | null) {
    if (!file) return;
    patchForm({ musicBusy: true, musicEnabled: true, musicChoice: "upload" });
    const dataUrl = await readFileAsDataUrl(file);
    const response = await fetch("/api/orders/preview-music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ music: dataUrl }),
    });
    const data = (await response.json().catch(() => null)) as { musicUrl?: string; error?: string } | null;
    if (!response.ok || !data?.musicUrl) {
      patchForm({ musicBusy: false });
      setNotice({ kind: "error", text: data?.error || "ملف الموسيقى غير قابل للتشغيل." });
      return;
    }
    patchForm({ musicBusy: false, musicUrl: data.musicUrl });
    setNotice({ kind: "success", text: "تم رفع الموسيقى وربطها بهذا الطلب." });
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice({ kind: "success", text: "تم نسخ الرابط." });
  }

  if (!items.length) {
    return (
      <div className="admin-empty-state orders-empty-state">
        <Clock3 size={24} />
        <strong>لا توجد طلبات دعوات حتى الآن</strong>
        <p>أي طلب يرسله العميل من الموقع سيظهر هنا تلقائيًا مع الصور والموسيقى وبيانات المصور.</p>
      </div>
    );
  }

  const selectedStatus = statusMap[selectedOrder?.status || "new"];

  return (
    <section className="admin-orders-workspace">
      <aside className="orders-queue-panel">
        <div className="orders-queue-head">
          <div>
            <span className="eyebrow">طلبات الدعوات</span>
            <h2>الطلبات المقدمة</h2>
          </div>
          <strong>{openCount}</strong>
        </div>
        <div className="orders-queue-list">
          {items.map((order, index) => {
            const meta = statusMap[order.status] || statusMap.new;
            const active = selectedOrder?.id === order.id;
            return (
              <button className={active ? "orders-queue-item active" : "orders-queue-item"} type="button" key={order.id} onClick={() => selectOrder(order)}>
                <span className={`order-status-chip ${meta.className}`}>{meta.label}</span>
                <strong>{orderTitle(order, index)}</strong>
                <small>{formatDateTime(order.submittedAt || order.createdAt)}</small>
              </button>
            );
          })}
        </div>
      </aside>

      <div className="orders-editor-panel">
        <div className="orders-editor-head">
          <div>
            <span className="eyebrow">{selectedOrder?.orderNumber || "Order"}</span>
            <h2>{selectedOrder ? `${selectedOrder.groomName} & ${selectedOrder.brideName}` : "طلب دعوة"}</h2>
          </div>
          <span className={`order-status-chip ${selectedStatus.className}`}>{selectedStatus.label}</span>
        </div>

        {notice ? <div className={notice.kind === "error" ? "notice danger" : "notice success"}>{notice.text}</div> : null}

        <div className="orders-editor-grid">
          <label className="field">
            <span>اختيار القالب</span>
            <select value={form.templateSlug} onChange={(event) => patchForm({ templateSlug: event.target.value })}>
              {templates.map((template) => (
                <option key={template.slug} value={template.slug}>
                  {template.arabicName} - {template.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>اسم العريس</span>
            <input value={form.groomName} onChange={(event) => patchForm({ groomName: event.target.value })} />
          </label>
          <label className="field">
            <span>اسم العروسة</span>
            <input value={form.brideName} onChange={(event) => patchForm({ brideName: event.target.value })} />
          </label>
          <label className="field">
            <span>رقم التواصل</span>
            <input value={form.phone} onChange={(event) => patchForm({ phone: event.target.value })} />
          </label>
          <label className="field">
            <span>تاريخ المناسبة</span>
            <input type="date" value={form.weddingDate} onChange={(event) => patchForm({ weddingDate: event.target.value })} />
          </label>
          <label className="field wide">
            <span>عنوان المناسبة</span>
            <input value={form.venue} onChange={(event) => patchForm({ venue: event.target.value })} />
          </label>
          <label className="field wide">
            <span><Link2 size={15} /> رابط اللوكيشن</span>
            <input value={form.mapUrl} onChange={(event) => patchForm({ mapUrl: event.target.value })} placeholder="انسخ رابط اللوكيشن من على خريطة جوجل" />
            <small>انسخ رابط اللوكيشن من على خريطة جوجل.</small>
          </label>
        </div>

        <div className="orders-edit-section">
          <div className="builder-section-head">
            <ImagePlus size={18} />
            <strong>الصور المرفوعة</strong>
          </div>
          <div className="builder-photo-grid orders-photo-grid">
            {unifiedImageSlots.map((slot, index) => (
              <label className="builder-photo-slot" key={slot.id}>
                <span>{slot.label}</span>
                {form.imageUrls[index]?.url ? <img src={form.imageUrls[index].url} alt={slot.label} /> : <i><ImagePlus size={18} /> {slot.role}</i>}
                <small>{form.imageUrls[index]?.loading ? "جاري الرفع" : form.imageUrls[index]?.name || "اضغط للتغيير"}</small>
                <input ref={(node) => { imageInputs.current[index] = node; }} type="file" accept={acceptedImageFormats} onChange={(event) => handleImageFile(index, event.target.files?.[0])} />
              </label>
            ))}
          </div>
        </div>

        <div className="orders-edit-section">
          <button className={form.photographerEnabled ? "builder-toggle active" : "builder-toggle"} type="button" onClick={() => patchForm({ photographerEnabled: !form.photographerEnabled })}>
            <UserRound size={17} />
            إضافة بيانات المصور
          </button>
          {form.photographerEnabled ? (
            <div className="orders-editor-grid">
              <label className="field">
                <span>اسم المصور</span>
                <input value={form.photographerName} onChange={(event) => patchForm({ photographerName: event.target.value })} />
              </label>
              <label className="field">
                <span>شعار/صورة المصور</span>
                <input value={form.photographerLogoUrl} onChange={(event) => patchForm({ photographerLogoUrl: event.target.value })} placeholder="/uploads/..." />
              </label>
              <label className="field">
                <span>Facebook</span>
                <input value={form.photographerFacebookUrl} onChange={(event) => patchForm({ photographerFacebookUrl: event.target.value })} />
              </label>
              <label className="field">
                <span>Instagram</span>
                <input value={form.photographerInstagramUrl} onChange={(event) => patchForm({ photographerInstagramUrl: event.target.value })} />
              </label>
            </div>
          ) : null}
        </div>

        <div className="orders-edit-section">
          <div className="builder-section-head">
            <Music2 size={18} />
            <strong>موسيقى الدعوة</strong>
          </div>
          <label className="builder-checkline">
            <input type="checkbox" checked={form.musicEnabled} onChange={(event) => patchForm({ musicEnabled: event.target.checked })} />
            تشغيل الموسيقى عند فتح الدعوة
          </label>
          {form.musicEnabled ? (
            <div className="orders-music-grid">
              <label className={form.musicChoice === "default" ? "orders-radio-card active" : "orders-radio-card"}>
                <input type="radio" checked={form.musicChoice === "default"} onChange={() => patchForm({ musicChoice: "default", musicUrl: "" })} />
                <strong>موسيقى أساسية</strong>
                <span>تستخدم موسيقى القالب أو الموسيقى العامة.</span>
              </label>
              <label className={form.musicChoice === "upload" ? "orders-radio-card active" : "orders-radio-card"}>
                <input type="radio" checked={form.musicChoice === "upload"} onChange={() => patchForm({ musicChoice: "upload" })} />
                <strong>رفع ملف موسيقى</strong>
                <span>{form.musicBusy ? "جاري الرفع..." : "يرتبط بهذا الطلب فقط."}</span>
                <input type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac,.mp4,.flac" onChange={(event) => handleMusicFile(event.target.files?.[0])} />
              </label>
              <label className={form.musicChoice === "url" ? "orders-radio-card active" : "orders-radio-card"}>
                <input type="radio" checked={form.musicChoice === "url"} onChange={() => patchForm({ musicChoice: "url" })} />
                <strong>رابط أغنية مباشر</strong>
                <span>رابط ملف صوت مثل mp3 أو m4a.</span>
              </label>
              <label className="field">
                <span>اختيار من الملفات المحفوظة</span>
                <select value={form.musicUrl} onChange={(event) => patchForm({ musicUrl: event.target.value, musicChoice: event.target.value ? "upload" : form.musicChoice })}>
                  <option value="">اختار ملف محفوظ</option>
                  {musicFiles.map((file) => (
                    <option key={file.url} value={file.url}>{file.url.split("/").pop()}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>رابط الموسيقى</span>
                <input value={form.musicUrl} onChange={(event) => patchForm({ musicUrl: event.target.value, musicChoice: "url" })} placeholder="https://example.com/song.mp3" />
              </label>
              {form.musicUrl ? <audio controls preload="metadata" src={form.musicUrl} /> : null}
            </div>
          ) : null}
        </div>

        <div className="orders-edit-section">
          <label className="field">
            <span>ملاحظات الطلب</span>
            <textarea value={form.notes} onChange={(event) => patchForm({ notes: event.target.value })} rows={4} />
          </label>
          <label className="field">
            <span>سبب الرفض</span>
            <textarea value={form.rejectionReason} onChange={(event) => patchForm({ rejectionReason: event.target.value })} rows={3} />
          </label>
        </div>

        <div className="orders-action-row">
          <button className="btn btn-soft" type="button" disabled={busy !== "idle"} onClick={() => runAction("update")}>
            {busy === "update" ? <Loader2 size={17} /> : <SlidersHorizontal size={17} />}
            حفظ كتعديل
          </button>
          <button className="btn btn-gold btn-glow" type="button" disabled={busy !== "idle"} onClick={() => runAction("publish")}>
            {busy === "publish" ? <Loader2 size={17} /> : <Send size={17} />}
            نشر الدعوة
          </button>
          <button className="btn btn-soft danger-button" type="button" disabled={busy !== "idle"} onClick={() => runAction("reject")}>
            {busy === "reject" ? <Loader2 size={17} /> : <XCircle size={17} />}
            رفض الطلب
          </button>
        </div>

        {links ? (
          <div className="builder-links orders-links">
            <h2><CheckCircle2 size={18} /> روابط الدعوة</h2>
            <div>
              <span>رابط الدعوة العامة</span>
              <strong>{links.publicUrl}</strong>
              <button className="btn btn-soft" type="button" onClick={() => copy(links.publicUrl)}><Copy size={16} /> نسخ</button>
            </div>
            <div>
              <span>رابط إدارة الدعوة</span>
              <strong>{links.adminUrl}</strong>
              <button className="btn btn-soft" type="button" onClick={() => copy(links.adminUrl)}><Copy size={16} /> نسخ</button>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="orders-live-preview builder-preview-panel">
        <div className="builder-phone-frame">
          <div className="builder-phone-speaker" />
          <iframe ref={iframeRef} src={previewUrl} title="معاينة الطلب الحية" onLoad={postPreviewUpdate} />
        </div>
        <div className="builder-preview-hint">
          <Eye size={16} />
          المعاينة هنا تطابق شكل الدعوة بعد النشر وتتحرك مع أي تعديل بدون تحديث الصفحة.
        </div>
      </aside>
    </section>
  );
}
