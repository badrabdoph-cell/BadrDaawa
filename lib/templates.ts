import type { TemplateDefinition } from "./types";

export const royalEnvelopeTemplate: TemplateDefinition = {
  id: "tpl_royal_envelope",
  slug: "royal-envelope",
  name: "Royal Envelope",
  arabicName: "Royal Envelope",
  category: "قالب الدعوة الحالي",
  style: "royal",
  concept: "ظرف ملكي يفتح بهدوء وتظهر منه بطاقة الدعوة بتفاصيل ذهبية ناعمة.",
  opening: "Envelope reveal",
  layout: "Hero بظرف تفاعلي، تفاصيل الفرح، العد التنازلي، الخريطة، وتأكيد الحضور.",
  typography: "خط عربي واضح مع أرقام إنجليزية وتباين مريح للموبايل.",
  palette: {
    primary: "#f8f4ec",
    secondary: "#d8c19a",
    accent: "#b48b39",
    ink: "#3a2e1f",
    surface: "#ffffff",
  },
  previewImage: "/assets/templates/royal-envelope.png",
  accentImage: "/assets/brand/champagne-rings.png",
  enabled: true,
  score: 100,
};

export const invitationTemplates: TemplateDefinition[] = [royalEnvelopeTemplate];

export function getTemplateBySlug(slug: string) {
  return invitationTemplates.find((template) => template.slug === slug);
}

export const featuredTemplates = invitationTemplates;
