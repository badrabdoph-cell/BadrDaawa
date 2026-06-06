import type { TemplateDefinition } from "./types";

export const defaultTemplateMusicUrl = "/assets/audio/badr-sara-wedding-3.mp3";

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
  musicUrl: defaultTemplateMusicUrl,
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
  musicUrl: defaultTemplateMusicUrl,
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
  musicUrl: defaultTemplateMusicUrl,
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
  musicUrl: defaultTemplateMusicUrl,
  enabled: true,
  score: 92,
};

export const softGoldTemplate: TemplateDefinition = {
  id: "tpl_soft_gold",
  slug: "soft-gold",
  name: "Soft Gold",
  arabicName: "Soft Gold",
  category: "قالب ذهبي ناعم",
  style: "mobile",
  concept: "دعوة بيضاء ذهبية خفيفة بعرض موبايل، أسماء واضحة، كروت تاريخ، صور Collage، وخريطة ومشاركة سريعة.",
  opening: "Envelope reveal",
  layout: "غلاف بسيط، كروت التاريخ والوقت، عد تنازلي، معرض صور، رسالة، خريطة، مصور، RSVP وQR.",
  typography: "خطوط واضحة ومساحات مريحة تشبه الكود المرفق بدون تغيير في هيئة التجربة.",
  palette: {
    primary: "#fafafa",
    secondary: "#ffffff",
    accent: "#d4af37",
    ink: "#2a2a2a",
    surface: "#ffffff",
  },
  previewImage: "/assets/templates/soft-gold.svg",
  accentImage: "/assets/invite/badr-sarah-2.jpeg",
  musicUrl: defaultTemplateMusicUrl,
  enabled: true,
  score: 90,
};

export const bohoChicTemplate: TemplateDefinition = {
  id: "tpl_boho_chic",
  slug: "boho-chic",
  name: "Boho Chic",
  arabicName: "Boho Chic",
  category: "قالب Boho Sage",
  style: "boho",
  concept: "دعوة ترابية ناعمة بصورة غلاف كبيرة، كروت بيضاء، معرض أفقي، وخريطة خضراء هادئة.",
  opening: "Cinematic photo cover",
  layout: "غلاف بصورة كاملة، بطاقة تاريخ وعد تنازلي، معرض صور أفقي، خريطة، مصور، RSVP وQR.",
  typography: "خطوط كلاسيكية ناعمة مع ألوان Sage وSand ومظهر هادئ مناسب للموبايل.",
  palette: {
    primary: "#f7f5f0",
    secondary: "#e2d8c8",
    accent: "#9cafa4",
    ink: "#3e453c",
    surface: "#ffffff",
  },
  previewImage: "/assets/templates/boho-chic.svg",
  accentImage: "/assets/invite/badr-sarah-1.jpeg",
  musicUrl: defaultTemplateMusicUrl,
  enabled: true,
  score: 91,
};

export const gardenEleganceTemplate: TemplateDefinition = {
  id: "tpl_garden_elegance",
  slug: "garden-elegance",
  name: "Garden Elegance",
  arabicName: "Garden Elegance",
  category: "قالب حديقة أنيق",
  style: "garden",
  concept: "دعوة طبيعية هادئة بدوائر أسماء متداخلة، صورة مقوسة، تفاصيل Timeline، وخريطة وQR بتصميم تذكرة.",
  opening: "Organic reveal",
  layout: "غلاف طبيعي، صورة مقوسة، تفاصيل الزمان والمكان، عداد، خريطة، معرض صور، مصور، RSVP وQR.",
  typography: "خطوط رقيقة وواضحة مع أخضر Sage ولمسة وردية ترابية تناسب الهاتف.",
  palette: {
    primary: "#f4f6f0",
    secondary: "#e2e6d8",
    accent: "#ca7d60",
    ink: "#2c3b2e",
    surface: "#ffffff",
  },
  previewImage: "/assets/templates/garden-elegance.svg",
  accentImage: "/assets/invite/badr-sarah-1.jpeg",
  musicUrl: defaultTemplateMusicUrl,
  enabled: true,
  score: 93,
};

export const cinematicStoryTemplate: TemplateDefinition = {
  id: "tpl_cinematic_story",
  slug: "cinematic-story",
  name: "Cinematic Story",
  arabicName: "Cinematic Story",
  category: "قالب سينمائي داكن",
  style: "cinematic",
  concept: "دعوة سينمائية بخلفية زمرد داكن، صورة كاملة، أسماء كبيرة، كارت زجاجي، صور متراكبة وQR فاخر.",
  opening: "Cinematic photo story",
  layout: "Hero بصورة كاملة، بطاقة موعد وعد تنازلي، معرض صور متراكب، خريطة، مصور، RSVP وQR.",
  typography: "خطوط كبيرة وفاخرة بتباين أبيض وذهبي فوق خلفية زمردية داكنة مناسبة للموبايل.",
  palette: {
    primary: "#0a1110",
    secondary: "#131f1c",
    accent: "#d4af37",
    ink: "#e8efe5",
    surface: "#1a2e29",
  },
  previewImage: "/assets/templates/cinematic-story.svg",
  accentImage: "/assets/invite/badr-sarah-1.jpeg",
  musicUrl: defaultTemplateMusicUrl,
  enabled: true,
  score: 95,
};

export const invitationTemplates: TemplateDefinition[] = [
  royalEnvelopeTemplate,
  luxeNoirTemplate,
  ivoryArchesTemplate,
  mobileGoldTemplate,
  bohoChicTemplate,
  softGoldTemplate,
  gardenEleganceTemplate,
  cinematicStoryTemplate,
];

export function getTemplateBySlug(slug: string) {
  return invitationTemplates.find((template) => template.slug === slug);
}

export function getTemplateSortOrder(slug: string) {
  const index = invitationTemplates.findIndex((template) => template.slug === slug);
  return index >= 0 ? index + 1 : invitationTemplates.length + 1;
}

export const featuredTemplates = invitationTemplates;
