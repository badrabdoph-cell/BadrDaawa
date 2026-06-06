"use client";

import { useMemo, useState } from "react";
import { FilePenLine, Search } from "lucide-react";

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
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(texts[0]?.id || "");
  const selected = texts.find((item) => item.id === selectedId) || texts[0];

  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return texts;
    return texts.filter((item) => `${item.label} ${item.value}`.toLowerCase().includes(normalized));
  }, [query, texts]);

  return (
    <section className="admin-text-editor">
      <div className="admin-text-search">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اكتب كلمة للبحث داخل نصوص الدعوة" />
      </div>
      <div className="text-edit-grid">
        <div className="text-match-list">
          {matches.map((item) => (
            <button className={item.id === selectedId ? "selected" : ""} key={item.id} type="button" onClick={() => setSelectedId(item.id)}>
              <strong>{item.label}</strong>
              <span>{item.value}</span>
            </button>
          ))}
        </div>
        <div className="text-edit-panel">
          <FilePenLine size={22} />
          <h3>{selected?.label}</h3>
          <p>اختيار النص ثابت أثناء التعديل، حتى لو كتبت كلمات مختلفة في مربع البحث.</p>
          <textarea defaultValue={selected?.value} rows={5} />
          <button className="btn btn-gold btn-glow" type="button">
            حفظ النص
          </button>
        </div>
      </div>
    </section>
  );
}
