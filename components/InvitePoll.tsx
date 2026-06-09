"use client";

import { useState } from "react";
import { Check, CheckCircle2, Loader2, PartyPopper, X } from "lucide-react";

type PollState = "idle" | "attending" | "declined";
type RsvpStatus = "confirmed" | "declined";

export function InvitePoll({
  code,
  question = "ناوي تحضر وتشاركنا فرحه عمرنا؟",
  declinedMessage = "حزين إنك مش معايا في يومي المفضل 🥹",
  confirmedSuccessMessage = "شكراً لتأكيد حضورك. وجودك يفرحنا ويكمل ليلتنا.",
  declinedSuccessMessage = "شكراً لردك. نتمنى لك كل الخير ونقدر مشاركتك لنا الفرحة.",
}: {
  code: string;
  question?: string;
  declinedMessage?: string;
  confirmedSuccessMessage?: string;
  declinedSuccessMessage?: string;
}) {
  const [choice, setChoice] = useState<PollState>("idle");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<{ name: string; status: RsvpStatus } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (choice !== "attending" && choice !== "declined") return;
    const status: RsvpStatus = choice === "attending" ? "confirmed" : "declined";
    const guestName = name.trim();
    setState("loading");
    setMessage("");
    setSuccess(null);

    try {
      const response = await fetch(`/api/invitations/${code}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: guestName,
          phone,
          attendees: 1,
          status,
          note: status === "confirmed" ? "اختار هحضر من الدعوة" : "اختار الاعتذار من الدعوة",
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setState("error");
        setMessage(data?.error || "حصلت مشكلة. حاول تاني.");
        return;
      }

      setState("success");
      setSuccess({ name: guestName, status });
      setName("");
      setPhone("");
    } catch {
      setState("error");
      setMessage("تعذر الاتصال بالخادم. حاول تاني.");
    }
  }

  function selectChoice(nextChoice: PollState) {
    setChoice(nextChoice);
    setState("idle");
    setMessage("");
    setSuccess(null);
  }

  if (success) {
    const confirmed = success.status === "confirmed";
    return (
      <section id="rsvp" className={confirmed ? "invite-card invite-poll rsvp-success-card confirmed" : "invite-card invite-poll rsvp-success-card declined"}>
        <span className="invite-kicker">RSVP</span>
        <div className="rsvp-success-icon">
          {confirmed ? <PartyPopper size={28} /> : <CheckCircle2 size={28} />}
        </div>
        <h2>تم إرسال ردك بنجاح</h2>
        <div className="rsvp-success-summary">
          <span>اسم الضيف</span>
          <strong>{success.name}</strong>
        </div>
        <div className="rsvp-success-summary">
          <span>حالة الرد</span>
          <strong>{confirmed ? "حضور مؤكد" : "اعتذار عن الحضور"}</strong>
        </div>
        <p>{confirmed ? confirmedSuccessMessage : declinedSuccessMessage}</p>
        <button className="poll-choice" type="button" onClick={() => {
          setChoice("idle");
          setState("idle");
          setSuccess(null);
        }}>
          إرسال رد آخر
        </button>
      </section>
    );
  }

  return (
    <section id="rsvp" className="invite-card invite-poll">
      <span className="invite-kicker">RSVP</span>
      <h2>{question}</h2>
      <div className="poll-actions">
        <button className={`poll-choice ${choice === "attending" ? "selected" : ""}`} type="button" onClick={() => selectChoice("attending")}>
          <Check size={18} />
          هحضر
        </button>
        <button className={`poll-choice ${choice === "declined" ? "selected sad" : ""}`} type="button" onClick={() => selectChoice("declined")}>
          <X size={18} />
          للأسف مش هقدر
        </button>
      </div>

      {choice === "declined" ? <p className="sad-message">{declinedMessage}</p> : null}

      {choice === "attending" || choice === "declined" ? (
        <form className="poll-form" onSubmit={submit}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="الاسم" required />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="رقم الفون" required />
          <button className="btn btn-gold btn-glow" type="submit" disabled={state === "loading"}>
            {state === "loading" ? <Loader2 size={18} className="animate-float" /> : choice === "attending" ? <Check size={18} /> : <X size={18} />}
            {choice === "attending" ? "سجل حضوري" : "إرسال الاعتذار"}
          </button>
        </form>
      ) : null}

      {message ? <p className={state === "error" ? "status danger" : "status success"}>{message}</p> : null}
    </section>
  );
}
