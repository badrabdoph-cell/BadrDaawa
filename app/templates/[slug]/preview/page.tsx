import { notFound } from "next/navigation";
import { InvitationExperience } from "@/components/InvitationExperience";
import { getTemplateBySlug } from "@/lib/templates";
import type { Invitation } from "@/lib/types";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function TemplatePreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) notFound();

  const invitation: Invitation = {
    id: `preview-${template.slug}`,
    code: `preview-${template.slug}`,
    templateSlug: template.slug,
    language: "ar",
    groomName: "بدر",
    brideName: "سارة",
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

  return <InvitationExperience invitation={invitation} template={template} />;
}
