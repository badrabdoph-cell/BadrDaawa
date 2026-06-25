import type { ClassicPosterProps } from "./ClassicPoster";

export type SharePosterTemplateId = "classic" | "classic-news" | "classic-romantic";

export type SharePosterTemplateDefinition = {
  id: SharePosterTemplateId;
  name: string;
  description: string;
  headline: string;
};

export const SHARE_POSTER_TEMPLATES: SharePosterTemplateDefinition[] = [
  {
    id: "classic",
    name: "Classic Poster",
    description: "تصميم كلاسيكي أنيق للنشر على واتساب وإنستجرام وفيسبوك.",
    headline: "خبر عاجل!!!",
  },
  {
    id: "classic-news",
    name: "News Style",
    description: "ستايل خبر عاجل بإبراز قوي للعروسين والتاريخ.",
    headline: "فرحنا قرب!!",
  },
  {
    id: "classic-romantic",
    name: "Romantic Edition",
    description: "نسخة رومانسية ناعمة بنفس التكوين الكلاسيكي.",
    headline: "موعدنا قرب!!",
  },
];

export function getSharePosterTemplate(id?: string) {
  return SHARE_POSTER_TEMPLATES.find((template) => template.id === id) || SHARE_POSTER_TEMPLATES[0];
}

export function buildClassicPosterProps(data: ClassicPosterProps, templateId?: string): ClassicPosterProps {
  const template = getSharePosterTemplate(templateId);
  return {
    ...data,
    headline: data.headline || template.headline,
  };
}
