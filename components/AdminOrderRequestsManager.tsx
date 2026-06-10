"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Copy, Eye, Loader2, Send, SlidersHorizontal, XCircle } from "lucide-react";
import {
  AdminInvitationTools,
  emptyAdminToolImages,
  emptyAdminToolUpload,
  getEffectiveAdminToolMusic,
  uploadAdminHeroVideo,
  uploadAdminMusic,
  uploadAdminPreviewImage,
  uploadAdminVideoAudio,
  validateAdminInvitationTools,
  type AdminInvitationToolValues,
  type AdminToolImageSlot,
  type AdminToolMusicChoice,
  type AdminToolMusicFile,
  type AdminToolTemplate,
  type AdminToolUploadSlot,
} from "@/components/AdminInvitationTools";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { InternalNotesPanel } from "@/components/InternalNotesPanel";
import type { LiveInvitationPreviewPayload } from "@/components/LiveInvitationPreview";
import { normalizeInvitationTexts } from "@/lib/invitation-texts";
import type { AdminFavorite, ContentPreset, InternalNote, InvitationTexts, OrderRequest } from "@/lib/types";

type BuilderTemplate = AdminToolTemplate;
type MusicFile = AdminToolMusicFile;
type StatusKind = OrderRequest["status"];
type OrderRequestWithLinks = OrderRequest & {
  publicUrl?: string;
  adminUrl?: string;
};

type OrderFormState = {
  groomName: string;
  brideName: string;
  phone: string;
  weddingDate: string;
  venue: string;
  mapUrl: string;
  notes: string;
  templateSlug: string;
  imageUrls: AdminToolImageSlot[];
  heroVideoUrl: string;
  heroVideoName: string;
  heroVideoBusy: boolean;
  musicEnabled: boolean;
  musicChoice: AdminToolMusicChoice;
  musicUrl: string;
  musicLibraryTrackId: string;
  musicBusy: boolean;
  musicFileName: string;
  invitationTexts: Required<InvitationTexts>;
  photographerEnabled: boolean;
  photographerName: string;
  photographerLogo: AdminToolUploadSlot;
  photographerFacebookUrl: string;
  photographerInstagramUrl: string;
  rejectionReason: string;
};

const emptyImages: AdminToolImageSlot[] = emptyAdminToolImages;

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

function normalizeOrderMusicChoice(order: OrderRequest, musicFiles: MusicFile[]): AdminToolMusicChoice {
  if (order.musicChoice === "default" || order.musicChoice === "library" || order.musicChoice === "upload" || order.musicChoice === "video" || order.musicChoice === "url") return order.musicChoice;
  if (order.musicUrl && musicFiles.some((file) => file.url === order.musicUrl)) return "library";
  return order.musicUrl ? "url" : "default";
}

function formFromOrder(order: OrderRequest, fallbackTemplate: string, musicFiles: MusicFile[] = []): OrderFormState {
  const photographer = order.photographer;
  const imageUrls = [...(order.imageUrls || [])].slice(0, 3);
  const photographerLogoUrl = photographer?.logoUrl || "";
  const rawTexts = order.texts && typeof order.texts === "object" ? (order.texts as Record<string, unknown>) : {};
  const heroVideoUrl = typeof rawTexts.heroVideoUrl === "string" ? rawTexts.heroVideoUrl : "";
  const musicFile = musicFiles.find((file) => file.id === order.musicLibraryTrackId || file.url === order.musicUrl);
  const musicChoice = normalizeOrderMusicChoice(order, musicFiles);
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
    heroVideoUrl,
    heroVideoName: heroVideoUrl.split("/").pop() || "",
    heroVideoBusy: false,
    musicEnabled: Boolean(order.musicEnabled),
    musicChoice,
    musicUrl: order.musicUrl || "",
    musicLibraryTrackId: musicChoice === "library" ? musicFile?.id || order.musicLibraryTrackId || "" : "",
    musicBusy: false,
    musicFileName: order.musicUrl?.split("/").pop() || "",
    invitationTexts: normalizeInvitationTexts(order.texts),
    photographerEnabled: Boolean(photographer?.enabled),
    photographerName: photographer?.name || "",
    photographerLogo: { ...emptyAdminToolUpload, url: photographerLogoUrl, name: photographerLogoUrl.split("/").pop() || "" },
    photographerFacebookUrl: photographer?.facebookUrl || "",
    photographerInstagramUrl: photographer?.instagramUrl || "",
    rejectionReason: order.rejectionReason || "",
  };
}

function orderTitle(order: OrderRequest, index: number) {
  return `طلب ${order.orderNumber || `#${index + 1}`} - ${order.groomName} & ${order.brideName}`;
}

function toolValuesFromForm(form: OrderFormState): AdminInvitationToolValues {
  return {
    templateSlug: form.templateSlug,
    groomName: form.groomName,
    brideName: form.brideName,
    phone: form.phone,
    weddingDate: form.weddingDate,
    venue: form.venue,
    mapUrl: form.mapUrl,
    images: form.imageUrls,
    heroVideoUrl: form.heroVideoUrl,
    heroVideoName: form.heroVideoName,
    heroVideoBusy: form.heroVideoBusy,
    photographerEnabled: form.photographerEnabled,
    photographerName: form.photographerName,
    photographerLogo: form.photographerLogo,
    photographerFacebookUrl: form.photographerFacebookUrl,
    photographerInstagramUrl: form.photographerInstagramUrl,
    musicEnabled: form.musicEnabled,
    musicChoice: form.musicChoice,
    musicUrl: form.musicUrl,
    musicLibraryTrackId: form.musicLibraryTrackId,
    musicBusy: form.musicBusy,
    musicFileName: form.musicFileName,
    invitationTexts: form.invitationTexts,
  };
}

function payloadFromFormState(form: OrderFormState, action: "review" | "update" | "publish" | "reject") {
  const effectiveMusic = getEffectiveAdminToolMusic(form);
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
    heroVideoUrl: form.heroVideoUrl,
    musicEnabled: effectiveMusic.musicEnabled,
    musicChoice: effectiveMusic.musicChoice,
    musicUrl: effectiveMusic.musicUrl,
    musicLibraryTrackId: effectiveMusic.musicLibraryTrackId,
    texts: form.invitationTexts,
    photographer: {
      enabled: form.photographerEnabled,
      name: form.photographerName,
      logoUrl: form.photographerLogo.url,
      facebookUrl: form.photographerFacebookUrl,
      instagramUrl: form.photographerInstagramUrl,
    },
    rejectionReason: form.rejectionReason,
  };
}

export function AdminOrderRequestsManager({
  orders,
  templates,
  musicFiles,
  contentPresets,
  internalNotes,
  favorites,
  siteUrl,
}: {
  orders: OrderRequestWithLinks[];
  templates: BuilderTemplate[];
  musicFiles: MusicFile[];
  contentPresets: ContentPreset[];
  internalNotes: InternalNote[];
  favorites: AdminFavorite[];
  siteUrl: string;
}) {
  const fallbackTemplate = templates[0]?.slug || "featured-1";
  const [items, setItems] = useState<OrderRequestWithLinks[]>(orders);
  const [selectedId, setSelectedId] = useState(orders[0]?.id || "");
  const selectedOrder = useMemo(() => items.find((order) => order.id === selectedId) || items[0] || null, [items, selectedId]);
  const [form, setForm] = useState<OrderFormState>(() => (selectedOrder ? formFromOrder(selectedOrder, fallbackTemplate, musicFiles) : formFromOrder({ id: "", groomName: "", brideName: "", phone: "", weddingDate: "", venue: "", templateSlug: fallbackTemplate, language: "ar", status: "new", createdAt: "" }, fallbackTemplate, musicFiles)));
  const [busy, setBusy] = useState<"idle" | "review" | "update" | "publish" | "reject">("idle");
  const [busyOrderId, setBusyOrderId] = useState("");
  const [actionFeedback, setActionFeedback] = useState<Record<string, { kind: "pending" | "success" | "error"; text: string }>>({});
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [links, setLinks] = useState<{ publicUrl: string; adminUrl: string } | null>(null);
  const imageInputs = useRef<Array<HTMLInputElement | null>>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");

  useEffect(() => {
    if (!selectedOrder) return;
    setForm(formFromOrder(selectedOrder, fallbackTemplate, musicFiles));
    setLinks(
      selectedOrder.publishedInvitationCode
        ? {
            publicUrl: selectedOrder.publicUrl || `${cleanSiteUrl}/${selectedOrder.publishedInvitationCode}`,
            adminUrl: selectedOrder.adminUrl || `${cleanSiteUrl}/${selectedOrder.publishedInvitationCode}/ad_3399`,
          }
        : null,
    );
  }, [cleanSiteUrl, fallbackTemplate, musicFiles, selectedOrder]);

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({ builderPreview: "1", silentPreview: "1" });
    return `/templates/${form.templateSlug || fallbackTemplate}/preview?${params.toString()}`;
  }, [fallbackTemplate, form.templateSlug]);
  const effectivePreviewMusic = useMemo(() => getEffectiveAdminToolMusic(form), [form.musicChoice, form.musicEnabled, form.musicLibraryTrackId, form.musicUrl]);

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
      heroVideoUrl: form.heroVideoUrl,
      musicEnabled: effectivePreviewMusic.musicEnabled,
      musicUrl: effectivePreviewMusic.musicUrl,
      disableMusic: !effectivePreviewMusic.musicEnabled,
      texts: form.invitationTexts,
      photographer: {
        enabled: form.photographerEnabled,
        name: form.photographerName,
        logoUrl: form.photographerLogo.url,
        facebookUrl: form.photographerFacebookUrl,
        instagramUrl: form.photographerInstagramUrl,
      },
    }),
    [effectivePreviewMusic, form],
  );

  const toolValues = useMemo<AdminInvitationToolValues>(() => toolValuesFromForm(form), [form]);

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
  const selectedInternalNotes = useMemo(() => (selectedOrder ? internalNotes.filter((note) => note.entityType === "order" && note.entityId === selectedOrder.id) : []), [internalNotes, selectedOrder]);
  const selectedIsFavorite = useMemo(() => (selectedOrder ? favorites.some((favorite) => favorite.entityType === "order" && favorite.entityId === selectedOrder.id) : false), [favorites, selectedOrder]);

  function patchForm(update: Partial<OrderFormState>) {
    setForm((current) => ({ ...current, ...update }));
    setNotice(null);
  }

  function patchToolValues(patch: Partial<AdminInvitationToolValues>) {
    const update: Partial<OrderFormState> = {};
    if (patch.templateSlug !== undefined) update.templateSlug = patch.templateSlug;
    if (patch.groomName !== undefined) update.groomName = patch.groomName;
    if (patch.brideName !== undefined) update.brideName = patch.brideName;
    if (patch.phone !== undefined) update.phone = patch.phone;
    if (patch.weddingDate !== undefined) update.weddingDate = patch.weddingDate;
    if (patch.venue !== undefined) update.venue = patch.venue;
    if (patch.mapUrl !== undefined) update.mapUrl = patch.mapUrl;
    if (patch.images !== undefined) update.imageUrls = patch.images;
    if (patch.heroVideoUrl !== undefined) update.heroVideoUrl = patch.heroVideoUrl;
    if (patch.heroVideoName !== undefined) update.heroVideoName = patch.heroVideoName;
    if (patch.heroVideoBusy !== undefined) update.heroVideoBusy = patch.heroVideoBusy;
    if (patch.musicEnabled !== undefined) update.musicEnabled = patch.musicEnabled;
    if (patch.musicChoice !== undefined) update.musicChoice = patch.musicChoice;
    if (patch.musicUrl !== undefined) update.musicUrl = patch.musicUrl;
    if (patch.musicLibraryTrackId !== undefined) update.musicLibraryTrackId = patch.musicLibraryTrackId;
    if (patch.musicBusy !== undefined) update.musicBusy = patch.musicBusy;
    if (patch.musicFileName !== undefined) update.musicFileName = patch.musicFileName;
    if (patch.invitationTexts !== undefined) update.invitationTexts = patch.invitationTexts;
    if (patch.photographerEnabled !== undefined) update.photographerEnabled = patch.photographerEnabled;
    if (patch.photographerName !== undefined) update.photographerName = patch.photographerName;
    if (patch.photographerLogo !== undefined) update.photographerLogo = patch.photographerLogo;
    if (patch.photographerFacebookUrl !== undefined) update.photographerFacebookUrl = patch.photographerFacebookUrl;
    if (patch.photographerInstagramUrl !== undefined) update.photographerInstagramUrl = patch.photographerInstagramUrl;
    patchForm(update);
  }

  function updateInvitationText(key: keyof InvitationTexts, value: string) {
    setForm((current) => ({
      ...current,
      invitationTexts: {
        ...current.invitationTexts,
        [key]: value,
      },
    }));
    setNotice(null);
  }

  async function selectOrder(order: OrderRequest) {
    setSelectedId(order.id);
    setNotice(null);
    setLinks(null);
    if (order.status !== "new") return;
    setBusy("review");
    setBusyOrderId(order.id);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "review" }),
      });
      const data = (await response.json().catch(() => null)) as { order?: OrderRequest; error?: string } | null;
      if (response.ok && data?.order) {
        setItems((current) => current.map((item) => (item.id === order.id ? data.order! : item)));
        return;
      }
      setNotice({ kind: "error", text: data?.error || "تم فتح الطلب، لكن تعذر تحويله إلى قيد المراجعة. يمكنك المتابعة أو إعادة المحاولة." });
    } catch {
      setNotice({ kind: "error", text: "تم فتح الطلب، لكن تعذر الاتصال بالخادم لتحديث حالة المراجعة." });
    } finally {
      setBusy("idle");
      setBusyOrderId("");
    }
  }

  async function runOrderAction(order: OrderRequestWithLinks, action: "update" | "publish" | "reject", state: OrderFormState) {
    const effectiveMusic = getEffectiveAdminToolMusic(state);
    const validationError = validateAdminInvitationTools({ ...toolValuesFromForm(state), ...effectiveMusic });
    if (validationError) {
      setSelectedId(order.id);
      setActionFeedback((current) => ({ ...current, [order.id]: { kind: "error", text: validationError } }));
      setNotice({ kind: "error", text: validationError });
      return;
    }
    if (action === "reject" && !state.rejectionReason.trim()) {
      setSelectedId(order.id);
      setActionFeedback((current) => ({ ...current, [order.id]: { kind: "error", text: "اكتب سبب الرفض أولاً." } }));
      setNotice({ kind: "error", text: "اكتب سبب الرفض قبل تغيير حالة الطلب إلى مرفوض." });
      return;
    }
    setSelectedId(order.id);
    setBusy(action);
    setBusyOrderId(order.id);
    const pendingText = action === "publish" ? "جاري الموافقة والنشر..." : action === "reject" ? "جاري رفض الطلب..." : "جاري الحفظ...";
    setActionFeedback((current) => ({ ...current, [order.id]: { kind: "pending", text: pendingText } }));
    setNotice({ kind: "success", text: action === "publish" ? "جاري الموافقة ونشر الدعوة..." : action === "reject" ? "جاري رفض الطلب..." : "جاري حفظ التعديلات..." });
    try {
      const response = await fetch(`/api/admin/orders/${order.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payloadFromFormState(state, action)),
      });
      const data = (await response.json().catch(() => null)) as { order?: OrderRequest; error?: string; publicUrl?: string; adminUrl?: string } | null;
      if (!response.ok || !data?.order) {
        const text = data?.error || "تعذر تنفيذ الإجراء. راجع البيانات أو حاول مرة أخرى.";
        setActionFeedback((current) => ({ ...current, [order.id]: { kind: "error", text } }));
        setNotice({ kind: "error", text });
        return;
      }
      setItems((current) => current.map((item) => (item.id === order.id ? data.order! : item)));
      setSelectedId(data.order.id);
      window.dispatchEvent(new Event("admin-orders-count-refresh"));
      if (data.publicUrl && data.adminUrl) setLinks({ publicUrl: data.publicUrl, adminUrl: data.adminUrl });
      const successText = action === "publish" ? "تم النشر بنجاح" : action === "reject" ? "تم الرفض" : "تم الحفظ";
      setActionFeedback((current) => ({ ...current, [order.id]: { kind: "success", text: successText } }));
      setNotice({
        kind: "success",
        text: action === "publish" ? "تمت الموافقة ونشر الدعوة وإنشاء الروابط." : action === "reject" ? "تم رفض الطلب وحفظ السبب." : "تم حفظ التعديلات.",
      });
    } catch {
      const text = "تعذر الاتصال بالخادم. تحقق من الاتصال أو سجل الدخول مرة أخرى ثم حاول.";
      setActionFeedback((current) => ({ ...current, [order.id]: { kind: "error", text } }));
      setNotice({ kind: "error", text });
    } finally {
      setBusy("idle");
      setBusyOrderId("");
    }
  }

  async function runAction(action: "update" | "publish" | "reject") {
    if (!selectedOrder) return;
    await runOrderAction(selectedOrder, action, form);
  }

  async function quickPublish(order: OrderRequestWithLinks) {
    const state = formFromOrder(order, fallbackTemplate, musicFiles);
    await runOrderAction(order, "publish", state);
  }

  async function handleImageFile(index: number, file?: File | null) {
    if (!file) return;
    setForm((current) => ({
      ...current,
      imageUrls: current.imageUrls.map((image, imageIndex) => (imageIndex === index ? { ...image, name: file.name, loading: true } : image)),
    }));
    try {
      const url = await uploadAdminPreviewImage(file);
      setForm((current) => ({
        ...current,
        imageUrls: current.imageUrls.map((image, imageIndex) => (imageIndex === index ? { ...image, url, name: file.name, loading: false } : image)),
      }));
      setNotice({ kind: "success", text: `تم رفع Photo ${index + 1} وظهرت في المعاينة.` });
    } catch (error) {
      setForm((current) => ({
        ...current,
        imageUrls: current.imageUrls.map((image, imageIndex) => (imageIndex === index ? { ...image, url: "", name: file.name, loading: false } : image)),
      }));
      setNotice({ kind: "error", text: error instanceof Error && error.message !== "preview-image-upload-failed" ? error.message : "تعذر رفع الصورة. جرّب صيغة أخرى أو صورة أصغر." });
    }
  }

  async function handlePhotographerLogoFile(file?: File | null) {
    if (!file) return;
    patchForm({ photographerLogo: { url: "", name: file.name, loading: true } });
    try {
      const url = await uploadAdminPreviewImage(file);
      patchForm({ photographerLogo: { url, name: file.name, loading: false } });
      setNotice({ kind: "success", text: "تم رفع شعار المصور وظهر في المعاينة." });
    } catch (error) {
      patchForm({ photographerLogo: { url: "", name: file.name, loading: false } });
      setNotice({ kind: "error", text: error instanceof Error && error.message !== "preview-image-upload-failed" ? error.message : "تعذر رفع شعار المصور." });
    }
  }

  async function handleMusicFile(file?: File | null) {
    if (!file) return;
    patchForm({ musicBusy: true, musicEnabled: true, musicChoice: "upload", musicLibraryTrackId: "" });
    try {
      const musicUrl = await uploadAdminMusic(file);
      patchForm({ musicBusy: false, musicUrl, musicFileName: file.name });
      setNotice({ kind: "success", text: "تم رفع الموسيقى وربطها بهذا الطلب." });
    } catch (error) {
      patchForm({ musicBusy: false });
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "ملف الموسيقى غير قابل للتشغيل." });
    }
  }

  async function handleMusicVideoFile(file?: File | null) {
    if (!file) return;
    patchForm({ musicBusy: true, musicEnabled: true, musicChoice: "video", musicLibraryTrackId: "" });
    try {
      const extracted = await uploadAdminVideoAudio(file);
      patchForm({ musicBusy: false, musicUrl: extracted.musicUrl, musicFileName: extracted.fileName });
      setNotice({ kind: "success", text: `تم استخراج الصوت من الفيديو وحفظه كملف MP3: ${extracted.fileName}` });
    } catch (error) {
      patchForm({ musicBusy: false });
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "تعذر استخراج الصوت من الفيديو." });
    }
  }

  async function handleHeroVideoFile(file?: File | null) {
    if (!file) return;
    patchForm({ heroVideoBusy: true, heroVideoName: file.name });
    try {
      const heroVideoUrl = await uploadAdminHeroVideo(file);
      patchForm({ heroVideoBusy: false, heroVideoUrl, heroVideoName: file.name });
      setNotice({ kind: "success", text: "تم رفع فيديو خلفية الدعوة وربطه بالمعاينة." });
    } catch (error) {
      patchForm({ heroVideoBusy: false, heroVideoUrl: "", heroVideoName: "" });
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "تعذر رفع فيديو خلفية الدعوة." });
    }
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
            const isFinal = ["published", "converted", "rejected"].includes(order.status);
            const isPublishingThisOrder = busy === "publish" && busyOrderId === order.id;
            const feedback = actionFeedback[order.id];
            return (
              <article className={active ? "orders-queue-item active" : "orders-queue-item"} key={order.id}>
                <button className="orders-queue-select" type="button" onClick={() => selectOrder(order)} aria-label={`فتح ${orderTitle(order, index)}`}>
                  <span className={`order-status-chip ${meta.className}`}>{meta.label}</span>
                  <strong>{orderTitle(order, index)}</strong>
                  <small>{formatDateTime(order.submittedAt || order.createdAt)}</small>
                </button>
                <button className="orders-queue-publish" type="button" disabled={busy !== "idle" || isFinal} onClick={() => quickPublish(order)}>
                  {isPublishingThisOrder ? <Loader2 size={15} /> : <Send size={15} />}
                  موافقة ونشر
                </button>
                {feedback ? (
                  <div className={`orders-queue-feedback ${feedback.kind}`} role="status" aria-live="polite">
                    {feedback.kind === "success" ? <CheckCircle2 size={15} /> : feedback.kind === "error" ? <XCircle size={15} /> : <Loader2 size={15} />}
                    <span>{feedback.text}</span>
                  </div>
                ) : null}
              </article>
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
          <div className="orders-editor-head-actions">
            {selectedOrder ? (
              <FavoriteToggleButton
                entityType="order"
                entityId={selectedOrder.id}
                label={orderTitle(selectedOrder, Math.max(0, items.findIndex((item) => item.id === selectedOrder.id)))}
                href="/admin/orders"
                returnTo="/admin/orders"
                active={selectedIsFavorite}
              />
            ) : null}
            <span className={`order-status-chip ${selectedStatus.className}`}>{selectedStatus.label}</span>
          </div>
        </div>

        {notice ? <div className={notice.kind === "error" ? "notice danger" : "notice success"}>{notice.text}</div> : null}

        {selectedOrder ? (
          <InternalNotesPanel
            entityType="order"
            entityId={selectedOrder.id}
            notes={selectedInternalNotes}
            title="ملاحظات داخلية للطلب"
            returnTo="/admin/orders"
          />
        ) : null}

        <AdminInvitationTools
          values={toolValues}
          templates={templates}
          musicFiles={musicFiles}
          contentPresets={contentPresets}
          refs={{ imageInputRefs: imageInputs }}
          showPhone
          sectionClassName="orders-edit-section"
          gridClassName="orders-editor-grid"
          imageGridClassName="builder-photo-grid orders-photo-grid"
          imageTitle="الصور المرفوعة"
          musicLabel="تشغيل الموسيقى عند فتح الدعوة"
          onPatch={patchToolValues}
          onImageFile={handleImageFile}
          onHeroVideoFile={handleHeroVideoFile}
          onPhotographerLogoFile={handlePhotographerLogoFile}
          onInvitationTextChange={updateInvitationText}
          onMusicFile={handleMusicFile}
          onMusicVideoFile={handleMusicVideoFile}
        />

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
