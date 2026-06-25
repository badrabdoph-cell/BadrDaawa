"use client";

import ClassicPoster, { type ClassicPosterProps } from "./ClassicPoster";
import { buildClassicPosterProps, getSharePosterTemplate, type SharePosterTemplateId } from "./poster-templates";

export interface PosterRendererProps extends ClassicPosterProps {
  selectedShareTemplate?: SharePosterTemplateId | string;
}

export default function PosterRenderer({ selectedShareTemplate = "classic", ...data }: PosterRendererProps) {
  const template = getSharePosterTemplate(selectedShareTemplate);
  return <ClassicPoster {...buildClassicPosterProps({ ...data, headline: data.headline || template.headline }, template.id)} />;
}
