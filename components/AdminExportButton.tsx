"use client";

import { Download } from "lucide-react";
import { downloadCsv } from "@/lib/export-utils";

export function AdminExportButton({
  label,
  filename,
  headers,
  rows,
}: {
  label: string;
  filename: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <button
      className="btn btn-soft"
      type="button"
      onClick={() => downloadCsv(headers, rows, filename)}
    >
      <Download size={16} />
      {label}
    </button>
  );
}
