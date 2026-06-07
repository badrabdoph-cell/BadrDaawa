"use client";

import { ExternalLink, Laptop, Pencil, RefreshCw, Save, Search, Smartphone, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type BroadcastField = {
  key: string;
  label: string;
  kind: "text" | "media";
  value: string;
};

type BroadcastMarker = BroadcastField & {
  top?: number;
  left?: number;
};

const searchStorageKey = "badr-broadcast-search";
const selectedStorageKey = "badr-broadcast-selected";

function getFieldGroup(field: BroadcastField) {
  if (field.key.startsWith("hero.")) return "واجهة البداية";
  if (field.key.startsWith("features.")) return "المميزات";
  if (field.key.startsWith("preview.")) return "المعاينة";
  if (field.key.startsWith("pricing.")) return "الباقات";
  return field.kind === "media" ? "الميديا" : "نصوص أخرى";
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export function BroadcastStudio({
  fields,
  previewTemplateSlug,
  templates,
}: {
  fields: BroadcastField[];
  previewTemplateSlug: string;
  templates: { slug: string; arabicName: string }[];
}) {
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [selectedKey, setSelectedKey] = useState(fields[0]?.key || "");
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const storedQuery = window.localStorage.getItem(searchStorageKey) || "";
    const storedSelectedKey = window.localStorage.getItem(selectedStorageKey) || "";
    if (storedQuery) setQuery(storedQuery);
    if (storedSelectedKey && fields.some((field) => field.key === storedSelectedKey)) {
      setSelectedKey(storedSelectedKey);
    }
  }, [fields]);

  useEffect(() => {
    window.localStorage.setItem(searchStorageKey, query);
  }, [query]);

  useEffect(() => {
    if (selectedKey) window.localStorage.setItem(selectedStorageKey, selectedKey);
  }, [selectedKey]);

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

  const selectedField = fields.find((field) => field.key === selectedKey) || fields[0];
  const filteredGroups = useMemo(() => {
    const normalized = normalizeSearch(query);
    const matches = normalized
      ? fields.filter((field) => `${field.label} ${field.value} ${field.key} ${getFieldGroup(field)}`.toLowerCase().includes(normalized))
      : fields;
    const groups = new Map<string, BroadcastField[]>();
    for (const field of matches) {
      const group = getFieldGroup(field);
      groups.set(group, [...(groups.get(group) || []), field]);
    }
    return Array.from(groups.entries());
  }, [fields, query]);

  const selectedGroup = selectedField ? getFieldGroup(selectedField) : "";

  function selectField(key: string) {
    setSelectedKey(key);
  }

  return (
    <section className="broadcast-admin-shell">
      <div className="broadcast-toolbar panel">
        <div>
          <span className="eyebrow">Live Site Broadcast</span>
          <h2>معاينة الموقع الحقيقي</h2>
          <p>كل تعديل محفوظ هنا بيتزامن تلقائيًا مع ملفات المشروع وصفحات الموقع.</p>
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
        <div className="panel broadcast-stage">
          <div className={viewport === "mobile" ? "broadcast-frame mobile" : "broadcast-frame desktop"}>
            <iframe key={reloadKey} src="/?broadcast=1" title="شاشة بث الموقع" loading="eager" />
          </div>
        </div>

        <aside className="panel broadcast-editor">
          <div className="admin-card-head">
            <Pencil size={22} />
            <div>
              <span className="eyebrow">Quick Edit</span>
              <h2>تعديل العنصر المحدد</h2>
              {selectedField ? <p>{selectedGroup}</p> : null}
            </div>
          </div>

          {selectedField ? (
            <form className="broadcast-edit-form" action="/api/admin/broadcast" method="post" key={selectedField.key}>
              <input type="hidden" name="key" value={selectedField.key} />
              <input type="hidden" name="kind" value={selectedField.kind} />
              <label className="field">
                <span>العنصر</span>
                <input value={selectedField.label} readOnly />
              </label>

              {selectedField.kind === "media" ? (
                <>
                  <label className="field">
                    <span>نوع المعاينة</span>
                    <select name="mediaMode" defaultValue="template">
                      <option value="template">قالب مباشر</option>
                      <option value="image">صورة</option>
                      <option value="video">فيديو</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>رابط صورة أو فيديو</span>
                    <input name="mediaUrl" defaultValue={selectedField.value} placeholder="/uploads/previews/file.jpg أو https://..." />
                  </label>
                  <label className="field">
                    <span>قالب المعاينة</span>
                    <select name="templateSlug" defaultValue={previewTemplateSlug}>
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
                  <textarea name="value" rows={5} defaultValue={selectedField.value} />
                </label>
              )}

              <button className="btn btn-gold btn-glow" type="submit">
                <Save size={18} />
                حفظ وتحديث الموقع
              </button>
            </form>
          ) : (
            <div className="admin-empty-state">
              <strong>اختار عنصر من الموقع</strong>
              <p>اضغط علامة القلم داخل شاشة البث لتعديل النص أو الميديا.</p>
            </div>
          )}

          <div className="broadcast-field-list">
            <div className="broadcast-list-head">
              <div>
                <strong>العناصر القابلة للتعديل</strong>
                <small>
                  {filteredGroups.reduce((total, [, items]) => total + items.length, 0)} من {fields.length}
                </small>
              </div>
              {query ? (
                <button className="broadcast-clear-search" type="button" title="مسح البحث" onClick={() => setQuery("")}>
                  <X size={16} />
                </button>
              ) : null}
            </div>

            <label className="broadcast-search">
              <Search size={17} />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن نص أو اسم عنصر" />
            </label>

            <div className="broadcast-search-note">البحث يفضل ثابت أثناء التعديل وبعد الحفظ.</div>

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
                <span>جرّب كلمة أبسط أو امسح البحث.</span>
              </div>
            )}
          </div>
        </aside>
      </div>
    </section>
  );
}
