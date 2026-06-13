"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, Camera, Eye, ImagePlus, MapPin, MonitorSmartphone, Trash2, Type, UserRound, Video } from "lucide-react";
import type { TemplatePreviewInfo } from "@/lib/template-preview-info";
import type { CoupleStoryItem, GalleryStoryItem, TemplateDefinition } from "@/lib/types";

type PreviewInfoFormState = Omit<TemplatePreviewInfo, "updatedAt">;

type FieldProps = {
  label: string;
  hint: string;
  children: ReactNode;
  full?: boolean;
};

function initialState(info: TemplatePreviewInfo): PreviewInfoFormState {
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
    gallery: [...info.gallery].slice(0, 3),
    texts: {
      ...info.texts,
      story: [...info.texts.story],
      galleryStories: [...info.texts.galleryStories],
    },
    photographer: { ...info.photographer },
  };
}

function Field({ label, hint, children, full }: FieldProps) {
  return (
    <label className={full ? "field template-field-explained full" : "field template-field-explained"}>
      <span>{label}</span>
      {children}
      <small>{hint}</small>
    </label>
  );
}

function fileUrl(file: File) {
  return URL.createObjectURL(file);
}

function compactGallery(gallery: string[]) {
  return [gallery[0] || "", gallery[1] || "", gallery[2] || ""];
}

function updateListItem<T>(items: T[], index: number, patch: Partial<T>) {
  return items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

function MediaControl({
  label,
  value,
  inputName,
  accept,
  kind,
  hint,
  onChange,
  onDelete,
}: {
  label: string;
  value: string;
  inputName: string;
  accept: string;
  kind: "image" | "video";
  hint: string;
  onChange: (url: string, file: File) => void;
  onDelete: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onChange(fileUrl(file), file);
  }

  function handleDelete() {
    if (inputRef.current) inputRef.current.value = "";
    onDelete();
  }

  return (
    <article className="template-media-control">
      <div className="template-media-preview">
        {value ? kind === "video" ? <video src={value} muted playsInline controls /> : <img src={value} alt={label} /> : <span>{kind === "video" ? <Video size={24} /> : <ImagePlus size={24} />}</span>}
      </div>
      <div className="template-media-control-body">
        <strong>{label}</strong>
        <p>{hint}</p>
        <div className="template-media-actions">
          <button className="btn btn-gold" type="button" onClick={() => inputRef.current?.click()}>
            {kind === "video" ? <Video size={16} /> : <ImagePlus size={16} />}
            {kind === "video" ? "استبدال الفيديو" : "استبدال الصورة"}
          </button>
          {value ? (
            <a className="btn btn-soft" href={value} target="_blank" rel="noreferrer">
              <Eye size={16} />
              معاينة
            </a>
          ) : null}
          <button className="btn btn-soft danger-soft" type="button" onClick={handleDelete}>
            <Trash2 size={16} />
            حذف
          </button>
        </div>
        <input ref={inputRef} name={inputName} type="file" accept={accept} onChange={handleFile} />
      </div>
    </article>
  );
}

export function AdminTemplatePreviewInfoEditor({ templates, templatePreviewInfo }: { templates: TemplateDefinition[]; templatePreviewInfo: TemplatePreviewInfo }) {
  const [state, setState] = useState<PreviewInfoFormState>(() => initialState(templatePreviewInfo));
  const [activeTemplateSlug, setActiveTemplateSlug] = useState(templates[0]?.slug || "featured-1");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const gallery = useMemo(() => compactGallery(state.gallery), [state.gallery]);
  const story = useMemo(() => [state.texts.story[0], state.texts.story[1], state.texts.story[2]].map((item, index) => item || { id: `template-preview-story-${index + 1}`, title: "", description: "", date: "", imageUrl: "" }), [state.texts.story]);
  const galleryStories = useMemo(() => [state.texts.galleryStories[0], state.texts.galleryStories[1], state.texts.galleryStories[2]].map((item) => item || { title: "", description: "" }), [state.texts.galleryStories]);

  const previewPayload = useMemo(
    () => ({
      groomName: state.groomName,
      brideName: state.brideName,
      weddingDate: state.weddingDate,
      weddingTime: state.weddingTime,
      venue: state.venue,
      city: state.city,
      mapUrl: state.mapUrl,
      language: state.language,
      heroVideoUrl: state.heroVideoUrl,
      gallery: gallery.filter(Boolean),
      texts: {
        openingText: state.texts.openingText,
        inviteMessage: state.texts.inviteMessage,
        inviteMessageSecondary: state.texts.inviteMessageSecondary,
        rsvpQuestion: state.texts.rsvpQuestion,
        rsvpDeclinedMessage: state.texts.rsvpDeclinedMessage,
        rsvpConfirmedSuccessMessage: state.texts.rsvpConfirmedSuccessMessage,
        rsvpDeclinedSuccessMessage: state.texts.rsvpDeclinedSuccessMessage,
        story: story.filter((item) => item.title || item.description || item.imageUrl),
        galleryStories: galleryStories.filter((item) => item.title || item.description),
      },
      photographer: state.photographer,
      disableMusic: true,
    }),
    [gallery, galleryStories, state, story],
  );

  function postPreviewUpdate() {
    iframeRef.current?.contentWindow?.postMessage({ source: "badr-admin-preview", type: "preview:update", payload: previewPayload }, window.location.origin);
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

  function patch(patchState: Partial<PreviewInfoFormState>) {
    setState((current) => ({ ...current, ...patchState }));
  }

  function patchTexts(patchState: Partial<PreviewInfoFormState["texts"]>) {
    setState((current) => ({ ...current, texts: { ...current.texts, ...patchState } }));
  }

  function patchPhotographer(patchState: Partial<PreviewInfoFormState["photographer"]>) {
    setState((current) => ({ ...current, photographer: { ...current.photographer, ...patchState } }));
  }

  function patchGallery(index: number, value: string) {
    const next = compactGallery(state.gallery);
    next[index] = value;
    patch({ gallery: next });
  }

  function patchStory(index: number, patchItem: Partial<CoupleStoryItem>) {
    patchTexts({ story: updateListItem(story, index, patchItem) });
  }

  function patchGalleryStory(index: number, patchItem: Partial<GalleryStoryItem>) {
    patchTexts({ galleryStories: updateListItem(galleryStories, index, patchItem) });
  }

  return (
    <section className="panel template-preview-info-panel" id="template-preview-info">
      <div className="template-section-head">
        <div>
          <span className="eyebrow">Template Info</span>
          <h2>معلومات القوالب الجاهزة</h2>
          <p>هذا القسم يعدل محتوى القوالب الجاهزة العامة للموقع بالكامل. أي تعديل هنا يظهر في معاينة الأدمن، وبطاقات صفحة التصاميم، والمعاينة الكاملة للقالب.</p>
        </div>
        <MonitorSmartphone size={24} />
      </div>

      <div className="template-preview-editor-shell">
        <form className="template-preview-info-form" action="/api/admin/templates/info" method="post" encType="multipart/form-data">
          <input type="hidden" name="gallery1" value={gallery[0]} />
          <input type="hidden" name="gallery2" value={gallery[1]} />
          <input type="hidden" name="gallery3" value={gallery[2]} />
          <input type="hidden" name="heroVideoUrl" value={state.heroVideoUrl} />
          <input type="hidden" name="photographerLogoUrl" value={state.photographer.logoUrl} />
          {story.map((item, index) => (
            <input key={`story-image-hidden-${index}`} type="hidden" name={`story${index + 1}ImageUrl`} value={item.imageUrl || ""} />
          ))}

          <div className="template-edit-section">
            <h3>
              <UserRound size={18} />
              بيانات العروسين والموعد
            </h3>
            <div className="admin-form-grid compact-controls">
              <Field label="لغة القالب" hint="تحدد اتجاه النصوص ولغة بعض العناوين داخل الدعوة.">
                <select name="language" value={state.language} onChange={(event) => patch({ language: event.target.value === "en" ? "en" : "ar" })}>
                  <option value="ar">عربي</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label="اسم العريس" hint="يظهر في واجهة الدعوة الرئيسية وعناوين القالب.">
                <input name="groomName" value={state.groomName} onChange={(event) => patch({ groomName: event.target.value })} />
              </Field>
              <Field label="اسم العروس" hint="يظهر بجانب اسم العريس في الهيرو وباقي أقسام الدعوة.">
                <input name="brideName" value={state.brideName} onChange={(event) => patch({ brideName: event.target.value })} />
              </Field>
              <Field label="تاريخ المناسبة" hint="يغذي التاريخ الظاهر والعد التنازلي داخل القالب.">
                <input name="weddingDate" type="date" value={state.weddingDate} onChange={(event) => patch({ weddingDate: event.target.value })} />
              </Field>
              <Field label="وقت المناسبة" hint="يظهر في تفاصيل الحضور وجدول الدعوة.">
                <input name="weddingTime" value={state.weddingTime} onChange={(event) => patch({ weddingTime: event.target.value })} />
              </Field>
            </div>
          </div>

          <div className="template-edit-section">
            <h3>
              <MapPin size={18} />
              بيانات القاعة والموقع
            </h3>
            <div className="admin-form-grid compact-controls">
              <Field label="اسم القاعة / المكان" hint="يظهر في كارت تفاصيل القاعة وقسم الخريطة.">
                <input name="venue" value={state.venue} onChange={(event) => patch({ venue: event.target.value })} />
              </Field>
              <Field label="المدينة" hint="تظهر تحت اسم القاعة وفي تفاصيل المكان.">
                <input name="city" value={state.city} onChange={(event) => patch({ city: event.target.value })} />
              </Field>
              <Field label="رابط Google Maps" hint="يستخدم لزر الاتجاهات ومعاينة موقع القاعة داخل الدعوة." full>
                <input dir="ltr" name="mapUrl" value={state.mapUrl} placeholder="https://maps.google.com/..." onChange={(event) => patch({ mapUrl: event.target.value })} />
              </Field>
            </div>
          </div>

          <div className="template-edit-section">
            <h3>
              <ImagePlus size={18} />
              الصور والفيديو
            </h3>
            <div className="template-media-grid">
              {gallery.map((image, index) => (
                <MediaControl
                  key={`gallery-${index}`}
                  label={`صورة القالب ${index + 1}`}
                  value={image}
                  inputName={`gallery${index + 1}File`}
                  accept="image/*,.heic,.heif"
                  kind="image"
                  hint={index === 0 ? "الصورة الرئيسية وتظهر غالباً في بداية الدعوة." : "تظهر داخل معرض الصور وأقسام الحكاية حسب القالب."}
                  onChange={(url) => patchGallery(index, url)}
                  onDelete={() => patchGallery(index, "")}
                />
              ))}
              <MediaControl
                label="فيديو خلفية اختياري"
                value={state.heroVideoUrl}
                inputName="heroVideoFile"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
                kind="video"
                hint="يظهر كخلفية/افتتاح سينمائي في القوالب التي تدعم الفيديو."
                onChange={(url) => patch({ heroVideoUrl: url })}
                onDelete={() => patch({ heroVideoUrl: "" })}
              />
            </div>
          </div>

          <div className="template-edit-section">
            <h3>
              <Type size={18} />
              الكتابات والأزرار
            </h3>
            <div className="admin-form-grid compact-controls">
              <Field label="نص الفتح" hint="يظهر قبل فتح الدعوة أو في شاشة البداية لبعض القوالب." full>
                <input name="openingText" value={state.texts.openingText} onChange={(event) => patchTexts({ openingText: event.target.value })} />
              </Field>
              <Field label="النص الترحيبي الرئيسي" hint="النص الأساسي أسفل أسماء العروسين أو داخل كارت الدعوة." full>
                <textarea name="inviteMessage" rows={3} value={state.texts.inviteMessage} onChange={(event) => patchTexts({ inviteMessage: event.target.value })} />
              </Field>
              <Field label="النص الترحيبي الثاني" hint="سطر داعم يظهر في أقسام الترحيب أو نهاية الدعوة حسب التصميم." full>
                <textarea name="inviteMessageSecondary" rows={3} value={state.texts.inviteMessageSecondary} onChange={(event) => patchTexts({ inviteMessageSecondary: event.target.value })} />
              </Field>
              <Field label="سؤال الحضور" hint="عنوان قسم أزرار تأكيد الحضور والاعتذار.">
                <input name="rsvpQuestion" value={state.texts.rsvpQuestion} onChange={(event) => patchTexts({ rsvpQuestion: event.target.value })} />
              </Field>
              <Field label="رسالة الاعتذار قبل الإرسال" hint="تظهر عند اختيار الاعتذار قبل حفظ الرد.">
                <input name="rsvpDeclinedMessage" value={state.texts.rsvpDeclinedMessage} onChange={(event) => patchTexts({ rsvpDeclinedMessage: event.target.value })} />
              </Field>
              <Field label="رسالة نجاح الحضور" hint="تظهر بعد ضغط زر تأكيد الحضور.">
                <input name="rsvpConfirmedSuccessMessage" value={state.texts.rsvpConfirmedSuccessMessage} onChange={(event) => patchTexts({ rsvpConfirmedSuccessMessage: event.target.value })} />
              </Field>
              <Field label="رسالة نجاح الاعتذار" hint="تظهر بعد إرسال الاعتذار.">
                <input name="rsvpDeclinedSuccessMessage" value={state.texts.rsvpDeclinedSuccessMessage} onChange={(event) => patchTexts({ rsvpDeclinedSuccessMessage: event.target.value })} />
              </Field>
            </div>
          </div>

          <div className="template-edit-section">
            <h3>
              <CalendarDays size={18} />
              قصة العروسين وتعليقات الصور
            </h3>
            <div className="template-preview-repeater">
              {story.map((item, index) => (
                <fieldset className="template-preview-fieldset" key={`story-${index}`}>
                  <legend>حدث {index + 1}</legend>
                  <div className="admin-form-grid compact-controls">
                    <Field label="عنوان الحدث" hint="يظهر في خط القصة أو Timeline.">
                      <input name={`story${index + 1}Title`} value={item.title || ""} onChange={(event) => patchStory(index, { title: event.target.value })} />
                    </Field>
                    <Field label="تاريخ الحدث" hint="يظهر بجوار عنوان الحدث داخل القصة.">
                      <input name={`story${index + 1}Date`} value={item.date || ""} onChange={(event) => patchStory(index, { date: event.target.value })} />
                    </Field>
                    <Field label="وصف الحدث" hint="النص القصير الذي يشرح هذه اللحظة داخل القالب." full>
                      <textarea name={`story${index + 1}Description`} rows={2} value={item.description || ""} onChange={(event) => patchStory(index, { description: event.target.value })} />
                    </Field>
                  </div>
                  <MediaControl
                    label="صورة الحدث"
                    value={item.imageUrl || ""}
                    inputName={`story${index + 1}ImageFile`}
                    accept="image/*,.heic,.heif"
                    kind="image"
                    hint="تظهر بجانب الحدث في القوالب التي تعرض قصة العروسين بصور."
                    onChange={(url) => patchStory(index, { imageUrl: url })}
                    onDelete={() => patchStory(index, { imageUrl: "" })}
                  />
                </fieldset>
              ))}
              {galleryStories.map((item, index) => (
                <fieldset className="template-preview-fieldset compact" key={`gallery-story-${index}`}>
                  <legend>تعليق صورة {index + 1}</legend>
                  <div className="admin-form-grid compact-controls">
                    <Field label="عنوان الصورة" hint="يظهر فوق أو أسفل صورة المعرض حسب القالب.">
                      <input name={`galleryStory${index + 1}Title`} value={item.title || ""} onChange={(event) => patchGalleryStory(index, { title: event.target.value })} />
                    </Field>
                    <Field label="وصف الصورة" hint="شرح قصير للصورة داخل معرض الدعوة.">
                      <input name={`galleryStory${index + 1}Description`} value={item.description || ""} onChange={(event) => patchGalleryStory(index, { description: event.target.value })} />
                    </Field>
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          <div className="template-edit-section">
            <h3>
              <Camera size={18} />
              معلومات المصور
            </h3>
            <div className="admin-form-grid compact-controls">
              <label className="admin-toggle-row template-inline-toggle">
                <input name="photographerEnabled" type="checkbox" checked={state.photographer.enabled} onChange={(event) => patchPhotographer({ enabled: event.target.checked })} />
                <span>إظهار كارت المصور داخل القوالب</span>
              </label>
              <Field label="اسم المصور" hint="يظهر في كارت المصور وأزرار التواصل.">
                <input name="photographerName" value={state.photographer.name} onChange={(event) => patchPhotographer({ name: event.target.value })} />
              </Field>
              <Field label="Instagram" hint="رابط زر إنستجرام داخل كارت المصور.">
                <input dir="ltr" name="photographerInstagramUrl" value={state.photographer.instagramUrl} onChange={(event) => patchPhotographer({ instagramUrl: event.target.value })} />
              </Field>
              <Field label="Facebook" hint="رابط زر فيسبوك داخل كارت المصور.">
                <input dir="ltr" name="photographerFacebookUrl" value={state.photographer.facebookUrl} onChange={(event) => patchPhotographer({ facebookUrl: event.target.value })} />
              </Field>
            </div>
            <MediaControl
              label="شعار / صورة المصور"
              value={state.photographer.logoUrl}
              inputName="photographerLogoFile"
              accept="image/*,.heic,.heif"
              kind="image"
              hint="تظهر داخل كارت المصور إذا كان القالب يدعم الشعار."
              onChange={(url) => patchPhotographer({ logoUrl: url })}
              onDelete={() => patchPhotographer({ logoUrl: "" })}
            />
          </div>

          <div className="template-preview-info-actions">
            <button className="btn btn-gold btn-glow" type="submit">
              <CalendarDays size={18} />
              حفظ معلومات كل القوالب
            </button>
            <Link className="btn btn-soft" href={`/templates/${activeTemplateSlug}/preview`}>
              <Eye size={17} />
              فتح المعاينة الكاملة
            </Link>
          </div>
        </form>

        <aside className="template-admin-preview-sticky" aria-label="المعاينة المباشرة">
          <div className="template-admin-preview-toolbar">
            <label>
              <span>القالب الجاهز</span>
              <select value={activeTemplateSlug} onChange={(event) => setActiveTemplateSlug(event.target.value)}>
                {templates.map((template) => (
                  <option value={template.slug} key={template.slug}>
                    {template.arabicName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="template-admin-phone-frame">
            <iframe
              ref={iframeRef}
              src={`/templates/${activeTemplateSlug}/preview?silentPreview=1&builderPreview=1&embed=1`}
              title="المعاينة المباشرة لمحتوى القوالب"
              loading="eager"
              allow="geolocation; notifications"
              onLoad={postPreviewUpdate}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}
