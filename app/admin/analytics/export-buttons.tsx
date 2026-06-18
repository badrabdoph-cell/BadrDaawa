"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Share2, Check } from "lucide-react";
import Link from "next/link";
import type { AnalyticsPeriod, AdminAnalyticsReport } from "@/lib/admin-analytics";

function exportHref(period: AnalyticsPeriod, format: "pdf" | "xlsx" | "csv") {
  return `/api/admin/analytics/export?period=${period}&format=${format}`;
}

function csvEscape(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function ExportButtons({ report }: { report: AdminAnalyticsReport }) {
  const [copied, setCopied] = useState(false);

  function downloadCSV() {
    const rows: string[][] = [];
    rows.push(["المؤشر", "القيمة"]);
    rows.push(["الفترة", report.periodLabel]);
    rows.push(["إجمالي الزيارات", String(report.totals.visits)]);
    rows.push(["حضور مؤكد", String(report.totals.confirmed)]);
    rows.push(["اعتذارات", String(report.totals.declined)]);
    rows.push(["الأشخاص المتوقعون", String(report.totals.expectedAttendees)]);
    rows.push(["معدل التحويل", `${report.totals.conversionRate}%`]);
    if (report.topSource) {
      rows.push(["أكثر مصدر زيارات", `${report.topSource.label} (${report.topSource.percentage}%)`]);
    }
    rows.push([]);
    rows.push(["المشاهدات اليومية"]);
    rows.push(["التاريخ", "العدد"]);
    for (const item of report.viewGrowth) {
      rows.push([item.date, String(item.count)]);
    }
    rows.push([]);
    rows.push(["مصادر الزيارات"]);
    rows.push(["المصدر", "العدد", "النسبة"]);
    for (const src of report.sources) {
      rows.push([src.label, String(src.count), `${src.percentage}%`]);
    }
    rows.push([]);
    rows.push(["أكثر الدعوات مشاهدة"]);
    rows.push(["العنوان", "الكود", "الزيارات", "RSVP"]);
    for (const inv of report.topInvitations) {
      rows.push([inv.title, inv.code, String(inv.views), String(inv.rsvps)]);
    }
    rows.push([]);
    rows.push(["مقارنة الدعوات"]);
    rows.push(["العنوان", "الكود", "الزيارات", "RSVP", "مؤكد", "اعتذار", "متوقع", "معدل التحويل"]);
    for (const inv of report.invitationComparison) {
      rows.push([inv.title, inv.code, String(inv.views), String(inv.rsvps), String(inv.confirmed), String(inv.declined), String(inv.expectedAttendees), `${inv.conversionRate}%`]);
    }

    const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${report.period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="button-row">
      <button className="btn btn-soft" type="button" onClick={downloadCSV}>
        <Download size={17} /> CSV
      </button>
      <Link className="btn btn-soft" href={exportHref(report.period, "xlsx")}>
        <FileSpreadsheet size={17} /> Excel
      </Link>
      <Link className="btn btn-gold" href={exportHref(report.period, "pdf")}>
        <FileText size={17} /> PDF
      </Link>
      <button className="btn btn-soft" type="button" onClick={copyLink}>
        {copied ? <Check size={17} /> : <Share2 size={17} />}
        {copied ? "تم النسخ" : "نسخ الرابط"}
      </button>
    </div>
  );
}
