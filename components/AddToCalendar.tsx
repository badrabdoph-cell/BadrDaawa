"use client";

import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { getGoogleCalendarUrl, getInvitationCalendarRange, getOutlookCalendarUrl } from "@/lib/calendar";
import type { Invitation } from "@/lib/types";
import { formatArabicDate, getInvitationUrl } from "@/lib/utils";

export function AddToCalendar({ invitation, isPreview = false }: { invitation: Invitation; isPreview?: boolean }) {
  const invitationUrl = getInvitationUrl(invitation.code, invitation.customSlug);
  const googleUrl = getGoogleCalendarUrl(invitation, invitationUrl);
  const outlookUrl = getOutlookCalendarUrl(invitation, invitationUrl);
  const { start } = getInvitationCalendarRange(invitation);
  const eventTime = `${formatArabicDate(invitation.weddingDate)} - ${start.toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <section className="invite-card add-calendar-card" id="add-to-calendar">
      <div className="add-calendar-head">
        <CalendarPlus size={25} />
        <div>
          <span className="invite-kicker">Add To Calendar</span>
          <h2>أضف الموعد للتقويم</h2>
          <p>{eventTime}</p>
        </div>
      </div>
      <div className="add-calendar-actions">
        <a className="btn btn-gold btn-glow" href={googleUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={17} />
          Google Calendar
        </a>
        <a className={isPreview ? "btn btn-soft disabled" : "btn btn-soft"} href={isPreview ? undefined : `/api/invitations/${invitation.code}/calendar/ics`} aria-disabled={isPreview}>
          <Download size={17} />
          Apple Calendar
        </a>
        <a className="btn btn-soft" href={outlookUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={17} />
          Outlook
        </a>
      </div>
      {isPreview ? <p className="status">روابط التقويم تعمل تلقائيًا داخل الدعوة المنشورة.</p> : null}
    </section>
  );
}
