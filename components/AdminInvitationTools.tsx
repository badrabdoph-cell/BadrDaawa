"use client";

import type { MutableRefObject } from "react";
import { FileVideo, ImagePlus, Link2, Loader2, MessageSquareText, Music2, UploadCloud, UserRound } from "lucide-react";
import { ContentPresetPicker } from "@/components/ContentPresetPicker";
import { uploadBrowserPreviewImage, type BrowserImageUploadOptions } from "@/lib/browser-image-upload";
import { acceptedImageFormats } from "@/lib/image-formats";
import { unifiedImageSlots } from "@/lib/invitation-template-bindings";
import type { ContentPreset, InvitationTexts, TemplateDefinition } from "@/lib/types";

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
  photographerEnabled: boolean;
  photographerName: string;
  photographerLogo: AdminToolUploadSlot;
  photographerFacebookUrl: string;
  photographerInstagramUrl: string;
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

export function validateAdminInvitationTools(values: AdminInvitationToolValues, options: { requireReuploadText?: string } = {}) {
  if (!values.groomName.trim() || !values.brideName.trim() || !values.weddingDate || !values.venue.trim()) {
    return "اكتب اسم العريس والعروسة والتاريخ والعنوان قبل الحفظ أو النشر.";
  }
  if (values.musicEnabled && !["default", "library"].includes(values.musicChoice) && values.musicUrl && !isPlayableAudioUrl(values.musicUrl)) {
    return "رابط الموسيقى لازم يكون ملف صوت مباشر.";
  }
  if (values.images.some((image) => image.loading) || values.photographerLogo.loading || values.musicBusy) {
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
  onPhotographerLogoFile: (file?: File | null) => void;
  onInvitationTextChange: (key: keyof InvitationTexts, value: string) => void;
  onMusicFile: (file?: File | null) => void;
  onMusicVideoFile?: (file?: File | null) => void;
}) {
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
          <span>اسم العروسة</span>
          <input ref={refs?.fieldRefs?.brideName} value={values.brideName} onChange={(event) => onPatch({ brideName: event.target.value })} />
        </label>
        {showPhone ? (
          <label className="field">
            <span>رقم التواصل</span>
            <input value={values.phone || ""} onChange={(event) => onPatch({ phone: event.target.value })} />
          </label>
        ) : null}
        <label className="field">
          <span>تاريخ المناسبة</span>
          <input ref={refs?.fieldRefs?.weddingDate} type="date" value={values.weddingDate} onChange={(event) => onPatch({ weddingDate: event.target.value })} />
        </label>
        <label className="field wide">
          <span>عنوان المناسبة</span>
          <input ref={refs?.fieldRefs?.venue} value={values.venue} onChange={(event) => onPatch({ venue: event.target.value })} />
        </label>
        <label className="field wide">
          <span><Link2 size={15} /> رابط اللوكيشن</span>
          <input value={values.mapUrl} onChange={(event) => onPatch({ mapUrl: event.target.value })} placeholder="انسخ رابط اللوكيشن من على خريطة جوجل" />
          <small>انسخ رابط اللوكيشن من على خريطة جوجل.</small>
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
              {values.photographerLogo.loading ? <Loader2 size={17} /> : <UploadCloud size={17} />}
              <span>{values.photographerLogo.name || "رفع شعار المصور أو صورته"}</span>
              <input ref={refs?.photographerLogoInputRef} type="file" accept={acceptedImageFormats} onChange={(event) => onPhotographerLogoFile(event.target.files?.[0])} />
            </label>
            {values.photographerLogo.url ? (
              <label className="field wide">
                <span>رابط شعار المصور</span>
                <input value={values.photographerLogo.url} onChange={(event) => onPatch({ photographerLogo: { ...values.photographerLogo, url: event.target.value } })} />
              </label>
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
        {values.musicEnabled ? (
          <div className={gridClassName}>
            <label className="field">
              <span>اختيار من الملفات المحفوظة</span>
              <select value={values.musicChoice === "library" || values.musicChoice === "upload" ? values.musicUrl : ""} onChange={(event) => onPatch({ musicUrl: event.target.value, musicChoice: event.target.value ? "library" : values.musicChoice, musicLibraryTrackId: musicFiles.find((file) => file.url === event.target.value)?.id || event.target.value })}>
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
              <input value={values.musicChoice === "url" ? values.musicUrl : ""} onChange={(event) => onPatch({ musicUrl: event.target.value, musicChoice: "url" })} placeholder="https://example.com/song.mp3" />
            </label>
            {values.musicUrl ? <audio controls preload="metadata" src={values.musicUrl} /> : null}
          </div>
        ) : null}
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
        </div>
      </div>
    </>
  );
}
