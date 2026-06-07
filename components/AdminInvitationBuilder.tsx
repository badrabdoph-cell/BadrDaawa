"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Eye, ImagePlus, Link2, Loader2, Music2, Save, Send, UploadCloud, UserRound, WandSparkles } from "lucide-react";
import { acceptedImageFormats } from "@/lib/image-formats";
import { getTemplateTextBindings, unifiedImageSlots } from "@/lib/invitation-template-bindings";
import type { TemplateDefinition } from "@/lib/types";

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
  const [status, setStatus] = useState<"idle" | "saving" | "publishing" | "error" | "success">("idle");
  const [message, setMessage] = useState("");
  const [savedCode, setSavedCode] = useState("");
  const [links, setLinks] = useState<{ publicUrl: string; adminUrl: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fieldRefs = {
    groomName: useRef<HTMLInputElement | null>(null),
    brideName: useRef<HTMLInputElement | null>(null),
    weddingDate: useRef<HTMLInputElement | null>(null),
    venue: useRef<HTMLInputElement | null>(null),
  };
  const imageInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const selectedTemplate = useMemo(() => templates.find((template) => template.slug === templateSlug) || templates[0], [templateSlug, templates]);
  const textBindings = useMemo(() => (selectedTemplate ? getTemplateTextBindings(selectedTemplate) : []), [selectedTemplate]);
  const cleanSiteUrl = siteUrl.replace(/\/$/, "");

  const previewUrl = useMemo(() => {
    const params = new URLSearchParams({
      builderPreview: "1",
      groomName,
      brideName,
      weddingDate,
      venue,
    });
    if (mapUrl) params.set("mapUrl", mapUrl);
    if (!musicEnabled) params.set("silentPreview", "1");
    const gallery = images.map((image) => image.previewUrl).filter(Boolean);
    if (gallery.length) params.set("gallery", gallery.join(","));
    if (photographerEnabled) {
      params.set("photographerEnabled", "1");
      if (photographerName) params.set("photographerName", photographerName);
      if (photographerFacebookUrl) params.set("photographerFacebookUrl", photographerFacebookUrl);
      if (photographerInstagramUrl) params.set("photographerInstagramUrl", photographerInstagramUrl);
      if (photographerLogo.previewUrl) params.set("photographerLogoUrl", photographerLogo.previewUrl);
    }
    if (musicEnabled && musicUrl) params.set("musicUrl", musicUrl);
    return `/templates/${templateSlug}/preview?${params.toString()}`;
  }, [brideName, groomName, images, mapUrl, musicEnabled, musicUrl, photographerEnabled, photographerFacebookUrl, photographerInstagramUrl, photographerLogo.previewUrl, photographerName, templateSlug, venue, weddingDate]);

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function markDirty() {
    setDirty(true);
    if (message) setMessage("");
  }

  async function uploadPreviewImage(dataUrl: string, folderSetter: (url: string) => void) {
    const response = await fetch("/api/orders/preview-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: [dataUrl] }),
    });
    const data = (await response.json().catch(() => null)) as { imageUrls?: string[] } | null;
    folderSetter(data?.imageUrls?.[0] || "");
  }

  async function handleImageFile(index: number, file?: File | null) {
    if (!file) return;
    markDirty();
    const dataUrl = await readFileAsDataUrl(file);
    setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, dataUrl, name: file.name, loading: true } : item)));
    await uploadPreviewImage(dataUrl, (url) => {
      setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, previewUrl: url, loading: false } : item)));
    });
  }

  async function handleLogoFile(file?: File | null) {
    if (!file) return;
    markDirty();
    const dataUrl = await readFileAsDataUrl(file);
    setPhotographerLogo({ dataUrl, previewUrl: "", name: file.name, loading: true });
    await uploadPreviewImage(dataUrl, (url) => setPhotographerLogo({ dataUrl, previewUrl: url, name: file.name, loading: false }));
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
    doc.querySelectorAll("img").forEach((img, index) => {
      img.style.cursor = "pointer";
      img.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        imageInputRefs.current[Math.min(index, 2)]?.click();
      });
    });
    doc.querySelectorAll("h1,h2,p,strong,span").forEach((element) => {
      element.addEventListener("click", (event) => {
        const text = element.textContent || "";
        if (!text.trim()) return;
        event.preventDefault();
        event.stopPropagation();
        if (text.includes(groomName)) fieldRefs.groomName.current?.focus();
        else if (text.includes(brideName)) fieldRefs.brideName.current?.focus();
        else if (text.includes(venue)) fieldRefs.venue.current?.focus();
        else fieldRefs.weddingDate.current?.focus();
      });
    });
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
        gallery: images.map((image) => image.dataUrl || image.previewUrl).filter(Boolean),
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
                  <input type="file" accept={acceptedImageFormats} onChange={(event) => handleLogoFile(event.target.files?.[0])} />
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
              <WandSparkles size={18} />
              <strong>النصوص القابلة للربط من القالب</strong>
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
