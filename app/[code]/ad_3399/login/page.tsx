import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PendingInvitationNotice } from "@/components/PendingInvitationNotice";
import { getPendingOrderByInvitationCode } from "@/lib/order-request-links";

export const metadata: Metadata = {
  title: "دخول لوحة العميل",
};

export default async function CustomerLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ code }] = await Promise.all([params, searchParams]);
  const pendingOrder = await getPendingOrderByInvitationCode(code);
  if (pendingOrder) {
    return <PendingInvitationNotice variant="admin" code={pendingOrder.code} groomName={pendingOrder.groomName} brideName={pendingOrder.brideName} />;
  }

  redirect("/manage/invitation/invalid?reason=session");
}
