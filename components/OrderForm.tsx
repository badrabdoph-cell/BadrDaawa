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
  FileText,
  FileVideo,
  Globe,
  Heart,
  Image as ImageIcon,
  ImagePlus,
  LayoutTemplate,
  Link2,
  Loader2,
  MapPin,
  Music2,
  Phone,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { normalizeCoupleStory } from "@/lib/invitation-texts";
import { calculateKeyboardInset, getIncompleteRequiredStoryStage, orderStoryPresets, requiredOrderStoryStages } from "@/lib/order-mobile-ux";
import type { CoupleStoryItem, TemplateDefinition } from "@/lib/types";
import { acceptedImageFormats } from "@/lib/image-formats";
import { LocationPickerModal } from "./LocationPickerModal";
import { SimpleDateInput } from "./SimpleDateInput";
import { PhoneInput } from "./PhoneInput";

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
  appliedPromoCode: string;
  partnerPromoId: string;
  referralSource: string;
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
  | "appliedPromoCode"
  | "partnerPromoId"
  | "referralSource"
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
  | "appliedPromoCode"
  | "partnerPromoId"
  | "referralSource"
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
type AppliedPromo = {
  code: string;
  partner: {
    partnerId: string;
    displayName: string;
    partnerType: string;
    logoUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    showPartnerCard: boolean;
  };
  promo: {
    id: string;
    code: string;
    referralSlug: string;
    qrCodeUrl: string;
    discountType: string;
    discountValue: number | null;
    discountLabel: string;
  };
  photographer: {
    enabled: true;
    name: string;
    logoUrl: string;
    facebookUrl: string;
    instagramUrl: string;
    lockedByPromo: true;
  };
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
    title: "مثال: أول لقاء",
    description: "مثال: كانت أول مقابلة بيننا، ومن هنا بدأت الحكاية.",
  },
  {
    date: "مثال: 02 / 02 / 2025",
    title: "مثال: منتصف الطريق",
    description: "مثال: اليوم الذي قررنا فيه أن نكمل رحلتنا معاً، أو محطة قربتنا أكثر.",
  },
  {
    date: "مثال: تاريخ يوم الزفاف من خانة تاريخ المناسبة",
    title: "مثال: يوم الزفاف",
    description: "مثال: اليوم الذي نحتفل فيه مع أهلنا وأصدقائنا ببداية حياتنا الجديدة معاً.",
  },
];

const minimumOrderStoryStages = requiredOrderStoryStages.length;
const maximumOrderStoryStages = requiredOrderStoryStages.length;

const orderWizardSteps = [
  { id: "template", title: "اختيار القالب" },
  { id: "couple", title: "بيانات العروسين" },
  { id: "event", title: "بيانات المناسبة" },
  { id: "venue", title: "مكان الحفل" },
  { id: "photos", title: "الصور" },
  { id: "music", title: "الموسيقى" },
  { id: "story", title: "قصة العروسين" },
  { id: "photographer", title: "شركاء الحفل" },
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
    appliedPromoCode: initialDraft?.appliedPromoCode || "",
    partnerPromoId: initialDraft?.partnerPromoId || "",
    referralSource: initialDraft?.referralSource || "",
    openingText: initialDraft?.openingText || "",
    storyEnabled: false,
    story: ensureMinimumOrderStoryItems([]),
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
  const [orderPreviewOpen, setOrderPreviewOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [partnerServiceType, setPartnerServiceType] = useState("");
  const [promoInput, setPromoInput] = useState(initialDraft?.appliedPromoCode || "");
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoMessage, setPromoMessage] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; placeName: string; city: string; governorate: string; googleMapsUrl: string } | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [focusedFieldName, setFocusedFieldName] = useState("");
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyAIFilled, setStoryAIFilled] = useState<boolean[]>([false, false, false]);
  const [photographerSaved, setPhotographerSaved] = useState(false);
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
  const stepTabsRef = useRef<HTMLDivElement | null>(null);
  const autoPromoAttemptedRef = useRef(false);

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
    if (form.appliedPromoCode.trim()) params.set("promo", form.appliedPromoCode.trim());
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
    const container = stepTabsRef.current;
    if (!container) return;
    const activeButton = container.querySelector<HTMLButtonElement>("button.active");
    if (!activeButton) return;
    if (container.scrollWidth <= container.clientWidth) return;
    activeButton.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeStepIndex]);

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
    if (stepId === "photographer" || stepId === "review") {
      if (allErrors.photographerFacebookUrl) nextErrors.photographerFacebookUrl = allErrors.photographerFacebookUrl;
      if (allErrors.photographerInstagramUrl) nextErrors.photographerInstagramUrl = allErrors.photographerInstagramUrl;
    }
    return nextErrors;
  }

  function canLeaveStep(stepId: OrderWizardStepId) {
    const currentValues = getCurrentFormFromDom();
    const stepErrors = getStepErrors(stepId, currentValues);
    if (showValidationErrors(stepErrors)) return false;
    if (stepId === "story" && showStoryValidationErrors(form, { requireAll: false })) return false;
    if (stepId === "review" && showStoryValidationErrors(form, { requireAll: true, goToStoryStep: true })) return false;
    setForm((current) => ({ ...current, ...currentValues }));
    setState("idle");
    setMessage("");
    return true;
  }

  function goNext() {
    if (isLastStep) return;
    if (activeStep.id === "story" && activeStoryIndex < storyItems.length - 1) {
      setActiveStoryIndex(activeStoryIndex + 1);
      return;
    }
    if (!canLeaveStep(activeStep.id)) return;
    goToStep(activeStepIndex + 1);
  }

  function goBack() {
    if (isFirstStep) return;
    if (activeStep.id === "story" && activeStoryIndex > 0) {
      setActiveStoryIndex(activeStoryIndex - 1);
      return;
    }
    goToStep(activeStepIndex - 1);
  }

  function openOrderPreview() {
    if (hasMediaUploadInProgress) {
      setState("error");
      setMessage("انتظر حتى يكتمل حفظ الصور والموسيقى قبل فتح المعاينة.");
      formRef.current?.querySelector<HTMLElement>(".order-upload-floating-warning")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const savedImages = draftImageUrls.filter((url) => url).length;
    if (savedImages < 2) {
      setState("error");
      setMessage(`ارفع صورتين على الأقل للمعاينة (${savedImages} من 2).`);
      goToStep(4);
      return;
    }
    if (showStoryValidationErrors(form, { requireAll: true, goToStoryStep: true })) return;
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
      appliedPromoCode: params.get("promo") || params.get("appliedPromoCode") || undefined,
      partnerPromoId: params.get("partnerPromoId") || undefined,
      referralSource: params.get("promo") ? "referral-link" : params.get("referralSource") || undefined,
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
      "appliedPromoCode",
      "partnerPromoId",
      "referralSource",
      "musicUrl",
    ];
    fields.forEach((field) => {
      const value = String(nextForm[field] || "").trim();
      if (value) params.set(field, value);
    });
    if (nextForm.photographerEnabled) params.set("photographerEnabled", "1");
    if (nextForm.appliedPromoCode) params.set("promo", String(nextForm.appliedPromoCode).trim());
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
        appliedPromoCode: typeof draft.appliedPromoCode === "string" ? draft.appliedPromoCode : current.appliedPromoCode,
        partnerPromoId: typeof draft.partnerPromoId === "string" ? draft.partnerPromoId : current.partnerPromoId,
        referralSource: typeof draft.referralSource === "string" ? draft.referralSource : current.referralSource,
        openingText: typeof draft.openingText === "string" ? draft.openingText : current.openingText,
        storyEnabled: Boolean(draft.storyEnabled),
        story: ensureMinimumOrderStoryItems(current.story),
        musicEnabled: typeof draft.musicEnabled === "boolean" ? draft.musicEnabled : current.musicEnabled,
        musicChoice: isOrderMusicChoice(draft.musicChoice) ? draft.musicChoice : "default",
        musicUrl: typeof draft.musicUrl === "string" ? draft.musicUrl : current.musicUrl,
      }));
      const restoredImages = cleanOrderDraftImageUrls(draft.imageUrls);
      setDraftImageUrls(restoredImages);
      uploadedImageUrlsRef.current = restoredImages;
      setImageUploads(orderImageSlots.map((_, index) => createIdleUploadState(restoredImages[index] || "")));
      if (typeof draft.appliedPromoCode === "string") setPromoInput(draft.appliedPromoCode);
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

  function enablePhotographer() {
    const currentValues = getCurrentFormFromDom();
    setForm((current) => ({ ...current, ...currentValues, photographerEnabled: true }));
    if (message) setMessage("");
  }

  async function applyPromoCode(rawCode = promoInput, source = form.referralSource || "order-form", { silent = false }: { silent?: boolean } = {}) {
    const code = rawCode.trim();
    if (!code) {
      setPromoMessage("اكتب البروموكود أولاً.");
      return;
    }
    if (form.appliedPromoCode && form.appliedPromoCode !== code) {
      const confirmed = window.confirm("هل تريد استبدال البروموكود الحالي؟");
      if (!confirmed) return;
    }
    setPromoBusy(true);
    if (!silent) setPromoMessage("جاري تطبيق البروموكود...");
    try {
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, source }),
      });
      const data = (await response.json().catch(() => null)) as (AppliedPromo & { ok?: true }) | { ok?: false; error?: string } | null;
      if (!response.ok || !data || data.ok === false) {
        setAppliedPromo(null);
        const errorMessage = data && "error" in data ? data.error : "";
        setPromoMessage(errorMessage || "هذا البروموكود غير صالح.");
        return;
      }
      const nextPromo = data as AppliedPromo;
      setAppliedPromo(nextPromo);
      setPartnerServiceType("مصور فوتوغرافي");
      setPhotographerSaved(true);
      setForm((current) => ({
        ...current,
        photographerEnabled: true,
        photographerName: nextPromo.photographer.name,
        photographerFacebookUrl: nextPromo.photographer.facebookUrl,
        photographerInstagramUrl: nextPromo.photographer.instagramUrl,
        appliedPromoCode: nextPromo.promo.code,
        partnerPromoId: nextPromo.promo.id,
        referralSource: source,
      }));
      setPromoInput(nextPromo.promo.code);
      setPromoMessage(nextPromo.promo.discountLabel || "تم التعرف على المصور وسيتم إضافة بياناته إلى الدعوة.");
    } catch {
      setPromoMessage("تعذر تطبيق البروموكود حالياً. حاول مرة أخرى.");
    } finally {
      setPromoBusy(false);
    }
  }

  function removeAppliedPromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoMessage("");
    setPhotographerSaved(false);
    setPartnerServiceType("");
    setForm((current) => ({
      ...current,
      photographerEnabled: false,
      photographerName: "",
      photographerFacebookUrl: "",
      photographerInstagramUrl: "",
      appliedPromoCode: "",
      partnerPromoId: "",
      referralSource: "",
    }));
  }

  useEffect(() => {
    if (!draftReady || autoPromoAttemptedRef.current || !form.appliedPromoCode) return;
    autoPromoAttemptedRef.current = true;
    applyPromoCode(form.appliedPromoCode, form.referralSource || "referral-link", { silent: true });
  }, [draftReady, form.appliedPromoCode, form.referralSource]);

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

  function toggleStoryPreset(index: number, presetId: string) {
    if (storyAIFilled[index]) {
      updateStoryItem(index, { date: "", title: "", description: "" });
      setStoryAIFilled((current) => {
        const next = [...current];
        next[index] = false;
        return next;
      });
    } else {
      applyStoryPreset(index, presetId);
      setStoryAIFilled((current) => {
        const next = [...current];
        next[index] = true;
        return next;
      });
    }
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
    setState("idle");
    setMessage("");
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
      phone: form.phone,
      weddingDate: String(formData.get("weddingDate") || "").trim(),
      weddingTime: String(formData.get("weddingTime") || "07:00 مساءً").trim(),
      venue: String(formData.get("venue") || "").trim(),
      mapUrl: String(formData.get("mapUrl") || "").trim(),
      notes: "",
      photographerName: String(formData.get("photographerName") || "").trim(),
      photographerFacebookUrl: String(formData.get("photographerFacebookUrl") || "").trim(),
      photographerInstagramUrl: String(formData.get("photographerInstagramUrl") || "").trim(),
      appliedPromoCode: form.appliedPromoCode,
      partnerPromoId: form.partnerPromoId,
      referralSource: form.referralSource,
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
    else if (!/^\+[1-9]\d{6,14}$/.test(values.phone)) nextErrors.phone = "رقم الهاتف غير صحيح.";
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

  function validateOrderStory(values: Pick<FormState, "storyEnabled" | "story"> = form, { requireAll = false }: { requireAll?: boolean } = {}) {
    const nextErrors: StoryFieldErrors = {};
    const story = ensureMinimumOrderStoryItems(values.story);
    const incomplete = getIncompleteRequiredStoryStage(story, { requireAll });
    if (!incomplete) return nextErrors;
    incomplete.missingFields.forEach((field) => {
      const stageLabel = incomplete.stage.label;
      if (field === "date") nextErrors[storyFieldErrorKey(incomplete.index, "date")] = `اكتب تاريخ أو وقت محطة ${stageLabel}.`;
      if (field === "title") nextErrors[storyFieldErrorKey(incomplete.index, "title")] = `اكتب عنوان محطة ${stageLabel}.`;
      if (field === "description") nextErrors[storyFieldErrorKey(incomplete.index, "description")] = `اكتب وصفاً قصيراً لمحطة ${stageLabel}.`;
    });
    return nextErrors;
  }

  function showStoryValidationErrors(
    values: Pick<FormState, "storyEnabled" | "story"> = form,
    { requireAll = false, goToStoryStep = false }: { requireAll?: boolean; goToStoryStep?: boolean } = {},
  ) {
    const story = ensureMinimumOrderStoryItems(values.story);
    const incomplete = getIncompleteRequiredStoryStage(story, { requireAll });
    const nextErrors = validateOrderStory({ ...values, story }, { requireAll });
    setStoryErrors(nextErrors);
    const entries = Object.entries(nextErrors);
    if (!entries.length) return false;
    setState("error");
    const stageLabel = incomplete?.stage.label || "قصة العروسين";
    setMessage(requireAll ? `قصة العروسين مطلوبة قبل تأكيد الدعوة. كمل محطة ${stageLabel}.` : `كمل محطة ${stageLabel} قبل الانتقال، أو امسح القصة بالكامل لو هترجع لها بعدين.`);
    if (incomplete) setActiveStoryIndex(incomplete.index);
    if (goToStoryStep && activeStep.id !== "story") {
      const storyStepIndex = orderWizardSteps.findIndex((step) => step.id === "story");
      if (storyStepIndex >= 0) goToStep(storyStepIndex);
    }
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
    if (activeStep.id === "review") {
      const savedImages = draftImageUrls.filter((url) => url).length;
      if (savedImages < 2) {
        setState("error");
        setMessage(`ارفع صورتين على الأقل للدعوة (${savedImages} من 2).`);
        goToStep(4);
        return;
      }
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
    if (showStoryValidationErrors(currentForm, { requireAll: true, goToStoryStep: true })) return;
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

  function renderPhotographerFields(serviceType = "مقدم الخدمة") {
    const lockedByPromo = Boolean(form.appliedPromoCode);
    return (
      <div className="photographer-fields order-customization-fields">
        <div className="field">
          <label htmlFor="photographerName">اسم {serviceType}</label>
          <input id="photographerName" name="photographerName" autoComplete="name" placeholder="اختياري" value={form.photographerName} onChange={(event) => updateField("photographerName", event.target.value)} disabled={lockedByPromo} />
        </div>
        <div className={`field ${errors.photographerFacebookUrl ? "has-error" : ""}`}>
          <label htmlFor="photographerFacebookUrl">رابط Facebook</label>
          <input id="photographerFacebookUrl" name="photographerFacebookUrl" type="url" inputMode="url" autoComplete="url" placeholder="https://facebook.com/..." value={form.photographerFacebookUrl} onChange={(event) => updateField("photographerFacebookUrl", event.target.value)} aria-invalid={Boolean(errors.photographerFacebookUrl)} disabled={lockedByPromo} />
          {errors.photographerFacebookUrl ? <small className="field-error">{errors.photographerFacebookUrl}</small> : null}
        </div>
        <div className={`field ${errors.photographerInstagramUrl ? "has-error" : ""}`}>
          <label htmlFor="photographerInstagramUrl">رابط Instagram</label>
          <input id="photographerInstagramUrl" name="photographerInstagramUrl" type="url" inputMode="url" autoComplete="url" placeholder="https://instagram.com/..." value={form.photographerInstagramUrl} onChange={(event) => updateField("photographerInstagramUrl", event.target.value)} aria-invalid={Boolean(errors.photographerInstagramUrl)} disabled={lockedByPromo} />
          {errors.photographerInstagramUrl ? <small className="field-error">{errors.photographerInstagramUrl}</small> : null}
        </div>
        {lockedByPromo ? <small className="order-promo-lock-note">تمت إضافة بيانات المصور بواسطة البروموكود.</small> : null}
      </div>
    );
  }

  function renderPromoCard() {
    return (
      <div className={`order-promo-card ${form.appliedPromoCode ? "is-applied" : ""}`}>
        <div className="order-promo-copy">
          <strong>بروموكود</strong>
          <span>إذا كان لديك بروموكود اكتبه هنا.</span>
        </div>
        <div className="order-promo-controls">
          <input
            type="text"
            inputMode="text"
            autoCapitalize="characters"
            placeholder="مثال: BADR2026"
            value={promoInput}
            onChange={(event) => {
              setPromoInput(event.target.value);
              if (promoMessage) setPromoMessage("");
            }}
            disabled={promoBusy || Boolean(form.appliedPromoCode)}
            aria-label="بروموكود"
          />
          {form.appliedPromoCode ? (
            <button className="btn btn-glass" type="button" onClick={removeAppliedPromo}>
              إزالة البروموكود
            </button>
          ) : (
            <button className="btn btn-gold" type="button" onClick={() => applyPromoCode()} disabled={promoBusy}>
              {promoBusy ? "جاري التطبيق" : "تطبيق"}
            </button>
          )}
        </div>
        {promoMessage ? <p className={`order-promo-message ${form.appliedPromoCode ? "is-success" : ""}`}>{promoMessage}</p> : null}
      </div>
    );
  }

  function renderStoryFields() {
    const activeStage = requiredOrderStoryStages[visibleStoryIndex];
    const activePreset = orderStoryPresets[visibleStoryIndex];
    const activeItem = storyItems[visibleStoryIndex] || createOrderStoryItem();
    const example = orderStoryExamples[visibleStoryIndex] || orderStoryExamples[orderStoryExamples.length - 1];
    const dateError = storyErrors[storyFieldErrorKey(visibleStoryIndex, "date")];
    const titleError = storyErrors[storyFieldErrorKey(visibleStoryIndex, "title")];
    const descriptionError = storyErrors[storyFieldErrorKey(visibleStoryIndex, "description")];
    const stageHelper = activeStage?.helper;
    return (
      <div className="order-story-fields-new">
        <div className="order-story-stage-tabs" role="tablist" aria-label="مراحل قصة العروسين">
          {requiredOrderStoryStages.map((stage, index) => (
            <button
              key={stage.id}
              type="button"
              role="tab"
              aria-selected={index === visibleStoryIndex}
              className={index === visibleStoryIndex ? "active" : ""}
              onClick={() => setActiveStoryIndex(index)}
            >
              <span>{index === 0 ? "❤️" : index === 1 ? "💍" : "🤍"}</span>
              <strong>{stage.label}</strong>
            </button>
          ))}
        </div>
        <div className="order-story-tab-content">
          <h3 className="order-story-tab-title">{activeStage?.label}</h3>
          {stageHelper ? <p className="order-story-tab-helper">{stageHelper}</p> : null}
          <div className={`field ${dateError ? "has-error" : ""}`}>
            <label htmlFor={`storyDate-${visibleStoryIndex}`}>التاريخ أو وقت المحطة</label>
            <input id={`storyDate-${visibleStoryIndex}`} name={`storyDate-${visibleStoryIndex}`} value={activeItem.date || ""} onChange={(event) => updateStoryText(visibleStoryIndex, "date", event.target.value)} placeholder={example.date} aria-invalid={Boolean(dateError)} />
            {dateError ? <small className="field-error">{dateError}</small> : null}
          </div>
          <div className={`field ${titleError ? "has-error" : ""}`}>
            <label htmlFor={`storyTitle-${visibleStoryIndex}`}>عنوان {activeStage?.label || "المحطة"}</label>
            <input id={`storyTitle-${visibleStoryIndex}`} name={`storyTitle-${visibleStoryIndex}`} value={activeItem.title} onChange={(event) => updateStoryText(visibleStoryIndex, "title", event.target.value)} placeholder={example.title} aria-invalid={Boolean(titleError)} />
            {titleError ? <small className="field-error">{titleError}</small> : null}
          </div>
          <div className={`field full ${descriptionError ? "has-error" : ""}`}>
            <label htmlFor={`storyDescription-${visibleStoryIndex}`}>وصف قصير</label>
            <textarea id={`storyDescription-${visibleStoryIndex}`} name={`storyDescription-${visibleStoryIndex}`} rows={3} value={activeItem.description} aria-invalid={Boolean(descriptionError)} onChange={(event) => updateStoryText(visibleStoryIndex, "description", event.target.value)} placeholder={example.description} />
            {descriptionError ? <small className="field-error">{descriptionError}</small> : null}
          </div>
          <button
            type="button"
            className={`btn btn-gold order-story-ai-btn${storyAIFilled[visibleStoryIndex] ? " is-filled" : ""}`}
            onClick={() => { if (activePreset) toggleStoryPreset(visibleStoryIndex, activePreset.id); }}
          >
            {storyAIFilled[visibleStoryIndex] ? "إلغاء الكتابة" : "✨ كتابة القصة بالذكاء الاصطناعي"}
          </button>
        </div>
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
              <p className="order-wizard-trust-note">{isLastStep ? "راجع بياناتك بدقة وتأكد من اكتمال جميع المعلومات." : "يتم حفظ بياناتك تلقائياً أثناء الكتابة، ويمكنك مراجعة كل شيء قبل تأكيد الدعوة."}</p>
            </div>
            <strong>{progressPercent}%</strong>
          </header>

          <div className="order-progress-track" aria-hidden="true">
            <span style={{ width: `${progressPercent}%` }} />
          </div>

          {!isLastStep ? (
          <nav className="order-step-tabs" aria-label="خطوات إنشاء الدعوة" ref={stepTabsRef}>
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
          ) : null}

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
                <SimpleDateInput id="weddingDate" name="weddingDate" value={normalizedDate || form.weddingDate} onChange={(value) => updateField("weddingDate", value)} required aria-invalid={Boolean(errors.weddingDate)} aria-describedby={errors.weddingDate ? "weddingDate-error weddingDate-hint" : "weddingDate-hint"} />
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
                <PhoneInput id="phone" value={form.phone} onChange={(value) => updateField("phone", value)} required error={errors.phone} />
                <small className="field-preview">يساعدنا على متابعة الطلب والتأكيد.</small>
                {errors.phone ? <small className="field-error" id="phone-error">{errors.phone}</small> : null}
              </div>
            </div>
          </section>

          <section className={`order-wizard-step ${activeStep.id === "venue" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "venue"}>
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
              <small className="field-preview" id="mapUrl-hint">يمكنك لصق رابط Google Maps أو اختيار الموقع مباشرة من الخريطة.</small>
              {errors.mapUrl ? <small className="field-error" id="mapUrl-error">{errors.mapUrl}</small> : null}
            </div>

            <button className="btn btn-glass venue-map-btn" type="button" onClick={() => {
              setMapPickerOpen(true);
              window.history.pushState({ modal: "map-picker", stepIndex: activeStepIndex }, "");
            }}>
              <MapPin size={17} />
              فتح الخريطة واختيار الموقع
            </button>
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

          <section className={`order-wizard-step ${activeStep.id === "story" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "story"}>
            {renderStoryFields()}
          </section>

          <section className={`order-wizard-step ${activeStep.id === "photographer" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "photographer"}>
            <div className="partner-section">
              <h2>شركاء الحفل (اختياري)</h2>
              <p className="partner-desc">اختر مقدم خدمة لإضافته إلى الدعوة.</p>
              {renderPromoCard()}

              {!form.photographerEnabled ? (
                /* ── service selection cards ── */
                <div className="partner-cards-grid">
                  {[
                    ["📷", "مصور فوتوغرافي"],
                    ["🏛️", "قاعة"],
                    ["💄", "ميكب آرتيست"],
                    ["🎤", "DJ"],
                    ["🎀", "منظم حفلات"],
                    ["➕", "خدمة أخرى"],
                  ].map(([icon, label]) => (
                    <button key={label} className="partner-card-btn" type="button" onClick={() => {
                      setPartnerServiceType(label);
                      enablePhotographer();
                      setPhotographerSaved(false);
                    }}>
                      <span className="partner-card-icon">{icon}</span>
                      <span className="partner-card-label">{label}</span>
                    </button>
                  ))}
                </div>
              ) : (
                /* ── form or saved card ── */
                <div className="partner-screen">
                  {!photographerSaved ? (
                    /* form */
                    <div className="partner-form-box">
                      <div className="partner-form-head">
                        <span className="partner-form-icon">
                          {partnerServiceType === "مصور فوتوغرافي" ? "📷" :
                           partnerServiceType === "قاعة" ? "🏛️" :
                           partnerServiceType === "ميكب آرتيست" ? "💄" :
                           partnerServiceType === "DJ" ? "🎤" :
                           partnerServiceType === "منظم حفلات" ? "🎀" :
                           "➕"}
                        </span>
                        <strong>{partnerServiceType || "مقدم الخدمة"}</strong>
                      </div>
                      {renderPhotographerFields(partnerServiceType || "مقدم الخدمة")}
                      <div className="partner-form-buttons">
                        <button className="btn btn-gold" type="button" onClick={() => {
                          setPhotographerSaved(true);
                        }}>
                          حفظ
                        </button>
                        <button className="btn btn-glass" type="button" onClick={() => {
                          updateField("photographerEnabled", false);
                          setPartnerServiceType("");
                          setPhotographerSaved(false);
                        }}>
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* saved card */
                    <div className="partner-saved-card">
                      <div className="partner-saved-head">
                        <span className="partner-saved-icon">
                          {partnerServiceType === "مصور فوتوغرافي" ? "📷" :
                           partnerServiceType === "قاعة" ? "🏛️" :
                           partnerServiceType === "ميكب آرتيست" ? "💄" :
                           partnerServiceType === "DJ" ? "🎤" :
                           partnerServiceType === "منظم حفلات" ? "🎀" :
                           "➕"}
                        </span>
                        <div className="partner-saved-info">
                          <strong className="partner-saved-name">{form.photographerName || "شريك"}</strong>
                          <small className="partner-saved-type">{partnerServiceType || "شريك"}</small>
                        </div>
                      </div>
                      {(form.photographerFacebookUrl || form.photographerInstagramUrl) ? (
                        <div className="partner-saved-links">
                          {form.photographerFacebookUrl ? (
                            <a href={form.photographerFacebookUrl} target="_blank" rel="noopener noreferrer">Facebook</a>
                          ) : null}
                          {form.photographerInstagramUrl ? (
                            <a href={form.photographerInstagramUrl} target="_blank" rel="noopener noreferrer">Instagram</a>
                          ) : null}
                        </div>
                      ) : null}
                      <div className="partner-saved-actions">
                        {form.appliedPromoCode ? (
                          <button className="btn btn-glass" type="button" onClick={removeAppliedPromo}>
                            إزالة البروموكود
                          </button>
                        ) : (
                          <>
                            <button className="btn btn-soft" type="button" onClick={() => {
                              setPhotographerSaved(false);
                            }}>
                              تعديل
                            </button>
                            <button className="btn btn-glass" type="button" onClick={() => {
                              updateField("photographerEnabled", false);
                              updateField("photographerName", "");
                              updateField("photographerFacebookUrl", "");
                              updateField("photographerInstagramUrl", "");
                              setPartnerServiceType("");
                              setPhotographerSaved(false);
                            }}>
                              حذف
                            </button>
                          </>
                        )}
                      </div>
                      {!form.appliedPromoCode ? (
                        <button className="btn btn-glass partner-add-another" type="button" onClick={() => {
                          updateField("photographerEnabled", false);
                          updateField("photographerName", "");
                          updateField("photographerFacebookUrl", "");
                          updateField("photographerInstagramUrl", "");
                          setPartnerServiceType("");
                          setPhotographerSaved(false);
                        }}>
                          ➕ إضافة شريك آخر
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className={`order-wizard-step ${activeStep.id === "review" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "review"}>
            <p className="order-review-submit-note" style={{ marginBottom: 12 }}>
              اضغط على أي عنصر لتعديله، أو عاين الدعوة قبل إرسال الطلب.
            </p>
            <div className="order-summary-card order-summary-main">
              <h3><FileText size={18} /> ملخص الطلب</h3>
              <div className="order-summary-items">
                {(() => {
                  const musicValue = !form.musicEnabled ? "بدون موسيقى"
                    : form.musicChoice === "default" || !form.musicUrl ? "🎵 الموسيقى الأساسية"
                    : form.musicChoice === "upload" ? "🎵 ملف MP3"
                    : form.musicChoice === "video" ? "🎵 صوت من فيديو"
                    : "🎵 رابط أغنية";
                  const imagesIncomplete = previewImageUrls.length < 2;
                  const imageValue = hasMediaUploadInProgress ? "⏳ جاري رفع الصور..."
                    : previewImageUrls.length === 0 ? "❌ لم يتم رفع أي صور"
                    : previewImageUrls.length === 1 ? "⚠️ تم رفع صورة واحدة (مطلوب 2)"
                    : previewImageUrls.length === 3 ? "✅ تم رفع 3 صور"
                    : `✅ تم رفع ${previewImageUrls.length} صور`;
                  const storyComplete = filledOrderStory(form.story).length >= minimumOrderStoryStages;
                  const storyValue = storyComplete ? "✅ مكتملة" : "❌ غير مكتملة";
                  const partnerValue = !form.photographerEnabled ? "لم تتم إضافة شركاء"
                    : form.photographerName.trim() ? `📷 ${form.photographerName.trim()}`
                    : "تمت إضافة شريك";
                  const openingValue = form.openingText.trim() ? "تمت إضافة نص افتتاح" : "سيتم استخدام النص الافتراضي";

                  return (
                    <>
                      {[
                        { icon: <UserRound size={16} />, label: "أسماء العروسين", value: `${fieldValue(form.groomName)} و ${fieldValue(form.brideName)}`, step: 1 },
                        { icon: <CalendarDays size={16} />, label: "تاريخ المناسبة", value: readableDate || "لم يحدد", step: 2 },
                        { icon: <MapPin size={16} />, label: "القاعة", value: form.venue || "لم يحدد", step: 3 },
                        { icon: <Globe size={16} />, label: "الموقع", value: form.mapUrl.trim() ? "✅ تم تحديد الموقع" : "لم يتم تحديد الموقع (اختياري)", step: 3 },
                        { icon: <ImageIcon size={16} />, label: "الصور", value: imageValue, step: 4 },
                        { icon: <Music2 size={16} />, label: "الموسيقى", value: musicValue, step: 5 },
                        { icon: <Heart size={16} />, label: "قصة العروسين", value: storyValue, step: 6 },
                        { icon: <Camera size={16} />, label: "شركاء الحفل", value: partnerValue, step: 7 },
                      ].map((row) => {
                        const isWarning = (row.label === "الصور" && (imagesIncomplete || hasMediaUploadInProgress))
                          || (row.label === "قصة العروسين" && !storyComplete);
                        return (
                          <button key={row.label} className={`order-summary-item ${isWarning ? "order-summary-item-warning" : ""}`} type="button" onClick={() => goToStep(row.step)}>
                            <span className="order-summary-item-label"><span className="order-summary-item-icon">{row.icon}</span> {row.label}</span>
                            <span className="order-summary-item-value">{row.value}</span>
                            <ArrowLeft size={14} className="order-summary-item-arrow" />
                          </button>
                        );
                      })}
                      <button className={`order-summary-item order-summary-item-toggle ${!form.openingText.trim() ? "order-summary-item-empty" : ""}`} type="button" onClick={() => setOpeningTextOpen((c) => !c)}>
                        <span className="order-summary-item-label"><span className="order-summary-item-icon"><Sparkles size={16} /></span> نص الافتتاح</span>
                        <span className="order-summary-item-value">{openingValue}</span>
                        <ArrowLeft size={14} className="order-summary-item-arrow" />
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
            {openingTextOpen ? renderOpeningTextFields() : null}

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

            {hasMediaUploadInProgress ? <p className="order-submit-wait-hint" id="order-upload-wait-hint">انتظر حتي يكتمل رفع الصور والموسيقى الي الدعوه وبعدها اكمل</p> : null}
          </section>

          <div className={`order-wizard-actions ${isLastStep ? "order-review-actions" : ""}`}>
            {isLastStep ? (
              <>
                <button key="review-preview" className="btn btn-glass order-preview-action" type="button" onClick={openOrderPreview} disabled={hasMediaUploadInProgress}>
                  <Eye size={17} />
                  معاينة الدعوة قبل الإرسال
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
                  إرسال الطلب للمراجعة
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
                {activeStep.id === "photographer" ? (
                  <button key="wizard-skip" className="btn btn-soft" type="button" onClick={goNext}>
                    ⏭️ تخطي هذه المرحلة
                  </button>
                ) : null}
                <button key="wizard-next" className="btn btn-gold btn-glow" type="button" onClick={goNext}>
                  التالي
                  <ArrowLeft size={17} />
                </button>
              </>
            )}
          </div>
        </form>
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

      <style>{`
        .order-summary-item {
          transition: transform 120ms ease, background 120ms ease, box-shadow 120ms ease;
        }
        .order-summary-item:hover {
          transform: translateY(-1px);
        }
        .order-summary-item:active {
          transform: scale(0.985);
        }

        .order-review-actions .btn {
          transition: transform 120ms ease, box-shadow 120ms ease, filter 120ms ease;
        }
        .order-review-actions .btn:active:not(:disabled) {
          transform: scale(0.97);
        }
        .order-review-actions .btn-gold:active:not(:disabled) {
          box-shadow: 0 4px 12px rgba(150, 104, 42, 0.18);
        }
      `}</style>

    </div>
  );
}
