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

const keyboardNoiseThreshold = 64;

export const orderStoryPresets: OrderStoryPreset[] = [
  {
    id: "first-look",
    title: "أول لقاء",
    date: "بداية الحكاية",
    description: "بدأت الحكاية بلحظة بسيطة، لكنها فضلت حاضرة في القلب كأنها كانت وعد جميل من البداية.",
  },
  {
    id: "engagement",
    title: "الخطوبة",
    date: "يوم الخطوبة",
    description: "في هذا اليوم اتجمعت القلوب قبل الأيدي، وبدأت خطوة جديدة مليانة فرحة ودعوات من أقرب الناس.",
  },
  {
    id: "katb-ketab",
    title: "كتب الكتاب",
    date: "يوم كتب الكتاب",
    description: "لحظة سكينة وفرحة، فيها اتقالت الكلمة اللي بتفتح باب بيت وحياة وحكاية طويلة بإذن الله.",
  },
  {
    id: "wedding-day",
    title: "يوم الفرح",
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
