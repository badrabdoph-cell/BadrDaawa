"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Check, ImagePlus, Loader2, MessageCircleHeart, Send, X } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { CoupleMessagesSettings, GuestBookMessage, Language } from "@/lib/types";

type GuestBookState = "idle" | "loading" | "success" | "error";

function getPreviewMessages(locale: Language): GuestBookMessage[] {
  const t = getInvitationTranslator(locale);
  return [
    {
      id: "preview-guest-book",
      invitationCode: "preview",
      name: t("invitation.coupleMessages.previewName"),
      message: t("invitation.coupleMessages.previewMessage"),
      status: "approved",
      createdAt: new Date(0).toISOString(),
    },
  ];
}

export function GuestBook({ code, isPreview = false, locale = "ar" }: { code: string; isPreview?: boolean; locale?: Language }) {
  const resolvedLocale = resolveLocale(locale);
  const t = getInvitationTranslator(resolvedLocale);
  const [messages, setMessages] = useState<GuestBookMessage[]>(isPreview ? getPreviewMessages(resolvedLocale) : []);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [settings, setSettings] = useState<CoupleMessagesSettings>({ invitationCode: code, mode: "moderated" });
  const [state, setState] = useState<GuestBookState>("idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!image) {
      setImagePreview("");
      return;
    }
    const url = URL.createObjectURL(image);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  useEffect(() => {
    if (isPreview) return;
    let alive = true;
    async function loadMessages() {
      const response = await fetch(`/api/invitations/${code}/guest-book`, { cache: "no-store" }).catch(() => null);
      if (!alive || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as { messages?: GuestBookMessage[]; settings?: CoupleMessagesSettings } | null;
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      if (data?.settings) setSettings(data.settings);
    }
    loadMessages();
    return () => {
      alive = false;
    };
  }, [code, isPreview]);

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    if (file && file.size > 8 * 1024 * 1024) {
      setState("error");
      setNotice(t("invitation.coupleMessages.largeImage"));
      event.currentTarget.value = "";
      return;
    }
    setImage(file);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPreview) return;
    const cleanName = name.trim();
    const cleanMessage = message.trim();
    if (!cleanName || !cleanMessage) {
      setState("error");
      setNotice(t("invitation.coupleMessages.required"));
      return;
    }
    setState("loading");
    setNotice("");

    try {
      const formData = new FormData();
      formData.append("name", cleanName);
      formData.append("message", cleanMessage);
      if (image) formData.append("image", image);
      const response = await fetch(`/api/invitations/${code}/guest-book`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json().catch(() => null)) as { error?: string; status?: GuestBookMessage["status"]; message?: GuestBookMessage } | null;
      if (!response.ok) {
        setState("error");
        setNotice(data?.error || t("invitation.coupleMessages.sendError"));
        return;
      }
      setState("success");
      setNotice(data?.status === "approved" ? t("invitation.coupleMessages.published") : t("invitation.coupleMessages.pending"));
      if (data?.message) setMessages((current) => [data.message as GuestBookMessage, ...current]);
      setName("");
      setMessage("");
      setImage(null);
      event.currentTarget.reset();
    } catch {
      setState("error");
      setNotice(t("common.connectionError"));
    }
  }

  if (!isPreview && settings.mode === "disabled") {
    return null;
  }

  return (
    <section className="invite-card guest-book-card" id="guest-book">
      <span className="invite-kicker">{t("invitation.coupleMessages.kicker")}</span>
      <div className="guest-book-head">
        <MessageCircleHeart size={24} />
        <div>
          <h2>{t("invitation.coupleMessages.title")}</h2>
          <p>{t("invitation.coupleMessages.description")}</p>
        </div>
      </div>

      <form className="guest-book-form" onSubmit={submit}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("invitation.coupleMessages.namePlaceholder")} maxLength={80} required disabled={isPreview || state === "loading"} aria-label={t("invitation.coupleMessages.namePlaceholder")} />
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t("invitation.coupleMessages.messagePlaceholder")} maxLength={600} rows={4} required disabled={isPreview || state === "loading"} aria-label={t("invitation.coupleMessages.messagePlaceholder")} />
        <label className="guest-book-image-picker">
          <ImagePlus size={18} />
          <span>{image ? image.name : t("invitation.coupleMessages.imagePicker")}</span>
          <input type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif" onChange={onImageChange} disabled={isPreview || state === "loading"} />
        </label>
        {imagePreview ? (
          <div className="guest-book-image-preview">
            <img src={imagePreview} alt={t("invitation.coupleMessages.imagePreviewAlt")} />
            <button type="button" onClick={() => setImage(null)} disabled={state === "loading"} aria-label={t("invitation.coupleMessages.removeImage")}>
              <X size={16} />
            </button>
          </div>
        ) : null}
        <button className="btn btn-gold btn-glow" type="submit" disabled={isPreview || state === "loading"}>
          {state === "loading" ? <Loader2 size={18} className="animate-float" /> : <Send size={18} />}
          {t("invitation.coupleMessages.submit")}
        </button>
      </form>

      {isPreview ? <p className="status">{t("invitation.coupleMessages.previewNote")}</p> : null}
      {notice ? <p className={state === "error" ? "status danger" : "status success"}>{notice}</p> : null}

      <div className="guest-book-list" aria-live="polite">
        {messages.map((item) => (
          <article className="guest-book-message" key={item.id}>
            <Check size={16} />
            <div>
              <strong>{item.name}</strong>
              <p>{item.message}</p>
              {item.imageUrl ? <img className="guest-book-message-image" src={item.imageUrl} alt={t("invitation.coupleMessages.imageAlt", { name: item.name })} loading="lazy" /> : null}
            </div>
          </article>
        ))}
        {!messages.length ? <p className="guest-book-empty">{t("invitation.coupleMessages.empty")}</p> : null}
      </div>
    </section>
  );
}
