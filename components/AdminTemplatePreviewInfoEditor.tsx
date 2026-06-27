"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  Eye,
  ImagePlus,
  Layers3,
  Link2,
  Loader2,
  MapPin,
  MonitorSmartphone,
  Music2,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
  Type,
  UploadCloud,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { uploadBrowserPreviewImage, type BrowserImageUploadStatus } from "@/lib/browser-image-upload";
import { acceptedImageFormats } from "@/lib/image-formats";
import type { TemplatePreviewEditableInfo, TemplatePreviewInfo } from "@/lib/template-preview-info";
import type { CoupleStoryItem, GalleryStoryItem, TemplateDefinition } from "@/lib/types";
import { SimpleDateInput } from "@/components/SimpleDateInput";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
type EditMode = "global" | "template";
type ScopeMode = "all" | "allExcept";

type FieldProps = {
  label: string;
  hint?: string;
  focusKey: string;
  children: ReactNode;
  full?: boolean;
  onFocusField: (key: string) => void;
};

type ConflictState = {
  message: string;
  templates: Array<{ slug: string; arabicName: string }>;
} | null;

const emptyStory: CoupleStoryItem = { id: "", title: "", description: "", date: "", imageUrl: "" };
const emptyGalleryStory: GalleryStoryItem = { title: "", description: "" };
const templateMediaEndpoint = "/api/admin/templates/media";

function baseInfo(info: TemplatePreviewInfo): TemplatePreviewEditableInfo {
  return {
    language: info.language,
    groomName: info.groomName,
    brideName: info.brideName,
    weddingDate: info.weddingDate,
    weddingTime: info.weddingTime,
    venue: info.venue,
    city: info.city,
    mapUrl: info.mapUrl,
    heroVideoUrl: info.heroVideoUrl,
    gallery: info.gallery,
    texts: info.texts,
    photographer: info.photographer,
  };
}

function resolveInfo(info: TemplatePreviewInfo, slug?: string): TemplatePreviewEditableInfo {
  const base = baseInfo(info);
  const override = slug ? info.templateOverrides?.[slug] : undefined;
  if (!override) return base;
  return {
    ...base,
    ...override,
    texts: {
      ...base.texts,
      ...override.texts,
    },
    photographer: {
      ...base.photographer,
      ...override.photographer,
    },
  };
}

function compactGallery(gallery: string[]) {
  return [gallery[0] || "", gallery[1] || "", gallery[2] || ""];
}

function compactStory(story: CoupleStoryItem[]) {
  return [0, 1, 2].map((index) => story[index] || { ...emptyStory, id: `template-preview-story-${index + 1}` });
}

function compactGalleryStories(stories: GalleryStoryItem[]) {
  return [0, 1, 2].map((index) => stories[index] || emptyGalleryStory);
}

function fieldLabel(status: SaveStatus) {
  if (status === "dirty") return "توجد تغييرات غير محفوظة";
  if (status === "saving") return "جاري الحفظ";
  if (status === "saved") return "تم الحفظ بنجاح";
  if (status === "error") return "فشل الحفظ";
  return "جاهز";
}

function Field({ label, hint, focusKey, children, full, onFocusField }: FieldProps) {
  return (
    <label className={full ? "field template-field-explained full" : "field template-field-explained"} onFocusCapture={() => onFocusField(focusKey)}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function UploadStatusLine({ status }: { status?: BrowserImageUploadStatus | null }) {
  if (!status) return null;
  return (
    <small className={`template-upload-status is-${status.phase}`}>
      {status.phase === "compressing" || status.phase === "uploading" || status.phase === "retrying" ? <Loader2 size={13} /> : status.phase === "saved" ? <CheckCircle2 size={13} /> : null}
      {status.message}
    </small>
  );
}

export function AdminTemplatePreviewInfoEditor({ templates, templatePreviewInfo }: { templates: TemplateDefinition[]; templatePreviewInfo: TemplatePreviewInfo }) {
  const [serverInfo, setServerInfo] = useState(templatePreviewInfo);
  const [editMode, setEditMode] = useState<EditMode>("global");
  const [scopeMode, setScopeMode] = useState<ScopeMode>(templatePreviewInfo.adminScope?.mode || "all");
  const [excludedSlugs, setExcludedSlugs] = useState<string[]>(templatePreviewInfo.adminScope?.excludedSlugs || []);
  const [activeTemplateSlug, setActiveTemplateSlug] = useState(templates[0]?.slug || "featured-1");
  const [state, setState] = useState<TemplatePreviewEditableInfo>(() => baseInfo(templatePreviewInfo));
  const [lastSavedState, setLastSavedState] = useState<TemplatePreviewEditableInfo>(() => baseInfo(templatePreviewInfo));
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState<ConflictState>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [uploadStatuses, setUploadStatuses] = useState<Record<string, BrowserImageUploadStatus | null>>({});
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveTimerRef = useRef<number | null>(null);
  const hydratedRef = useRef(false);

  const gallery = useMemo(() => compactGallery(state.gallery), [state.gallery]);
  const story = useMemo(() => compactStory(state.texts.story || []), [state.texts.story]);
  const galleryStories = useMemo(() => compactGalleryStories(state.texts.galleryStories || []), [state.texts.galleryStories]);
  const selectedTemplate = templates.find((template) => template.slug === activeTemplateSlug) || templates[0];
  const hasTemplateOverride = Boolean(serverInfo.templateOverrides?.[activeTemplateSlug]);

  const previewPayload = useMemo(
    () => ({
      ...state,
      gallery: gallery.filter(Boolean),
      texts: {
        ...state.texts,
        story: story.filter((item) => item.title || item.description || item.date || item.imageUrl),
        galleryStories: galleryStories.filter((item) => item.title || item.description),
      },
      disableMusic: true,
    }),
    [gallery, galleryStories, state, story],
  );

  function postPreviewUpdate(focusKey?: string) {
    iframeRef.current?.contentWindow?.postMessage({ source: "badr-admin-preview", type: "preview:update", payload: { ...previewPayload, focusKey } }, window.location.origin);
  }

  useEffect(() => {
    postPreviewUpdate();
  }, [previewPayload, activeTemplateSlug]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin === window.location.origin && event.data?.source === "badr-admin-preview" && event.data.type === "preview:ready") postPreviewUpdate();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [previewPayload]);

  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (status !== "dirty" && status !== "saving") return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [status]);

  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    const next = editMode === "template" ? resolveInfo(serverInfo, activeTemplateSlug) : baseInfo(serverInfo);
    setState(next);
    setLastSavedState(next);
    setStatus("idle");
    setMessage("");
  }, [editMode, activeTemplateSlug, serverInfo]);

  useEffect(() => {
    if (status !== "dirty") return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      void saveNow();
    }, 2400);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [status, state, editMode, scopeMode, excludedSlugs]);

  function markDirty() {
    setStatus("dirty");
    setMessage("");
  }

  function patch(patchState: Partial<TemplatePreviewEditableInfo>) {
    setState((current) => ({ ...current, ...patchState }));
    markDirty();
  }

  function patchTexts(patchState: Partial<TemplatePreviewEditableInfo["texts"]>) {
    setState((current) => ({ ...current, texts: { ...current.texts, ...patchState } }));
    markDirty();
  }

  function patchPhotographer(patchState: Partial<TemplatePreviewEditableInfo["photographer"]>) {
    setState((current) => ({ ...current, photographer: { ...current.photographer, ...patchState } }));
    markDirty();
  }

  function patchGallery(index: number, value: string) {
    const next = compactGallery(state.gallery);
    next[index] = value;
    patch({ gallery: next });
  }

  function patchStory(index: number, patchItem: Partial<CoupleStoryItem>) {
    const next = story.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patchItem } : item));
    patchTexts({ story: next });
  }

  function patchGalleryStory(index: number, patchItem: Partial<GalleryStoryItem>) {
    const next = galleryStories.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patchItem } : item));
    patchTexts({ galleryStories: next });
  }

  function focusPreview(key: string) {
    postPreviewUpdate(key);
  }

  async function saveNow(conflictResolution: "ask" | "applyGlobal" | "preserveCustom" = "ask") {
    if (status === "saving") return;
    setStatus("saving");
    setMessage("");
    const response = await fetch("/api/admin/templates/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: editMode,
        templateSlug: editMode === "template" ? activeTemplateSlug : undefined,
        content: state,
        scope: { mode: scopeMode, excludedSlugs },
        conflictResolution,
      }),
    });
    const data = (await response.json().catch(() => null)) as
      | { ok?: boolean; error?: string; conflict?: boolean; message?: string; templates?: Array<{ slug: string; arabicName: string }>; previewInfo?: TemplatePreviewInfo }
      | null;

    if (response.status === 409 && data?.conflict) {
      setConflict({ message: data.message || "هذا التعديل يتعارض مع تخصيصات قوالب منفردة.", templates: data.templates || [] });
      setStatus("dirty");
      return;
    }
    if (!response.ok || !data?.previewInfo) {
      setStatus("error");
      setMessage(data?.error || "تعذر حفظ التعديلات.");
      return;
    }
    setServerInfo(data.previewInfo);
    setLastSavedState(state);
    setStatus("saved");
    setMessage("تم الحفظ وتحديث القوالب.");
    window.setTimeout(() => setStatus((current) => (current === "saved" ? "idle" : current)), 1800);
  }

  function undoChanges() {
    setState(lastSavedState);
    setStatus("idle");
    setMessage("تم الرجوع لآخر نسخة محفوظة.");
  }

  async function uploadImage(file: File, slot: string, onUrl: (url: string) => void) {
    setUploadStatuses((current) => ({ ...current, [slot]: { phase: "selected", progress: 5, message: "تم اختيار الصورة" } }));
    try {
      const url = await uploadBrowserPreviewImage(file, {
        endpoint: templateMediaEndpoint,
        slot,
        onStatus: (next) => setUploadStatuses((current) => ({ ...current, [slot]: next })),
      });
      onUrl(url);
    } catch (error) {
      setUploadStatuses((current) => ({ ...current, [slot]: { phase: "error", progress: 0, message: error instanceof Error ? error.message : "تعذر رفع الصورة" } }));
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "تعذر رفع الصورة.");
    }
  }

  async function uploadVideo(file: File, slot: string, onUrl: (url: string) => void) {
    setUploadStatuses((current) => ({ ...current, [slot]: { phase: "uploading", progress: 30, message: "جاري رفع الفيديو" } }));
    const formData = new FormData();
    formData.append("kind", "video");
    formData.append("slot", slot);
    formData.append("media", file);
    try {
      const response = await fetch(templateMediaEndpoint, { method: "POST", body: formData });
      const data = (await response.json().catch(() => null)) as { mediaUrl?: string; error?: string } | null;
      if (!response.ok || !data?.mediaUrl) throw new Error(data?.error || "تعذر رفع الفيديو.");
      setUploadStatuses((current) => ({ ...current, [slot]: { phase: "saved", progress: 100, message: "تم رفع الفيديو" } }));
      onUrl(data.mediaUrl);
    } catch (error) {
      setUploadStatuses((current) => ({ ...current, [slot]: { phase: "error", progress: 0, message: error instanceof Error ? error.message : "تعذر رفع الفيديو" } }));
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "تعذر رفع الفيديو.");
    }
  }

  function onImageFile(event: ChangeEvent<HTMLInputElement>, slot: string, onUrl: (url: string) => void) {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadImage(file, slot, onUrl);
  }

  function onVideoFile(event: ChangeEvent<HTMLInputElement>, slot: string, onUrl: (url: string) => void) {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadVideo(file, slot, onUrl);
  }

  return (
    <section className="template-command-center" id="template-preview-info">
      <div className={`template-save-strip is-${status}`}>
        <div>
          <strong>{fieldLabel(status)}</strong>
          <span>{editMode === "template" ? `تعديل قالب ${selectedTemplate?.arabicName || activeTemplateSlug} فقط` : scopeMode === "allExcept" ? "تعديل جماعي مع استثناءات" : "تعديل جماعي لكل القوالب"}</span>
        </div>
        <div className="template-save-actions">
          <button className="btn btn-soft" type="button" onClick={undoChanges} disabled={status === "saving"}>
            <RotateCcw size={16} />
            تراجع
          </button>
          <button className="btn btn-soft template-mobile-preview-button" type="button" onClick={() => setPreviewOpen(true)}>
            <Eye size={16} />
            معاينة
          </button>
          <button className="btn btn-gold" type="button" onClick={() => void saveNow()} disabled={status === "saving"}>
            {status === "saving" ? <Loader2 size={16} /> : <Save size={16} />}
            حفظ الآن
          </button>
        </div>
      </div>

      <div className="template-command-head">
        <div>
          <span className="eyebrow">Templates Content Studio</span>
          <h2>تعديل القوالب الجاهزة</h2>
          <p>إدارة مركزية للنصوص والوسائط والمعاينة الحية، مع حفظ تلقائي واستثناءات قابلة للتوسع لأي قالب جديد.</p>
        </div>
        <MonitorSmartphone size={24} />
      </div>

      {message ? <div className={status === "error" ? "notice danger" : "notice success"}>{message}</div> : null}

      <div className="template-command-layout">
        <div className="template-edit-rail">
          <section className="template-editor-block">
            <div className="template-editor-block-head">
              <Layers3 size={18} />
              <strong>نطاق التطبيق</strong>
            </div>
            <div className="template-scope-switch">
              <button type="button" className={editMode === "global" ? "active" : ""} onClick={() => setEditMode("global")}>
                تطبيق جماعي
              </button>
              <button type="button" className={editMode === "template" ? "active" : ""} onClick={() => setEditMode("template")}>
                قالب منفرد
              </button>
            </div>
            {editMode === "global" ? (
              <>
                <div className="template-scope-switch secondary">
                  <button type="button" className={scopeMode === "all" ? "active" : ""} onClick={() => { setScopeMode("all"); markDirty(); }}>
                    تطبيق على الجميع
                  </button>
                  <button type="button" className={scopeMode === "allExcept" ? "active" : ""} onClick={() => { setScopeMode("allExcept"); markDirty(); }}>
                    الجميع باستثناء
                  </button>
                </div>
                {scopeMode === "allExcept" ? (
                  <div className="template-exception-list">
                    {templates.map((template) => (
                      <label key={template.slug}>
                        <input
                          type="checkbox"
                          checked={excludedSlugs.includes(template.slug)}
                          onChange={(event) => {
                            setExcludedSlugs((current) => event.target.checked ? [...new Set([...current, template.slug])] : current.filter((slug) => slug !== template.slug));
                            markDirty();
                          }}
                        />
                        <span>{template.arabicName}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <label className="field">
                <span>القالب المطلوب تعديله</span>
                <select value={activeTemplateSlug} onChange={(event) => setActiveTemplateSlug(event.target.value)}>
                  {templates.map((template) => (
                    <option value={template.slug} key={template.slug}>
                      {template.arabicName}
                    </option>
                  ))}
                </select>
                {hasTemplateOverride ? <small>هذا القالب يحتوي تعديلات مخصصة محفوظة.</small> : <small>سيتم إنشاء تخصيص لهذا القالب عند الحفظ.</small>}
              </label>
            )}
          </section>

          <section className="template-editor-block">
            <div className="template-editor-block-head">
              <CalendarDays size={18} />
              <strong>بيانات المناسبة</strong>
            </div>
            <div className="admin-form-grid compact-controls">
              <Field label="لغة القالب" focusKey="hero" onFocusField={focusPreview}>
                <select value={state.language} onChange={(event) => patch({ language: event.target.value === "en" ? "en" : "ar" })}>
                  <option value="ar">عربي</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label="اسم العريس" hint="ينعكس في الهيرو وكل مواضع الأسماء." focusKey="hero" onFocusField={focusPreview}>
                <input value={state.groomName} onChange={(event) => patch({ groomName: event.target.value })} />
              </Field>
              <Field label="اسم العروس" hint="ينعكس في الهيرو وكل مواضع الأسماء." focusKey="hero" onFocusField={focusPreview}>
                <input value={state.brideName} onChange={(event) => patch({ brideName: event.target.value })} />
              </Field>
              <Field label="التاريخ" focusKey="date" onFocusField={focusPreview}>
                <SimpleDateInput value={state.weddingDate} onChange={(value) => patch({ weddingDate: value })} />
              </Field>
              <Field label="الوقت" focusKey="date" onFocusField={focusPreview}>
                <select value={state.weddingTime} onChange={(event) => patch({ weddingTime: event.target.value })}>
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
              </Field>
              <Field label="الموقع" focusKey="map" onFocusField={focusPreview}>
                <input value={state.venue} onChange={(event) => patch({ venue: event.target.value })} />
              </Field>
              <Field label="المدينة" focusKey="map" onFocusField={focusPreview}>
                <input value={state.city} onChange={(event) => patch({ city: event.target.value })} />
              </Field>
              <Field label="رابط الخريطة" focusKey="map" full onFocusField={focusPreview}>
                <input dir="ltr" value={state.mapUrl} onChange={(event) => patch({ mapUrl: event.target.value })} />
              </Field>
            </div>
          </section>

          <section className="template-editor-block">
            <div className="template-editor-block-head">
              <Type size={18} />
              <strong>النصوص العامة والأزرار</strong>
            </div>
            <div className="admin-form-grid compact-controls">
              <Field label="نص الفتح" focusKey="hero" full onFocusField={focusPreview}>
                <input value={state.texts.openingText} onChange={(event) => patchTexts({ openingText: event.target.value })} />
              </Field>
              <Field label="الترحيب الرئيسي" focusKey="message" full onFocusField={focusPreview}>
                <textarea rows={3} value={state.texts.inviteMessage} onChange={(event) => patchTexts({ inviteMessage: event.target.value })} />
              </Field>
              <Field label="النص الثانوي" focusKey="message" full onFocusField={focusPreview}>
                <textarea rows={3} value={state.texts.inviteMessageSecondary} onChange={(event) => patchTexts({ inviteMessageSecondary: event.target.value })} />
              </Field>
              <Field label="سؤال الحضور" focusKey="rsvp" onFocusField={focusPreview}>
                <input value={state.texts.rsvpQuestion} onChange={(event) => patchTexts({ rsvpQuestion: event.target.value })} />
              </Field>
              <Field label="رسالة الاعتذار" focusKey="rsvp" onFocusField={focusPreview}>
                <input value={state.texts.rsvpDeclinedMessage} onChange={(event) => patchTexts({ rsvpDeclinedMessage: event.target.value })} />
              </Field>
              <Field label="نجاح الحضور" focusKey="rsvp" onFocusField={focusPreview}>
                <input value={state.texts.rsvpConfirmedSuccessMessage} onChange={(event) => patchTexts({ rsvpConfirmedSuccessMessage: event.target.value })} />
              </Field>
              <Field label="نجاح الاعتذار" focusKey="rsvp" onFocusField={focusPreview}>
                <input value={state.texts.rsvpDeclinedSuccessMessage} onChange={(event) => patchTexts({ rsvpDeclinedSuccessMessage: event.target.value })} />
              </Field>
            </div>
          </section>

          <section className="template-editor-block">
            <div className="template-editor-block-head">
              <ImagePlus size={18} />
              <strong>الوسائط</strong>
            </div>
            <div className="template-media-grid redesigned">
              {gallery.map((image, index) => {
                const slot = `gallery-${index + 1}`;
                return (
                  <article className="template-media-control" key={slot} onFocus={() => focusPreview("gallery")}>
                    <div className="template-media-preview">{image ? <img src={image} alt={`صورة ${index + 1}`} /> : <ImagePlus size={24} />}</div>
                    <div className="template-media-control-body">
                      <strong>صورة القالب {index + 1}</strong>
                      <UploadStatusLine status={uploadStatuses[slot]} />
                      <div className="template-media-actions">
                        <label className="btn btn-gold">
                          <UploadCloud size={16} />
                          استبدال
                          <input type="file" accept={acceptedImageFormats} onChange={(event) => onImageFile(event, slot, (url) => patchGallery(index, url))} />
                        </label>
                        {image ? <button className="btn btn-soft danger-soft" type="button" onClick={() => patchGallery(index, "")}><Trash2 size={16} /> حذف</button> : null}
                      </div>
                    </div>
                  </article>
                );
              })}
              <article className="template-media-control" onFocus={() => focusPreview("hero")}>
                <div className="template-media-preview">{state.heroVideoUrl ? <video src={state.heroVideoUrl} muted playsInline controls /> : <Video size={24} />}</div>
                <div className="template-media-control-body">
                  <strong>فيديو خلفية اختياري</strong>
                  <UploadStatusLine status={uploadStatuses.heroVideo} />
                  <div className="template-media-actions">
                    <label className="btn btn-gold">
                      <Video size={16} />
                      استبدال الفيديو
                      <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v" onChange={(event) => onVideoFile(event, "heroVideo", (url) => patch({ heroVideoUrl: url }))} />
                    </label>
                    {state.heroVideoUrl ? <button className="btn btn-soft danger-soft" type="button" onClick={() => patch({ heroVideoUrl: "" })}><Trash2 size={16} /> حذف</button> : null}
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section className="template-editor-block">
            <div className="template-editor-block-head">
              <Camera size={18} />
              <strong>معلومات المصور والتواصل</strong>
            </div>
            <div className="admin-form-grid compact-controls">
              <label className="admin-toggle-row template-inline-toggle" onFocus={() => focusPreview("photographer")}>
                <input type="checkbox" checked={state.photographer.enabled} onChange={(event) => patchPhotographer({ enabled: event.target.checked })} />
                <span>إظهار كارت المصور</span>
              </label>
              <Field label="اسم المصور" focusKey="photographer" onFocusField={focusPreview}>
                <input value={state.photographer.name} onChange={(event) => patchPhotographer({ name: event.target.value })} />
              </Field>
              <Field label="وصف المصور" focusKey="photographer" full onFocusField={focusPreview}>
                <textarea rows={3} value={state.photographer.description} onChange={(event) => patchPhotographer({ description: event.target.value })} />
              </Field>
              <Field label="Facebook" focusKey="photographer" onFocusField={focusPreview}>
                <input dir="ltr" value={state.photographer.facebookUrl} onChange={(event) => patchPhotographer({ facebookUrl: event.target.value })} />
              </Field>
              <Field label="Instagram" focusKey="photographer" onFocusField={focusPreview}>
                <input dir="ltr" value={state.photographer.instagramUrl} onChange={(event) => patchPhotographer({ instagramUrl: event.target.value })} />
              </Field>
            </div>
            <article className="template-media-control photographer-logo-control" onFocus={() => focusPreview("photographer")}>
              <div className="template-media-preview">{state.photographer.logoUrl ? <img src={state.photographer.logoUrl} alt={state.photographer.name} /> : <UserRound size={24} />}</div>
              <div className="template-media-control-body">
                <strong>شعار / صورة المصور</strong>
                <UploadStatusLine status={uploadStatuses.photographerLogo} />
                <div className="template-media-actions">
                  <label className="btn btn-gold">
                    <UploadCloud size={16} />
                    استبدال
                    <input type="file" accept={acceptedImageFormats} onChange={(event) => onImageFile(event, "photographerLogo", (url) => patchPhotographer({ logoUrl: url }))} />
                  </label>
                  {state.photographer.logoUrl ? <button className="btn btn-soft danger-soft" type="button" onClick={() => patchPhotographer({ logoUrl: "" })}><Trash2 size={16} /> حذف</button> : null}
                </div>
              </div>
            </article>
          </section>

          <section className="template-editor-block">
            <div className="template-editor-block-head">
              <Settings2 size={18} />
              <strong>الأقسام الإضافية</strong>
            </div>
            <div className="template-preview-repeater">
              {story.map((item, index) => {
                const slot = `story-${index + 1}`;
                return (
                  <fieldset className="template-preview-fieldset" key={slot} onFocus={() => focusPreview("story")}>
                    <legend>حدث {index + 1}</legend>
                    <div className="admin-form-grid compact-controls">
                      <Field label="عنوان الحدث" focusKey="story" onFocusField={focusPreview}>
                        <input value={item.title || ""} onChange={(event) => patchStory(index, { title: event.target.value })} />
                      </Field>
                      <Field label="تاريخ الحدث" focusKey="story" onFocusField={focusPreview}>
                        <input value={item.date || ""} onChange={(event) => patchStory(index, { date: event.target.value })} />
                      </Field>
                      <Field label="وصف الحدث" focusKey="story" full onFocusField={focusPreview}>
                        <textarea rows={2} value={item.description || ""} onChange={(event) => patchStory(index, { description: event.target.value })} />
                      </Field>
                    </div>
                    <div className="template-story-media-row">
                      {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <ImagePlus size={20} />}
                      <UploadStatusLine status={uploadStatuses[slot]} />
                      <label className="btn btn-soft">
                        <UploadCloud size={15} />
                        صورة الحدث
                        <input type="file" accept={acceptedImageFormats} onChange={(event) => onImageFile(event, slot, (url) => patchStory(index, { imageUrl: url }))} />
                      </label>
                      {item.imageUrl ? <button className="btn btn-soft danger-soft" type="button" onClick={() => patchStory(index, { imageUrl: "" })}><Trash2 size={15} /> حذف</button> : null}
                    </div>
                  </fieldset>
                );
              })}
              {galleryStories.map((item, index) => (
                <fieldset className="template-preview-fieldset compact" key={`gallery-story-${index}`} onFocus={() => focusPreview("gallery")}>
                  <legend>تعليق صورة {index + 1}</legend>
                  <div className="admin-form-grid compact-controls">
                    <Field label="عنوان الصورة" focusKey="gallery" onFocusField={focusPreview}>
                      <input value={item.title || ""} onChange={(event) => patchGalleryStory(index, { title: event.target.value })} />
                    </Field>
                    <Field label="وصف الصورة" focusKey="gallery" onFocusField={focusPreview}>
                      <input value={item.description || ""} onChange={(event) => patchGalleryStory(index, { description: event.target.value })} />
                    </Field>
                  </div>
                </fieldset>
              ))}
            </div>
          </section>

          <section className="template-editor-block muted-block">
            <div className="template-editor-block-head">
              <Music2 size={18} />
              <strong>الموسيقى</strong>
            </div>
            <p>موسيقى معاينة القوالب تدار من قسم الموسيقى الحالي، وتظهر هنا ضمن المعاينة فقط بدون تشغيل تلقائي أثناء التحرير.</p>
          </section>
        </div>

        <aside className={previewOpen ? "template-live-preview-pane open" : "template-live-preview-pane"} aria-label="المعاينة المباشرة">
          <div className="template-preview-pane-toolbar">
            <label>
              <span>القالب المعروض</span>
              <select value={activeTemplateSlug} onChange={(event) => setActiveTemplateSlug(event.target.value)}>
                {templates.map((template) => (
                  <option value={template.slug} key={template.slug}>
                    {template.arabicName}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn-soft template-preview-close" onClick={() => setPreviewOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <div className="template-admin-phone-frame redesigned">
            <iframe
              ref={iframeRef}
              src={`/templates/${activeTemplateSlug}/preview?silentPreview=1&builderPreview=1&embed=1`}
              title="المعاينة المباشرة للقالب"
              loading="eager"
              allow="geolocation; notifications"
              onLoad={() => postPreviewUpdate()}
            />
          </div>
        </aside>
      </div>

      <section className="template-single-grid-section">
        <div className="template-editor-block-head">
          <Link2 size={18} />
          <strong>تعديل قالب منفرد</strong>
        </div>
        <div className="template-admin-card-grid">
          {templates.map((template) => (
            <button
              type="button"
              className={activeTemplateSlug === template.slug && editMode === "template" ? "template-admin-mini-card active" : "template-admin-mini-card"}
              key={template.slug}
              onClick={() => {
                setActiveTemplateSlug(template.slug);
                setEditMode("template");
                document.getElementById("template-preview-info")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <span className="template-admin-mini-preview">
                <iframe src={`/templates/${template.slug}/preview?silentPreview=1&embed=1&hidePreviewChrome=1`} title={`معاينة ${template.arabicName}`} loading="lazy" />
              </span>
              <strong>{template.arabicName}</strong>
              <small>{serverInfo.templateOverrides?.[template.slug] ? "تخصيص محفوظ" : template.category}</small>
            </button>
          ))}
        </div>
      </section>

      {conflict ? (
        <div className="template-conflict-backdrop" role="dialog" aria-modal="true">
          <div className="template-conflict-dialog">
            <AlertTriangle size={24} />
            <h3>تعارض مع تعديلات مخصصة</h3>
            <p>{conflict.message}</p>
            <div className="template-conflict-list">
              {conflict.templates.map((template) => (
                <span key={template.slug}>{template.arabicName}</span>
              ))}
            </div>
            <div className="button-row">
              <button className="btn btn-gold" type="button" onClick={() => { setConflict(null); void saveNow("applyGlobal"); }}>
                تطبيق التعديل العام عليها
              </button>
              <button className="btn btn-soft" type="button" onClick={() => { setConflict(null); void saveNow("preserveCustom"); }}>
                حفظ استثناءاتها الحالية
              </button>
              <button className="btn btn-soft" type="button" onClick={() => setConflict(null)}>
                اختيار قوالب معينة فقط
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
