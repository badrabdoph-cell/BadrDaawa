"use client";

import { useState } from "react";
import { Check, CheckCircle2, Loader2, PartyPopper, X } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

type PollState = "idle" | "attending" | "declined";
type RsvpStatus = "confirmed" | "declined";

export function InvitePoll({
  code,
  locale = "ar",
  question,
  declinedMessage,
  confirmedSuccessMessage,
  declinedSuccessMessage,
}: {
  code: string;
  locale?: Language;
  question?: string;
  declinedMessage?: string;
  confirmedSuccessMessage?: string;
  declinedSuccessMessage?: string;
}) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const resolvedQuestion = question || t("invitation.rsvp.defaultQuestion");
  const resolvedDeclinedMessage = declinedMessage || t("invitation.rsvp.declinedMessage");
  const resolvedConfirmedSuccessMessage = confirmedSuccessMessage || t("invitation.rsvp.confirmedSuccessMessage");
  const resolvedDeclinedSuccessMessage = declinedSuccessMessage || t("invitation.rsvp.declinedSuccessMessage");
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
          note: status === "confirmed" ? t("invitation.rsvp.noteConfirmed") : t("invitation.rsvp.noteDeclined"),
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setState("error");
        setMessage(data?.error || t("common.error"));
        return;
      }

      setState("success");
      setSuccess({ name: guestName, status });
      setName("");
      setPhone("");
    } catch {
      setState("error");
      setMessage(t("common.connectionError"));
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
        <span className="invite-kicker">{t("invitation.rsvp.kicker")}</span>
        <div className="rsvp-success-icon">
          {confirmed ? <PartyPopper size={28} /> : <CheckCircle2 size={28} />}
        </div>
        <h2>{t("invitation.rsvp.successTitle")}</h2>
        <div className="rsvp-success-summary">
          <span>{t("invitation.rsvp.guestName")}</span>
          <strong>{success.name}</strong>
        </div>
        <div className="rsvp-success-summary">
          <span>{t("invitation.rsvp.responseStatus")}</span>
          <strong>{confirmed ? t("invitation.rsvp.confirmed") : t("invitation.rsvp.declined")}</strong>
        </div>
        <p>{confirmed ? resolvedConfirmedSuccessMessage : resolvedDeclinedSuccessMessage}</p>
        <button className="poll-choice" type="button" onClick={() => {
          setChoice("idle");
          setState("idle");
          setSuccess(null);
        }}>
          {t("invitation.rsvp.sendAnother")}
        </button>
      </section>
    );
  }

  return (
    <section id="rsvp" className="invite-card invite-poll">
      <span className="invite-kicker">{t("invitation.rsvp.kicker")}</span>
      <h2>{resolvedQuestion}</h2>
      <div className="poll-actions">
        <button className={`poll-choice ${choice === "attending" ? "selected" : ""}`} type="button" onClick={() => selectChoice("attending")}>
          <Check size={18} />
          {t("invitation.rsvp.attending")}
        </button>
        <button className={`poll-choice ${choice === "declined" ? "selected sad" : ""}`} type="button" onClick={() => selectChoice("declined")}>
          <X size={18} />
          {t("invitation.rsvp.notAttending")}
        </button>
      </div>

      {choice === "declined" ? <p className="sad-message">{resolvedDeclinedMessage}</p> : null}

      {choice === "attending" || choice === "declined" ? (
        <form className="poll-form" onSubmit={submit}>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("invitation.rsvp.namePlaceholder")} required />
          <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder={t("invitation.rsvp.phonePlaceholder")} required />
          <button className="btn btn-gold btn-glow" type="submit" disabled={state === "loading"}>
            {state === "loading" ? <Loader2 size={18} className="animate-float" /> : choice === "attending" ? <Check size={18} /> : <X size={18} />}
            {choice === "attending" ? t("invitation.rsvp.submitAttendance") : t("invitation.rsvp.submitDecline")}
          </button>
        </form>
      ) : null}

      {message ? <p className={state === "error" ? "status danger" : "status success"}>{message}</p> : null}
    </section>
  );
}
