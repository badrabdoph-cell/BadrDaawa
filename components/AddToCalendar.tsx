"use client";

import { CalendarPlus } from "lucide-react";
import { getGoogleCalendarUrl, getInvitationCalendarRange } from "@/lib/calendar";
import { getInvitationTranslator, getLocaleMeta, resolveLocale } from "@/lib/i18n";
import type { Invitation } from "@/lib/types";
import { getInvitationUrl } from "@/lib/utils";
import { SmartCalendarButton } from "./SmartCalendarButton";

export function AddToCalendar({ invitation }: { invitation: Invitation }) {
  const locale = resolveLocale(invitation.language);
  const t = getInvitationTranslator(locale);
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const googleUrl = getGoogleCalendarUrl(invitation, invitationUrl);
  const icsUrl = `/api/invitations/${invitation.code}/calendar/ics`;
  const { start } = getInvitationCalendarRange(invitation);
  const dateLocale = getLocaleMeta(locale).dateLocale;
  const eventTime = `${new Intl.DateTimeFormat(dateLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(invitation.weddingDate))} - ${start.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <section className="invite-card add-calendar-card" id="add-to-calendar">
      <div className="add-calendar-head">
        <CalendarPlus size={25} />
        <div>
          <span className="invite-kicker">{t("invitation.calendar.kicker")}</span>
          <h2>{t("invitation.calendar.title")}</h2>
          <p>{eventTime}</p>
        </div>
      </div>
      <div className="add-calendar-actions">
        <SmartCalendarButton googleUrl={googleUrl} icsUrl={icsUrl} locale={locale} />
      </div>
    </section>
  );
}
