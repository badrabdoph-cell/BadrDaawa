"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, MessageCircleHeart, Send } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { CoupleMessagesSettings, GuestBookMessage, Language } from "@/lib/types";

type GuestBookState = "idle" | "loading" | "success" | "error";
type GuestBookSubmitResponse = { error?: string; status?: GuestBookMessage["status"]; message?: GuestBookMessage };

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
  const apiCode = encodeURIComponent(code);
  const [messages, setMessages] = useState<GuestBookMessage[]>(isPreview ? getPreviewMessages(resolvedLocale) : []);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [settings, setSettings] = useState<CoupleMessagesSettings>({ invitationCode: code, mode: "moderated" });
  const [state, setState] = useState<GuestBookState>("idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (settings.mode === "disabled") return;
    if (isPreview) {
      setMessages(getPreviewMessages(resolvedLocale));
      return;
    }
    let alive = true;
    async function loadMessages() {
      const response = await fetch(`/api/invitations/${apiCode}/guest-book`, { cache: "no-store" }).catch(() => null);
      if (!alive || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as { messages?: GuestBookMessage[]; settings?: CoupleMessagesSettings } | null;
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
      if (data?.settings) setSettings(data.settings);
    }
    loadMessages();
    return () => {
      alive = false;
    };
  }, [apiCode, isPreview, settings.mode]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanMessage = message.trim();
    if (!cleanName || !cleanMessage) {
      setState("error");
      setNotice(t("invitation.coupleMessages.required"));
      return;
    }
    setState("loading");
    setNotice("");

    if (isPreview) {
      await new Promise((r) => setTimeout(r, 500));
      const mockMessage: GuestBookMessage = {
        id: `preview-msg-${Date.now()}`,
        invitationCode: code,
        name: cleanName,
        message: cleanMessage,
        status: "approved",
        createdAt: new Date().toISOString(),
      };
      setState("success");
      setNotice(t("invitation.coupleMessages.published"));
      setMessages((current) => [mockMessage, ...current]);
      setName("");
      setMessage("");
      return;
    }

    let response: Response;
    let data: GuestBookSubmitResponse | null = null;

    try {
      response = await fetch(`/api/invitations/${apiCode}/guest-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleanName, message: cleanMessage }),
      });
      data = (await response.json().catch(() => null)) as GuestBookSubmitResponse | null;
    } catch {
      setState("error");
      setNotice(t("common.connectionError"));
      return;
    }

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
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("invitation.coupleMessages.namePlaceholder")} maxLength={80} required disabled={state === "loading"} aria-label={t("invitation.coupleMessages.namePlaceholder")} />
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t("invitation.coupleMessages.messagePlaceholder")} maxLength={600} rows={4} required disabled={state === "loading"} aria-label={t("invitation.coupleMessages.messagePlaceholder")} />
        <button className="btn btn-gold btn-glow" type="submit" disabled={state === "loading"}>
          {state === "loading" ? <Loader2 size={18} className="animate-float" /> : <Send size={18} />}
          {t("invitation.coupleMessages.submit")}
        </button>
      </form>
      {notice ? <p className={state === "error" ? "status danger" : "status success"}>{notice}</p> : null}

      <div className="guest-book-list" aria-live="polite">
        {messages.map((item) => (
          <article className="guest-book-message" key={item.id}>
            <Check size={16} />
            <div>
              <strong>{item.name}</strong>
              <p>{item.message}</p>
            </div>
          </article>
        ))}
        {!messages.length ? <p className="guest-book-empty">{t("invitation.coupleMessages.empty")}</p> : null}
      </div>
    </section>
  );
}
