"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Camera, CheckCircle2, Copy, Disc3, ExternalLink, GripVertical, Heart, ImagePlus, Link2, Loader2, MapPin, Music2, Pencil, Plus, RotateCcw, Save, Send, Sparkles, Trash2, UploadCloud, UserRound, X } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ContentPresetPicker } from "@/components/ContentPresetPicker";
import {
  emptyAdminToolImages,
  emptyAdminToolUpload,
  isPlayableAudioUrl,
  uploadAdminMusic,
  uploadAdminPreviewImage,
  validateAdminInvitationTools,
  type AdminToolImageSlot,
  type AdminToolMusicChoice,
  type AdminToolMusicFile,
  type AdminToolUploadSlot,
} from "@/components/AdminInvitationTools";
import type { LiveInvitationPreviewPayload } from "@/components/LiveInvitationPreview";
import { acceptedImageFormats } from "@/lib/image-formats";
import { defaultInvitationTexts } from "@/lib/invitation-texts";
import { unifiedImageSlots } from "@/lib/invitation-template-bindings";
import { getPrePublishValidationReport, prePublishStatusLabel, prePublishStatusSymbol } from "@/lib/pre-publish-validation";
import type { ContentPreset, CoupleStoryItem, InvitationTexts } from "@/lib/types";

type WizardTemplate = {
  slug: string;
  name: string;
  arabicName: string;
  category: string;
  previewImage: string;
};

type ImageLibraryFile = {
  url: string;
  name?: string;
  sizeBytes?: number;
  extension?: string;
};

type StepId = "template" | "couple" | "event" | "images" | "extras" | "texts" | "review" | "publish";

type DraftState = {
  templateSlug: string;
  groomName: string;
  brideName: string;
  groomNameEn: string;
  brideNameEn: string;
  weddingDate: string;
  weddingTime: string;
  venue: string;
  city: string;
  mapUrl: string;
  images: AdminToolImageSlot[];
  musicEnabled: boolean;
  musicChoice: AdminToolMusicChoice;
  musicUrl: string;
  musicLibraryTrackId: string;
  musicFileName: string;
  photographerEnabled: boolean;
  photographerName: string;
  photographerInstagramUrl: string;
  photographerFacebookUrl: string;
  photographerWhatsappUrl: string;
  photographerLogo: AdminToolUploadSlot;
  invitationTexts: Required<InvitationTexts>;
};

type CropDraft = {
  index: number;
  file: File;
  sourceUrl: string;
  zoom: number;
  cropX: number;
  cropY: number;
  applying: boolean;
};

const draftStorageKey = "badrdaawa-admin-new-invitation-draft";

const steps: Array<{ id: StepId; title: string; short: string }> = [
  { id: "template", title: "اختيار القالب", short: "القالب" },
  { id: "couple", title: "بيانات العروسين", short: "العروسين" },
  { id: "event", title: "تفاصيل الحفل", short: "الحفل" },
  { id: "images", title: "الصور", short: "الصور" },
  { id: "extras", title: "الموسيقى والمصور", short: "الإضافات" },
  { id: "texts", title: "النصوص", short: "النصوص" },
  { id: "review", title: "المراجعة", short: "المراجعة" },
  { id: "publish", title: "النشر", short: "النشر" },
];

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function loadImage(sourceUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image-load-failed"));
    image.src = sourceUrl;
  });
}

async function createCroppedImageFile(draft: CropDraft) {
  const image = await loadImage(draft.sourceUrl);
  const targetWidth = 1200;
  const targetHeight = 1500;
  const targetRatio = targetWidth / targetHeight;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  let sourceWidth = image.naturalWidth / draft.zoom;
  let sourceHeight = sourceWidth / targetRatio;

  if (imageRatio < targetRatio || sourceHeight > image.naturalHeight / draft.zoom) {
    sourceHeight = image.naturalHeight / draft.zoom;
    sourceWidth = sourceHeight * targetRatio;
  }

  const maxX = Math.max(0, (image.naturalWidth - sourceWidth) / 2);
  const maxY = Math.max(0, (image.naturalHeight - sourceHeight) / 2);
  const sourceX = Math.min(image.naturalWidth - sourceWidth, Math.max(0, maxX + draft.cropX * maxX));
  const sourceY = Math.min(image.naturalHeight - sourceHeight, Math.max(0, maxY + draft.cropY * maxY));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetWidth, targetHeight);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
  if (!blob?.size) throw new Error("crop-empty");
  return new File([blob], `${draft.file.name.replace(/\.[^.]+$/, "") || "invitation-photo"}-crop.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

function createInitialDraft(templates: WizardTemplate[]): DraftState {
  return {
    templateSlug: templates[0]?.slug || "",
    groomName: "",
    brideName: "",
    groomNameEn: "",
    brideNameEn: "",
    weddingDate: todayDate(),
    weddingTime: "07:00 مساءً",
    venue: "",
    city: "",
    mapUrl: "",
    images: emptyAdminToolImages,
    musicEnabled: false,
    musicChoice: "default",
    musicUrl: "",
    musicLibraryTrackId: "",
    musicFileName: "",
    photographerEnabled: false,
    photographerName: "",
    photographerInstagramUrl: "",
    photographerFacebookUrl: "",
    photographerWhatsappUrl: "",
    photographerLogo: emptyAdminToolUpload,
    invitationTexts: defaultInvitationTexts,
  };
}

function normalizeDraft(value: unknown, templates: WizardTemplate[]) {
  const fallback = createInitialDraft(templates);
  if (!value || typeof value !== "object") return fallback;
  const input = value as Partial<DraftState>;
  const templateSlug = templates.some((template) => template.slug === input.templateSlug) ? input.templateSlug || fallback.templateSlug : fallback.templateSlug;
  return {
    ...fallback,
    ...input,
    templateSlug,
    images: Array.isArray(input.images) ? input.images.slice(0, unifiedImageSlots.length).map((image) => ({ url: image?.url || "", name: image?.name || "", loading: false })) : fallback.images,
    photographerLogo: { url: input.photographerLogo?.url || "", name: input.photographerLogo?.name || "", loading: false },
    invitationTexts: { ...defaultInvitationTexts, ...(input.invitationTexts || {}) },
  };
}

function isValidUrl(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function createStoryItem(): CoupleStoryItem {
  return { id: `story-${Date.now().toString(36)}`, title: "", description: "", imageUrl: "", date: "" };
}

export function AdminNewInvitationWizard({
  templates,
  musicFiles,
  imageFiles,
  contentPresets,
  siteUrl,
}: {
  templates: WizardTemplate[];
  musicFiles: AdminToolMusicFile[];
  imageFiles: ImageLibraryFile[];
  contentPresets: ContentPreset[];
  siteUrl: string;
}) {
  const [draft, setDraft] = useState<DraftState>(() => createInitialDraft(templates));
  const [currentStep, setCurrentStep] = useState<StepId>("template");
  const [savedCode, setSavedCode] = useState("");
  const [links, setLinks] = useState<{ publicUrl: string; adminUrl: string } | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<"idle" | "draft" | "publish" | "music" | "image" | "logo">("idle");
  const [autosaveState, setAutosaveState] = useState("جاهز");
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const imageInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const hydratedRef = useRef(false);
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");
  const stepIndex = steps.findIndex((step) => step.id === currentStep);
  const selectedTemplate = templates.find((template) => template.slug === draft.templateSlug) || templates[0];
  const prePublishReport = useMemo(
    () =>
      getPrePublishValidationReport({
        groomName: draft.groomName,
        brideName: draft.brideName,
        weddingDate: draft.weddingDate,
        weddingTime: draft.weddingTime,
        venue: draft.venue,
        mapUrl: draft.mapUrl,
        templateSlug: draft.templateSlug,
        images: draft.images,
      }),
    [draft.brideName, draft.groomName, draft.images, draft.mapUrl, draft.templateSlug, draft.venue, draft.weddingDate, draft.weddingTime],
  );
  const completion = prePublishReport.readiness;

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({ builderPreview: "1", silentPreview: "1" });
    return `/templates/${draft.templateSlug || templates[0]?.slug || "featured-1"}/preview?${params.toString()}`;
  }, [draft.templateSlug, templates]);

  const previewPayload = useMemo<LiveInvitationPreviewPayload>(
    () => ({
      groomName: draft.groomName || "اسم العريس",
      brideName: draft.brideName || "اسم العروس",
      weddingDate: draft.weddingDate,
      weddingTime: draft.weddingTime,
      venue: draft.venue || "اسم القاعة",
      city: draft.city,
      mapUrl: draft.mapUrl,
      gallery: draft.images.map((image) => image.url).filter(Boolean),
      musicEnabled: draft.musicEnabled,
      musicUrl: draft.musicChoice === "default" ? "" : draft.musicUrl,
      disableMusic: true,
      texts: {
        ...draft.invitationTexts,
        groomNameEn: draft.groomNameEn,
        brideNameEn: draft.brideNameEn,
      },
      photographer: {
        enabled: draft.photographerEnabled,
        name: draft.photographerName,
        logoUrl: draft.photographerLogo.url,
        facebookUrl: draft.photographerFacebookUrl,
        instagramUrl: draft.photographerInstagramUrl,
        whatsappUrl: draft.photographerWhatsappUrl,
      },
    }),
    [draft],
  );

  const postPreviewUpdate = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ source: "badr-admin-preview", type: "preview:update", payload: previewPayload }, window.location.origin);
  }, [previewPayload]);

  useEffect(() => {
    const stored = window.localStorage.getItem(draftStorageKey);
    if (stored) {
      try {
        setDraft(normalizeDraft(JSON.parse(stored), templates));
        setAutosaveState("تم استرجاع آخر مسودة");
      } catch {
        setAutosaveState("تعذر استرجاع المسودة القديمة");
      }
    }
    hydratedRef.current = true;
  }, [templates]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    setAutosaveState("جاري الحفظ...");
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
      setAutosaveState("تم الحفظ تلقائياً");
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft]);

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

  useEffect(() => {
    return () => {
      if (cropDraft?.sourceUrl) URL.revokeObjectURL(cropDraft.sourceUrl);
    };
  }, [cropDraft?.sourceUrl]);

  function patch(update: Partial<DraftState>) {
    setDraft((current) => ({ ...current, ...update }));
    setMessage(null);
  }

  function updateText(key: keyof InvitationTexts, value: string) {
    setDraft((current) => ({ ...current, invitationTexts: { ...current.invitationTexts, [key]: value } }));
    setMessage(null);
  }

  function addStoryItem() {
    setDraft((current) => ({ ...current, invitationTexts: { ...current.invitationTexts, story: [...current.invitationTexts.story, createStoryItem()] } }));
    setMessage(null);
  }

  function updateStoryItem(index: number, patchValue: Partial<CoupleStoryItem>) {
    setDraft((current) => ({
      ...current,
      invitationTexts: {
        ...current.invitationTexts,
        story: current.invitationTexts.story.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patchValue } : item)),
      },
    }));
    setMessage(null);
  }

  function removeStoryItem(index: number) {
    setDraft((current) => ({ ...current, invitationTexts: { ...current.invitationTexts, story: current.invitationTexts.story.filter((_, itemIndex) => itemIndex !== index) } }));
    setMessage(null);
  }

  function validateStep(step: StepId) {
    if (step === "template" && !draft.templateSlug) return "اختار قالب الدعوة أولاً.";
    if (step === "couple" && (!draft.groomName.trim() || !draft.brideName.trim())) return "اكتب اسم العريس واسم العروس.";
    if (step === "event") {
      if (!draft.weddingDate || Number.isNaN(Date.parse(draft.weddingDate))) return "اختار تاريخ صحيح.";
      if (!draft.weddingTime.trim()) return "اكتب وقت الحفل.";
      if (!draft.venue.trim()) return "اكتب اسم القاعة أو مكان الحفل.";
      if (!isValidUrl(draft.mapUrl)) return "رابط الخريطة غير صحيح.";
    }
    if (step === "extras") {
      if (draft.musicEnabled && draft.musicChoice !== "default" && !draft.musicUrl.trim()) return "اختار مقطع موسيقى أو ارفع ملف أو اكتب رابط مباشر.";
      if (draft.musicEnabled && draft.musicChoice === "url" && !isPlayableAudioUrl(draft.musicUrl)) return "رابط الموسيقى يجب أن يكون ملف صوت مباشر.";
      if (draft.photographerEnabled && !draft.photographerName.trim()) return "اكتب اسم المصور أو أوقف قسم المصور.";
      if (!isValidUrl(draft.photographerInstagramUrl) || !isValidUrl(draft.photographerFacebookUrl) || !isValidUrl(draft.photographerWhatsappUrl)) return "تأكد من روابط المصور.";
    }
    if (step === "texts" && (!draft.invitationTexts.inviteMessage.trim() || !draft.invitationTexts.rsvpQuestion.trim())) return "اكتب رسالة الدعوة وسؤال RSVP.";
    return "";
  }

  function goToStep(step: StepId) {
    setCurrentStep(step);
    setMessage(null);
  }

  function nextStep() {
    const error = validateStep(currentStep);
    if (error) {
      setMessage({ kind: "error", text: error });
      return;
    }
    setCurrentStep(steps[Math.min(steps.length - 1, stepIndex + 1)].id);
  }

  function previousStep() {
    setCurrentStep(steps[Math.max(0, stepIndex - 1)].id);
  }

  function startImageCrop(index: number, file?: File | null) {
    if (!file) return;
    if (cropDraft?.sourceUrl) URL.revokeObjectURL(cropDraft.sourceUrl);
    setCropDraft({
      index,
      file,
      sourceUrl: URL.createObjectURL(file),
      zoom: 1,
      cropX: 0,
      cropY: 0,
      applying: false,
    });
  }

  async function uploadImageToSlot(index: number, file: File) {
    setBusy("image");
    setDraft((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) => (imageIndex === index ? { ...image, name: file.name, loading: true } : image)),
    }));
    try {
      const url = await uploadAdminPreviewImage(file, { slot: unifiedImageSlots[index]?.id || index + 1 });
      setDraft((current) => ({
        ...current,
        images: current.images.map((image, imageIndex) => (imageIndex === index ? { url, name: file.name, loading: false } : image)),
      }));
      setMessage({ kind: "success", text: "تم تحديث الصورة داخل المعاينة." });
    } catch (error) {
      setDraft((current) => ({
        ...current,
        images: current.images.map((image, imageIndex) => (imageIndex === index ? { ...image, loading: false } : image)),
      }));
      setMessage({ kind: "error", text: error instanceof Error && error.message !== "preview-image-upload-failed" ? error.message : "تعذر رفع الصورة. جرّب صورة أصغر أو صيغة أخرى." });
    } finally {
      setBusy("idle");
    }
  }

  async function applyCropDraft() {
    if (!cropDraft) return;
    setCropDraft((current) => (current ? { ...current, applying: true } : current));
    try {
      const file = await createCroppedImageFile(cropDraft);
      const sourceUrl = cropDraft.sourceUrl;
      const index = cropDraft.index;
      setCropDraft(null);
      URL.revokeObjectURL(sourceUrl);
      await uploadImageToSlot(index, file);
    } catch {
      setCropDraft((current) => (current ? { ...current, applying: false } : current));
      setMessage({ kind: "error", text: "تعذر قص الصورة داخل المتصفح." });
    }
  }

  function reorderImages(from: number, to: number) {
    if (from === to || to < 0 || to >= draft.images.length) return;
    setDraft((current) => {
      const images = [...current.images];
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      return { ...current, images };
    });
  }

  function useLibraryImage(index: number, url: string) {
    const selected = imageFiles.find((file) => file.url === url);
    setDraft((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) => (imageIndex === index ? { url, name: selected?.name || url.split("/").pop() || "media-library", loading: false } : image)),
    }));
    setMessage({ kind: "success", text: "تم استخدام الصورة من مكتبة الوسائط بدون رفع نسخة جديدة." });
  }

  function onDropImage(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    if (dragIndex !== null) {
      reorderImages(dragIndex, index);
      setDragIndex(null);
      return;
    }
    startImageCrop(index, event.dataTransfer.files?.[0]);
  }

  async function handleMusicFile(file?: File | null) {
    if (!file) return;
    setBusy("music");
    try {
      const musicUrl = await uploadAdminMusic(file);
      patch({ musicEnabled: true, musicChoice: "upload", musicUrl, musicFileName: file.name, musicLibraryTrackId: "" });
      setMessage({ kind: "success", text: "تم رفع الموسيقى ويمكنك تشغيل المعاينة الآن." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "ملف الموسيقى غير قابل للتشغيل." });
    } finally {
      setBusy("idle");
    }
  }

  async function handleLogoFile(file?: File | null) {
    if (!file) return;
    setBusy("logo");
    patch({ photographerEnabled: true, photographerLogo: { url: "", name: file.name, loading: true } });
    try {
      const url = await uploadAdminPreviewImage(file, { slot: "photographer-logo" });
      patch({ photographerLogo: { url, name: file.name, loading: false } });
    } catch (error) {
      patch({ photographerLogo: { url: "", name: file.name, loading: false } });
      setMessage({ kind: "error", text: error instanceof Error && error.message !== "preview-image-upload-failed" ? error.message : "تعذر رفع شعار المصور." });
    } finally {
      setBusy("idle");
    }
  }

  async function handleStoryImageFile(index: number, file?: File | null) {
    if (!file) return;
    setBusy("image");
    try {
      const url = await uploadAdminPreviewImage(file, { slot: `story-${index + 1}` });
      updateStoryItem(index, { imageUrl: url });
      setMessage({ kind: "success", text: "تم رفع صورة محطة القصة." });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error && error.message !== "preview-image-upload-failed" ? error.message : "تعذر رفع صورة القصة." });
    } finally {
      setBusy("idle");
    }
  }

  async function save(action: "draft" | "publish") {
    if (action === "publish" && !prePublishReport.canPublish) {
      setCurrentStep("publish");
      setMessage({ kind: "error", text: `لا يمكن نشر الدعوة قبل إكمال: ${prePublishReport.blockingItems.map((item) => item.label).join("، ")}.` });
      return;
    }
    const values = {
      templateSlug: draft.templateSlug,
      groomName: draft.groomName,
      brideName: draft.brideName,
      weddingDate: draft.weddingDate,
      venue: draft.venue,
      mapUrl: draft.mapUrl,
      images: draft.images,
      photographerEnabled: draft.photographerEnabled,
      photographerName: draft.photographerName,
      photographerLogo: draft.photographerLogo,
      photographerFacebookUrl: draft.photographerFacebookUrl,
      photographerInstagramUrl: draft.photographerInstagramUrl,
      musicEnabled: draft.musicEnabled,
      musicChoice: draft.musicChoice,
      musicUrl: draft.musicChoice === "default" ? "" : draft.musicUrl,
      musicLibraryTrackId: draft.musicLibraryTrackId,
      musicBusy: busy === "music",
      musicFileName: draft.musicFileName,
      invitationTexts: draft.invitationTexts,
    };
    const validationError = validateAdminInvitationTools(values, { requireReuploadText: "في صورة مختارة لكنها لم ترفع بنجاح. ارفعها مرة أخرى قبل النشر." });
    if (validationError) {
      setMessage({ kind: "error", text: validationError });
      return;
    }
    setBusy(action);
    const response = await fetch("/api/admin/invitation-builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        code: savedCode,
        templateSlug: draft.templateSlug,
        groomName: draft.groomName,
        brideName: draft.brideName,
        weddingDate: draft.weddingDate,
        weddingTime: draft.weddingTime,
        venue: draft.venue,
        city: draft.city,
        mapUrl: draft.mapUrl,
        gallery: draft.images.map((image) => image.url).filter(Boolean),
        musicEnabled: draft.musicEnabled,
        musicChoice: draft.musicChoice,
        musicUrl: draft.musicChoice === "default" ? "" : draft.musicUrl,
        musicLibraryTrackId: draft.musicLibraryTrackId,
        texts: {
          ...draft.invitationTexts,
          groomNameEn: draft.groomNameEn,
          brideNameEn: draft.brideNameEn,
        },
        photographer: {
          enabled: draft.photographerEnabled,
          name: draft.photographerName,
          logoUrl: draft.photographerLogo.url,
          facebookUrl: draft.photographerFacebookUrl,
          instagramUrl: draft.photographerInstagramUrl,
          whatsappUrl: draft.photographerWhatsappUrl,
        },
      }),
    });
    const data = (await response.json().catch(() => null)) as { error?: string; code?: string; publicUrl?: string; adminUrl?: string } | null;
    setBusy("idle");
    if (!response.ok || !data?.code) {
      setMessage({ kind: "error", text: data?.error || "تعذر حفظ الدعوة." });
      return;
    }
    setSavedCode(data.code);
    setLinks({ publicUrl: data.publicUrl || `${cleanSiteUrl}/${data.code}`, adminUrl: data.adminUrl || `${cleanSiteUrl}/${data.code}/ad_3399` });
    window.localStorage.removeItem(draftStorageKey);
    setMessage({ kind: "success", text: action === "draft" ? "تم حفظ الدعوة كمسودة ويمكنك استكمالها من رابط العميل." : "تم نشر الدعوة وإنشاء الروابط." });
    setCurrentStep("publish");
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage({ kind: "success", text: "تم نسخ الرابط." });
  }

  function resetLocalDraft() {
    window.localStorage.removeItem(draftStorageKey);
    setDraft(createInitialDraft(templates));
    setSavedCode("");
    setLinks(null);
    setCurrentStep("template");
    setMessage({ kind: "success", text: "تم بدء دعوة جديدة فارغة." });
  }

  function renderTemplateStep() {
    return (
      <div className="new-invite-template-grid">
        {templates.map((template) => (
          <button className={template.slug === draft.templateSlug ? "new-invite-template-card selected" : "new-invite-template-card"} type="button" key={template.slug} onClick={() => patch({ templateSlug: template.slug })}>
            <img src={template.previewImage} alt={template.arabicName} />
            <span>
              <strong>{template.arabicName}</strong>
              <small>{template.name} · {template.category}</small>
            </span>
          </button>
        ))}
      </div>
    );
  }

  function renderCoupleStep() {
    return (
      <div className="new-invite-field-grid">
        <label className="field"><span>اسم العريس</span><input value={draft.groomName} onChange={(event) => patch({ groomName: event.target.value })} autoFocus /></label>
        <label className="field"><span>اسم العروس</span><input value={draft.brideName} onChange={(event) => patch({ brideName: event.target.value })} /></label>
        <label className="field"><span>الاسم الإنجليزي للعريس (اختياري)</span><input dir="ltr" value={draft.groomNameEn} onChange={(event) => patch({ groomNameEn: event.target.value })} /></label>
        <label className="field"><span>الاسم الإنجليزي للعروس (اختياري)</span><input dir="ltr" value={draft.brideNameEn} onChange={(event) => patch({ brideNameEn: event.target.value })} /></label>
      </div>
    );
  }

  function renderEventStep() {
    return (
      <div className="new-invite-field-grid">
        <label className="field"><span>التاريخ</span><input type="date" value={draft.weddingDate} onChange={(event) => patch({ weddingDate: event.target.value })} /></label>
        <label className="field"><span>الوقت</span><input value={draft.weddingTime} onChange={(event) => patch({ weddingTime: event.target.value })} placeholder="07:00 مساءً" /></label>
        <label className="field"><span>القاعة</span><input value={draft.venue} onChange={(event) => patch({ venue: event.target.value })} /></label>
        <label className="field"><span>المدينة</span><input value={draft.city} onChange={(event) => patch({ city: event.target.value })} /></label>
        <label className="field full"><span>رابط الخريطة</span><input dir="ltr" value={draft.mapUrl} onChange={(event) => patch({ mapUrl: event.target.value })} placeholder="https://maps.google.com/..." /></label>
      </div>
    );
  }

  function renderImagesStep() {
    return (
      <>
        <div className="new-invite-image-grid">
          {draft.images.map((image, index) => {
            const slot = unifiedImageSlots[index] || { label: `صورة ${index + 1}`, role: "detail" };
            const slotHint = slot.role === "hero" ? "الغلاف الرئيسي" : slot.role === "secondary" ? "صورة داعمة" : "تفصيلة من المناسبة";
            return (
              <div
                className={image.url ? "new-invite-image-slot has-image" : "new-invite-image-slot"}
                draggable={Boolean(image.url)}
                key={`${slot.label}-${index}`}
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => onDropImage(event, index)}
              >
                <button className="image-drag-handle" type="button" title="إعادة ترتيب"><GripVertical size={16} /></button>
                {image.url ? <img src={image.url} alt={slot.label} /> : <ImagePlus size={26} />}
                <strong>{slot.label}</strong>
                <small>{slotHint}</small>
                <div className="new-invite-image-actions">
                  <button className="btn btn-soft" type="button" onClick={() => imageInputRefs.current[index]?.click()}>{image.url ? "استبدال" : "رفع"}</button>
                  <button className="btn btn-soft" type="button" disabled={index === 0} onClick={() => reorderImages(index, index - 1)}><ArrowRight size={15} /></button>
                  <button className="btn btn-soft" type="button" disabled={index === draft.images.length - 1} onClick={() => reorderImages(index, index + 1)}><ArrowLeft size={15} /></button>
                </div>
                {imageFiles.length ? (
                  <label className="new-invite-library-select">
                    <span>استخدام من المكتبة</span>
                    <select value="" onChange={(event) => { if (event.target.value) useLibraryImage(index, event.target.value); }}>
                      <option value="">اختار صورة محفوظة</option>
                      {imageFiles.map((file) => <option key={`${index}-${file.url}`} value={file.url}>{file.name || file.url.split("/").pop()}</option>)}
                    </select>
                  </label>
                ) : null}
                <input ref={(node) => { imageInputRefs.current[index] = node; }} type="file" accept={acceptedImageFormats} onChange={(event) => startImageCrop(index, event.target.files?.[0])} hidden />
              </div>
            );
          })}
        </div>
        <p className="new-invite-help"><UploadCloud size={16} /> يمكنك السحب والإفلات، القص قبل الرفع، الاستبدال، وإعادة الترتيب. أي صورة محفوظة تظهر فوراً في المعاينة.</p>
      </>
    );
  }

  function renderExtrasStep() {
    return (
      <div className="new-invite-two-columns">
        <section className="new-invite-option-panel">
          <label className="new-invite-toggle"><input type="checkbox" checked={draft.musicEnabled} onChange={(event) => patch({ musicEnabled: event.target.checked })} /><span><Music2 size={18} /> إضافة موسيقى للدعوة</span></label>
          {draft.musicEnabled ? (
            <div className="new-invite-option-body">
              <div className="order-music-choice-grid" role="radiogroup" aria-label="اختيار الموسيقى">
                <button className={draft.musicChoice === "default" ? "active" : ""} type="button" onClick={() => patch({ musicChoice: "default", musicUrl: "", musicLibraryTrackId: "" })}><Music2 size={16} /> الافتراضية</button>
                <button className={draft.musicChoice === "library" ? "active" : ""} type="button" onClick={() => patch({ musicChoice: "library" })}><Disc3 size={16} /> المكتبة</button>
                <button className={draft.musicChoice === "upload" ? "active" : ""} type="button" onClick={() => patch({ musicChoice: "upload", musicLibraryTrackId: "" })}><UploadCloud size={16} /> رفع</button>
                <button className={draft.musicChoice === "url" ? "active" : ""} type="button" onClick={() => patch({ musicChoice: "url", musicLibraryTrackId: "" })}><Link2 size={16} /> رابط</button>
              </div>
              {draft.musicChoice === "library" ? (
                <label className="field"><span>مكتبة الموسيقى</span><select value={draft.musicUrl} onChange={(event) => { const selected = musicFiles.find((file) => file.url === event.target.value); patch({ musicUrl: event.target.value, musicLibraryTrackId: selected?.id || "" }); }}><option value="">اختار مقطع</option>{musicFiles.map((file) => <option key={file.url} value={file.url}>{file.name || file.url.split("/").pop()}</option>)}</select></label>
              ) : null}
              {draft.musicChoice === "upload" ? (
                <label className="new-invite-upload-line"><UploadCloud size={17} /><span>{busy === "music" ? "جاري الرفع..." : draft.musicFileName || "رفع ملف موسيقى"}</span><input type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac,.flac" onChange={(event) => handleMusicFile(event.target.files?.[0])} /></label>
              ) : null}
              {draft.musicChoice === "url" ? <label className="field"><span>رابط ملف صوت مباشر</span><input dir="ltr" value={draft.musicUrl} onChange={(event) => patch({ musicUrl: event.target.value })} placeholder="https://example.com/song.mp3" /></label> : null}
              {draft.musicUrl ? <AudioPlayer src={draft.musicUrl} label="معاينة الموسيقى" /> : null}
            </div>
          ) : null}
        </section>

        <section className="new-invite-option-panel">
          <label className="new-invite-toggle"><input type="checkbox" checked={draft.photographerEnabled} onChange={(event) => patch({ photographerEnabled: event.target.checked })} /><span><Camera size={18} /> إضافة بيانات المصور</span></label>
          {draft.photographerEnabled ? (
            <div className="new-invite-option-body">
              <label className="field"><span>اسم المصور</span><input value={draft.photographerName} onChange={(event) => patch({ photographerName: event.target.value })} /></label>
              <label className="field"><span>إنستجرام</span><input dir="ltr" value={draft.photographerInstagramUrl} onChange={(event) => patch({ photographerInstagramUrl: event.target.value })} /></label>
              <label className="field"><span>فيسبوك</span><input dir="ltr" value={draft.photographerFacebookUrl} onChange={(event) => patch({ photographerFacebookUrl: event.target.value })} /></label>
              <label className="field"><span>واتساب</span><input dir="ltr" value={draft.photographerWhatsappUrl} onChange={(event) => patch({ photographerWhatsappUrl: event.target.value })} placeholder="https://wa.me/201..." /></label>
              <button className="btn btn-soft" type="button" onClick={() => logoInputRef.current?.click()}>{busy === "logo" ? <Loader2 size={16} /> : <UploadCloud size={16} />} {draft.photographerLogo.name || "رفع شعار اختياري"}</button>
              <input ref={logoInputRef} type="file" accept={acceptedImageFormats} onChange={(event) => handleLogoFile(event.target.files?.[0])} hidden />
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  function renderTextsStep() {
    return (
      <div className="new-invite-field-grid">
        <div className="full">
          <ContentPresetPicker
            presets={contentPresets}
            onApply={(textPatch) => patch({ invitationTexts: { ...draft.invitationTexts, ...textPatch } })}
          />
        </div>
        <label className="field full"><span>رسالة الترحيب</span><textarea rows={3} value={draft.invitationTexts.inviteMessageSecondary} onChange={(event) => updateText("inviteMessageSecondary", event.target.value)} /></label>
        <label className="field full"><span>رسالة الدعوة</span><textarea rows={5} value={draft.invitationTexts.inviteMessage} onChange={(event) => updateText("inviteMessage", event.target.value)} /></label>
        <label className="field"><span>رسالة RSVP</span><input value={draft.invitationTexts.rsvpQuestion} onChange={(event) => updateText("rsvpQuestion", event.target.value)} /></label>
        <label className="field"><span>رسالة الاعتذار</span><input value={draft.invitationTexts.rsvpDeclinedMessage} onChange={(event) => updateText("rsvpDeclinedMessage", event.target.value)} /></label>
        <section className="story-editor full">
          <div className="story-editor-head">
            <div>
              <span><Heart size={16} /> قسم اختياري</span>
              <strong>قصة العروسين</strong>
            </div>
            <button className="btn btn-soft" type="button" onClick={addStoryItem}><Plus size={16} /> إضافة محطة</button>
          </div>
          {draft.invitationTexts.story.length ? (
            <div className="story-editor-list">
              {draft.invitationTexts.story.map((item, index) => (
                <article className="story-editor-item" key={item.id || index}>
                  <div className="story-editor-item-head">
                    <strong>محطة {index + 1}</strong>
                    <button className="admin-icon-button" type="button" onClick={() => removeStoryItem(index)} title="حذف المحطة"><Trash2 size={16} /></button>
                  </div>
                  <label className="field"><span>العنوان</span><input value={item.title} onChange={(event) => updateStoryItem(index, { title: event.target.value })} /></label>
                  <label className="field"><span>التاريخ (اختياري)</span><input value={item.date || ""} onChange={(event) => updateStoryItem(index, { date: event.target.value })} placeholder="مثلاً: 2024 أو أول لقاء" /></label>
                  <label className="field full"><span>الوصف</span><textarea rows={3} value={item.description} onChange={(event) => updateStoryItem(index, { description: event.target.value })} /></label>
                  <label className="field full"><span>رابط صورة اختياري</span><input dir="ltr" value={item.imageUrl || ""} onChange={(event) => updateStoryItem(index, { imageUrl: event.target.value })} placeholder="/uploads/..." /></label>
                  <label className="new-invite-upload-line full"><UploadCloud size={17} /><span>رفع صورة للمحطة</span><input type="file" accept={acceptedImageFormats} onChange={(event) => handleStoryImageFile(index, event.target.files?.[0])} /></label>
                  {imageFiles.length ? (
                    <label className="field full">
                      <span>اختيار صورة من المكتبة</span>
                      <select value="" onChange={(event) => { if (event.target.value) updateStoryItem(index, { imageUrl: event.target.value }); }}>
                        <option value="">اختار صورة محفوظة</option>
                        {imageFiles.map((file) => <option key={`${index}-${file.url}`} value={file.url}>{file.name || file.url.split("/").pop()}</option>)}
                      </select>
                    </label>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="story-editor-empty">لن يظهر القسم داخل الدعوة إلا بعد إضافة محطة واحدة على الأقل.</p>
          )}
        </section>
      </div>
    );
  }

  function renderReviewStep() {
    const summary = [
      ["القالب", selectedTemplate?.arabicName || draft.templateSlug],
      ["العروسين", `${draft.groomName || "-"} و ${draft.brideName || "-"}`],
      ["الموعد", `${draft.weddingDate || "-"} · ${draft.weddingTime || "-"}`],
      ["المكان", [draft.venue, draft.city].filter(Boolean).join(" - ") || "-"],
      ["الصور", `${draft.images.filter((image) => image.url).length} صورة`],
      ["الموسيقى", draft.musicEnabled ? (draft.musicChoice === "default" ? "الموسيقى الافتراضية" : draft.musicChoice === "library" ? "من المكتبة" : draft.musicChoice === "upload" ? "ملف خاص" : "رابط مباشر") : "بدون موسيقى"],
      ["المصور", draft.photographerEnabled ? draft.photographerName || "مفعل" : "غير مفعل"],
    ];
    return (
      <div className="new-invite-review-list">
        {summary.map(([label, value], index) => (
          <button type="button" key={label} onClick={() => goToStep(steps[Math.min(index, steps.length - 1)].id)}>
            <span>{label}</span>
            <strong>{value}</strong>
            <Pencil size={16} />
          </button>
        ))}
      </div>
    );
  }

  function renderPublishStep() {
    return (
      <div className="new-invite-publish-panel">
        <div className="new-invite-complete-ring" style={{ "--complete": `${completion}%` } as CSSProperties}>
          <strong>{completion}%</strong>
          <span>اكتمال الدعوة</span>
        </div>
        <div className="new-invite-publish-actions">
          <button className="btn btn-soft" type="button" disabled={busy !== "idle"} onClick={() => save("draft")}>{busy === "draft" ? <Loader2 size={18} /> : <Save size={18} />} حفظ كمسودة</button>
          <button className="btn btn-gold btn-glow" type="button" disabled={busy !== "idle" || !prePublishReport.canPublish} onClick={() => save("publish")}>{busy === "publish" ? <Loader2 size={18} /> : <Send size={18} />} نشر الدعوة</button>
          <button className="btn btn-soft" type="button" disabled={busy !== "idle"} onClick={() => save("draft")}><UserRound size={18} /> إنشاء رابط العميل</button>
        </div>
        <div className="pre-publish-report" aria-label="تقرير جاهزية الدعوة قبل النشر">
          <div className="pre-publish-report-head">
            <div>
              <strong>تقرير ما قبل النشر</strong>
              <span>{prePublishReport.canPublish ? "العناصر الأساسية جاهزة للنشر." : "أكمل العناصر الأساسية المفقودة قبل النشر."}</span>
            </div>
            <b>{prePublishReport.completed}/{prePublishReport.total}</b>
          </div>
          <div className="pre-publish-items">
            {prePublishReport.items.map((item) => (
              <article className={`pre-publish-item ${item.status}`} key={item.key}>
                <span aria-hidden="true">{prePublishStatusSymbol(item.status)}</span>
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.message}</small>
                </div>
                <em>{prePublishStatusLabel(item.status)}</em>
              </article>
            ))}
          </div>
        </div>
        {links ? (
          <div className="builder-links new-invite-links">
            <div><span>رابط الدعوة</span><strong>{links.publicUrl}</strong><button className="btn btn-soft" type="button" onClick={() => copy(links.publicUrl)}><Copy size={16} /> نسخ</button><a className="btn btn-soft" href={links.publicUrl} target="_blank"><ExternalLink size={16} /> فتح</a></div>
            <div><span>لوحة العميل</span><strong>{links.adminUrl}</strong><button className="btn btn-soft" type="button" onClick={() => copy(links.adminUrl)}><Copy size={16} /> نسخ</button><a className="btn btn-soft" href={links.adminUrl} target="_blank"><ExternalLink size={16} /> فتح</a></div>
          </div>
        ) : null}
      </div>
    );
  }

  function renderCurrentStep() {
    if (currentStep === "template") return renderTemplateStep();
    if (currentStep === "couple") return renderCoupleStep();
    if (currentStep === "event") return renderEventStep();
    if (currentStep === "images") return renderImagesStep();
    if (currentStep === "extras") return renderExtrasStep();
    if (currentStep === "texts") return renderTextsStep();
    if (currentStep === "review") return renderReviewStep();
    return renderPublishStep();
  }

  return (
    <section className="new-invite-wizard" aria-label="دعوة جديدة">
      <div className="new-invite-header">
        <div>
          <span className="eyebrow">New Invitation</span>
          <h1>دعوة جديدة</h1>
          <p>خطوات قصيرة مع معاينة حية. كل تعديل محفوظ محلياً ويمكن استكماله لاحقاً.</p>
        </div>
        <div className="new-invite-header-actions">
          <span className="new-invite-autosave"><CheckCircle2 size={16} /> {autosaveState}</span>
          <button className="btn btn-soft" type="button" onClick={resetLocalDraft}><RotateCcw size={16} /> بدء جديد</button>
        </div>
      </div>

      <div className="new-invite-progress">
        <div className="new-invite-progress-bar"><span style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }} /></div>
        <div className="new-invite-step-tabs">
          {steps.map((step, index) => (
            <button className={step.id === currentStep ? "active" : index < stepIndex ? "done" : ""} type="button" key={step.id} onClick={() => goToStep(step.id)}>
              <b>{index + 1}</b>
              <span>{step.short}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="new-invite-layout">
        <main className="new-invite-editor-panel">
          <div className="new-invite-step-head">
            <span>{stepIndex + 1} / {steps.length}</span>
            <h2>{steps[stepIndex]?.title}</h2>
            <strong>{completion}% مكتمل</strong>
          </div>
          {message ? <div className={message.kind === "error" ? "notice danger" : "notice success"}>{message.text}</div> : null}
          {renderCurrentStep()}
          <div className="new-invite-nav-actions">
            <button className="btn btn-soft" type="button" onClick={previousStep} disabled={stepIndex === 0}><ArrowRight size={17} /> السابق</button>
            {currentStep === "publish" ? (
              <button className="btn btn-gold btn-glow" type="button" onClick={() => save("publish")} disabled={busy !== "idle" || !prePublishReport.canPublish}>{busy === "publish" ? <Loader2 size={17} /> : <Send size={17} />} نشر الآن</button>
            ) : (
              <button className="btn btn-gold btn-glow" type="button" onClick={nextStep}>التالي <ArrowLeft size={17} /></button>
            )}
          </div>
        </main>

        <aside className="new-invite-live-panel">
          <div className="new-invite-live-head">
            <span><Sparkles size={16} /> معاينة حية</span>
            <strong>{selectedTemplate?.arabicName || "القالب"}</strong>
          </div>
          <div className="new-invite-preview-frame">
            <iframe ref={iframeRef} src={previewUrl} title="معاينة الدعوة الجديدة" onLoad={postPreviewUpdate} />
          </div>
        </aside>
      </div>

      {cropDraft ? (
        <div className="new-invite-crop-modal" role="dialog" aria-modal="true">
          <div className="new-invite-crop-card">
            <div className="new-invite-crop-head">
              <strong>قص الصورة</strong>
              <button className="admin-icon-button" type="button" onClick={() => { URL.revokeObjectURL(cropDraft.sourceUrl); setCropDraft(null); }}><X size={17} /></button>
            </div>
            <div className="new-invite-crop-preview">
              <img src={cropDraft.sourceUrl} alt="قص الصورة" style={{ objectPosition: `${50 + cropDraft.cropX * 50}% ${50 + cropDraft.cropY * 50}%`, transform: `scale(${cropDraft.zoom})` }} />
            </div>
            <div className="visual-crop-controls">
              <label>تكبير<input type="range" min="1" max="2.4" step="0.05" value={cropDraft.zoom} onChange={(event) => setCropDraft((current) => (current ? { ...current, zoom: Number(event.target.value) } : current))} /></label>
              <label>يمين / شمال<input type="range" min="-1" max="1" step="0.02" value={cropDraft.cropX} onChange={(event) => setCropDraft((current) => (current ? { ...current, cropX: Number(event.target.value) } : current))} /></label>
              <label>فوق / تحت<input type="range" min="-1" max="1" step="0.02" value={cropDraft.cropY} onChange={(event) => setCropDraft((current) => (current ? { ...current, cropY: Number(event.target.value) } : current))} /></label>
            </div>
            <div className="new-invite-crop-actions">
              <button className="btn btn-soft" type="button" onClick={() => setCropDraft((current) => (current ? { ...current, cropX: 0, cropY: 0, zoom: 1 } : current))}><RotateCcw size={16} /> إعادة ضبط</button>
              <button className="btn btn-gold" type="button" onClick={applyCropDraft} disabled={cropDraft.applying}>{cropDraft.applying ? <Loader2 size={16} /> : <UploadCloud size={16} />} تطبيق الصورة</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
