"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { flushSync } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Check,
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
import type { CoupleStoryItem, TemplateDefinition } from "@/lib/types";
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
  storyEnabled: boolean;
  story: CoupleStoryItem[];
  musicEnabled: boolean;
  musicChoice: MusicChoice;
  musicUrl: string;
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

function normalizeStoryTextInput(value: string) {
  return value.replace(/[\u00a0\u202f]/g, " ").replace(/[\u200b-\u200d\ufeff]/g, "");
}

function getStoryTextWithInsertedSpace(target: HTMLInputElement | HTMLTextAreaElement) {
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? start;
  return {
    caret: start + 1,
    value: `${target.value.slice(0, start)} ${target.value.slice(end)}`,
  };
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
}: {
  initialTemplate?: string;
  initialDraft?: OrderInitialDraft;
  templates: OrderTemplateOption[];
  skipTemplateStep?: boolean;
}) {
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
    storyEnabled: Boolean(initialDraft?.storyEnabled || filledOrderStory(initialDraft?.story).length),
    story: initialDraft?.storyEnabled || filledOrderStory(initialDraft?.story).length ? ensureMinimumOrderStoryItems(initialDraft?.story) : cleanOrderStory(initialDraft?.story),
    musicEnabled: initialDraft?.musicEnabled ?? true,
    musicChoice: initialDraft?.musicChoice || "default",
    musicUrl: initialDraft?.musicUrl || "",
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
  const [musicVideoBusy, setMusicVideoBusy] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(skipTemplateStep ? 1 : 0);
  const [musicSettingsOpen, setMusicSettingsOpen] = useState(false);
  const [openingTextOpen, setOpeningTextOpen] = useState(Boolean(initialDraft?.openingText));
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
  const uploadingImageCount = imageUploads.filter((upload) => upload.phase === "selected" || upload.phase === "compressing" || upload.phase === "uploading").length;
  const hasImageUploadInProgress = uploadingImageCount > 0;
  const activeStep = orderWizardSteps[activeStepIndex] || orderWizardSteps[0];
  const isFirstStep = activeStepIndex === 0 || (skipTemplateStep && activeStepIndex === 1);
  const isLastStep = activeStepIndex === orderWizardSteps.length - 1;
  const progressPercent = Math.round(((activeStepIndex + 1) / orderWizardSteps.length) * 100);
  const previewImageUrls = draftImageUrls.filter(Boolean);

  useEffect(() => {
    setActiveStepIndex((current) => {
      if (!skipTemplateStep || current !== 0) return current;
      return 1;
    });
  }, [skipTemplateStep]);

  function goToStep(index: number) {
    if (formRef.current) {
      const currentValues = getCurrentFormFromDom();
      setForm((current) => ({ ...current, ...currentValues }));
    }
    const nextIndex = Math.min(Math.max(skipTemplateStep ? Math.max(index, 1) : index, 0), orderWizardSteps.length - 1);
    setActiveStepIndex(nextIndex);
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
    if (stepId === "event" && allErrors.weddingDate) nextErrors.weddingDate = allErrors.weddingDate;
    if (stepId === "venue") {
      if (allErrors.venue) nextErrors.venue = allErrors.venue;
      if (allErrors.mapUrl) nextErrors.mapUrl = allErrors.mapUrl;
    }
    if (stepId === "music" && allErrors.musicUrl) nextErrors.musicUrl = allErrors.musicUrl;
    if (stepId === "review") {
      if (allErrors.photographerFacebookUrl) nextErrors.photographerFacebookUrl = allErrors.photographerFacebookUrl;
      if (allErrors.photographerInstagramUrl) nextErrors.photographerInstagramUrl = allErrors.photographerInstagramUrl;
    }
    return nextErrors;
  }

  function canLeaveStep(stepId: OrderWizardStepId) {
    const currentValues = getCurrentFormFromDom();
    const stepErrors = getStepErrors(stepId, currentValues);
    if (showValidationErrors(stepErrors)) return false;
    if (stepId === "review" && showStoryValidationErrors(form)) return false;
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

  useEffect(() => {
    function handleNativeStoryFieldSpace(event: globalThis.KeyboardEvent) {
      if ((event.key !== " " && event.code !== "Space") || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) || target.dataset.orderStoryField !== "true") return;

      const index = Number(target.dataset.storyIndex);
      const field = target.dataset.storyField;
      if (!Number.isInteger(index) || index < 0) return;
      if (field !== "date" && field !== "title" && field !== "description") return;

      const next = getStoryTextWithInsertedSpace(target);
      event.preventDefault();
      event.stopPropagation();

      flushSync(() => {
        setForm((current) => ({
          ...current,
          storyEnabled: true,
          story: cleanOrderStory(current.story).map((item, itemIndex) =>
            itemIndex === index ? { ...item, [field]: normalizeStoryTextInput(next.value) } : item,
          ),
        }));
        setStoryErrors((current) => {
          const nextErrors = { ...current };
          delete nextErrors[storyFieldErrorKey(index, field)];
          return nextErrors;
        });
        setMessage("");
      });
      window.requestAnimationFrame(() => target.setSelectionRange(next.caret, next.caret));
    }

    document.addEventListener("keydown", handleNativeStoryFieldSpace, true);
    return () => document.removeEventListener("keydown", handleNativeStoryFieldSpace, true);
  }, []);

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

  useEffect(() => {
    if (!draftReady || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("confirmOrder") !== "1") return;

    params.delete("confirmOrder");
    const nextQuery = params.toString();
    window.history.replaceState(window.history.state, "", nextQuery ? `/order?${nextQuery}` : "/order");

    let focusTimer = 0;
    const focusConfirmButton = (attempt = 0) => {
      const formElement = formRef.current;
      const submitButton = formElement?.querySelector<HTMLButtonElement>(".order-submit");

      if (!submitButton) {
        if (attempt < 30) focusTimer = window.setTimeout(() => focusConfirmButton(attempt + 1), 100);
        return;
      }

      submitButton.scrollIntoView({ behavior: "auto", block: "center" });
      submitButton.focus({ preventScroll: true });
      submitButton.classList.add("order-submit-highlight");
      window.setTimeout(() => submitButton.classList.remove("order-submit-highlight"), 1800);
    };

    focusTimer = window.setTimeout(() => focusConfirmButton(), 900);
    return () => window.clearTimeout(focusTimer);
  }, [draftReady]);

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
    updateStoryItem(index, { [field]: normalizeStoryTextInput(value) });
  }

  function handleStoryFieldBeforeInput(index: number, field: "date" | "title" | "description", event: FormEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const inputEvent = event.nativeEvent as InputEvent;
    if (inputEvent.inputType !== "insertText" || ![" ", "\u00a0", "\u202f"].includes(inputEvent.data || "")) return;

    const target = event.currentTarget;
    const next = getStoryTextWithInsertedSpace(target);
    event.preventDefault();

    flushSync(() => updateStoryText(index, field, next.value));
    window.requestAnimationFrame(() => target.setSelectionRange(next.caret, next.caret));
  }

  function removeStoryItem(index: number) {
    setForm((current) => {
      const currentValues = getCurrentFormFromDom();
      const nextStory = cleanOrderStory(current.story).filter((_, itemIndex) => itemIndex !== index);
      return nextStory.length ? { ...current, ...currentValues, story: nextStory, storyEnabled: current.storyEnabled } : { ...current, ...currentValues, story: [], storyEnabled: false };
    });
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

  function getCurrentFormFromDom(): OrderFormValues {
    const formData = new FormData(formRef.current || undefined);
    return {
      groomName: String(formData.get("groomName") || "").trim(),
      brideName: String(formData.get("brideName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
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
    if (state === "loading") return;
    if (hasImageUploadInProgress) {
      setState("error");
      setMessage("انتظر حتي يكتمل رفع الصور الي الدعوه وبعدها اكمل");
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
    setMessage("جاري التأكد من حفظ الصور قبل إنشاء الدعوة.");

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

  return (
    <div className="order-flow order-wizard-flow">
      {hasImageUploadInProgress ? (
        <div className="order-upload-floating-warning" role="status" aria-live="polite">
          <Loader2 size={18} className="animate-float" />
          <span>انتظر حتي يكتمل رفع الصور الي الدعوه وبعدها اكمل</span>
          <strong>{uploadingImageCount}</strong>
        </div>
      ) : null}

      <div className="order-wizard-layout">
        <form className="form-panel details-form order-simple-form order-wizard-card" onSubmit={submitOrder} onInput={persistCurrentDomDraft} onChange={persistCurrentDomDraft} ref={formRef} noValidate>
          <header className="order-wizard-header">
            <div>
              <span>خطوة {activeStepIndex + 1} من {orderWizardSteps.length}</span>
              <h2>{activeStep.title}</h2>
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
                  {step.title}
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
                <input id="groomName" name="groomName" placeholder="مثال: بدر" value={form.groomName} onChange={(event) => updateField("groomName", event.target.value)} required aria-invalid={Boolean(errors.groomName)} aria-describedby={errors.groomName ? "groomName-error" : undefined} />
                {errors.groomName ? <small className="field-error" id="groomName-error">{errors.groomName}</small> : null}
              </div>

              <div className={`field ${errors.brideName ? "has-error" : ""}`}>
                <label htmlFor="brideName">
                  <UserRound size={16} />
                  اسم العروس
                </label>
                <input id="brideName" name="brideName" placeholder="مثال: سارة" value={form.brideName} onChange={(event) => updateField("brideName", event.target.value)} required aria-invalid={Boolean(errors.brideName)} aria-describedby={errors.brideName ? "brideName-error" : undefined} />
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

              <div className="field">
                <label htmlFor="phone">
                  <Phone size={16} />
                  رقم الهاتف
                </label>
                <input id="phone" name="phone" inputMode="tel" placeholder="مثال: 01000000000" value={form.phone} onChange={(event) => updateField("phone", event.target.value)} />
                <small className="field-preview">يساعدنا على متابعة الطلب والتأكيد.</small>
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
                  رابط اللوكيشن
                </label>
                <input id="mapUrl" name="mapUrl" inputMode="url" placeholder="انسخ رابط Google Maps للقاعة أو الـ pin" value={form.mapUrl} onChange={(event) => updateField("mapUrl", event.target.value)} aria-invalid={Boolean(errors.mapUrl)} aria-describedby={errors.mapUrl ? "mapUrl-error mapUrl-hint" : "mapUrl-hint"} />
                <small className="field-preview" id="mapUrl-hint">أفضل رابط يكون من Google Maps مباشرة.</small>
                {errors.mapUrl ? <small className="field-error" id="mapUrl-error">{errors.mapUrl}</small> : null}
              </div>
            </div>
            <div className="order-location-preview">
              <MapPin size={19} />
              <div>
                <strong>{fieldValue(form.venue, "سيظهر اسم القاعة هنا")}</strong>
                <span>{form.mapUrl ? "تم إضافة رابط اللوكيشن وسيظهر داخل الدعوة." : "يمكنك ترك الرابط فارغاً وإضافته لاحقاً."}</span>
              </div>
            </div>
          </section>

          <section className={`order-wizard-step ${activeStep.id === "photos" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "photos"}>
            <section className="order-compact-images" aria-labelledby="order-images-title">
              <div className="order-compact-section-head">
                <h2 id="order-images-title">رفع الصور</h2>
                <p>3 صور فقط، وكل صورة تظهر معاينتها قبل المعاينة أو التأكيد.</p>
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
              <p className="field-preview">سيتم ضغط الصور وحفظها تلقائياً للمعاينة والطلب.</p>
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
                  <div className="order-music-choice-grid" role="radiogroup" aria-label="اختيار موسيقى الدعوة">
                    <button className={form.musicEnabled && form.musicChoice === "default" ? "active" : ""} type="button" role="radio" aria-checked={form.musicEnabled && form.musicChoice === "default"} onClick={() => selectMusicChoice("default")}>
                      <Music2 size={16} />
                      الموسيقى الأساسية
                    </button>
                    <button className={form.musicEnabled && form.musicChoice === "upload" ? "active" : ""} type="button" role="radio" aria-checked={form.musicEnabled && form.musicChoice === "upload"} onClick={() => selectMusicChoice("upload")}>
                      <UploadCloud size={16} />
                      رفع MP3
                    </button>
                    <button className={form.musicEnabled && form.musicChoice === "video" ? "active" : ""} type="button" role="radio" aria-checked={form.musicEnabled && form.musicChoice === "video"} onClick={() => selectMusicChoice("video")}>
                      <FileVideo size={16} />
                      صوت من فيديو
                    </button>
                    <button className={form.musicEnabled && form.musicChoice === "url" ? "active" : ""} type="button" role="radio" aria-checked={form.musicEnabled && form.musicChoice === "url"} onClick={() => selectMusicChoice("url")}>
                      <Link2 size={16} />
                      رابط أغنية
                    </button>
                    <button className={!form.musicEnabled ? "active" : ""} type="button" role="radio" aria-checked={!form.musicEnabled} onClick={() => selectMusicChoice("none")}>
                      <Music2 size={16} />
                      إيقاف الموسيقى
                    </button>
                  </div>

                  {form.musicEnabled ? (
                    <>
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
                          <input type="file" accept={acceptedVideoFormats} disabled={musicVideoBusy} onChange={(event) => handleOrderMusicVideoFile(event.target.files?.[0])} />
                        </label>
                      ) : null}

                      {form.musicChoice === "url" ? (
                        <div className={`field ${errors.musicUrl ? "has-error" : ""}`}>
                          <label htmlFor="musicUrl">رابط أغنية مباشر</label>
                          <input id="musicUrl" name="musicUrl" inputMode="url" placeholder="https://example.com/song.mp3" value={form.musicUrl} onChange={(event) => updateField("musicUrl", event.target.value)} aria-invalid={Boolean(errors.musicUrl)} />
                          {errors.musicUrl ? <small className="field-error">{errors.musicUrl}</small> : <small className="order-music-url-hint">ليس رابط فيديو بل موسيقى فقط</small>}
                        </div>
                      ) : null}

                      {(form.musicChoice === "upload" || form.musicChoice === "video") && form.musicUrl ? (
                        <audio className="order-music-audio-preview" controls preload="metadata" src={form.musicUrl} />
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}
            </section>
          </section>

          <section className={`order-wizard-step ${activeStep.id === "review" ? "is-active" : ""}`} aria-hidden={activeStep.id !== "review"}>
            <div className="order-review-grid">
              {[
                ["القالب", selectedTemplate.arabicName, 0],
                ["الأسماء", `${fieldValue(form.groomName)} و ${fieldValue(form.brideName)}`, 1],
                ["التاريخ", readableDate || "لم يحدد بعد", 2],
                ["الهاتف", fieldValue(form.phone), 2],
                ["القاعة", fieldValue(form.venue), 3],
                ["الصور", `${previewImageUrls.length} من 3`, 4],
                ["الموسيقى", !form.musicEnabled ? "بدون موسيقى" : form.musicChoice === "default" ? "الموسيقى الأساسية" : form.musicChoice === "upload" ? "ملف MP3" : form.musicChoice === "video" ? "صوت من فيديو" : "رابط أغنية", 5],
              ].map(([label, value, step]) => (
                <div className="order-review-item" key={String(label)}>
                  <span>✓ {label}</span>
                  <strong>{value}</strong>
                  <button type="button" onClick={() => goToStep(Number(step))}>تعديل</button>
                </div>
              ))}
            </div>

            <div className="order-review-customizations">
              <div className="order-compact-section-head">
                <h2>تخصيصات اختيارية</h2>
                <p>يمكنك تركها فارغة والضغط على التالي مباشرة لإنشاء الدعوة.</p>
              </div>

              <article className="order-customization-card">
                <Heart size={19} />
                <div>
                  <strong>نص الافتتاح السينمائي</strong>
                  <span>اختياري</span>
                </div>
                <button className="btn btn-soft" type="button" onClick={() => setOpeningTextOpen((current) => !current)}>
                  {openingTextOpen ? "إخفاء" : form.openingText ? "تعديل" : "إضافة"}
                </button>
              </article>
              {openingTextOpen ? (
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
              ) : null}

              <article className="order-customization-card">
                <Heart size={19} />
                <div>
                  <strong>قصة العروسين</strong>
                  <span>{form.storyEnabled ? `${filledOrderStory(form.story).length || minimumOrderStoryStages} مراحل` : "اختياري"}</span>
                </div>
                <button className="btn btn-soft" type="button" onClick={() => {
                  if (form.storyEnabled) {
                    cancelOrderStory();
                    return;
                  }
                  const currentValues = getCurrentFormFromDom();
                  setForm((current) => ({ ...current, ...currentValues, storyEnabled: true, story: ensureMinimumOrderStoryItems(current.story) }));
                  setStoryErrors({});
                  if (message) setMessage("");
                }}>
                  {form.storyEnabled ? "إخفاء" : "إضافة"}
                </button>
              </article>

              {form.storyEnabled ? (
                <div className="order-story-fields order-customization-fields">
                  <div className="order-story-head">
                    <p>اكتب مرحلتين على الأقل، ويمكنك إضافة حتى 4 مراحل فقط.</p>
                  </div>
                  <div className="order-story-list">
                    {ensureMinimumOrderStoryItems(form.story).slice(0, maximumOrderStoryStages).map((item, index) => {
                      const example = orderStoryExamples[index] || orderStoryExamples[orderStoryExamples.length - 1];
                      const dateError = storyErrors[storyFieldErrorKey(index, "date")];
                      const titleError = storyErrors[storyFieldErrorKey(index, "title")];
                      const descriptionError = storyErrors[storyFieldErrorKey(index, "description")];
                      return (
                        <article className="order-story-item" key={item.id || index}>
                          <div className="order-story-item-head">
                            <strong>مرحلة {index + 1}</strong>
                            <button className="admin-icon-button order-story-remove-button" type="button" onClick={() => removeStoryItem(index)} title="حذف المرحلة" aria-label={`حذف مرحلة ${index + 1}`}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="field">
                            <label htmlFor={`storyDate-${index}`}>التاريخ</label>
                            <input id={`storyDate-${index}`} name={`storyDate-${index}`} data-order-story-field="true" data-story-field="date" data-story-index={index} value={item.date || ""} onBeforeInput={(event) => handleStoryFieldBeforeInput(index, "date", event)} onChange={(event) => updateStoryText(index, "date", event.target.value)} placeholder={example.date} aria-invalid={Boolean(dateError)} />
                            {dateError ? <small className="field-error">{dateError}</small> : null}
                          </div>
                          <div className="field">
                            <label htmlFor={`storyTitle-${index}`}>العنوان</label>
                            <input id={`storyTitle-${index}`} name={`storyTitle-${index}`} data-order-story-field="true" data-story-field="title" data-story-index={index} value={item.title} onBeforeInput={(event) => handleStoryFieldBeforeInput(index, "title", event)} onChange={(event) => updateStoryText(index, "title", event.target.value)} placeholder={example.title} aria-invalid={Boolean(titleError)} />
                            {titleError ? <small className="field-error">{titleError}</small> : null}
                          </div>
                          <div className="field full">
                            <label htmlFor={`storyDescription-${index}`}>الوصف</label>
                            <textarea id={`storyDescription-${index}`} name={`storyDescription-${index}`} data-order-story-field="true" data-story-field="description" data-story-index={index} rows={3} value={item.description} aria-invalid={Boolean(descriptionError)} onBeforeInput={(event) => handleStoryFieldBeforeInput(index, "description", event)} onChange={(event) => updateStoryText(index, "description", event.target.value)} placeholder={example.description} />
                            {descriptionError ? <small className="field-error">{descriptionError}</small> : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {ensureMinimumOrderStoryItems(form.story).length < maximumOrderStoryStages ? (
                    <button className="btn btn-soft order-story-add-button" type="button" onClick={addStoryItem}>
                      <Plus size={16} />
                      إضافة مرحلة
                    </button>
                  ) : (
                    <p className="field-preview">تم الوصول إلى الحد الأقصى: 4 مراحل.</p>
                  )}
                </div>
              ) : null}

              <article className="order-customization-card">
                <Camera size={19} />
                <div>
                  <strong>بيانات المصور</strong>
                  <span>{form.photographerEnabled ? fieldValue(form.photographerName, "مضاف") : "اختياري"}</span>
                </div>
                <button className="btn btn-soft" type="button" onClick={() => updateField("photographerEnabled", !form.photographerEnabled)}>
                  {form.photographerEnabled ? "إخفاء" : "إضافة"}
                </button>
              </article>

              {form.photographerEnabled ? (
                <div className="photographer-fields order-customization-fields">
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
            </div>

            <p className="order-review-submit-note" id="confirm-order">
              راجع البيانات، ثم اضغط إنشاء الدعوة لإرسال الطلب.
            </p>
            {hasImageUploadInProgress ? <p className="order-submit-wait-hint" id="order-upload-wait-hint">انتظر حتي يكتمل رفع الصور الي الدعوه وبعدها اكمل</p> : null}
          </section>

          <div className="order-wizard-actions">
            <button className="btn btn-glass" type="button" onClick={goBack} disabled={isFirstStep}>
              <ArrowRight size={17} />
              رجوع
            </button>
            {isLastStep ? (
              <button className="btn btn-gold btn-glow order-submit" type="submit" disabled={state === "loading" || hasImageUploadInProgress} aria-describedby={hasImageUploadInProgress ? "order-upload-wait-hint" : undefined}>
                {state === "loading" ? <Loader2 size={17} className="animate-float" /> : <ArrowLeft size={17} />}
                إنشاء الدعوة
              </button>
            ) : (
              <button className="btn btn-gold btn-glow" type="button" onClick={goNext}>
                التالي
                <ArrowLeft size={17} />
              </button>
            )}
          </div>
        </form>
      </div>

    </div>
  );
}
