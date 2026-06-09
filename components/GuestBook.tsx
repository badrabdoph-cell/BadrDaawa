"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { Check, ImagePlus, Loader2, MessageCircleHeart, Send, X } from "lucide-react";
import type { CoupleMessagesSettings, GuestBookMessage } from "@/lib/types";

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
      setNotice("حجم الصورة كبير. اختار صورة أقل من 8MB.");
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
      setNotice("اكتب الاسم ورسالة واضحة قبل الإرسال.");
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
        setNotice(data?.error || "تعذر إرسال الرسالة. حاول مرة أخرى.");
        return;
      }
      setState("success");
      setNotice(data?.status === "approved" ? "تم نشر رسالتك داخل الدعوة. شكراً لك." : "وصلت رسالتك، وستظهر داخل الدعوة بعد موافقة الإدارة.");
      if (data?.message) setMessages((current) => [data.message as GuestBookMessage, ...current]);
      setName("");
      setMessage("");
      setImage(null);
      event.currentTarget.reset();
    } catch {
      setState("error");
      setNotice("تعذر الاتصال بالخادم. حاول مرة أخرى.");
    }
  }

  if (!isPreview && settings.mode === "disabled") {
    return null;
  }

  return (
    <section className="invite-card guest-book-card" id="guest-book">
      <span className="invite-kicker">Couple Messages</span>
      <div className="guest-book-head">
        <MessageCircleHeart size={24} />
        <div>
          <h2>رسائل للعروسين</h2>
          <p>اتركوا كلمة تبقى ذكرى جميلة للعروسين بعد يوم الفرح.</p>
        </div>
      </div>

      <form className="guest-book-form" onSubmit={submit}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="اكتب اسمك" maxLength={80} required disabled={isPreview || state === "loading"} aria-label="اسم مرسل الرسالة" />
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="اكتب رسالتك للعروسين" maxLength={600} rows={4} required disabled={isPreview || state === "loading"} aria-label="رسالة للعروسين" />
        <label className="guest-book-image-picker">
          <ImagePlus size={18} />
          <span>{image ? image.name : "إضافة صورة اختيارية"}</span>
          <input type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif,.avif" onChange={onImageChange} disabled={isPreview || state === "loading"} />
        </label>
        {imagePreview ? (
          <div className="guest-book-image-preview">
            <img src={imagePreview} alt="معاينة الصورة المرفقة" />
            <button type="button" onClick={() => setImage(null)} disabled={state === "loading"} aria-label="إزالة الصورة">
              <X size={16} />
            </button>
          </div>
        ) : null}
        <button className="btn btn-gold btn-glow" type="submit" disabled={isPreview || state === "loading"}>
          {state === "loading" ? <Loader2 size={18} className="animate-float" /> : <Send size={18} />}
          إرسال الرسالة
        </button>
      </form>

      {isPreview ? <p className="status">هذا نموذج يظهر شكل رسائل العروسين داخل القالب.</p> : null}
      {notice ? <p className={state === "error" ? "status danger" : "status success"}>{notice}</p> : null}

      <div className="guest-book-list" aria-live="polite">
        {messages.map((item) => (
          <article className="guest-book-message" key={item.id}>
            <Check size={16} />
            <div>
              <strong>{item.name}</strong>
              <p>{item.message}</p>
              {item.imageUrl ? <img className="guest-book-message-image" src={item.imageUrl} alt={`صورة من ${item.name}`} loading="lazy" /> : null}
            </div>
          </article>
        ))}
        {!messages.length ? <p className="guest-book-empty">لا توجد رسائل منشورة بعد. كن أول من يترك ذكرى للعروسين.</p> : null}
      </div>
    </section>
  );
}
