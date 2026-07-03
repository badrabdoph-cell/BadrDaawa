import { readFileSync } from "node:fs";
import path from "node:path";

export const POST_IMAGE_ARABIC_FONT_FAMILY = "BadrDaawaArabic";

let cachedFontCss = "";

export function embedPostImageFonts() {
  if (cachedFontCss) return cachedFontCss;
  const fontPath = path.join(process.cwd(), "public/fonts/NotoNaskhArabic-Regular.ttf");
  const font = readFileSync(fontPath).toString("base64");
  cachedFontCss = `<style>
@font-face {
  font-family: "${POST_IMAGE_ARABIC_FONT_FAMILY}";
  src: url("data:font/truetype;base64,${font}") format("truetype");
  font-weight: 400 950;
  font-style: normal;
}
</style>`;
  return cachedFontCss;
}
