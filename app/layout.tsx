import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ScrollToTopOnRouteChange } from "@/components/ScrollToTopOnRouteChange";
import { CustomHeadInjector } from "@/components/CustomHeadInjector";
import { BroadcastModeGate } from "@/components/BroadcastModeGate";
import { SiteTextOverrideApplier } from "@/components/SiteTextOverrideApplier";
import { verifyAdminSessionCookie } from "@/lib/admin-session";
import { getPublishedSiteSettings } from "@/lib/site-settings";
import { getPublishedSiteTextOverrides } from "@/lib/site-text-overrides";
import { getMetadataBaseUrl } from "@/lib/utils";
import "./globals.css";

const ADMIN_SESSION_COOKIE = "bd_admin_session";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublishedSiteSettings();
  return {
    metadataBase: getMetadataBaseUrl(),
    title: {
      default: settings?.seo?.title,
      template: `%s | ${settings?.siteName || "BadrDaawa"}`,
    },
    description: settings?.seo?.description,
    keywords: settings?.seo?.keywords?.split(",").map((k) => k.trim()).filter(Boolean) || [],
    openGraph: {
      title: settings?.seo?.ogTitle,
      description: settings?.seo?.ogDescription,
      siteName: settings?.siteName || "BadrDaawa",
      locale: "ar_EG",
      type: "website",
      images: settings?.logoUrl ? [{ url: settings.logoUrl }] : undefined,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf7ef",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, textOverrides, requestHeaders] = await Promise.all([
    getPublishedSiteSettings(),
    getPublishedSiteTextOverrides().catch(() => ({})),
    headers(),
  ]);

  const isAdmin = await verifyAdminSessionCookie(requestHeaders.get("cookie") || "");
  const isMaintenanceActive = settings.maintenance.enabled && !isAdmin;

  if (isMaintenanceActive) {
    return (
      <html lang="ar" dir="rtl">
        <body>
          <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100dvh",
            padding: "24px",
            textAlign: "center",
            background: "linear-gradient(145deg, #1a1b1e, #0d0e12)",
            color: "#f5ead6",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>
            <div style={{ fontSize: "4rem", marginBottom: "8px" }}>🔧</div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 12px" }}>الموقع تحت الصيانة</h1>
            <p style={{ fontSize: "1.1rem", opacity: 0.8, maxWidth: "480px", lineHeight: 1.6, margin: 0 }}>
              {settings.maintenance.message}
            </p>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="ar" dir="rtl">
      <body>
        <CustomHeadInjector html={settings.customHeadHtml} />
        <ScrollToTopOnRouteChange />
        <ScrollReveal />
        <GlobalNotifications />
        <SiteTextOverrideApplier overrides={Object.values(textOverrides)} />
        {children}
        <BroadcastModeGate />
      </body>
    </html>
  );
}
