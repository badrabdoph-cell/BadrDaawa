"use client";

import { Check, ChevronDown, ChevronUp, CircleX, ExternalLink, Laptop, Pencil, Plus, RefreshCw, Save, Search, Smartphone, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getBroadcastPreviewValue, type BroadcastField } from "@/lib/broadcast-fields";
import type { ContentTextEntry } from "@/lib/content-text-registry";
import type { HomeContent } from "@/lib/home-content";
import type { HomePreviewSettings } from "@/lib/preview-settings";
import { FEATURE_ICONS, FEATURE_ICON_NAMES } from "@/lib/feature-icons";

type StudioField = BroadcastField & {
  sourceLabel?: string;
  groupLabel?: string;
  href?: string;
};

type BroadcastMarker = StudioField & {
  top?: number;
  left?: number;
};

type BroadcastMutation =
  | { action: "text"; key: string; kind: "text"; value: string }
  | { action: "media"; mediaMode: string; mediaUrl: string; templateSlug: string }
  | { action: "addFeature"; text: string; icon?: string }
  | { action: "deleteFeature"; id: string }
  | { action: "moveFeatureUp"; id: string }
  | { action: "moveFeatureDown"; id: string }
  | { action: "setFeatureIcon"; id: string; icon: string }
  | { action: "addPricingRow"; feature: string; invitation: boolean; plus: boolean }
  | { action: "deletePricingRow"; id: string }
  | { action: "setPricingAvailability"; id: string; column: "invitation" | "plus"; value: boolean };

const searchStorageKey = "badr-broadcast-search";
const selectedStorageKey = "badr-broadcast-selected";

function getFieldGroup(field: StudioField) {
  if ("groupLabel" in field && field.groupLabel) return field.groupLabel;
  if ("sourceLabel" in field && field.sourceLabel) return field.sourceLabel;
  if (field.key.startsWith("hero.")) return "واجهة البداية";
  if (field.key.startsWith("home-content.hero.")) return "واجهة البداية";
  if (field.key.startsWith("features.")) return "المميزات";
  if (field.key.startsWith("home-content.features.")) return "المميزات";
  if (field.key.startsWith("preview.")) return "المعاينة";
  if (field.key.startsWith("home-content.preview.")) return "المعاينة";
  if (field.key.startsWith("pricing.")) return "الباقات والأسعار";
  if (field.key.startsWith("home-content.pricing.")) return "الباقات والأسعار";
  return field.kind === "media" ? "الميديا" : "نصوص أخرى";
}

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

function fieldMatchesQuery(field: StudioField, query: string) {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const haystack = normalizeSearch(`${field.label} ${field.value} ${field.key} ${getFieldGroup(field)}`);
  return words.every((word) => haystack.includes(word));
}

function getPreviewUrl(settings: HomePreviewSettings) {
  if (settings.mode === "video") return settings.videoUrl;
  if (settings.mode === "image") return settings.imageUrl;
  return "";
}

function entryToField(entry: ContentTextEntry): StudioField {
  return {
    key: entry.id,
    label: entry.title,
    kind: "text",
    value: entry.text,
    sourceLabel: entry.sourceLabel,
    groupLabel: entry.groupLabel,
    href: entry.href,
  };
}

function stripBroadcastParams(url: URL) {
  url.searchParams.delete("broadcast");
  url.searchParams.delete("v");
  const path = `${url.pathname}${url.search}${url.hash}`;
  return path || "/";
}

type BroadcastStateResponse = {
  ok?: boolean;
  content?: HomeContent;
  previewSettings?: HomePreviewSettings;
  fields?: ContentTextEntry[];
  error?: string;
};

export function BroadcastStudio({
  fields: initialFields,
  initialContent,
  initialPreviewSettings,
  previewTemplateSlug,
  templates,
  textEntries,
}: {
  fields: BroadcastField[];
  initialContent: HomeContent;
  initialPreviewSettings: HomePreviewSettings;
  previewTemplateSlug: string;
  templates: { slug: string; arabicName: string }[];
  textEntries: ContentTextEntry[];
}) {
  const [content, setContent] = useState(initialContent);
  const [previewSettings, setPreviewSettings] = useState(initialPreviewSettings);
  const [registryEntries, setRegistryEntries] = useState(textEntries);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("mobile");
  const [selectedKey, setSelectedKey] = useState(textEntries[0]?.id || initialFields[0]?.key || "");
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [framePath, setFramePath] = useState("/");
  const [draftValue, setDraftValue] = useState("");
  const [mediaMode, setMediaMode] = useState<HomePreviewSettings["mode"]>(initialPreviewSettings.mode);
  const [mediaUrl, setMediaUrl] = useState(getPreviewUrl(initialPreviewSettings));
  const [templateSlug, setTemplateSlug] = useState(previewTemplateSlug);
  const [newFeature, setNewFeature] = useState("");
  const [newFeatureIcon, setNewFeatureIcon] = useState("Sparkles");
  const [newPricingFeature, setNewPricingFeature] = useState("");
  const [newPricingInvitation, setNewPricingInvitation] = useState(true);
  const [newPricingPlus, setNewPricingPlus] = useState(true);
  const [iconDropdown, setIconDropdown] = useState<{ id: string; currentIcon: string; top: number; left: number } | null>(null);
  const iconDropdownRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error">("success");
  const previewSrc = `${framePath}${framePath.includes("?") ? "&" : "?"}broadcast=1&v=${reloadKey}`;

  const fields = useMemo<StudioField[]>(() => {
    const registryFields = registryEntries.filter((entry) => entry.editable).map(entryToField);
    return [
      ...registryFields,
      { key: "preview.media", label: "ميديا المعاينة", kind: "media", value: getBroadcastPreviewValue(previewSettings), sourceLabel: "محتوى الصفحة الرئيسية", groupLabel: "المعاينة" },
    ];
  }, [registryEntries, previewSettings]);
  const selectedField = fields.find((field) => field.key === selectedKey) || fields[0];
  const selectedGroup = selectedField ? getFieldGroup(selectedField) : "";

  useEffect(() => {
    const storedQuery = window.localStorage.getItem(searchStorageKey) || "";
    const storedSelectedKey = window.localStorage.getItem(selectedStorageKey) || "";
    if (storedQuery) setQuery(storedQuery);
    if (storedSelectedKey && fields.some((field) => field.key === storedSelectedKey)) {
      setSelectedKey(storedSelectedKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(searchStorageKey, query);
  }, [query]);

  useEffect(() => {
    if (selectedKey) window.localStorage.setItem(selectedStorageKey, selectedKey);
  }, [selectedKey]);

  useEffect(() => {
    if (!selectedField) return;
    if (selectedField.kind === "media") {
      setMediaMode(previewSettings.mode);
      setMediaUrl(getPreviewUrl(previewSettings));
      setTemplateSlug(previewSettings.templateSlug);
      return;
    }
    setDraftValue(selectedField.value);
  }, [selectedField?.key]);

  useEffect(() => {
    if (selectedKey && fields.some((field) => field.key === selectedKey)) return;
    setSelectedKey(fields[0]?.key || "");
  }, [fields, selectedKey]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== "badr-broadcast" || event.data?.type !== "edit") return;
      const marker = event.data.marker as BroadcastMarker;
      if (marker?.key) setSelectedKey(marker.key);
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!iconDropdown) return;
    function handleClickOutside(event: MouseEvent) {
      if (iconDropdownRef.current && !iconDropdownRef.current.contains(event.target as Node)) {
        setIconDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [iconDropdown]);

  const filteredGroups = useMemo(() => {
    const matches = fields.filter((field) => fieldMatchesQuery(field, query));
    const groups = new Map<string, StudioField[]>();
    for (const field of matches) {
      const group = getFieldGroup(field);
      groups.set(group, [...(groups.get(group) || []), field]);
    }
    return Array.from(groups.entries());
  }, [fields, query]);

  async function refreshBroadcastState() {
    const response = await fetch("/api/admin/broadcast", { credentials: "same-origin", cache: "no-store" });
    const data = (await response.json()) as BroadcastStateResponse;
    if (!response.ok || !data.ok || !data.content || !data.previewSettings || !data.fields) {
      throw new Error(data.error || "تعذر تحديث بيانات شاشة البث");
    }
    setContent(data.content);
    setPreviewSettings(data.previewSettings);
    setRegistryEntries(data.fields);
    return data;
  }

  async function runMutation(payload: BroadcastMutation, successMessage: string) {
    setIsSaving(true);
    setStatus("");
    setStatusType("success");
    try {
      const response = await fetch("/api/admin/broadcast", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(response.redirected || response.url.includes("/admin/login") ? "جلسة الأدمن انتهت. سجل دخول مرة أخرى." : "رد الحفظ غير صالح. أعد تحميل الصفحة وجرب مرة أخرى.");
      }
      const data = (await response.json()) as BroadcastStateResponse;
      if (!response.ok || !data.ok || !data.content || !data.previewSettings) {
        throw new Error(data.error || "تعذر حفظ التعديل");
      }
      setContent(data.content);
      setPreviewSettings(data.previewSettings);
      if (data.fields) setRegistryEntries(data.fields);
      await refreshBroadcastState();
      setReloadKey((value) => value + 1);
      setStatusType("success");
      setStatus(successMessage);
      return true;
    } catch (error) {
      setStatusType("error");
      setStatus(error instanceof Error ? error.message : "تعذر حفظ التعديل");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function runTextEdit(key: string, value: string, successMessage: string) {
    setIsSaving(true);
    setStatus("");
    setStatusType("success");
    try {
      const response = await fetch("/api/admin/text-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({ id: key, value }),
      });
      const data = (await response.json().catch(() => null)) as { success?: boolean; error?: string } | null;
      if (!response.ok || !data?.success) throw new Error(data?.error || "تعذر حفظ النص");
      await refreshBroadcastState();
      setReloadKey((value) => value + 1);
      setStatusType("success");
      setStatus(successMessage);
      return true;
    } catch (error) {
      setStatusType("error");
      setStatus(error instanceof Error ? error.message : "تعذر حفظ النص");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSelected(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedField) return;
    if (selectedField.kind === "media") {
      await runMutation({ action: "media", mediaMode, mediaUrl, templateSlug }, "تم حفظ الميديا وتحديث المعاينة.");
      return;
    }
    await runTextEdit(selectedField.key, draftValue, "تم حفظ النص وتحديث شاشة البث.");
  }

  async function addFeature(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = newFeature.trim();
    if (!text) return;
    const saved = await runMutation({ action: "addFeature", text, icon: newFeatureIcon }, "تمت إضافة الميزة.");
    if (saved) { setNewFeature(""); setNewFeatureIcon("Sparkles"); }
  }

  async function addPricingRow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const feature = newPricingFeature.trim();
    if (!feature) return;
    const saved = await runMutation(
      { action: "addPricingRow", feature, invitation: newPricingInvitation, plus: newPricingPlus },
      "تمت إضافة بند السعر.",
    );
    if (saved) setNewPricingFeature("");
  }

  function selectField(key: string) {
    setSelectedKey(key);
  }

  function handleFrameLoad() {
    const iframeWindow = iframeRef.current?.contentWindow;
    try {
      if (!iframeWindow?.location.href) return;
      const url = new URL(iframeWindow.location.href);
      if (url.origin !== window.location.origin) return;
      const nextPath = stripBroadcastParams(url);
      if (nextPath !== framePath) setFramePath(nextPath);
    } catch {
      // Cross-origin navigations are opened separately by normal browser rules.
    }
  }

  return (
    <section className="broadcast-admin-shell">
      <div className="broadcast-toolbar panel">
        <div>
          <span className="eyebrow">Live Site Broadcast</span>
          <h2>معاينة وتعديل الموقع الحقيقي</h2>
          <p>الحفظ هنا يتم بدون تحديث صفحة الأدمن، وبعده تتحدث المعاينة ويتجه التعديل للمزامنة التلقائية.</p>
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
        </div>
      </div>

      <div className="broadcast-workspace">
        <div className="broadcast-stage-stack">
          <div className="panel broadcast-stage">
            <div className="broadcast-frame-topbar">
              <span>{viewport === "mobile" ? "Phone" : "Desktop"}</span>
              <strong>{framePath || "/"}</strong>
              <button className="btn btn-soft btn-icon" type="button" title="العودة للرئيسية داخل البث" onClick={() => setFramePath("/")}>
                <RefreshCw size={16} />
              </button>
            </div>
            <div className={viewport === "mobile" ? "broadcast-frame mobile" : "broadcast-frame desktop"}>
              <iframe ref={iframeRef} key={`${framePath}:${reloadKey}`} src={previewSrc} title="شاشة بث الموقع" loading="eager" onLoad={handleFrameLoad} />
            </div>
          </div>

          <div className="broadcast-live-tables">
            <section className="broadcast-table-panel">
              <div className="broadcast-table-head">
                <div>
                  <span className="eyebrow">Features</span>
                  <h3>جدول المميزات</h3>
                </div>
                <small>{content.features.points.length} بند</small>
              </div>
              <div className="broadcast-feature-list">
                {content.features.points.map((point, idx) => {
                  const CurrentIcon = (point.icon && FEATURE_ICONS[point.icon]) || FEATURE_ICONS.Sparkles;
                  return (
                    <div className="broadcast-feature-row" key={point.id}>
                      <button
                        className="broadcast-row-icon"
                        type="button"
                        title="رفع لأعلى"
                        disabled={idx === 0 || isSaving}
                        onClick={() => runMutation({ action: "moveFeatureUp", id: point.id }, "تم رفع الميزة.")}
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        className="broadcast-row-icon"
                        type="button"
                        title="خفض لأسفل"
                        disabled={idx === content.features.points.length - 1 || isSaving}
                        onClick={() => runMutation({ action: "moveFeatureDown", id: point.id }, "تم خفض الميزة.")}
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        className="broadcast-row-icon"
                        type="button"
                        title="تغيير الشعار"
                        disabled={isSaving}
                        onClick={(e) => {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setIconDropdown(iconDropdown?.id === point.id ? null : { id: point.id, currentIcon: point.icon || "", top: rect.bottom + 4, left: rect.left });
                        }}
                      >
                        <CurrentIcon size={16} />
                      </button>
                      <button type="button" onClick={() => selectField(`home-content.features.points.${point.id}`)}>
                        {point.text}
                      </button>
                      <button
                        className="broadcast-row-icon danger"
                        type="button"
                        title="حذف الميزة"
                        disabled={isSaving}
                        onClick={() => runMutation({ action: "deleteFeature", id: point.id }, "تم حذف الميزة.")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
              <form className="broadcast-inline-form feature" onSubmit={addFeature}>
                <button
                  className="broadcast-row-icon"
                  type="button"
                  title="اختيار شعار"
                  onClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    setIconDropdown(iconDropdown?.id === "new" ? null : { id: "new", currentIcon: newFeatureIcon, top: rect.bottom + 4, left: rect.left });
                  }}
                >
                  {(() => { const Icon = FEATURE_ICONS[newFeatureIcon] || FEATURE_ICONS.Sparkles; return <Icon size={16} />; })()}
                </button>
                <input value={newFeature} onChange={(event) => setNewFeature(event.target.value)} placeholder="أضف ميزة جديدة" />
                <button className="btn btn-soft btn-icon" type="submit" title="إضافة ميزة" disabled={isSaving || !newFeature.trim()}>
                  <Plus size={17} />
                </button>
              </form>
              {iconDropdown ? (
                <div className="broadcast-icon-dropdown" ref={iconDropdownRef} style={{ position: "fixed", top: iconDropdown.top, left: iconDropdown.left, zIndex: 1000 }}>
                  {FEATURE_ICON_NAMES.map((name) => {
                    const Icon = FEATURE_ICONS[name];
                    return (
                      <button
                        key={name}
                        type="button"
                        className={iconDropdown.currentIcon === name ? "active" : ""}
                        onClick={() => {
                          if (iconDropdown.id === "new") {
                            setNewFeatureIcon(name);
                          } else {
                            runMutation({ action: "setFeatureIcon", id: iconDropdown.id, icon: name }, "تم تغيير الشعار.");
                          }
                          setIconDropdown(null);
                        }}
                      >
                        <Icon size={18} />
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <section className="broadcast-table-panel">
              <div className="broadcast-table-head">
                <div>
                  <span className="eyebrow">Pricing</span>
                  <h3>جدول الأسعار</h3>
                </div>
                <small>{content.pricing.rows.length} بند</small>
              </div>
              <div className="broadcast-pricing-table" role="table" aria-label="تعديل جدول الأسعار">
                <div className="broadcast-pricing-row head" role="row">
                  <span>البند</span>
                  <span>{content.pricing.invitationPlanName}</span>
                  <span>{content.pricing.plusPlanName}</span>
                  <span />
                </div>
                {content.pricing.rows.map((row) => (
                  <div className="broadcast-pricing-row" role="row" key={row.id}>
                    <button type="button" onClick={() => selectField(`home-content.pricing.rows.${row.id}.feature`)}>
                      {row.feature}
                    </button>
                    <button
                      className={row.invitation ? "broadcast-check active" : "broadcast-check"}
                      type="button"
                      title="تغيير حالة الباقة الأولى"
                      disabled={isSaving}
                      onClick={() => runMutation({ action: "setPricingAvailability", id: row.id, column: "invitation", value: !row.invitation }, "تم تحديث علامة الباقة.")}
                    >
                      {row.invitation ? <Check size={16} /> : <CircleX size={16} />}
                    </button>
                    <button
                      className={row.plus ? "broadcast-check active" : "broadcast-check"}
                      type="button"
                      title="تغيير حالة الباقة الثانية"
                      disabled={isSaving}
                      onClick={() => runMutation({ action: "setPricingAvailability", id: row.id, column: "plus", value: !row.plus }, "تم تحديث علامة الباقة.")}
                    >
                      {row.plus ? <Check size={16} /> : <CircleX size={16} />}
                    </button>
                    <button
                      className="broadcast-row-icon danger"
                      type="button"
                      title="حذف البند"
                      disabled={isSaving}
                      onClick={() => runMutation({ action: "deletePricingRow", id: row.id }, "تم حذف بند السعر.")}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <form className="broadcast-inline-form pricing" onSubmit={addPricingRow}>
                <input value={newPricingFeature} onChange={(event) => setNewPricingFeature(event.target.value)} placeholder="أضف بند سعر جديد" />
                <button className={newPricingInvitation ? "broadcast-check active" : "broadcast-check"} type="button" title="متاح في الباقة الأولى" onClick={() => setNewPricingInvitation((value) => !value)}>
                  {newPricingInvitation ? <Check size={16} /> : <CircleX size={16} />}
                </button>
                <button className={newPricingPlus ? "broadcast-check active" : "broadcast-check"} type="button" title="متاح في الباقة الثانية" onClick={() => setNewPricingPlus((value) => !value)}>
                  {newPricingPlus ? <Check size={16} /> : <CircleX size={16} />}
                </button>
                <button className="btn btn-soft btn-icon" type="submit" title="إضافة بند" disabled={isSaving || !newPricingFeature.trim()}>
                  <Plus size={17} />
                </button>
              </form>
            </section>
          </div>
        </div>

        <aside className="panel broadcast-editor">
          <div className="broadcast-editor-top">
            <div className="admin-card-head">
              <Pencil size={22} />
              <div>
                <span className="eyebrow">Quick Edit</span>
                <h2>بحث وتعديل</h2>
                {selectedField ? <p>{selectedGroup}</p> : null}
              </div>
            </div>

            <label className="broadcast-search">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث في نصوص الموقع والصفحات" />
              {query ? (
                <button className="broadcast-clear-search" type="button" title="مسح البحث" onClick={() => setQuery("")}>
                  <X size={16} />
                </button>
              ) : null}
            </label>
            <div className="broadcast-search-note">البحث مستقل عن خانة التعديل، فالنص المحدد يفضل مفتوح حتى لو غيرت كلمة البحث.</div>
          </div>

          {selectedField ? (
            <form className="broadcast-edit-form" onSubmit={saveSelected}>
              <label className="field">
                <span>العنصر المحدد</span>
                <input value={selectedField.label} readOnly />
              </label>

              {selectedField.kind === "media" ? (
                <>
                  <label className="field">
                    <span>نوع المعاينة</span>
                    <select value={mediaMode} onChange={(event) => setMediaMode(event.target.value as HomePreviewSettings["mode"])}>
                      <option value="template">قالب مباشر</option>
                      <option value="image">صورة</option>
                      <option value="video">فيديو</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>رابط صورة أو فيديو</span>
                    <input value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="/uploads/previews/file.jpg أو https://..." />
                  </label>
                  <label className="field">
                    <span>قالب المعاينة</span>
                    <select value={templateSlug} onChange={(event) => setTemplateSlug(event.target.value)}>
                      {templates.map((template) => (
                        <option key={template.slug} value={template.slug}>
                          {template.arabicName}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <label className="field">
                  <span>النص</span>
                  <textarea value={draftValue} onChange={(event) => setDraftValue(event.target.value)} rows={5} />
                </label>
              )}

              <button className="btn btn-gold btn-glow" type="submit" disabled={isSaving}>
                <Save size={18} />
                {isSaving ? "جار الحفظ..." : "حفظ بدون ريفرش"}
              </button>
              {status ? <div className={statusType === "error" ? "broadcast-save-status error" : "broadcast-save-status"}>{status}</div> : null}
            </form>
          ) : (
            <div className="admin-empty-state">
              <strong>اختار عنصر من الموقع</strong>
              <p>اضغط علامة القلم داخل شاشة البث أو اختار عنصر من القائمة.</p>
            </div>
          )}

          <div className="broadcast-field-list">
            <div className="broadcast-list-head">
              <div>
                <strong>نتائج البحث</strong>
                <small>
                  {filteredGroups.reduce((total, [, items]) => total + items.length, 0)} من {fields.length}
                </small>
              </div>
            </div>

            {filteredGroups.length ? (
              filteredGroups.map(([group, items]) => (
                <div className="broadcast-field-group" key={group}>
                  <div className="broadcast-field-group-title">
                    <span>{group}</span>
                    <small>{items.length}</small>
                  </div>
                  {items.map((field) => (
                    <button className={field.key === selectedField?.key ? "active" : ""} type="button" key={field.key} onClick={() => selectField(field.key)}>
                      <span>{field.label}</span>
                      <small>{field.kind === "media" ? "ميديا" : "نص"}</small>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <div className="broadcast-no-results">
                <strong>لا توجد نتائج</strong>
                <span>البحث بيطابق الكلمات بعد توحيد الهمزات والمسافات. جرب جزء أقصر من الجملة.</span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
