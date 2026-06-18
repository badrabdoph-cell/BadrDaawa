"use client";

import { Search, Archive, FileText, Shapes, UserCheck, UsersRound, Clock, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatArabicNumber } from "@/lib/utils";
import type { AdminSearchKind, AdminSearchResponse } from "@/lib/admin-search";

const groupIcons: Record<AdminSearchKind, typeof Archive> = {
  invitations: Archive,
  customers: UsersRound,
  orders: FileText,
  guests: UserCheck,
  templates: Shapes,
};

const RECENT_SEARCHES_KEY = "badr-admin-recent-searches";
const MAX_RECENT = 8;
const SUGGESTIONS: Record<string, string[]> = {
  "": ["جديد", "نشط", "مؤرشفة", "منتهية", "متوقفة", "معطلة"],
};

const DEFAULT_GROUPS: AdminSearchResponse = {
  query: "",
  total: 0,
  groups: (["invitations", "customers", "orders", "guests", "templates"] as AdminSearchKind[]).map((kind) => ({
    kind,
    label: kind === "invitations" ? "الدعوات" : kind === "customers" ? "العملاء" : kind === "orders" ? "الطلبات" : kind === "guests" ? "الحضور" : "القوالب",
    total: 0,
    results: [],
  })),
};

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
          <p>ابحث في الدعوات، العملاء، الطلبات، الحضور، والقوالب من مكان واحد.</p>
        </div>
      </div>

      <form className="global-search-hero" onSubmit={handleSubmit}>
        <label className="admin-search-field">
          <Search size={18} />
          <input
            ref={inputRef}
            name="q"
            placeholder="اكتب اسم، هاتف، كود دعوة، رقم طلب أو اسم قالب"
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

      {queryForDisplay ? (
        <section className="admin-list-overview global-search-overview" aria-label="ملخص نتائج البحث">
          <div className="admin-list-stat good">
            <Search size={19} />
            <span>كل النتائج</span>
            <strong>{formatArabicNumber(results.total)}</strong>
          </div>
          {results.groups.map((group) => {
            const Icon = groupIcons[group.kind];
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
          <p>يمكنك البحث باسم العريس أو العروس، رقم الهاتف، كود الدعوة، رقم الطلب، اسم الضيف أو اسم القالب.</p>
          <p className="admin-search-hint">اضغط <kbd>Ctrl+K</kbd> للبحث السريع من أي مكان في لوحة الإدارة.</p>
        </div>
      ) : results.total ? (
        <section className="global-search-groups" aria-label="نتائج البحث">
          {results.groups.map((group) => {
            const Icon = groupIcons[group.kind];
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
                    {group.results.map((result) => (
                      <Link className="global-search-result" href={result.href} key={`${group.kind}-${result.id}`}>
                        <strong>{result.title}</strong>
                        <span>{result.subtitle}</span>
                        {result.meta ? <small>{result.meta}</small> : null}
                      </Link>
                    ))}
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
