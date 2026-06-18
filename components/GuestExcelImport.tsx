"use client";

import { Upload, Loader2, Download } from "lucide-react";
import { useState } from "react";

export function GuestExcelImport({ invitationCode, onImport }: { invitationCode: string; onImport?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function handleFile(file?: File | null) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/invitations/${invitationCode}/import/excel`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setMessage(`تم استيراد ${data?.count || "الضيوف"} من ملف Excel.`);
        onImport?.();
      } else {
        setMessage(data?.error || "تعذر استيراد الملف. تأكد من صيغة Excel.");
      }
    } catch {
      setMessage("تعذر رفع الملف. حاول مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="guest-excel-import">
      <label className="builder-logo-upload">
        {busy ? <Loader2 size={17} /> : <Upload size={17} />}
        <span>{busy ? "جاري الاستيراد..." : "استيراد ضيوف من Excel"}</span>
        <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => handleFile(e.target.files?.[0])} disabled={busy} />
      </label>
      <a className="btn btn-soft" href={`/api/invitations/${invitationCode}/export/excel/sample`} target="_blank" rel="noreferrer">
        <Download size={16} /> تحميل نموذج Excel
      </a>
      {message ? <small className={message.includes("تعذر") ? "status danger" : "status success"}>{message}</small> : null}
    </div>
  );
}
