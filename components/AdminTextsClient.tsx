"use client";

import { Search, FileText, BookOpen, MessageSquare, Settings, Palette, Globe, Monitor, PenLine, Check, X, Save, ArrowLeft, Loader } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ContentTextEntry, TextSource } from "@/lib/content-text-registry";
import { formatArabicNumber } from "@/lib/utils";

const sourceIcons: Record<TextSource, typeof FileText> = {
  "site-settings": Settings,
  "home-content": Globe,
  "legal-pages": BookOpen,
  "dynamic-pages": BookOpen,
  "content-presets": FileText,
  "message-templates": MessageSquare,
  "template-preview-info": Palette,
  i18n: Monitor,
  "admin-ui": PenLine,
};

const sourceColors: Record<TextSource, string> = {
  "site-settings": "gold",
  "home-content": "teal",
  "legal-pages": "blue",
  "dynamic-pages": "blue",
  "content-presets": "rose",
  "message-templates": "violet",
  "template-preview-info": "amber",
  i18n: "slate",
  "admin-ui": "green",
};

type GroupData = {
  source: string;
  items: ContentTextEntry[];
};

export function AdminTextsClient({ entries, groups }: { entries: ContentTextEntry[]; groups: GroupData[] }) {
  const [query, setQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string | "all">("all");
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredEntries = entries.filter((entry) => {
    if (selectedSource !== "all" && entry.source !== selectedSource) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return entry.text.toLowerCase().includes(q) || entry.title.toLowerCase().includes(q) || entry.id.toLowerCase().includes(q);
  });

  const filteredGroups = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (selectedSource !== "all" && item.source !== selectedSource) return false;
        if (!query.trim()) return true;
        const q = query.toLowerCase();
        return item.text.toLowerCase().includes(q) || item.title.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
      }),
    }))
    .filter((group) => group.items.length > 0);

  function startEdit(entry: ContentTextEntry) {
    setEditId(entry.id);
    setEditValue(entry.text);
    setSaveMessage(null);
  }

  function cancelEdit() {
    setEditId(null);
    setEditValue("");
    setSaveMessage(null);
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/admin/text-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editId, value: editValue }),
      });
      if (res.ok) {
        setSaveMessage({ type: "success", text: "تم الحفظ بنجاح" });
        setEditId(null);
      } else {
        const data = (await res.json()) as { error?: string };
        setSaveMessage({ type: "error", text: data.error || "فشل الحفظ" });
      }
    } catch {
      setSaveMessage({ type: "error", text: "حدث خطأ في الاتصال" });
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (saveMessage) {
      const timer = setTimeout(() => setSaveMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveMessage]);

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Text Manager</span>
          <h1>إدارة النصوص</h1>
          <p>ابحث وعدّل أي نص في المنصة من مكان واحد. يشمل النصوص المخزنة في قاعدة البيانات وملفات الإعدادات وترجمة الواجهة.</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div className="admin-texts-controls" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <label className="admin-search-field" style={{ flex: "1", minWidth: "200px" }}>
            <Search size={16} />
            <input
              ref={inputRef}
              type="text"
              placeholder="ابحث في جميع النصوص..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="admin-texts-filters" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${selectedSource === "all" ? "btn-gold" : "btn-soft"}`}
              onClick={() => setSelectedSource("all")}
            >
              الكل
            </button>
            {groups.map((group) => (
              <button
                key={group.source}
                type="button"
                className={`btn btn-sm ${selectedSource === group.source ? "btn-gold" : "btn-soft"}`}
                onClick={() => setSelectedSource(group.source)}
              >
                {group.items[0]?.sourceLabel || group.source}
              </button>
            ))}
          </div>
        </div>
      </div>

      {saveMessage && (
        <div className={`notice ${saveMessage.type === "success" ? "success" : "danger"}`} style={{ marginBottom: "1rem" }}>
          {saveMessage.text}
        </div>
      )}

      <div className="admin-texts-summary panel" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <div className="admin-list-stat">
            <FileText size={18} />
            <span>إجمالي النصوص</span>
            <strong>{formatArabicNumber(entries.length)}</strong>
          </div>
          <div className="admin-list-stat good">
            <Search size={18} />
            <span>نتائج البحث</span>
            <strong>{formatArabicNumber(filteredEntries.length)}</strong>
          </div>
          <div className="admin-list-stat">
            <PenLine size={18} />
            <span>قابلة للتعديل</span>
            <strong>{formatArabicNumber(filteredEntries.filter((e) => e.editable).length)}</strong>
          </div>
        </div>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="admin-empty-state compact">
          <strong>لا توجد نصوص مطابقة</strong>
          <p>جرّب كلمة أخرى أو اختر مصدراً مختلفاً.</p>
        </div>
      ) : (
        filteredGroups.map((group) => {
          const source = group.items[0]?.source as TextSource;
          const Icon = sourceIcons[source] || FileText;
          const colorClass = sourceColors[source] || "slate";
          return (
            <article className="panel admin-texts-group" key={group.source} style={{ marginBottom: "1.5rem" }}>
              <header style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", paddingBottom: "0.75rem", borderBottom: "1px solid var(--border)" }}>
                <Icon size={22} />
                <div>
                  <h2 style={{ margin: 0 }}>{group.items[0]?.sourceLabel || group.source}</h2>
                  <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>{formatArabicNumber(group.items.length)} نص</span>
                </div>
              </header>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {group.items.map((entry) => (
                  <div
                    key={entry.id}
                    className={`admin-text-entry ${editId === entry.id ? "editing" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      background: editId === entry.id ? "var(--bg-active)" : "var(--bg-subtle)",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                        <strong style={{ fontSize: "0.9rem" }}>{entry.title}</strong>
                        <span style={{ fontSize: "0.75rem", opacity: 0.5, fontFamily: "monospace" }}>{entry.id}</span>
                      </div>
                      {editId === entry.id ? (
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginTop: "0.5rem" }}>
                          <textarea
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            rows={3}
                            style={{ flex: 1, minWidth: 0, width: "100%", fontSize: "0.9rem", padding: "0.5rem", borderRadius: "0.375rem", border: "1px solid var(--border)", background: "var(--bg)" }}
                          />
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                            <button type="button" className="btn btn-sm btn-gold" onClick={saveEdit} disabled={saving} style={{ padding: "0.4rem 0.6rem" }}>
                              {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                            </button>
                            <button type="button" className="btn btn-sm btn-soft" onClick={cancelEdit} style={{ padding: "0.4rem 0.6rem" }}>
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p style={{ fontSize: "0.85rem", margin: "0.25rem 0 0", opacity: 0.8, wordBreak: "break-word" }}>{entry.text}</p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
                      {entry.editable && editId !== entry.id && (
                        <button type="button" className="btn btn-sm btn-soft" onClick={() => startEdit(entry)} style={{ padding: "0.4rem 0.6rem" }}>
                          <PenLine size={14} />
                        </button>
                      )}
                      <a href={entry.href} className="btn btn-sm btn-soft" target="_blank" rel="noopener noreferrer" style={{ padding: "0.4rem 0.6rem", textDecoration: "none" }}>
                        <ArrowLeft size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })
      )}
    </>
  );
}
