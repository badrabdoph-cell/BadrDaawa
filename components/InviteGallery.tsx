"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { getInvitationTranslator, resolveLocale } from "@/lib/i18n";
import type { Language } from "@/lib/types";

export type InviteGalleryStory = {
  title?: string;
  description?: string;
};

type InviteGalleryProps = {
  images: string[];
  stories?: InviteGalleryStory[];
  locale?: Language;
  className?: string;
  label?: string;
  altPrefix?: string;
};

const InviteGalleryStoryContext = createContext<{ images: string[]; stories: InviteGalleryStory[]; heroVideoUrl?: string }>({ images: [], stories: [] });

export function InviteGalleryStoryProvider({ images, stories, heroVideoUrl, children }: { images: string[]; stories?: InviteGalleryStory[] | null; heroVideoUrl?: string; children: ReactNode }) {
  const value = useMemo(() => ({ images: images.filter(Boolean), stories: stories || [], heroVideoUrl }), [images, stories, heroVideoUrl]);
  return <InviteGalleryStoryContext.Provider value={value}>{children}</InviteGalleryStoryContext.Provider>;
}

const SINGLE_IMAGE_CLASSES = new Set([
  "artdeco-photo",
  "boho-sand-cover",
  "botanical-cover-photo",
  "fairytale-photo",
  "magazine-photo",
  "neon-cover",
  "ocean-photo",
  "pure-white-cover",
  "royal-gold-cover",
  "vintage-photo",
]);

function hasClass(className: string, target: string) {
  return className.split(/\s+/).includes(target);
}

function shouldShowSingleImage(className: string) {
  return className.split(/\s+/).some((name) => SINGLE_IMAGE_CLASSES.has(name));
}

function getFigureClassName(className: string, index: number) {
  if (hasClass(className, "featured-gallery")) {
    return index === 1 ? "featured-photo-card" : "featured-arch-card";
  }

  return undefined;
}

export function InviteGallery({ images, locale = "ar", className = "", label, altPrefix = "صورة من الدعوة" }: InviteGalleryProps) {
  const t = getInvitationTranslator(resolveLocale(locale));
  const storyContext = useContext(InviteGalleryStoryContext);
  const cleanImages = useMemo(() => images.filter(Boolean), [images]);
  const visibleImages = shouldShowSingleImage(className) ? cleanImages.slice(0, 1) : cleanImages;

  if (!visibleImages.length) return null;

  return (
    <section className={["interactive-gallery", "is-static-gallery", className].filter(Boolean).join(" ")} aria-label={label || t("invitation.galleryLabel")}>
      {visibleImages.map((image, index) => {
        const videoUrl = index === 0 && storyContext.images[0] === image ? storyContext.heroVideoUrl || "" : "";
        const figureClassName = getFigureClassName(className, index);

        return (
          <figure className={figureClassName} key={`${image}-${index}`}>
            {videoUrl ? (
              <video className="invite-hero-video" src={videoUrl} poster={image} muted loop playsInline autoPlay preload="metadata" data-invite-parallax data-invite-parallax-strength="0.72" />
            ) : (
              <img src={image} alt={`${altPrefix} ${index + 1}`} loading={index === 0 ? "eager" : "lazy"} decoding="async" draggable={false} data-invite-parallax data-invite-parallax-strength="0.72" />
            )}
            {figureClassName === "featured-photo-card" ? <span aria-hidden="true" /> : null}
          </figure>
        );
      })}
    </section>
  );
}
