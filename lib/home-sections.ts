export type HomeSectionDefinition = {
  id: string;
  label: string;
  className: string;
};

export const HOME_SECTION_DEFINITIONS: HomeSectionDefinition[] = [
  { id: "hero", label: "القسم العلوي (Hero)", className: "wd-hero" },
  { id: "quick-benefits", label: "المميزات السريعة", className: "wd-value-strip" },
  { id: "flow", label: "خطوات الرحلة", className: "wd-flow-section" },
  { id: "preview", label: "المعاينة", className: "wd-preview-section" },
  { id: "features", label: "المميزات", className: "wd-features-section" },
  { id: "trust", label: "أسباب الثقة", className: "wd-trust-section" },
  { id: "stats", label: "الإحصائيات", className: "wd-stats-band" },
  { id: "pricing", label: "الباقات والأسعار", className: "wd-pricing-section" },
  { id: "faq", label: "الأسئلة الشائعة", className: "wd-faq-section" },
  { id: "final-cta", label: "الدعوة النهائية", className: "wd-final-cta" },
];

export const HOMEPAGE_SECTION_IDS = HOME_SECTION_DEFINITIONS.map((s) => s.id);

export const DEFAULT_SECTION_ORDER = [
  "hero",
  "quick-benefits",
  "flow",
  "preview",
  "features",
  "trust",
  "stats",
  "pricing",
  "faq",
  "final-cta",
];

export const sectionDefinitionMap = new Map(HOME_SECTION_DEFINITIONS.map((s) => [s.id, s]));

export function getSectionLabel(id: string): string {
  return sectionDefinitionMap.get(id)?.label || id;
}
