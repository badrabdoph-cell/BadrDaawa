import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";

export type CountryCode = string;

export interface CountryData {
  code: CountryCode;
  dialCode: string;
  name: string;
  flag: string;
}

export const ARAB_COUNTRIES: CountryData[] = [
  { code: "EG", dialCode: "20", name: "مصر", flag: "🇪🇬" },
  { code: "SA", dialCode: "966", name: "السعودية", flag: "🇸🇦" },
  { code: "AE", dialCode: "971", name: "الإمارات", flag: "🇦🇪" },
  { code: "KW", dialCode: "965", name: "الكويت", flag: "🇰🇼" },
  { code: "QA", dialCode: "974", name: "قطر", flag: "🇶🇦" },
  { code: "OM", dialCode: "968", name: "عمان", flag: "🇴🇲" },
  { code: "BH", dialCode: "973", name: "البحرين", flag: "🇧🇭" },
  { code: "JO", dialCode: "962", name: "الأردن", flag: "🇯🇴" },
  { code: "LB", dialCode: "961", name: "لبنان", flag: "🇱🇧" },
  { code: "IQ", dialCode: "964", name: "العراق", flag: "🇮🇶" },
  { code: "SY", dialCode: "963", name: "سوريا", flag: "🇸🇾" },
  { code: "PS", dialCode: "970", name: "فلسطين", flag: "🇵🇸" },
  { code: "YE", dialCode: "967", name: "اليمن", flag: "🇾🇪" },
  { code: "LY", dialCode: "218", name: "ليبيا", flag: "🇱🇾" },
  { code: "TN", dialCode: "216", name: "تونس", flag: "🇹🇳" },
  { code: "DZ", dialCode: "213", name: "الجزائر", flag: "🇩🇿" },
  { code: "MA", dialCode: "212", name: "المغرب", flag: "🇲🇦" },
  { code: "MR", dialCode: "222", name: "موريتانيا", flag: "🇲🇷" },
  { code: "SD", dialCode: "249", name: "السودان", flag: "🇸🇩" },
  { code: "DJ", dialCode: "253", name: "جيبوتي", flag: "🇩🇯" },
  { code: "SO", dialCode: "252", name: "الصومال", flag: "🇸🇴" },
  { code: "KM", dialCode: "269", name: "جزر القمر", flag: "🇰🇲" },
];

export const DEFAULT_COUNTRY = ARAB_COUNTRIES[0];

export function getCountryByCode(code: string): CountryData | undefined {
  return ARAB_COUNTRIES.find((c) => c.code === code);
}

export function formatToE164(phone: string, countryCode: string): string {
  const digits = phone.replace(/[^\d]/g, "");

  if (!digits) return "";

  if (countryCode === "EG") {
    if (digits.startsWith("010") && digits.length === 11) {
      return `+20${digits.slice(1)}`;
    }
    if (digits.startsWith("10") && digits.length === 10) {
      return `+20${digits}`;
    }
    if (digits.length === 11 && digits.startsWith("01")) {
      return `+20${digits.slice(1)}`;
    }
    if (digits.length === 10) {
      return `+20${digits}`;
    }
  }

  try {
    const parsed = parsePhoneNumberFromString(digits, countryCode as any);
    if (parsed?.isValid()) {
      return parsed.format("E.164");
    }
  } catch {}

  const country = getCountryByCode(countryCode);
  if (country) {
    if (digits.startsWith("00")) return `+${digits.slice(2)}`;
    if (digits.startsWith(country.dialCode)) return `+${digits}`;
    return `+${country.dialCode}${digits}`;
  }

  return `+${digits}`;
}

export function parseE164(e164: string): { national: string; country: CountryData | undefined } {
  const cleaned = e164.replace(/[^\d+]/g, "");

  try {
    const parsed = parsePhoneNumberFromString(cleaned);
    if (parsed) {
      const country = getCountryByCode(parsed.country || "");
      return { national: parsed.format("NATIONAL"), country };
    }
  } catch {}

  const digits = cleaned.replace(/\D/g, "");
  for (const c of ARAB_COUNTRIES) {
    if (digits.startsWith(c.dialCode)) {
      const national = digits.slice(c.dialCode.length);
      return { national, country: c };
    }
  }

  return { national: cleaned, country: undefined };
}

export function validatePhone(
  phone: string,
  countryCode: string,
): { valid: boolean; e164?: string; error?: string } {
  const digits = phone.replace(/[^\d]/g, "");

  if (!digits) {
    return { valid: false, error: "رقم الهاتف مطلوب" };
  }

  if (countryCode === "EG") {
    const startsWith01 = digits.startsWith("01") && digits.length === 11;
    const startsWith1 = digits.startsWith("10") && digits.length === 10;
    if (!startsWith01 && !startsWith1) {
      return { valid: false, error: "رقم الهاتف غير صحيح" };
    }
    const e164 = digits.startsWith("10") ? `+20${digits}` : `+20${digits.slice(1)}`;
    return { valid: true, e164 };
  }

  try {
    if (isValidPhoneNumber(digits, countryCode as any)) {
      const parsed = parsePhoneNumberFromString(digits, countryCode as any);
      if (parsed) {
        return { valid: true, e164: parsed.format("E.164") };
      }
    }
    return { valid: false, error: "رقم الهاتف غير صحيح للدولة المحددة" };
  } catch {
    return { valid: false, error: "رقم الهاتف غير صحيح" };
  }
}

export function getPhonePlaceholder(countryCode: string): string {
  if (countryCode === "EG") return "1012345678";
  if (countryCode === "SA") return "501234567";
  if (countryCode === "AE") return "501234567";
  return "رقم الهاتف";
}
