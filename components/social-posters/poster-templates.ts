import type { ClassicPosterProps } from "./ClassicPoster";

export type SharePosterTemplateId = "classic";

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
