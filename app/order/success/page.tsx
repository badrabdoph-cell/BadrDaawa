import type { Metadata } from "next";
import { OrderSuccessRedirect } from "@/components/OrderSuccessRedirect";

export const metadata: Metadata = {
  title: "تم إرسال طلب الدعوة",
};

type PageProps = {
  searchParams?: Promise<{
    whatsappUrl?: string;
    orderNumber?: string;
    invitationCode?: string;
  }>;
};

export default async function OrderSuccessPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  return <OrderSuccessRedirect fallbackWhatsappUrl={params.whatsappUrl || ""} orderNumber={params.orderNumber || ""} invitationCode={params.invitationCode || ""} />;
}
