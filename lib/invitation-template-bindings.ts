import type { TemplateDefinition } from "./types";

export type UnifiedImageSlot = {
  id: "photo1" | "photo2" | "photo3";
  label: string;
  role: "hero" | "secondary" | "detail";
  objectFit: "cover";
  aspectRatio: string;
};

export type UnifiedTextBinding = {
  id: string;
  label: string;
  value: string;
};

export const unifiedImageSlots: UnifiedImageSlot[] = [
  { id: "photo1", label: "Photo 1", role: "hero", objectFit: "cover", aspectRatio: "4:5" },
  { id: "photo2", label: "Photo 2", role: "secondary", objectFit: "cover", aspectRatio: "4:5" },
  { id: "photo3", label: "Photo 3", role: "detail", objectFit: "cover", aspectRatio: "4:5" },
];

export function getTemplateTextBindings(template: Pick<TemplateDefinition, "opening" | "concept" | "layout" | "typography">): UnifiedTextBinding[] {
  return [
    { id: "opening", label: "عنوان الدعوة", value: template.opening },
    { id: "concept", label: "الوصف", value: template.concept },
    { id: "layout", label: "تفاصيل المناسبة", value: template.layout },
    { id: "typography", label: "ملاحظات النص", value: template.typography },
  ].filter((item) => item.value);
}
