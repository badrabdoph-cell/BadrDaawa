export type PrePublishStatus = "complete" | "review" | "missing";

export type PrePublishValidationItem = {
  key: "names" | "date" | "time" | "venue" | "images" | "template" | "map";
  label: string;
  status: PrePublishStatus;
  message: string;
  required: boolean;
};

export type PrePublishValidationInput = {
  groomName?: string | null;
  brideName?: string | null;
  weddingDate?: string | Date | null;
  weddingTime?: string | null;
  venue?: string | null;
  mapUrl?: string | null;
  templateSlug?: string | null;
  heroPhoto?: string | null;
  gallery?: Array<string | null | undefined> | null;
  images?: Array<{ url?: string | null } | string | null | undefined> | null;
};

export type PrePublishValidationReport = {
  readiness: number;
  canPublish: boolean;
  completed: number;
  review: number;
  missing: number;
  total: number;
  items: PrePublishValidationItem[];
  blockingItems: PrePublishValidationItem[];
};

function hasText(value?: string | null) {
  return Boolean(value?.trim());
}

function dateValue(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasFutureOrTodayDate(value?: string | Date | null) {
  const date = dateValue(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cleanDate = new Date(date);
  cleanDate.setHours(0, 0, 0, 0);
  return cleanDate.getTime() >= today.getTime();
}

function hasImage(input: PrePublishValidationInput) {
  const gallery = input.gallery || [];
  const images = input.images || [];
  return Boolean(
    hasText(input.heroPhoto) ||
      gallery.some((image) => hasText(image || "")) ||
      images.some((image) => (typeof image === "string" ? hasText(image) : hasText(image?.url))),
  );
}

function item(key: PrePublishValidationItem["key"], label: string, status: PrePublishStatus, message: string, required = true): PrePublishValidationItem {
  return { key, label, status, message, required };
}

export function getPrePublishValidationReport(input: PrePublishValidationInput): PrePublishValidationReport {
  const validDate = dateValue(input.weddingDate);
  const validFutureDate = hasFutureOrTodayDate(input.weddingDate);
  const hasTime = hasText(input.weddingTime);
  const timeLooksSpecific = hasTime && /\d/.test(input.weddingTime || "");
  const items: PrePublishValidationItem[] = [
    item(
      "names",
      "أسماء العروسين",
      hasText(input.groomName) && hasText(input.brideName) ? "complete" : "missing",
      hasText(input.groomName) && hasText(input.brideName) ? "الأسماء مكتملة." : "اكتب اسم العريس واسم العروس.",
    ),
    item(
      "date",
      "التاريخ",
      validDate ? (validFutureDate ? "complete" : "review") : "missing",
      validDate ? (validFutureDate ? "تاريخ الحفل صالح." : "التاريخ في الماضي، راجعه قبل النشر.") : "اختر تاريخًا صحيحًا للحفل.",
    ),
    item(
      "time",
      "الوقت",
      !hasTime ? "missing" : timeLooksSpecific ? "complete" : "review",
      !hasTime ? "اكتب وقت الحفل." : timeLooksSpecific ? "وقت الحفل واضح." : "الوقت مكتوب لكن يحتاج صيغة أوضح مثل 07:00 مساءً.",
    ),
    item(
      "venue",
      "القاعة",
      hasText(input.venue) ? "complete" : "missing",
      hasText(input.venue) ? "اسم القاعة مكتمل." : "اكتب اسم القاعة أو مكان الحفل.",
    ),
    item(
      "images",
      "الصور",
      hasImage(input) ? "complete" : "missing",
      hasImage(input) ? "توجد صورة واحدة على الأقل." : "أضف صورة واحدة على الأقل قبل النشر.",
    ),
    item(
      "template",
      "القالب",
      hasText(input.templateSlug) ? "complete" : "missing",
      hasText(input.templateSlug) ? "تم اختيار القالب." : "اختر قالب الدعوة.",
    ),
    item(
      "map",
      "الخريطة",
      hasText(input.mapUrl) ? "complete" : "review",
      hasText(input.mapUrl) ? "رابط الخريطة موجود." : "رابط الخريطة غير موجود. يمكن النشر، لكن يفضل إضافته.",
      false,
    ),
  ];
  const completed = items.filter((entry) => entry.status === "complete").length;
  const review = items.filter((entry) => entry.status === "review").length;
  const missing = items.filter((entry) => entry.status === "missing").length;
  const blockingItems = items.filter((entry) => entry.required && entry.status === "missing");
  const readiness = Math.round((items.reduce((sum, entry) => sum + (entry.status === "complete" ? 1 : entry.status === "review" ? 0.5 : 0), 0) / items.length) * 100);
  return {
    readiness,
    canPublish: blockingItems.length === 0,
    completed,
    review,
    missing,
    total: items.length,
    items,
    blockingItems,
  };
}

export function prePublishStatusSymbol(status: PrePublishStatus) {
  if (status === "complete") return "✓";
  if (status === "review") return "⚠";
  return "✗";
}

export function prePublishStatusLabel(status: PrePublishStatus) {
  if (status === "complete") return "مكتمل";
  if (status === "review") return "يحتاج مراجعة";
  return "مفقود";
}
