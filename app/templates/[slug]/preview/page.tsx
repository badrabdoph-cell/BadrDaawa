import { notFound } from "next/navigation";
import { InvitationExperience } from "@/components/InvitationExperience";
import { getTemplateWithSettings } from "@/lib/template-settings";
import type { Invitation } from "@/lib/types";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ silentPreview?: string; embed?: string }>;
};

export default async function TemplatePreviewPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const template = await getTemplateWithSettings(slug);
  if (!template) notFound();

  const invitation: Invitation = {
    id: `preview-${template.slug}`,
    code: `preview-${template.slug}`,
    templateSlug: template.slug,
    language: "ar",
    groomName: "بدر",
    brideName: "Sara",
    weddingDate: "2026-10-26",
    weddingTime: "07:00 مساءً",
    venue: "قاعة رويال",
    city: "البحيرة",
    mapUrl: "https://maps.google.com/?q=Royal+Hall+Beheira",
    heroPhoto: "/assets/invite/badr-sarah-1.jpeg",
    gallery: ["/assets/invite/badr-sarah-1.jpeg", "/assets/invite/badr-sarah-2.jpeg", "/assets/invite/badr-sarah-3.jpeg"],
    musicUrl: "",
    isActive: true,
    views: 0,
    customerId: "preview",
  };

  const isSilentPreview = query?.silentPreview === "1" || query?.embed === "1";

  return <InvitationExperience invitation={invitation} template={template} disableMusic={isSilentPreview} />;
}
