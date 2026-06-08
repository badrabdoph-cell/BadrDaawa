"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, MessageCircleHeart, Send } from "lucide-react";
import type { GuestBookMessage } from "@/lib/types";

type GuestBookState = "idle" | "loading" | "success" | "error";

const previewMessages: GuestBookMessage[] = [
  {
    id: "preview-guest-book",
    invitationCode: "preview",
    name: "ضيف عزيز",
    message: "ربنا يتم فرحتكم على خير وتفضل أيامكم كلها حب ونور.",
    status: "approved",
    createdAt: new Date(0).toISOString(),
  },
];

export function GuestBook({ code, isPreview = false }: { code: string; isPreview?: boolean }) {
  const [messages, setMessages] = useState<GuestBookMessage[]>(isPreview ? previewMessages : []);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<GuestBookState>("idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (isPreview) return;
    let alive = true;
    async function loadMessages() {
      const response = await fetch(`/api/invitations/${code}/guest-book`, { cache: "no-store" }).catch(() => null);
      if (!alive || !response?.ok) return;
      const data = (await response.json().catch(() => null)) as { messages?: GuestBookMessage[] } | null;
      setMessages(Array.isArray(data?.messages) ? data.messages : []);
    }
    loadMessages();
    return () => {
      alive = false;
    };
  }, [code, isPreview]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPreview) return;
    setState("loading");
    setNotice("");

    try {
      const response = await fetch(`/api/invitations/${code}/guest-book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, message }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setState("error");
        setNotice(data?.error || "تعذر إرسال الرسالة. حاول مرة أخرى.");
        return;
      }
      setState("success");
      setNotice("وصلت رسالتك، وستظهر داخل الدعوة بعد موافقة الإدارة.");
      setName("");
      setMessage("");
    } catch {
      setState("error");
      setNotice("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    }
  }

  return (
    <section className="invite-card guest-book-card" id="guest-book">
      <span className="invite-kicker">Guest Book</span>
      <div className="guest-book-head">
        <MessageCircleHeart size={24} />
        <div>
          <h2>سجل التهاني</h2>
          <p>اكتبوا كلمة حلوة للعروسين، والرسائل تظهر بعد موافقة الإدارة.</p>
        </div>
      </div>

      <form className="guest-book-form" onSubmit={submit}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="الاسم" maxLength={80} required disabled={isPreview || state === "loading"} />
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="رسالة تهنئة قصيرة" maxLength={600} rows={4} required disabled={isPreview || state === "loading"} />
        <button className="btn btn-gold btn-glow" type="submit" disabled={isPreview || state === "loading"}>
          {state === "loading" ? <Loader2 size={18} className="animate-float" /> : <Send size={18} />}
          إرسال التهنئة
        </button>
      </form>

      {isPreview ? <p className="status">هذا نموذج يظهر شكل سجل التهاني داخل القالب.</p> : null}
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
        {!messages.length ? <p className="guest-book-empty">لا توجد رسائل منشورة بعد. كن أول من يرسل تهنئة.</p> : null}
      </div>
    </section>
  );
}
