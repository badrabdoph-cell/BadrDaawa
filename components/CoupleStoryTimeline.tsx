"use client";

import { CalendarHeart, Heart } from "lucide-react";
import { isBrowserDisplayImageUrl } from "@/lib/image-formats";
import { normalizeCoupleStory } from "@/lib/invitation-texts";
import type { CoupleStoryItem } from "@/lib/types";
import { normalizeInternalAssetUrl } from "@/lib/utils";

function cleanStoryImage(value?: string) {
  const url = normalizeInternalAssetUrl(value);
  return url && isBrowserDisplayImageUrl(url) ? url : "";
}

export function CoupleStoryTimeline({ story }: { story?: CoupleStoryItem[] | null }) {
  const items = normalizeCoupleStory(story).map((item) => ({ ...item, imageUrl: cleanStoryImage(item.imageUrl) }));
  if (!items.length) return null;

  return (
    <section className="couple-story-timeline" aria-label="قصة العروسين">
      <div className="couple-story-head">
        <span>
          <Heart size={16} />
          قصة العروسين
        </span>
        <h2>رحلتنا قبل يوم الفرح</h2>
      </div>
      <div className="couple-story-list">
        {items.map((item, index) => (
          <article className={item.imageUrl ? "couple-story-item has-image" : "couple-story-item"} key={item.id || `${item.title}-${index}`}>
            <div className="couple-story-marker">
              <span>{index + 1}</span>
            </div>
            {item.imageUrl ? <img src={item.imageUrl} alt={item.title || `محطة ${index + 1} من قصة العروسين`} /> : null}
            <div className="couple-story-copy">
              {item.date ? (
                <time>
                  <CalendarHeart size={14} />
                  {item.date}
                </time>
              ) : null}
              {item.title ? <h3>{item.title}</h3> : null}
              {item.description ? <p>{item.description}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
