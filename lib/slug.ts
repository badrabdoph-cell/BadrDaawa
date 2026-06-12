import { randomInt } from "node:crypto";

const reservedRoutes = new Set([
  "admin",
  "api",
  "client",
  "contact",
  "faq",
  "manage",
  "order",
  "pricing",
  "privacy-policy",
  "refund-policy",
  "terms",
  "templates",
  "usage-policy",
  "uploads",
  "_next",
]);

const arabicCharacterMap: Record<string, string> = {
  ا: "a",
  أ: "a",
  إ: "i",
  آ: "a",
  ٱ: "a",
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "h",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "sh",
  ص: "s",
  ض: "d",
  ط: "t",
  ظ: "z",
  ع: "a",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  گ: "g",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  ة: "a",
  و: "w",
  ؤ: "w",
  ي: "y",
  ى: "a",
  ئ: "y",
  ء: "",
};

const arabicNameOverrides: Record<string, string> = {
  احمد: "ahmed",
  اسراء: "esraa",
  ايه: "aya",
  بدر: "badr",
  بسمه: "basma",
  حبيبه: "habiba",
  خالد: "khaled",
  دعاء: "doaa",
  دينا: "dina",
  ريم: "reem",
  رنا: "rana",
  ريهام: "reham",
  ساره: "sara",
  سلمى: "salma",
  سلمي: "salma",
  شروق: "shorouk",
  علي: "ali",
  عمر: "omar",
  عمرو: "amr",
  فاطمه: "fatma",
  محمد: "mohamed",
  محمود: "mahmoud",
  مريم: "mariam",
  مصطفى: "mostafa",
  ملك: "malak",
  منه: "menna",
  نادين: "nadine",
  ندى: "nada",
  نور: "nour",
  هاجر: "hager",
  هبه: "heba",
  هدير: "hadeer",
};

function normalizeArabicNameToken(value: string) {
  return value
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

function transliterateArabic(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06F0))
    .replace(/[\u0600-\u06FF]+/g, (word) => {
      const override = arabicNameOverrides[normalizeArabicNameToken(word)];
      if (override) return override;
      return word.replace(/[\u0600-\u06FF]/g, (char) => arabicCharacterMap[char] ?? "");
    });
}

function isUsableInvitationSlug(slug: string, used: Set<string>) {
  const clean = slug.toLowerCase();
  return Boolean(clean) && !used.has(clean) && !reservedRoutes.has(clean);
}

function randomNumericSuffix(length: number) {
  const firstDigit = String(randomInt(1, 10));
  let suffix = firstDigit;
  for (let index = 1; index < length; index += 1) {
    suffix += String(randomInt(0, 10));
  }
  return suffix;
}

export function slugifyInvitationName(value: string) {
  return transliterateArabic(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildInvitationBaseSlug(groomEnglish: string, brideEnglish: string) {
  const groom = slugifyInvitationName(groomEnglish);
  const bride = slugifyInvitationName(brideEnglish);
  const base = [groom, bride].filter(Boolean).join("-");
  return base && !reservedRoutes.has(base) ? base : "wedding-invitation";
}

export function makeNumberedInvitationSlug(baseSlug: string, existingCodes: string[]) {
  const used = new Set(existingCodes.map((code) => code.toLowerCase()));
  const safeBase = slugifyInvitationName(baseSlug) || "wedding-invitation";
  let suffixLength = 2;

  while (suffixLength <= 8) {
    const checkedSuffixes = new Set<string>();
    const possibleCount = 9 * 10 ** (suffixLength - 1);

    while (checkedSuffixes.size < possibleCount) {
      const suffix = randomNumericSuffix(suffixLength);
      if (checkedSuffixes.has(suffix)) continue;
      checkedSuffixes.add(suffix);
      const code = `${safeBase}-${suffix}`;
      if (isUsableInvitationSlug(code, used)) return code;
    }

    suffixLength += 1;
  }

  let fallbackIndex = Date.now();
  while (true) {
    const code = `${safeBase}-${fallbackIndex}`;
    if (isUsableInvitationSlug(code, used)) return code;
    fallbackIndex += 1;
  }
}

export function normalizeCustomInvitationSlug(value?: string | null) {
  return (value || "")
    .trim()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\/+|\/+$/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function isReservedInvitationSlug(value: string) {
  return reservedRoutes.has(value.toLowerCase());
}

export function validateCustomInvitationSlug(value?: string | null) {
  const slug = normalizeCustomInvitationSlug(value);
  if (!slug) return { slug: "", error: value?.trim() ? "استخدم حروفاً إنجليزية أو أرقاماً مع الشرطة (-) في الرابط المخصص." : "" };
  if (slug.length < 3) return { slug, error: "الرابط المخصص يجب أن يكون 3 أحرف على الأقل." };
  if (isReservedInvitationSlug(slug)) return { slug, error: "هذا الرابط محجوز داخل الموقع. اختار رابطاً آخر." };
  if (/^\d+$/.test(slug)) return { slug, error: "الرابط المخصص لا يمكن أن يكون أرقام فقط." };
  return { slug, error: "" };
}

export function getCustomerAdminPath(code: string) {
  return `/${code}/ad_3399`;
}
