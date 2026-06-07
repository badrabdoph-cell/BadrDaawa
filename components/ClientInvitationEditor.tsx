"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Eye, ImagePlus, Loader2, Music2, Save, UploadCloud, UserRound, WandSparkles } from "lucide-react";
import type { LiveInvitationPreviewPayload } from "@/components/LiveInvitationPreview";
import { acceptedImageFormats } from "@/lib/image-formats";
import { getTemplateTextBindings, unifiedImageSlots } from "@/lib/invitation-template-bindings";
import type { Invitation, TemplateDefinition } from "@/lib/types";

type MusicFile = { url: string; modifiedAt: number };
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
  return /^(https?:\/\/.+|\/uploads\/music\/.+)\.(mp3|wav|ogg|webm|m4a|aac|mp4|aif|aiff|flac)(?:[?#].*)?$/i.test(value.trim());
}

export function ClientInvitationEditor({
  invitation,
  template,
  musicFiles,
  publicUrl,
}: {
  invitation: Invitation;
  template: Pick<TemplateDefinition, "slug" | "name" | "arabicName" | "opening" | "concept" | "layout" | "typography">;
  musicFiles: MusicFile[];
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
  const [photographerEnabled, setPhotographerEnabled] = useState(Boolean(invitation.photographer?.enabled));
  const [photographerName, setPhotographerName] = useState(invitation.photographer?.name || "");
  const [photographerLogo, setPhotographerLogo] = useState<ImageSlotState>({ previewUrl: invitation.photographer?.logoUrl || "", dataUrl: "", name: "", loading: false });
  const [photographerFacebookUrl, setPhotographerFacebookUrl] = useState(invitation.photographer?.facebookUrl || "");
  const [photographerInstagramUrl, setPhotographerInstagramUrl] = useState(invitation.photographer?.instagramUrl || "");
  const [musicEnabled, setMusicEnabled] = useState(invitation.musicEnabled !== false && Boolean(invitation.musicUrl));
  const [musicUrl, setMusicUrl] = useState(invitation.musicUrl || "");
  const [musicDataUrl, setMusicDataUrl] = useState("");
  const [musicFileName, setMusicFileName] = useState("");
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
  const textBindings = useMemo(() => getTemplateTextBindings(template), [template]);

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
      musicEnabled,
      musicUrl,
      disableMusic: !musicEnabled,
      photographer: {
        enabled: photographerEnabled,
        name: photographerName,
        logoUrl: photographerLogo.previewUrl,
        facebookUrl: photographerFacebookUrl,
        instagramUrl: photographerInstagramUrl,
      },
    }),
    [brideName, city, groomName, images, mapUrl, musicEnabled, musicUrl, photographerEnabled, photographerFacebookUrl, photographerInstagramUrl, photographerLogo.previewUrl, photographerName, venue, weddingDate, weddingTime],
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

  async function uploadPreviewImage(dataUrl: string) {
    const response = await fetch("/api/orders/preview-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: [dataUrl] }),
    });
    const data = (await response.json().catch(() => null)) as { imageUrls?: string[] } | null;
    const url = data?.imageUrls?.[0] || "";
    if (!response.ok || !url) throw new Error("preview-image-upload-failed");
    return url;
  }

  async function handleImageFile(index: number, file?: File | null) {
    if (!file) return;
    markDirty();
    const dataUrl = await readFileAsDataUrl(file);
    setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, dataUrl, name: file.name, loading: true } : item)));
    try {
      const url = await uploadPreviewImage(dataUrl);
      setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, previewUrl: url, loading: false } : item)));
    } catch {
      setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, loading: false } : item)));
      setStatus("error");
      setMessage("تعذر رفع الصورة. جرّب صورة أخرى أو قلل حجمها ثم أعد المحاولة.");
    }
  }

  async function handleLogoFile(file?: File | null) {
    if (!file) return;
    markDirty();
    const dataUrl = await readFileAsDataUrl(file);
    setPhotographerLogo({ dataUrl, previewUrl: "", name: file.name, loading: true });
    try {
      const url = await uploadPreviewImage(dataUrl);
      setPhotographerLogo({ dataUrl, previewUrl: url, name: file.name, loading: false });
    } catch {
      setPhotographerLogo({ dataUrl, previewUrl: "", name: file.name, loading: false });
      setStatus("error");
      setMessage("تعذر رفع شعار المصور. جرّب صورة أخرى أو قلل حجمها ثم أعد المحاولة.");
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
    setMusicDataUrl(dataUrl);
    setMusicUrl(data.musicUrl);
    setMusicFileName(file.name);
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
        gallery: images.map((image) => image.previewUrl || image.dataUrl).filter(Boolean),
        musicEnabled,
        musicUrl,
        musicDataUrl,
        photographer: {
          enabled: photographerEnabled,
          name: photographerName,
          logoUrl: photographerLogo.previewUrl,
          logoDataUrl: photographerLogo.dataUrl,
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
            <input value={mapUrl} onChange={(event) => { setMapUrl(event.target.value); markDirty(); }} />
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
              <label className="field">
                <span>اختيار من الملفات المحفوظة</span>
                <select value={musicUrl} onChange={(event) => { setMusicUrl(event.target.value); setMusicDataUrl(""); markDirty(); }}>
                  <option value="">اختار ملف محفوظ</option>
                  {musicFiles.map((file) => <option key={file.url} value={file.url}>{file.url.split("/").pop()}</option>)}
                </select>
              </label>
              <label className="builder-logo-upload">
                {busy ? <Loader2 size={17} /> : <UploadCloud size={17} />}
                <span>{musicFileName || "رفع ملف جديد"}</span>
                <input type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac,.mp4,.flac" onChange={(event) => handleMusicFile(event.target.files?.[0])} />
              </label>
              <label className="field full">
                <span>رابط ملف صوتي خارجي</span>
                <input value={musicUrl} onChange={(event) => { setMusicUrl(event.target.value); setMusicDataUrl(""); markDirty(); }} />
              </label>
              {musicUrl ? <audio controls preload="metadata" src={musicUrl} /> : null}
            </div>
          ) : null}
        </div>

        <div className="builder-section">
          <div className="builder-section-head">
            <WandSparkles size={18} />
            <strong>النصوص المكتشفة من القالب</strong>
          </div>
          <div className="builder-text-list">
            {textBindings.map((item) => (
              <label className="field" key={item.id}>
                <span>{item.label}</span>
                <textarea value={item.value} readOnly rows={2} />
              </label>
            ))}
          </div>
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
