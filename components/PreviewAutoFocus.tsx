"use client";

import { useEffect } from "react";

type PreviewFocus =
  | "template"
  | "couple"
  | "event"
  | "venue"
  | "photos"
  | "music"
  | "story"
  | "photographer"
  | "review";

const focusSelectors: Record<PreviewFocus, string[]> = {
  template: ["main", ".client-invitation-body", ".template-color-scope"],
  couple: ["h1", "[class*='name']", "[class*='hero']", "[class*='story']"],
  event: ["[class*='countdown']", "[class*='date']", "time"],
  venue: ["[class*='map']", ".map-card", "[class*='venue']"],
  photos: [".interactive-gallery", "[class*='gallery']", "[class*='photo']"],
  music: ["main", ".client-invitation-body", ".template-color-scope"],
  story: [".couple-story-timeline", "[class*='timeline']", "article[class*='story']"],
  photographer: ["[class*='photographer']"],
  review: ["main", ".client-invitation-body", ".template-color-scope"],
};

function isPreviewFocus(value?: string): value is PreviewFocus {
  return Boolean(value && value in focusSelectors);
}

export function PreviewAutoFocus({ focus }: { focus?: string }) {
  useEffect(() => {
    if (!isPreviewFocus(focus)) return;

    const timeoutId = window.setTimeout(() => {
      const selectors = focusSelectors[focus];
      const target = selectors.map((selector) => document.querySelector<HTMLElement>(selector)).find(Boolean);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 280);

    return () => window.clearTimeout(timeoutId);
  }, [focus]);

  return null;
}
