import { getSiteSettings } from "@/lib/site-settings";
import { getWhatsAppOrderUrl } from "@/lib/utils";
import { SiteHeaderClient } from "./SiteHeaderClient";

export async function SiteHeader() {
  const settings = await getSiteSettings();
  const supportUrl = settings.whatsappUrl || getWhatsAppOrderUrl("محتاج مساعدة في دعوة الفرح");

  return <SiteHeaderClient logoUrl={settings.logoUrl} siteName={settings.siteName} supportUrl={supportUrl} />;
}
