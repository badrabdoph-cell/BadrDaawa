import type { Metadata } from "next";
import { OrderSuccessRedirect } from "@/components/OrderSuccessRedirect";
import { getPublishedSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "دعوتك جاهزة للتجربة",
};

type PageProps = {
  searchParams?: Promise<{
    activationStatus?: "ready" | "pending";
    orderNumber?: string;
    invitationCode?: string;
  }>;
};

export default async function OrderSuccessPage({ searchParams }: PageProps) {
  const [params, settings] = await Promise.all([searchParams ? await searchParams : {}, getPublishedSiteSettings()]);
  return (
    <OrderSuccessRedirect
      activationStatus={params.activationStatus === "ready" ? "ready" : "pending"}
      orderNumber={params.orderNumber || ""}
      invitationCode={params.invitationCode || ""}
      supportUrl={settings.whatsappUrl || ""}
    />
  );
}
