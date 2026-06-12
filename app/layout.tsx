import type { Metadata, Viewport } from "next";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ScrollToTopOnRouteChange } from "@/components/ScrollToTopOnRouteChange";
import { getSiteSettings } from "@/lib/site-settings";
import { getMetadataBaseUrl } from "@/lib/utils";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: getMetadataBaseUrl(),
    title: {
      default: settings.seo.title,
      template: `%s | ${settings.siteName}`,
    },
    description: settings.seo.description,
    keywords: settings.seo.keywords
      .split(",")
      .map((keyword) => keyword.trim())
      .filter(Boolean),
    openGraph: {
      title: settings.seo.ogTitle,
      description: settings.seo.ogDescription,
      siteName: settings.siteName,
      locale: "ar_EG",
      type: "website",
      images: settings.logoUrl ? [{ url: settings.logoUrl }] : undefined,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf7ef",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <ScrollToTopOnRouteChange />
        <ScrollReveal />
        <GlobalNotifications />
        {children}
      </body>
    </html>
  );
}
