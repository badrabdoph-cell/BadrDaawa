export type KeyboardInsetInput = {
  innerHeight: number;
  viewportHeight: number;
  viewportOffsetTop?: number;
  safeAreaBottom?: number;
};

export type OrderStoryPreset = {
  id: string;
  title: string;
  date: string;
  description: string;
};

export type RequiredOrderStoryStage = {
  id: string;
  label: string;
  helper: string;
};

type StoryStageDraft = {
  date?: string | null;
  title?: string | null;
  description?: string | null;
};

const keyboardNoiseThreshold = 64;

export const requiredOrderStoryStages: RequiredOrderStoryStage[] = [
  {
    id: "first-meeting",
    label: "أول لقاء",
    helper: "اكتب بداية الحكاية: إمتى حصلت، وإيه اللي خلاها مختلفة.",
  },
  {
    id: "middle-road",
    label: "منتصف الطريق",
    helper: "اكتب محطة مهمة بين البداية ويوم الفرح: خطوبة، كتب كتاب، أو لحظة قربتكم من بعض.",
  },
  {
    id: "wedding-day",
    label: "يوم الزفاف",
    helper: "اكتب إحساس يوم الفرح وما الذي سيشاركه الضيوف معكم.",
  },
];

export const orderStoryPresets: OrderStoryPreset[] = [
  {
    id: "first-look",
    title: "أول لقاء",
    date: "بداية الحكاية",
    description: "بدأت الحكاية بلحظة بسيطة، لكنها فضلت حاضرة في القلب كأنها كانت وعد جميل من البداية.",
  },
  {
    id: "middle-road",
    title: "منتصف الطريق",
    date: "محطة مهمة في الحكاية",
    description: "بين أول لقاء ويوم الزفاف كانت في لحظة قربت القلوب أكثر، وأكدت أن الطريق يستاهل نكمله مع بعض.",
  },
  {
    id: "wedding-day",
    title: "يوم الزفاف",
    date: "يوم الزفاف",
    description: "اليوم الذي نحتفل فيه مع أهلنا وأحبابنا ببداية حياة جديدة، ونكتب أول صفحة من بيتنا معًا.",
  },
];

export function calculateKeyboardInset(input: KeyboardInsetInput) {
  const safeAreaBottom = Math.max(0, Math.round(input.safeAreaBottom || 0));
  const viewportOffsetTop = Math.max(0, Math.round(input.viewportOffsetTop || 0));
  const visibleHeight = Math.max(0, Math.round(input.viewportHeight + viewportOffsetTop));
  const rawInset = Math.max(0, Math.round(input.innerHeight - visibleHeight - safeAreaBottom));
  return rawInset > keyboardNoiseThreshold ? rawInset : 0;
}

export function getStoryPresetById(id: string) {
  return orderStoryPresets.find((preset) => preset.id === id) || null;
}

export function isStoryStageStarted(item: StoryStageDraft | null | undefined) {
  return Boolean(item?.date?.trim() || item?.title?.trim() || item?.description?.trim());
}

export function getIncompleteRequiredStoryStage(
  items: Array<StoryStageDraft | null | undefined>,
  options: { requireAll?: boolean } = {},
) {
  const stages = requiredOrderStoryStages.map((stage, index) => ({ stage, item: items[index] || {} }));
  const shouldValidate = Boolean(options.requireAll) || stages.some(({ item }) => isStoryStageStarted(item));
  if (!shouldValidate) return null;

  for (let index = 0; index < stages.length; index += 1) {
    const { stage, item } = stages[index]!;
    const missingFields = [
      !item.date?.trim() ? "date" : "",
      !item.title?.trim() ? "title" : "",
      !item.description?.trim() ? "description" : "",
    ].filter(Boolean) as Array<"date" | "title" | "description">;
    if (missingFields.length) return { index, stage, missingFields };
  }

  return null;
}
