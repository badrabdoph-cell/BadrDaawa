import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitationExperience } from "@/components/InvitationExperience";
import { getInvitationByCode } from "@/lib/demo-data";
import { getTemplateBySlug } from "@/lib/templates";
import { getInvitationUrl } from "@/lib/utils";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const invitation = getInvitationByCode(code);
  if (!invitation) {
    return { title: "دعوة غير موجودة" };
  }
  return {
    title: `دعوة ${invitation.groomName} و ${invitation.brideName}`,
    description: `يشرفنا حضوركم فرح ${invitation.groomName} و ${invitation.brideName}`,
    alternates: { canonical: getInvitationUrl(invitation.code) },
  };
}

export default async function InvitationPage({ params }: PageProps) {
  const { code } = await params;
  const invitation = getInvitationByCode(code);
  if (!invitation || !invitation.isActive) {
    notFound();
  }

  const template = getTemplateBySlug(invitation.templateSlug);
  if (!template) {
    notFound();
  }

  return <InvitationExperience invitation={invitation} template={template} />;
}
