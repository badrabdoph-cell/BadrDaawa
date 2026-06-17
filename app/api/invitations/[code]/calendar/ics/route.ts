import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createInvitationIcs, getCalendarFileName } from "@/lib/calendar";
import { getInvitationByCode } from "@/lib/invitation-data";
import { getPublicSiteUrl } from "@/lib/utils";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { code } = await context.params;
  const invitation = await getInvitationByCode(code);
  if (!invitation || !invitation.isActive || invitation.disabledAt) {
    notFound();
  }

  const requestHeaders = await headers();
  const invitationUrl = `${getPublicSiteUrl(requestHeaders).replace(/\/$/, "")}/${invitation.customSlug || invitation.code}`;
  const ics = createInvitationIcs(invitation, invitationUrl);
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${getCalendarFileName(invitation)}"`,
      "Cache-Control": "no-store",
    },
  });
}
