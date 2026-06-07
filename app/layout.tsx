import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { GlobalNotifications } from "@/components/GlobalNotifications";
import { ScrollToTopOnRouteChange } from "@/components/ScrollToTopOnRouteChange";
import { getMetadataBaseUrl } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: {
    default: "BadrDaawa | دعوات زفاف رقمية فاخرة",
    template: "%s | BadrDaawa",
  },
  description: "منصة عربية فاخرة لإنشاء دعوات زفاف رقمية، RSVP، QR Code، ولوحات متابعة للحضور.",
  keywords: ["دعوة فرح", "دعوات زفاف رقمية", "RSVP", "QR Code", "BadrDaawa"],
  openGraph: {
    title: "BadrDaawa | الجيل الجديد من دعوات الزفاف بدأ هنا",
    description: "دعوة رقمية أنيقة وسهلة المشاركة مع ضيوفك، مع RSVP وQR Code ولوحة متابعة مباشرة.",
    siteName: "BadrDaawa",
    locale: "ar_EG",
    type: "website",
  },
};

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
        <Suspense fallback={null}>
          <GlobalNotifications />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
