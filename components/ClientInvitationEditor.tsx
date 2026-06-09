"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Disc3, Eye, FileVideo, Heart, ImagePlus, Link2, Loader2, MessageSquareText, Music2, Plus, Save, Trash2, UploadCloud, UserRound } from "lucide-react";
import { uploadAdminHeroVideo } from "@/components/AdminInvitationTools";
import { ContentPresetPicker } from "@/components/ContentPresetPicker";
import type { LiveInvitationPreviewPayload } from "@/components/LiveInvitationPreview";
import { uploadBrowserPreviewImage } from "@/lib/browser-image-upload";
import { acceptedImageFormats } from "@/lib/image-formats";
import { normalizeGalleryStories, normalizeInvitationTexts } from "@/lib/invitation-texts";
import { unifiedImageSlots } from "@/lib/invitation-template-bindings";
import type { ContentPreset, CoupleStoryItem, GalleryStoryItem, Invitation, InvitationTexts, TemplateDefinition } from "@/lib/types";

type MusicFile = { id?: string; name?: string; url: string; modifiedAt: number };
type ImageSlotState = { previewUrl: string; dataUrl: string; name: string; loading: boolean };

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function toDateInput(value: string) {
  return value ? value.slice(0, 10) : "";
}

function isPlayableAudioUrl(value: string) {
  if (!value.trim()) return true;
  return /^(https?:\/\/.+|\/uploads\/music\/.+)\.(mp3|wav|ogg|webm|m4a|aac|flac)(?:[?#].*)?$/i.test(value.trim());
}

async function extractClientVideoAudio(file: File) {
  const formData = new FormData();
  formData.append("videoFile", file);
  const response = await fetch("/api/orders/extract-video-audio", { method: "POST", body: formData });
  const data = (await response.json().catch(() => null)) as { musicUrl?: string; fileName?: string; error?: string } | null;
  if (!response.ok || !data?.musicUrl) throw new Error(data?.error || "تعذر استخراج الصوت من الفيديو.");
  return { musicUrl: data.musicUrl, fileName: data.fileName || `${file.name.replace(/\.[^.]+$/, "") || "video"}-audio.mp3` };
}

function createStoryItem(): CoupleStoryItem {
  return { id: `story-${Date.now().toString(36)}`, title: "", description: "", imageUrl: "", date: "" };
}

function normalizeGalleryStorySlots(value: unknown) {
  return unifiedImageSlots.map((_, index) => normalizeGalleryStories(value)[index] || { title: "", description: "" });
}

export function ClientInvitationEditor({
  invitation,
  template,
  musicFiles,
  contentPresets,
  publicUrl,
}: {
  invitation: Invitation;
  template: Pick<TemplateDefinition, "slug" | "name" | "arabicName" | "opening" | "concept" | "layout" | "typography">;
  musicFiles: MusicFile[];
  contentPresets: ContentPreset[];
  publicUrl: string;
}) {
  const [groomName, setGroomName] = useState(invitation.groomName);
  const [brideName, setBrideName] = useState(invitation.brideName);
  const [weddingDate, setWeddingDate] = useState(toDateInput(invitation.weddingDate));
  const [weddingTime, setWeddingTime] = useState(invitation.weddingTime || "07:00 مساءً");
  const [venue, setVenue] = useState(invitation.venue);
  const [city, setCity] = useState(invitation.city || "");
  const [mapUrl, setMapUrl] = useState(invitation.mapUrl || "");
  const [images, setImages] = useState<ImageSlotState[]>(
    unifiedImageSlots.map((_, index) => ({ previewUrl: invitation.gallery[index] || "", dataUrl: "", name: "", loading: false })),
  );
  const [heroVideoUrl, setHeroVideoUrl] = useState(invitation.heroVideoUrl || "");
  const [heroVideoName, setHeroVideoName] = useState(invitation.heroVideoUrl?.split("/").pop() || "");
  const [photographerEnabled, setPhotographerEnabled] = useState(Boolean(invitation.photographer?.enabled));
  const [photographerName, setPhotographerName] = useState(invitation.photographer?.name || "");
  const [photographerLogo, setPhotographerLogo] = useState<ImageSlotState>({ previewUrl: invitation.photographer?.logoUrl || "", dataUrl: "", name: "", loading: false });
  const [photographerFacebookUrl, setPhotographerFacebookUrl] = useState(invitation.photographer?.facebookUrl || "");
  const [photographerInstagramUrl, setPhotographerInstagramUrl] = useState(invitation.photographer?.instagramUrl || "");
  const [musicEnabled, setMusicEnabled] = useState(invitation.musicEnabled !== false && Boolean(invitation.musicUrl));
  const [musicUrl, setMusicUrl] = useState(invitation.musicUrl || "");
  const [musicChoice, setMusicChoice] = useState<"library" | "upload" | "video" | "url">(() => (musicFiles.some((file) => file.url === invitation.musicUrl) ? "library" : "upload"));
  const [musicDataUrl, setMusicDataUrl] = useState("");
  const [musicFileName, setMusicFileName] = useState("");
  const [invitationTexts, setInvitationTexts] = useState<Required<InvitationTexts>>(() => normalizeInvitationTexts(invitation.texts));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [dirty, setDirty] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const imageInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const photographerLogoInputRef = useRef<HTMLInputElement | null>(null);
  const fieldRefs = {
    groomName: useRef<HTMLInputElement | null>(null),
    brideName: useRef<HTMLInputElement | null>(null),
    weddingDate: useRef<HTMLInputElement | null>(null),
    venue: useRef<HTMLInputElement | null>(null),
  };
  const textFieldRefs = {
    inviteMessage: useRef<HTMLTextAreaElement | null>(null),
    rsvpQuestion: useRef<HTMLInputElement | null>(null),
  };

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({ builderPreview: "1", silentPreview: "1" });
    return `/templates/${template.slug}/preview?${params.toString()}`;
  }, [template.slug]);

  const previewPayload = useMemo<LiveInvitationPreviewPayload>(
    () => ({
      groomName,
      brideName,
      weddingDate,
      weddingTime,
      venue,
      city,
      mapUrl,
      gallery: images.map((image) => image.previewUrl).filter(Boolean),
      heroVideoUrl,
      musicEnabled,
      musicUrl,
      disableMusic: !musicEnabled,
      texts: invitationTexts,
      photographer: {
        enabled: photographerEnabled,
        name: photographerName,
        logoUrl: photographerLogo.previewUrl,
        facebookUrl: photographerFacebookUrl,
        instagramUrl: photographerInstagramUrl,
      },
    }),
    [brideName, city, groomName, heroVideoUrl, images, invitationTexts, mapUrl, musicEnabled, musicUrl, photographerEnabled, photographerFacebookUrl, photographerInstagramUrl, photographerLogo.previewUrl, photographerName, venue, weddingDate, weddingTime],
  );

  const postPreviewUpdate = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ source: "badr-admin-preview", type: "preview:update", payload: previewPayload }, window.location.origin);
  }, [previewPayload]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

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

  function markDirty() {
    setDirty(true);
    if (message) setMessage("");
  }

  function updateInvitationText(key: keyof InvitationTexts, value: string) {
    setInvitationTexts((current) => ({ ...current, [key]: value }));
    markDirty();
  }

  function addStoryItem() {
    setInvitationTexts((current) => ({ ...current, story: [...current.story, createStoryItem()] }));
    markDirty();
  }

  function updateStoryItem(index: number, patch: Partial<CoupleStoryItem>) {
    setInvitationTexts((current) => ({
      ...current,
      story: current.story.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
    markDirty();
  }

  function removeStoryItem(index: number) {
    setInvitationTexts((current) => ({ ...current, story: current.story.filter((_, itemIndex) => itemIndex !== index) }));
    markDirty();
  }

  function updateGalleryStoryItem(index: number, patch: Partial<GalleryStoryItem>) {
    setInvitationTexts((current) => {
      const galleryStories = normalizeGalleryStorySlots(current.galleryStories).map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
      return { ...current, galleryStories: normalizeGalleryStories(galleryStories) };
    });
    markDirty();
  }

  async function handleImageFile(index: number, file?: File | null) {
    if (!file) return;
    markDirty();
    setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, dataUrl: "", name: file.name, loading: true } : item)));
    try {
      const url = await uploadBrowserPreviewImage(file, { slot: `client-${index + 1}` });
      setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, previewUrl: url, loading: false } : item)));
    } catch (error) {
      setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, loading: false } : item)));
      setStatus("error");
      setMessage(error instanceof Error && error.message !== "preview-image-upload-failed" ? error.message : "تعذر رفع الصورة. جرّب صورة أخرى أو قلل حجمها ثم أعد المحاولة.");
    }
  }

  async function handleLogoFile(file?: File | null) {
    if (!file) return;
    markDirty();
    setPhotographerLogo({ dataUrl: "", previewUrl: "", name: file.name, loading: true });
    try {
      const url = await uploadBrowserPreviewImage(file, { slot: "client-photographer-logo" });
      setPhotographerLogo({ dataUrl: "", previewUrl: url, name: file.name, loading: false });
    } catch (error) {
      setPhotographerLogo({ dataUrl: "", previewUrl: "", name: file.name, loading: false });
      setStatus("error");
      setMessage(error instanceof Error && error.message !== "preview-image-upload-failed" ? error.message : "تعذر رفع شعار المصور. جرّب صورة أخرى أو قلل حجمها ثم أعد المحاولة.");
    }
  }

  async function handleStoryImageFile(index: number, file?: File | null) {
    if (!file) return;
    markDirty();
    setBusy(true);
    try {
      const url = await uploadBrowserPreviewImage(file, { slot: `client-story-${index + 1}` });
      updateStoryItem(index, { imageUrl: url });
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error && error.message !== "preview-image-upload-failed" ? error.message : "تعذر رفع صورة القصة. جرّب صورة أخرى أو قلل حجمها ثم أعد المحاولة.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMusicFile(file?: File | null) {
    if (!file) return;
    markDirty();
    const dataUrl = await readFileAsDataUrl(file);
    setBusy(true);
    const response = await fetch("/api/orders/preview-music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ music: dataUrl }),
    });
    const data = (await response.json().catch(() => null)) as { musicUrl?: string; error?: string } | null;
    setBusy(false);
    if (!response.ok || !data?.musicUrl) {
      setStatus("error");
      setMessage(data?.error || "ملف الموسيقى غير قابل للتشغيل.");
      return;
    }
    setMusicEnabled(true);
    setMusicChoice("upload");
    setMusicDataUrl(dataUrl);
    setMusicUrl(data.musicUrl);
    setMusicFileName(file.name);
    setStatus("success");
    setMessage("تم رفع ملف MP3 ويمكنك تشغيل المعاينة الآن.");
  }

  async function handleMusicVideoFile(file?: File | null) {
    if (!file) return;
    markDirty();
    setBusy(true);
    try {
      const extracted = await extractClientVideoAudio(file);
      setMusicEnabled(true);
      setMusicChoice("video");
      setMusicDataUrl("");
      setMusicUrl(extracted.musicUrl);
      setMusicFileName(extracted.fileName);
      setStatus("success");
      setMessage(`تم استخراج الصوت من الفيديو وحفظه كملف MP3: ${extracted.fileName}`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "تعذر استخراج الصوت من الفيديو.");
    } finally {
      setBusy(false);
    }
  }

  async function handleHeroVideoFile(file?: File | null) {
    if (!file) return;
    markDirty();
    setBusy(true);
    setHeroVideoName(file.name);
    try {
      const uploadedUrl = await uploadAdminHeroVideo(file);
      setHeroVideoUrl(uploadedUrl);
      setStatus("success");
      setMessage("تم رفع فيديو خلفية الدعوة وربطه بالمعاينة.");
    } catch (error) {
      setHeroVideoUrl("");
      setHeroVideoName("");
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "تعذر رفع فيديو خلفية الدعوة.");
    } finally {
      setBusy(false);
    }
  }

  function wirePreviewClicks() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    postPreviewUpdate();
    if (doc.body.dataset.builderPreviewWired === "1") return;
    doc.body.dataset.builderPreviewWired = "1";
    doc.addEventListener(
      "click",
      (event) => {
        const FrameElement = doc.defaultView?.Element;
        const target = FrameElement && event.target instanceof FrameElement ? event.target : null;
        if (!target) return;

        const image = target.closest("img") as HTMLImageElement | null;
        if (image) {
          if (image.closest(".qr-card")) return;
          event.preventDefault();
          event.stopPropagation();
          if (image.closest('[class*="photographer"]') || image.classList.contains("photographer-logo-image")) {
            photographerLogoInputRef.current?.click();
            return;
          }

          const editableImages = Array.from(doc.querySelectorAll<HTMLImageElement>("img")).filter(
            (item) => !item.closest(".qr-card") && !item.closest('[class*="photographer"]') && !item.classList.contains("photographer-logo-image"),
          );
          const imageIndex = editableImages.indexOf(image);
          imageInputRefs.current[Math.max(0, Math.min(imageIndex, 2))]?.click();
          return;
        }

        const element = target.closest("h1,h2,p,strong,span");
        if (!element) return;
        const text = element.textContent || "";
        if (!text.trim()) return;
        event.preventDefault();
        event.stopPropagation();
        if (text.includes(groomName)) fieldRefs.groomName.current?.focus();
        else if (text.includes(brideName)) fieldRefs.brideName.current?.focus();
        else if (text.includes(venue)) fieldRefs.venue.current?.focus();
        else if (text.includes(invitationTexts.rsvpQuestion)) textFieldRefs.rsvpQuestion.current?.focus();
        else if (text.includes(invitationTexts.inviteMessage.slice(0, 24))) textFieldRefs.inviteMessage.current?.focus();
        else fieldRefs.weddingDate.current?.focus();
      },
      true,
    );
  }

  async function save() {
    if (!groomName.trim() || !brideName.trim() || !weddingDate || !venue.trim()) {
      setStatus("error");
      setMessage("اكتب الاسم والتاريخ والعنوان قبل الحفظ.");
      return;
    }
    if (musicEnabled && musicUrl && !isPlayableAudioUrl(musicUrl)) {
      setStatus("error");
      setMessage("رابط الموسيقى لازم يكون ملف صوت مباشر.");
      return;
    }
    if (images.some((image) => image.loading) || photographerLogo.loading || busy) {
      setStatus("error");
      setMessage("استنى لحظة لحد ما رفع الملفات يخلص قبل الحفظ.");
      return;
    }
    if (images.some((image) => image.name && !image.previewUrl)) {
      setStatus("error");
      setMessage("في صورة مختارة لكنها لم تُرفع بنجاح. ارفعها مرة أخرى قبل حفظ الدعوة.");
      return;
    }
    if (photographerEnabled && photographerLogo.name && !photographerLogo.previewUrl) {
      setStatus("error");
      setMessage("شعار المصور لم يُرفع بنجاح. ارفعه مرة أخرى أو احذف الاختيار قبل الحفظ.");
      return;
    }
    setBusy(true);
    const response = await fetch(`/api/client/invitations/${invitation.code}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groomName,
        brideName,
        weddingDate,
        weddingTime,
        venue,
        city,
        mapUrl,
        gallery: images.map((image) => image.previewUrl).filter(Boolean),
        heroVideoUrl,
        musicEnabled,
        musicUrl,
        musicDataUrl,
        texts: invitationTexts,
        photographer: {
          enabled: photographerEnabled,
          name: photographerName,
          logoUrl: photographerLogo.previewUrl,
          logoDataUrl: "",
          facebookUrl: photographerFacebookUrl,
          instagramUrl: photographerInstagramUrl,
        },
      }),
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response.ok) {
      setStatus("error");
      setMessage(data?.error || "تعذر حفظ التعديلات.");
      return;
    }
    setDirty(false);
    setStatus("success");
    setMessage("تم حفظ التعديلات وتحديث الدعوة.");
  }

  async function copyUrl() {
    await navigator.clipboard.writeText(publicUrl);
    setStatus("success");
    setMessage("تم نسخ رابط الدعوة.");
  }

  return (
    <section className="customer-live-editor builder-layout">
      <div className="builder-editor-panel">
        <div className={dirty ? "builder-save-state dirty" : "builder-save-state"}>{dirty ? "توجد تعديلات غير محفوظة" : "كل التعديلات محفوظة"}</div>
        <div className="builder-mini-grid">
          <label className="field">
            <span>اسم العريس</span>
            <input ref={fieldRefs.groomName} value={groomName} onChange={(event) => { setGroomName(event.target.value); markDirty(); }} />
          </label>
          <label className="field">
            <span>اسم العروسة</span>
            <input ref={fieldRefs.brideName} value={brideName} onChange={(event) => { setBrideName(event.target.value); markDirty(); }} />
          </label>
          <label className="field">
            <span>التاريخ</span>
            <input ref={fieldRefs.weddingDate} type="date" value={weddingDate} onChange={(event) => { setWeddingDate(event.target.value); markDirty(); }} />
          </label>
          <label className="field">
            <span>وقت الفرح</span>
            <input value={weddingTime} onChange={(event) => { setWeddingTime(event.target.value); markDirty(); }} />
          </label>
          <label className="field">
            <span>العنوان</span>
            <input ref={fieldRefs.venue} value={venue} onChange={(event) => { setVenue(event.target.value); markDirty(); }} />
          </label>
          <label className="field">
            <span>المدينة</span>
            <input value={city} onChange={(event) => { setCity(event.target.value); markDirty(); }} />
          </label>
          <label className="field full">
            <span>رابط الخريطة</span>
            <input value={mapUrl} onChange={(event) => { setMapUrl(event.target.value); markDirty(); }} placeholder="https://maps.google.com/..." />
            <small>يفضل رابط Google Maps المباشر للقاعة حتى تظهر معاينة الموقع والمسافة التقريبية للضيف.</small>
          </label>
        </div>

        <div className="builder-section">
          <div className="builder-section-head">
            <ImagePlus size={18} />
            <strong>الصور</strong>
          </div>
          <div className="builder-photo-grid">
            {unifiedImageSlots.map((slot, index) => (
              <label className="builder-photo-slot" key={slot.id}>
                <span>{slot.label}</span>
                {images[index]?.previewUrl ? <img src={images[index].previewUrl} alt={slot.label} /> : <i><ImagePlus size={18} /> {slot.role}</i>}
                <small>{images[index]?.loading ? "جاري الرفع" : images[index]?.name || "اضغط للتغيير"}</small>
                <input ref={(node) => { imageInputRefs.current[index] = node; }} type="file" accept={acceptedImageFormats} onChange={(event) => handleImageFile(index, event.target.files?.[0])} />
              </label>
            ))}
          </div>
          <div className="builder-mini-grid">
            <label className="builder-logo-upload full">
              {busy ? <Loader2 size={17} /> : <FileVideo size={17} />}
              <span>{heroVideoName || "رفع فيديو خلفية قصير اختياري"}</span>
              <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v" onChange={(event) => handleHeroVideoFile(event.target.files?.[0])} />
              <small>إذا تم رفع فيديو سيظهر بدلاً من صورة الغلاف الرئيسية، وتظل الصورة الأولى نسخة احتياطية.</small>
            </label>
            <label className="field full">
              <span>رابط فيديو الخلفية</span>
              <input dir="ltr" value={heroVideoUrl} onChange={(event) => { setHeroVideoUrl(event.target.value); setHeroVideoName(event.target.value ? heroVideoName || "رابط فيديو" : ""); markDirty(); }} placeholder="/uploads/client-invitations/hero.mp4" />
            </label>
            {heroVideoUrl ? (
              <button className="btn btn-soft" type="button" onClick={() => { setHeroVideoUrl(""); setHeroVideoName(""); markDirty(); }}>
                حذف فيديو الخلفية
              </button>
            ) : null}
          </div>
          <div className="builder-gallery-story-fields">
            {unifiedImageSlots.map((slot, index) => {
              const galleryStory = normalizeGalleryStorySlots(invitationTexts.galleryStories)[index] || {};
              return (
                <div className="builder-gallery-story-item" key={`client-story-${slot.id}`}>
                  <strong>{slot.label}</strong>
                  <label className="field">
                    <span>عنوان الصورة</span>
                    <input value={galleryStory.title || ""} onChange={(event) => updateGalleryStoryItem(index, { title: event.target.value })} placeholder="مثال: أول نظرة" />
                  </label>
                  <label className="field">
                    <span>وصف قصير</span>
                    <textarea rows={2} value={galleryStory.description || ""} onChange={(event) => updateGalleryStoryItem(index, { description: event.target.value })} placeholder="جملة قصيرة تجعل الصورة جزءاً من الحكاية" />
                  </label>
                </div>
              );
            })}
          </div>
          <small className="builder-inline-hint">اترك عناوين وأوصاف الصور فارغة ليظل المعرض بالطريقة الحالية.</small>
        </div>

        <div className="builder-section">
          <button className={photographerEnabled ? "builder-toggle active" : "builder-toggle"} type="button" onClick={() => { setPhotographerEnabled(!photographerEnabled); markDirty(); }}>
            <UserRound size={17} />
            {photographerEnabled ? "إخفاء بيانات المصور" : "إضافة بيانات المصور"}
          </button>
          {photographerEnabled ? (
            <div className="builder-mini-grid">
              <label className="field">
                <span>اسم المصور</span>
                <input value={photographerName} onChange={(event) => { setPhotographerName(event.target.value); markDirty(); }} />
              </label>
              <label className="field">
                <span>Facebook</span>
                <input value={photographerFacebookUrl} onChange={(event) => { setPhotographerFacebookUrl(event.target.value); markDirty(); }} />
              </label>
              <label className="field">
                <span>Instagram</span>
                <input value={photographerInstagramUrl} onChange={(event) => { setPhotographerInstagramUrl(event.target.value); markDirty(); }} />
              </label>
              <label className="builder-logo-upload">
                <UploadCloud size={17} />
                <span>{photographerLogo.name || "رفع شعار المصور أو صورته"}</span>
                <input ref={photographerLogoInputRef} type="file" accept={acceptedImageFormats} onChange={(event) => handleLogoFile(event.target.files?.[0])} />
              </label>
            </div>
          ) : null}
        </div>

        <div className="builder-section">
          <div className="builder-section-head">
            <Music2 size={18} />
            <strong>الموسيقى</strong>
          </div>
          <label className="builder-checkline">
            <input type="checkbox" checked={musicEnabled} onChange={(event) => { setMusicEnabled(event.target.checked); markDirty(); }} />
            تشغيل الموسيقى داخل الدعوة
          </label>
          {musicEnabled ? (
            <div className="builder-mini-grid">
              <div className="order-music-choice-grid full" role="radiogroup" aria-label="اختيار مصدر الموسيقى">
                <button className={musicChoice === "library" ? "active" : ""} type="button" onClick={() => { setMusicChoice("library"); setMusicDataUrl(""); markDirty(); }}><Disc3 size={16} /> مكتبة الموسيقى</button>
                <button className={musicChoice === "upload" ? "active" : ""} type="button" onClick={() => { setMusicChoice("upload"); setMusicDataUrl(""); markDirty(); }}><UploadCloud size={16} /> رفع MP3</button>
                <button className={musicChoice === "video" ? "active" : ""} type="button" onClick={() => { setMusicChoice("video"); setMusicDataUrl(""); markDirty(); }}><FileVideo size={16} /> استخراج الصوت من فيديو</button>
                <button className={musicChoice === "url" ? "active" : ""} type="button" onClick={() => { setMusicChoice("url"); setMusicDataUrl(""); markDirty(); }}><Link2 size={16} /> رابط مباشر</button>
              </div>
              {musicChoice === "library" ? (
              <label className="field">
                <span>اختيار من الملفات المحفوظة</span>
                <select value={musicUrl} onChange={(event) => { setMusicUrl(event.target.value); setMusicDataUrl(""); setMusicChoice("library"); markDirty(); }}>
                  <option value="">اختار ملف محفوظ</option>
                  {musicFiles.map((file) => <option key={file.url} value={file.url}>{file.name || file.url.split("/").pop()}</option>)}
                </select>
              </label>
              ) : null}
              {musicChoice === "upload" ? (
              <label className="builder-logo-upload">
                {busy ? <Loader2 size={17} /> : <UploadCloud size={17} />}
                <span>{musicFileName || "رفع ملف MP3"}</span>
                <input type="file" accept="audio/mpeg,.mp3" onChange={(event) => handleMusicFile(event.target.files?.[0])} />
              </label>
              ) : null}
              {musicChoice === "video" ? (
              <label className="builder-logo-upload">
                {busy ? <Loader2 size={17} /> : <FileVideo size={17} />}
                <span>{musicFileName || "رفع فيديو لاستخراج الصوت"}</span>
                <input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" onChange={(event) => handleMusicVideoFile(event.target.files?.[0])} />
                <small>يمكنك رفع فيديو وسيتم استخراج الموسيقى منه تلقائياً واستخدامها داخل الدعوة.</small>
              </label>
              ) : null}
              {musicChoice === "url" ? (
              <label className="field full">
                <span>رابط ملف صوتي خارجي</span>
                <input value={musicUrl} onChange={(event) => { setMusicUrl(event.target.value); setMusicDataUrl(""); setMusicChoice("url"); markDirty(); }} />
              </label>
              ) : null}
              {musicUrl ? <audio controls preload="metadata" src={musicUrl} /> : null}
            </div>
          ) : null}
        </div>

        <div className="builder-section">
          <div className="builder-section-head">
            <MessageSquareText size={18} />
            <strong>نصوص داخل الدعوة</strong>
          </div>
          <ContentPresetPicker
            presets={contentPresets}
            onApply={(textPatch) => {
              setInvitationTexts((current) => ({ ...current, ...textPatch }));
              markDirty();
            }}
          />
          <div className="builder-text-list">
            <label className="field">
              <span>نص الافتتاح السينمائي</span>
              <textarea value={invitationTexts.openingText} onChange={(event) => updateInvitationText("openingText", event.target.value)} rows={2} />
            </label>
            <label className="field">
              <span>سؤال تأكيد الحضور</span>
              <input ref={textFieldRefs.rsvpQuestion} value={invitationTexts.rsvpQuestion} onChange={(event) => updateInvitationText("rsvpQuestion", event.target.value)} />
            </label>
            <label className="field">
              <span>رسالة الدعوة</span>
              <textarea ref={textFieldRefs.inviteMessage} value={invitationTexts.inviteMessage} onChange={(event) => updateInvitationText("inviteMessage", event.target.value)} rows={3} />
            </label>
            <label className="field">
              <span>رسالة إضافية</span>
              <textarea value={invitationTexts.inviteMessageSecondary} onChange={(event) => updateInvitationText("inviteMessageSecondary", event.target.value)} rows={2} />
            </label>
            <label className="field">
              <span>رسالة الاعتذار عن الحضور</span>
              <input value={invitationTexts.rsvpDeclinedMessage} onChange={(event) => updateInvitationText("rsvpDeclinedMessage", event.target.value)} />
            </label>
            <label className="field">
              <span>شكر تأكيد الحضور</span>
              <textarea value={invitationTexts.rsvpConfirmedSuccessMessage} onChange={(event) => updateInvitationText("rsvpConfirmedSuccessMessage", event.target.value)} rows={2} />
            </label>
            <label className="field">
              <span>شكر الاعتذار</span>
              <textarea value={invitationTexts.rsvpDeclinedSuccessMessage} onChange={(event) => updateInvitationText("rsvpDeclinedSuccessMessage", event.target.value)} rows={2} />
            </label>
          </div>
          <section className="story-editor">
            <div className="story-editor-head">
              <div>
                <span><Heart size={16} /> قسم اختياري</span>
                <strong>قصة العروسين</strong>
              </div>
              <button className="btn btn-soft" type="button" onClick={addStoryItem}><Plus size={16} /> إضافة محطة</button>
            </div>
            {invitationTexts.story.length ? (
              <div className="story-editor-list">
                {invitationTexts.story.map((item, index) => (
                  <article className="story-editor-item" key={item.id || index}>
                    <div className="story-editor-item-head">
                      <strong>محطة {index + 1}</strong>
                      <button className="admin-icon-button" type="button" onClick={() => removeStoryItem(index)} title="حذف المحطة"><Trash2 size={16} /></button>
                    </div>
                    <label className="field"><span>العنوان</span><input value={item.title} onChange={(event) => updateStoryItem(index, { title: event.target.value })} /></label>
                    <label className="field"><span>التاريخ (اختياري)</span><input value={item.date || ""} onChange={(event) => updateStoryItem(index, { date: event.target.value })} placeholder="مثلاً: 2024 أو أول لقاء" /></label>
                    <label className="field full"><span>الوصف</span><textarea rows={3} value={item.description} onChange={(event) => updateStoryItem(index, { description: event.target.value })} /></label>
                    <label className="field full"><span>رابط صورة اختياري</span><input dir="ltr" value={item.imageUrl || ""} onChange={(event) => updateStoryItem(index, { imageUrl: event.target.value })} placeholder="/uploads/..." /></label>
                    <label className="builder-logo-upload full">
                      <UploadCloud size={17} />
                      <span>رفع صورة للمحطة</span>
                      <input type="file" accept={acceptedImageFormats} onChange={(event) => handleStoryImageFile(index, event.target.files?.[0])} />
                    </label>
                  </article>
                ))}
              </div>
            ) : (
              <p className="story-editor-empty">لن يظهر القسم داخل الدعوة إلا بعد إضافة محطة واحدة على الأقل.</p>
            )}
          </section>
        </div>

        {message ? <div className={status === "error" ? "notice danger" : "notice success"}>{message}</div> : null}

        <div className="builder-action-row">
          <button className="btn btn-gold btn-glow" type="button" onClick={save} disabled={busy}>
            {busy ? <Loader2 size={17} /> : <Save size={17} />}
            حفظ التعديلات
          </button>
          <button className="btn btn-soft" type="button" onClick={copyUrl}>
            <Copy size={16} />
            نسخ رابط الدعوة
          </button>
        </div>
      </div>

      <aside className="builder-preview-panel">
        <div className="builder-phone-frame">
          <div className="builder-phone-speaker" />
          <iframe ref={iframeRef} src={previewUrl} title="Live Preview" onLoad={wirePreviewClicks} />
        </div>
        <div className="builder-preview-hint">
          <Eye size={16} />
          اضغط على الصور أو النصوص الأساسية داخل المعاينة للتعديل مباشرة.
        </div>
      </aside>
    </section>
  );
}
