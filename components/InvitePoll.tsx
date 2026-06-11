"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, CheckCircle2, Loader2, PartyPopper, X } from "lucide-react";
import { getGoogleCalendarUrl, getInvitationCalendarRange } from "@/lib/calendar";
import { getInvitationTranslator, getLocaleMeta, resolveLocale } from "@/lib/i18n";
import type { Invitation, Language } from "@/lib/types";
import { getInvitationUrl } from "@/lib/utils";
import { SmartCalendarButton } from "./SmartCalendarButton";

type PollState = "idle" | "attending" | "declined";
type RsvpStatus = "confirmed" | "declined";
type SuccessState = { name: string; status: RsvpStatus; alreadyRegistered?: boolean };

const phonePattern = /^01\d{9}$/;

function getStoredRsvpKey(code: string) {
  return `badrdaawa-rsvp-${code}`;
}

function sanitizePhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

function getPhoneError(value: string) {
  if (!value) return "اكتب رقم الهاتف.";
  if (!value.startsWith("01")) return "رقم الهاتف لازم يبدأ بـ 01.";
  if (value.length !== 11) return "رقم الهاتف لازم يكون 11 رقم بالضبط.";
  if (!phonePattern.test(value)) return "اكتب رقم هاتف مصري صحيح مثل 01012345678.";
  return "";
}

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
  const apiCode = encodeURIComponent(invitation.code);
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const googleCalendarUrl = getGoogleCalendarUrl(invitation, invitationUrl);
  const icsCalendarUrl = `/api/invitations/${apiCode}/calendar/ics`;
  const { start } = getInvitationCalendarRange(invitation);
  const dateLocale = getLocaleMeta(resolveLocale(locale)).dateLocale;
  const eventTime = `${new Intl.DateTimeFormat(dateLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(invitation.weddingDate))} - ${start.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}`;
  const isPreview = invitation.code.startsWith("preview-");
  const resolvedQuestion = question || t("invitation.rsvp.defaultQuestion");
  const resolvedDeclinedMessage = declinedMessage || t("invitation.rsvp.declinedMessage");
  const [choice, setChoice] = useState<PollState>("idle");
  const [phase, setPhase] = useState<"choice" | "animating" | "form">("choice");
  const [emoji, setEmoji] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const timers = useRef<number[]>([]);
  const storageKey = useMemo(() => getStoredRsvpKey(invitation.code), [invitation.code]);

  useEffect(() => {
    if (isPreview) return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<SuccessState>;
      if (saved?.status === "confirmed" || saved?.status === "declined") {
        setSuccess({ name: saved.name || "ضيفنا العزيز", status: saved.status, alreadyRegistered: true });
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [isPreview, storageKey]);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  function persistSuccess(nextSuccess: SuccessState) {
    if (isPreview) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ name: nextSuccess.name, status: nextSuccess.status }));
    } catch {
      // localStorage can be unavailable in private browsing; server-side duplicate protection still applies.
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (choice !== "attending" && choice !== "declined") return;
    const status: RsvpStatus = choice === "attending" ? "confirmed" : "declined";
    const guestName = name.trim();
    const nextPhoneError = getPhoneError(phone);
    if (!guestName) {
      setState("error");
      setMessage("اكتب اسمك عشان نقدر نسجل ردك.");
      return;
    }
    if (nextPhoneError) {
      setPhoneError(nextPhoneError);
      setState("error");
      setMessage("");
      return;
    }
    setState("loading");
    setMessage("");
    setSuccess(null);

    try {
      const response = await fetch(`/api/invitations/${apiCode}/rsvp`, {
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

      const data = (await response.json().catch(() => null)) as { error?: string; duplicate?: boolean; guest?: { name?: string; status?: RsvpStatus } } | null;

      if (!response.ok) {
        setState("error");
        setMessage(data?.error || t("common.error"));
        return;
      }

      const nextSuccess: SuccessState = {
        name: data?.guest?.name || guestName,
        status: data?.guest?.status || status,
        alreadyRegistered: Boolean(data?.duplicate),
      };
      setState("success");
      setSuccess(nextSuccess);
      persistSuccess(nextSuccess);
      setName("");
      setPhone("");
      setPhoneError("");
    } catch {
      setState("error");
      setMessage(t("common.connectionError"));
    }
  }

  function selectChoice(nextChoice: PollState) {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setChoice(nextChoice);
    setPhase("animating");
    setState("idle");
    setMessage("");
    setSuccess(null);
    setPhoneError("");

    const sequence = nextChoice === "attending" ? ["😊", "🥳"] : ["😌", "🌹"];
    setEmoji(sequence[0]);
    timers.current = [
      window.setTimeout(() => setEmoji(sequence[1]), 420),
      window.setTimeout(() => setPhase("form"), 980),
    ];
  }

  function updatePhone(value: string) {
    const nextPhone = sanitizePhone(value);
    setPhone(nextPhone);
    if (!nextPhone || phonePattern.test(nextPhone)) setPhoneError("");
    else if (nextPhone.length >= 2) setPhoneError(getPhoneError(nextPhone));
  }

  if (success) {
    const confirmed = success.status === "confirmed";
    const title = success.alreadyRegistered ? "تم تسجيل حضورك مسبقاً" : confirmed ? "تم تسجيل حضورك بنجاح" : "تم تسجيل اعتذارك";
    const thanks = success.alreadyRegistered
      ? "وننتظر تشريفك لنا ❤️"
      : confirmed
        ? "ننتظر تشريفك لنا ومشاركتنا فرحتنا ❤️"
        : "شكراً لك ونتمنى رؤيتك في مناسبة سعيدة قريباً ❤️";
    return (
      <section id="rsvp" className={confirmed ? "invite-card invite-poll rsvp-success-screen confirmed" : "invite-card invite-poll rsvp-success-screen declined"}>
        <div className="rsvp-success-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="rsvp-success-mark" aria-hidden="true">
          <span>{confirmed ? "🥳" : "🌹"}</span>
          {confirmed ? <PartyPopper size={24} /> : null}
        </div>
        <span className="invite-kicker">{t("invitation.rsvp.kicker")}</span>
        <h2>{title}</h2>
        <p className="rsvp-success-thanks">{thanks}</p>

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

        <div className="rsvp-registered-seal" aria-hidden="true"><CheckCircle2 size={18} /> {success.alreadyRegistered ? "مسجل بالفعل" : "تم الحفظ"}</div>
      </section>
    );
  }

  return (
    <section id="rsvp" className={`invite-card invite-poll rsvp-interactive ${choice !== "idle" ? `is-${choice}` : ""}`}>
      <span className="invite-kicker">{t("invitation.rsvp.kicker")}</span>
      <h2>{"هل ستشرفنا بحضور حفل زفافنا؟ ❤️"}</h2>
      {resolvedQuestion && resolvedQuestion !== "هل ستشرفنا بحضور حفل زفافنا؟ ❤️" ? <p className="rsvp-soft-question">{resolvedQuestion}</p> : null}
      {phase === "animating" && emoji ? (
        <div className="rsvp-emoji-stage is-animating is-flying" aria-hidden="true">
          <span>{emoji}</span>
        </div>
      ) : null}
      <div className="poll-actions">
        <button className={`poll-choice rsvp-choice-confirm ${choice === "attending" ? "selected" : ""}`} type="button" onClick={() => selectChoice("attending")}>
          سأحضر ❤️
        </button>
        <button className={`poll-choice rsvp-choice-decline ${choice === "declined" ? "selected sad" : ""}`} type="button" onClick={() => selectChoice("declined")}>
          أعتذر 🌹
        </button>
      </div>

      {phase === "animating" ? <p className="rsvp-reaction-copy">{choice === "attending" ? "فرحتنا بتكمل بوجودك..." : "نقدّر ردك وذوقك..."}</p> : null}
      {choice === "declined" && phase === "form" ? <p className="sad-message">{resolvedDeclinedMessage}</p> : null}

      {(choice === "attending" || choice === "declined") && phase === "form" ? (
        <form className="poll-form" onSubmit={submit}>
          <p className="rsvp-form-intro">{choice === "attending" ? "اكتب بياناتك عشان يوصلك تذكير بالمعاد ومفاجأة من العروسين على فونك ❤️" : "اكتب بياناتك عشان نوصل ردك للعروسين بكل ذوق ومحبة 🌹"}</p>
          <label>
            <span>الاسم</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("invitation.rsvp.namePlaceholder")} required />
          </label>
          <label>
            <span>رقم الهاتف</span>
            <input value={phone} onChange={(event) => updatePhone(event.target.value)} inputMode="numeric" autoComplete="tel" placeholder="01012345678" required aria-invalid={Boolean(phoneError)} aria-describedby={phoneError ? "rsvp-phone-error" : undefined} />
            {phoneError ? <small id="rsvp-phone-error" className="rsvp-field-error">{phoneError}</small> : null}
          </label>
          <button className="btn btn-gold btn-glow" type="submit" disabled={state === "loading"}>
            {state === "loading" ? <Loader2 size={18} className="animate-float" /> : choice === "attending" ? <CheckCircle2 size={18} /> : <X size={18} />}
            {state === "loading" ? "جاري تسجيل ردك..." : choice === "attending" ? "تأكيد الحضور" : "تسجيل الاعتذار"}
          </button>
        </form>
      ) : null}

      {message ? <p className={state === "error" ? "status danger" : "status success"}>{message}</p> : null}
    </section>
  );
}
