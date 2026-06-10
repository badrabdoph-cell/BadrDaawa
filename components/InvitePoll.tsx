"use client";

import { useState } from "react";
import { CalendarPlus, Check, CheckCircle2, Loader2, PartyPopper, X } from "lucide-react";
import { getGoogleCalendarUrl, getInvitationCalendarRange } from "@/lib/calendar";
import { getInvitationTranslator, getLocaleMeta, resolveLocale } from "@/lib/i18n";
import type { Invitation, Language } from "@/lib/types";
import { getInvitationUrl } from "@/lib/utils";
import { SmartCalendarButton } from "./SmartCalendarButton";

type PollState = "idle" | "attending" | "declined";
type RsvpStatus = "confirmed" | "declined";

export function InvitePoll({
  invitation,
  locale = "ar",
  question,
  declinedMessage,
  confirmedSuccessMessage,
  declinedSuccessMessage,
}: {
  invitation: Invitation;
  locale?: Language;
  question?: string;
  declinedMessage?: string;
  confirmedSuccessMessage?: string;
  declinedSuccessMessage?: string;
}) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const googleCalendarUrl = getGoogleCalendarUrl(invitation, invitationUrl);
  const icsCalendarUrl = `/api/invitations/${invitation.code}/calendar/ics`;
  const { start } = getInvitationCalendarRange(invitation);
  const dateLocale = getLocaleMeta(resolveLocale(locale)).dateLocale;
  const eventTime = `${new Intl.DateTimeFormat(dateLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(invitation.weddingDate))} - ${start.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}`;
  const isPreview = invitation.code.startsWith("preview-");
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
      const response = await fetch(`/api/invitations/${invitation.code}/rsvp`, {
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
      <section id="rsvp" className={confirmed ? "invite-card invite-poll rsvp-success-screen confirmed" : "invite-card invite-poll rsvp-success-screen declined"}>
        <div className="rsvp-success-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="rsvp-success-mark" aria-hidden="true">
          <span>
            {confirmed ? <CheckCircle2 size={42} /> : <Check size={42} />}
          </span>
          {confirmed ? <PartyPopper size={24} /> : null}
        </div>
        <span className="invite-kicker">{t("invitation.rsvp.kicker")}</span>
        <h2>{t("invitation.rsvp.successTitle")}</h2>
        <p className="rsvp-success-thanks">{confirmed ? resolvedConfirmedSuccessMessage : resolvedDeclinedSuccessMessage}</p>

        <div className="rsvp-success-guest">
          <span>{t("invitation.rsvp.guestName")}</span>
          <strong>{success.name}</strong>
          <small>{confirmed ? t("invitation.rsvp.confirmed") : t("invitation.rsvp.declined")}</small>
        </div>

        {confirmed ? (
          <div className="rsvp-calendar-panel">
            <div className="rsvp-calendar-head">
              <CalendarPlus size={22} />
              <div>
                <strong>{t("invitation.rsvp.addToCalendarTitle")}</strong>
                <span>{eventTime}</span>
              </div>
            </div>
            <div className="rsvp-calendar-actions">
              <SmartCalendarButton googleUrl={googleCalendarUrl} icsUrl={icsCalendarUrl} locale={locale} isPreview={isPreview} />
            </div>
            {isPreview ? <p className="status">{t("invitation.calendar.previewNote")}</p> : null}
          </div>
        ) : null}

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
