import { existsSync } from "fs";
import { join } from "path";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionCookie } from "@/lib/admin-session";
import { analyticsReportToRows, analyticsSummaryRows, getAdminAnalyticsReport } from "@/lib/admin-analytics";

export const dynamic = "force-dynamic";
import { getRedirectUrl } from "@/lib/utils";

export const runtime = "nodejs";

async function isAdmin(request: NextRequest) {
  return verifyAdminSessionCookie(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function tableToCsv(rows: Array<Record<string, unknown>>) {
  const headers = Object.keys(rows[0] || {});
  return [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n");
}

function toCsv(sections: Array<{ title: string; rows: Array<Record<string, unknown>> }>) {
  return `\uFEFF${sections
    .filter((section) => section.rows.length)
    .map((section) => [section.title, tableToCsv(section.rows)].join("\n"))
    .join("\n\n")}`;
}

function safePdfText(value: string, hasArabicFont: boolean) {
  return hasArabicFont ? value : value.replace(/[^\x20-\x7E]/g, "");
}

async function createPdfBuffer(report: Awaited<ReturnType<typeof getAdminAnalyticsReport>>) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];
  const fontPath = join(process.cwd(), "public", "fonts", "NotoNaskhArabic-Regular.ttf");
  const hasArabicFont = existsSync(fontPath);
  const summaryRows = analyticsSummaryRows(report);
  const performanceRows = analyticsReportToRows(report).slice(0, 20);

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    if (hasArabicFont) doc.font(fontPath);

    doc.fontSize(20).text(safePdfText("BadrDaawa Analytics Report", hasArabicFont), { align: "right" });
    doc.fontSize(12).text(safePdfText(`الفترة: ${report.periodLabel}`, hasArabicFont), { align: "right" });
    doc.moveDown();

    summaryRows.forEach((row) => {
      doc.fontSize(12).text(safePdfText(`${row.metric}: ${row.value}`, hasArabicFont), { align: "right" });
    });

    doc.moveDown();
    doc.fontSize(16).text(safePdfText("مقارنة أداء الدعوات", hasArabicFont), { align: "right" });
    doc.moveDown(0.5);
    performanceRows.forEach((row, index) => {
      const line = `${index + 1}. ${row["الدعوة"]} | ${row["الكود"]} | Views: ${row["الزيارات"]} | RSVP: ${row["إجمالي RSVP"]} | Conversion: ${row["معدل التحويل"]}`;
      doc.fontSize(10).text(safePdfText(line, hasArabicFont), { align: "right" });
      doc.moveDown(0.25);
    });

    doc.end();
  });
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin(request))) {
    return NextResponse.redirect(getRedirectUrl("/admin/login", request.headers, request.nextUrl.origin), 303);
  }

  const format = request.nextUrl.searchParams.get("format") || "xlsx";
  const period = request.nextUrl.searchParams.get("period") || "30d";
  const report = await getAdminAnalyticsReport({ period });
  const summaryRows = analyticsSummaryRows(report);
  const performanceRows = analyticsReportToRows(report);
  const baseName = `badrdaawa-analytics-${report.period}-${new Date().toISOString().slice(0, 10)}`;

  if (format === "csv") {
    const csv = toCsv([
      { title: "Summary", rows: summaryRows },
      { title: "Invitation Performance", rows: performanceRows },
      {
        title: "Sources",
        rows: report.sources.map((source) => ({
          "المصدر": source.label,
          "الزيارات": source.count,
          "النسبة": `${source.percentage}%`,
        })),
      },
      {
        title: "View Growth",
        rows: report.viewGrowth.map((item) => ({
          "التاريخ": item.date,
          "الزيارات": item.count,
        })),
      },
    ]);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.csv"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await createPdfBuffer(report);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
      },
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), "Summary");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(performanceRows), "Invitations");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.sources.map((source) => ({
    "المصدر": source.label,
    "الزيارات": source.count,
    "النسبة": `${source.percentage}%`,
  }))), "Sources");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.viewGrowth.map((item) => ({
    "التاريخ": item.date,
    "الزيارات": item.count,
  }))), "View Growth");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${baseName}.xlsx"`,
    },
  });
}
