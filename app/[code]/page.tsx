import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvitationExperience } from "@/components/InvitationExperience";
import { getInvitationByCode, recordInvitationView } from "@/lib/invitation-data";
import { getTemplateWithSettings } from "@/lib/template-settings";
import { getInvitationUrl } from "@/lib/utils";

type PageProps = {
  params: Promise<{ code: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const invitation = await getInvitationByCode(code);
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
  const invitation = await getInvitationByCode(code);
  if (!invitation || !invitation.isActive) {
    notFound();
  }

  const template = await getTemplateWithSettings(invitation.templateSlug);
  if (!template) {
    notFound();
  }

  await recordInvitationView(invitation.code);

  return <InvitationExperience invitation={invitation} template={template} />;
}
