"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
  Clock,
  Eye,
  FileVideo,
  Heart,
  ImagePlus,
  LayoutTemplate,
  Link2,
  Loader2,
  MapPin,
  Music2,
  Phone,
  Plus,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { normalizeCoupleStory } from "@/lib/invitation-texts";
import { calculateKeyboardInset, orderStoryPresets } from "@/lib/order-mobile-ux";
import type { CoupleStoryItem, TemplateDefinition } from "@/lib/types";
import { acceptedImageFormats } from "@/lib/image-formats";
import { LocationPickerModal } from "./LocationPickerModal";

type FormState = {
  groomName: string;
  brideName: string;
  phone: string;
  weddingDate: string;
  weddingTime: string;
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
  storyEnabled: boolean;
  story: CoupleStoryItem[];
  musicEnabled: boolean;
  musicChoice: MusicChoice;
  musicUrl: string;
  paymentMethod: "cod" | "bank" | "ewallet";
};

type MusicChoice = "default" | "upload" | "video" | "url";
type OrderMusicState = Pick<FormState, "musicEnabled" | "musicChoice" | "musicUrl">;
type OrderTemplateOption = Pick<TemplateDefinition, "slug" | "name" | "arabicName" | "previewImage">;
type FieldErrors = Partial<Record<keyof FormState, string>>;
type StoryFieldErrors = Record<string, string>;
type OrderStoryItem = Required<Pick<CoupleStoryItem, "id" | "date" | "title" | "description">>;
type OrderFormValues = Pick<
  FormState,
  | "groomName"
  | "brideName"
  | "phone"
  | "weddingDate"
  | "weddingTime"
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
  | "weddingTime"
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
  story: CoupleStoryItem[];
  musicEnabled: boolean;
  musicChoice: MusicChoice;
  imageUrls: string[];
};

const orderDraftStorageKey = "badrdaawa-order-draft";

const orderImageSlots = [
  { title: "الغلاف", hint: "الرئيسية" },
  { title: "التفاصيل", hint: "قريبة" },
  { title: "صورة إضافية", hint: "اختيارية" },
];

const orderStoryExamples = [
  {
    date: "مثال: 15 / 11 / 2024",
    title: "مثال: أول مرة شوفنا بعض ❤️",
    description: "مثال: كانت أول مقابلة بيننا في فرح صحبتي، ومن هنا بدأت الحكاية.",
  },
  {
    date: "مثال: 02 / 02 / 2025",
    title: "مثال: الخطوبة 💍",
    description: "مثال: اليوم الذي قررنا فيه أن نكمل رحلتنا معاً ونبدأ فصلاً جديداً من حياتنا.",
  },
  {
    date: "مثال: تاريخ يوم الزفاف من خانة تاريخ المناسبة",
    title: "مثال: يوم الزفاف 👰🤵",
    description: "مثال: اليوم الذي نحتفل فيه مع أهلنا وأصدقائنا ببداية حياتنا الجديدة معاً.",
  },
];

const minimumOrderStoryStages = 2;
const maximumOrderStoryStages = 4;

const orderWizardSteps = [
  { id: "template", title: "اختيار القالب" },
  { id: "couple", title: "بيانات العروسين" },
  { id: "event", title: "بيانات المناسبة" },
  { id: "venue", title: "مكان الحفل" },
  { id: "photos", title: "الصور" },
  { id: "music", title: "الموسيقى" },
  { id: "extras", title: "إضافات مهمة" },
  { id: "review", title: "مراجعة الطلب" },
] as const;

type OrderWizardStepId = (typeof orderWizardSteps)[number]["id"];

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
      date: typeof item.date === "string" ? item.date.slice(0, 80) : "",
      title: typeof item.title === "string" ? item.title.slice(0, 160) : "",
      description: typeof item.description === "string" ? item.description.slice(0, 1600) : "",
    }));
}

function filledOrderStory(value: unknown) {
  return normalizeCoupleStory(cleanOrderStory(value));
}

function storyFieldErrorKey(index: number, field: "date" | "title" | "description") {
  return `${index}:${field}`;
}

function parseDraftJson(value: string | null, fallback: unknown) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function createOrderStoryItem(): OrderStoryItem {
  return { id: `story-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, date: "", title: "", description: "" };
}

function ensureMinimumOrderStoryItems(value: unknown) {
  const story = cleanOrderStory(value);
  while (story.length < minimumOrderStoryStages) story.push(createOrderStoryItem());
  return story;
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
  const lastFileRef = useRef<File | null>(null);
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
    lastFileRef.current = file;
    setPreviewUrl(objectUrl);
    setFileName(file.name);
    onFileSelected(index, file);
  }

  function openFilePicker() {
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.click();
  }

  function retryUpload(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (lastFileRef.current) onFileSelected(index, lastFileRef.current);
  }

  function clearImage() {
    revokeObjectUrl();
    if (inputRef.current) inputRef.current.value = "";
    lastFileRef.current = null;
    setPreviewUrl("");
    setFileName("");
    setPreviewFailed(false);
    onClearDefault();
  }

  const isBusy = upload.phase === "selected" || upload.phase === "compressing" || upload.phase === "uploading";
  const isSaved = upload.phase === "saved";
  const isError = upload.phase === "error";
  const statusText = isSaved ? "تم الرفع" : isError ? "فشل الرفع" : upload.phase === "idle" ? "اضغط" : upload.message;
  const slotHint = orderImageSlots[index]?.hint || "صورة";

  return (
    <div
      className={`compact-image-slot ${previewUrl ? "has-image" : ""} is-${upload.phase}`}
      role="button"
      tabIndex={0}
      onClick={openFilePicker}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openFilePicker();
      }}
      aria-label={`اختيار ${orderImageSlots[index]?.title || `الصورة ${index + 1}`}`}
    >
      <input
        ref={inputRef}
        className="compact-image-input"
        name={`orderImage${index}Raw`}
        type="file"
        accept={acceptedImageFormats}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <div className="compact-image-preview">
        {previewUrl && !previewFailed ? (
          <img src={previewUrl} alt={`معاينة الصورة ${index + 1}`} decoding="async" onError={() => setPreviewFailed(true)} />
        ) : (
          <span>
            <ImagePlus size={22} />
            <strong>{slotHint}</strong>
            <small>اضغط هنا</small>
          </span>
        )}
        <em className="compact-image-badge">
          {isSaved ? <Check size={13} /> : isBusy ? <Loader2 size={13} className="animate-float" /> : <ImagePlus size={13} />}
        </em>
      </div>
      <div className="compact-image-meta">
        <strong>{orderImageSlots[index]?.title}</strong>
        <small>{upload.fileName || fileName || slotHint}</small>
        <div className={`compact-upload-status ${upload.phase}`}>
          <span>{isSaved ? "✓ تم الرفع" : statusText}</span>
          <strong>{upload.progress}%</strong>
        </div>
        <div className="compact-upload-track" aria-hidden="true">
          <span style={{ width: `${upload.progress}%` }} />
        </div>
        {upload.error ? (
          <div className="compact-upload-error">
            <small>{upload.error}</small>
            {lastFileRef.current ? (
              <button type="button" onClick={retryUpload}>
                إعادة المحاولة
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="compact-image-actions">
        {previewUrl ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              clearImage();
            }}
            aria-label={`حذف الصورة ${index + 1}`}
          >
            <Trash2 size={15} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function OrderForm({
  initialTemplate,
  initialDraft,
  templates,
  skipTemplateStep = false,
  showPaymentMethods = false,
}: {
  initialTemplate?: string;
  initialDraft?: OrderInitialDraft;
  templates: OrderTemplateOption[];
  skipTemplateStep?: boolean;
  showPaymentMethods?: boolean;
}) {
  const fallbackTemplate = templates[0] || { slug: "featured-1", name: "Featured 1", arabicName: "مميز 1", previewImage: "/assets/templates/featured-1.svg" };
  const initialSlug = templates.some((template) => template.slug === initialTemplate) ? initialTemplate! : fallbackTemplate.slug;
  const [form, setForm] = useState<FormState>({
    groomName: initialDraft?.groomName || "",
    brideName: initialDraft?.brideName || "",
    phone: initialDraft?.phone || "",
    weddingDate: initialDraft?.weddingDate || "",
    weddingTime: initialDraft?.weddingTime || "07:00 مساءً",
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
    storyEnabled: Boolean(initialDraft?.storyEnabled || filledOrderStory(initialDraft?.story).length),
    story: initialDraft?.storyEnabled || filledOrderStory(initialDraft?.story).length ? ensureMinimumOrderStoryItems(initialDraft?.story) : cleanOrderStory(initialDraft?.story),
    musicEnabled: initialDraft?.musicEnabled ?? true,
    musicChoice: initialDraft?.musicChoice || "default",
    musicUrl: initialDraft?.musicUrl || "",
    paymentMethod: "cod",
  });
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [storyErrors, setStoryErrors] = useState<StoryFieldErrors>({});
  const [draftImageUrls, setDraftImageUrls] = useState<string[]>(() => cleanOrderDraftImageUrls(initialDraft?.imageUrls));
  const [imageUploads, setImageUploads] = useState<ImageUploadState[]>(() =>
    orderImageSlots.map((_, index) => createIdleUploadState(cleanOrderDraftImageUrls(initialDraft?.imageUrls)[index] || "")),
  );
  const [musicFileName, setMusicFileName] = useState("");
  const [musicUploadBusy, setMusicUploadBusy] = useState(false);
  const [musicVideoBusy, setMusicVideoBusy] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(skipTemplateStep ? 1 : 0);
  const [musicSettingsOpen, setMusicSettingsOpen] = useState(false);
  const [openingTextOpen, setOpeningTextOpen] = useState(Boolean(initialDraft?.openingText));
  const [photographerFieldsOpen, setPhotographerFieldsOpen] = useState(false);
  const [storyFieldsOpen, setStoryFieldsOpen] = useState(false);
  const [orderPreviewOpen, setOrderPreviewOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; placeName: string; city: string; governorate: string; googleMapsUrl: string } | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [focusedFieldName, setFocusedFieldName] = useState("");
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const formRef = useRef<HTMLFormElement | null>(null);
  const orderSubmitKeyRef = useRef("");
  const finalConfirmIntentAtRef = useRef(0);
  const reviewEnteredAtRef = useRef(0);
  const uploadedImageUrlsRef = useRef<string[]>(cleanOrderDraftImageUrls(initialDraft?.imageUrls));
  const selectedImageKeysRef = useRef<string[]>([]);
  const lastDraftUrlRef = useRef("");
  const activeStepIndexRef = useRef(activeStepIndex);
  const mapPickerOpenRef = useRef(false);
  const imageUploadPromisesRef = useRef<Array<Promise<string> | null>>(orderImageSlots.map(() => null));
  const imageUploadRequestsRef = useRef<Array<XMLHttpRequest | null>>(orderImageSlots.map(() => null));

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.slug === form.templateSlug) || fallbackTemplate,
    [fallbackTemplate, form.templateSlug, templates],
  );
  const uploadingImageCount = imageUploads.filter((upload) => upload.phase === "selected" || upload.phase === "compressing" || upload.phase === "uploading").length;
  const hasImageUploadInProgress = uploadingImageCount > 0;
  const hasMusicUploadInProgress = musicUploadBusy || musicVideoBusy;
  const hasMediaUploadInProgress = hasImageUploadInProgress || hasMusicUploadInProgress;
  const activeStep = orderWizardSteps[activeStepIndex] || orderWizardSteps[0];
  const isFirstStep = activeStepIndex === 0 || (skipTemplateStep && activeStepIndex === 1);
  const isLastStep = activeStepIndex === orderWizardSteps.length - 1;
  const progressPercent = Math.round(((activeStepIndex + 1) / orderWizardSteps.length) * 100);
  const storyItems = ensureMinimumOrderStoryItems(form.story).slice(0, maximumOrderStoryStages);
  const visibleStoryIndex = Math.min(activeStoryIndex, Math.max(0, storyItems.length - 1));
  const previewImageUrls = draftImageUrls.filter(Boolean);
  const orderPreviewSrc = useMemo(() => {
    const params = new URLSearchParams();
    params.set("orderPreview", "1");
    params.set("orderFullPreview", "1");
    params.set("hidePreviewChrome", "1");
    params.set("template", selectedTemplate.slug);
    params.set("language", form.language);
    params.set("groomName", form.groomName);
    params.set("brideName", form.brideName);
    params.set("weddingDate", form.weddingDate);
    params.set("weddingTime", form.weddingTime);
    params.set("venue", form.venue);
    if (form.mapUrl.trim()) params.set("mapUrl", form.mapUrl.trim());
    params.set("photographerEnabled", form.photographerEnabled ? "1" : "0");
    if (form.photographerEnabled) {
      if (form.photographerName.trim()) params.set("photographerName", form.photographerName.trim());
      if (form.photographerFacebookUrl.trim()) params.set("photographerFacebookUrl", form.photographerFacebookUrl.trim());
      if (form.photographerInstagramUrl.trim()) params.set("photographerInstagramUrl", form.photographerInstagramUrl.trim());
    }
    params.set("musicEnabled", form.musicEnabled ? "1" : "0");
    if (form.musicEnabled) params.set("musicChoice", form.musicChoice);
    if (form.musicUrl.trim()) params.set("musicUrl", form.musicUrl.trim());
    if (form.openingText.trim()) params.set("openingText", form.openingText.trim());
    const story = filledOrderStory(form.story);
    if (form.storyEnabled && story.length) params.set("story", JSON.stringify(story));
    if (previewImageUrls.length) params.set("gallery", previewImageUrls.join(","));
    return `/templates/${encodeURIComponent(selectedTemplate.slug)}/preview?${params.toString()}`;
  }, [form, previewImageUrls, selectedTemplate.slug]);

  useEffect(() => {
    setActiveStepIndex((current) => {
      if (!skipTemplateStep || current !== 0) return current;
      return 1;
    });
  }, [skipTemplateStep]);

  useEffect(() => {
    activeStepIndexRef.current = activeStepIndex;
  }, [activeStepIndex]);

  useEffect(() => {
    mapPickerOpenRef.current = mapPickerOpen;
  }, [mapPickerOpen]);

  useEffect(() => {
    function readSafeAreaBottom() {
      const raw = getComputedStyle(document.documentElement).getPropertyValue("--sat") || "0";
      const parsed = Number.parseInt(raw, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    }

    function syncKeyboardInset() {
      const viewport = window.visualViewport;
      if (!viewport) {
        setKeyboardInset(0);
        return;
      }
      setKeyboardInset(
        calculateKeyboardInset({
          innerHeight: window.innerHeight,
          viewportHeight: viewport.height,
          viewportOffsetTop: viewport.offsetTop,
          safeAreaBottom: readSafeAreaBottom(),
        }),
      );
    }

    syncKeyboardInset();
    window.visualViewport?.addEventListener("resize", syncKeyboardInset);
    window.visualViewport?.addEventListener("scroll", syncKeyboardInset);
    window.addEventListener("orientationchange", syncKeyboardInset);
    return () => {
      window.visualViewport?.removeEventListener("resize", syncKeyboardInset);
      window.visualViewport?.removeEventListener("scroll", syncKeyboardInset);
      window.removeEventListener("orientationchange", syncKeyboardInset);
    };
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (mapPickerOpenRef.current) {
        setMapPickerOpen(false);
        return;
      }
      if (event.state && typeof event.state.stepIndex === "number") {
        goToStep(event.state.stepIndex, { pushHistory: false });
      } else {
        const currentStep = activeStepIndexRef.current;
        const firstStep = skipTemplateStep ? 1 : 0;
        if (currentStep !== firstStep) {
          goToStep(currentStep - 1, { pushHistory: false });
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [skipTemplateStep]);

  function goToStep(index: number, { pushHistory = true }: { pushHistory?: boolean } = {}) {
    if (formRef.current) {
      const currentValues = getCurrentFormFromDom();
      setForm((current) => ({ ...current, ...currentValues }));
    }
    const nextIndex = Math.min(Math.max(skipTemplateStep ? Math.max(index, 1) : index, 0), orderWizardSteps.length - 1);
    if (orderWizardSteps[nextIndex]?.id === "review") {
      setPhotographerFieldsOpen(false);
      setStoryFieldsOpen(false);
      reviewEnteredAtRef.current = Date.now();
      finalConfirmIntentAtRef.current = 0;
    }
    setActiveStepIndex(nextIndex);
    if (pushHistory) {
      persistDraft();
      const firstStep = skipTemplateStep ? 1 : 0;
      if (nextIndex !== firstStep) {
        window.history.pushState({ stepIndex: nextIndex }, "", window.location.href);
      }
    }
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 40);
  }

  function getStepErrors(stepId: OrderWizardStepId, values: OrderFormValues = getCurrentFormFromDom()) {
    const allErrors = validateOrder(values, form.photographerEnabled, form.musicEnabled, form.musicChoice);
    const nextErrors: FieldErrors = {};
    if (stepId === "couple") {
      if (allErrors.groomName) nextErrors.groomName = allErrors.groomName;
      if (allErrors.brideName) nextErrors.brideName = allErrors.brideName;
    }
    if (stepId === "event") {
      if (allErrors.weddingDate) nextErrors.weddingDate = allErrors.weddingDate;
      if (allErrors.phone) nextErrors.phone = allErrors.phone;
    }
    if (stepId === "venue") {
      if (allErrors.venue) nextErrors.venue = allErrors.venue;
      if (allErrors.mapUrl) nextErrors.mapUrl = allErrors.mapUrl;
    }
    if (stepId === "music" && allErrors.musicUrl) nextErrors.musicUrl = allErrors.musicUrl;
    if (stepId === "extras" || stepId === "review") {
      if (allErrors.photographerFacebookUrl) nextErrors.photographerFacebookUrl = allErrors.photographerFacebookUrl;
      if (allErrors.photographerInstagramUrl) nextErrors.photographerInstagramUrl = allErrors.photographerInstagramUrl;
    }
    return nextErrors;
  }

  function canLeaveStep(stepId: OrderWizardStepId) {
    const currentValues = getCurrentFormFromDom();
    const stepErrors = getStepErrors(stepId, currentValues);
    if (showValidationErrors(stepErrors)) return false;
    if ((stepId === "extras" || stepId === "review") && showStoryValidationErrors(form)) return false;
    if (stepId === "photos") {
      const savedImages = draftImageUrls.filter((url) => url).length;
      if (savedImages < 2) {
        setState("error");
        setMessage(`ارفع صورتين على الأقل للمتابعة (${savedImages} من 2).`);
        return false;
      }
    }
    setForm((current) => ({ ...current, ...currentValues }));
    return true;
  }

  function goNext() {
    if (isLastStep) return;
    if (!canLeaveStep(activeStep.id)) return;
    goToStep(activeStepIndex + 1);
  }

  function goBack() {
    if (isFirstStep) return;
    goToStep(activeStepIndex - 1);
  }

  function openOrderPreview() {
    if (hasMediaUploadInProgress) {
      setState("error");
      setMessage("انتظر حتى يكتمل حفظ الصور والموسيقى قبل فتح المعاينة.");
      formRef.current?.querySelector<HTMLElement>(".order-upload-floating-warning")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const currentValues = getCurrentFormFromDom();
    setForm((current) => ({ ...current, ...currentValues }));
    persistDraft(
      {
        ...currentValues,
        templateSlug: selectedTemplate.slug,
        photographerEnabled: form.photographerEnabled,
        storyEnabled: form.storyEnabled,
        story: form.story,
        musicEnabled: form.musicEnabled,
        musicChoice: form.musicChoice,
      },
      draftImageUrls,
    );
    setOrderPreviewOpen(true);
  }

  function returnFromOrderPreview() {
    setOrderPreviewOpen(false);
    window.setTimeout(() => {
      formRef.current?.querySelector<HTMLElement>(".order-review-actions")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 40);
  }

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
      storyEnabled: params.get("storyEnabled") === "1" || undefined,
      story: cleanOrderStory(parseDraftJson(params.get("story"), [])),
      musicEnabled: params.has("musicEnabled") ? params.get("musicEnabled") === "1" : undefined,
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
    const story = cleanOrderStory(nextForm.story);
    if (nextForm.storyEnabled) {
      params.set("storyEnabled", "1");
      if (story.length) params.set("story", JSON.stringify(story));
    }
    if (typeof nextForm.musicEnabled === "boolean") {
      params.set("musicEnabled", nextForm.musicEnabled ? "1" : "0");
      if (nextForm.musicEnabled) params.set("musicChoice", nextForm.musicChoice || "default");
    }
    if (nextImageUrls.length) params.set("gallery", nextImageUrls.join(","));
    const url = `/order?${params.toString()}`;
    if (url === lastDraftUrlRef.current) return;
    lastDraftUrlRef.current = url;
    window.history.replaceState(null, "", url);
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
        storyEnabled: form.storyEnabled,
        story: form.story,
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
        weddingTime: typeof draft.weddingTime === "string" ? draft.weddingTime : current.weddingTime,
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
      storyEnabled: Boolean(draft.storyEnabled || filledOrderStory(draft.story).length),
        story: draft.storyEnabled || filledOrderStory(draft.story).length ? ensureMinimumOrderStoryItems(draft.story) : cleanOrderStory(draft.story),
        musicEnabled: typeof draft.musicEnabled === "boolean" ? draft.musicEnabled : current.musicEnabled,
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

  function cancelOrderStory() {
    const currentValues = getCurrentFormFromDom();
    setForm((current) => ({ ...current, ...currentValues, storyEnabled: false, story: [] }));
    setStoryErrors({});
    setStoryFieldsOpen(false);
    if (message) setMessage("");
  }

  function togglePhotographerFields() {
    const currentValues = getCurrentFormFromDom();
    setForm((current) => ({ ...current, ...currentValues, photographerEnabled: true }));
    setPhotographerFieldsOpen((current) => !current || !form.photographerEnabled);
    if (message) setMessage("");
  }

  function toggleStoryFields() {
    const currentValues = getCurrentFormFromDom();
    setForm((current) => ({ ...current, ...currentValues, storyEnabled: true, story: ensureMinimumOrderStoryItems(current.story) }));
    setStoryErrors({});
    setStoryFieldsOpen((current) => !current || !form.storyEnabled);
    if (message) setMessage("");
  }

  function selectMusicChoice(choice: MusicChoice | "none") {
    setForm((current) => ({
      ...current,
      musicEnabled: choice !== "none",
      musicChoice: choice === "none" ? "default" : choice,
      musicUrl: choice === "default" || choice === "none" ? "" : current.musicUrl,
    }));
    setErrors((current) => {
      if (!current.musicUrl) return current;
      const next = { ...current };
      delete next.musicUrl;
      return next;
    });
    if (choice === "default" || choice === "none") setMusicFileName("");
    if (message) setMessage("");
  }

  function addStoryItem() {
    const currentValues = getCurrentFormFromDom();
    setForm((current) => {
      const currentStory = ensureMinimumOrderStoryItems(current.story).slice(0, maximumOrderStoryStages);
      if (currentStory.length >= maximumOrderStoryStages) return { ...current, ...currentValues, storyEnabled: true, story: currentStory };
      return { ...current, ...currentValues, storyEnabled: true, story: [...currentStory, createOrderStoryItem()] };
    });
    if (message) setMessage("");
  }

  function updateStoryItem(index: number, patch: Partial<CoupleStoryItem>) {
    setForm((current) => ({
      ...current,
      storyEnabled: true,
      story: ensureMinimumOrderStoryItems(current.story).map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
    setStoryErrors((current) => {
      const next = { ...current };
      if ("date" in patch) delete next[storyFieldErrorKey(index, "date")];
      if ("title" in patch) delete next[storyFieldErrorKey(index, "title")];
      if ("description" in patch) delete next[storyFieldErrorKey(index, "description")];
      return next;
    });
    if (message) setMessage("");
  }

  function updateStoryText(index: number, field: "date" | "title" | "description", value: string) {
    updateStoryItem(index, { [field]: value });
  }

  function applyStoryPreset(index: number, presetId: string) {
    const preset = orderStoryPresets.find((item) => item.id === presetId);
    if (!preset) return;
    updateStoryItem(index, {
      date: preset.date,
      title: preset.title,
      description: preset.description,
    });
  }

  function removeStoryItem(index: number) {
    setForm((current) => {
      const currentValues = getCurrentFormFromDom();
      const nextStory = cleanOrderStory(current.story).filter((_, itemIndex) => itemIndex !== index);
      return nextStory.length ? { ...current, ...currentValues, story: nextStory, storyEnabled: current.storyEnabled } : { ...current, ...currentValues, story: [], storyEnabled: false };
    });
    setActiveStoryIndex((current) => Math.max(0, Math.min(current, cleanOrderStory(form.story).length - 2)));
    setStoryErrors({});
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

  function getCurrentFormFromDom(): OrderFormValues {
    const formData = new FormData(formRef.current || undefined);
    return {
      groomName: String(formData.get("groomName") || "").trim(),
      brideName: String(formData.get("brideName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      weddingDate: String(formData.get("weddingDate") || "").trim(),
      weddingTime: String(formData.get("weddingTime") || "07:00 مساءً").trim(),
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

  async function handleOrderMusicFile(file?: File | null) {
    setMusicFileName(file?.name || "");
    if (!file) return;
    setMusicUploadBusy(true);
    setState("idle");
    setMessage("جاري حفظ ملف الموسيقى للمعاينة.");
    try {
      const musicDataUrl = await readFileAsDataUrl(file);
      const response = await fetch("/api/orders/preview-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ music: musicDataUrl }),
      });
      const data = (await response.json().catch(() => null)) as { musicUrl?: string; error?: string } | null;
      if (!response.ok || !data?.musicUrl) throw new Error(data?.error || "تعذر حفظ ملف الموسيقى.");
      updateField("musicUrl", data.musicUrl);
      updateField("musicChoice", "upload");
      setMessage("تم حفظ الموسيقى وستعمل داخل المعاينة والدعوة.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "تعذر حفظ ملف الموسيقى.");
    } finally {
      setMusicUploadBusy(false);
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
    if (form.musicUrl.startsWith("/uploads/music/")) return "";
    const rawFile = formData.get("orderMusicFile");
    if (rawFile instanceof File && rawFile.size > 0) return readFileAsDataUrl(rawFile);
    return "";
  }

  function getEffectiveOrderMusicState(values: OrderMusicState, uploadedMusic = ""): OrderMusicState {
    if (!values.musicEnabled) return { musicEnabled: false, musicChoice: "default", musicUrl: "" };
    const musicUrl = values.musicUrl.trim();
    if (values.musicChoice === "default") return { musicEnabled: true, musicChoice: "default", musicUrl: "" };
    if (values.musicChoice === "upload") {
      return uploadedMusic || musicUrl ? { musicEnabled: true, musicChoice: "upload", musicUrl } : { musicEnabled: true, musicChoice: "default", musicUrl: "" };
    }
    if (values.musicChoice === "video") {
      return musicUrl ? { musicEnabled: true, musicChoice: "video", musicUrl } : { musicEnabled: true, musicChoice: "default", musicUrl: "" };
    }
    return musicUrl ? { musicEnabled: true, musicChoice: "url", musicUrl } : { musicEnabled: true, musicChoice: "default", musicUrl: "" };
  }

  function validateOrder(values: OrderFormValues, photographerEnabled = form.photographerEnabled, musicEnabled = form.musicEnabled, musicChoice = form.musicChoice) {
    const nextErrors: FieldErrors = {};
    if (!values.groomName) nextErrors.groomName = "اكتب اسم العريس كما تحب ظهوره في الدعوة.";
    if (!values.brideName) nextErrors.brideName = "اكتب اسم العروس كما تحب ظهوره في الدعوة.";
    if (!values.phone) nextErrors.phone = "رقم الهاتف مطلوب.";
    else if (/[\u0660-\u0669\u06F0-\u06F9]/.test(values.phone)) nextErrors.phone = "رقم الهاتف يجب أن يكون بالأرقام الإنجليزية.";
    else if (!/^01\d{9}$/.test(values.phone)) nextErrors.phone = "رقم الهاتف غير صحيح.";
    if (!values.weddingDate) nextErrors.weddingDate = "اختار تاريخ المناسبة من التقويم.";
    else if (!normalizeWeddingDate(values.weddingDate)) nextErrors.weddingDate = "اختار تاريخ صحيح من التقويم.";
    if (!values.venue) nextErrors.venue = "اكتب مكان الحفل أو اسم القاعة.";
    if (values.mapUrl && !isValidOptionalUrl(values.mapUrl)) nextErrors.mapUrl = "رابط موقع القاعه لازم يبدأ بـ https://";
    if (photographerEnabled && !isValidOptionalUrl(values.photographerFacebookUrl)) nextErrors.photographerFacebookUrl = "رابط Facebook لازم يبدأ بـ https://";
    if (photographerEnabled && !isValidOptionalUrl(values.photographerInstagramUrl)) nextErrors.photographerInstagramUrl = "رابط Instagram لازم يبدأ بـ https://";
    if (musicEnabled && musicChoice === "url" && values.musicUrl && !isPlayableAudioUrl(values.musicUrl)) nextErrors.musicUrl = "رابط الموسيقى لازم يكون مباشر مثل mp3 أو m4a أو wav.";
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

  function validateOrderStory(values: Pick<FormState, "storyEnabled" | "story"> = form) {
    const nextErrors: StoryFieldErrors = {};
    if (!values.storyEnabled) return nextErrors;
    ensureMinimumOrderStoryItems(values.story).forEach((item, index) => {
      if (!item.date.trim()) nextErrors[storyFieldErrorKey(index, "date")] = "اكتب تاريخ هذه المرحلة أو وقتها.";
      if (!item.title.trim()) nextErrors[storyFieldErrorKey(index, "title")] = "اكتب عنوان هذه المرحلة.";
      if (!item.description.trim()) nextErrors[storyFieldErrorKey(index, "description")] = "اكتب وصفاً قصيراً لهذه المرحلة.";
    });
    return nextErrors;
  }

  function showStoryValidationErrors(values: Pick<FormState, "storyEnabled" | "story"> = form) {
    const nextErrors = validateOrderStory(values);
    setStoryErrors(nextErrors);
    const entries = Object.entries(nextErrors);
    if (!entries.length) return false;
    setState("error");
    setMessage("كمل بيانات قصة العروسين في المرحلتين أو الغِ القصة عشان تقدر تعاين أو تأكد الطلب.");
    const [firstKey] = entries[0] || [];
    const [index, field] = firstKey.split(":");
    window.setTimeout(() => {
      const element = formRef.current?.querySelector<HTMLElement>(`[name="story${field ? `${field[0]?.toUpperCase()}${field.slice(1)}` : "Title"}-${index}"]`);
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

  async function submitOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const now = Date.now();
    const isFinalConfirmButton = submitter instanceof HTMLButtonElement && submitter.dataset.orderConfirm === "true";
    const hasFreshFinalIntent = isFinalConfirmButton && now - finalConfirmIntentAtRef.current < 2000;
    if (activeStep.id !== "review") {
      goNext();
      return;
    }
    if (now - reviewEnteredAtRef.current < 700 || !hasFreshFinalIntent) {
      setState("error");
      setMessage("لا يتم تأكيد الدعوة إلا بعد الضغط على زر الانتهاء وتأكيد الدعوة.");
      formRef.current?.querySelector<HTMLElement>(".order-review-actions")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (state === "loading") return;
    if (hasMediaUploadInProgress) {
      setState("error");
      setMessage("انتظر حتي يكتمل رفع الصور والموسيقى الي الدعوه وبعدها اكمل");
      formRef.current?.querySelector<HTMLElement>(".order-upload-floating-warning")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
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
      phone: String(formData.get("phone") || "").trim(),
      weddingDate: normalizeWeddingDate(rawWeddingDate) || rawWeddingDate,
      weddingTime: String(formData.get("weddingTime") || "07:00 مساءً").trim(),
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
    if (showStoryValidationErrors(currentForm)) return;
    setState("loading");
    setMessage("جاري التأكد من حفظ الصور قبل تأكيد الدعوة.");

    try {
      const orderImages = await getOrderImageDataUrls(formData);
      if (orderImages.length < 2) {
        setState("error");
        setMessage(`ارفع صورتين على الأقل للدعوة (${orderImages.length} من 2).`);
        return;
      }
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
      const effectiveMusic = getEffectiveOrderMusicState(currentForm, orderMusic);
      const effectiveForm = { ...currentForm, ...effectiveMusic };
      const photographerNotes = getPhotographerNotes(effectiveForm);
      const clientMusicNotes = getMusicNotes(effectiveForm, effectiveMusic.musicUrl || (orderMusic ? "ملف موسيقى مرفوع مع الطلب" : ""));
      const story = effectiveForm.storyEnabled ? filledOrderStory(effectiveForm.story) : [];
      const storyNotes = getStoryNotes({ ...effectiveForm, story });
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...effectiveForm,
          story,
          notes: [photographerNotes, clientMusicNotes, storyNotes].filter(Boolean).join("\n\n"),
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

      const data = (await response.json().catch(() => null)) as {
        whatsappUrl?: string;
        imageUrls?: string[];
        musicUrl?: string;
        orderNumber?: string;
        invitationCode?: string;
      } | null;
      try {
        window.sessionStorage?.removeItem(orderDraftStorageKey);
      } catch {}
      orderSubmitKeyRef.current = "";
      finalConfirmIntentAtRef.current = 0;
      const whatsappUrl = data?.whatsappUrl || "https://wa.me/";
      const successParams = new URLSearchParams();
      if (data?.orderNumber) successParams.set("orderNumber", data.orderNumber);
      if (data?.invitationCode) successParams.set("invitationCode", data.invitationCode);
      try {
        window.sessionStorage?.setItem(
          "badrdaawa-order-success",
          JSON.stringify({
            whatsappUrl,
            orderNumber: data?.orderNumber || "",
            invitationCode: data?.invitationCode || "",
            groomName: currentForm.groomName,
            brideName: currentForm.brideName,
            weddingDate: readableDate || currentForm.weddingDate,
            venue: currentForm.venue,
            templateName: selectedTemplate.arabicName,
            ...(showPaymentMethods ? { paymentMethod: form.paymentMethod } : {}),
            musicChoice: form.musicChoice,
            photographerEnabled: form.photographerEnabled,
            storyEnabled: form.storyEnabled,
          }),
        );
      } catch {
        successParams.set("whatsappUrl", whatsappUrl);
      }
      window.location.href = `/order/success${successParams.size ? `?${successParams.toString()}` : ""}`;
    } catch {
      setState("error");
      setMessage("تعذر إرسال الطلب للخادم. حاول مرة أخرى.");
    }
  }

  function renderOpeningTextFields() {
    return (
      <div className="order-customization-fields">
        <div className="field">
          <label htmlFor="openingText">نص الافتتاح السينمائي</label>
          <textarea
            id="openingText"
            name="openingText"
            rows={3}
            placeholder="مثال: بعض الحكايات تبدأ بنظرة، وحكايتنا تبدأ اليوم..."
            value={form.openingText}
            onChange={(event) => updateField("openingText", event.target.value)}
          />
        </div>
      </div>
    );
  }

  function renderPhotographerFields() {
    return (
      <div className="photographer-fields order-customization-fields">
        <div className="order-fields-toolbar">
          <strong>معلومات الفوتوغرافي</strong>
          <button
            type="button"
            onClick={() => {
              updateField("photographerEnabled", false);
              setPhotographerFieldsOpen(false);
            }}
          >
            إلغاء
          </button>
        </div>
        <div className="field">
          <label htmlFor="photographerName">اسم المصور الفوتوغرافي</label>
          <input id="photographerName" name="photographerName" autoComplete="name" placeholder="اختياري" value={form.photographerName} onChange={(event) => updateField("photographerName", event.target.value)} />
        </div>
        <div className={`field ${errors.photographerFacebookUrl ? "has-error" : ""}`}>
          <label htmlFor="photographerFacebookUrl">رابط Facebook</label>
          <input id="photographerFacebookUrl" name="photographerFacebookUrl" type="url" inputMode="url" autoComplete="url" placeholder="https://facebook.com/..." value={form.photographerFacebookUrl} onChange={(event) => updateField("photographerFacebookUrl", event.target.value)} aria-invalid={Boolean(errors.photographerFacebookUrl)} />
          {errors.photographerFacebookUrl ? <small className="field-error">{errors.photographerFacebookUrl}</small> : null}
        </div>
        <div className={`field ${errors.photographerInstagramUrl ? "has-error" : ""}`}>
          <label htmlFor="photographerInstagramUrl">رابط Instagram</label>
          <input id="photographerInstagramUrl" name="photographerInstagramUrl" type="url" inputMode="url" autoComplete="url" placeholder="https://instagram.com/..." value={form.photographerInstagramUrl} onChange={(event) => updateField("photographerInstagramUrl", event.target.value)} aria-invalid={Boolean(errors.photographerInstagramUrl)} />
          {errors.photographerInstagramUrl ? <small className="field-error">{errors.photographerInstagramUrl}</small> : null}
        </div>
      </div>
    );
  }

  function renderStoryFields() {
    return (
      <div className="order-story-fields order-customization-fields">
        <div className="order-story-head">
          <p>اكتب مرحلتين على الأقل. على الهاتف ركّز في مرحلة واحدة كل مرة، والباقي محفوظ تحت.</p>
          <button className="btn btn-soft order-story-cancel-button" type="button" onClick={cancelOrderStory}>
            إلغاء
          </button>
        </div>
        <div className="order-story-stage-tabs" role="tablist" aria-label="مراحل قصة العروسين">
          {storyItems.map((item, index) => (
            <button
              className={index === visibleStoryIndex ? "active" : ""}
              key={item.id || index}
              type="button"
              role="tab"
              aria-selected={index === visibleStoryIndex}
              onClick={() => setActiveStoryIndex(index)}
            >
              <span>{index + 1}</span>
              <strong>{item.title || `مرحلة ${index + 1}`}</strong>
            </button>
          ))}
        </div>
        <div className="order-story-list">
          {storyItems.map((item, index) => {
            const example = orderStoryExamples[index] || orderStoryExamples[orderStoryExamples.length - 1];
            const dateError = storyErrors[storyFieldErrorKey(index, "date")];
            const titleError = storyErrors[storyFieldErrorKey(index, "title")];
            const descriptionError = storyErrors[storyFieldErrorKey(index, "description")];
            return (
              <article className={`order-story-item ${index === visibleStoryIndex ? "is-active-story" : ""}`} key={item.id || index}>
                <div className="order-story-item-head">
                  <strong>مرحلة {index + 1} من {storyItems.length}</strong>
                  <button className="admin-icon-button order-story-remove-button" type="button" onClick={() => removeStoryItem(index)} title="حذف المرحلة" aria-label={`حذف مرحلة ${index + 1}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="order-story-preset-bubbles" aria-label={`اقتراحات جاهزة لمرحلة ${index + 1}`}>
                  {orderStoryPresets.map((preset) => (
                    <button key={preset.id} type="button" onClick={() => applyStoryPreset(index, preset.id)}>
                      {preset.title}
                    </button>
                  ))}
                </div>
                <div className="field">
                  <label htmlFor={`storyDate-${index}`}>التاريخ أو اسم اللحظة</label>
                  <input id={`storyDate-${index}`} name={`storyDate-${index}`} value={item.date || ""} onChange={(event) => updateStoryText(index, "date", event.target.value)} placeholder={example.date} aria-invalid={Boolean(dateError)} />
                  {dateError ? <small className="field-error">{dateError}</small> : null}
                </div>
                <div className="field">
                  <label htmlFor={`storyTitle-${index}`}>العنوان</label>
                  <input id={`storyTitle-${index}`} name={`storyTitle-${index}`} value={item.title} onChange={(event) => updateStoryText(index, "title", event.target.value)} placeholder={example.title} aria-invalid={Boolean(titleError)} />
                  {titleError ? <small className="field-error">{titleError}</small> : null}
                </div>
                <div className="field full">
                  <label htmlFor={`storyDescription-${index}`}>الوصف</label>
                  <textarea id={`storyDescription-${index}`} name={`storyDescription-${index}`} rows={3} value={item.description} aria-invalid={Boolean(descriptionError)} onChange={(event) => updateStoryText(index, "description", event.target.value)} placeholder={example.description} />
                  {descriptionError ? <small className="field-error">{descriptionError}</small> : null}
                </div>
                <div className="order-story-mobile-actions">
                  <button className="btn btn-glass" type="button" onClick={() => setActiveStoryIndex(Math.max(0, index - 1))} disabled={index === 0}>
                    السابق
                  </button>
                  <button className="btn btn-soft" type="button" onClick={() => setActiveStoryIndex(Math.min(storyItems.length - 1, index + 1))} disabled={index >= storyItems.length - 1}>
                    المرحلة التالية
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        {storyItems.length < maximumOrderStoryStages ? (
          <button className="btn btn-soft order-story-add-button" type="button" onClick={() => {
            addStoryItem();
            setActiveStoryIndex(storyItems.length);
          }}>
            <Plus size={16} />
            إضافة مرحلة
          </button>
        ) : (
          <p className="field-preview">تم الوصول إلى الحد الأقصى: 4 مراحل.</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`order-flow order-wizard-flow ${keyboardInset > 0 ? "is-keyboard-open" : ""} ${focusedFieldName ? "has-focused-field" : ""}`}
      style={{
        "--order-keyboard-inset": `${keyboardInset}px`,
      } as CSSProperties}
    >
      {hasMediaUploadInProgress ? (
        <div className="order-upload-floating-warning" role="status" aria-live="polite">
          <Loader2 size={18} className="animate-float" />
          <span>انتظر حتي يكتمل رفع الصور والموسيقى الي الدعوه وبعدها اكمل</span>
          <strong>{uploadingImageCount + (hasMusicUploadInProgress ? 1 : 0)}</strong>
        </div>
      ) : null}

      <div className="order-wizard-layout">
        <form
          className="form-panel details-form order-simple-form order-wizard-card"
          onSubmit={submitOrder}
          onInput={persistCurrentDomDraft}
          onFocusCapture={(event) => {
            const target = event.target;
            if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement)) return;
            setFocusedFieldName(target.name || target.id || "field");
            window.setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "center" }), 90);
          }}
          onBlurCapture={() => {
            window.setTimeout(() => {
              const active = document.activeElement;
              if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
              setFocusedFieldName("");
            }, 80);
          }}
          ref={formRef}
          noValidate
        >
          <header className="order-wizard-header">
            <div>
              <span>خطوة {activeStepIndex + 1} من {orderWizardSteps.length}</span>
              <h2>{activeStep.title}</h2>
              <p className="order-wizard-trust-note">يتم حفظ بياناتك تلقائياً أثناء الكتابة، ويمكنك مراجعة كل شيء قبل تأكيد الدعوة.</p>
            </div>
            <strong>{progressPercent}%</strong>
          </header>

          <div className="order-progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>

          <nav className="order-step-tabs" aria-label="خطوات إنشاء الدعوة">
            {orderWizardSteps.map((step, index) => {
              const done = index < activeStepIndex;
              const active = index === activeStepIndex;
              return (
                <button
                  className={`${active ? "active" : ""} ${done ? "done" : ""}`}
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (index <= activeStepIndex || canLeaveStep(activeStep.id)) goToStep(index);
                  }}
                  aria-current={active ? "step" : undefined}
                  disabled={skipTemplateStep && index === 0}
                >
                  <span>{done ? <Check size={13} /> : index + 1}</span>
                  <strong>{step.title}</strong>
                  <small>{active ? "الحالية" : done ? "تمت" : index === activeStepIndex + 1 ? "التالية" : ""}</small>
                </button>
              );
            })}
          </nav>

          {message ? (
            <div className={`order-alert ${state === "error" ? "danger" : "success"}`} role="alert">
              <strong>{state === "error" ? "فيه بيانات محتاجة مراجعة" : "تمام"}</strong>
              <p>{message}</p>
            </div>
          ) : null}

          <input type="hidden" name="templateSlug" value={form.templateSlug} />

          <section className={`order-wizard-step ${activeStep.id === "template" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "template"}>
            <div className="order-step-copy">
              <p>اختار شكل الدعوة الذي سيظهر للضيوف. يمكنك تغييره لاحقاً من المراجعة.</p>
            </div>
            <div className="order-template-card-grid">
              {templates.map((template) => (
                <button
                  className={`order-template-card ${template.slug === form.templateSlug ? "active" : ""}`}
                  key={template.slug}
                  type="button"
                  onClick={() => updateField("templateSlug", template.slug)}
                >
                  <span className="order-template-thumb">
                    <img src={template.previewImage} alt="" loading="lazy" />
                  </span>
                  <span>
                    <strong>{template.arabicName}</strong>
                    <small>{template.name}</small>
                  </span>
                  {template.slug === form.templateSlug ? <Check size={18} /> : null}
                </button>
              ))}
            </div>
            <div className="field order-language-field">
              <label htmlFor="language">
                <LayoutTemplate size={16} />
                لغة الدعوة
              </label>
              <select id="language" name="language" value={form.language} onChange={(event) => updateField("language", event.target.value === "en" ? "en" : "ar")}>
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>
          </section>

          <section className={`order-wizard-step ${activeStep.id === "couple" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "couple"}>
            <div className="input-grid order-compact-grid">
              <div className={`field ${errors.groomName ? "has-error" : ""}`}>
                <label htmlFor="groomName">
                  <UserRound size={16} />
                  اسم العريس
                </label>
                <input id="groomName" name="groomName" autoComplete="given-name" placeholder="مثال: محمد" value={form.groomName} onChange={(event) => updateField("groomName", event.target.value)} required aria-invalid={Boolean(errors.groomName)} aria-describedby={errors.groomName ? "groomName-error" : undefined} />
                {errors.groomName ? <small className="field-error" id="groomName-error">{errors.groomName}</small> : null}
              </div>

              <div className={`field ${errors.brideName ? "has-error" : ""}`}>
                <label htmlFor="brideName">
                  <UserRound size={16} />
                  اسم العروس
                </label>
                <input id="brideName" name="brideName" autoComplete="given-name" placeholder="مثال: ندي" value={form.brideName} onChange={(event) => updateField("brideName", event.target.value)} required aria-invalid={Boolean(errors.brideName)} aria-describedby={errors.brideName ? "brideName-error" : undefined} />
                {errors.brideName ? <small className="field-error" id="brideName-error">{errors.brideName}</small> : null}
              </div>

            </div>
          </section>

          <section className={`order-wizard-step ${activeStep.id === "event" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "event"}>
            <div className="input-grid order-compact-grid">
              <div className={`field ${errors.weddingDate ? "has-error" : ""}`}>
                <label htmlFor="weddingDate">
                  <CalendarDays size={16} />
                  تاريخ المناسبة
                </label>
                <input id="weddingDate" name="weddingDate" type="date" value={normalizedDate || form.weddingDate} onChange={(event) => updateField("weddingDate", event.target.value)} required aria-invalid={Boolean(errors.weddingDate)} aria-describedby={errors.weddingDate ? "weddingDate-error weddingDate-hint" : "weddingDate-hint"} />
                {readableDate ? <small className="field-preview" id="weddingDate-hint">هيظهر في الدعوة: {readableDate}</small> : null}
                {errors.weddingDate ? <small className="field-error" id="weddingDate-error">{errors.weddingDate}</small> : null}
              </div>

              <div className={`field`}>
                <label htmlFor="weddingTime">
                  <Clock size={16} />
                  وقت المناسبة
                </label>
                <select
                  id="weddingTime"
                  name="weddingTime"
                  value={form.weddingTime}
                  onChange={(event) => updateField("weddingTime", event.target.value)}
                >
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
              </div>

              <div className={`field ${errors.phone ? "has-error" : ""}`}>
                <label htmlFor="phone">
                  <Phone size={16} />
                  رقم الهاتف
                </label>
                <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="مثال: 01000000000" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} required aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? "phone-error" : undefined} />
                <small className="field-preview">يساعدنا على متابعة الطلب والتأكيد.</small>
                {errors.phone ? <small className="field-error" id="phone-error">{errors.phone}</small> : null}
              </div>
            </div>
          </section>

          <section className={`order-wizard-step ${activeStep.id === "venue" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "venue"}>
            <div className="input-grid order-compact-grid">
              <div className={`field ${errors.venue ? "has-error" : ""}`}>
                <label htmlFor="venue">
                  <MapPin size={16} />
                  اسم القاعة
                </label>
                <input id="venue" name="venue" placeholder="مثال: قاعة رويال - البحيرة" value={form.venue} onChange={(event) => updateField("venue", event.target.value)} required aria-invalid={Boolean(errors.venue)} aria-describedby={errors.venue ? "venue-error" : undefined} />
                {errors.venue ? <small className="field-error" id="venue-error">{errors.venue}</small> : null}
              </div>

              <div className={`field ${errors.mapUrl ? "has-error" : ""}`}>
                <label htmlFor="mapUrl">
                  <Link2 size={16} />
                  رابط اللوكيشن <span className="field-optional-badge">اختياري</span>
                </label>
                <input id="mapUrl" name="mapUrl" type="url" inputMode="url" autoComplete="url" placeholder="انسخ رابط Google Maps للقاعة أو الـ pin" value={form.mapUrl} onChange={(event) => updateField("mapUrl", event.target.value)} aria-invalid={Boolean(errors.mapUrl)} aria-describedby={errors.mapUrl ? "mapUrl-error mapUrl-hint" : "mapUrl-hint"} />
                <small className="field-preview" id="mapUrl-hint">إضافة موقع القاعة تساعد الضيوف على الوصول بسهولة، ويمكنك إضافته لاحقاً أثناء تجهيز الدعوة.</small>
                {errors.mapUrl ? <small className="field-error" id="mapUrl-error">{errors.mapUrl}</small> : null}
              </div>
            </div>

            <button className="location-picker-trigger" type="button" onClick={() => {
              setMapPickerOpen(true);
              window.history.pushState({ modal: "map-picker", stepIndex: activeStepIndex }, "");
            }}>
              <MapPin size={16} />
              اختياري: حدد المكان من الخريطة بدل نسخ الرابط
            </button>

            <div className="order-location-preview">
              <MapPin size={19} />
              <div>
                <strong>{fieldValue(form.venue, "سيظهر اسم القاعة هنا")}</strong>
                <span>{form.mapUrl ? "تم إضافة رابط اللوكيشن وسيظهر داخل الدعوة." : "يمكنك ترك الرابط فارغاً وإضافته لاحقاً."}</span>
              </div>
            </div>

            {selectedLocation ? (
              <div className="order-location-preview order-location-selected">
                <MapPin size={19} />
                <div>
                  <strong>📍 الموقع المختار:</strong>
                  <span>{selectedLocation.placeName}{selectedLocation.city ? ` — ${selectedLocation.city}` : ""}</span>
                </div>
              </div>
            ) : null}
          </section>

          <section className={`order-wizard-step ${activeStep.id === "photos" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "photos"}>
            <section className="order-compact-images" aria-labelledby="order-images-title">
              <div className="order-compact-section-head">
                <h2 id="order-images-title">رفع الصور</h2>
                <p>ارفع حتى 3 صور للدعوة. يتم ضغط الصور تلقائياً للحفاظ على الجودة وسرعة التحميل.</p>
              </div>
              <div className="compact-image-grid">
                {orderImageSlots.map((slot, index) => (
                  <div className="compact-image-card" key={slot.title}>
                    <CompactOrderImageInput
                      index={index}
                      defaultImage={draftImageUrls[index]}
                      upload={imageUploads[index] || createIdleUploadState(draftImageUrls[index])}
                      onFileSelected={handleOrderImageSelected}
                      onClearDefault={() => clearOrderImage(index)}
                    />
                  </div>
                ))}
              </div>
              <p className="field-preview">انتظر علامة تم الحفظ قبل تأكيد الطلب، ويمكنك استبدال أي صورة بسهولة.</p>
            </section>
          </section>

          <section className={`order-wizard-step ${activeStep.id === "music" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "music"}>
            <section className="order-music-box">
              <div className={`order-music-default-card ${form.musicEnabled && form.musicChoice === "default" ? "active" : ""}`}>
                <Music2 size={22} />
                <div>
                  <strong>{form.musicEnabled && form.musicChoice === "default" ? "الموسيقى الافتراضية مفعلة" : form.musicEnabled ? "تم تغيير إعدادات الموسيقى" : "الموسيقى متوقفة"}</strong>
                  <span>يمكنك المتابعة مباشرة، أو تغيير الإعدادات عند الحاجة.</span>
                </div>
                <button className="btn btn-soft" type="button" onClick={() => setMusicSettingsOpen((current) => !current)}>
                  تغيير إعدادات الموسيقى
                </button>
              </div>

              {musicSettingsOpen ? (
                <div className="order-music-fields">
                  <div className="order-music-choice-grid">
                    <div className="order-music-choice-item">
                      <button className={form.musicEnabled && form.musicChoice === "default" ? "active" : ""} type="button" role="radio" aria-checked={form.musicEnabled && form.musicChoice === "default"} onClick={() => selectMusicChoice("default")}>
                        <Music2 size={16} />
                        الموسيقى الأساسية
                      </button>
                    </div>
                    <div className="order-music-choice-item">
                      <button className={form.musicEnabled && form.musicChoice === "upload" ? "active" : ""} type="button" role="radio" aria-checked={form.musicEnabled && form.musicChoice === "upload"} onClick={() => selectMusicChoice("upload")}>
                        <UploadCloud size={16} />
                        رفع MP3
                      </button>
                      {form.musicEnabled && form.musicChoice === "upload" ? (
                        <label className="order-music-upload">
                          {musicUploadBusy ? <Loader2 size={17} className="animate-float" /> : <UploadCloud size={17} />}
                          <span>
                            <strong>{musicUploadBusy ? "جاري حفظ ملف الموسيقى..." : "ارفع ملف MP3"}</strong>
                            <small>{musicFileName || form.musicUrl || "mp3"}</small>
                          </span>
                          <input name="orderMusicFile" type="file" accept={acceptedAudioFormats} disabled={musicUploadBusy} onChange={(event) => { void handleOrderMusicFile(event.target.files?.[0]); }} />
                        </label>
                      ) : null}
                    </div>
                    <div className="order-music-choice-item">
                      <button className={form.musicEnabled && form.musicChoice === "video" ? "active" : ""} type="button" role="radio" aria-checked={form.musicEnabled && form.musicChoice === "video"} onClick={() => selectMusicChoice("video")}>
                        <FileVideo size={16} />
                        صوت من فيديو
                      </button>
                      {form.musicEnabled && form.musicChoice === "video" ? (
                        <label className="order-music-upload">
                          {musicVideoBusy ? <Loader2 size={17} /> : <FileVideo size={17} />}
                          <span>
                            <strong>{musicVideoBusy ? "جاري استخراج الصوت..." : "ارفع فيديو لاستخراج الصوت"}</strong>
                            <small>{musicFileName || form.musicUrl || "MP4 / MOV / WEBM"}</small>
                            <small>يمكنك رفع فيديو وسيتم استخراج الموسيقى منه تلقائياً واستخدامها داخل الدعوة.</small>
                          </span>
                          <input type="file" accept={acceptedVideoFormats} disabled={musicVideoBusy} onChange={(event) => handleOrderMusicVideoFile(event.target.files?.[0])} />
                        </label>
                      ) : null}
                    </div>
                    <div className="order-music-choice-item">
                      <button className={form.musicEnabled && form.musicChoice === "url" ? "active" : ""} type="button" role="radio" aria-checked={form.musicEnabled && form.musicChoice === "url"} onClick={() => selectMusicChoice("url")}>
                        <Link2 size={16} />
                        رابط أغنية
                      </button>
                      {form.musicEnabled && form.musicChoice === "url" ? (
                        <div className={`field ${errors.musicUrl ? "has-error" : ""}`}>
                          <label htmlFor="musicUrl">رابط أغنية مباشر</label>
                          <input id="musicUrl" name="musicUrl" type="url" inputMode="url" autoComplete="url" placeholder="https://example.com/song.mp3" value={form.musicUrl} onChange={(event) => updateField("musicUrl", event.target.value)} aria-invalid={Boolean(errors.musicUrl)} />
                          {errors.musicUrl ? <small className="field-error">{errors.musicUrl}</small> : <small className="order-music-url-hint">ليس رابط فيديو بل موسيقى فقط</small>}
                        </div>
                      ) : null}
                    </div>
                    <div className="order-music-choice-item">
                      <button className={!form.musicEnabled ? "active" : ""} type="button" role="radio" aria-checked={!form.musicEnabled} onClick={() => selectMusicChoice("none")}>
                        <Music2 size={16} />
                        إيقاف الموسيقى
                      </button>
                    </div>
                  </div>

                  {(form.musicChoice === "upload" || form.musicChoice === "video") && form.musicUrl ? (
                    <audio className="order-music-audio-preview" controls preload="metadata" src={form.musicUrl} />
                  ) : null}
                </div>
              ) : null}
            </section>
          </section>

          <section className={`order-wizard-step ${activeStep.id === "extras" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "extras"}>
            <div className="order-extras-grid">
              <button className={`order-extra-card ${form.photographerEnabled ? "is-added" : ""} ${photographerFieldsOpen ? "is-open" : ""}`} type="button" onClick={togglePhotographerFields} aria-expanded={photographerFieldsOpen}>
                <Camera size={20} />
                <span>
                  <strong>معلومات الفوتوغرافي</strong>
                  <small>{form.photographerEnabled ? fieldValue(form.photographerName, "تمت إضافته") : "اختياري"}</small>
                </span>
              </button>

              <button className={`order-extra-card order-extra-story-card ${form.storyEnabled ? "is-added" : ""} ${storyFieldsOpen ? "is-open" : ""}`} type="button" onClick={toggleStoryFields} aria-expanded={storyFieldsOpen}>
                <Heart size={20} />
                <span>
                  <strong>حكايتكم الخاصة</strong>
                  <small>{form.storyEnabled ? `${filledOrderStory(form.story).length || minimumOrderStoryStages} مراحل` : "اختيارية"}</small>
                </span>
                <em>مهم ولكن اختياري</em>
              </button>
            </div>

            {photographerFieldsOpen && form.photographerEnabled ? renderPhotographerFields() : null}
            {storyFieldsOpen && form.storyEnabled ? renderStoryFields() : null}
          </section>

          <section className={`order-wizard-step ${activeStep.id === "review" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "review"}>
            <div className="order-review-final-note" role="note">
              وصلت للمرحلة الأخيرة. راجع البيانات الأساسية ثم اضغط تأكيد الدعوة بثقة.
            </div>
            <div className="order-review-confidence" role="note">
              <span>
                <Check size={15} />
                البيانات المطلوبة ظاهرة أمامك
              </span>
              <span>
                <Check size={15} />
                يمكنك تعديل أي بند بالضغط عليه
              </span>
              <span>
                <Check size={15} />
                الطلب لن يتوقف إذا لم تضف رابط الموقع الآن
              </span>
            </div>
            <div className="order-review-grid">
              {(() => {
                const musicLabel = !form.musicEnabled ? "بدون موسيقى"
                  : form.musicChoice === "default" || !form.musicUrl ? "الموسيقى الأساسية"
                  : form.musicChoice === "upload" ? "ملف MP3"
                  : form.musicChoice === "video" ? "صوت من فيديو"
                  : "رابط أغنية";
                const imagesIncomplete = previewImageUrls.length < 2;
                const imageLabel = hasMediaUploadInProgress ? "جاري حفظ الملفات" : imagesIncomplete ? `⚠️ ${previewImageUrls.length} من 3` : `${previewImageUrls.length} من 3`;
                return [
                  ["القالب", selectedTemplate.arabicName, 0],
                  ["الأسماء", `${fieldValue(form.groomName)} و ${fieldValue(form.brideName)}`, 1],
                  ["التاريخ", readableDate || "لم يحدد بعد", 2],
                  ["الهاتف", fieldValue(form.phone), 2],
                  ["مكان الحفل", form.venue.trim() ? "تمت إضافته" : "غير مضاف", 3],
                  ["موقع القاعة", form.mapUrl.trim() ? "تمت إضافته" : "⚠️ لم يتم إضافة موقع القاعة بعد", 3],
                  ["الصور", imageLabel, 4],
                  ["الموسيقى", musicLabel, 5],
                ].map(([label, value, step]) => (
                  <button className={`order-review-item ${label === "موقع القاعة" && !form.mapUrl.trim() ? "order-review-location-warning" : ""} ${label === "الصور" && (imagesIncomplete || hasMediaUploadInProgress) ? "order-review-location-warning order-review-photos-warning" : ""}`} key={String(label)} type="button" onClick={() => goToStep(Number(step))}>
                    <span>✓ {label}</span>
                    <strong>{value}</strong>
                    {label === "موقع القاعة" && !form.mapUrl.trim() ? <small>إضافة الموقع تساعد الضيوف، ويمكن إضافته لاحقاً.</small> : null}
                    {label === "الصور" && hasMediaUploadInProgress ? <small>الصور أو الموسيقى مازالت قيد الحفظ. انتظر لحظة ثم أكد الدعوة.</small> : null}
                    {label === "الصور" && imagesIncomplete && !hasMediaUploadInProgress ? <small>صورتان مطلوبة والثالثة اختيارية.</small> : null}
                  </button>
                ));
              })()}

              <button className="order-review-item order-review-item-optional" type="button" onClick={() => setOpeningTextOpen((current) => !current)}>
                <span>♡ نص الافتتاح</span>
                <strong>{form.openingText.trim() ? "تمت إضافته" : "غير مضاف"}</strong>
              </button>
              {openingTextOpen ? renderOpeningTextFields() : null}

              <button
                className="order-review-item order-review-item-optional"
                type="button"
                onClick={() => {
                  if (form.storyEnabled) {
                    setStoryFieldsOpen((current) => !current);
                    return;
                  }
                  goToStep(6);
                }}
                aria-expanded={storyFieldsOpen && form.storyEnabled}
              >
                <span>♡ قصة العروسين</span>
                <strong>{form.storyEnabled ? `${filledOrderStory(form.story).length || minimumOrderStoryStages} مراحل` : "غير مضافة"}</strong>
              </button>
              {storyFieldsOpen && form.storyEnabled ? renderStoryFields() : null}

              <button
                className="order-review-item order-review-item-optional"
                type="button"
                onClick={() => {
                  if (form.photographerEnabled) {
                    setPhotographerFieldsOpen((current) => !current);
                    return;
                  }
                  goToStep(6);
                }}
                aria-expanded={photographerFieldsOpen && form.photographerEnabled}
              >
                <span>♡ بيانات المصور</span>
                <strong>{form.photographerEnabled ? fieldValue(form.photographerName, "تمت إضافته") : "غير مضافة"}</strong>
              </button>
              {photographerFieldsOpen && form.photographerEnabled ? renderPhotographerFields() : null}
            </div>

            {showPaymentMethods ? (
            <div className="order-review-payment">
              <h3><span>طريقة الدفع</span></h3>
              <div className="order-payment-options">
                <label className={`order-payment-option ${form.paymentMethod === "cod" ? "active" : ""}`}>
                  <input type="radio" name="paymentMethod" value="cod" checked={form.paymentMethod === "cod"} onChange={() => updateField("paymentMethod", "cod")} />
                  <span>الدفع عند الاستلام</span>
                  <small>ادفع نقداً عند استلام الدعوة</small>
                </label>
                <label className={`order-payment-option ${form.paymentMethod === "bank" ? "active" : ""}`}>
                  <input type="radio" name="paymentMethod" value="bank" checked={form.paymentMethod === "bank"} onChange={() => updateField("paymentMethod", "bank")} />
                  <span>تحويل بنكي</span>
                  <small>حوالة بنكية على الحساب</small>
                </label>
                <label className={`order-payment-option ${form.paymentMethod === "ewallet" ? "active" : ""}`}>
                  <input type="radio" name="paymentMethod" value="ewallet" checked={form.paymentMethod === "ewallet"} onChange={() => updateField("paymentMethod", "ewallet")} />
                  <span>محفظة إلكترونية</span>
                  <small>الدفع عبر المحفظة الإلكترونية (قريباً)</small>
                </label>
              </div>
            </div>
            ) : null}

            <p className="order-review-submit-note" id="confirm-order">
              اضغط على أي بطاقة لتعديلها، أو افتح المعاينة قبل تأكيد الدعوة.
            </p>
            {hasMediaUploadInProgress ? <p className="order-submit-wait-hint" id="order-upload-wait-hint">انتظر حتي يكتمل رفع الصور والموسيقى الي الدعوه وبعدها اكمل</p> : null}
          </section>

          <div className={`order-wizard-actions ${isLastStep ? "order-review-actions" : ""}`}>
            {isLastStep ? (
              <>
                <button key="review-preview" className="btn btn-glass order-preview-action" type="button" onClick={openOrderPreview} disabled={hasMediaUploadInProgress}>
                  <Eye size={17} />
                  معاينة الدعوة
                </button>
                <button
                  key="review-submit"
                  className="btn btn-gold btn-glow order-submit"
                  type="submit"
                  data-order-confirm="true"
                  disabled={state === "loading"}
                  aria-disabled={hasMediaUploadInProgress}
                  aria-describedby={hasMediaUploadInProgress ? "order-upload-wait-hint" : undefined}
                  onPointerDown={() => {
                    finalConfirmIntentAtRef.current = Date.now();
                  }}
                  onClick={() => {
                    finalConfirmIntentAtRef.current = Date.now();
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") finalConfirmIntentAtRef.current = Date.now();
                  }}
                >
                  {state === "loading" ? <Loader2 size={17} className="animate-float" /> : <ArrowLeft size={17} />}
                  الانتهاء وتأكيد الدعوة
                </button>
                <button key="review-back" className="btn btn-glass" type="button" onClick={goBack} disabled={isFirstStep}>
                  <ArrowRight size={17} />
                  رجوع
                </button>
              </>
            ) : (
              <>
                <button key="wizard-back" className="btn btn-glass" type="button" onClick={goBack} disabled={isFirstStep}>
                  <ArrowRight size={17} />
                  رجوع
                </button>
                <button key="wizard-next" className="btn btn-gold btn-glow" type="button" onClick={goNext}>
                  التالي
                  <ArrowLeft size={17} />
                </button>
              </>
            )}
          </div>
        </form>
        <aside className="order-summary-sidebar">
          <div className="order-summary-card">
            <h3>ملخص الطلب</h3>
            <div className="order-summary-template">
              <img src={selectedTemplate.previewImage} alt="" />
              <div>
                <strong>{selectedTemplate.arabicName}</strong>
                <small>{selectedTemplate.name}</small>
              </div>
            </div>
            <div className="order-summary-options">
              <div className="order-summary-row">
                <span>الإسمين</span>
                <strong>{form.groomName || "..."} و {form.brideName || "..."}</strong>
              </div>
              <div className="order-summary-row">
                <span>تاريخ المناسبة</span>
                <strong>{readableDate || "لم يحدد"}</strong>
              </div>
              <div className="order-summary-row">
                <span>القاعة</span>
                <strong>{form.venue || "لم يحدد"}</strong>
              </div>
              <div className="order-summary-row">
                <span>الصور</span>
                <strong>{previewImageUrls.length ? `${previewImageUrls.length} صور` : "لم ترفع بعد"}</strong>
              </div>
              <div className="order-summary-row">
                <span>الموسيقى</span>
                <strong>{!form.musicEnabled ? "بدون موسيقى" : form.musicChoice === "default" ? "الموسيقى الأساسية" : "مخصصة"}</strong>
              </div>
              <div className="order-summary-row">
                <span>قصة العروسين</span>
                <strong>{form.storyEnabled ? "مضافة" : "غير مضافة"}</strong>
              </div>
              <div className="order-summary-row">
                <span>المصور</span>
                <strong>{form.photographerEnabled ? "مضاف" : "غير مضاف"}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {orderPreviewOpen ? (
        <div className="order-preview-fullscreen" role="dialog" aria-modal="true" aria-label="معاينة الدعوة">
          <div className="order-preview-fullscreen-stage">
            <iframe src={orderPreviewSrc} title="معاينة الدعوة قبل التأكيد" allow="autoplay; encrypted-media; fullscreen" />
            <button className="order-preview-confirm-floating" type="button" onClick={returnFromOrderPreview}>
              العودة لتأكيد الدعوة
            </button>
          </div>
        </div>
      ) : null}

      <LocationPickerModal
        open={mapPickerOpen}
        onConfirm={(result) => {
          const googleMapsUrl = `https://maps.google.com/?q=${result.lat},${result.lng}`;
          updateField("mapUrl", googleMapsUrl);
          setSelectedLocation(result);
          setMapPickerOpen(false);
        }}
        onCancel={() => {
          setMapPickerOpen(false);
        }}
      />

    </div>
  );
}
