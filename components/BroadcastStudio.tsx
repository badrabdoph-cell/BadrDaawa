"use client";

import { Check, ExternalLink, Laptop, Pencil, RefreshCw, Save, Search, Smartphone, X } from "lucide-react";
import { useCallback, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ContentTextEntry } from "@/lib/content-text-registry";
import { BroadcastSectionOrder } from "@/components/BroadcastSectionOrder";

type EditableEntry = {
  id: string;
  title: string;
  text: string;
  sourceLabel: string;
  groupLabel: string;
  editable: boolean;
  href: string;
};

type BroadcastSaveMessage = {
  key: string;
  value: string;
  label?: string;
  sourceLabel?: string;
};

const searchStorageKey = "badr-broadcast-search";
const selectedStorageKey = "badr-broadcast-selected";

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ");
}

function entryMatchesQuery(entry: EditableEntry, query: string) {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const haystack = normalizeSearch(`${entry.title} ${entry.text} ${entry.id} ${entry.sourceLabel} ${entry.groupLabel}`);
  return words.every((word) => haystack.includes(word));
}

function stripBroadcastParams(url: URL) {
  url.searchParams.delete("broadcast");
  url.searchParams.delete("v");
  const path = `${url.pathname}${url.search}${url.hash}`;
  return path || "/";
}

function mapForIframe(entry: EditableEntry) {
  return { id: entry.id, title: entry.title, text: entry.text, sourceLabel: entry.sourceLabel, editable: true, href: entry.href || "" };
}

export function BroadcastStudio({
  textEntries: initialEntries,
  sectionDefs,
  initialSectionOrder,
}: {
  textEntries: EditableEntry[];
  sectionDefs?: { id: string; label: string }[];
  initialSectionOrder?: string[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [inlineEntries, setInlineEntries] = useState<EditableEntry[]>([]);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("mobile");
  const [selectedKey, setSelectedKey] = useState(initialEntries[0]?.id || "");

  const allEntries = useMemo(() => [...entries, ...inlineEntries], [entries, inlineEntries]);
  const selectedEntry = allEntries.find((e) => e.id === selectedKey) || null;
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [framePath, setFramePath] = useState("/");
  const [draftValue, setDraftValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const [frameNavInput, setFrameNavInput] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewSrc = `${framePath}${framePath.includes("?") ? "&" : "?"}broadcast=1&v=${reloadKey}`;

  const filteredGroups = useMemo(() => {
    const matches = allEntries.filter((entry) => entryMatchesQuery(entry, query));
    const groups = new Map<string, EditableEntry[]>();
    for (const entry of matches) {
      const group = entry.sourceLabel || "أخرى";
      groups.set(group, [...(groups.get(group) || []), entry]);
    }
    return Array.from(groups.entries());
  }, [allEntries, query]);

  useEffect(() => {
    const storedQuery = window.localStorage.getItem(searchStorageKey) || "";
    const storedSelected = window.localStorage.getItem(selectedStorageKey) || "";
    if (storedQuery) setQuery(storedQuery);
    if (storedSelected && allEntries.some((e) => e.id === storedSelected)) {
      setSelectedKey(storedSelected);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(searchStorageKey, query);
  }, [query]);

  useEffect(() => {
    if (selectedKey) window.localStorage.setItem(selectedStorageKey, selectedKey);
  }, [selectedKey]);

  useEffect(() => {
    if (selectedEntry) {
      setDraftValue(selectedEntry.text);
    }
  }, [selectedEntry?.id]);

  useEffect(() => {
    if (selectedKey && allEntries.some((e) => e.id === selectedKey)) return;
    setSelectedKey(allEntries[0]?.id || "");
  }, [allEntries, selectedKey]);

  const saveViaApi = useCallback(async (saveKey: string, saveValue: string) => {
    setIsSaving(true);
    setStatus("");
    setStatusType("success");
    try {
      if (saveKey.startsWith("inline.")) {
        setInlineEntries((prev) =>
          prev.map((e) => (e.id === saveKey ? { ...e, text: saveValue } : e)),
        );
        setReloadKey((value) => value + 1);
        setStatusType("success");
        setStatus("تم حفظ النص محلياً.");
        setIsSaving(false);
        return;
      }
      const response = await fetch("/api/admin/text-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ id: saveKey, value: saveValue }),
      });
      const data = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!response.ok || !data?.success) throw new Error(data?.error || "تعذر حفظ النص");
      await refreshEntries();
      setReloadKey((value) => value + 1);
      setStatusType("success");
      setStatus("تم حفظ النص وتحديث شاشة البث.");

      // Send updated entries to iframe and clear live preview
      const iframeWindow = iframeRef.current?.contentWindow;
      if (iframeWindow) {
        try {
          // First send updated entries
          setTimeout(() => sendEntriesToIframe(), 100);
          // Then clear live preview
          iframeWindow.postMessage(
            { source: "badr-broadcast-parent", clearPreview: saveKey },
            window.location.origin,
          );
        } catch {
          // ignore cross-origin errors
        }
      }
    } catch (error) {
      setStatusType("error");
      setStatus(error instanceof Error ? error.message : "تعذر حفظ النص");
    } finally {
      setIsSaving(false);
    }
  }, []);

  const sendEntriesToIframe = useCallback(() => {
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return false;
    try {
      const mapped = (entries.length ? entries : initialEntries).map(mapForIframe);
      iframeWindow.postMessage(
        { source: "badr-broadcast-parent", entries: mapped },
        window.location.origin,
      );
      return true;
    } catch {
      return false;
    }
  }, [entries, initialEntries, inlineEntries]);

  useEffect(() => {
    if (!allEntries.length) return;
    let attempts = 0;
    const maxAttempts = 10;
    const trySend = () => {
      attempts++;
      const sent = sendEntriesToIframe();
      if (sent || attempts >= maxAttempts) return;
      setTimeout(trySend, 300);
    };
    trySend();
  }, [allEntries.length, sendEntriesToIframe, inlineEntries.length]);

  // Live preview: send draft changes to iframe in real-time
  useEffect(() => {
    if (!selectedEntry || !draftValue || draftValue === selectedEntry.text) return;
    const iframeWindow = iframeRef.current?.contentWindow;
    if (!iframeWindow) return;
    try {
      iframeWindow.postMessage(
        {
          source: "badr-broadcast-parent",
          livePreview: { key: selectedEntry.id, value: draftValue },
        },
        window.location.origin,
      );
    } catch {
      // ignore cross-origin errors
    }
  }, [draftValue, selectedEntry?.id]);

  useEffect(() => {
    if (!status) return;
    if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    statusTimeoutRef.current = setTimeout(() => setStatus(""), 5000);
    return () => {
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, [status]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== "badr-broadcast") return;

      const msg = event.data;
      const marker = msg.marker as BroadcastSaveMessage;
      if (!marker?.key) return;

      if (msg.type === "edit") {
        const exists = allEntries.some((e) => e.id === marker.key);
        if (exists) {
          setSelectedKey(marker.key);
        } else {
          const inline: EditableEntry = {
            id: marker.key,
            title: marker.label || "نص حر",
            text: marker.value,
            sourceLabel: marker.sourceLabel || "النص المحدد",
            groupLabel: "تعديل سريع",
            editable: true as boolean,
            href: "",
          };
          setInlineEntries((prev) => {
            if (prev.some((e) => e.id === marker.key)) return prev;
            return [inline, ...prev];
          });
          setSelectedKey(marker.key);
        }
        return;
      }

      if (msg.type === "save") {
        saveViaApi(marker.key, marker.value);
        return;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [allEntries, saveViaApi]);

  function handleFrameLoad() {
    const iframeWindow = iframeRef.current?.contentWindow;
    try {
      if (!iframeWindow?.location.href) return;
      const url = new URL(iframeWindow.location.href);
      if (url.origin !== window.location.origin) return;
      const nextPath = stripBroadcastParams(url);
      if (nextPath !== framePath) {
        setFramePath(nextPath);
        setFrameNavInput(nextPath);
      }
    } catch {
      // cross-origin
    }
    setTimeout(() => sendEntriesToIframe(), 200);
  }

  function navigateFrame(path: string) {
    const clean = path.startsWith("/") ? path : `/${path}`;
    setFramePath(clean);
    setFrameNavInput(clean);
  }

  async function refreshEntries() {
    const response = await fetch("/api/admin/broadcast", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as { fields?: EditableEntry[] };
    if (data.fields) setEntries(data.fields);
  }

  async function saveSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEntry) return;
    saveViaApi(selectedEntry.id, draftValue);
  }

  return (
    <section className="broadcast-admin-shell">
      <div className="broadcast-toolbar panel">
        <div>
          <span className="eyebrow">Live Site Broadcast</span>
          <h2>معاينة وتعديل الموقع الحقيقي</h2>
          <p>تصفح الموقع واضغط على أي نص لتعديله مباشرة داخل الشاشة.</p>
        </div>
        <div className="broadcast-toolbar-actions">
          <button className={viewport === "desktop" ? "btn btn-gold btn-glow" : "btn btn-soft"} type="button" onClick={() => setViewport("desktop")}>
            <Laptop size={17} />
            كمبيوتر
          </button>
          <button className={viewport === "mobile" ? "btn btn-gold btn-glow" : "btn btn-soft"} type="button" onClick={() => setViewport("mobile")}>
            <Smartphone size={17} />
            هاتف
          </button>
          <button className="btn btn-soft btn-icon" type="button" title="تحديث البث" onClick={() => setReloadKey((value) => value + 1)}>
            <RefreshCw size={17} />
          </button>
          <a className="btn btn-soft btn-icon" href="/" target="_blank" title="فتح الموقع">
            <ExternalLink size={17} />
          </a>
          <a className="btn btn-gold btn-glow" href="/admin/publish" target="_blank">
            نشر التغييرات
          </a>
        </div>
      </div>

      <div className="broadcast-workspace">
        <div className="broadcast-stage-stack">
          <div className="panel broadcast-stage">
            <div className="broadcast-frame-topbar">
              <span>{viewport === "mobile" ? "Phone" : "Desktop"}</span>
              <form className="broadcast-frame-nav" onSubmit={(e) => { e.preventDefault(); navigateFrame(frameNavInput); }}>
                <input value={frameNavInput} onChange={(e) => setFrameNavInput(e.target.value)} placeholder="أدخل رابط الصفحة (مثال: / أو /templates)" dir="ltr" />
              </form>
              <button className="btn btn-soft btn-icon" type="button" title="العودة للرئيسية" onClick={() => navigateFrame("/")}>
                <RefreshCw size={16} />
              </button>
            </div>
            <div className={viewport === "mobile" ? "broadcast-frame mobile" : "broadcast-frame desktop"}>
              <iframe ref={iframeRef} key={`${framePath}:${reloadKey}`} src={previewSrc} title="شاشة بث الموقع" loading="eager" onLoad={handleFrameLoad} />
            </div>
          </div>
        </div>

        <aside className="panel broadcast-editor">
          <div className="broadcast-editor-top">
            <div className="admin-card-head">
              <Pencil size={22} />
              <div>
                <span className="eyebrow">Quick Edit</span>
                <h2>تحرير النصوص</h2>
                <p>اختر نصاً من القائمة أو اضغط على أي نص في شاشة البث</p>
              </div>
            </div>

            <label className="broadcast-search">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في كل نصوص الموقع..." />
              {query ? (
                <button className="broadcast-clear-search" type="button" title="مسح البحث" onClick={() => setQuery("")}>
                  <X size={16} />
                </button>
              ) : null}
            </label>
          </div>

          {status ? <div className={statusType === "error" ? "broadcast-save-status error" : "broadcast-save-status"}>
            {status}
            {statusType === "success" ? <span style={{ display: "block", marginTop: 6, fontSize: "0.78rem", opacity: 0.9 }}>
              <a href="/admin/publish" style={{ color: "inherit", textDecoration: "underline" }}>← اذهب للنشر</a> لتطبيق التغييرات على الموقع
            </span> : null}
          </div> : null}

          {selectedEntry ? (
            <form className="broadcast-edit-form" onSubmit={saveSelected}>
              <label className="field">
                <span>العنصر المحدد</span>
                <input value={selectedEntry.title} readOnly />
              </label>
              <label className="field">
                <span>المصدر</span>
                <input value={selectedEntry.sourceLabel} readOnly />
              </label>
              <label className="field">
                <span>النص</span>
                <textarea value={draftValue} onChange={(event) => setDraftValue(event.target.value)} rows={5} />
              </label>
              <button className="btn btn-gold btn-glow" type="submit" disabled={isSaving || draftValue === selectedEntry.text}>
                <Save size={18} />
                {isSaving ? "جار الحفظ..." : "حفظ بدون ريفرش"}
              </button>
            </form>
          ) : (
            <div className="admin-empty-state">
              <strong>اختر عنصراً للتعديل</strong>
              <p>اضغط على أي نص داخل شاشة البث أو اختر عنصراً من قائمة المحتوى أدناه.</p>
            </div>
          )}

          <div className="broadcast-field-list">
            <div className="broadcast-list-head">
              <div>
                <strong>محتوى الموقع</strong>
                <small>{filteredGroups.reduce((total, [, items]) => total + items.length, 0)} من {allEntries.length} نص</small>
              </div>
            </div>

            {filteredGroups.length ? (
              filteredGroups.map(([group, items]) => (
                <div className="broadcast-field-group" key={group}>
                  <div className="broadcast-field-group-title">
                    <span>{group}</span>
                    <small>{items.length}</small>
                  </div>
                  {items.map((entry) => (
                    <button className={entry.id === selectedEntry?.id ? "active" : ""} type="button" key={entry.id} onClick={() => setSelectedKey(entry.id)}>
                      <span>{entry.title}</span>
                      <small>{entry.groupLabel || "نص"}</small>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="broadcast-no-results">
                <strong>لا توجد نتائج</strong>
                <span>البحث يطابق الكلمات بعد توحيد الهمزات والمسافات. جرب جزء أقصر من الجملة.</span>
              </div>
            )}
          </div>

          {viewport === "desktop" && sectionDefs && initialSectionOrder ? (
            <div className="broadcast-section-order-wrap">
              <BroadcastSectionOrder
                sections={sectionDefs}
                initialOrder={initialSectionOrder}
                onReorder={() => {
                  setReloadKey((k) => k + 1);
                }}
              />
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
