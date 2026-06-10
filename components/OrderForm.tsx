"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Camera, Check, Eye, FileVideo, Gift, Heart, ImagePlus, LayoutTemplate, Link2, Loader2, Music2, Plus, Trash2, UploadCloud, UserRound } from "lucide-react";
import { normalizeCoupleStory, normalizeGalleryStories, normalizeInvitationGift } from "@/lib/invitation-texts";
import type { CoupleStoryItem, GalleryStoryItem, InvitationGift, TemplateDefinition } from "@/lib/types";
import { acceptedImageFormats } from "@/lib/image-formats";

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
  photographerEnabled: boolean;
  photographerName: string;
  photographerFacebookUrl: string;
  photographerInstagramUrl: string;
  openingText: string;
  galleryStories: GalleryStoryItem[];
  storyEnabled: boolean;
  story: CoupleStoryItem[];
  giftEnabled: boolean;
  gift: InvitationGift;
  musicEnabled: boolean;
  musicChoice: MusicChoice;
  musicUrl: string;
};

type MusicChoice = "default" | "upload" | "video" | "url";
type OrderTemplateOption = Pick<TemplateDefinition, "slug" | "name" | "arabicName" | "previewImage">;
type FieldErrors = Partial<Record<keyof FormState, string>>;
type OrderFormValues = Pick<
  FormState,
  | "groomName"
  | "brideName"
  | "phone"
  | "weddingDate"
  | "mapUrl"
  | "venue"
  | "notes"
  | "photographerName"
  | "photographerFacebookUrl"
  | "photographerInstagramUrl"
  | "openingText"
  | "musicUrl"
>;
type OrderDraft = Partial<FormState> & { imageUrls?: string[] };
type ImageUploadPhase = "idle" | "selected" | "compressing" | "uploading" | "saved" | "error";
type ImageUploadState = {
  phase: ImageUploadPhase;
  progress: number;
  message: string;
  fileName: string;
  url: string;
  error: string;
};
export type OrderInitialDraft = Pick<
  FormState,
  | "groomName"
  | "brideName"
  | "phone"
  | "weddingDate"
  | "mapUrl"
  | "venue"
  | "notes"
  | "photographerName"
  | "photographerFacebookUrl"
  | "photographerInstagramUrl"
  | "openingText"
  | "musicUrl"
> & {
  photographerEnabled: boolean;
  storyEnabled: boolean;
  galleryStories: GalleryStoryItem[];
  story: CoupleStoryItem[];
  giftEnabled: boolean;
  gift: InvitationGift;
  musicEnabled: boolean;
  musicChoice: MusicChoice;
  imageUrls: string[];
};

const orderDraftStorageKey = "badrdaawa-order-draft";

const orderImageSlots = [
  { title: "الصورة الأولى", hint: "الغلاف" },
  { title: "الصورة الثانية", hint: "تفصيلة" },
  { title: "الصورة الثالثة", hint: "اختيارية" },
];

const acceptedAudioFormats = "audio/mpeg,.mp3";
const acceptedVideoFormats = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm";
const maxClientOriginalImageBytes = 32 * 1024 * 1024;
const maxDirectServerImageBytes = 32 * 1024 * 1024;
const uploadRetryCount = 2;
const nonRetryableUploadStatuses = new Set([400, 413, 422, 429]);

function createIdleUploadState(url = ""): ImageUploadState {
  return {
    phase: url ? "saved" : "idle",
    progress: url ? 100 : 0,
    message: url ? "تم حفظ الصورة للمعاينة" : "لم يتم اختيار صورة",
    fileName: "",
    url,
    error: "",
  };
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatUploadSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createUploadError(message: string, status?: number) {
  const error = new Error(message);
  if (status) Object.assign(error, { status });
  return error;
}

function getUploadErrorStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error && typeof (error as { status?: unknown }).status === "number" ? (error as { status: number }).status : 0;
}

function getUploadErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message && !message.startsWith("upload-failed-") && message !== "network-upload-failed" && message !== "upload-timeout" && message !== "upload-aborted") return message;
  if (message === "upload-timeout") return "استغرق رفع الصورة وقتًا طويلًا. جرّب اتصال أقوى أو صورة أصغر.";
  if (message === "network-upload-failed") return "انقطع الاتصال أثناء رفع الصورة. جرّب مرة أخرى.";
  return "تعذر رفع الصورة. جرّب صورة أقل حجماً أو اتصال إنترنت أكثر استقراراً.";
}

function loadImageElement(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image-preview-failed"));
    image.src = url;
  });
}

async function compressImageForUpload(file: File) {
  const sourceUrl = URL.createObjectURL(file);
  try {
    console.log(`[Order Upload] Compress start name=${file.name || "unnamed"} type=${file.type || "unknown"} size=${file.size}.`);
    let width = 0;
    let height = 0;
    let drawable: CanvasImageSource;

    try {
      if (!("createImageBitmap" in window)) throw new Error("createImageBitmap-unavailable");
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      width = bitmap.width;
      height = bitmap.height;
      drawable = bitmap;
    } catch {
      const image = await loadImageElement(sourceUrl);
      width = image.naturalWidth;
      height = image.naturalHeight;
      drawable = image;
    }

    const maxSide = 1800;
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("canvas-unavailable");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(drawable, 0, 0, targetWidth, targetHeight);
    if ("close" in drawable && typeof drawable.close === "function") drawable.close();

    const webpBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.82);
    });
    const blob = webpBlob?.size
      ? webpBlob
      : await new Promise<Blob | null>((resolve) => {
          canvas.toBlob(resolve, "image/jpeg", 0.84);
        });
    if (!blob?.size) throw new Error("compression-empty");
    const extension = blob.type === "image/webp" ? "webp" : "jpg";

    const output = new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "wedding-photo"}.${extension}`, {
      type: blob.type || "image/jpeg",
      lastModified: Date.now(),
    });

    return {
      file: output,
      originalBytes: file.size,
      optimizedBytes: output.size,
      width: targetWidth,
      height: targetHeight,
    };
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function cleanOrderDraftImageUrls(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .filter((item) => item.startsWith("/uploads/") || item.startsWith("http://") || item.startsWith("https://"))
    .slice(0, 3);
}

function cleanOrderStory(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
    .map((item) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id.trim().slice(0, 80) : `story-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      date: typeof item.date === "string" ? item.date.trim().slice(0, 80) : "",
      title: typeof item.title === "string" ? item.title.trim().slice(0, 120) : "",
      description: typeof item.description === "string" ? item.description.trim().slice(0, 700) : "",
    }));
}

function filledOrderStory(value: unknown) {
  return normalizeCoupleStory(cleanOrderStory(value));
}

function cleanOrderGalleryStories(value: unknown) {
  const source = Array.isArray(value) ? value : [];
  return orderImageSlots.map((_, index) => {
    const item = source[index] && typeof source[index] === "object" ? (source[index] as Record<string, unknown>) : {};
    return {
      title: typeof item.title === "string" ? item.title.trim().slice(0, 120) : "",
      description: typeof item.description === "string" ? item.description.trim().slice(0, 280) : "",
    };
  });
}

function filledOrderGalleryStories(value: unknown) {
  return normalizeGalleryStories(cleanOrderGalleryStories(value));
}

function cleanOrderGift(value: unknown): InvitationGift {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    vodafoneCash: typeof raw.vodafoneCash === "string" ? raw.vodafoneCash.trim().slice(0, 80) : "",
    instapay: typeof raw.instapay === "string" ? raw.instapay.trim().slice(0, 120) : "",
    bankAccount: typeof raw.bankAccount === "string" ? raw.bankAccount.trim().slice(0, 180) : "",
    customText: typeof raw.customText === "string" ? raw.customText.trim().slice(0, 500) : "",
  };
}

function filledOrderGift(value: unknown) {
  return normalizeInvitationGift(cleanOrderGift(value));
}

function parseDraftJson(value: string | null, fallback: unknown) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function createOrderStoryItem(): CoupleStoryItem {
  return { id: `story-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, date: "", title: "", description: "" };
}

function isValidOptionalUrl(value: string) {
  const clean = value.trim();
  return !clean || /^https?:\/\/\S+\.\S+/.test(clean);
}

function isPlayableAudioUrl(value: string) {
  const clean = value.trim();
  if (!clean) return true;
  if (clean.startsWith("/")) return /^\/uploads\/music\/[^?#]+\.(mp3|wav|ogg|webm|m4a|aac|flac)(?:[?#].*)?$/i.test(clean);
  try {
    const url = new URL(clean);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    return /\.(mp3|wav|ogg|webm|m4a|aac|flac)(?:[?#].*)?$/i.test(url.pathname + url.search);
  } catch {
    return false;
  }
}

function isOrderMusicChoice(value: unknown): value is MusicChoice {
  return value === "default" || value === "upload" || value === "video" || value === "url";
}

async function extractOrderVideoAudio(file: File) {
  const formData = new FormData();
  formData.append("videoFile", file);
  const response = await fetch("/api/orders/extract-video-audio", { method: "POST", body: formData });
  const data = (await response.json().catch(() => null)) as { musicUrl?: string; fileName?: string; error?: string } | null;
  if (!response.ok || !data?.musicUrl) throw new Error(data?.error || "تعذر استخراج الصوت من الفيديو.");
  return { musicUrl: data.musicUrl, fileName: data.fileName || `${file.name.replace(/\.[^.]+$/, "") || "video"}-audio.mp3` };
}

function CompactOrderImageInput({
  index,
  defaultImage,
  onClearDefault,
  upload,
  onFileSelected,
}: {
  index: number;
  defaultImage?: string;
  onClearDefault: () => void;
  upload: ImageUploadState;
  onFileSelected: (index: number, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlRef = useRef("");
  const [previewUrl, setPreviewUrl] = useState(defaultImage || "");
  const [fileName, setFileName] = useState("");
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    if (!objectUrlRef.current) setPreviewUrl(defaultImage || "");
  }, [defaultImage]);

  useEffect(() => {
    if (!upload.url) return;
    revokeObjectUrl();
    setPreviewUrl(upload.url);
    setFileName(upload.fileName);
    setPreviewFailed(false);
  }, [upload.fileName, upload.url]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function revokeObjectUrl() {
    if (!objectUrlRef.current) return;
    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = "";
  }

  function handleFile(file?: File | null) {
    revokeObjectUrl();
    setPreviewFailed(false);
    if (!file) {
      setPreviewUrl(defaultImage || "");
      setFileName("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
    setFileName(file.name);
    onFileSelected(index, file);
  }

  function clearImage() {
    revokeObjectUrl();
    if (inputRef.current) inputRef.current.value = "";
    setPreviewUrl("");
    setFileName("");
    setPreviewFailed(false);
    onClearDefault();
  }

  return (
    <div className={`compact-image-slot ${previewUrl ? "has-image" : ""}`}>
      <div className="compact-image-preview">
        {previewUrl && !previewFailed ? (
          <img src={previewUrl} alt={`معاينة الصورة ${index + 1}`} decoding="async" onError={() => setPreviewFailed(true)} />
        ) : (
          <span>
            <ImagePlus size={18} />
            {fileName || "صورة"}
          </span>
        )}
      </div>
      <div className="compact-image-meta">
        <strong>{orderImageSlots[index]?.title}</strong>
        <small>{upload.fileName || fileName || orderImageSlots[index]?.hint}</small>
        <div className={`compact-upload-status ${upload.phase}`}>
          <span>{upload.message}</span>
          <strong>{upload.progress}%</strong>
        </div>
        <div className="compact-upload-track" aria-hidden="true">
          <span style={{ width: `${upload.progress}%` }} />
        </div>
        {upload.error ? <small className="compact-upload-error">{upload.error}</small> : null}
      </div>
      <div className="compact-image-actions">
        <label>
          <ImagePlus size={15} />
          رفع
          <input
            ref={inputRef}
            name={`orderImage${index}Raw`}
            type="file"
            accept={acceptedImageFormats}
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </label>
        {previewUrl ? (
          <button type="button" onClick={clearImage} aria-label={`حذف الصورة ${index + 1}`}>
            <Trash2 size={15} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function OrderForm({ initialTemplate, initialDraft, templates }: { initialTemplate?: string; initialDraft?: OrderInitialDraft; templates: OrderTemplateOption[] }) {
  const fallbackTemplate = templates[0] || { slug: "featured-1", name: "Featured 1", arabicName: "مميز 1", previewImage: "/assets/templates/featured-1.svg" };
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
    photographerEnabled: Boolean(initialDraft?.photographerEnabled),
    photographerName: initialDraft?.photographerName || "",
    photographerFacebookUrl: initialDraft?.photographerFacebookUrl || "",
    photographerInstagramUrl: initialDraft?.photographerInstagramUrl || "",
    openingText: initialDraft?.openingText || "",
    galleryStories: cleanOrderGalleryStories(initialDraft?.galleryStories),
    storyEnabled: Boolean(initialDraft?.storyEnabled || filledOrderStory(initialDraft?.story).length),
    story: cleanOrderStory(initialDraft?.story),
    giftEnabled: Boolean(initialDraft?.giftEnabled || Object.values(filledOrderGift(initialDraft?.gift)).some(Boolean)),
    gift: cleanOrderGift(initialDraft?.gift),
    musicEnabled: Boolean(initialDraft?.musicEnabled),
    musicChoice: initialDraft?.musicChoice || "default",
    musicUrl: initialDraft?.musicUrl || "",
  });
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [draftImageUrls, setDraftImageUrls] = useState<string[]>(() => cleanOrderDraftImageUrls(initialDraft?.imageUrls));
  const [imageUploads, setImageUploads] = useState<ImageUploadState[]>(() =>
    orderImageSlots.map((_, index) => createIdleUploadState(cleanOrderDraftImageUrls(initialDraft?.imageUrls)[index] || "")),
  );
  const [musicFileName, setMusicFileName] = useState("");
  const [musicVideoBusy, setMusicVideoBusy] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const orderSubmitKeyRef = useRef("");
  const uploadedImageUrlsRef = useRef<string[]>(cleanOrderDraftImageUrls(initialDraft?.imageUrls));
  const selectedImageKeysRef = useRef<string[]>([]);
  const imageUploadPromisesRef = useRef<Array<Promise<string> | null>>(orderImageSlots.map(() => null));
  const imageUploadRequestsRef = useRef<Array<XMLHttpRequest | null>>(orderImageSlots.map(() => null));

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
      photographerEnabled: params.get("photographerEnabled") === "1" || undefined,
      photographerName: params.get("photographerName") || undefined,
      photographerFacebookUrl: params.get("photographerFacebookUrl") || undefined,
      photographerInstagramUrl: params.get("photographerInstagramUrl") || undefined,
      galleryStories: cleanOrderGalleryStories(parseDraftJson(params.get("galleryStories"), [])),
      storyEnabled: params.get("storyEnabled") === "1" || undefined,
      story: cleanOrderStory(parseDraftJson(params.get("story"), [])),
      giftEnabled: params.get("giftEnabled") === "1" || undefined,
      gift: cleanOrderGift(parseDraftJson(params.get("gift"), {})),
      musicEnabled: params.get("musicEnabled") === "1" || undefined,
      musicChoice: isOrderMusicChoice(params.get("musicChoice")) ? (params.get("musicChoice") as MusicChoice) : undefined,
      musicUrl: params.get("musicUrl") || undefined,
      imageUrls,
    };
  }

  function replaceDraftUrl(nextForm: Partial<FormState> = form, nextImageUrls = draftImageUrls) {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    params.set("template", nextForm.templateSlug || selectedTemplate.slug);
    const fields: Array<keyof OrderFormValues> = [
      "groomName",
      "brideName",
      "phone",
      "weddingDate",
      "mapUrl",
      "venue",
      "notes",
      "photographerName",
      "photographerFacebookUrl",
      "photographerInstagramUrl",
      "musicUrl",
    ];
    fields.forEach((field) => {
      const value = String(nextForm[field] || "").trim();
      if (value) params.set(field, value);
    });
    if (nextForm.photographerEnabled) params.set("photographerEnabled", "1");
    const story = filledOrderStory(nextForm.story);
    if (nextForm.storyEnabled && story.length) {
      params.set("storyEnabled", "1");
      params.set("story", JSON.stringify(story));
    }
    const galleryStories = filledOrderGalleryStories(nextForm.galleryStories);
    if (galleryStories.length) params.set("galleryStories", JSON.stringify(galleryStories));
    const gift = filledOrderGift(nextForm.gift);
    if (nextForm.giftEnabled && Object.values(gift).some(Boolean)) {
      params.set("giftEnabled", "1");
      params.set("gift", JSON.stringify(gift));
    }
    if (nextForm.musicEnabled) {
      params.set("musicEnabled", "1");
      params.set("musicChoice", nextForm.musicChoice || "default");
    }
    if (nextImageUrls.length) params.set("gallery", nextImageUrls.join(","));
    window.history.replaceState(window.history.state, "", `/order?${params.toString()}`);
  }

  function persistDraft(nextForm: Partial<FormState> = form, nextImageUrls = draftImageUrls) {
    if (typeof window === "undefined") return;
    const draft = { ...form, ...nextForm, imageUrls: nextImageUrls };
    try {
      window.sessionStorage.setItem(orderDraftStorageKey, JSON.stringify(draft));
    } catch {
      // Keeping the URL draft is enough to restore the form if browser storage is unavailable.
    }
    replaceDraftUrl(draft, nextImageUrls);
  }

  function persistCurrentDomDraft() {
    if (!formRef.current) return;
    const currentForm = getCurrentFormFromDom();
    const formData = new FormData(formRef.current);
    const currentTemplateSlug = String(formData.get("templateSlug") || selectedTemplate.slug);
    persistDraft(
      {
        ...currentForm,
        templateSlug: currentTemplateSlug,
        photographerEnabled: form.photographerEnabled,
        galleryStories: form.galleryStories,
        storyEnabled: form.storyEnabled,
        story: form.story,
        giftEnabled: form.giftEnabled,
        gift: form.gift,
        musicEnabled: form.musicEnabled,
        musicChoice: form.musicChoice,
      },
      draftImageUrls,
    );
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
        photographerEnabled: Boolean(draft.photographerEnabled),
      photographerName: typeof draft.photographerName === "string" ? draft.photographerName : current.photographerName,
      photographerFacebookUrl: typeof draft.photographerFacebookUrl === "string" ? draft.photographerFacebookUrl : current.photographerFacebookUrl,
      photographerInstagramUrl: typeof draft.photographerInstagramUrl === "string" ? draft.photographerInstagramUrl : current.photographerInstagramUrl,
      openingText: typeof draft.openingText === "string" ? draft.openingText : current.openingText,
      galleryStories: cleanOrderGalleryStories(draft.galleryStories),
      storyEnabled: Boolean(draft.storyEnabled || filledOrderStory(draft.story).length),
        story: cleanOrderStory(draft.story),
        giftEnabled: Boolean(draft.giftEnabled || Object.values(filledOrderGift(draft.gift)).some(Boolean)),
        gift: cleanOrderGift(draft.gift),
        musicEnabled: Boolean(draft.musicEnabled),
        musicChoice: isOrderMusicChoice(draft.musicChoice) ? draft.musicChoice : "default",
        musicUrl: typeof draft.musicUrl === "string" ? draft.musicUrl : current.musicUrl,
      }));
      const restoredImages = cleanOrderDraftImageUrls(draft.imageUrls);
      setDraftImageUrls(restoredImages);
      uploadedImageUrlsRef.current = restoredImages;
      setImageUploads(orderImageSlots.map((_, index) => createIdleUploadState(restoredImages[index] || "")));
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

  function addStoryItem() {
    setForm((current) => ({ ...current, storyEnabled: true, story: [...cleanOrderStory(current.story), createOrderStoryItem()] }));
    if (message) setMessage("");
  }

  function updateStoryItem(index: number, patch: Partial<CoupleStoryItem>) {
    setForm((current) => ({
      ...current,
      storyEnabled: true,
      story: cleanOrderStory(current.story).map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
    if (message) setMessage("");
  }

  function removeStoryItem(index: number) {
    setForm((current) => {
      const nextStory = cleanOrderStory(current.story).filter((_, itemIndex) => itemIndex !== index);
      return { ...current, story: nextStory, storyEnabled: nextStory.length ? current.storyEnabled : false };
    });
    if (message) setMessage("");
  }

  function updateGalleryStory(index: number, patch: Partial<GalleryStoryItem>) {
    setForm((current) => ({
      ...current,
      galleryStories: cleanOrderGalleryStories(current.galleryStories).map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
    if (message) setMessage("");
  }

  function updateGiftField(field: keyof InvitationGift, value: string) {
    setForm((current) => ({
      ...current,
      giftEnabled: true,
      gift: { ...cleanOrderGift(current.gift), [field]: value },
    }));
    if (message) setMessage("");
  }

  function setImageUpload(index: number, update: Partial<ImageUploadState>) {
    setImageUploads((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...update } : item)));
  }

  function syncUploadedImageUrl(index: number, url: string) {
    uploadedImageUrlsRef.current[index] = url;
    setDraftImageUrls((current) => {
      const next = [...current];
      next[index] = url;
      return cleanOrderDraftImageUrls(next);
    });
  }

  function uploadCompressedImage(file: File, index: number, attempt = 0) {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      imageUploadRequestsRef.current[index]?.abort();
      imageUploadRequestsRef.current[index] = xhr;
      xhr.open("POST", "/api/orders/preview-images");
      xhr.timeout = 90_000;
      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const uploadProgress = Math.round((event.loaded / event.total) * 45);
        setImageUpload(index, {
          phase: "uploading",
          progress: Math.min(95, 50 + uploadProgress),
          message: "جاري حفظ الصورة على الخادم",
          error: "",
        });
      };
      xhr.onload = () => {
        imageUploadRequestsRef.current[index] = null;
        const payload = (() => {
          try {
            return JSON.parse(xhr.responseText || "{}") as { imageUrls?: string[]; error?: string };
          } catch {
            return null;
          }
        })();
        const url = payload?.imageUrls?.[0] || "";
        if (xhr.status >= 200 && xhr.status < 300 && url) {
          resolve(url);
          return;
        }
        const error = createUploadError(payload?.error || `upload-failed-${xhr.status || "network"}`, xhr.status || undefined);
        reject(error);
      };
      xhr.onerror = () => {
        imageUploadRequestsRef.current[index] = null;
        reject(new Error("network-upload-failed"));
      };
      xhr.ontimeout = () => {
        imageUploadRequestsRef.current[index] = null;
        reject(new Error("upload-timeout"));
      };
      xhr.onabort = () => reject(new Error("upload-aborted"));

      const payload = new FormData();
      payload.append("images", file);
      payload.append("slot", String(index + 1));
      payload.append("attempt", String(attempt + 1));
      xhr.send(payload);
    });
  }

  async function uploadOrderImage(index: number, file: File) {
    const key = fileKey(file);
    selectedImageKeysRef.current[index] = key;
    uploadedImageUrlsRef.current[index] = "";
    imageUploadRequestsRef.current[index]?.abort();

    setImageUpload(index, {
      phase: "selected",
      progress: 5,
      message: "تم اختيار الصورة",
      fileName: file.name,
      url: "",
      error: "",
    });

    if (file.size > maxClientOriginalImageBytes) {
      const error = `حجم الصورة ${formatUploadSize(file.size)}. اختار صورة أقل من ${formatUploadSize(maxClientOriginalImageBytes)}.`;
      setImageUpload(index, { phase: "error", progress: 0, message: "الصورة كبيرة جداً", error });
      throw new Error(error);
    }

    const promise = (async () => {
      try {
        setImageUpload(index, { phase: "compressing", progress: 18, message: "جاري ضغط الصورة داخل المتصفح", error: "" });
        const optimized = await compressImageForUpload(file).catch((error) => {
          if (file.size <= maxDirectServerImageBytes) {
            console.log(
              `[Order Upload] Compression failed; uploading original fallback name=${file.name || "unnamed"} type=${file.type || "unknown"} size=${file.size}.`,
              error,
            );
            return {
              file,
              originalBytes: file.size,
              optimizedBytes: file.size,
              width: 0,
              height: 0,
            };
          }
          throw error;
        });
        if (selectedImageKeysRef.current[index] !== key) throw new Error("upload-aborted");
        setImageUpload(index, {
          phase: "uploading",
          progress: 50,
          message: optimized.originalBytes === optimized.optimizedBytes
            ? `سيتم رفع الصورة الأصلية (${formatUploadSize(optimized.originalBytes)})`
            : `تم الضغط من ${formatUploadSize(optimized.originalBytes)} إلى ${formatUploadSize(optimized.optimizedBytes)}`,
          error: "",
        });

        let lastError: unknown = null;
        for (let attempt = 0; attempt <= uploadRetryCount; attempt += 1) {
          try {
            if (attempt > 0) {
              setImageUpload(index, {
                phase: "uploading",
                progress: 52,
                message: `إعادة محاولة الرفع ${attempt + 1}/${uploadRetryCount + 1}`,
                error: "",
              });
            }
            const url = await uploadCompressedImage(optimized.file, index, attempt);
            if (selectedImageKeysRef.current[index] !== key) throw new Error("upload-aborted");
            syncUploadedImageUrl(index, url);
            setImageUpload(index, {
              phase: "saved",
              progress: 100,
              message: "تم حفظ الصورة وستظهر في المعاينة",
              fileName: file.name,
              url,
              error: "",
            });
            return url;
          } catch (error) {
            lastError = error;
            if (error instanceof Error && error.message === "upload-aborted") throw error;
            if (nonRetryableUploadStatuses.has(getUploadErrorStatus(error))) throw error;
          }
        }

        throw lastError instanceof Error ? lastError : new Error("upload-failed");
      } catch (error) {
        const uploadError = error instanceof Error && error.message === "upload-aborted"
          ? "تم إلغاء رفع الصورة لأنك اخترت صورة أخرى."
          : getUploadErrorMessage(error);
        setImageUpload(index, {
          phase: "error",
          progress: 0,
          message: "فشل حفظ الصورة",
          error: uploadError,
          url: "",
        });
        throw error;
      }
    })();

    imageUploadPromisesRef.current[index] = promise;
    return promise;
  }

  function handleOrderImageSelected(index: number, file: File) {
    if (message) setMessage("");
    uploadOrderImage(index, file).catch(() => {
      setState("error");
      setMessage("في صورة لم يتم حفظها. راجع حالة الصور قبل المعاينة أو التأكيد.");
    });
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

  function applyPhotographerParams(params: URLSearchParams, values: Partial<FormState>) {
    if (!values.photographerEnabled) return;
    params.set("photographerEnabled", "1");
    if (values.photographerName) params.set("photographerName", values.photographerName);
    if (values.photographerFacebookUrl) params.set("photographerFacebookUrl", values.photographerFacebookUrl);
    if (values.photographerInstagramUrl) params.set("photographerInstagramUrl", values.photographerInstagramUrl);
  }

  function applyMusicParams(params: URLSearchParams, values: Partial<FormState>, musicUrl = values.musicUrl || "") {
    if (!values.musicEnabled) return;
    params.set("musicEnabled", "1");
    params.set("musicChoice", values.musicChoice || "default");
    if (musicUrl) params.set("musicUrl", musicUrl);
  }

  function previewHref(values: Partial<FormState> = form, imageUrls: string[] = [], musicUrl = "") {
    const params = new URLSearchParams();
    params.set("groomName", values.groomName || "اسم العريس");
    params.set("brideName", values.brideName || "اسم العروسة");
    const weddingDate = normalizeWeddingDate(values.weddingDate || "");
    if (weddingDate) params.set("weddingDate", weddingDate);
    if (values.venue) params.set("venue", values.venue);
    if (values.mapUrl) params.set("mapUrl", values.mapUrl);
    if (values.openingText) params.set("openingText", values.openingText);
    if (imageUrls.length) params.set("gallery", imageUrls.join(","));
    const galleryStories = filledOrderGalleryStories(values.galleryStories);
    if (galleryStories.length) params.set("galleryStories", JSON.stringify(galleryStories));
    const story = filledOrderStory(values.story);
    if (values.storyEnabled && story.length) params.set("story", JSON.stringify(story));
    const gift = filledOrderGift(values.gift);
    if (values.giftEnabled && Object.values(gift).some(Boolean)) params.set("gift", JSON.stringify(gift));
    applyPhotographerParams(params, values);
    applyMusicParams(params, values, musicUrl);
    return `/templates/${values.templateSlug || form.templateSlug}/preview?${params.toString()}`;
  }

  function getCurrentFormFromDom(): OrderFormValues {
    const formData = new FormData(formRef.current || undefined);
    return {
      groomName: String(formData.get("groomName") || "").trim(),
      brideName: String(formData.get("brideName") || "").trim(),
      phone: "",
      weddingDate: String(formData.get("weddingDate") || "").trim(),
      venue: String(formData.get("venue") || "").trim(),
      mapUrl: String(formData.get("mapUrl") || "").trim(),
      notes: "",
      photographerName: String(formData.get("photographerName") || "").trim(),
      photographerFacebookUrl: String(formData.get("photographerFacebookUrl") || "").trim(),
      photographerInstagramUrl: String(formData.get("photographerInstagramUrl") || "").trim(),
      openingText: String(formData.get("openingText") || form.openingText || "").trim(),
      musicUrl: String(formData.get("musicUrl") || form.musicUrl || "").trim(),
    };
  }

  async function handleOrderMusicVideoFile(file?: File | null) {
    if (!file) return;
    setMusicVideoBusy(true);
    setState("idle");
    setMessage("جاري استخراج الصوت من الفيديو وتحويله إلى MP3.");
    try {
      const extracted = await extractOrderVideoAudio(file);
      setMusicFileName(extracted.fileName);
      updateField("musicUrl", extracted.musicUrl);
      updateField("musicChoice", "video");
      setMessage(`تم استخراج الصوت من الفيديو وحفظه كملف MP3: ${extracted.fileName}`);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "تعذر استخراج الصوت من الفيديو.");
    } finally {
      setMusicVideoBusy(false);
    }
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
        const rawFile = formData.get(`orderImage${index}Raw`);
        if (rawFile instanceof File && rawFile.size > 0) {
          const key = fileKey(rawFile);
          if (selectedImageKeysRef.current[index] !== key || !imageUploadPromisesRef.current[index]) {
            imageUploadPromisesRef.current[index] = uploadOrderImage(index, rawFile);
          }
          return imageUploadPromisesRef.current[index]?.catch(() => "") || "";
        }
        if (uploadedImageUrlsRef.current[index]) return uploadedImageUrlsRef.current[index];
        if (draftImageUrls[index]) return draftImageUrls[index];
        return "";
      }),
    );

    return slotImages.filter(Boolean).slice(0, 3);
  }

  function selectedRawImageCount(formData: FormData) {
    return orderImageSlots.filter((_, index) => {
      const rawFile = formData.get(`orderImage${index}Raw`);
      return rawFile instanceof File && rawFile.size > 0;
    }).length;
  }

  function clearOrderImage(index: number) {
    imageUploadRequestsRef.current[index]?.abort();
    imageUploadRequestsRef.current[index] = null;
    imageUploadPromisesRef.current[index] = null;
    selectedImageKeysRef.current[index] = "";
    uploadedImageUrlsRef.current[index] = "";
    setImageUpload(index, createIdleUploadState());
    setDraftImageUrls((current) => {
      const next = [...current];
      next[index] = "";
      return cleanOrderDraftImageUrls(next);
    });
  }

  async function getOrderMusicDataUrl(formData: FormData) {
    if (!form.musicEnabled || form.musicChoice !== "upload") return "";
    const rawFile = formData.get("orderMusicFile");
    if (rawFile instanceof File && rawFile.size > 0) return readFileAsDataUrl(rawFile);
    return "";
  }

  function validateOrder(values: OrderFormValues, photographerEnabled = form.photographerEnabled, musicEnabled = form.musicEnabled, musicChoice = form.musicChoice) {
    const nextErrors: FieldErrors = {};
    if (!values.groomName) nextErrors.groomName = "اكتب اسم العريس كما تحب ظهوره في الدعوة.";
    if (!values.brideName) nextErrors.brideName = "اكتب اسم العروسة كما تحب ظهوره في الدعوة.";
    if (!values.weddingDate) nextErrors.weddingDate = "اختار تاريخ المناسبة من التقويم.";
    else if (!normalizeWeddingDate(values.weddingDate)) nextErrors.weddingDate = "اختار تاريخ صحيح من التقويم.";
    if (!values.venue) nextErrors.venue = "اكتب عنوان المناسبة أو اسم القاعة.";
    if (values.mapUrl && !isValidOptionalUrl(values.mapUrl)) nextErrors.mapUrl = "رابط اللوكيشن لازم يبدأ بـ https://";
    if (photographerEnabled && !isValidOptionalUrl(values.photographerFacebookUrl)) nextErrors.photographerFacebookUrl = "رابط Facebook لازم يبدأ بـ https://";
    if (photographerEnabled && !isValidOptionalUrl(values.photographerInstagramUrl)) nextErrors.photographerInstagramUrl = "رابط Instagram لازم يبدأ بـ https://";
    if (musicEnabled && musicChoice === "url" && values.musicUrl && !isPlayableAudioUrl(values.musicUrl)) nextErrors.musicUrl = "رابط الموسيقى لازم يكون مباشر مثل mp3 أو m4a أو wav.";
    if (musicEnabled && musicChoice === "video" && !values.musicUrl) nextErrors.musicUrl = "ارفع فيديو أولاً ليتم استخراج الصوت منه.";
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

  function getPhotographerNotes(values: Partial<FormState>) {
    if (!values.photographerEnabled) return "";
    const lines = [
      "بيانات المصور الفوتوغرافي:",
      values.photographerName ? `الاسم: ${values.photographerName}` : "",
      values.photographerFacebookUrl ? `Facebook: ${values.photographerFacebookUrl}` : "",
      values.photographerInstagramUrl ? `Instagram: ${values.photographerInstagramUrl}` : "",
    ].filter(Boolean);
    return lines.length > 1 ? lines.join("\n") : "";
  }

  function getMusicNotes(values: Partial<FormState>, musicUrl = values.musicUrl || "") {
    if (!values.musicEnabled) return "";
    if (values.musicChoice === "default") return "موسيقى الدعوة:\nاختيار العميل: الموسيقى الأساسية.";
    if (musicUrl) return `موسيقى الدعوة:\nاختيار العميل: ${values.musicChoice === "upload" ? "ملف MP3 مرفوع" : values.musicChoice === "video" ? "صوت مستخرج من فيديو" : "رابط أغنية"}\nرابط الموسيقى: ${musicUrl}`;
    return `موسيقى الدعوة:\nاختيار العميل: ${values.musicChoice === "upload" ? "رفع ملف MP3" : values.musicChoice === "video" ? "استخراج الصوت من فيديو" : "رابط أغنية"}`;
  }

  function getStoryNotes(values: Partial<FormState>) {
    const story = values.storyEnabled ? filledOrderStory(values.story) : [];
    if (!story.length) return "";
    return [
      "قصة العروسين:",
      ...story.map((item, index) =>
        [
          `${index + 1}. ${item.title || "محطة بدون عنوان"}`,
          item.date ? `التاريخ: ${item.date}` : "",
          item.description ? `الوصف: ${item.description}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ].join("\n");
  }

  function getGalleryStoryNotes(values: Partial<FormState>) {
    const galleryStories = filledOrderGalleryStories(values.galleryStories);
    if (!galleryStories.length) return "";
    return [
      "Story Gallery:",
      ...galleryStories.map((item, index) =>
        [
          `${index + 1}. ${item.title || "صورة بدون عنوان"}`,
          item.description ? `الوصف: ${item.description}` : "",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ].join("\n");
  }

  function getGiftNotes(values: Partial<FormState>) {
    const gift = values.giftEnabled ? filledOrderGift(values.gift) : {};
    const lines = [
      gift.vodafoneCash ? `فودافون كاش: ${gift.vodafoneCash}` : "",
      gift.instapay ? `إنستا باي: ${gift.instapay}` : "",
      gift.bankAccount ? `حساب بنكي: ${gift.bankAccount}` : "",
      gift.customText ? `نص مخصص: ${gift.customText}` : "",
    ].filter(Boolean);
    return lines.length ? ["هدية العروسين:", ...lines].join("\n") : "";
  }

  async function openPreview() {
    const currentForm = getCurrentFormFromDom();
    if (showValidationErrors(validateOrder(currentForm))) return;
    setIsPreviewing(true);
    setMessage("");

    try {
      const formData = new FormData(formRef.current || undefined);
      const orderImages = await getOrderImageDataUrls(formData);
      const orderMusic = await getOrderMusicDataUrl(formData);
      let imageUrls: string[] = [];
      let musicUrl = form.musicEnabled && form.musicChoice === "url" ? currentForm.musicUrl : form.musicEnabled && (form.musicChoice === "upload" || form.musicChoice === "video") ? form.musicUrl : "";

      if (orderImages.length) {
        imageUrls = orderImages;
      }

      if (selectedRawImageCount(formData) > orderImages.length) {
        setState("error");
        setMessage("في صورة لم يتم حفظها للمعاينة. ارفعها مرة أخرى أو اختار صورة أصغر.");
        setIsPreviewing(false);
        return;
      }

      const hasSelectedImageStillUploading = imageUploads.some((upload) => upload.phase === "compressing" || upload.phase === "uploading" || upload.phase === "selected");
      const hasImageError = imageUploads.some((upload) => upload.phase === "error");
      if (hasSelectedImageStillUploading || hasImageError) {
        setState("error");
        setMessage(hasImageError ? "في صورة فشلت في الرفع. احذفها أو ارفعها مرة أخرى قبل المعاينة." : "استنى انتهاء رفع الصور قبل فتح المعاينة.");
        setIsPreviewing(false);
        return;
      }

      if (form.musicEnabled && form.musicChoice !== "default" && (orderMusic || currentForm.musicUrl)) {
        const response = await fetch("/api/orders/preview-music", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ music: orderMusic, musicUrl: form.musicChoice === "url" ? currentForm.musicUrl : form.musicUrl }),
        });
        const data = (await response.json().catch(() => null)) as { musicUrl?: string; error?: string } | null;
        if (!response.ok) {
          setState("error");
          setMessage(data?.error || "رابط أو ملف الموسيقى غير قابل للتشغيل.");
          setIsPreviewing(false);
          return;
        }
        musicUrl = data?.musicUrl || "";
      }

      const nextImageUrls = imageUrls.length ? imageUrls : draftImageUrls;
      const nextForm = {
        ...currentForm,
        weddingDate: normalizeWeddingDate(currentForm.weddingDate),
        templateSlug: selectedTemplate.slug,
        photographerEnabled: form.photographerEnabled,
        galleryStories: filledOrderGalleryStories(form.galleryStories),
        storyEnabled: form.storyEnabled,
        story: filledOrderStory(form.story),
        giftEnabled: form.giftEnabled,
        gift: filledOrderGift(form.gift),
        musicEnabled: form.musicEnabled,
        musicChoice: form.musicChoice,
        musicUrl,
      };
      if (musicUrl) updateField("musicUrl", musicUrl);
      if (nextImageUrls.length) setDraftImageUrls(nextImageUrls);
      persistDraft(nextForm, nextImageUrls);
      window.location.href = previewHref(nextForm, nextImageUrls, musicUrl);
    } catch {
      setState("error");
      setMessage("تعذر تجهيز المعاينة. جرّب مرة أخرى أو اضغط تأكيد إنشاء الدعوة.");
      setIsPreviewing(false);
    }
  }

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "loading") return;
    if (!orderSubmitKeyRef.current) {
      orderSubmitKeyRef.current = `order-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    }
    const formData = new FormData(event.currentTarget);
    const rawWeddingDate = String(formData.get("weddingDate") || "").trim();
    const currentForm: FormState = {
      ...form,
      templateSlug: selectedTemplate.slug,
      groomName: String(formData.get("groomName") || "").trim(),
      brideName: String(formData.get("brideName") || "").trim(),
      phone: "",
      weddingDate: normalizeWeddingDate(rawWeddingDate) || rawWeddingDate,
      mapUrl: String(formData.get("mapUrl") || "").trim(),
      venue: String(formData.get("venue") || "").trim(),
      notes: "",
      photographerName: String(formData.get("photographerName") || "").trim(),
      photographerFacebookUrl: String(formData.get("photographerFacebookUrl") || "").trim(),
      photographerInstagramUrl: String(formData.get("photographerInstagramUrl") || "").trim(),
      openingText: String(formData.get("openingText") || form.openingText || "").trim(),
      musicUrl: String(formData.get("musicUrl") || form.musicUrl || "").trim(),
    };
    if (showValidationErrors(validateOrder({ ...currentForm, weddingDate: rawWeddingDate }, currentForm.photographerEnabled, currentForm.musicEnabled, currentForm.musicChoice))) return;
    setState("loading");
    setMessage("جاري التأكد من حفظ الصور قبل إنشاء الدعوة.");

    const photographerNotes = getPhotographerNotes(currentForm);
    const clientMusicNotes = getMusicNotes(currentForm);
    const galleryStories = filledOrderGalleryStories(currentForm.galleryStories);
    const galleryStoryNotes = getGalleryStoryNotes({ ...currentForm, galleryStories });
    const story = currentForm.storyEnabled ? filledOrderStory(currentForm.story) : [];
    const gift = currentForm.giftEnabled ? filledOrderGift(currentForm.gift) : {};
    const storyNotes = getStoryNotes({ ...currentForm, story });
    const giftNotes = getGiftNotes({ ...currentForm, gift });

    try {
      const orderImages = await getOrderImageDataUrls(formData);
      if (selectedRawImageCount(formData) > orderImages.length) {
        setState("error");
        setMessage("في صورة لم يتم حفظها. ارفعها مرة أخرى أو اختار صورة أصغر قبل تأكيد الدعوة.");
        return;
      }
      const hasImageError = imageUploads.some((upload) => upload.phase === "error");
      if (hasImageError) {
        setState("error");
        setMessage("في صورة لم يتم حفظها. احذف الصورة أو ارفعها مرة أخرى قبل تأكيد الدعوة.");
        return;
      }
      const orderMusic = await getOrderMusicDataUrl(formData);
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentForm,
          galleryStories,
          story,
          gift,
          notes: [photographerNotes, clientMusicNotes, galleryStoryNotes, storyNotes, giftNotes].filter(Boolean).join("\n\n"),
          orderImages,
          orderMusic,
          idempotencyKey: orderSubmitKeyRef.current,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setState("error");
        setMessage(data?.error || "حصل خطأ مؤقت أثناء تأكيد الطلب. جرّب مرة تانية.");
        return;
      }

      const data = (await response.json().catch(() => null)) as { whatsappUrl?: string; imageUrls?: string[]; musicUrl?: string } | null;
      try {
        window.sessionStorage?.removeItem(orderDraftStorageKey);
      } catch {}
      orderSubmitKeyRef.current = "";
      window.location.href = data?.whatsappUrl || "https://wa.me/";
    } catch {
      setState("error");
      setMessage("تعذر إرسال الطلب للخادم. حاول مرة أخرى.");
    }
  }

  return (
    <div className="order-flow order-flow-simple">
      <form className="form-panel details-form order-simple-form" onSubmit={submitOrder} onInput={persistCurrentDomDraft} onChange={persistCurrentDomDraft} ref={formRef} noValidate>
        <div className="order-template-row field full">
          <label htmlFor="templateSlug">
            <LayoutTemplate size={18} />
            اختيار القالب
          </label>
          <select id="templateSlug" name="templateSlug" value={form.templateSlug} onChange={(event) => updateField("templateSlug", event.target.value)}>
            {templates.map((template) => (
              <option key={template.slug} value={template.slug}>
                {template.arabicName} - {template.name}
              </option>
            ))}
          </select>
        </div>

        {message ? (
          <div className={`order-alert ${state === "error" ? "danger" : "success"}`} role="alert">
            <strong>{state === "error" ? "فيه بيانات محتاجة مراجعة" : "تمام"}</strong>
            <p>{message}</p>
          </div>
        ) : null}

        <div className="input-grid order-compact-grid">
          <div className="field">
            <label htmlFor="language">
              <LayoutTemplate size={16} />
              لغة الدعوة
            </label>
            <select id="language" name="language" value={form.language} onChange={(event) => updateField("language", event.target.value === "en" ? "en" : "ar")}>
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className={`field ${errors.groomName ? "has-error" : ""}`}>
            <label htmlFor="groomName">
              <UserRound size={16} />
              اسم العريس
            </label>
            <input id="groomName" name="groomName" placeholder="مثال: بدر" value={form.groomName} onChange={(event) => updateField("groomName", event.target.value)} required aria-invalid={Boolean(errors.groomName)} aria-describedby={errors.groomName ? "groomName-error" : undefined} />
            {errors.groomName ? <small className="field-error" id="groomName-error">{errors.groomName}</small> : null}
          </div>

          <div className={`field ${errors.brideName ? "has-error" : ""}`}>
            <label htmlFor="brideName">
              <UserRound size={16} />
              اسم العروسة
            </label>
            <input id="brideName" name="brideName" placeholder="مثال: سارة" value={form.brideName} onChange={(event) => updateField("brideName", event.target.value)} required aria-invalid={Boolean(errors.brideName)} aria-describedby={errors.brideName ? "brideName-error" : undefined} />
            {errors.brideName ? <small className="field-error" id="brideName-error">{errors.brideName}</small> : null}
          </div>

          <div className={`field ${errors.weddingDate ? "has-error" : ""}`}>
            <label htmlFor="weddingDate">
              <CalendarDays size={16} />
              تاريخ المناسبة
            </label>
            <input id="weddingDate" name="weddingDate" type="date" value={normalizedDate || form.weddingDate} onChange={(event) => updateField("weddingDate", event.target.value)} required aria-invalid={Boolean(errors.weddingDate)} aria-describedby={errors.weddingDate ? "weddingDate-error weddingDate-hint" : "weddingDate-hint"} />
            {readableDate ? <small className="field-preview" id="weddingDate-hint">هيظهر في الدعوة: {readableDate}</small> : null}
            {errors.weddingDate ? <small className="field-error" id="weddingDate-error">{errors.weddingDate}</small> : null}
          </div>

          <div className={`field ${errors.venue ? "has-error" : ""}`}>
            <label htmlFor="venue">عنوان المناسبة</label>
            <input id="venue" name="venue" placeholder="مثال: قاعة رويال - البحيرة" value={form.venue} onChange={(event) => updateField("venue", event.target.value)} required aria-invalid={Boolean(errors.venue)} aria-describedby={errors.venue ? "venue-error" : undefined} />
            {errors.venue ? <small className="field-error" id="venue-error">{errors.venue}</small> : null}
          </div>

          <div className={`field ${errors.mapUrl ? "has-error" : ""}`}>
            <label htmlFor="mapUrl">
              <Link2 size={16} />
              رابط اللوكيشن
            </label>
            <input id="mapUrl" name="mapUrl" inputMode="url" placeholder="انسخ رابط Google Maps للقاعة أو الـ pin" value={form.mapUrl} onChange={(event) => updateField("mapUrl", event.target.value)} aria-invalid={Boolean(errors.mapUrl)} aria-describedby={errors.mapUrl ? "mapUrl-error mapUrl-hint" : "mapUrl-hint"} />
            <small className="field-preview" id="mapUrl-hint">أفضل نتيجة تكون من رابط Google Maps المباشر للقاعة حتى تظهر المعاينة والمسافة بدقة.</small>
            {errors.mapUrl ? <small className="field-error" id="mapUrl-error">{errors.mapUrl}</small> : null}
          </div>

          <div className="field full">
            <label htmlFor="openingText">نص الافتتاح السينمائي</label>
            <textarea id="openingText" name="openingText" rows={2} placeholder="مثال: افتحوا الدعوة وشاركونا أجمل لحظة في عمرنا" value={form.openingText} onChange={(event) => updateField("openingText", event.target.value)} />
            <small className="field-preview">يظهر فوق صورة الغلاف قبل زر فتح الدعوة، واتركه فارغاً لاستخدام النص الافتراضي.</small>
          </div>
        </div>

        <section className="order-compact-images" aria-labelledby="order-images-title">
          <div className="order-compact-section-head">
            <h2 id="order-images-title">رفع الصور</h2>
            <p>3 صور فقط، وكل صورة تظهر معاينتها قبل المعاينة أو التأكيد.</p>
          </div>
          <div className="compact-image-grid">
            {orderImageSlots.map((slot, index) => {
              const galleryStory = cleanOrderGalleryStories(form.galleryStories)[index] || {};
              return (
                <div className="compact-image-story-card" key={slot.title}>
                  <CompactOrderImageInput
                    index={index}
                    defaultImage={draftImageUrls[index]}
                    upload={imageUploads[index] || createIdleUploadState(draftImageUrls[index])}
                    onFileSelected={handleOrderImageSelected}
                    onClearDefault={() => clearOrderImage(index)}
                  />
                  <div className="compact-image-story-fields">
                    <label>
                      <span>عنوان الصورة</span>
                      <input value={galleryStory.title || ""} onChange={(event) => updateGalleryStory(index, { title: event.target.value })} placeholder="مثال: أول نظرة" />
                    </label>
                    <label>
                      <span>وصف قصير</span>
                      <textarea rows={2} value={galleryStory.description || ""} onChange={(event) => updateGalleryStory(index, { description: event.target.value })} placeholder="اكتب جملة قصيرة تجعل الصورة جزءاً من الحكاية" />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="field-preview">إذا تركت عناوين وأوصاف الصور فارغة سيظهر معرض الصور بالشكل الحالي.</p>
        </section>

        <section className="order-photographer-box">
          <button
            className={`photographer-toggle-button ${form.photographerEnabled ? "active" : ""}`}
            type="button"
            aria-expanded={form.photographerEnabled}
            onClick={() => updateField("photographerEnabled", !form.photographerEnabled)}
          >
            <Camera size={18} />
            <span>هل تريد إضافة بيانات المصور الفوتوغرافي الذي سيوثق يومك؟</span>
            <strong>{form.photographerEnabled ? "إخفاء البيانات" : "إضافة بيانات المصور"}</strong>
          </button>

          {form.photographerEnabled ? (
            <div className="photographer-fields">
              <div className="field">
                <label htmlFor="photographerName">اسم المصور الفوتوغرافي</label>
                <input id="photographerName" name="photographerName" placeholder="اختياري" value={form.photographerName} onChange={(event) => updateField("photographerName", event.target.value)} />
              </div>
              <div className={`field ${errors.photographerFacebookUrl ? "has-error" : ""}`}>
                <label htmlFor="photographerFacebookUrl">رابط Facebook</label>
                <input id="photographerFacebookUrl" name="photographerFacebookUrl" inputMode="url" placeholder="https://facebook.com/..." value={form.photographerFacebookUrl} onChange={(event) => updateField("photographerFacebookUrl", event.target.value)} aria-invalid={Boolean(errors.photographerFacebookUrl)} />
                {errors.photographerFacebookUrl ? <small className="field-error">{errors.photographerFacebookUrl}</small> : null}
              </div>
              <div className={`field ${errors.photographerInstagramUrl ? "has-error" : ""}`}>
                <label htmlFor="photographerInstagramUrl">رابط Instagram</label>
                <input id="photographerInstagramUrl" name="photographerInstagramUrl" inputMode="url" placeholder="https://instagram.com/..." value={form.photographerInstagramUrl} onChange={(event) => updateField("photographerInstagramUrl", event.target.value)} aria-invalid={Boolean(errors.photographerInstagramUrl)} />
                {errors.photographerInstagramUrl ? <small className="field-error">{errors.photographerInstagramUrl}</small> : null}
              </div>
            </div>
          ) : null}
        </section>

        <section className="order-story-box">
          <button
            className={`photographer-toggle-button order-story-toggle ${form.storyEnabled ? "active" : ""}`}
            type="button"
            aria-expanded={form.storyEnabled}
            onClick={() => {
              if (form.storyEnabled) updateField("storyEnabled", false);
              else {
                setForm((current) => ({ ...current, storyEnabled: true, story: cleanOrderStory(current.story).length ? current.story : [createOrderStoryItem()] }));
              }
            }}
          >
            <Heart size={18} />
            <span>إضافة قصة العروسين داخل الدعوة</span>
            <strong>{form.storyEnabled ? "إخفاء القصة" : "إضافة القصة"}</strong>
          </button>

          {form.storyEnabled ? (
            <div className="order-story-fields">
              <div className="order-story-head">
                <p>أضفوا محطات رحلتكم، وستظهر كتسلسل زمني راقٍ داخل الدعوة. إذا تركتموها فارغة لن يظهر القسم.</p>
                <button className="btn btn-soft" type="button" onClick={addStoryItem}>
                  <Plus size={16} />
                  إضافة مرحلة
                </button>
              </div>
              {cleanOrderStory(form.story).length ? (
                <div className="order-story-list">
                  {cleanOrderStory(form.story).map((item, index) => (
                    <article className="order-story-item" key={item.id || index}>
                      <div className="order-story-item-head">
                        <strong>مرحلة {index + 1}</strong>
                        <button className="admin-icon-button" type="button" onClick={() => removeStoryItem(index)} title="حذف المرحلة">
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="field">
                        <label htmlFor={`storyDate-${index}`}>التاريخ</label>
                        <input id={`storyDate-${index}`} value={item.date || ""} onChange={(event) => updateStoryItem(index, { date: event.target.value })} placeholder="مثلاً: 2022 أو أول لقاء" />
                      </div>
                      <div className="field">
                        <label htmlFor={`storyTitle-${index}`}>العنوان</label>
                        <input id={`storyTitle-${index}`} value={item.title} onChange={(event) => updateStoryItem(index, { title: event.target.value })} placeholder="أول لقاء" />
                      </div>
                      <div className="field full">
                        <label htmlFor={`storyDescription-${index}`}>الوصف</label>
                        <textarea id={`storyDescription-${index}`} rows={3} value={item.description} onChange={(event) => updateStoryItem(index, { description: event.target.value })} placeholder="اكتبوا تفاصيل قصيرة وراقية لهذه المرحلة" />
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="order-story-empty">لن يظهر قسم قصة العروسين إلا بعد إضافة مرحلة واحدة على الأقل.</p>
              )}
            </div>
          ) : null}
        </section>

        <section className="order-gift-box">
          <button
            className={`photographer-toggle-button order-gift-toggle ${form.giftEnabled ? "active" : ""}`}
            type="button"
            aria-expanded={form.giftEnabled}
            onClick={() => updateField("giftEnabled", !form.giftEnabled)}
          >
            <Gift size={18} />
            <span>إضافة بيانات هدية العروسين</span>
            <strong>{form.giftEnabled ? "إخفاء الهدية" : "إضافة الهدية"}</strong>
          </button>

          {form.giftEnabled ? (
            <div className="order-gift-fields">
              <p>اختياري تمامًا. إذا تركت كل البيانات فارغة لن يظهر القسم داخل الدعوة.</p>
              <div className="field">
                <label htmlFor="giftVodafoneCash">رقم فودافون كاش</label>
                <input id="giftVodafoneCash" dir="ltr" inputMode="tel" value={form.gift.vodafoneCash || ""} onChange={(event) => updateGiftField("vodafoneCash", event.target.value)} placeholder="010..." />
              </div>
              <div className="field">
                <label htmlFor="giftInstapay">إنستا باي</label>
                <input id="giftInstapay" dir="ltr" value={form.gift.instapay || ""} onChange={(event) => updateGiftField("instapay", event.target.value)} placeholder="username@instapay أو رقم الهاتف" />
              </div>
              <div className="field">
                <label htmlFor="giftBankAccount">حساب بنكي</label>
                <input id="giftBankAccount" dir="ltr" value={form.gift.bankAccount || ""} onChange={(event) => updateGiftField("bankAccount", event.target.value)} placeholder="اسم البنك / رقم الحساب / IBAN" />
              </div>
              <div className="field full">
                <label htmlFor="giftCustomText">نص مخصص</label>
                <textarea id="giftCustomText" rows={3} value={form.gift.customText || ""} onChange={(event) => updateGiftField("customText", event.target.value)} placeholder="أي تفاصيل إضافية تريد ظهورها للضيوف" />
              </div>
            </div>
          ) : null}
        </section>

        <section className="order-music-box">
          <button
            className={`photographer-toggle-button order-music-toggle ${form.musicEnabled ? "active" : ""}`}
            type="button"
            aria-expanded={form.musicEnabled}
            onClick={() => updateField("musicEnabled", !form.musicEnabled)}
          >
            <Music2 size={18} />
            <span>إضافة موسيقى للدعوة</span>
            <strong>{form.musicEnabled ? "إخفاء الموسيقى" : "إضافة موسيقى"}</strong>
          </button>

          {form.musicEnabled ? (
            <div className="order-music-fields">
              <p className="order-music-note">اختياري، وتشتغل تلقائيًا عند فتح الدعوة بعد النشر.</p>
              <div className="order-music-choice-grid" role="radiogroup" aria-label="اختيار موسيقى الدعوة">
                <button className={form.musicChoice === "default" ? "active" : ""} type="button" role="radio" aria-checked={form.musicChoice === "default"} onClick={() => updateField("musicChoice", "default")}>
                  <Music2 size={16} />
                  موسيقى أساسية
                </button>
                <button className={form.musicChoice === "upload" ? "active" : ""} type="button" role="radio" aria-checked={form.musicChoice === "upload"} onClick={() => updateField("musicChoice", "upload")}>
                  <UploadCloud size={16} />
                  رفع ملف MP3
                </button>
                <button className={form.musicChoice === "video" ? "active" : ""} type="button" role="radio" aria-checked={form.musicChoice === "video"} onClick={() => updateField("musicChoice", "video")}>
                  <FileVideo size={16} />
                  استخراج الصوت من فيديو
                </button>
                <button className={form.musicChoice === "url" ? "active" : ""} type="button" role="radio" aria-checked={form.musicChoice === "url"} onClick={() => updateField("musicChoice", "url")}>
                  <Link2 size={16} />
                  رابط أغنية
                </button>
              </div>

              {form.musicChoice === "upload" ? (
                <label className="order-music-upload">
                  <UploadCloud size={17} />
                  <span>
                    <strong>ارفع ملف MP3</strong>
                    <small>{musicFileName || form.musicUrl || "mp3"}</small>
                  </span>
                  <input
                    name="orderMusicFile"
                    type="file"
                    accept={acceptedAudioFormats}
                    onChange={(event) => {
                      setMusicFileName(event.target.files?.[0]?.name || "");
                      if (message) setMessage("");
                    }}
                  />
                </label>
              ) : null}

              {form.musicChoice === "video" ? (
                <label className="order-music-upload">
                  {musicVideoBusy ? <Loader2 size={17} /> : <FileVideo size={17} />}
                  <span>
                    <strong>{musicVideoBusy ? "جاري استخراج الصوت..." : "ارفع فيديو لاستخراج الصوت"}</strong>
                    <small>{musicFileName || form.musicUrl || "MP4 / MOV / WEBM"}</small>
                    <small>يمكنك رفع فيديو وسيتم استخراج الموسيقى منه تلقائياً واستخدامها داخل الدعوة.</small>
                  </span>
                  <input
                    type="file"
                    accept={acceptedVideoFormats}
                    disabled={musicVideoBusy}
                    onChange={(event) => handleOrderMusicVideoFile(event.target.files?.[0])}
                  />
                </label>
              ) : null}

              {form.musicChoice === "url" ? (
                <div className={`field ${errors.musicUrl ? "has-error" : ""}`}>
                  <label htmlFor="musicUrl">رابط أغنية مباشر</label>
                  <input id="musicUrl" name="musicUrl" inputMode="url" placeholder="https://example.com/song.mp3" value={form.musicUrl} onChange={(event) => updateField("musicUrl", event.target.value)} aria-invalid={Boolean(errors.musicUrl)} />
                  {errors.musicUrl ? <small className="field-error">{errors.musicUrl}</small> : <small className="field-preview">استخدم رابط ملف صوت مباشر، وليس رابط صفحة YouTube.</small>}
                </div>
              ) : null}

              {(form.musicChoice === "upload" || form.musicChoice === "video") && form.musicUrl ? (
                <audio className="order-music-audio-preview" controls preload="metadata" src={form.musicUrl} />
              ) : null}
            </div>
          ) : null}
        </section>

        <div className="order-final-actions">
          <button className="btn btn-gold btn-glow order-submit" type="submit" disabled={state === "loading"}>
            {state === "loading" ? <Loader2 size={19} className="animate-float" /> : <Check size={19} />}
            {state === "loading" ? "جاري التأكيد" : "تأكيد إنشاء الدعوة"}
          </button>

          <button className="btn btn-soft order-preview-button" type="button" onClick={openPreview} disabled={isPreviewing || state === "loading"}>
            {isPreviewing ? <Loader2 size={19} className="animate-float" /> : <Eye size={19} />}
            {isPreviewing ? "جاري تجهيز المعاينة" : "عاين دعوتك قبل التأكيد"}
          </button>
        </div>
      </form>
    </div>
  );
}
