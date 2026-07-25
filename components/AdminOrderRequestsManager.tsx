"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CheckCircle2, CheckSquare, ChevronDown, Clock, Clock3, Copy, Eye, Loader2, Newspaper, Send, SlidersHorizontal, Trash2, Volume2, VolumeX, XCircle } from "lucide-react";
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
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FavoriteToggleButton } from "@/components/FavoriteToggleButton";
import { CopySuccessButton, buildSuccessMessage } from "@/components/CopySuccessButton";
import { InternalNotesPanel } from "@/components/InternalNotesPanel";
import { PostImageAdminPanel } from "@/components/PostImageAdminPanel";
import type { LiveInvitationPreviewPayload } from "@/components/LiveInvitationPreview";
import { normalizeInvitationTexts } from "@/lib/invitation-texts";
import type { TemplatePreviewEditableInfo } from "@/lib/template-preview-info";
import type { AdminFavorite, ContentPreset, InternalNote, InvitationTexts, OrderRequest } from "@/lib/types";

type BuilderTemplate = AdminToolTemplate;
type MusicFile = AdminToolMusicFile;

type TemplatePreviewDefaults = {
  language?: "ar" | "en";
  weddingTime?: string;
  groomName?: string;
  brideName?: string;
  weddingDate?: string;
  venue?: string;
  city?: string;
  mapUrl?: string;
  heroVideoUrl?: string;
  photographerEnabled?: boolean;
  photographerName?: string;
  photographerDescription?: string;
  photographerLogoUrl?: string;
  photographerInstagramUrl?: string;
  photographerFacebookUrl?: string;
  photographerWhatsappUrl?: string;
  invitationTexts?: Partial<InvitationTexts>;
};
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
  weddingTime: string;
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
  photographerDescription: string;
  photographerLogo: AdminToolUploadSlot;
  photographerFacebookUrl: string;
  photographerInstagramUrl: string;
  photographerWhatsappUrl: string;
  rejectionReason: string;
  trialDays: number;
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
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(date);
}

function normalizeOrderMusicChoice(order: OrderRequest, musicFiles: MusicFile[]): AdminToolMusicChoice {
  if (order.musicChoice === "default" || order.musicChoice === "library" || order.musicChoice === "upload" || order.musicChoice === "video" || order.musicChoice === "url") return order.musicChoice;
  if (order.musicUrl && musicFiles.some((file) => file.url === order.musicUrl)) return "library";
  return order.musicUrl ? "url" : "default";
}

function formFromOrder(order: OrderRequest, fallbackTemplate: string, musicFiles: MusicFile[] = [], defaults?: TemplatePreviewDefaults): OrderFormState {
  const photographer = order.photographer;
  const imageUrls = [...(order.imageUrls || [])].slice(0, 3);
  const photographerLogoUrl = photographer?.logoUrl || defaults?.photographerLogoUrl || "";
  const rawTexts = order.texts && typeof order.texts === "object" ? (order.texts as Record<string, unknown>) : {};
  const heroVideoUrl = typeof rawTexts.heroVideoUrl === "string" ? rawTexts.heroVideoUrl : "";
  const musicFile = musicFiles.find((file) => file.id === order.musicLibraryTrackId || file.url === order.musicUrl);
  const musicChoice = normalizeOrderMusicChoice(order, musicFiles);
  return {
    groomName: order.groomName || defaults?.groomName || "",
    brideName: order.brideName || defaults?.brideName || "",
    phone: order.phone || "",
    weddingDate: formatDateInput(order.weddingDate) || defaults?.weddingDate || "",
    weddingTime: order.weddingTime || defaults?.weddingTime || "07:00 مساءً",
    venue: order.venue || defaults?.venue || "",
    mapUrl: order.mapUrl || defaults?.mapUrl || "",
    notes: order.notes || "",
    templateSlug: order.templateSlug || fallbackTemplate,
    imageUrls: emptyImages.map((slot, index) => ({ ...slot, url: imageUrls[index] || "", name: imageUrls[index]?.split("/").pop() || "" })),
    heroVideoUrl: heroVideoUrl || defaults?.heroVideoUrl || "",
    heroVideoName: (heroVideoUrl || defaults?.heroVideoUrl || "").split("/").pop() || "",
    heroVideoBusy: false,
    musicEnabled: Boolean(order.musicEnabled),
    musicChoice,
    musicUrl: order.musicUrl || "",
    musicLibraryTrackId: musicChoice === "library" ? musicFile?.id || order.musicLibraryTrackId || "" : "",
    musicBusy: false,
    musicFileName: order.musicUrl?.split("/").pop() || "",
    invitationTexts: normalizeInvitationTexts({ ...defaults?.invitationTexts, ...order.texts }),
    photographerEnabled: photographer?.enabled ?? defaults?.photographerEnabled ?? false,
    photographerName: photographer?.name || defaults?.photographerName || "",
    photographerDescription: photographer?.description || defaults?.photographerDescription || "",
    photographerLogo: { ...emptyAdminToolUpload, url: photographerLogoUrl, name: photographerLogoUrl.split("/").pop() || "" },
    photographerFacebookUrl: photographer?.facebookUrl || defaults?.photographerFacebookUrl || "",
    photographerInstagramUrl: photographer?.instagramUrl || defaults?.photographerInstagramUrl || "",
    photographerWhatsappUrl: photographer?.whatsappUrl || defaults?.photographerWhatsappUrl || "",
    rejectionReason: order.rejectionReason || "",
    trialDays: 3,
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
    photographerDescription: form.photographerDescription,
    photographerLogo: form.photographerLogo,
    photographerFacebookUrl: form.photographerFacebookUrl,
    photographerInstagramUrl: form.photographerInstagramUrl,
    photographerWhatsappUrl: form.photographerWhatsappUrl,
    musicEnabled: form.musicEnabled,
    musicChoice: form.musicChoice,
    musicUrl: form.musicUrl,
    musicLibraryTrackId: form.musicLibraryTrackId,
    musicBusy: form.musicBusy,
    musicFileName: form.musicFileName,
    invitationTexts: form.invitationTexts,
  };
}

function payloadFromFormState(form: OrderFormState, action: "review" | "update" | "publish" | "trial-publish" | "reject") {
  const effectiveMusic = getEffectiveAdminToolMusic(form);
  const trialDays = action === "trial-publish" ? form.trialDays : undefined;
  return {
    action,
    trialDays,
    groomName: form.groomName,
    brideName: form.brideName,
    phone: form.phone,
    weddingDate: form.weddingDate,
    weddingTime: form.weddingTime,
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
      description: form.photographerDescription,
      logoUrl: form.photographerLogo.url,
      facebookUrl: form.photographerFacebookUrl,
      instagramUrl: form.photographerInstagramUrl,
      whatsappUrl: form.photographerWhatsappUrl,
      _logoSource: form.photographerLogo.url ? "custom" : "global",
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
  templatePreviewInfo,
  initialTab,
}: {
  orders: OrderRequestWithLinks[];
  templates: BuilderTemplate[];
  musicFiles: MusicFile[];
  contentPresets: ContentPreset[];
  internalNotes: InternalNote[];
  favorites: AdminFavorite[];
  siteUrl: string;
  templatePreviewInfo?: TemplatePreviewEditableInfo;
  initialTab?: "pending" | "published" | "rejected";
}) {
  const [livePreviewInfo, setLivePreviewInfo] = useState(templatePreviewInfo);

  useEffect(() => {
    setLivePreviewInfo(templatePreviewInfo);
  }, [templatePreviewInfo]);

  useEffect(() => {
    let cancelled = false;
    async function fetchLatest() {
      try {
        const res = await fetch("/api/admin/templates/info");
        if (res.ok && !cancelled) {
          setLivePreviewInfo(await res.json());
        }
      } catch {}
    }
    fetchLatest();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchLatest();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const defaults = useMemo<TemplatePreviewDefaults | undefined>(() => {
    if (!livePreviewInfo) return undefined;
    return {
      language: livePreviewInfo.language,
      weddingTime: livePreviewInfo.weddingTime,
      groomName: livePreviewInfo.groomName,
      brideName: livePreviewInfo.brideName,
      weddingDate: livePreviewInfo.weddingDate,
      venue: livePreviewInfo.venue,
      city: livePreviewInfo.city,
      mapUrl: livePreviewInfo.mapUrl,
      heroVideoUrl: livePreviewInfo.heroVideoUrl,
      photographerEnabled: livePreviewInfo.photographer.enabled,
      photographerName: livePreviewInfo.photographer.name,
      photographerDescription: livePreviewInfo.photographer.description,
      photographerLogoUrl: livePreviewInfo.photographer.logoUrl,
      photographerInstagramUrl: livePreviewInfo.photographer.instagramUrl,
      photographerFacebookUrl: livePreviewInfo.photographer.facebookUrl,
      photographerWhatsappUrl: livePreviewInfo.photographer.whatsappUrl,
      invitationTexts: {
        openingText: livePreviewInfo.texts.openingText,
        inviteMessage: livePreviewInfo.texts.inviteMessage,
        inviteMessageSecondary: livePreviewInfo.texts.inviteMessageSecondary,
        rsvpQuestion: livePreviewInfo.texts.rsvpQuestion,
        rsvpDeclinedMessage: livePreviewInfo.texts.rsvpDeclinedMessage,
        rsvpConfirmedSuccessMessage: livePreviewInfo.texts.rsvpConfirmedSuccessMessage,
        rsvpDeclinedSuccessMessage: livePreviewInfo.texts.rsvpDeclinedSuccessMessage,
        galleryStories: livePreviewInfo.texts.galleryStories,
        story: livePreviewInfo.texts.story,
      },
    };
  }, [livePreviewInfo]);
  const fallbackTemplate = templates[0]?.slug || "featured-1";
  const [items, setItems] = useState<OrderRequestWithLinks[]>(orders);
  const [selectedId, setSelectedId] = useState(orders[0]?.id || "");
  const selectedOrder = useMemo(() => items.find((order) => order.id === selectedId) || items[0] || null, [items, selectedId]);
  const [form, setForm] = useState<OrderFormState>(() => (selectedOrder ? formFromOrder(selectedOrder, fallbackTemplate, musicFiles, defaults) : formFromOrder({ id: "", groomName: "", brideName: "", phone: "", weddingDate: "", venue: "", templateSlug: fallbackTemplate, language: "ar", status: "new", createdAt: "" }, fallbackTemplate, musicFiles, defaults)));
  const [busy, setBusy] = useState<"idle" | "review" | "update" | "publish" | "trial-publish" | "reject">("idle");
  const [busyOrderId, setBusyOrderId] = useState("");
  const [actionFeedback, setActionFeedback] = useState<Record<string, { kind: "pending" | "success" | "error"; text: string }>>({});
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [bulkSent, setBulkSent] = useState(false);
  const [links, setLinks] = useState<{ publicUrl: string; adminUrl: string } | null>(null);
  const imageInputs = useRef<Array<HTMLInputElement | null>>([]);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");

  const [tab, setTab] = useState<"pending" | "published" | "rejected">(initialTab || "pending");
  const [previewMuted, setPreviewMuted] = useState(true);
  useEffect(() => {
    try { const v = localStorage.getItem("badrdaawa-admin-preview-muted"); if (v !== null) setPreviewMuted(v === "true"); } catch {}
  }, []);
  useEffect(() => {
    try { localStorage.setItem("badrdaawa-admin-preview-muted", String(previewMuted)); } catch {}
  }, [previewMuted]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ type: "single" | "selected" | "all-pending" | "all-published" | "all-rejected"; ids?: string[] } | null>(null);
  const [statusMenuOrderId, setStatusMenuOrderId] = useState<string | null>(null);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState("");

  useEffect(() => {
    if (!statusMenuOrderId) return;
    function handleClick() { setStatusMenuOrderId(null); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [statusMenuOrderId]);

  const tabItems = useMemo(() => {
    if (tab === "pending") return items.filter((order) => !["published", "converted", "rejected"].includes(order.status));
    if (tab === "published") return items.filter((order) => ["published", "converted"].includes(order.status));
    return items.filter((order) => order.status === "rejected");
  }, [items, tab]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === tabItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tabItems.map((item) => item.id)));
    }
  }

  async function hardDeleteOrder(orderId: string) {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "hard-delete" }),
      });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!response.ok || !data?.ok) throw new Error(data?.error || "تعذر الحذف.");
      setItems((current) => current.filter((item) => item.id !== orderId));
      if (selectedId === orderId) {
        const remaining = items.filter((item) => item.id !== orderId);
        setSelectedId(remaining[0]?.id || "");
      }
      setNotice({ kind: "success", text: "تم الحذف نهائياً." });
      window.dispatchEvent(new Event("admin-orders-count-refresh"));
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "تعذر حذف الطلب." });
    }
  }

  async function hardDeleteSelected() {
    const ids = Array.from(selectedIds);
    let success = 0;
    for (const id of ids) {
      try {
        const response = await fetch(`/api/admin/orders/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ action: "hard-delete" }),
        });
        const data = (await response.json().catch(() => null)) as { ok?: boolean } | null;
        if (response.ok && data?.ok) {
          success++;
          setItems((current) => current.filter((item) => item.id !== id));
        }
      } catch {
        // continue
      }
    }
    setSelectedIds(new Set());
    if (selectedIds.has(selectedId)) {
      const remaining = items.filter((item) => !selectedIds.has(item.id));
      setSelectedId(remaining[0]?.id || "");
    }
    setNotice({ kind: "success", text: `تم حذف ${success} طلب/طلبات بنجاح.` });
    window.dispatchEvent(new Event("admin-orders-count-refresh"));
  }

  async function hardDeleteAllByTab(tabType: "pending" | "published" | "rejected") {
    const targetItems = items.filter((order) => {
      if (tabType === "pending") return !["published", "converted", "rejected"].includes(order.status);
      if (tabType === "published") return ["published", "converted"].includes(order.status);
      return order.status === "rejected";
    });
    let success = 0;
    for (const item of targetItems) {
      try {
        const response = await fetch(`/api/admin/orders/${item.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ action: "hard-delete" }),
        });
        const data = (await response.json().catch(() => null)) as { ok?: boolean } | null;
        if (response.ok && data?.ok) {
          success++;
          setItems((current) => current.filter((i) => i.id !== item.id));
        }
      } catch {
        // continue
      }
    }
    setSelectedIds(new Set());
    if (targetItems.some((item) => item.id === selectedId)) {
      const remaining = items.filter((item) => !targetItems.some((t) => t.id === item.id));
      setSelectedId(remaining[0]?.id || "");
    }
    const label = tabType === "pending" ? "المعلقة" : tabType === "published" ? "المنشورة" : "المرفوضة";
    setNotice({ kind: "success", text: `تم حذف ${success} ${label} بنجاح.` });
    window.dispatchEvent(new Event("admin-orders-count-refresh"));
  }

  useEffect(() => {
    if (!selectedOrder) return;
    setForm(formFromOrder(selectedOrder, fallbackTemplate, musicFiles, defaults));
    setLinks(
      selectedOrder.publishedInvitationCode
        ? {
            publicUrl: selectedOrder.publicUrl || `${cleanSiteUrl}/${selectedOrder.publishedInvitationCode}`,
            adminUrl: selectedOrder.adminUrl || `${cleanSiteUrl}/${selectedOrder.publishedInvitationCode}/ad_3399`,
          }
        : null,
    );
  }, [cleanSiteUrl, fallbackTemplate, musicFiles, selectedOrder, defaults]);

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
      weddingTime: form.weddingTime || "07:00 مساءً",
      venue: form.venue,
      city: "",
      mapUrl: form.mapUrl,
      gallery: form.imageUrls.map((image) => image.url).filter(Boolean),
      heroVideoUrl: form.heroVideoUrl,
      musicEnabled: effectivePreviewMusic.musicEnabled,
      musicUrl: effectivePreviewMusic.musicUrl,
      disableMusic: previewMuted || !effectivePreviewMusic.musicEnabled,
      texts: form.invitationTexts,
      photographer: {
        enabled: form.photographerEnabled,
        name: form.photographerName,
        description: form.photographerDescription,
        logoUrl: form.photographerLogo.url,
        facebookUrl: form.photographerFacebookUrl,
        instagramUrl: form.photographerInstagramUrl,
        whatsappUrl: form.photographerWhatsappUrl,
        _logoSource: form.photographerLogo.url ? "custom" : "global",
      },
    }),
    [effectivePreviewMusic, form, previewMuted],
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
  const publishedCount = items.filter((order) => ["published", "converted"].includes(order.status)).length;
  const rejectedCount = items.filter((order) => order.status === "rejected").length;
  const tabLabels: Record<string, string> = { pending: "المعلقة", published: "المنشورة", rejected: "المرفوضة" };
  const selectedInternalNotes = useMemo(() => (selectedOrder ? internalNotes.filter((note) => note.entityType === "order" && note.entityId === selectedOrder.id) : []), [internalNotes, selectedOrder]);
  const selectedIsFavorite = useMemo(() => (selectedOrder ? favorites.some((favorite) => favorite.entityType === "order" && favorite.entityId === selectedOrder.id) : false), [favorites, selectedOrder]);
  const selectedInvitationUrl = selectedOrder?.publishedInvitationCode ? selectedOrder.publicUrl || links?.publicUrl || `${cleanSiteUrl}/${selectedOrder.publishedInvitationCode}` : "";

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

  async function runOrderAction(order: OrderRequestWithLinks, action: "update" | "publish" | "trial-publish" | "reject", state: OrderFormState) {
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
    const pendingText = action === "trial-publish" ? "جاري إعادة محاولة النشر التجريبي..." : action === "publish" ? "جاري النشر النهائي..." : action === "reject" ? "جاري رفض الطلب..." : "جاري الحفظ...";
    setActionFeedback((current) => ({ ...current, [order.id]: { kind: "pending", text: pendingText } }));
    setNotice({ kind: "success", text: action === "trial-publish" ? "جاري إعادة محاولة النشر التجريبي..." : action === "publish" ? "جاري النشر النهائي..." : action === "reject" ? "جاري رفض الطلب..." : "جاري حفظ التعديلات..." });
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
      if (action === "publish" || action === "trial-publish") setTab("published");
      else if (action === "reject") setTab("rejected");
      const successText = action === "publish" || action === "trial-publish" ? "تم النشر بنجاح" : action === "reject" ? "تم الرفض" : "تم الحفظ";
      setActionFeedback((current) => ({ ...current, [order.id]: { kind: "success", text: successText } }));
      setNotice({
        kind: "success",
        text: action === "trial-publish" ? "تم نشر الدعوة بفترة تجريبية وإنشاء الروابط." : action === "publish" ? "تم النشر النهائي وإنشاء الروابط." : action === "reject" ? "تم رفض الطلب وحفظ السبب." : "تم حفظ التعديلات.",
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

  async function runAction(action: "update" | "publish" | "trial-publish" | "reject") {
    if (!selectedOrder) return;
    await runOrderAction(selectedOrder, action, form);
  }

  async function quickPublish(order: OrderRequestWithLinks) {
    const state = formFromOrder(order, fallbackTemplate, musicFiles);
    await runOrderAction(order, "trial-publish", state);
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

  async function sendToAll() {
    const published = items.filter((order) => ["published", "converted"].includes(order.status) && order.publicUrl && order.adminUrl);
    if (!published.length) {
      setNotice({ kind: "error", text: "لا توجد دعوات منشورة." });
      return;
    }
    const messages = published.map((order) => `━━━━━━━━━━━━━━\n${order.groomName} & ${order.brideName}\n━━━━━━━━━━━━━━\n${buildSuccessMessage(order.publicUrl!, order.adminUrl!)}`);
    await navigator.clipboard.writeText(messages.join("\n\n"));
    setBulkSent(true);
    window.setTimeout(() => setBulkSent(false), 2000);
    setNotice({ kind: "success", text: `تم نسخ رسائل ${published.length} دعوة منشورة.` });
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

  async function handleConfirmDelete() {
    if (!confirmDelete) return;
    if (confirmDelete.type === "single" && confirmDelete.ids?.[0]) {
      await hardDeleteOrder(confirmDelete.ids[0]);
    } else if (confirmDelete.type === "selected") {
      await hardDeleteSelected();
    } else {
      await hardDeleteAllByTab(confirmDelete.type === "all-pending" ? "pending" : confirmDelete.type === "all-published" ? "published" : "rejected");
    }
    setConfirmDelete(null);
  }

  function deleteConfirmMessage(ids?: string[]) {
    const count = ids?.length || 0;
    if (confirmDelete?.type === "single") return `هل أنت متأكد من حذف هذا الطلب نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`;
    if (confirmDelete?.type === "selected") return `هل أنت متأكد من حذف ${count} طلب/طلبات محددة نهائياً؟ لا يمكن التراجع عن هذا الإجراء.`;
    const label = confirmDelete?.type === "all-pending" ? "المعلقة" : confirmDelete?.type === "all-published" ? "المنشورة" : "المرفوضة";
    return `هل أنت متأكد من حذف جميع الطلبات ${label} نهائياً؟ (${count || items.filter((o) => {
      if (confirmDelete?.type === "all-pending") return !["published", "converted", "rejected"].includes(o.status);
      if (confirmDelete?.type === "all-published") return ["published", "converted"].includes(o.status);
      return o.status === "rejected";
    }).length} طلب) لا يمكن التراجع عن هذا الإجراء.`;
  }

  const selectedStatus = statusMap[selectedOrder?.status || "new"];

  return (
    <section className="admin-orders-workspace">
      <aside className="orders-queue-panel">
        <div className="orders-queue-head">
          <div>
            <span className="eyebrow">طلبات الدعوات</span>
            <h2>طلبات تحتاج تدخل</h2>
            <p>الطلبات المكتملة تُنشر تلقائيًا؛ الموجود هنا يحتاج استكمال بيانات أو إعادة محاولة النشر.</p>
          </div>
        </div>

        <div className="orders-queue-tabs">
          <button className={`orders-queue-tab ${tab === "pending" ? "active" : ""}`} type="button" onClick={() => { setTab("pending"); setSelectedIds(new Set()); }}>
            تحتاج تدخل <span className="orders-queue-tab-count">{openCount}</span>
          </button>
          <button className={`orders-queue-tab ${tab === "published" ? "active" : ""}`} type="button" onClick={() => { setTab("published"); setSelectedIds(new Set()); }}>
            المنشورة <span className="orders-queue-tab-count">{publishedCount}</span>
          </button>
          <button className={`orders-queue-tab ${tab === "rejected" ? "active" : ""}`} type="button" onClick={() => { setTab("rejected"); setSelectedIds(new Set()); }}>
            المرفوضة <span className="orders-queue-tab-count">{rejectedCount}</span>
          </button>
        </div>

        {tab === "published" && publishedCount > 0 ? (
          <div className="orders-queue-bulk-bar">
            <button className="orders-queue-publish" type="button" onClick={sendToAll}>
              {bulkSent ? <Check size={15} /> : <Send size={15} />}
              {bulkSent ? "تم النسخ" : `إرسال لكل الدعوات (${publishedCount})`}
            </button>
          </div>
        ) : null}

        {tabItems.length > 0 && (
          <div className="orders-queue-bulk-bar">
            <label className="orders-queue-bulk-check">
              <input type="checkbox" checked={selectedIds.size === tabItems.length && tabItems.length > 0} onChange={toggleSelectAll} />
              <CheckSquare size={15} />
            </label>
            <span className="orders-queue-bulk-label">{selectedIds.size} من {tabItems.length} مختار</span>
            {selectedIds.size > 0 && (
              <button className="orders-queue-bulk-delete" type="button" onClick={() => {
                setConfirmDelete({ type: "selected", ids: Array.from(selectedIds) });
              }}>
                <Trash2 size={14} /> حذف المحدد
              </button>
            )}
            <button className="orders-queue-bulk-delete-all" type="button" onClick={() => setConfirmDelete({
              type: tab === "pending" ? "all-pending" : tab === "published" ? "all-published" : "all-rejected"
            })}>
              <Trash2 size={14} /> حذف جميع {tabLabels[tab]}
            </button>
          </div>
        )}

        <div className="orders-queue-list">
          {tabItems.length === 0 ? (
            <div className="admin-empty-state compact">
              <strong>لا توجد طلبات {tabLabels[tab]}</strong>
            </div>
          ) : (
            tabItems.map((order, index) => {
              const meta = statusMap[order.status] || statusMap.new;
              const active = selectedOrder?.id === order.id;
              const isFinal = ["published", "converted", "rejected"].includes(order.status);
              const isPublishingThisOrder = busy === "publish" && busyOrderId === order.id;
              const feedback = actionFeedback[order.id];
              const statusMenuOpen = statusMenuOrderId === order.id;
              return (
                <article className={active ? "orders-queue-item active" : "orders-queue-item"} key={order.id}>
                  <div className="orders-queue-item-row">
                    <label className="orders-queue-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} />
                    </label>
                    <button className="orders-queue-select" type="button" onClick={() => selectOrder(order)} aria-label={`فتح ${orderTitle(order, index)}`}>
                      <span className={`order-status-chip ${meta.className}`}>{meta.label}</span>
                      <strong>{orderTitle(order, index)}</strong>
                      <small>{formatDateTime(order.submittedAt || order.createdAt)}</small>
                    </button>
                    <div className="orders-queue-status-menu">
                      <button className="orders-queue-status-trigger" type="button" onClick={(e) => { e.stopPropagation(); setStatusMenuOrderId(statusMenuOpen ? null : order.id); }} aria-label="تغيير الحالة">
                        <ChevronDown size={14} />
                      </button>
                      {statusMenuOpen ? (
                        <div className="orders-queue-status-dropdown" onClick={(e) => e.stopPropagation()}>
                          {(["new", "reviewing", "edited", "accepted", "rejected"] as StatusKind[]).map((s) => (
                            <button
                              key={s}
                              type="button"
                              className={order.status === s ? "active" : ""}
                              disabled={busy !== "idle"}
                              onClick={async () => {
                                setStatusMenuOrderId(null);
                                if (s === "rejected") {
                                  setSelectedId(order.id);
                                  setNotice({ kind: "error", text: "افتح الطلب واكتب سبب الرفض أولاً." });
                                  return;
                                }
                                if (s === order.status) return;
                                try {
                                  const res = await fetch(`/api/admin/orders/${order.id}`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                                    body: JSON.stringify({ action: "update-status", status: s }),
                                  });
                                  const data = await res.json().catch(() => null) as { order?: OrderRequest; error?: string } | null;
                                  if (res.ok && data?.order) {
                                    setItems((current) => current.map((item) => (item.id === order.id ? data.order! : item)));
                                    window.dispatchEvent(new Event("admin-orders-count-refresh"));
                                  } else {
                                    setNotice({ kind: "error", text: data?.error || "تعذر تحديث الحالة." });
                                  }
                                } catch {
                                  setNotice({ kind: "error", text: "تعذر تحديث الحالة." });
                                }
                              }}
                            >
                              {statusMap[s].label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="orders-queue-item-actions">
                    {!isFinal && (
                      <>
                        <button className="orders-queue-accept" type="button" disabled={busy !== "idle"} onClick={() => quickPublish(order)}>
                          {isPublishingThisOrder ? <Loader2 size={15} /> : <Check size={14} />}
                          إعادة محاولة النشر التجريبي
                        </button>
                        <button className="orders-queue-reject" type="button" disabled={busy !== "idle"} onClick={() => {
                          setSelectedId(order.id);
                          setRejectingOrderId(rejectingOrderId === order.id ? null : order.id);
                          setRejectReasonInput(order.rejectionReason || "");
                        }}>
                          <XCircle size={14} />
                          رفض
                        </button>
                      </>
                    )}
                    <button className="orders-queue-delete" type="button" disabled={busy !== "idle"} onClick={() => setConfirmDelete({ type: "single", ids: [order.id] })}>
                      <Trash2 size={14} /> حذف
                    </button>
                  </div>
                  {rejectingOrderId === order.id ? (
                    <div className="orders-queue-reject-inline">
                      <textarea
                        placeholder="اكتب سبب الرفض..."
                        value={rejectReasonInput}
                        onChange={(e) => setRejectReasonInput(e.target.value)}
                        rows={2}
                      />
                      <div className="orders-queue-reject-actions">
                        <button className="btn btn-soft danger-button" type="button" disabled={busy !== "idle"} onClick={async () => {
                          if (!rejectReasonInput.trim()) {
                            setNotice({ kind: "error", text: "اكتب سبب الرفض أولاً." });
                            return;
                          }
                          setRejectingOrderId(null);
                          const state = formFromOrder(order, fallbackTemplate, musicFiles);
                          await runOrderAction(order, "reject", { ...state, rejectionReason: rejectReasonInput });
                        }}>
                          {busy === "reject" ? <Loader2 size={14} /> : <XCircle size={14} />}
                          تأكيد الرفض
                        </button>
                        <button className="btn btn-soft" type="button" onClick={() => setRejectingOrderId(null)}>
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {feedback ? (
                    <div className={`orders-queue-feedback ${feedback.kind}`} role="status" aria-live="polite">
                      {feedback.kind === "success" ? <CheckCircle2 size={15} /> : feedback.kind === "error" ? <XCircle size={15} /> : <Loader2 size={15} />}
                      <span>{feedback.text}</span>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </aside>

      <ConfirmDialog
        isOpen={confirmDelete !== null}
        title="تأكيد الحذف"
        message={confirmDelete ? deleteConfirmMessage(confirmDelete.ids) : ""}
        confirmText="حذف"
        cancelText="إلغاء"
        isDangerous
        isLoading={false}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDelete(null)}
      />

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

        {selectedOrder ? (
          <div className="orders-timeline">
            <div className={`orders-timeline-step ${selectedOrder.submittedAt || selectedOrder.createdAt ? "done" : ""}`}>
              <span className="orders-timeline-dot" />
              <div>
                <strong>تم التقديم</strong>
                <small>{formatDateTime(selectedOrder.submittedAt || selectedOrder.createdAt)}</small>
              </div>
            </div>
            <div className={`orders-timeline-step ${selectedOrder.status === "reviewing" || selectedOrder.status === "accepted" || selectedOrder.status === "published" || selectedOrder.status === "converted" ? "done" : ""} ${selectedOrder.status === "reviewing" ? "current" : ""}`}>
              <span className="orders-timeline-dot" />
              <div>
                <strong>قيد المراجعة</strong>
                {selectedOrder.status === "reviewing" ? <small>جارٍ المراجعة حالياً</small> : null}
              </div>
            </div>
            <div className={`orders-timeline-step ${selectedOrder.status === "accepted" || selectedOrder.status === "published" || selectedOrder.status === "converted" ? "done" : ""} ${selectedOrder.status === "accepted" ? "current" : ""}`}>
              <span className="orders-timeline-dot" />
              <div>
                <strong>تم القبول</strong>
                {selectedOrder.status === "accepted" ? <small>بانتظار النشر</small> : null}
              </div>
            </div>
            <div className={`orders-timeline-step ${selectedOrder.status === "published" || selectedOrder.status === "converted" ? "done" : ""} ${selectedOrder.status === "published" ? "current" : ""} ${selectedOrder.status === "rejected" ? "rejected" : ""}`}>
              <span className="orders-timeline-dot" />
              <div>
                <strong>{selectedOrder.status === "rejected" ? "مرفوض" : "تم النشر"}</strong>
                {selectedOrder.status === "published" || selectedOrder.status === "converted" ? <small>الدعوة منشورة ونشطة</small> : null}
                {selectedOrder.status === "rejected" ? <small>{selectedOrder.rejectionReason || "تم الرفض"}</small> : null}
              </div>
            </div>
          </div>
        ) : null}

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

        {selectedOrder?.publishedInvitationCode ? (
          <div className="orders-edit-section orders-post-image-section">
            <div className="invitation-detail-section-head">
              <div>
                <span className="eyebrow">Post Image</span>
                <h2>صورة البوست</h2>
              </div>
              <Newspaper size={18} />
            </div>
            <p className="admin-muted-paragraph">
              هنا تقدر تشوف صورة البوست الخاصة بالدعوة المنشورة، تحملها، تنسخها، أو تعيد توليدها عند الحاجة.
            </p>
            <PostImageAdminPanel
              code={selectedOrder.publishedInvitationCode}
              invitationUrl={selectedInvitationUrl}
              initial={{
                url: selectedOrder.postImage?.url,
                ogUrl: selectedOrder.postImage?.ogUrl,
                status: selectedOrder.postImage?.status || "NEEDS_REGENERATION",
                templateId: selectedOrder.postImage?.templateId || selectedOrder.postImageTemplateId || "breaking-news-v1",
                generatedAt: selectedOrder.postImage?.generatedAt,
                error: selectedOrder.postImage?.error,
                width: selectedOrder.postImage?.width,
                height: selectedOrder.postImage?.height,
                ogWidth: selectedOrder.postImage?.ogWidth,
                ogHeight: selectedOrder.postImage?.ogHeight,
                downloadFileName: `post-image-${selectedOrder.publishedInvitationCode}.png`,
                ogDownloadFileName: `post-image-og-${selectedOrder.publishedInvitationCode}.png`,
              }}
            />
          </div>
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
          <div className="admin-form-grid compact-controls">
            <label className="field">
              <span><Clock size={15} /> وقت الحفل</span>
              <select value={form.weddingTime} onChange={(event) => patchForm({ weddingTime: event.target.value })}>
                <option value="" disabled>اختر وقت الحفل</option>
                <option value="12:00 مساءً">12:00 مساءً</option>
                <option value="01:00 مساءً">01:00 مساءً</option>
                <option value="02:00 مساءً">02:00 مساءً</option>
                <option value="03:00 مساءً">03:00 مساءً</option>
                <option value="04:00 مساءً">04:00 مساءً</option>
                <option value="05:00 مساءً">05:00 مساءً</option>
                <option value="06:00 مساءً">06:00 مساءً</option>
                <option value="07:00 مساءً">07:00 مساءً</option>
                <option value="08:00 مساءً">08:00 مساءً</option>
                <option value="09:00 مساءً">09:00 مساءً</option>
                <option value="10:00 مساءً">10:00 مساءً</option>
                <option value="11:00 مساءً">11:00 مساءً</option>
              </select>
            </label>
          </div>
          <div className="orders-notes-section">
            <h3><span>ملاحظات الطلب</span></h3>
            <label className="field">
              <textarea value={form.notes} onChange={(event) => patchForm({ notes: event.target.value })} rows={4} placeholder="ملاحظات إضافية عن الطلب..." />
            </label>
          </div>
          <div className="orders-notes-section">
            <h3><span>سبب الرفض</span></h3>
            <label className="field">
              <textarea value={form.rejectionReason} onChange={(event) => patchForm({ rejectionReason: event.target.value })} rows={3} placeholder="اكتب سبب الرفض هنا..." />
            </label>
          </div>
        </div>

        <div className="orders-action-row">
          <button className="btn btn-soft" type="button" disabled={busy !== "idle"} onClick={() => runAction("update")}>
            {busy === "update" ? <Loader2 size={17} /> : <SlidersHorizontal size={17} />}
            حفظ كتعديل
          </button>
          <button className="btn btn-gold btn-glow" type="button" disabled={busy !== "idle"} onClick={() => runAction("publish")}>
            {busy === "publish" ? <Loader2 size={17} /> : <Send size={17} />}
            نشر نهائي
          </button>
          <div className="trial-publish-group">
            <button className="btn btn-gold" type="button" disabled={busy !== "idle"} onClick={() => runAction("trial-publish")}>
              {busy === "trial-publish" ? <Loader2 size={17} /> : <Send size={17} />}
              إعادة محاولة النشر التجريبي
            </button>
            <select
              className="trial-days-select"
              value={form.trialDays}
              onChange={(e) => patchForm({ trialDays: Number(e.target.value) })}
              disabled={busy !== "idle"}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>{day} يوم</option>
              ))}
            </select>
          </div>
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
            <div className="orders-success-copy-row">
              <CopySuccessButton publicUrl={links.publicUrl} adminUrl={links.adminUrl} />
            </div>
          </div>
        ) : null}
      </div>

      <aside className="orders-live-preview builder-preview-panel">
        <button className={previewMuted ? "preview-mute-btn muted" : "preview-mute-btn"} type="button" onClick={() => setPreviewMuted((v) => !v)} title={previewMuted ? "تشغيل الصوت" : "كتم الصوت"}>
          {previewMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
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
