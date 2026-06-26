"use client";

import ClassicPoster, { type ClassicPosterProps } from "./ClassicPoster";
import SimplePoster from "./SimplePoster";
import WeddingPoster from "./WeddingPoster";
import WeddingSharePosterClassic, { type WeddingSharePosterProps } from "./WeddingSharePosterClassic";
import { buildClassicPosterProps, getSharePosterTemplate, type SharePosterTemplateId } from "./poster-templates";

const POSTER_COMPONENTS: Record<string, React.ComponentType<ClassicPosterProps | WeddingSharePosterProps>> = {
  classic: ClassicPoster,
  simple: SimplePoster,
  news: WeddingPoster,
  wedding: WeddingSharePosterClassic,
};

export interface PosterRendererProps extends ClassicPosterProps {
  selectedShareTemplate?: SharePosterTemplateId | string;
}

export default function PosterRenderer({ selectedShareTemplate = "classic", ...data }: PosterRendererProps) {
  const template = getSharePosterTemplate(selectedShareTemplate);
  const PosterComponent = POSTER_COMPONENTS[template.id] || ClassicPoster;
  const props = buildClassicPosterProps({ ...data, headline: data.headline || template.headline }, template.id);
  return <PosterComponent {...props} />;
}
