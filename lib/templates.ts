import type { TemplateDefinition } from "./types";

export const defaultTemplateMusicUrl = "/assets/audio/badr-sara-wedding-3.mp3";

export const featuredOneTemplate: TemplateDefinition = {
  id: "tpl_featured_one",
  slug: "featured-1",
  name: "Featured 1",
  arabicName: "مميز 1",
  category: "كوكتيل مميز",
  style: "featured",
  concept: "قالب مميز يجمع واجهة سينمائية فاخرة، جدول تفاصيل هادئ، صور رومانسية، ومصور ناعم في تجربة واحدة.",
  opening: "Cinematic photo story",
  layout: "Hero بصورة كاملة وأسماء سينمائية، جدول اليوم والقاعة، عداد أفقي، صور رومانسية، خريطة، مصور، RSVP وQR.",
  typography: "أسماء كبيرة بتباين سينمائي مع تفاصيل عربية واضحة ومريحة للقراءة على الهاتف.",
  palette: {
    primary: "#0a1110",
    secondary: "#fdfbf7",
    accent: "#d4af37",
    ink: "#f7efe1",
    surface: "#fffaf4",
  },
  previewImage: "/assets/templates/featured-1.svg",
  accentImage: "/assets/invite/badr-sarah-1.jpeg",
  musicUrl: defaultTemplateMusicUrl,
  enabled: true,
  score: 100,
};

export const etherealGlassTemplate: TemplateDefinition = {
  id: "tpl_ethereal_glass",
  slug: "ethereal-glass",
  name: "Ethereal Glass",
  arabicName: "زجاجي حالم",
  category: "قالب زجاجي رومانسي",
  style: "glass",
  concept: "خلفية صورة ثابتة مع بطاقات زجاجية شفافة، معرض صور متداخل، وتفاصيل ناعمة كأنها عائمة فوق الصورة.",
  opening: "Fixed glass photo story",
  layout: "خلفية ثابتة، أسماء كبيرة، بطاقة تفاصيل زجاجية، معرض متداخل، خريطة، مصور، RSVP وQR.",
  typography: "أسماء رومانسية كبيرة مع نصوص بيضاء شفافة وتباين زجاجي واضح على الهاتف.",
  palette: {
    primary: "#111111",
    secondary: "#ffffff",
    accent: "#ffffff",
    ink: "#ffffff",
    surface: "#ffffff",
  },
  previewImage: "/assets/templates/ethereal-glass.svg",
  accentImage: "/assets/invite/badr-sarah-3.jpeg",
  musicUrl: defaultTemplateMusicUrl,
  enabled: true,
  score: 94,
};

export const botanicalThemeTemplate: TemplateDefinition = {
  id: "tpl_botanical_theme",
  slug: "botanical-theme",
  name: "Botanical Theme",
  arabicName: "نباتي هادئ",
  category: "قالب نباتي هادئ",
  style: "garden",
  concept: "دعوة خضراء ناعمة بكارت أسماء مقوس، عداد داكن، صورة كبيرة، خريطة واضحة، ولمسة تصوير طبيعية.",
  opening: "Soft botanical card",
  layout: "كارت أسماء نباتي، عداد، صورة غلاف، خريطة، مصور، RSVP وQR.",
  typography: "أسماء كبيرة رقيقة مع ألوان خضراء مطفية وتفاصيل عربية بسيطة ومريحة على الهاتف.",
  palette: {
    primary: "#f0f4f0",
    secondary: "#e2e8e2",
    accent: "#8fbc8f",
    ink: "#2c4c3b",
    surface: "#ffffff",
  },
  previewImage: "/assets/templates/botanical-theme.svg",
  accentImage: "/assets/invite/badr-sarah-1.jpeg",
  musicUrl: defaultTemplateMusicUrl,
  enabled: true,
  score: 93,
};

export const bohoSandTemplate: TemplateDefinition = {
  id: "tpl_boho_sand",
  slug: "boho-sand",
  name: "Boho Sand",
  arabicName: "بوهو رملي",
  category: "قالب بوهو دافئ",
  style: "boho",
  concept: "دعوة بوهو هادئة بألوان رملية، صورة مقوسة، أسماء بسيطة، شريط موعد ناعم، وخريطة مريحة.",
  opening: "Warm boho portrait",
  layout: "صورة مقوسة، أسماء واضحة، موعد داخل كبسولة، عداد، خريطة، RSVP وQR.",
  typography: "خطوط كبيرة ناعمة مع ألوان دافئة ومساحات بسيطة تناسب الهاتف.",
  palette: {
    primary: "#faf3e0",
    secondary: "#e8c39e",
    accent: "#8b4513",
    ink: "#8b4513",
    surface: "#ffffff",
  },
  previewImage: "/assets/templates/boho-sand.svg",
  accentImage: "/assets/invite/badr-sarah-1.jpeg",
  musicUrl: defaultTemplateMusicUrl,
  enabled: true,
  score: 92,
};

export const vintageThemeTemplate: TemplateDefinition = {
  id: "tpl_vintage_theme",
  slug: "vintage-theme",
  name: "Vintage Classic",
  arabicName: "ڤينتاج كلاسيكي",
  category: "قالب ڤينتاج ورقي",
  style: "vintage",
  concept: "دعوة بطابع ورقي قديم، حدود مزدوجة، صورة سيبيا، كروت كلاسيكية، وخريطة وQR بأسلوب تذكاري.",
  opening: "Vintage paper keepsake",
  layout: "بطاقة أسماء ورقية، صورة سيبيا، عداد، خريطة، RSVP وQR.",
  typography: "خطوط كلاسيكية دافئة مع ملمس ورقي وتفاصيل بنية هادئة تناسب الهاتف.",
  palette: {
    primary: "#efe9d9",
    secondary: "#f5f0e1",
    accent: "#5d4037",
    ink: "#3e2723",
    surface: "#f5f0e1",
  },
  previewImage: "/assets/templates/vintage-theme.svg",
  accentImage: "/assets/invite/badr-sarah-1.jpeg",
  musicUrl: defaultTemplateMusicUrl,
  enabled: true,
  score: 91,
};

export const bohoChicTemplate: TemplateDefinition = {
  id: "tpl_boho_chic",
  slug: "boho-chic",
  name: "Boho Trendy",
  arabicName: "بوهو ترندي",
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
  arabicName: "حدائق أنيقة",
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

export const invitationTemplates: TemplateDefinition[] = [
  featuredOneTemplate,
  vintageThemeTemplate,
  etherealGlassTemplate,
  botanicalThemeTemplate,
  bohoSandTemplate,
  bohoChicTemplate,
  gardenEleganceTemplate,
];

export function getTemplateBySlug(slug: string) {
  return invitationTemplates.find((template) => template.slug === slug);
}

export function getTemplateSortOrder(slug: string) {
  const index = invitationTemplates.findIndex((template) => template.slug === slug);
  return index >= 0 ? index + 1 : invitationTemplates.length + 1;
}

export const featuredTemplates = invitationTemplates;
