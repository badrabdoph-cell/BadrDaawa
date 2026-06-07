"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Copy, Eye, Loader2, Save, Send } from "lucide-react";
import {
  AdminInvitationTools,
  emptyAdminToolImages,
  emptyAdminToolUpload,
  uploadAdminMusic,
  uploadAdminPreviewImage,
  validateAdminInvitationTools,
  type AdminToolImageSlot,
  type AdminToolMusicChoice,
  type AdminToolMusicFile,
  type AdminToolTemplate,
  type AdminToolUploadSlot,
  type AdminInvitationToolValues,
} from "@/components/AdminInvitationTools";
import type { LiveInvitationPreviewPayload } from "@/components/LiveInvitationPreview";
import { defaultInvitationTexts } from "@/lib/invitation-texts";
import type { InvitationTexts } from "@/lib/types";

type BuilderTemplate = AdminToolTemplate;
type MusicFile = AdminToolMusicFile;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export function AdminInvitationBuilder({ templates, siteUrl, musicFiles }: { templates: BuilderTemplate[]; siteUrl: string; musicFiles: MusicFile[] }) {
  const [templateSlug, setTemplateSlug] = useState(templates[0]?.slug || "");
  const [groomName, setGroomName] = useState("اسم العريس");
  const [brideName, setBrideName] = useState("اسم العروسة");
  const [weddingDate, setWeddingDate] = useState(todayDate());
  const [venue, setVenue] = useState("عنوان المناسبة");
  const [mapUrl, setMapUrl] = useState("");
  const [images, setImages] = useState<AdminToolImageSlot[]>(emptyAdminToolImages);
  const [photographerEnabled, setPhotographerEnabled] = useState(false);
  const [photographerName, setPhotographerName] = useState("");
  const [photographerLogo, setPhotographerLogo] = useState<AdminToolUploadSlot>(emptyAdminToolUpload);
  const [photographerFacebookUrl, setPhotographerFacebookUrl] = useState("");
  const [photographerInstagramUrl, setPhotographerInstagramUrl] = useState("");
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicChoice, setMusicChoice] = useState<AdminToolMusicChoice>("default");
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
      gallery: images.map((image) => image.url).filter(Boolean),
      musicEnabled,
      musicUrl: musicChoice === "default" ? "" : musicUrl,
      disableMusic: !musicEnabled,
      texts: invitationTexts,
      photographer: {
        enabled: photographerEnabled,
        name: photographerName,
        logoUrl: photographerLogo.url,
        facebookUrl: photographerFacebookUrl,
        instagramUrl: photographerInstagramUrl,
      },
    }),
    [brideName, groomName, images, invitationTexts, mapUrl, musicChoice, musicEnabled, musicUrl, photographerEnabled, photographerFacebookUrl, photographerInstagramUrl, photographerLogo.url, photographerName, venue, weddingDate],
  );

  const toolValues = useMemo<AdminInvitationToolValues>(
    () => ({
      templateSlug,
      groomName,
      brideName,
      weddingDate,
      venue,
      mapUrl,
      images,
      photographerEnabled,
      photographerName,
      photographerLogo,
      photographerFacebookUrl,
      photographerInstagramUrl,
      musicEnabled,
      musicChoice,
      musicUrl,
      musicBusy,
      musicFileName,
      invitationTexts,
    }),
    [brideName, groomName, images, invitationTexts, mapUrl, musicBusy, musicChoice, musicEnabled, musicFileName, musicUrl, photographerEnabled, photographerFacebookUrl, photographerInstagramUrl, photographerLogo, photographerName, templateSlug, venue, weddingDate],
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

  function patchToolValues(patch: Partial<AdminInvitationToolValues>) {
    if (patch.templateSlug !== undefined) setTemplateSlug(patch.templateSlug);
    if (patch.groomName !== undefined) setGroomName(patch.groomName);
    if (patch.brideName !== undefined) setBrideName(patch.brideName);
    if (patch.weddingDate !== undefined) setWeddingDate(patch.weddingDate);
    if (patch.venue !== undefined) setVenue(patch.venue);
    if (patch.mapUrl !== undefined) setMapUrl(patch.mapUrl);
    if (patch.images !== undefined) setImages(patch.images);
    if (patch.photographerEnabled !== undefined) setPhotographerEnabled(patch.photographerEnabled);
    if (patch.photographerName !== undefined) setPhotographerName(patch.photographerName);
    if (patch.photographerLogo !== undefined) setPhotographerLogo(patch.photographerLogo);
    if (patch.photographerFacebookUrl !== undefined) setPhotographerFacebookUrl(patch.photographerFacebookUrl);
    if (patch.photographerInstagramUrl !== undefined) setPhotographerInstagramUrl(patch.photographerInstagramUrl);
    if (patch.musicEnabled !== undefined) setMusicEnabled(patch.musicEnabled);
    if (patch.musicChoice !== undefined) setMusicChoice(patch.musicChoice);
    if (patch.musicUrl !== undefined) setMusicUrl(patch.musicUrl);
    if (patch.musicBusy !== undefined) setMusicBusy(patch.musicBusy);
    if (patch.musicFileName !== undefined) setMusicFileName(patch.musicFileName);
    if (patch.invitationTexts !== undefined) setInvitationTexts(patch.invitationTexts);
    if (patch.musicUrl !== undefined || patch.musicChoice !== undefined) setMusicDataUrl("");
    markDirty();
  }

  function updateInvitationText(key: keyof InvitationTexts, value: string) {
    setInvitationTexts((current) => ({ ...current, [key]: value }));
    markDirty();
  }

  async function handleImageFile(index: number, file?: File | null) {
    if (!file) return;
    markDirty();
    setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, name: file.name, loading: true } : item)));
    try {
      const url = await uploadAdminPreviewImage(file);
      setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, url, loading: false } : item)));
    } catch (error) {
      setImages((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, loading: false } : item)));
      setStatus("error");
      setMessage(error instanceof Error && error.message !== "preview-image-upload-failed" ? error.message : "تعذر رفع الصورة. جرّب صورة أخرى أو قلل حجمها ثم أعد المحاولة.");
    }
  }

  async function handleLogoFile(file?: File | null) {
    if (!file) return;
    markDirty();
    setPhotographerLogo({ url: "", name: file.name, loading: true });
    try {
      const url = await uploadAdminPreviewImage(file);
      setPhotographerLogo({ url, name: file.name, loading: false });
    } catch (error) {
      setPhotographerLogo({ url: "", name: file.name, loading: false });
      setStatus("error");
      setMessage(error instanceof Error && error.message !== "preview-image-upload-failed" ? error.message : "تعذر رفع شعار المصور. جرّب صورة أخرى أو قلل حجمها ثم أعد المحاولة.");
    }
  }

  async function handleMusicFile(file?: File | null) {
    if (!file) return;
    markDirty();
    setMusicBusy(true);
    try {
      const uploadedUrl = await uploadAdminMusic(file);
      setMusicBusy(false);
      setMusicDataUrl("");
      setMusicEnabled(true);
      setMusicChoice("upload");
      setMusicUrl(uploadedUrl);
      setMusicFileName(file.name);
    } catch (error) {
      setMusicBusy(false);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "ملف الموسيقى غير قابل للتشغيل.");
    }
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
    const validationError = validateAdminInvitationTools(toolValues, { requireReuploadText: "في صورة مختارة لكنها لم تُرفع بنجاح. ارفعها مرة أخرى قبل نشر الدعوة." });
    if (validationError) {
      setStatus("error");
      setMessage(validationError);
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
        gallery: images.map((image) => image.url).filter(Boolean),
        musicEnabled,
        musicUrl: musicChoice === "default" ? "" : musicUrl,
        musicDataUrl,
        texts: invitationTexts,
        photographer: {
          enabled: photographerEnabled,
          name: photographerName,
          logoUrl: photographerLogo.url,
          logoDataUrl: "",
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
        <div className={dirty ? "builder-save-state dirty" : "builder-save-state"}>
          {dirty ? "توجد تعديلات غير محفوظة" : "كل التعديلات محفوظة"}
        </div>
      </div>

      <div className="builder-layout">
        <div className="builder-editor-panel">
          <AdminInvitationTools
            values={toolValues}
            templates={templates}
            musicFiles={musicFiles}
            refs={{ imageInputRefs, photographerLogoInputRef, fieldRefs, textFieldRefs }}
            onPatch={patchToolValues}
            onImageFile={handleImageFile}
            onPhotographerLogoFile={handleLogoFile}
            onInvitationTextChange={updateInvitationText}
            onMusicFile={handleMusicFile}
          />

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
