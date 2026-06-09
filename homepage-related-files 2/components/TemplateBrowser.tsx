"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { TemplateCard } from "@/components/TemplateCard";
import type { TemplateDefinition } from "@/lib/types";

const styleLabels: Record<string, string> = {
  all: "الكل",
  featured: "مميز",
  royal: "ملكي",
  noir: "داكن",
  ivory: "رومانسي",
  mobile: "موبايل",
  boho: "بوهو",
  garden: "حدائق",
  cinematic: "سينمائي",
  glass: "زجاجي",
  minimal: "مينيمال",
  neon: "نيون",
  vintage: "فينتاج",
  ocean: "أوشن",
  artdeco: "آرت ديكو",
  magazine: "مجلة",
  custom: "خاص",
};

function normalize(value: string) {
  return value.toLowerCase().trim();
}

export function TemplateBrowser({ templates }: { templates: TemplateDefinition[] }) {
  const [query, setQuery] = useState("");
  const [activeStyle, setActiveStyle] = useState("all");

  const styles = useMemo(() => ["all", ...Array.from(new Set(templates.map((template) => template.style)))], [templates]);
  const filteredTemplates = useMemo(() => {
    const cleanQuery = normalize(query);
    return templates.filter((template) => {
      const matchesStyle = activeStyle === "all" || template.style === activeStyle;
      const haystack = normalize([template.arabicName, template.name, template.category, template.concept, template.style].join(" "));
      return matchesStyle && (!cleanQuery || haystack.includes(cleanQuery));
    });
  }, [activeStyle, query, templates]);

  return (
    <section className="template-browser" aria-label="استعراض القوالب">
      <div className="template-browser-tools">
        <label className="template-search-box">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث باسم القالب، اللون، أو الطابع..." />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="مسح البحث">
              <X size={16} />
            </button>
          ) : null}
        </label>

        <div className="template-filter-row" aria-label="فلترة القوالب">
          <span>
            <SlidersHorizontal size={16} />
            فلترة
          </span>
          {styles.map((style) => (
            <button className={activeStyle === style ? "active" : ""} key={style} type="button" onClick={() => setActiveStyle(style)}>
              {styleLabels[style] || style}
            </button>
          ))}
        </div>
      </div>

      <div className="template-result-count">
        <strong>{filteredTemplates.length}</strong>
        <span>{filteredTemplates.length === 1 ? "قالب مناسب لاختيارك" : "قوالب مناسبة لاختيارك"}</span>
      </div>

      {filteredTemplates.length ? (
        <div className="template-grid">
          {filteredTemplates.map((template) => (
            <TemplateCard template={template} key={template.slug} />
          ))}
        </div>
      ) : (
        <div className="template-empty-state">
          <strong>لا يوجد قالب مطابق الآن</strong>
          <p>جرّب كلمة أبسط، أو اعرض كل القوالب واختار حسب الإحساس الأقرب للمناسبة.</p>
          <button
            className="btn btn-gold"
            type="button"
            onClick={() => {
              setQuery("");
              setActiveStyle("all");
            }}
          >
            عرض كل القوالب
          </button>
        </div>
      )}
    </section>
  );
}
