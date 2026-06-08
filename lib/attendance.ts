import { getAdminGuests, getAdminInvitations } from "./admin-data";
import type { GuestRsvp, Invitation } from "./types";

export type AttendanceSortKey = "createdAt" | "name" | "phone" | "status" | "attendees" | "invitation";
export type AttendanceSortDir = "asc" | "desc";
export type AttendanceStatusFilter = "all" | "confirmed" | "declined";

export type AttendanceQuery = {
  invitationCode?: string;
  q?: string;
  status?: AttendanceStatusFilter;
  sort?: AttendanceSortKey;
  dir?: AttendanceSortDir;
  page?: number;
  pageSize?: number;
};

export type AttendanceGuestRow = GuestRsvp & {
  invitationTitle: string;
  weddingDate: string;
  venue: string;
};

export type AttendanceInvitationSummary = {
  code: string;
  title: string;
  weddingDate: string;
  venue: string;
  totalResponses: number;
  confirmedResponses: number;
  declinedResponses: number;
  expectedAttendees: number;
};

export type AttendanceDashboard = {
  invitations: Invitation[];
  summaries: AttendanceInvitationSummary[];
  rows: AttendanceGuestRow[];
  pageRows: AttendanceGuestRow[];
  totals: {
    invitations: number;
    responses: number;
    confirmed: number;
    declined: number;
    expectedAttendees: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalRows: number;
  };
  query: Required<Pick<AttendanceQuery, "status" | "sort" | "dir" | "page" | "pageSize">> & {
    invitationCode: string;
    q: string;
  };
};

const sortKeys: AttendanceSortKey[] = ["createdAt", "name", "phone", "status", "attendees", "invitation"];

function cleanQuery(input: AttendanceQuery) {
  return {
    invitationCode: (input.invitationCode || "").trim(),
    q: (input.q || "").trim().toLowerCase(),
    status: input.status === "confirmed" || input.status === "declined" ? input.status : "all",
    sort: sortKeys.includes(input.sort || "createdAt") ? input.sort || "createdAt" : "createdAt",
    dir: input.dir === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(input.page || 1) || 1),
    pageSize: Math.min(100, Math.max(5, Number(input.pageSize || 20) || 20)),
  } as const;
}

function invitationTitle(invitation?: Invitation) {
  return invitation ? `${invitation.groomName} و ${invitation.brideName}` : "دعوة غير معروفة";
}

function compareText(first: string, second: string) {
  return first.localeCompare(second, "ar");
}

function sortRows(rows: AttendanceGuestRow[], sort: AttendanceSortKey, dir: AttendanceSortDir) {
  const direction = dir === "asc" ? 1 : -1;
  return [...rows].sort((first, second) => {
    if (sort === "attendees") return (first.attendees - second.attendees) * direction;
    if (sort === "createdAt") return (Date.parse(first.createdAt) - Date.parse(second.createdAt)) * direction;
    if (sort === "invitation") return compareText(first.invitationTitle, second.invitationTitle) * direction;
    return compareText(String(first[sort] || ""), String(second[sort] || "")) * direction;
  });
}

function buildSummaries(invitations: Invitation[], guests: GuestRsvp[]): AttendanceInvitationSummary[] {
  return invitations
    .map((invitation) => {
      const invitationGuests = guests.filter((guest) => guest.invitationCode === invitation.code);
      const confirmedGuests = invitationGuests.filter((guest) => guest.status === "confirmed");
      return {
        code: invitation.code,
        title: invitationTitle(invitation),
        weddingDate: invitation.weddingDate,
        venue: invitation.venue,
        totalResponses: invitationGuests.length,
        confirmedResponses: confirmedGuests.length,
        declinedResponses: invitationGuests.filter((guest) => guest.status === "declined").length,
        expectedAttendees: confirmedGuests.reduce((sum, guest) => sum + guest.attendees, 0),
      };
    })
    .sort((first, second) => second.totalResponses - first.totalResponses || compareText(first.title, second.title));
}

export async function getAttendanceDashboard(input: AttendanceQuery = {}): Promise<AttendanceDashboard> {
  const [invitations, guests] = await Promise.all([getAdminInvitations(), getAdminGuests()]);
  const invitationByCode = new Map(invitations.map((invitation) => [invitation.code, invitation]));
  const query = cleanQuery(input);
  const summaries = buildSummaries(invitations, guests);

  const decoratedRows = guests.map((guest) => {
    const invitation = invitationByCode.get(guest.invitationCode);
    return {
      ...guest,
      invitationTitle: invitationTitle(invitation),
      weddingDate: invitation?.weddingDate || "",
      venue: invitation?.venue || "",
    };
  });

  const filteredRows = decoratedRows.filter((row) => {
    if (query.invitationCode && row.invitationCode !== query.invitationCode) return false;
    if (query.status !== "all" && row.status !== query.status) return false;
    if (query.q) {
      const haystack = [row.name, row.phone, row.note || "", row.invitationTitle, row.invitationCode, row.venue].join(" ").toLowerCase();
      if (!haystack.includes(query.q)) return false;
    }
    return true;
  });

  const rows = sortRows(filteredRows, query.sort, query.dir);
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const pageRows = rows.slice((page - 1) * query.pageSize, page * query.pageSize);
  const confirmedRows = rows.filter((row) => row.status === "confirmed");

  return {
    invitations,
    summaries,
    rows,
    pageRows,
    totals: {
      invitations: invitations.length,
      responses: rows.length,
      confirmed: confirmedRows.length,
      declined: rows.filter((row) => row.status === "declined").length,
      expectedAttendees: confirmedRows.reduce((sum, row) => sum + row.attendees, 0),
    },
    pagination: {
      page,
      pageSize: query.pageSize,
      totalPages,
      totalRows,
    },
    query: {
      ...query,
      page,
    },
  };
}
