"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";

type PollState = "idle" | "attending" | "declined";

export function InvitePoll({
  code,
  question = "ناوي تحضر وتشاركنا فرحه عمرنا؟",
  declinedMessage = "حزين إنك مش معايا في يومي المفضل 🥹",
}: {
  code: string;
  question?: string;
  declinedMessage?: string;
}) {
  const [choice, setChoice] = useState<PollState>("idle");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setMessage("");

    try {
      const response = await fetch(`/api/invitations/${code}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, attendees: 1, status: "confirmed", note: "اختار هحضر من الدعوة" }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setState("error");
        setMessage(data?.error || "حصلت مشكلة. حاول تاني.");
        return;
      }

      setState("success");
      setMessage("تم تسجيل حضورك. مستنيينك تنورنا.");
      setName("");
      setPhone("");
    } catch {
      setState("error");
      setMessage("تعذر الاتصال بالخادم. حاول تاني.");
    }
  }

  return (
    <section id="rsvp" className="invite-card invite-poll">
      <span className="invite-kicker">RSVP</span>
      <h2>{question}</h2>
      <div className="poll-actions">
        <button className={`poll-choice ${choice === "attending" ? "selected" : ""}`} type="button" onClick={() => setChoice("attending")}>
          <Check size={18} />
          هحضر
        </button>
        <button className={`poll-choice ${choice === "declined" ? "selected sad" : ""}`} type="button" onClick={() => setChoice("declined")}>
          <X size={18} />
          للأسف مش هقدر
        </button>
      </div>

      {choice === "declined" ? <p className="sad-message">{declinedMessage}</p> : null}

      {choice === "attending" ? (
        <form className="poll-form" onSubmit={submit}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="الاسم" required />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="رقم الفون" required />
          <button className="btn btn-gold btn-glow" type="submit" disabled={state === "loading"}>
            {state === "loading" ? <Loader2 size={18} className="animate-float" /> : <Check size={18} />}
            سجل حضوري
          </button>
        </form>
      ) : null}

      {message ? <p className={state === "error" ? "status danger" : "status success"}>{message}</p> : null}
    </section>
  );
}
