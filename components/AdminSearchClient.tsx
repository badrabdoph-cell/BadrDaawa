"use client";

import { Search, Archive, FileText, Shapes, UserCheck, UsersRound, Clock, X, BookOpen, Globe, PenLine, Save, Loader } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatArabicNumber } from "@/lib/utils";
import type { AdminSearchKind, AdminSearchResponse } from "@/lib/admin-search";

const groupIcons: Record<string, typeof Archive> = {
  invitations: Archive,
  customers: UsersRound,
  orders: FileText,
  guests: UserCheck,
  templates: Shapes,
  content: BookOpen,
  "admin-ui": PenLine,
};

const RECENT_SEARCHES_KEY = "badr-admin-recent-searches";
const MAX_RECENT = 8;
const SUGGESTIONS: Record<string, string[]> = {
  "": ["جديد", "نشط", "مؤرشفة", "منتهية", "متوقفة", "معطلة", "تعديل", "حفظ", "بحث"],
};

const ALL_KINDS: AdminSearchKind[] = ["invitations", "customers", "orders", "guests", "templates", "content", "admin-ui"];

const DEFAULT_GROUPS: AdminSearchResponse = {
  query: "",
  total: 0,
  groups: ALL_KINDS.map((kind) => ({
    kind,
    label: groupLabel(kind),
    total: 0,
    results: [],
  })),
};

function groupLabel(kind: AdminSearchKind): string {
  const labels: Record<AdminSearchKind, string> = {
    invitations: "الدعوات",
    customers: "العملاء",
    orders: "الطلبات",
    guests: "الحضور",
    templates: "القوالب",
    content: "المحتوى",
    "admin-ui": "نصوص الإدارة",
  };
  return labels[kind];
}

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? (JSON.parse(raw) as string[]).filter((s) => s.trim()) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(query: string) {
  if (!query.trim()) return;
  try {
    const recent = getRecentSearches().filter((s) => s !== query);
    recent.unshift(query);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // ignore
  }
}

function clearRecentSearches() {
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore
  }
}

export function AdminSearchClient({ initialQuery, initialResults }: { initialQuery: string; initialResults: AdminSearchResponse }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState(initialResults);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [editState, setEditState] = useState<{ id: string; value: string; saving: boolean; error?: string } | null>(null);

  const suggestions = SUGGESTIONS[query] || [];

  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults(DEFAULT_GROUPS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = (await res.json()) as AdminSearchResponse;
        setResults(data);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(value: string) {
    setQuery(value);
    setSelectedSuggestionIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(value);
    }, 300);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      addRecentSearch(query.trim());
      setRecentSearches(getRecentSearches());
    }
    setShowSuggestions(false);
  }

  function handleSuggestionClick(suggestion: string) {
    setQuery(suggestion);
    setShowSuggestions(false);
    fetchResults(suggestion);
    inputRef.current?.focus();
  }

  function handleRecentClick(recent: string) {
    setQuery(recent);
    setShowSuggestions(false);
    fetchResults(recent);
  }

  function handleClearRecent() {
    clearRecentSearches();
    setRecentSearches([]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedSuggestionIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedSuggestionIndex]);
    }
  }

  async function handleInlineEdit(id: string, newValue: string) {
    setEditState({ id, value: newValue, saving: true });
    try {
      const res = await fetch("/api/admin/text-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, value: newValue }),
      });
      if (res.ok) {
        setEditState(null);
        fetchResults(query);
      } else {
        const data = (await res.json()) as { error?: string };
        setEditState({ id, value: newValue, saving: false, error: data.error || "فشل الحفظ" });
      }
    } catch {
      setEditState({ id, value: newValue, saving: false, error: "خطأ في الاتصال" });
    }
  }

  useEffect(() => {
    if (editState?.error) {
      const timer = setTimeout(() => setEditState((prev) => prev ? { ...prev, error: undefined } : null), 3000);
      return () => clearTimeout(timer);
    }
  }, [editState]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const queryForDisplay = searchParams.get("q") || query;

  return (
    <>
      <div className="dashboard-head">
        <div>
          <span className="eyebrow">Global Search</span>
          <h1>البحث العام</h1>
          <p>ابحث في الدعوات، العملاء، الطلبات، الحضور، القوالب، المحتوى، ونصوص الإدارة من مكان واحد.</p>
        </div>
      </div>

      <form className="global-search-hero" onSubmit={handleSubmit}>
        <label className="admin-search-field">
          <Search size={18} />
          <input
            ref={inputRef}
            name="q"
            placeholder="ابحث في أي نص في المنصة..."
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          {loading ? <span className="admin-search-spinner" /> : null}
          <kbd className="admin-search-shortcut">Ctrl+K</kbd>
        </label>
      </form>

      {showSuggestions && !query.trim() && recentSearches.length > 0 && (
        <div className="admin-search-suggestions">
          <div className="admin-search-suggestions-head">
            <span><Clock size={14} /> عمليات بحث حديثة</span>
            <button type="button" onClick={handleClearRecent}><X size={14} /> مسح</button>
          </div>
          <div className="admin-search-suggestions-list">
            {recentSearches.map((recent) => (
              <button
                key={recent}
                type="button"
                className="admin-search-suggestion-item"
                onMouseDown={() => handleRecentClick(recent)}
              >
                <Clock size={14} />
                {recent}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && !query.trim() && recentSearches.length === 0 && (
        <div className="admin-search-suggestions">
          <div className="admin-search-suggestions-head">
            <span>اقتراحات</span>
          </div>
          <div className="admin-search-suggestions-list">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                className={`admin-search-suggestion-item ${selectedSuggestionIndex === index ? "selected" : ""}`}
                onMouseDown={() => handleSuggestionClick(suggestion)}
              >
                <Search size={14} />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSuggestions && query.trim() && suggestions.length > 0 && (
        <div className="admin-search-suggestions">
          <div className="admin-search-suggestions-head">
            <span>هل تبحث عن</span>
          </div>
          <div className="admin-search-suggestions-list">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                className={`admin-search-suggestion-item ${selectedSuggestionIndex === index ? "selected" : ""}`}
                onMouseDown={() => handleSuggestionClick(suggestion)}
              >
                <Search size={14} />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {editState?.error && (
        <div className="notice danger" style={{ marginBottom: "1rem" }}>
          {editState.error}
        </div>
      )}

      {queryForDisplay ? (
        <section className="admin-list-overview global-search-overview" aria-label="ملخص نتائج البحث">
          <div className="admin-list-stat good">
            <Search size={19} />
            <span>كل النتائج</span>
            <strong>{formatArabicNumber(results.total)}</strong>
          </div>
          {results.groups.map((group) => {
            const Icon = groupIcons[group.kind] || Search;
            return (
              <div className="admin-list-stat" key={group.kind}>
                <Icon size={19} />
                <span>{group.label}</span>
                <strong>{formatArabicNumber(group.total)}</strong>
              </div>
            );
          })}
        </section>
      ) : null}

      {!queryForDisplay ? (
        <div className="admin-empty-state compact">
          <strong>ابدأ البحث من الأعلى</strong>
          <p>يمكنك البحث في الدعوات، العملاء، الطلبات، الحضور، القوالب، المحتوى، ونصوص الإدارة.</p>
          <p className="admin-search-hint">اضغط <kbd>Ctrl+K</kbd> للبحث السريع من أي مكان في لوحة الإدارة.</p>
        </div>
      ) : results.total ? (
        <section className="global-search-groups" aria-label="نتائج البحث">
          {results.groups.map((group) => {
            const Icon = groupIcons[group.kind] || Search;
            const isTextGroup = group.kind === "content" || group.kind === "admin-ui";
            return (
              <article className="panel global-search-group" key={group.kind}>
                <header>
                  <div>
                    <Icon size={22} />
                    <div>
                      <h2>{group.label}</h2>
                      <span>{formatArabicNumber(group.total)} نتيجة</span>
                    </div>
                  </div>
                  {group.total > group.results.length ? <small>عرض أول {formatArabicNumber(group.results.length)}</small> : null}
                </header>
                {group.results.length ? (
                  <div className="global-search-list">
                    {group.results.map((result) => {
                      const isEditing = editState?.id === `${group.kind}-${result.id}`;
                      return (
                        <div key={`${group.kind}-${result.id}`}>
                          {isTextGroup && result.editable ? (
                            <div className="global-search-result" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                  <strong>{result.title}</strong>
                                  <span style={{ fontSize: "0.8rem", opacity: 0.6, margin: "0 0.5rem" }}>{result.subtitle}</span>
                                </div>
                                <div style={{ display: "flex", gap: "0.375rem" }}>
                                  <a href={result.href} className="btn btn-sm btn-soft" target="_blank" rel="noopener noreferrer" style={{ padding: "0.3rem 0.5rem", fontSize: "0.75rem", textDecoration: "none" }}>
                                    <PenLine size={12} />
                                  </a>
                                </div>
                              </div>
                              {isEditing ? (
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <input
                                    type="text"
                                    value={editState!.value}
                                    onChange={(e) => setEditState({ ...editState!, value: e.target.value })}
                                    style={{ flex: 1, fontSize: "0.85rem", padding: "0.4rem 0.5rem", borderRadius: "0.375rem", border: "1px solid var(--border)", background: "var(--bg)" }}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleInlineEdit(result.id, editState!.value);
                                      if (e.key === "Escape") setEditState(null);
                                    }}
                                  />
                                  <button type="button" className="btn btn-sm btn-gold" onClick={() => handleInlineEdit(result.id, editState!.value)} disabled={editState?.saving} style={{ padding: "0.3rem 0.5rem" }}>
                                    {editState?.saving ? <Loader size={12} className="animate-spin" /> : <Save size={12} />}
                                  </button>
                                  <button type="button" className="btn btn-sm btn-soft" onClick={() => setEditState(null)} style={{ padding: "0.3rem 0.5rem" }}>
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                                  <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>{result.subtitle}</span>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-soft"
                                    onClick={() => setEditState({ id: result.id, value: result.subtitle, saving: false })}
                                    style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem", flexShrink: 0 }}
                                  >
                                    <PenLine size={11} />
                                    تعديل
                                  </button>
                                </div>
                              )}
                              {result.meta ? <small style={{ opacity: 0.5, fontSize: "0.75rem" }}>{result.meta}</small> : null}
                            </div>
                          ) : (
                            <Link className="global-search-result" href={result.href} key={`${group.kind}-${result.id}`}>
                              <strong>{result.title}</strong>
                              <span>{result.subtitle}</span>
                              {result.meta ? <small>{result.meta}</small> : null}
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="admin-empty-state compact">
                    <strong>لا توجد نتائج في هذا القسم</strong>
                    <p>جرّب كلمة أخرى أو ابحث برقم الهاتف أو الكود.</p>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <div className="admin-empty-state compact">
          <strong>لا توجد نتائج مطابقة</strong>
          <p>جرّب البحث بكود الدعوة، رقم الهاتف، اسم العميل أو اسم القالب.</p>
        </div>
      )}
    </>
  );
}
