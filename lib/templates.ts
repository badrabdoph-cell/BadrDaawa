import type { TemplateDefinition } from "./types";

export const royalEnvelopeTemplate: TemplateDefinition = {
  id: "tpl_royal_envelope",
  slug: "royal-envelope",
  name: "Royal Envelope",
  arabicName: "Royal Envelope",
  category: "قالب ملكي فاتح",
  style: "royal",
  concept: "ظرف ملكي يفتح بهدوء وتظهر منه بطاقة الدعوة بتفاصيل ذهبية ناعمة.",
  opening: "Envelope reveal",
  layout: "Hero بظرف تفاعلي، تفاصيل الفرح، العد التنازلي، الخريطة، وتأكيد الحضور.",
  typography: "خط عربي واضح مع أرقام إنجليزية وتباين مريح للموبايل.",
  palette: {
    primary: "#f8f4ec",
    secondary: "#d8c19a",
    accent: "#b48b39",
    ink: "#3a2e1f",
    surface: "#ffffff",
  },
  previewImage: "/assets/templates/royal-envelope.svg",
  accentImage: "/assets/brand/champagne-rings.png",
  enabled: true,
  score: 100,
};

export const luxeNoirTemplate: TemplateDefinition = {
  id: "tpl_luxe_noir",
  slug: "luxe-noir",
  name: "Luxe Noir",
  arabicName: "Luxe Noir",
  category: "قالب فاخر داكن",
  style: "noir",
  concept: "دعوة سوداء ذهبية فخمة، صور كبيرة، كروت زجاجية، وخريطة واضحة بتأثير راقٍ.",
  opening: "Envelope reveal",
  layout: "واجهة داكنة، بطاقة أسماء ذهبية، رسالة مختصرة، معرض صور، خريطة، مصور، RSVP وQR.",
  typography: "حروف كبيرة ومريحة للموبايل مع تباين ذهبي واضح وأرقام إنجليزية.",
  palette: {
    primary: "#0d0b09",
    secondary: "#1b1713",
    accent: "#d7a84d",
    ink: "#fff6df",
    surface: "#15120f",
  },
  previewImage: "/assets/templates/luxe-noir.svg",
  accentImage: "/assets/invite/badr-sarah-2.jpeg",
  enabled: true,
  score: 96,
};

export const ivoryArchesTemplate: TemplateDefinition = {
  id: "tpl_ivory_arches",
  slug: "ivory-arches",
  name: "Ivory Arches",
  arabicName: "Ivory Arches",
  category: "قالب رومانسي كريمي",
  style: "ivory",
  concept: "دعوة عاجية هادئة، أسماء كبيرة، صور بأقواس رومانسية، وتفاصيل ناعمة جدًا للموبايل.",
  opening: "Envelope reveal",
  layout: "غلاف Save The Date، عداد داخل بطاقة بيضاء، معرض صور بأقواس، خريطة، مصور، RSVP وQR.",
  typography: "خطوط ناعمة وواضحة مع ألوان حجرية ووردي خفيف للمظهر الراقي.",
  palette: {
    primary: "#fdfbf7",
    secondary: "#eee8df",
    accent: "#d88b9a",
    ink: "#2f2a25",
    surface: "#ffffff",
  },
  previewImage: "/assets/templates/ivory-arches.svg",
  accentImage: "/assets/invite/badr-sarah-1.jpeg",
  enabled: true,
  score: 94,
};

export const mobileGoldTemplate: TemplateDefinition = {
  id: "tpl_mobile_gold",
  slug: "mobile-gold",
  name: "Mobile Gold",
  arabicName: "Mobile Gold",
  category: "باقة موبايل ذهبية",
  style: "mobile",
  concept: "دعوة مصممة كأنها شاشة هاتف أنيقة: أسماء واضحة، كروت خفيفة، صور Collage، وخريطة وأزرار لمس كبيرة.",
  opening: "Envelope reveal",
  layout: "تجربة بعرض هاتف، غلاف بسيط، كروت التاريخ والوقت، صور، رسالة، خريطة، مصور، RSVP وQR.",
  typography: "خطوط واضحة جدًا ومساحات صغيرة مناسبة للقراءة السريعة على الهاتف.",
  palette: {
    primary: "#fafafa",
    secondary: "#ffffff",
    accent: "#d4af37",
    ink: "#1a1a1a",
    surface: "#ffffff",
  },
  previewImage: "/assets/templates/mobile-gold.svg",
  accentImage: "/assets/invite/badr-sarah-3.jpeg",
  enabled: true,
  score: 92,
};

export const invitationTemplates: TemplateDefinition[] = [royalEnvelopeTemplate, luxeNoirTemplate, ivoryArchesTemplate, mobileGoldTemplate];

export function getTemplateBySlug(slug: string) {
  return invitationTemplates.find((template) => template.slug === slug);
}

export function getTemplateSortOrder(slug: string) {
  const index = invitationTemplates.findIndex((template) => template.slug === slug);
  return index >= 0 ? index + 1 : invitationTemplates.length + 1;
}

export const featuredTemplates = invitationTemplates;
