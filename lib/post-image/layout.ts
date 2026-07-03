import type { PostImageSize } from "./types";

type FitTextOneLineOptions = {
  base: number;
  min: number;
  maxCharacters: number;
};

export function fitTextOneLine(value: string, options: FitTextOneLineOptions) {
  const length = value.replace(/\s+/g, "").length;
  if (length <= options.maxCharacters) return options.base;
  const ratio = options.maxCharacters / Math.max(length, 1);
  return Math.max(options.min, Math.round(options.base * Math.max(0.64, ratio)));
}

export function postImageSafeArea(size: Pick<PostImageSize, "width" | "height">, inset: number) {
  return {
    x: inset,
    y: inset,
    width: size.width - inset * 2,
    height: size.height - inset * 2,
  };
}
