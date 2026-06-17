"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Camera, CheckCircle2, Copy, Disc3, ExternalLink, FileVideo, GripVertical, Heart, ImagePlus, Link2, Loader2, MapPin, Music2, Pencil, Plus, RotateCcw, Save, Send, Sparkles, Trash2, UploadCloud, UserRound, X } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { ContentPresetPicker } from "@/components/ContentPresetPicker";
import {
  emptyAdminToolImages,
  emptyAdminToolUpload,
  getEffectiveAdminToolMusic,
  isPlayableAudioUrl,
  uploadAdminMusic,
  uploadAdminHeroVideo,
  uploadAdminPreviewImage,
  uploadAdminVideoAudio,
  validateAdminInvitationTools,
  type AdminToolImageSlot,
  type AdminToolMusicChoice,
  type AdminToolMusicFile,
  type AdminToolUploadSlot,
} from "@/components/AdminInvitationTools";
import type { LiveInvitationPreviewPayload } from "@/components/LiveInvitationPreview";
import { acceptedImageFormats } from "@/lib/image-formats";
import { defaultInvitationTexts, normalizeGalleryStories } from "@/lib/invitation-texts";
import { unifiedImageSlots } from "@/lib/invitation-template-bindings";
import { getPrePublishValidationReport, prePublishStatusLabel, prePublishStatusSymbol } from "@/lib/pre-publish-validation";
import type { TemplatePreviewEditableInfo } from "@/lib/template-preview-info";
import type { ContentPreset, CoupleStoryItem, GalleryStoryItem, InvitationTexts } from "@/lib/types";

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
  language: "ar" | "en";
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
  customSlug: string;
  images: AdminToolImageSlot[];
  heroVideoUrl: string;
  heroVideoName: string;
  musicEnabled: boolean;
  musicChoice: AdminToolMusicChoice;
  musicUrl: string;
  musicLibraryTrackId: string;
  musicFileName: string;
  photographerEnabled: boolean;
  photographerName: string;
  photographerDescription: string;
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
const adminOrderImageSlots = [
  { title: "الصورة الأولى", hint: "الغلاف" },
  { title: "الصورة الثانية", hint: "تفصيلة" },
  { title: "الصورة الثالثة", hint: "اختيارية" },
];
const adminStoryExamples = [
  {
    date: "مثال: 15 / 11 / 2024",
    title: "مثال: أول مرة شوفنا بعض",
    description: "مثال: كانت أول مقابلة بيننا، ومن هنا بدأت الحكاية.",
  },
  {
    date: "مثال: 02 / 02 / 2025",
    title: "مثال: الخطوبة",
    description: "مثال: اليوم الذي قررنا فيه أن نبدأ فصلاً جديداً من حياتنا.",
  },
  {
    date: "مثال: تاريخ يوم الزفاف",
    title: "مثال: يوم الزفاف",
    description: "مثال: اليوم الذي نحتفل فيه مع أهلنا وأصدقائنا ببداية حياتنا الجديدة.",
  },
];
const acceptedAudioFormats = "audio/mpeg,.mp3";
const acceptedVideoFormats = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";

const steps: Array<{ id: StepId; title: string; short: string }> = [
  { id: "template", title: "اختيار القالب", short: "القالب" },
  { id: "couple", title: "بيانات العروسين", short: "العروسين" },
  { id: "event", title: "تفاصيل الحفل", short: "الحفل" },
  { id: "images", title: "الصور", short: "الصور" },
  { id: "extras", title: "الموسيقى والمصور", short: "الإضافات" },
  { id: "texts", title: "النصوص والقصة", short: "القصة" },
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

function createInitialDraft(templates: WizardTemplate[], defaults?: TemplatePreviewDefaults): DraftState {
  return {
    language: defaults?.language || "ar",
    templateSlug: templates[0]?.slug || "",
    groomName: defaults?.groomName || "",
    brideName: defaults?.brideName || "",
    groomNameEn: "",
    brideNameEn: "",
    weddingDate: defaults?.weddingDate || todayDate(),
    weddingTime: defaults?.weddingTime || "07:00 مساءً",
    venue: defaults?.venue || "",
    city: defaults?.city || "",
    mapUrl: defaults?.mapUrl || "",
    customSlug: "",
    images: emptyAdminToolImages,
    heroVideoUrl: defaults?.heroVideoUrl || "",
    heroVideoName: "",
    musicEnabled: false,
    musicChoice: "default",
    musicUrl: "",
    musicLibraryTrackId: "",
    musicFileName: "",
    photographerEnabled: defaults?.photographerEnabled ?? false,
    photographerName: defaults?.photographerName || "",
    photographerDescription: defaults?.photographerDescription || "",
    photographerInstagramUrl: defaults?.photographerInstagramUrl || "",
    photographerFacebookUrl: defaults?.photographerFacebookUrl || "",
    photographerWhatsappUrl: defaults?.photographerWhatsappUrl || "",
    photographerLogo: defaults?.photographerLogoUrl ? { url: defaults.photographerLogoUrl, name: defaults.photographerLogoUrl.split("/").pop() || "", loading: false } : emptyAdminToolUpload,
    invitationTexts: { ...defaultInvitationTexts, ...(defaults?.invitationTexts || {}) },
  };
}

function normalizeDraft(value: unknown, templates: WizardTemplate[], defaults?: TemplatePreviewDefaults): DraftState {
  const fallback = createInitialDraft(templates, defaults);
  if (!value || typeof value !== "object") return fallback;
  const input = value as Partial<DraftState>;
  const templateSlug = templates.some((template) => template.slug === input.templateSlug) ? input.templateSlug || fallback.templateSlug : fallback.templateSlug;
  const language: DraftState["language"] = input.language === "en" ? "en" : "ar";
  return {
    ...fallback,
    ...input,
    language,
    templateSlug,
    images: Array.isArray(input.images) ? input.images.slice(0, unifiedImageSlots.length).map((image) => ({ url: image?.url || "", name: image?.name || "", loading: false })) : fallback.images,
    heroVideoUrl: typeof input.heroVideoUrl === "string" ? input.heroVideoUrl : "",
    heroVideoName: typeof input.heroVideoName === "string" ? input.heroVideoName : "",
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

function normalizeGalleryStorySlots(value: unknown) {
  return unifiedImageSlots.map((_, index) => normalizeGalleryStories(value)[index] || { title: "", description: "" });
}

export function AdminNewInvitationWizard({
  templates,
  musicFiles,
  imageFiles,
  contentPresets,
  siteUrl,
  templatePreviewInfo,
}: {
  templates: WizardTemplate[];
  musicFiles: AdminToolMusicFile[];
  imageFiles: ImageLibraryFile[];
  contentPresets: ContentPreset[];
  siteUrl: string;
  templatePreviewInfo?: TemplatePreviewEditableInfo;
}) {
  const defaults = useMemo<TemplatePreviewDefaults | undefined>(() => {
    if (!templatePreviewInfo) return undefined;
    return {
      language: templatePreviewInfo.language,
      weddingTime: templatePreviewInfo.weddingTime,
      groomName: templatePreviewInfo.groomName,
      brideName: templatePreviewInfo.brideName,
      weddingDate: templatePreviewInfo.weddingDate,
      venue: templatePreviewInfo.venue,
      city: templatePreviewInfo.city,
      mapUrl: templatePreviewInfo.mapUrl,
      heroVideoUrl: templatePreviewInfo.heroVideoUrl,
      photographerEnabled: templatePreviewInfo.photographer.enabled,
      photographerName: templatePreviewInfo.photographer.name,
      photographerDescription: templatePreviewInfo.photographer.description,
      photographerLogoUrl: templatePreviewInfo.photographer.logoUrl,
      photographerInstagramUrl: templatePreviewInfo.photographer.instagramUrl,
      photographerFacebookUrl: templatePreviewInfo.photographer.facebookUrl,
      photographerWhatsappUrl: templatePreviewInfo.photographer.whatsappUrl,
      invitationTexts: {
        openingText: templatePreviewInfo.texts.openingText,
        inviteMessage: templatePreviewInfo.texts.inviteMessage,
        inviteMessageSecondary: templatePreviewInfo.texts.inviteMessageSecondary,
        rsvpQuestion: templatePreviewInfo.texts.rsvpQuestion,
        rsvpDeclinedMessage: templatePreviewInfo.texts.rsvpDeclinedMessage,
        rsvpConfirmedSuccessMessage: templatePreviewInfo.texts.rsvpConfirmedSuccessMessage,
        rsvpDeclinedSuccessMessage: templatePreviewInfo.texts.rsvpDeclinedSuccessMessage,
        galleryStories: templatePreviewInfo.texts.galleryStories,
        story: templatePreviewInfo.texts.story,
      },
    };
  }, [templatePreviewInfo]);
  const [draft, setDraft] = useState<DraftState>(() => createInitialDraft(templates, defaults));
  const [currentStep, setCurrentStep] = useState<StepId>("template");
  const [savedCode, setSavedCode] = useState("");
  const [links, setLinks] = useState<{ publicUrl: string; adminUrl: string } | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<"idle" | "draft" | "publish" | "music" | "image" | "logo" | "heroVideo">("idle");
  const [autosaveState, setAutosaveState] = useState("جاهز");
  const [cropDraft, setCropDraft] = useState<CropDraft | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const imageInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const hydratedRef = useRef(false);
  const templatePreviewInfoRef = useRef(templatePreviewInfo);
  templatePreviewInfoRef.current = templatePreviewInfo;
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
    const params = new URLSearchParams({ builderPreview: "1", silentPreview: "1", language: draft.language });
    return `/templates/${draft.templateSlug || templates[0]?.slug || "featured-1"}/preview?${params.toString()}`;
  }, [draft.language, draft.templateSlug, templates]);
  const effectivePreviewMusic = useMemo(() => getEffectiveAdminToolMusic(draft), [draft]);

  const previewPayload = useMemo<LiveInvitationPreviewPayload>(
    () => ({
      groomName: draft.groomName || "اسم العريس",
      brideName: draft.brideName || "اسم العروس",
      language: draft.language,
      weddingDate: draft.weddingDate,
      weddingTime: draft.weddingTime,
      venue: draft.venue || "اسم القاعة",
      city: draft.city,
      mapUrl: draft.mapUrl,
      gallery: draft.images.map((image) => image.url).filter(Boolean),
      heroVideoUrl: draft.heroVideoUrl,
      musicEnabled: effectivePreviewMusic.musicEnabled,
      musicUrl: effectivePreviewMusic.musicUrl,
      disableMusic: true,
      texts: {
        ...draft.invitationTexts,
        groomNameEn: draft.groomNameEn,
        brideNameEn: draft.brideNameEn,
      },
      photographer: {
        enabled: draft.photographerEnabled,
        name: draft.photographerName,
        description: draft.photographerDescription,
        logoUrl: draft.photographerLogo.url,
        facebookUrl: draft.photographerFacebookUrl,
        instagramUrl: draft.photographerInstagramUrl,
        whatsappUrl: draft.photographerWhatsappUrl,
      },
    }),
    [draft, effectivePreviewMusic],
  );

  const postPreviewUpdate = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ source: "badr-admin-preview", type: "preview:update", payload: previewPayload }, window.location.origin);
  }, [previewPayload]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(draftStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const currentHash = JSON.stringify(templatePreviewInfoRef.current) || "";
        if (parsed._tpiHash === currentHash) {
          setDraft(normalizeDraft(parsed.draft, templates, defaults));
          setAutosaveState("تم استرجاع آخر مسودة");
        } else {
          setAutosaveState("تم تحميل الإعدادات الافتراضية الجديدة");
        }
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
      window.sessionStorage.setItem(draftStorageKey, JSON.stringify({
        draft,
        _tpiHash: JSON.stringify(templatePreviewInfoRef.current) || "",
      }));
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

  function updateGalleryStoryItem(index: number, patchValue: Partial<GalleryStoryItem>) {
    setDraft((current) => {
      const galleryStories = normalizeGalleryStorySlots(current.invitationTexts.galleryStories).map((item, itemIndex) => (itemIndex === index ? { ...item, ...patchValue } : item));
      return {
        ...current,
        invitationTexts: {
          ...current.invitationTexts,
          galleryStories: normalizeGalleryStories(galleryStories),
        },
      };
    });
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
      if (draft.musicEnabled && draft.musicChoice === "url" && draft.musicUrl.trim() && !isPlayableAudioUrl(draft.musicUrl)) return "رابط الموسيقى يجب أن يكون ملف صوت مباشر.";
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
      const galleryStories = normalizeGalleryStorySlots(current.invitationTexts.galleryStories);
      const [movedStory] = galleryStories.splice(from, 1);
      galleryStories.splice(to, 0, movedStory);
      return { ...current, images, invitationTexts: { ...current.invitationTexts, galleryStories: normalizeGalleryStories(galleryStories) } };
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

  async function handleMusicVideoFile(file?: File | null) {
    if (!file) return;
    setBusy("music");
    try {
      const extracted = await uploadAdminVideoAudio(file);
      patch({ musicEnabled: true, musicChoice: "video", musicUrl: extracted.musicUrl, musicFileName: extracted.fileName, musicLibraryTrackId: "" });
      setMessage({ kind: "success", text: `تم استخراج الصوت من الفيديو وحفظه كملف MP3: ${extracted.fileName}` });
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "تعذر استخراج الصوت من الفيديو." });
    } finally {
      setBusy("idle");
    }
  }

  async function handleHeroVideoFile(file?: File | null) {
    if (!file) return;
    setBusy("heroVideo");
    patch({ heroVideoName: file.name });
    try {
      const heroVideoUrl = await uploadAdminHeroVideo(file);
      patch({ heroVideoUrl, heroVideoName: file.name });
      setMessage({ kind: "success", text: "تم رفع فيديو خلفية الدعوة وربطه بالمعاينة." });
    } catch (error) {
      patch({ heroVideoUrl: "", heroVideoName: "" });
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "تعذر رفع فيديو خلفية الدعوة." });
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
    const effectiveMusic = getEffectiveAdminToolMusic(draft);
    const values = {
      templateSlug: draft.templateSlug,
      groomName: draft.groomName,
      brideName: draft.brideName,
      weddingDate: draft.weddingDate,
      venue: draft.venue,
      mapUrl: draft.mapUrl,
      images: draft.images,
      heroVideoUrl: draft.heroVideoUrl,
      heroVideoName: draft.heroVideoName,
      heroVideoBusy: busy === "heroVideo",
      photographerEnabled: draft.photographerEnabled,
      photographerName: draft.photographerName,
      photographerDescription: draft.photographerDescription,
      photographerLogo: draft.photographerLogo,
      photographerFacebookUrl: draft.photographerFacebookUrl,
      photographerInstagramUrl: draft.photographerInstagramUrl,
      photographerWhatsappUrl: draft.photographerWhatsappUrl,
      musicEnabled: effectiveMusic.musicEnabled,
      musicChoice: effectiveMusic.musicChoice,
      musicUrl: effectiveMusic.musicUrl,
      musicLibraryTrackId: effectiveMusic.musicLibraryTrackId,
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
        language: draft.language,
        templateSlug: draft.templateSlug,
        groomName: draft.groomName,
        brideName: draft.brideName,
        weddingDate: draft.weddingDate,
        weddingTime: draft.weddingTime,
        venue: draft.venue,
        city: draft.city,
        mapUrl: draft.mapUrl,
        customSlug: draft.customSlug,
        gallery: draft.images.map((image) => image.url).filter(Boolean),
        heroVideoUrl: draft.heroVideoUrl,
        musicEnabled: effectiveMusic.musicEnabled,
        musicChoice: effectiveMusic.musicChoice,
        musicUrl: effectiveMusic.musicUrl,
        musicLibraryTrackId: effectiveMusic.musicLibraryTrackId,
        texts: {
          ...draft.invitationTexts,
          groomNameEn: draft.groomNameEn,
          brideNameEn: draft.brideNameEn,
        },
        photographer: {
          enabled: draft.photographerEnabled,
          name: draft.photographerName,
          description: draft.photographerDescription,
          logoUrl: draft.photographerLogo.url,
          facebookUrl: draft.photographerFacebookUrl,
          instagramUrl: draft.photographerInstagramUrl,
          whatsappUrl: draft.photographerWhatsappUrl,
          _logoSource: draft.photographerLogo.url ? "custom" : "global",
        },
      }),
    });
    const data = (await response.json().catch(() => null)) as { error?: string; code?: string; customSlug?: string; publicUrl?: string; adminUrl?: string } | null;
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

  function clearImageSlot(index: number) {
    setDraft((current) => ({
      ...current,
      images: current.images.map((image, imageIndex) => (imageIndex === index ? { ...image, url: "", name: "", loading: false } : image)),
    }));
    setMessage(null);
  }

  function selectMusicChoice(choice: AdminToolMusicChoice | "none") {
    patch({
      musicEnabled: choice !== "none",
      musicChoice: choice === "none" ? "default" : choice,
      musicUrl: choice === "default" || choice === "none" ? "" : draft.musicUrl,
      musicLibraryTrackId: "",
      musicFileName: choice === "default" || choice === "none" ? "" : draft.musicFileName,
    });
  }

  function enableOrderStory() {
    const story = draft.invitationTexts.story.length ? draft.invitationTexts.story : [createStoryItem(), createStoryItem()];
    patch({ invitationTexts: { ...draft.invitationTexts, story } });
  }

  function cancelOrderStory() {
    patch({ invitationTexts: { ...draft.invitationTexts, story: [] } });
  }

  function renderOrderLikeImages() {
    return (
      <section className="order-compact-images" aria-labelledby="admin-order-images-title">
        <div className="order-compact-section-head">
          <h2 id="admin-order-images-title">رفع الصور</h2>
          <p>3 صور فقط، وكل صورة تظهر فوراً في المعاينة الحية.</p>
        </div>
        <div className="compact-image-grid admin-order-image-grid">
          {adminOrderImageSlots.map((slot, index) => {
            const image = draft.images[index] || { url: "", name: "", loading: false };
            return (
              <div className="compact-image-slot" key={slot.title}>
                <div className="compact-image-preview">
                  {image.url ? (
                    <img src={image.url} alt={slot.title} />
                  ) : (
                    <span>
                      <ImagePlus size={22} />
                      {slot.hint}
                    </span>
                  )}
                </div>
                <div className="compact-image-meta">
                  <strong>{slot.title}</strong>
                  <small>{image.name || slot.hint}</small>
                </div>
                <div className={image.loading ? "compact-upload-status uploading" : image.url ? "compact-upload-status saved" : "compact-upload-status"}>
                  <span>{image.loading ? "جاري حفظ الصورة" : image.url ? "تم حفظ الصورة للمعاينة" : "لم يتم اختيار صورة"}</span>
                  <strong>{image.loading ? "..." : image.url ? "100%" : "0%"}</strong>
                </div>
                <div className="compact-image-actions">
                  <label>
                    <UploadCloud size={15} />
                    {image.url ? "استبدال" : "رفع"}
                    <input type="file" accept={acceptedImageFormats} onChange={(event) => startImageCrop(index, event.target.files?.[0])} />
                  </label>
                  {image.url ? (
                    <button type="button" onClick={() => clearImageSlot(index)} aria-label={`حذف ${slot.title}`}>
                      <Trash2 size={15} />
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <p className="field-preview">ارفع الصور فقط، وسيتم ترتيبها تلقائياً داخل القالب مثل صفحة طلب الدعوة.</p>
      </section>
    );
  }

  function renderOrderLikeStory() {
    const storyEnabled = draft.invitationTexts.story.length > 0;
    return (
      <section className="order-story-box">
        <button
          className={`photographer-toggle-button order-story-toggle ${storyEnabled ? "active" : ""}`}
          type="button"
          aria-expanded={storyEnabled}
          onClick={storyEnabled ? cancelOrderStory : enableOrderStory}
        >
          <Heart size={18} />
          <span>إضافة قصة العروسين داخل الدعوة</span>
          <strong>{storyEnabled ? "إلغاء القصة" : "إضافة القصة"}</strong>
        </button>

        {storyEnabled ? (
          <div className="order-story-fields">
            <div className="order-story-head">
              <p>القصة اختيارية، لكن بعد تفعيلها املأ المراحل التي تريد ظهورها داخل الدعوة.</p>
            </div>
            <div className="order-story-list">
              {draft.invitationTexts.story.map((item, index) => {
                const example = adminStoryExamples[index] || adminStoryExamples[adminStoryExamples.length - 1];
                return (
                  <article className="order-story-item" key={item.id || index}>
                    <div className="order-story-item-head">
                      <strong>مرحلة {index + 1}</strong>
                      <button className="admin-icon-button order-story-remove-button" type="button" onClick={() => removeStoryItem(index)} title="حذف المرحلة" aria-label={`حذف مرحلة ${index + 1}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="field">
                      <label htmlFor={`adminStoryDate-${index}`}>التاريخ</label>
                      <input id={`adminStoryDate-${index}`} value={item.date || ""} onChange={(event) => updateStoryItem(index, { date: event.target.value })} placeholder={example.date} />
                    </div>
                    <div className="field">
                      <label htmlFor={`adminStoryTitle-${index}`}>العنوان</label>
                      <input id={`adminStoryTitle-${index}`} value={item.title} onChange={(event) => updateStoryItem(index, { title: event.target.value })} placeholder={example.title} />
                    </div>
                    <div className="field full">
                      <label htmlFor={`adminStoryDescription-${index}`}>الوصف</label>
                      <textarea id={`adminStoryDescription-${index}`} rows={3} value={item.description} onChange={(event) => updateStoryItem(index, { description: event.target.value })} placeholder={example.description} />
                    </div>
                  </article>
                );
              })}
            </div>
            <button className="btn btn-soft order-story-add-button" type="button" onClick={addStoryItem}>
              <Plus size={16} />
              إضافة مرحلة في حياتكم كمان
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  function renderOrderLikeMusic() {
    return (
      <section className="order-music-box">
        <button className={`photographer-toggle-button order-music-toggle ${draft.musicEnabled ? "active" : ""}`} type="button" aria-expanded="true" onClick={() => selectMusicChoice("default")}>
          <Music2 size={18} />
          <span>{draft.musicEnabled ? "الأغنية الأساسية مفعلة داخل الدعوة" : "الدعوة حالياً بدون موسيقى"}</span>
          <strong>تغيير الأغنية الأساسية</strong>
        </button>

        <div className="order-music-fields">
          <p className="order-music-note">الموسيقى الأساسية تعمل تلقائياً، ويمكنك استبدالها أو إلغاء الموسيقى من هنا.</p>
          <div className="order-music-choice-grid" role="radiogroup" aria-label="اختيار موسيقى الدعوة">
            <button className={draft.musicEnabled && draft.musicChoice === "default" ? "active" : ""} type="button" role="radio" aria-checked={draft.musicEnabled && draft.musicChoice === "default"} onClick={() => selectMusicChoice("default")}>
              <Music2 size={16} />
              الموسيقى الأساسية
            </button>
            <button className={!draft.musicEnabled ? "active" : ""} type="button" role="radio" aria-checked={!draft.musicEnabled} onClick={() => selectMusicChoice("none")}>
              <Music2 size={16} />
              بدون موسيقى
            </button>
            <button className={draft.musicEnabled && draft.musicChoice === "upload" ? "active" : ""} type="button" role="radio" aria-checked={draft.musicEnabled && draft.musicChoice === "upload"} onClick={() => selectMusicChoice("upload")}>
              <UploadCloud size={16} />
              رفع ملف MP3
            </button>
            <button className={draft.musicEnabled && draft.musicChoice === "video" ? "active" : ""} type="button" role="radio" aria-checked={draft.musicEnabled && draft.musicChoice === "video"} onClick={() => selectMusicChoice("video")}>
              <FileVideo size={16} />
              استخراج الصوت من فيديو
            </button>
            <button className={draft.musicEnabled && draft.musicChoice === "url" ? "active" : ""} type="button" role="radio" aria-checked={draft.musicEnabled && draft.musicChoice === "url"} onClick={() => selectMusicChoice("url")}>
              <Link2 size={16} />
              رابط أغنية
            </button>
          </div>

          {draft.musicEnabled ? (
            <>
              {draft.musicChoice === "upload" ? (
                <label className="order-music-upload">
                  <UploadCloud size={17} />
                  <span>
                    <strong>ارفع ملف MP3</strong>
                    <small>{draft.musicFileName || draft.musicUrl || "mp3"}</small>
                  </span>
                  <input type="file" accept={acceptedAudioFormats} onChange={(event) => handleMusicFile(event.target.files?.[0])} />
                </label>
              ) : null}

              {draft.musicChoice === "video" ? (
                <label className="order-music-upload">
                  {busy === "music" ? <Loader2 size={17} /> : <FileVideo size={17} />}
                  <span>
                    <strong>{busy === "music" ? "جاري استخراج الصوت..." : "ارفع فيديو لاستخراج الصوت"}</strong>
                    <small>{draft.musicFileName || draft.musicUrl || "MP4 / MOV / WEBM"}</small>
                    <small>يمكنك رفع فيديو وسيتم استخراج الموسيقى منه تلقائياً واستخدامها داخل الدعوة.</small>
                  </span>
                  <input type="file" accept={acceptedVideoFormats} disabled={busy === "music"} onChange={(event) => handleMusicVideoFile(event.target.files?.[0])} />
                </label>
              ) : null}

              {draft.musicChoice === "url" ? (
                <div className="field">
                  <label htmlFor="adminMusicUrl">رابط أغنية مباشر</label>
                  <input id="adminMusicUrl" dir="ltr" inputMode="url" placeholder="https://example.com/song.mp3" value={draft.musicUrl} onChange={(event) => patch({ musicUrl: event.target.value })} />
                  <small className="order-music-url-hint">ليس رابط فيديو بل موسيقى فقط</small>
                </div>
              ) : null}

              {draft.musicUrl ? <AudioPlayer src={draft.musicUrl} label="معاينة الموسيقى" /> : null}
            </>
          ) : null}
        </div>
      </section>
    );
  }

  function renderOrderLikeEditor() {
    return (
      <form className="form-panel details-form order-simple-form admin-order-like-form" onSubmit={(event) => { event.preventDefault(); void save("publish"); }} noValidate>
        <div className="order-template-row field full">
          <label htmlFor="adminTemplateSlug">
            <Sparkles size={18} />
            اختيار القالب
          </label>
          <select id="adminTemplateSlug" value={draft.templateSlug} onChange={(event) => patch({ templateSlug: event.target.value })}>
            {templates.map((template) => (
              <option key={template.slug} value={template.slug}>
                {template.arabicName} - {template.name}
              </option>
            ))}
          </select>
        </div>

        {message ? (
          <div className={`order-alert ${message.kind === "error" ? "danger" : "success"}`} role="alert">
            <strong>{message.kind === "error" ? "فيه بيانات محتاجة مراجعة" : "تمام"}</strong>
            <p>{message.text}</p>
          </div>
        ) : null}

        <div className="input-grid order-compact-grid">
          <div className="field">
            <label htmlFor="adminLanguage">
              <Sparkles size={16} />
              لغة الدعوة
            </label>
            <select id="adminLanguage" value={draft.language} onChange={(event) => patch({ language: event.target.value === "en" ? "en" : "ar" })}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="adminGroomName">
              <UserRound size={16} />
              اسم العريس
            </label>
            <input id="adminGroomName" placeholder="مثال: بدر" value={draft.groomName} onChange={(event) => patch({ groomName: event.target.value })} required />
          </div>

          <div className="field">
            <label htmlFor="adminBrideName">
              <UserRound size={16} />
              اسم العروس
            </label>
            <input id="adminBrideName" placeholder="مثال: سارة" value={draft.brideName} onChange={(event) => patch({ brideName: event.target.value })} required />
          </div>

          <div className="field">
            <label htmlFor="adminWeddingDate">
              <CalendarDays size={16} />
              تاريخ المناسبة
            </label>
            <input id="adminWeddingDate" type="date" value={draft.weddingDate} onChange={(event) => patch({ weddingDate: event.target.value })} required />
          </div>

          <div className="field">
            <label htmlFor="adminVenue">مكان الحفل</label>
            <input id="adminVenue" placeholder="مثال: قاعة رويال - البحيرة" value={draft.venue} onChange={(event) => patch({ venue: event.target.value })} required />
          </div>

          <div className="field">
            <label htmlFor="adminMapUrl">
              <Link2 size={16} />
              رابط موقع القاعه
            </label>
            <input id="adminMapUrl" dir="ltr" inputMode="url" placeholder="انسخ رابط Google Maps للقاعة أو الـ pin" value={draft.mapUrl} onChange={(event) => patch({ mapUrl: event.target.value })} />
            <small className="field-preview">أفضل نتيجة تكون من رابط Google Maps المباشر للقاعة حتى تظهر المعاينة والمسافة بدقة.</small>
          </div>

          <div className="field full">
            <label htmlFor="adminOpeningText">نص الافتتاح السينمائي</label>
            <textarea id="adminOpeningText" rows={2} placeholder="مثال: افتحوا الدعوة وشاركونا أجمل لحظة في عمرنا" value={draft.invitationTexts.openingText} onChange={(event) => updateText("openingText", event.target.value)} />
            <small className="field-preview">يظهر فوق صورة الغلاف قبل زر فتح الدعوة، واتركه فارغاً لاستخدام النص الافتراضي.</small>
          </div>
        </div>

        {renderOrderLikeImages()}

        <section className="order-photographer-box">
          <button className={`photographer-toggle-button ${draft.photographerEnabled ? "active" : ""}`} type="button" aria-expanded={draft.photographerEnabled} onClick={() => patch({ photographerEnabled: !draft.photographerEnabled })}>
            <Camera size={18} />
            <span>هل تريد إضافة بيانات المصور الفوتوغرافي الذي سيوثق يومك؟</span>
            <strong>{draft.photographerEnabled ? "إخفاء البيانات" : "إضافة بيانات المصور"}</strong>
          </button>

          {draft.photographerEnabled ? (
            <div className="photographer-fields">
              <div className="field">
                <label htmlFor="adminPhotographerName">اسم المصور الفوتوغرافي</label>
                <input id="adminPhotographerName" placeholder="اختياري" value={draft.photographerName} onChange={(event) => patch({ photographerName: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="adminPhotographerFacebook">رابط Facebook</label>
                <input id="adminPhotographerFacebook" dir="ltr" inputMode="url" placeholder="https://facebook.com/..." value={draft.photographerFacebookUrl} onChange={(event) => patch({ photographerFacebookUrl: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="adminPhotographerInstagram">رابط Instagram</label>
                <input id="adminPhotographerInstagram" dir="ltr" inputMode="url" placeholder="https://instagram.com/..." value={draft.photographerInstagramUrl} onChange={(event) => patch({ photographerInstagramUrl: event.target.value })} />
              </div>
            </div>
          ) : null}
        </section>

        {renderOrderLikeStory()}
        {renderOrderLikeMusic()}

        <div className="admin-order-live-summary">
          <div className="new-invite-complete-ring" style={{ "--complete": `${completion}%` } as CSSProperties}>
            <strong>{completion}%</strong>
            <span>اكتمال الدعوة</span>
          </div>
          <div className="pre-publish-report" aria-label="تقرير جاهزية الدعوة قبل النشر">
            <div className="pre-publish-report-head">
              <div>
                <strong>تقرير ما قبل النشر</strong>
                <span>{prePublishReport.canPublish ? "العناصر الأساسية جاهزة للنشر." : "أكمل العناصر الأساسية المفقودة قبل النشر."}</span>
              </div>
              <b>{prePublishReport.completed}/{prePublishReport.total}</b>
            </div>
            <div className="pre-publish-items compact">
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
        </div>

        {links ? (
          <div className="builder-links new-invite-links">
            <div><span>رابط الدعوة</span><strong>{links.publicUrl}</strong><button className="btn btn-soft" type="button" onClick={() => copy(links.publicUrl)}><Copy size={16} /> نسخ</button><a className="btn btn-soft" href={links.publicUrl} target="_blank"><ExternalLink size={16} /> فتح</a></div>
            <div><span>لوحة العميل</span><strong>{links.adminUrl}</strong><button className="btn btn-soft" type="button" onClick={() => copy(links.adminUrl)}><Copy size={16} /> نسخ</button><a className="btn btn-soft" href={links.adminUrl} target="_blank"><ExternalLink size={16} /> فتح</a></div>
          </div>
        ) : null}

        <div className="order-final-actions admin-order-final-actions">
          <button className="btn btn-soft" type="button" disabled={busy !== "idle"} onClick={() => save("draft")}>
            {busy === "draft" ? <Loader2 size={18} /> : <Save size={18} />}
            حفظ كمسودة
          </button>
          <button className="btn btn-gold btn-glow order-submit" type="submit" disabled={busy !== "idle" || !prePublishReport.canPublish}>
            {busy === "publish" ? <Loader2 size={18} /> : <Send size={18} />}
            نشر الدعوة
          </button>
        </div>
      </form>
    );
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
        <label className="field">
          <span>لغة الدعوة</span>
          <select value={draft.language} onChange={(event) => patch({ language: event.target.value === "en" ? "en" : "ar" })}>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </label>
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
        <label className="field full">
          <span>رابط الدعوة المخصص (اختياري)</span>
          <input dir="ltr" value={draft.customSlug} onChange={(event) => patch({ customSlug: event.target.value })} placeholder="ahmed-sara" />
          <small>اتركه فارغاً ليتم إنشاء الرابط تلقائياً. مثال: /ahmed-sara</small>
        </label>
        <label className="field full">
          <span>رابط الخريطة</span>
          <input dir="ltr" value={draft.mapUrl} onChange={(event) => patch({ mapUrl: event.target.value })} placeholder="https://maps.google.com/..." />
          <small>يفضل استخدام رابط Google Maps للـ pin حتى تظهر معاينة الموقع والمسافة التقريبية للضيف.</small>
        </label>
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
            const galleryStory = normalizeGalleryStorySlots(draft.invitationTexts.galleryStories)[index] || {};
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
                <div className="new-invite-image-story-fields">
                  <label>
                    <span>عنوان الصورة</span>
                    <input value={galleryStory.title || ""} onChange={(event) => updateGalleryStoryItem(index, { title: event.target.value })} placeholder="مثال: أول نظرة" />
                  </label>
                  <label>
                    <span>وصف قصير</span>
                    <textarea rows={2} value={galleryStory.description || ""} onChange={(event) => updateGalleryStoryItem(index, { description: event.target.value })} placeholder="جملة قصيرة تجعل الصورة جزءاً من الحكاية" />
                  </label>
                </div>
                <input ref={(node) => { imageInputRefs.current[index] = node; }} type="file" accept={acceptedImageFormats} onChange={(event) => startImageCrop(index, event.target.files?.[0])} hidden />
              </div>
            );
          })}
        </div>
        <div className="new-invite-field-grid">
          <label className="new-invite-upload-line full">
            <FileVideo size={17} />
            <span>{busy === "heroVideo" ? "جاري رفع فيديو الخلفية..." : draft.heroVideoName || "رفع فيديو خلفية قصير اختياري"}</span>
            <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v" onChange={(event) => handleHeroVideoFile(event.target.files?.[0])} />
            <small>إذا تم رفع فيديو سيظهر بدلاً من صورة الغلاف الرئيسية، وتظل الصورة الأولى نسخة احتياطية للتحميل الضعيف.</small>
          </label>
          <label className="field full">
            <span>رابط فيديو الخلفية</span>
            <input dir="ltr" value={draft.heroVideoUrl} onChange={(event) => patch({ heroVideoUrl: event.target.value, heroVideoName: event.target.value ? draft.heroVideoName || "رابط فيديو" : "" })} placeholder="/uploads/client-invitations/hero.mp4" />
          </label>
        </div>
        <p className="new-invite-help"><UploadCloud size={16} /> يمكنك السحب والإفلات، القص قبل الرفع، الاستبدال، وإعادة الترتيب. عناوين الصور اختيارية، وإذا تركت فارغة يظل المعرض بالشكل الحالي.</p>
      </>
    );
  }

  function renderExtrasStep() {
    return (
      <div className="new-invite-two-columns">
        <section className="new-invite-option-panel">
          <label className="new-invite-toggle"><input type="checkbox" checked={draft.musicEnabled} onChange={(event) => patch({ musicEnabled: event.target.checked })} /><span><Music2 size={18} /> إضافة موسيقى للدعوة</span></label>
          <div className="new-invite-option-body">
            <div className="order-music-choice-grid" role="radiogroup" aria-label="اختيار الموسيقى">
              <button className={!draft.musicEnabled ? "active" : ""} type="button" role="radio" aria-checked={!draft.musicEnabled} onClick={() => patch({ musicEnabled: false, musicChoice: "default", musicUrl: "", musicLibraryTrackId: "", musicFileName: "" })}><Music2 size={16} /> بدون موسيقى</button>
              <button className={draft.musicEnabled && draft.musicChoice === "default" ? "active" : ""} type="button" role="radio" aria-checked={draft.musicEnabled && draft.musicChoice === "default"} onClick={() => patch({ musicEnabled: true, musicChoice: "default", musicUrl: "", musicLibraryTrackId: "", musicFileName: "" })}><Music2 size={16} /> الافتراضية</button>
              <button className={draft.musicEnabled && draft.musicChoice === "library" ? "active" : ""} type="button" role="radio" aria-checked={draft.musicEnabled && draft.musicChoice === "library"} onClick={() => patch({ musicEnabled: true, musicChoice: "library" })}><Disc3 size={16} /> المكتبة</button>
              <button className={draft.musicEnabled && draft.musicChoice === "upload" ? "active" : ""} type="button" role="radio" aria-checked={draft.musicEnabled && draft.musicChoice === "upload"} onClick={() => patch({ musicEnabled: true, musicChoice: "upload", musicLibraryTrackId: "" })}><UploadCloud size={16} /> MP3</button>
              <button className={draft.musicEnabled && draft.musicChoice === "video" ? "active" : ""} type="button" role="radio" aria-checked={draft.musicEnabled && draft.musicChoice === "video"} onClick={() => patch({ musicEnabled: true, musicChoice: "video", musicLibraryTrackId: "" })}><FileVideo size={16} /> من فيديو</button>
              <button className={draft.musicEnabled && draft.musicChoice === "url" ? "active" : ""} type="button" role="radio" aria-checked={draft.musicEnabled && draft.musicChoice === "url"} onClick={() => patch({ musicEnabled: true, musicChoice: "url", musicLibraryTrackId: "" })}><Link2 size={16} /> رابط</button>
            </div>
            {draft.musicEnabled ? (
              <>
              {draft.musicChoice === "library" ? (
                <label className="field"><span>مكتبة الموسيقى</span><select value={draft.musicUrl} onChange={(event) => { const selected = musicFiles.find((file) => file.url === event.target.value); patch({ musicUrl: event.target.value, musicLibraryTrackId: selected?.id || "" }); }}><option value="">اختار مقطع</option>{musicFiles.map((file) => <option key={file.url} value={file.url}>{file.name || file.url.split("/").pop()}</option>)}</select></label>
              ) : null}
              {draft.musicChoice === "upload" ? (
                <label className="new-invite-upload-line"><UploadCloud size={17} /><span>{busy === "music" ? "جاري الرفع..." : draft.musicFileName || "رفع ملف MP3"}</span><input type="file" accept="audio/mpeg,.mp3" onChange={(event) => handleMusicFile(event.target.files?.[0])} /></label>
              ) : null}
              {draft.musicChoice === "video" ? (
                <label className="new-invite-upload-line"><FileVideo size={17} /><span>{busy === "music" ? "جاري استخراج الصوت..." : draft.musicFileName || "رفع فيديو لاستخراج الصوت"}</span><input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={(event) => handleMusicVideoFile(event.target.files?.[0])} /><small>يمكنك رفع فيديو وسيتم استخراج الموسيقى منه تلقائياً واستخدامها داخل الدعوة.</small></label>
              ) : null}
              {draft.musicChoice === "url" ? <label className="field"><span>رابط ملف صوت مباشر</span><input dir="ltr" value={draft.musicUrl} onChange={(event) => patch({ musicUrl: event.target.value })} placeholder="https://example.com/song.mp3" /></label> : null}
              {draft.musicUrl ? <AudioPlayer src={draft.musicUrl} label="معاينة الموسيقى" /> : null}
              </>
            ) : null}
          </div>
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
        <label className="field full"><span>نص الافتتاح السينمائي</span><textarea rows={2} value={draft.invitationTexts.openingText} onChange={(event) => updateText("openingText", event.target.value)} /></label>
        <label className="field full"><span>رسالة الترحيب</span><textarea rows={3} value={draft.invitationTexts.inviteMessageSecondary} onChange={(event) => updateText("inviteMessageSecondary", event.target.value)} /></label>
        <label className="field full"><span>رسالة الدعوة</span><textarea rows={5} value={draft.invitationTexts.inviteMessage} onChange={(event) => updateText("inviteMessage", event.target.value)} /></label>
        <label className="field"><span>رسالة RSVP</span><input value={draft.invitationTexts.rsvpQuestion} onChange={(event) => updateText("rsvpQuestion", event.target.value)} /></label>
        <label className="field"><span>رسالة الاعتذار</span><input value={draft.invitationTexts.rsvpDeclinedMessage} onChange={(event) => updateText("rsvpDeclinedMessage", event.target.value)} /></label>
        <label className="field"><span>شكر تأكيد الحضور</span><textarea rows={2} value={draft.invitationTexts.rsvpConfirmedSuccessMessage} onChange={(event) => updateText("rsvpConfirmedSuccessMessage", event.target.value)} /></label>
        <label className="field"><span>شكر الاعتذار</span><textarea rows={2} value={draft.invitationTexts.rsvpDeclinedSuccessMessage} onChange={(event) => updateText("rsvpDeclinedSuccessMessage", event.target.value)} /></label>
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
      ["الرابط المخصص", draft.customSlug ? `/${draft.customSlug}` : "تلقائي"],
      ["الصور", `${draft.images.filter((image) => image.url).length} صورة`],
      ["فيديو الخلفية", draft.heroVideoUrl ? "مرفوع" : "غير مفعّل"],
      ["Story Gallery", normalizeGalleryStories(draft.invitationTexts.galleryStories).some((item) => item.title || item.description) ? "مفعلة" : "غير مفعلة"],
      ["الموسيقى", draft.musicEnabled ? (draft.musicChoice === "default" ? "الموسيقى الافتراضية" : draft.musicChoice === "library" ? "من المكتبة" : draft.musicChoice === "upload" ? "ملف MP3 خاص" : draft.musicChoice === "video" ? "مستخرجة من فيديو" : "رابط مباشر") : "بدون موسيقى"],
      ["قصة العروسين", draft.invitationTexts.story.length ? `${draft.invitationTexts.story.length} مرحلة` : "غير مفعلة"],
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
          <p>نفس طريقة طلب الدعوة في الموقع، مع معاينة حية تبث كل تغيير أثناء الإنشاء.</p>
        </div>
        <div className="new-invite-header-actions">
          <span className="new-invite-autosave"><CheckCircle2 size={16} /> {autosaveState}</span>
          <button className="btn btn-soft" type="button" onClick={resetLocalDraft}><RotateCcw size={16} /> بدء جديد</button>
        </div>
      </div>

      <div className="new-invite-layout admin-order-like-layout">
        <main className="new-invite-editor-panel admin-order-like-editor">
          {renderOrderLikeEditor()}
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
