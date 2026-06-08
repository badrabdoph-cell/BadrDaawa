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

function getInvitationImage(invitation: Invitation) {
  const candidate = invitation.heroPhoto || invitation.gallery.find(Boolean) || "/assets/brand/hero-luxury.png";
  return absoluteUrl(candidate);
}

export function getInvitationSeoMetadata(invitation: Invitation): Metadata {
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
  const imageUrl = getInvitationImage(invitation);
  const imageAlt = truncate(`دعوة زفاف ${coupleName}`, 120);

  return {
    metadataBase: getMetadataBaseUrl(),
    title,
    description,
    alternates: { canonical: url },
    robots: invitation.isActive ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url,
      siteName: "BadrDaawa",
      locale: invitation.language === "en" ? "en_US" : "ar_EG",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
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
