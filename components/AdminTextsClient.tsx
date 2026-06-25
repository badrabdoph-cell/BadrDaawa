"use client";

import { Search, FileText, BookOpen, MessageSquare, Settings, Palette, Globe, Monitor, PenLine, Save, X, Loader, ArrowLeft, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  "site-text-overrides": FileText,
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
  "site-text-overrides": "blue",
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
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editId && editTextareaRef.current) {
      editTextareaRef.current.focus();
    }
  }, [editId]);

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

  function toggleGroup(source: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source);
      else next.add(source);
      return next;
    });
  }

  function expandAll() {
    setExpandedGroups(new Set(filteredGroups.map((g) => g.source)));
  }

  function collapseAll() {
    setExpandedGroups(new Set());
  }

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

  const hasActiveSearch = query.trim().length > 0 || selectedSource !== "all";

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Text Manager</span>
          <h1>إدارة النصوص</h1>
          <p>ابحث وعدّل أي نص في المنصة من مكان واحد.</p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
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
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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

      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "1.5rem",
          padding: "0.75rem 1rem",
          borderRadius: "0.75rem",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={16} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>الإجمالي</span>
            <strong style={{ color: "#fff7e8" }}>{formatArabicNumber(entries.length)}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Search size={16} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>نتائج</span>
            <strong style={{ color: "#f3cf73" }}>{formatArabicNumber(filteredEntries.length)}</strong>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <PenLine size={16} style={{ opacity: 0.5 }} />
            <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>قابلة للتعديل</span>
            <strong style={{ color: "#6fcf97" }}>{formatArabicNumber(filteredEntries.filter((e) => e.editable).length)}</strong>
          </div>
        </div>
        {!hasActiveSearch && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-sm btn-soft" onClick={expandAll}>
              فتح الكل
            </button>
            <button type="button" className="btn btn-sm btn-soft" onClick={collapseAll}>
              إغلاق الكل
            </button>
          </div>
        )}
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
          const isExpanded = expandedGroups.has(group.source);
          const allCollapsed = hasActiveSearch;

          return (
            <article
              key={group.source}
              style={{
                marginBottom: "0.75rem",
                borderRadius: "0.75rem",
                border: "1px solid var(--line)",
                background: "rgba(255,255,255,0.02)",
                overflow: "hidden",
              }}
            >
              <header
                onClick={() => toggleGroup(group.source)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Icon size={20} style={{ opacity: 0.7, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: "0.95rem", color: "#fff7e8" }}>
                    {group.items[0]?.sourceLabel || group.source}
                  </h2>
                  <span style={{ fontSize: "0.8rem", opacity: 0.5 }}>
                    {formatArabicNumber(group.items.length)} نص
                  </span>
                </div>
                <ChevronDown
                  size={16}
                  style={{
                    opacity: 0.5,
                    flexShrink: 0,
                    transition: "transform 0.2s",
                    transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                  }}
                />
              </header>
              {(isExpanded || allCollapsed) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.375rem",
                    padding: "0 1rem 0.75rem",
                  }}
                >
                  {group.items.map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.75rem",
                        padding: "0.625rem 0.75rem",
                        borderRadius: "0.5rem",
                        background: editId === entry.id ? "rgba(243,207,115,0.06)" : "rgba(255,255,255,0.025)",
                        border: "1px solid",
                        borderColor: editId === entry.id ? "rgba(243,207,115,0.2)" : "rgba(245,234,214,0.06)",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.125rem" }}>
                          <strong style={{ fontSize: "0.875rem", color: "#fff7e8" }}>{entry.title}</strong>
                          {entry.editable && (
                            <span
                              style={{
                                fontSize: "0.65rem",
                                padding: "0.1rem 0.35rem",
                                borderRadius: "0.25rem",
                                background: "rgba(111,207,151,0.12)",
                                color: "#6fcf97",
                                fontWeight: 600,
                              }}
                            >
                              قابل للتعديل
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            opacity: 0.35,
                            fontFamily: "monospace",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {entry.id}
                        </span>
                        {editId === entry.id ? (
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", marginTop: "0.5rem" }}>
                            <textarea
                              ref={editTextareaRef}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              rows={4}
                              style={{
                                flex: 1,
                                minWidth: 0,
                                width: "100%",
                                fontSize: "0.9rem",
                                padding: "0.75rem",
                                borderRadius: "0.5rem",
                                border: "1px solid rgba(245,234,214,0.12)",
                                background: "rgba(8,10,14,0.6)",
                                color: "#fff7e8",
                                outline: "none",
                                resize: "vertical",
                                lineHeight: 1.6,
                              }}
                            />
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                              <button
                                type="button"
                                className="btn btn-sm btn-gold"
                                onClick={saveEdit}
                                disabled={saving}
                                style={{ padding: "0.4rem 0.6rem" }}
                              >
                                {saving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-soft"
                                onClick={cancelEdit}
                                style={{ padding: "0.4rem 0.6rem" }}
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p
                            style={{
                              fontSize: "0.85rem",
                              margin: "0",
                              opacity: 0.7,
                              wordBreak: "break-word",
                              lineHeight: 1.5,
                            }}
                          >
                            {entry.text || <span style={{ opacity: 0.3, fontStyle: "italic" }}>فارغ</span>}
                          </p>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}>
                        {entry.editable && editId !== entry.id && (
                          <button
                            type="button"
                            className="btn btn-sm btn-soft"
                            onClick={() => startEdit(entry)}
                            style={{ padding: "0.4rem 0.6rem" }}
                            title="تحرير"
                          >
                            <PenLine size={14} />
                          </button>
                        )}
                        <a
                          href={entry.href}
                          className="btn btn-sm btn-soft"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: "0.4rem 0.6rem", textDecoration: "none" }}
                          title="عرض المصدر"
                        >
                          <ArrowLeft size={14} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })
      )}
    </>
  );
}
