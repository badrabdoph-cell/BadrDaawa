"use client";

import type { MutableRefObject } from "react";
import { FileVideo, Heart, ImagePlus, Link2, Loader2, MessageSquareText, Music2, Plus, Trash2, UploadCloud, UserRound } from "lucide-react";
import { ContentPresetPicker } from "@/components/ContentPresetPicker";
import { uploadBrowserPreviewImage, type BrowserImageUploadOptions } from "@/lib/browser-image-upload";
import { acceptedImageFormats } from "@/lib/image-formats";
import { normalizeCoupleStory, normalizeGalleryStories } from "@/lib/invitation-texts";
import { unifiedImageSlots } from "@/lib/invitation-template-bindings";
import type { ContentPreset, CoupleStoryItem, GalleryStoryItem, InvitationTexts, TemplateDefinition } from "@/lib/types";
import { PhoneInput } from "./PhoneInput";
import { SimpleDateInput } from "@/components/SimpleDateInput";

export type AdminToolTemplate = Pick<TemplateDefinition, "slug" | "name" | "arabicName" | "opening" | "concept" | "layout" | "typography">;
export type AdminToolMusicFile = { url: string; modifiedAt?: number; name?: string; id?: string; sizeBytes?: number; extension?: string };
export type AdminToolImageSlot = { url: string; name: string; loading: boolean };
export type AdminToolUploadSlot = { url: string; name: string; loading: boolean };
export type AdminToolMusicChoice = "default" | "library" | "upload" | "video" | "url";

export type AdminInvitationToolValues = {
  templateSlug: string;
  groomName: string;
  brideName: string;
  phone?: string;
  weddingDate: string;
  venue: string;
  mapUrl: string;
  images: AdminToolImageSlot[];
  heroVideoUrl?: string;
  heroVideoName?: string;
  heroVideoBusy?: boolean;
  photographerEnabled: boolean;
  photographerName: string;
  photographerDescription: string;
  photographerLogo: AdminToolUploadSlot;
  photographerFacebookUrl: string;
  photographerInstagramUrl: string;
  photographerWhatsappUrl: string;
  musicEnabled: boolean;
  musicChoice: AdminToolMusicChoice;
  musicUrl: string;
  musicLibraryTrackId?: string;
  musicBusy: boolean;
  musicFileName?: string;
  invitationTexts: Required<InvitationTexts>;
};

export type AdminInvitationToolRefs = {
  imageInputRefs?: MutableRefObject<Array<HTMLInputElement | null>>;
  photographerLogoInputRef?: MutableRefObject<HTMLInputElement | null>;
  fieldRefs?: Partial<Record<"groomName" | "brideName" | "weddingDate" | "venue", MutableRefObject<HTMLInputElement | null>>>;
  textFieldRefs?: Partial<Record<"rsvpQuestion", MutableRefObject<HTMLInputElement | null>> & Record<"inviteMessage", MutableRefObject<HTMLTextAreaElement | null>>>;
};

export function getEffectiveAdminToolMusic(values: Pick<AdminInvitationToolValues, "musicEnabled" | "musicChoice" | "musicUrl" | "musicLibraryTrackId">) {
  if (!values.musicEnabled) return { musicEnabled: false, musicChoice: "default" as AdminToolMusicChoice, musicUrl: "", musicLibraryTrackId: "" };
  const musicUrl = values.musicUrl.trim();
  if (values.musicChoice === "default") return { musicEnabled: true, musicChoice: "default" as AdminToolMusicChoice, musicUrl: "", musicLibraryTrackId: "" };
  return musicUrl
    ? { musicEnabled: true, musicChoice: values.musicChoice, musicUrl, musicLibraryTrackId: values.musicLibraryTrackId || "" }
    : { musicEnabled: false, musicChoice: "default" as AdminToolMusicChoice, musicUrl: "", musicLibraryTrackId: "" };
}

export const emptyAdminToolImages: AdminToolImageSlot[] = unifiedImageSlots.map(() => ({ url: "", name: "", loading: false }));
export const emptyAdminToolUpload: AdminToolUploadSlot = { url: "", name: "", loading: false };

export function isPlayableAudioUrl(value: string) {
  if (!value.trim()) return true;
  return /^(https?:\/\/.+|\/uploads\/music\/.+)\.(mp3|wav|ogg|webm|m4a|aac|flac)(?:[?#].*)?$/i.test(value.trim());
}

export function readAdminFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

export async function uploadAdminPreviewImage(file: File, options: BrowserImageUploadOptions = {}) {
  return uploadBrowserPreviewImage(file, options);
}

export async function uploadAdminMusic(file: File) {
  const dataUrl = await readAdminFileAsDataUrl(file);
  const response = await fetch("/api/orders/preview-music", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ music: dataUrl }),
  });
  const data = (await response.json().catch(() => null)) as { musicUrl?: string; error?: string } | null;
  if (!response.ok || !data?.musicUrl) throw new Error(data?.error || "ملف الموسيقى غير قابل للتشغيل.");
  return data.musicUrl;
}

export async function uploadAdminVideoAudio(file: File) {
  const formData = new FormData();
  formData.append("videoFile", file);
  const response = await fetch("/api/orders/extract-video-audio", { method: "POST", body: formData });
  const data = (await response.json().catch(() => null)) as { musicUrl?: string; fileName?: string; error?: string } | null;
  if (!response.ok || !data?.musicUrl) throw new Error(data?.error || "تعذر استخراج الصوت من الفيديو.");
  return { musicUrl: data.musicUrl, fileName: data.fileName || `${file.name.replace(/\.[^.]+$/, "") || "video"}-audio.mp3` };
}

export async function uploadAdminHeroVideo(file: File) {
  const formData = new FormData();
  formData.append("media", file);
  const response = await fetch("/api/orders/preview-media", { method: "POST", body: formData });
  const data = (await response.json().catch(() => null)) as { mediaUrl?: string; error?: string } | null;
  if (!response.ok || !data?.mediaUrl) throw new Error(data?.error || "تعذر رفع فيديو خلفية الدعوة.");
  return data.mediaUrl;
}

export function validateAdminInvitationTools(values: AdminInvitationToolValues, options: { requireReuploadText?: string } = {}) {
  if (!values.groomName.trim() || !values.brideName.trim() || !values.weddingDate || !values.venue.trim()) {
    return "اكتب اسم العريس والعروسة والتاريخ والعنوان قبل الحفظ أو النشر.";
  }
  if (values.musicEnabled && !["default", "library"].includes(values.musicChoice) && values.musicUrl && !isPlayableAudioUrl(values.musicUrl)) {
    return "رابط الموسيقى لازم يكون ملف صوت مباشر.";
  }
  if (values.images.some((image) => image.loading) || values.photographerLogo.loading || values.musicBusy || values.heroVideoBusy) {
    return "استنى لحظة لحد ما رفع الملفات يخلص قبل الحفظ.";
  }
  if (values.images.some((image) => image.name && !image.url)) {
    return options.requireReuploadText || "في صورة مختارة لكنها لم تُرفع بنجاح. ارفعها مرة أخرى قبل الحفظ.";
  }
  if (values.photographerEnabled && values.photographerLogo.name && !values.photographerLogo.url) {
    return "شعار المصور لم يُرفع بنجاح. ارفعه مرة أخرى أو احذف الاختيار قبل الحفظ.";
  }
  return "";
}

function createStoryItem(): CoupleStoryItem {
  return { id: `story-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, title: "", description: "", date: "" };
}

function patchStoryItem(story: CoupleStoryItem[], index: number, patch: Partial<CoupleStoryItem>) {
  return story.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
}

export function AdminInvitationTools({
  values,
  templates,
  musicFiles,
  contentPresets = [],
  refs,
  showPhone = false,
  sectionClassName = "builder-section",
  gridClassName = "builder-mini-grid",
  imageGridClassName = "builder-photo-grid",
  imageTitle = "نظام الصور الموحد",
  musicLabel = "تشغيل الموسيقى داخل الدعوة",
  onPatch,
  onImageFile,
  onHeroVideoFile,
  onPhotographerLogoFile,
  onInvitationTextChange,
  onMusicFile,
  onMusicVideoFile,
}: {
  values: AdminInvitationToolValues;
  templates: AdminToolTemplate[];
  musicFiles: AdminToolMusicFile[];
  contentPresets?: ContentPreset[];
  refs?: AdminInvitationToolRefs;
  showPhone?: boolean;
  sectionClassName?: string;
  gridClassName?: string;
  imageGridClassName?: string;
  imageTitle?: string;
  musicLabel?: string;
  onPatch: (patch: Partial<AdminInvitationToolValues>) => void;
  onImageFile: (index: number, file?: File | null) => void;
  onHeroVideoFile?: (file?: File | null) => void;
  onPhotographerLogoFile: (file?: File | null) => void;
  onInvitationTextChange: (key: keyof InvitationTexts, value: string) => void;
  onMusicFile: (file?: File | null) => void;
  onMusicVideoFile?: (file?: File | null) => void;
}) {
  const story = normalizeCoupleStory(values.invitationTexts.story);
  const galleryStories = unifiedImageSlots.map((_, index) => normalizeGalleryStories(values.invitationTexts.galleryStories)[index] || { title: "", description: "" });
  const updateGalleryStory = (index: number, patch: Partial<GalleryStoryItem>) => {
    const nextStories = galleryStories.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    onPatch({ invitationTexts: { ...values.invitationTexts, galleryStories: normalizeGalleryStories(nextStories) } });
  };
  const updateStory = (nextStory: CoupleStoryItem[]) => {
    onPatch({ invitationTexts: { ...values.invitationTexts, story: normalizeCoupleStory(nextStory) } });
  };

  return (
    <>
      <div className={gridClassName}>
        <label className="field">
          <span>اختيار القالب</span>
          <select value={values.templateSlug} onChange={(event) => onPatch({ templateSlug: event.target.value })}>
            {templates.map((template) => (
              <option key={template.slug} value={template.slug}>
                {template.arabicName} - {template.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>اسم العريس</span>
          <input ref={refs?.fieldRefs?.groomName} value={values.groomName} onChange={(event) => onPatch({ groomName: event.target.value })} />
        </label>
        <label className="field">
          <span>اسم العروس</span>
          <input ref={refs?.fieldRefs?.brideName} value={values.brideName} onChange={(event) => onPatch({ brideName: event.target.value })} />
        </label>
        {showPhone ? (
          <label className="field">
            <span>رقم التواصل</span>
            <PhoneInput value={values.phone || ""} onChange={(value) => onPatch({ phone: value })} />
          </label>
        ) : null}
        <label className="field">
          <span>تاريخ المناسبة</span>
          <SimpleDateInput ref={refs?.fieldRefs?.weddingDate ?? undefined} value={values.weddingDate} onChange={(value) => onPatch({ weddingDate: value })} />
        </label>
        <label className="field wide">
          <span>مكان الحفل</span>
          <input ref={refs?.fieldRefs?.venue} value={values.venue} onChange={(event) => onPatch({ venue: event.target.value })} />
        </label>
        <label className="field wide">
          <span><Link2 size={15} /> رابط موقع القاعه</span>
          <input value={values.mapUrl} onChange={(event) => onPatch({ mapUrl: event.target.value })} placeholder="انسخ رابط Google Maps للقاعة أو الـ pin" />
          <small>يفضل رابط Google Maps المباشر حتى تظهر معاينة الموقع والمسافة التقريبية للضيف.</small>
        </label>
      </div>

      <div className={sectionClassName}>
        <div className="builder-section-head">
          <ImagePlus size={18} />
          <strong>{imageTitle}</strong>
        </div>
        <div className={imageGridClassName}>
          {unifiedImageSlots.map((slot, index) => (
            <label className="builder-photo-slot" key={slot.id}>
              <span>{slot.label}</span>
              {values.images[index]?.url ? <img src={values.images[index].url} alt={slot.label} /> : <i><ImagePlus size={18} /> {slot.role}</i>}
              <small>{values.images[index]?.loading ? "جاري الرفع" : values.images[index]?.name || "Smart crop + cover"}</small>
              <input ref={(node) => { if (refs?.imageInputRefs) refs.imageInputRefs.current[index] = node; }} type="file" accept={acceptedImageFormats} onChange={(event) => onImageFile(index, event.target.files?.[0])} />
            </label>
          ))}
        </div>
        <div className={gridClassName}>
          <label className="builder-logo-upload">
            {values.heroVideoBusy ? <Loader2 size={17} /> : <FileVideo size={17} />}
            <span>{values.heroVideoName || "فيديو خلفية قصير اختياري"}</span>
            <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v" onChange={(event) => onHeroVideoFile?.(event.target.files?.[0])} />
            <small>إذا تم رفع فيديو سيظهر بدلاً من صورة الغلاف الرئيسية، مع استخدام الصورة الأولى كنسخة احتياطية.</small>
          </label>
          <label className="field">
            <span>رابط فيديو الخلفية</span>
            <input dir="ltr" value={values.heroVideoUrl || ""} onChange={(event) => onPatch({ heroVideoUrl: event.target.value, heroVideoName: event.target.value ? values.heroVideoName || "رابط فيديو" : "" })} placeholder="/uploads/client-invitations/video.mp4" />
          </label>
          {values.heroVideoUrl ? (
            <button className="btn btn-soft" type="button" onClick={() => onPatch({ heroVideoUrl: "", heroVideoName: "" })}>
              حذف فيديو الخلفية
            </button>
          ) : null}
        </div>
        <div className="builder-gallery-story-fields">
          {unifiedImageSlots.map((slot, index) => {
            const galleryStory = galleryStories[index] || {};
            return (
              <div className="builder-gallery-story-item" key={`story-${slot.id}`}>
                <strong>{slot.label}</strong>
                <label className="field">
                  <span>عنوان الصورة</span>
                  <input value={galleryStory.title || ""} onChange={(event) => updateGalleryStory(index, { title: event.target.value })} placeholder="مثال: أول نظرة" />
                </label>
                <label className="field">
                  <span>وصف قصير</span>
                  <textarea rows={2} value={galleryStory.description || ""} onChange={(event) => updateGalleryStory(index, { description: event.target.value })} placeholder="جملة قصيرة تجعل الصورة جزءاً من الحكاية" />
                </label>
              </div>
            );
          })}
        </div>
        <small className="builder-inline-hint">اترك هذه الحقول فارغة ليظل المعرض بالطريقة الحالية.</small>
      </div>

      <div className={sectionClassName}>
        <button className={values.photographerEnabled ? "builder-toggle active" : "builder-toggle"} type="button" onClick={() => onPatch({ photographerEnabled: !values.photographerEnabled })}>
          <UserRound size={17} />
          إضافة بيانات المصور
        </button>
        {values.photographerEnabled ? (
          <div className={gridClassName}>
            <label className="field">
              <span>اسم المصور الفوتوغرافي</span>
              <input value={values.photographerName} onChange={(event) => onPatch({ photographerName: event.target.value })} />
            </label>
            <label className="field">
              <span>Facebook</span>
              <input value={values.photographerFacebookUrl} onChange={(event) => onPatch({ photographerFacebookUrl: event.target.value })} />
            </label>
            <label className="field">
              <span>Instagram</span>
              <input value={values.photographerInstagramUrl} onChange={(event) => onPatch({ photographerInstagramUrl: event.target.value })} />
            </label>
            <label className="builder-logo-upload">
              {values.photographerLogo.loading ? (
                <Loader2 size={17} />
              ) : values.photographerLogo.url ? (
                <img src={values.photographerLogo.url} alt="شعار المصور" />
              ) : (
                <UploadCloud size={17} />
              )}
              <span>{values.photographerLogo.name || "رفع شعار المصور أو صورته"}</span>
              <input ref={refs?.photographerLogoInputRef} type="file" accept={acceptedImageFormats} onChange={(event) => onPhotographerLogoFile(event.target.files?.[0])} />
            </label>
            {values.photographerLogo.url ? (
              <div className="wide builder-logo-actions">
                <label className="field">
                  <span>رابط شعار المصور</span>
                  <input value={values.photographerLogo.url} onChange={(event) => onPatch({ photographerLogo: { ...values.photographerLogo, url: event.target.value } })} />
                </label>
                <button className="btn btn-soft" type="button" onClick={() => onPatch({ photographerLogo: { url: "", name: "", loading: false } })}>
                  <Trash2 size={16} /> حذف الشعار
                </button>
              </div>
            ) : null}
            {values.photographerLogo.name && !values.photographerLogo.url && !values.photographerLogo.loading ? (
              <div className="wide builder-logo-status">
                <span>تم اختيار: {values.photographerLogo.name}</span>
                <button className="btn btn-soft" type="button" onClick={() => onPatch({ photographerLogo: { url: "", name: "", loading: false } })}>
                  إلغاء
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={sectionClassName}>
        <div className="builder-section-head">
          <Music2 size={18} />
          <strong>موسيقى الدعوة</strong>
        </div>
        <label className="builder-checkline">
          <input type="checkbox" checked={values.musicEnabled} onChange={(event) => onPatch({ musicEnabled: event.target.checked })} />
          {musicLabel}
        </label>
        <div className="order-music-choice-grid" role="radiogroup" aria-label="اختيار حالة الموسيقى">
          <button className={!values.musicEnabled ? "active" : ""} type="button" role="radio" aria-checked={!values.musicEnabled} onClick={() => onPatch({ musicEnabled: false, musicChoice: "default", musicUrl: "", musicLibraryTrackId: "", musicFileName: "" })}>
            <Music2 size={16} />
            بدون موسيقى
          </button>
          <button className={values.musicEnabled && values.musicChoice === "default" ? "active" : ""} type="button" role="radio" aria-checked={values.musicEnabled && values.musicChoice === "default"} onClick={() => onPatch({ musicEnabled: true, musicChoice: "default", musicUrl: "", musicLibraryTrackId: "", musicFileName: "" })}>
            <Music2 size={16} />
            الموسيقى الافتراضية
          </button>
        </div>
        {values.musicEnabled ? (
          <div className={gridClassName}>
            <label className="field">
              <span>اختيار من الملفات المحفوظة</span>
              <select value={values.musicChoice === "library" || values.musicChoice === "upload" ? values.musicUrl : ""} onChange={(event) => onPatch({ musicEnabled: Boolean(event.target.value) || values.musicEnabled, musicUrl: event.target.value, musicChoice: event.target.value ? "library" : values.musicChoice, musicLibraryTrackId: musicFiles.find((file) => file.url === event.target.value)?.id || event.target.value })}>
                <option value="">اختار ملف محفوظ</option>
                {musicFiles.map((file) => (
                  <option key={file.url} value={file.url}>{file.name || file.url.split("/").pop()}</option>
                ))}
              </select>
            </label>
            <label className="builder-logo-upload">
              {values.musicBusy ? <Loader2 size={17} /> : <UploadCloud size={17} />}
              <span>{values.musicChoice === "upload" && values.musicFileName ? values.musicFileName : "رفع ملف MP3"}</span>
              <input type="file" accept="audio/mpeg,.mp3" onChange={(event) => onMusicFile(event.target.files?.[0])} />
            </label>
            <label className="builder-logo-upload">
              {values.musicBusy ? <Loader2 size={17} /> : <FileVideo size={17} />}
              <span>{values.musicChoice === "video" && values.musicFileName ? values.musicFileName : "استخراج الصوت من فيديو"}</span>
              <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={(event) => onMusicVideoFile?.(event.target.files?.[0])} />
              <small>يمكنك رفع فيديو وسيتم استخراج الموسيقى منه تلقائياً واستخدامها داخل الدعوة.</small>
            </label>
            <label className="field">
              <span>رابط ملف صوتي خارجي</span>
              <input value={values.musicChoice === "url" ? values.musicUrl : ""} onChange={(event) => onPatch({ musicEnabled: Boolean(event.target.value.trim()) || values.musicEnabled, musicUrl: event.target.value, musicChoice: "url" })} placeholder="https://example.com/song.mp3" />
            </label>
            {values.musicUrl ? <audio controls preload="metadata" src={values.musicUrl} /> : null}
          </div>
        ) : null}
      </div>

      <div className={sectionClassName}>
        <div className="story-editor">
          <div className="story-editor-head">
            <div>
              <span><Heart size={16} /> قسم اختياري</span>
              <strong>قصة العروسين</strong>
            </div>
            <button className="btn btn-soft" type="button" onClick={() => updateStory([...story, createStoryItem()])}>
              <Plus size={16} />
              إضافة مرحلة
            </button>
          </div>
          {story.length ? (
            <div className="story-editor-list">
              {story.map((item, index) => (
                <article className="story-editor-item" key={item.id || index}>
                  <div className="story-editor-item-head">
                    <strong>مرحلة {index + 1}</strong>
                    <button className="admin-icon-button" type="button" onClick={() => updateStory(story.filter((_, itemIndex) => itemIndex !== index))} title="حذف المرحلة">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <label className="field">
                    <span>التاريخ</span>
                    <input value={item.date || ""} onChange={(event) => updateStory(patchStoryItem(story, index, { date: event.target.value }))} placeholder="مثلاً: 2024 أو أول لقاء" />
                  </label>
                  <label className="field">
                    <span>العنوان</span>
                    <input value={item.title} onChange={(event) => updateStory(patchStoryItem(story, index, { title: event.target.value }))} placeholder="أول لقاء" />
                  </label>
                  <label className="field full">
                    <span>الوصف</span>
                    <textarea rows={3} value={item.description} onChange={(event) => updateStory(patchStoryItem(story, index, { description: event.target.value }))} placeholder="تفاصيل قصيرة وراقية لهذه المرحلة" />
                  </label>
                </article>
              ))}
            </div>
          ) : (
            <p className="story-editor-empty">لن يظهر قسم قصة العروسين داخل الدعوة إلا بعد إضافة مرحلة واحدة على الأقل.</p>
          )}
        </div>
      </div>

      <div className={sectionClassName}>
        <div className="builder-section-head">
          <MessageSquareText size={18} />
          <strong>نصوص داخل الدعوة</strong>
        </div>
        <ContentPresetPicker
          presets={contentPresets}
          onApply={(textPatch) => {
            for (const [key, value] of Object.entries(textPatch)) {
              onInvitationTextChange(key as keyof InvitationTexts, String(value || ""));
            }
          }}
        />
        <div className="builder-text-list">
          <label className="field wide">
            <span>نص الافتتاح السينمائي</span>
            <textarea value={values.invitationTexts.openingText} onChange={(event) => onInvitationTextChange("openingText", event.target.value)} rows={2} />
          </label>
          <label className="field">
            <span>سؤال تأكيد الحضور</span>
            <input ref={refs?.textFieldRefs?.rsvpQuestion} value={values.invitationTexts.rsvpQuestion} onChange={(event) => onInvitationTextChange("rsvpQuestion", event.target.value)} />
          </label>
          <label className="field wide">
            <span>رسالة الدعوة</span>
            <textarea ref={refs?.textFieldRefs?.inviteMessage} value={values.invitationTexts.inviteMessage} onChange={(event) => onInvitationTextChange("inviteMessage", event.target.value)} rows={3} />
          </label>
          <label className="field">
            <span>رسالة إضافية</span>
            <textarea value={values.invitationTexts.inviteMessageSecondary} onChange={(event) => onInvitationTextChange("inviteMessageSecondary", event.target.value)} rows={2} />
          </label>
          <label className="field">
            <span>رسالة الاعتذار عن الحضور</span>
            <input value={values.invitationTexts.rsvpDeclinedMessage} onChange={(event) => onInvitationTextChange("rsvpDeclinedMessage", event.target.value)} />
          </label>
          <label className="field">
            <span>شكر تأكيد الحضور</span>
            <textarea value={values.invitationTexts.rsvpConfirmedSuccessMessage} onChange={(event) => onInvitationTextChange("rsvpConfirmedSuccessMessage", event.target.value)} rows={2} />
          </label>
          <label className="field">
            <span>شكر الاعتذار</span>
            <textarea value={values.invitationTexts.rsvpDeclinedSuccessMessage} onChange={(event) => onInvitationTextChange("rsvpDeclinedSuccessMessage", event.target.value)} rows={2} />
          </label>
        </div>
      </div>
    </>
  );
}
