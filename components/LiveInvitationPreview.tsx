"use client";

import { useEffect, useState } from "react";
import { isBrowserDisplayImageUrl } from "@/lib/image-formats";
import { normalizeInvitationTexts } from "@/lib/invitation-texts";
import type { Invitation, TemplateDefinition } from "@/lib/types";
import { InvitationExperience } from "./InvitationExperience";

type PreviewPhotographer = {
  enabled?: boolean;
  name?: string;
  logoUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
};

export type LiveInvitationPreviewPayload = {
  groomName?: string;
  brideName?: string;
  weddingDate?: string;
  weddingTime?: string;
  venue?: string;
  city?: string;
  mapUrl?: string;
  gallery?: string[];
  musicUrl?: string;
  musicEnabled?: boolean;
  disableMusic?: boolean;
  texts?: Invitation["texts"];
  photographer?: PreviewPhotographer;
};

type LivePreviewMessage = {
  source?: string;
  type?: string;
  payload?: LiveInvitationPreviewPayload;
};

function cleanText(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : fallback;
}

function cleanDate(value: unknown, fallback: string) {
  const clean = cleanText(value);
  return clean && !Number.isNaN(Date.parse(clean)) ? clean : fallback;
}

function cleanImageUrl(value: unknown) {
  const clean = cleanText(value);
  return clean && isBrowserDisplayImageUrl(clean) ? clean : "";
}

function cleanGallery(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const gallery = value.map(cleanImageUrl).filter(Boolean).slice(0, 3);
  return gallery.length ? gallery : [];
}

function cleanAudioUrl(value: unknown) {
  const clean = cleanText(value);
  if (!clean) return "";
  if (clean.startsWith("/uploads/music/")) return /\.(mp3|wav|ogg|webm|m4a|aac|mp4|aif|aiff|flac)(?:[?#].*)?$/i.test(clean) ? clean : "";
  if (!/^https?:\/\//i.test(clean)) return "";

  try {
    const url = new URL(clean);
    return /\.(mp3|wav|ogg|webm|m4a|aac|mp4|aif|aiff|flac)(?:[?#].*)?$/i.test(url.pathname + url.search) ? url.toString() : "";
  } catch {
    return "";
  }
}

function applyPayload(invitation: Invitation, payload: LiveInvitationPreviewPayload) {
  const gallery = cleanGallery(payload.gallery, invitation.gallery);
  const musicEnabled = payload.musicEnabled ?? invitation.musicEnabled;
  const musicUrl = musicEnabled ? cleanAudioUrl(payload.musicUrl) || invitation.musicUrl || "" : "";
  const photographer = payload.photographer
    ? {
        enabled: Boolean(payload.photographer.enabled),
        name: cleanText(payload.photographer.name, "المصور الفوتوغرافي"),
        logoUrl: cleanImageUrl(payload.photographer.logoUrl),
        facebookUrl: cleanText(payload.photographer.facebookUrl, "https://www.facebook.com/"),
        instagramUrl: cleanText(payload.photographer.instagramUrl, "https://www.instagram.com/"),
      }
    : invitation.photographer;

  return {
    ...invitation,
    groomName: cleanText(payload.groomName, invitation.groomName),
    brideName: cleanText(payload.brideName, invitation.brideName),
    weddingDate: cleanDate(payload.weddingDate, invitation.weddingDate),
    weddingTime: cleanText(payload.weddingTime, invitation.weddingTime),
    venue: cleanText(payload.venue, invitation.venue),
    city: cleanText(payload.city, invitation.city),
    mapUrl: cleanText(payload.mapUrl, invitation.mapUrl),
    heroPhoto: gallery[0] || invitation.heroPhoto,
    gallery,
    musicUrl,
    musicEnabled,
    texts: normalizeInvitationTexts(payload.texts || invitation.texts),
    photographer,
  };
}

export function LiveInvitationPreview({
  invitation,
  template,
  disableMusic,
}: {
  invitation: Invitation;
  template: TemplateDefinition;
  disableMusic?: boolean;
}) {
  const [previewInvitation, setPreviewInvitation] = useState(invitation);
  const [previewDisableMusic, setPreviewDisableMusic] = useState(disableMusic);

  useEffect(() => {
    setPreviewInvitation(invitation);
    setPreviewDisableMusic(disableMusic);
  }, [disableMusic, invitation]);

  useEffect(() => {
    function onMessage(event: MessageEvent<LivePreviewMessage>) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== "badr-admin-preview" || event.data.type !== "preview:update" || !event.data.payload) return;
      const payload = event.data.payload;
      setPreviewInvitation((current) => applyPayload(current, payload));
      if (typeof payload.disableMusic === "boolean") setPreviewDisableMusic(payload.disableMusic);
    }

    window.addEventListener("message", onMessage);
    window.parent.postMessage({ source: "badr-admin-preview", type: "preview:ready" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return <InvitationExperience invitation={previewInvitation} template={template} disableMusic={previewDisableMusic} />;
}
