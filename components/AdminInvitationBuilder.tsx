"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Eye, ImagePlus, Loader2, MessageSquareText, Music2, Save, Send, UploadCloud, UserRound } from "lucide-react";
import type { LiveInvitationPreviewPayload } from "@/components/LiveInvitationPreview";
import { acceptedImageFormats } from "@/lib/image-formats";
import { defaultInvitationTexts } from "@/lib/invitation-texts";
import { unifiedImageSlots } from "@/lib/invitation-template-bindings";
import type { InvitationTexts, TemplateDefinition } from "@/lib/types";

type BuilderTemplate = Pick<TemplateDefinition, "slug" | "name" | "arabicName" | "opening" | "concept" | "layout" | "typography">;
type MusicFile = { url: string; modifiedAt: number };
type ImageSlotState = { previewUrl: string; dataUrl: string; name: string; loading: boolean };

const emptyImages: ImageSlotState[] = unifiedImageSlots.map(() => ({ previewUrl: "", dataUrl: "", name: "", loading: false }));

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function isPlayableAudioUrl(value: string) {
  if (!value.trim()) return true;
  return /^(https?:\/\/.+|\/uploads\/music\/.+)\.(mp3|wav|ogg|webm|m4a|aac|mp4|aif|aiff|flac)(?:[?#].*)?$/i.test(value.trim());
}

export function AdminInvitationBuilder({ templates, siteUrl, musicFiles }: { templates: BuilderTemplate[]; siteUrl: string; musicFiles: MusicFile[] }) {
  const [templateSlug, setTemplateSlug] = useState(templates[0]?.slug || "");
  const [groomName, setGroomName] = useState("اسم العريس");
  const [brideName, setBrideName] = useState("اسم العروسة");
  const [weddingDate, setWeddingDate] = useState(todayDate());
  const [venue, setVenue] = useState("عنوان المناسبة");
  const [mapUrl, setMapUrl] = useState("");
  const [images, setImages] = useState<ImageSlotState[]>(emptyImages);
  const [photographerEnabled, setPhotographerEnabled] = useState(false);
  const [photographerName, setPhotographerName] = useState("");
  const [photographerLogo, setPhotographerLogo] = useState<ImageSlotState>({ previewUrl: "", dataUrl: "", name: "", loading: false });
  const [photographerFacebookUrl, setPhotographerFacebookUrl] = useState("");
  const [photographerInstagramUrl, setPhotographerInstagramUrl] = useState("");
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicUrl, setMusicUrl] = useState("");
  const [musicDataUrl, setMusicDataUrl] = useState("");
  const [musicFileName, setMusicFileName] = useState("");
  const [musicBusy, setMusicBusy] = useState(false);
  const [invitationTexts, setInvitationTexts] = useState<Required<InvitationTexts>>(defaultInvitationTexts);
  const [status, setStatus] = useState<"idle" | "saving" | "publishing" | "error" | "success">("idle");
  const [message, setMessage] = useState("");
  const [savedCode, setSavedCode] = useState("");
  const [links, setLinks] = useState<{ publicUrl: string; adminUrl: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
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
  const imageInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({ builderPreview: "1", silentPreview: "1" });
    return `/templates/${templateSlug}/preview?${params.toString()}`;
  }, [templateSlug]);

  const previewPayload = useMemo<LiveInvitationPreviewPayload>(
    () => ({
      groomName,
      brideName,
      weddingDate,
      weddingTime: "07:00 مساءً",
      venue,
      city: "",
      mapUrl,
      gallery: images.map((image) => image.previewUrl).filter(Boolean),
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
    [brideName, groomName, images, invitationTexts, mapUrl, musicEnabled, musicUrl, photographerEnabled, photographerFacebookUrl, photographerInstagramUrl, photographerLogo.previewUrl, photographerName, venue, weddingDate],
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
    setMusicBusy(true);
    const dataUrl = await readFileAsDataUrl(file);
    const response = await fetch("/api/orders/preview-music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ music: dataUrl }),
    });
    const data = (await response.json().catch(() => null)) as { musicUrl?: string; error?: string } | null;
    setMusicBusy(false);
    if (!response.ok || !data?.musicUrl) {
      setStatus("error");
      setMessage(data?.error || "ملف الموسيقى غير قابل للتشغيل.");
      return;
    }
    setMusicDataUrl(dataUrl);
    setMusicUrl(data.musicUrl);
    setMusicFileName(file.name);
  }

  function wirePreviewClicks() {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
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

  async function save(action: "draft" | "publish") {
    if (!groomName.trim() || !brideName.trim() || !weddingDate || !venue.trim()) {
      setStatus("error");
      setMessage("اكتب اسم العريس والعروسة والتاريخ والعنوان قبل الحفظ.");
      return;
    }
    if (musicEnabled && musicUrl && !isPlayableAudioUrl(musicUrl)) {
      setStatus("error");
      setMessage("رابط الموسيقى لازم يكون ملف صوت مباشر.");
      return;
    }
    setStatus(action === "draft" ? "saving" : "publishing");
    const response = await fetch("/api/admin/invitation-builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        code: savedCode,
        templateSlug,
        groomName,
        brideName,
        weddingDate,
        venue,
        mapUrl,
        gallery: images.map((image) => image.previewUrl || image.dataUrl).filter(Boolean),
        musicEnabled,
        musicUrl,
        musicDataUrl,
        texts: invitationTexts,
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
    const data = (await response.json().catch(() => null)) as { error?: string; code?: string; publicUrl?: string; adminUrl?: string } | null;
    if (!response.ok || !data?.code) {
      setStatus("error");
      setMessage(data?.error || "تعذر حفظ الدعوة.");
      return;
    }
    setSavedCode(data.code);
    setLinks({ publicUrl: data.publicUrl || `${cleanSiteUrl}/${data.code}`, adminUrl: data.adminUrl || `${cleanSiteUrl}/${data.code}/ad_3399` });
    setDirty(false);
    setStatus("success");
    setMessage(action === "draft" ? "تم حفظ المسودة." : "تم نشر الدعوة وإضافتها إلى دعوات العملاء.");
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
  }

  return (
    <section className="builder-shell">
      <div className="builder-top-card">
        <div className="field builder-template-field">
          <label htmlFor="builder-template">اختيار القالب</label>
          <select id="builder-template" value={templateSlug} onChange={(event) => { setTemplateSlug(event.target.value); markDirty(); }}>
            {templates.map((template) => (
              <option key={template.slug} value={template.slug}>
                {template.arabicName} - {template.name}
              </option>
            ))}
          </select>
        </div>
        <div className={dirty ? "builder-save-state dirty" : "builder-save-state"}>
          {dirty ? "توجد تعديلات غير محفوظة" : "كل التعديلات محفوظة"}
        </div>
      </div>

      <div className="builder-layout">
        <div className="builder-editor-panel">
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
              <span>العنوان</span>
              <input ref={fieldRefs.venue} value={venue} onChange={(event) => { setVenue(event.target.value); markDirty(); }} />
            </label>
            <label className="field">
              <span>رابط اللوكيشن</span>
              <input value={mapUrl} onChange={(event) => { setMapUrl(event.target.value); markDirty(); }} placeholder="انسخ رابط اللوكيشن من على خريطة جوجل" />
              <small>انسخ رابط اللوكيشن من على خريطة جوجل.</small>
            </label>
          </div>

          <div className="builder-section">
            <div className="builder-section-head">
              <ImagePlus size={18} />
              <strong>نظام الصور الموحد</strong>
            </div>
            <div className="builder-photo-grid">
              {unifiedImageSlots.map((slot, index) => (
                <label className="builder-photo-slot" key={slot.id}>
                  <span>{slot.label}</span>
                  {images[index]?.previewUrl ? <img src={images[index].previewUrl} alt={slot.label} /> : <i><ImagePlus size={18} /> {slot.role}</i>}
                  <small>{images[index]?.loading ? "جاري الرفع" : images[index]?.name || "Smart crop + cover"}</small>
                  <input ref={(node) => { imageInputRefs.current[index] = node; }} type="file" accept={acceptedImageFormats} onChange={(event) => handleImageFile(index, event.target.files?.[0])} />
                </label>
              ))}
            </div>
          </div>

          <div className="builder-section">
            <button className={photographerEnabled ? "builder-toggle active" : "builder-toggle"} type="button" onClick={() => { setPhotographerEnabled(!photographerEnabled); markDirty(); }}>
              <UserRound size={17} />
              إضافة بيانات المصور
            </button>
            {photographerEnabled ? (
              <div className="builder-mini-grid">
                <label className="field">
                  <span>اسم المصور الفوتوغرافي</span>
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
              <strong>موسيقى الدعوة</strong>
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
                    {musicFiles.map((file) => (
                      <option key={file.url} value={file.url}>{file.url.split("/").pop()}</option>
                    ))}
                  </select>
                </label>
                <label className="builder-logo-upload">
                  {musicBusy ? <Loader2 size={17} /> : <UploadCloud size={17} />}
                  <span>{musicFileName || "رفع ملف جديد"}</span>
                  <input type="file" accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac,.mp4,.flac" onChange={(event) => handleMusicFile(event.target.files?.[0])} />
                </label>
                <label className="field">
                  <span>رابط ملف صوتي خارجي</span>
                  <input value={musicUrl} onChange={(event) => { setMusicUrl(event.target.value); setMusicDataUrl(""); markDirty(); }} placeholder="https://example.com/song.mp3" />
                </label>
                {musicUrl ? <audio controls preload="metadata" src={musicUrl} /> : null}
              </div>
            ) : null}
          </div>

          <div className="builder-section">
            <div className="builder-section-head">
              <MessageSquareText size={18} />
              <strong>نصوص داخل الدعوة</strong>
            </div>
            <div className="builder-text-list">
              <label className="field">
                <span>سؤال تأكيد الحضور</span>
                <input
                  ref={textFieldRefs.rsvpQuestion}
                  value={invitationTexts.rsvpQuestion}
                  onChange={(event) => updateInvitationText("rsvpQuestion", event.target.value)}
                />
              </label>
              <label className="field">
                <span>رسالة الدعوة</span>
                <textarea
                  ref={textFieldRefs.inviteMessage}
                  value={invitationTexts.inviteMessage}
                  onChange={(event) => updateInvitationText("inviteMessage", event.target.value)}
                  rows={3}
                />
              </label>
              <label className="field">
                <span>رسالة إضافية</span>
                <textarea value={invitationTexts.inviteMessageSecondary} onChange={(event) => updateInvitationText("inviteMessageSecondary", event.target.value)} rows={2} />
              </label>
              <label className="field">
                <span>رسالة الاعتذار عن الحضور</span>
                <input value={invitationTexts.rsvpDeclinedMessage} onChange={(event) => updateInvitationText("rsvpDeclinedMessage", event.target.value)} />
              </label>
            </div>
          </div>

          {message ? <div className={status === "error" ? "notice danger" : "notice success"}>{message}</div> : null}

          <div className="builder-action-row">
            <button className="btn btn-soft" type="button" onClick={() => save("draft")} disabled={status === "saving" || status === "publishing"}>
              {status === "saving" ? <Loader2 size={17} /> : <Save size={17} />}
              حفظ مسودة
            </button>
            <button className="btn btn-gold btn-glow" type="button" onClick={() => save("publish")} disabled={status === "saving" || status === "publishing"}>
              {status === "publishing" ? <Loader2 size={17} /> : <Send size={17} />}
              نشر الدعوة
            </button>
          </div>

          {links ? (
            <div className="builder-links">
              <h2>روابط الدعوة</h2>
              <div>
                <span>رابط الدعوة العامة</span>
                <strong>{links.publicUrl}</strong>
                <button className="btn btn-soft" type="button" onClick={() => copy(links.publicUrl)}><Copy size={16} /> نسخ</button>
              </div>
              <div>
                <span>رابط إدارة الدعوة</span>
                <strong>{links.adminUrl}</strong>
                <button className="btn btn-soft" type="button" onClick={() => copy(links.adminUrl)}><Copy size={16} /> نسخ</button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="builder-preview-panel">
          <div className="builder-phone-frame">
            <div className="builder-phone-speaker" />
            <iframe ref={iframeRef} src={previewUrl} title="Live Preview" onLoad={wirePreviewClicks} />
          </div>
          <div className="builder-preview-hint">
            <Eye size={16} />
            اضغط على الصور داخل المعاينة لتغيير Photo 1/2/3، واضغط على النصوص الأساسية للرجوع للحقل المناسب.
          </div>
        </aside>
      </div>
    </section>
  );
}
