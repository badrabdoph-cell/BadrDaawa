"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, FilePenLine, Loader2, Search } from "lucide-react";

type EditableText = {
  id: string;
  label: string;
  value: string;
};

const defaultTexts: EditableText[] = [
  {
    id: "invite-line-1",
    label: "سطر الدعوة الأول",
    value: "حضورك هيفرحني، بتمنى إنك تحضر معايا أفضل يوم في عمري.",
  },
  {
    id: "invite-line-2",
    label: "سطر الدعوة الثاني",
    value: "أنا مستنيك تكون جزء من يومي المفضل.",
  },
  {
    id: "photographer-title",
    label: "عنوان المصور",
    value: "badrabdoph",
  },
  {
    id: "photographer-copy",
    label: "وصف المصور",
    value: "لقطات فرحتنا بعدسة خاصة.",
  },
  {
    id: "poll-question",
    label: "سؤال الحضور",
    value: "ناوي تحضر وتشاركنا فرحة عمرنا؟",
  },
];

export function AdminTextEditor({ texts = defaultTexts }: { texts?: EditableText[] }) {
  const [items, setItems] = useState(texts);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(texts[0]?.id || "");
  const selected = items.find((item) => item.id === selectedId) || items[0];
  const [draft, setDraft] = useState(selected?.value || "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return items;
    return items.filter((item) => `${item.label} ${item.value}`.toLowerCase().includes(normalized));
  }, [items, query]);

  function selectText(item: EditableText) {
    setSelectedId(item.id);
    setDraft(item.value);
  }

  async function saveDraft() {
    if (!selected || status === "saving") return;
    setStatus("saving");
    setMessage("");
    const response = await fetch("/api/admin/templates/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, value: draft }),
    });
    const data = (await response.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (!response.ok || !data?.ok) {
      setStatus("error");
      setMessage(data?.error || "تعذر حفظ النص.");
      return;
    }
    setItems((current) => current.map((item) => (item.id === selected.id ? { ...item, value: draft } : item)));
    setStatus("saved");
    setMessage("تم حفظ النص وتحديث القوالب.");
    window.setTimeout(() => setStatus((current) => (current === "saved" ? "idle" : current)), 1800);
  }

  return (
    <section className="admin-text-editor">
      <div className="admin-text-search">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اكتب كلمة للبحث داخل نصوص الدعوة" />
      </div>
      <div className="text-edit-grid">
        <div className="text-match-list">
          {matches.map((item) => (
            <button className={item.id === selectedId ? "selected" : ""} key={item.id} type="button" onClick={() => selectText(item)}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </button>
          ))}
        </div>
        <div className="text-edit-panel">
          <FilePenLine size={22} />
          <h3>{selected?.label}</h3>
          <p>اختيار النص ثابت أثناء التعديل، والبحث يقرأ آخر نسخة محفوظة داخل الواجهة.</p>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={5} />
          <button className="btn btn-gold btn-glow" type="button" onClick={() => void saveDraft()} disabled={status === "saving"}>
            {status === "saving" ? <Loader2 size={17} /> : status === "saved" ? <CheckCircle2 size={17} /> : null}
            حفظ النص
          </button>
          {message ? <small className={status === "error" ? "field-error" : "template-upload-status is-saved"}>{message}</small> : null}
        </div>
      </div>
    </section>
  );
}
