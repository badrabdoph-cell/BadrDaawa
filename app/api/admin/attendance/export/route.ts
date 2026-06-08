import * as XLSX from "xlsx";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { getAttendanceDashboard, type AttendanceStatusFilter, type AttendanceSortDir, type AttendanceSortKey } from "@/lib/attendance";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function rowsToExport(rows: Awaited<ReturnType<typeof getAttendanceDashboard>>["rows"]) {
  return rows.map((row) => ({
    "الدعوة": row.invitationTitle,
    "كود الدعوة": row.invitationCode,
    "الاسم": row.name,
    "رقم الهاتف": row.phone,
    "حالة الرد": row.status === "confirmed" ? "حضور مؤكد" : "اعتذار",
    "عدد المرافقين": row.attendees,
    "الملاحظات": row.note || "",
    "تاريخ الرد": row.createdAt,
  }));
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const format = request.nextUrl.searchParams.get("format") || "xlsx";
  const dashboard = await getAttendanceDashboard({
    invitationCode: request.nextUrl.searchParams.get("invitation") || "",
    q: request.nextUrl.searchParams.get("q") || "",
    status: (request.nextUrl.searchParams.get("status") || "all") as AttendanceStatusFilter,
    sort: (request.nextUrl.searchParams.get("sort") || "createdAt") as AttendanceSortKey,
    dir: (request.nextUrl.searchParams.get("dir") || "desc") as AttendanceSortDir,
    pageSize: 100000,
  });
  const exportRows = rowsToExport(dashboard.rows);

  if (format === "csv") {
    const headers = Object.keys(exportRows[0] || {
      "الدعوة": "",
      "كود الدعوة": "",
      "الاسم": "",
      "رقم الهاتف": "",
      "حالة الرد": "",
      "عدد المرافقين": "",
      "الملاحظات": "",
      "تاريخ الرد": "",
    });
    const csv = [
      headers.map(csvEscape).join(","),
      ...exportRows.map((row) => headers.map((header) => csvEscape(row[header as keyof typeof row])).join(",")),
    ].join("\n");
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="badrdaawa-attendance.csv"',
      },
    });
  }

  const sheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Attendance");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="badrdaawa-attendance.xlsx"',
    },
  });
}
