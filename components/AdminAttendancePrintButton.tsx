"use client";

import { Printer } from "lucide-react";

export function AdminAttendancePrintButton() {
  return (
    <button className="btn btn-soft attendance-print-button" type="button" onClick={() => window.print()}>
      <Printer size={17} />
      طباعة القائمة
    </button>
  );
}
