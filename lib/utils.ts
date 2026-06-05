import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatArabicDate(date: string) {
  return new Intl.DateTimeFormat("ar-EG-u-nu-latn", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatArabicNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export function getInvitationUrl(code: string) {
  return `${getSiteUrl().replace(/\/$/, "")}/${code}`;
}

export function normalizePhoneForWhatsApp(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("1")) return `20${digits}`;
  return digits;
}

export function getWhatsAppOrderUrl(message: string) {
  const phone = process.env.WHATSAPP_ORDER_PHONE || "01011511561";
  return `https://wa.me/${normalizePhoneForWhatsApp(phone)}?text=${encodeURIComponent(message)}`;
}

export function calculateAttendance(guests: { attendees: number; status: string }[]) {
  return guests.reduce(
    (summary, guest) => {
      summary.totalResponses += 1;
      if (guest.status === "confirmed") {
        summary.confirmedGuests += guest.attendees;
      } else {
        summary.declinedGuests += guest.attendees;
      }
      return summary;
    },
    { totalResponses: 0, confirmedGuests: 0, declinedGuests: 0 },
  );
}
