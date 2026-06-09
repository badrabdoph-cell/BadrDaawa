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

export function slugifyInvitationName(value: string) {
  return value
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
  let index = 1;
  let code = `${baseSlug}-${index}`;

  while (used.has(code.toLowerCase()) || reservedRoutes.has(code.toLowerCase())) {
    index += 1;
    code = `${baseSlug}-${index}`;
  }

  return code;
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
