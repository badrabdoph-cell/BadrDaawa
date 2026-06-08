import { existsSync } from "node:fs";
import { join } from "node:path";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db";
import { getGuestsByInvitation, getInvitationByCode } from "@/lib/invitation-data";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ code: string; format: string }>;
};

type ExportRow = {
  name: string;
  phone: string;
  attendees: number;
  status: string;
  note: string;
  createdAt: string;
};

type ExportData = {
  title: string;
  rows: ExportRow[];
};

type DatabaseGuestRow = {
  name: string;
  phone: string;
  attendees: number;
  status: "CONFIRMED" | "DECLINED";
  note: string | null;
  createdAt: Date;
};

async function getExportRows(code: string): Promise<ExportData | null> {
  if (prisma) {
    try {
      const invitation = await prisma.invitation.findFirst({
        where: { code, deletedAt: null },
        include: { guests: { orderBy: { createdAt: "desc" } } },
      });
      if (invitation) {
        return {
          title: `${invitation.groomName} & ${invitation.brideName}`,
          rows: invitation.guests.map((guest: DatabaseGuestRow) => ({
            name: guest.name,
            phone: guest.phone,
            attendees: guest.attendees,
            status: guest.status === "CONFIRMED" ? "حاضر" : "معتذر",
            note: guest.note || "",
            createdAt: guest.createdAt.toISOString(),
          })),
        };
      }
    } catch (error) {
      console.error("Failed to load database export rows, falling back to public invitation data", error);
    }
  }

  const invitation = await getInvitationByCode(code);
  if (!invitation) return null;
  return {
    title: `${invitation.groomName} & ${invitation.brideName}`,
    rows: (await getGuestsByInvitation(code)).map((guest) => ({
      name: guest.name,
      phone: guest.phone,
      attendees: guest.attendees,
      status: guest.status === "confirmed" ? "حاضر" : "معتذر",
      note: guest.note || "",
      createdAt: guest.createdAt,
    })),
  };
}

function safePdfText(value: string, hasArabicFont: boolean) {
  return hasArabicFont ? value : value.replace(/[^\x20-\x7E]/g, "");
}

async function createPdfBuffer(title: string, rows: ExportRow[]) {
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks: Buffer[] = [];
  const fontPath = join(process.cwd(), "public", "fonts", "NotoNaskhArabic-Regular.ttf");
  const hasArabicFont = existsSync(fontPath);

  return await new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (hasArabicFont) {
      doc.font(fontPath);
    }

    doc.fontSize(20).text(safePdfText(`BadrDaawa RSVP - ${title}`, hasArabicFont), { align: "right" });
    doc.moveDown();
    if (!hasArabicFont) {
      doc.fontSize(10).fillColor("#777").text("Tip: add public/fonts/NotoNaskhArabic-Regular.ttf for full Arabic PDF output.");
      doc.moveDown();
      doc.fillColor("#000");
    }

    rows.forEach((row, index) => {
      const line = `${index + 1}. ${row.name} | ${row.phone} | ${row.attendees} | ${row.status} | ${row.note}`;
      doc.fontSize(12).text(safePdfText(line, hasArabicFont), { align: "right" });
      doc.moveDown(0.4);
    });
    doc.end();
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const { code, format } = await context.params;
  const exportData = await getExportRows(code);

  if (!exportData) {
    return new Response("Invitation not found", { status: 404 });
  }

  if (format === "excel") {
    const sheet = XLSX.utils.json_to_sheet(exportData.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Guests");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="badrdaawa-${code}-guests.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await createPdfBuffer(exportData.title, exportData.rows);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="badrdaawa-${code}-guests.pdf"`,
      },
    });
  }

  return new Response("Unsupported export format", { status: 400 });
}
