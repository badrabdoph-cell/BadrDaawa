"use client";

import { CalendarHeart, Heart } from "lucide-react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import { isBrowserDisplayImageUrl } from "@/lib/image-formats";
import { normalizeCoupleStory } from "@/lib/invitation-texts";
import type { CoupleStoryItem, Language } from "@/lib/types";
import { normalizeInternalAssetUrl } from "@/lib/utils";

function cleanStoryImage(value?: string) {
  const url = normalizeInternalAssetUrl(value);
  return url && isBrowserDisplayImageUrl(url) ? url : "";
}

export function CoupleStoryTimeline({ story, locale = "ar" }: { story?: CoupleStoryItem[] | null; locale?: Language }) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const items = normalizeCoupleStory(story).map((item) => ({ ...item, imageUrl: cleanStoryImage(item.imageUrl) }));
  if (!items.length) return null;

  return (
    <section className="couple-story-timeline" aria-label={t("invitation.coupleStory.label")}>
      <div className="couple-story-head">
        <span>
          <Heart size={16} />
          {t("invitation.coupleStory.label")}
        </span>
        <h2>{t("invitation.coupleStory.title")}</h2>
      </div>
      <div className="couple-story-list">
        {items.map((item, index) => (
          <article className={item.imageUrl ? "couple-story-item has-image" : "couple-story-item"} key={item.id || `${item.title}-${index}`}>
            <div className="couple-story-marker">
              <span>{index + 1}</span>
            </div>
            {item.imageUrl ? <img src={item.imageUrl} alt={item.title || t("invitation.coupleStory.itemAlt", { number: index + 1 })} /> : null}
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
