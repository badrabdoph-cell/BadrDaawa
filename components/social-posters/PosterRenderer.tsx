"use client";

import ClassicPoster, { type ClassicPosterProps } from "./ClassicPoster";
import SimplePoster from "./SimplePoster";
import WeddingPoster from "./WeddingPoster";
import { buildClassicPosterProps, getSharePosterTemplate, type SharePosterTemplateId } from "./poster-templates";

const POSTER_COMPONENTS: Record<string, React.ComponentType<ClassicPosterProps>> = {
  classic: ClassicPoster,
  simple: SimplePoster,
  news: WeddingPoster,
};

export interface PosterRendererProps extends ClassicPosterProps {
  selectedShareTemplate?: SharePosterTemplateId | string;
}

export default function PosterRenderer({ selectedShareTemplate = "classic", ...data }: PosterRendererProps) {
  const template = getSharePosterTemplate(selectedShareTemplate);
  const PosterComponent = POSTER_COMPONENTS[template.id] || ClassicPoster;
  const props = buildClassicPosterProps({ ...data, headline: data.headline || template.headline }, template.id);
  console.log("[PosterRenderer] Rendering:", { selectedShareTemplate, templateId: template.id, component: PosterComponent.name, propsKeys: Object.keys(props) });
  return <PosterComponent {...props} />;
}
