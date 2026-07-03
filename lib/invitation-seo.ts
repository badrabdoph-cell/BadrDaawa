import { cache } from "react";
import type { Metadata } from "next";
import { getInvitationByCode } from "./invitation-data";
import type { Invitation } from "./types";
import { formatArabicDate, getInvitationUrl, getMetadataBaseUrl, getSiteUrl } from "./utils";

export const getCachedInvitationByCode = cache(getInvitationByCode);

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, maxLength: number) {
  const clean = cleanText(value);
  return clean.length <= maxLength ? clean : `${clean.slice(0, maxLength - 1).trim()}…`;
}

function safeArabicDate(value: string) {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return formatArabicDate(value);
  } catch {
    return "";
  }
}

function absoluteUrl(value: string) {
  try {
    return new URL(value, `${getSiteUrl().replace(/\/$/, "")}/`).toString();
  } catch {
    return getSiteUrl();
  }
}

function getInvitationImage(invitation: Invitation, options: { postImageEnabled?: boolean } = {}) {
  const postImageEnabled = options.postImageEnabled !== false;
  const generatedPostImage = postImageEnabled && invitation.postImageStatus === "GENERATED" ? invitation.postImageOgUrl || invitation.postImageUrl : "";
  const candidate = generatedPostImage || invitation.heroPhoto || invitation.gallery.find(Boolean) || "/assets/brand/hero-luxury.png";
  return {
    url: absoluteUrl(candidate),
    width: generatedPostImage && invitation.postImageOgUrl ? invitation.postImageOgWidth || 1200 : generatedPostImage ? invitation.postImageWidth || 1080 : 1200,
    height: generatedPostImage && invitation.postImageOgUrl ? invitation.postImageOgHeight || 630 : generatedPostImage ? invitation.postImageHeight || 1350 : 630,
  };
}

export function getInvitationSeoMetadata(invitation: Invitation, options: { postImageEnabled?: boolean } = {}): Metadata {
  const coupleName = `${invitation.groomName} و ${invitation.brideName}`;
  const weddingDate = safeArabicDate(invitation.weddingDate);
  const location = [invitation.venue, invitation.city].filter(Boolean).join(" - ");
  const title = truncate(`دعوة زفاف ${coupleName}`, 58);
  const description = truncate(
    [
      `يسعدنا دعوتكم لحضور زفاف ${coupleName}`,
      weddingDate ? `يوم ${weddingDate}` : "",
      invitation.weddingTime ? `الساعة ${invitation.weddingTime}` : "",
      location ? `في ${location}` : "",
    ]
      .filter(Boolean)
      .join("، "),
    155,
  );
  const url = getInvitationUrl(invitation.code, invitation.customSlug);
  const image = getInvitationImage(invitation, options);
  const imageAlt = truncate(`دعوة زفاف ${coupleName}`, 120);

  return {
    metadataBase: getMetadataBaseUrl(),
    title,
    description,
    alternates: { canonical: url },
    robots: invitation.isActive && !invitation.disabledAt ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url,
      siteName: "BadrDaawa",
      locale: invitation.language === "en" ? "en_US" : "ar_EG",
      type: "website",
      images: [
        {
          url: image.url,
          width: image.width,
          height: image.height,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image.url],
    },
  };
}

export function getMissingInvitationSeoMetadata(): Metadata {
  return {
    metadataBase: getMetadataBaseUrl(),
    title: "دعوة غير موجودة",
    description: "تعذر العثور على رابط الدعوة المطلوب.",
    robots: { index: false, follow: false },
  };
}

export function getInvitationStructuredData(invitation: Invitation, options: { postImageEnabled?: boolean } = {}) {
  const coupleName = `${invitation.groomName} و ${invitation.brideName}`;
  const url = getInvitationUrl(invitation.code, invitation.customSlug);
  const startDate = invitation.weddingTime ? `${invitation.weddingDate.slice(0, 10)}T${invitation.weddingTime}` : invitation.weddingDate;
  const locationName = [invitation.venue, invitation.city].filter(Boolean).join(" - ");

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `دعوة زفاف ${coupleName}`,
    description: `يسعدنا دعوتكم لحضور زفاف ${coupleName}`,
    startDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    image: [getInvitationImage(invitation, options).url],
    url,
    location: locationName
      ? {
          "@type": "Place",
          name: locationName,
          address: locationName,
        }
      : undefined,
    organizer: {
      "@type": "Organization",
      name: "BadrDaawa",
      url: getSiteUrl(),
    },
  };
}
