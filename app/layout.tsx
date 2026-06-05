import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://BadrDaawa.com"),
  title: {
    default: "BadrDaawa | دعوات زفاف رقمية فاخرة",
    template: "%s | BadrDaawa",
  },
  description: "منصة عربية فاخرة لإنشاء دعوات زفاف رقمية، RSVP، QR Code، ولوحات متابعة للحضور.",
  keywords: ["دعوة فرح", "دعوات زفاف رقمية", "RSVP", "QR Code", "BadrDaawa"],
  openGraph: {
    title: "BadrDaawa | دعوة فرحك بشكل يليق بفرحتك",
    description: "دعوة زفاف رقمية فاخرة بقالب Royal Envelope وصفحة خاصة بكل عميل مع متابعة حضور كاملة.",
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
      <body>{children}</body>
    </html>
  );
}
