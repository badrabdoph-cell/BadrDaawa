import { PendingInvitationNotice } from "@/components/PendingInvitationNotice";
import { getPendingOrderByInvitationCode } from "@/lib/order-request-links";
import { getPublishedSiteSettings } from "@/lib/site-settings";
import { redirect } from "next/navigation";

export default async function CustomerAdminLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ code }] = await Promise.all([params, searchParams]);
  const pendingOrder = await getPendingOrderByInvitationCode(code);
  if (pendingOrder) {
    const siteSettings = await getPublishedSiteSettings();
    return <PendingInvitationNotice variant="admin" code={pendingOrder.code} groomName={pendingOrder.groomName} brideName={pendingOrder.brideName} whatsappUrl={siteSettings.whatsappUrl} submittedAt={pendingOrder.submittedAt} />;
  }

  redirect("/manage/invitation/invalid?reason=session");
}
