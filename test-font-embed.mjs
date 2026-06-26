// Test the font embedding approach
import crypto from "crypto";
import QRCode from "qrcode";
import sharp from "sharp";

const CAIRO_900_URL = "https://fonts.gstatic.com/s/cairo/v31/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hEk5W1Q.ttf";

// Download font
console.log("Downloading Cairo font...");
const res = await fetch(CAIRO_900_URL);
const buffer = Buffer.from(await res.arrayBuffer());
const fontBase64 = buffer.toString("base64");
console.log(`Downloaded: ${buffer.length} bytes, ${fontBase64.length} base64 chars`);

// Generate SVG with embedded font
const arabicFont = "'Cairo', 'Noto Kufi Arabic', 'Arial', sans-serif";
const englishFont = "Georgia, 'Times New Roman', serif";

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <style>
@font-face {
  font-family: 'Cairo';
  src: url(data:font/ttf;base64,${fontBase64}) format('truetype');
  font-weight: 900;
}
    </style>
    <radialGradient id="bg" cx="50%" cy="18%" r="80%">
      <stop offset="0%" stop-color="#fffaf2"/>
      <stop offset="62%" stop-color="#f8efe3"/>
      <stop offset="100%" stop-color="#efe0cc"/>
    </radialGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <text x="400" y="80" text-anchor="middle" font-family="${englishFont}" font-size="28" fill="#333">English Text Test</text>
  <text x="400" y="160" direction="rtl" unicode-bidi="bidi-override" text-anchor="middle" font-family="${arabicFont}" font-size="52" fill="#e73539">اختبار النص العربي</text>
  <text x="400" y="250" direction="rtl" unicode-bidi="bidi-override" text-anchor="middle" font-family="${arabicFont}" font-size="40" fill="#4b2b10">أحمد نور</text>
  <text x="400" y="340" text-anchor="middle" font-family="${englishFont}" font-size="30" fill="#000">At 8 pm — Save the date</text>
  <text x="400" y="430" direction="rtl" unicode-bidi="bidi-override" text-anchor="middle" font-family="${arabicFont}" font-size="22" fill="#000">قاعة لاليت العمر • امسح الكود للدعوة كاملة</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
const fs = await import('fs');
fs.writeFileSync('/tmp/test-font-embed.png', png);
console.log(`\nGenerated PNG: ${png.length} bytes`);
console.log('Saved to /tmp/test-font-embed.png');

// Check pixel data
const image = sharp(png);
const metadata = await image.metadata();
const rawBuffer = await image.raw().toBuffer();
const width = metadata.width;
const channels = metadata.channels || 4;

// Check at y=160 (Arabic text in red)
let redPixels = 0;
for (let x = 100; x < 700; x += 2) {
  const idx = (160 * width + x) * channels;
  const r = rawBuffer[idx], g = rawBuffer[idx+1], b = rawBuffer[idx+2];
  if (r > 200 && g < 80 && b < 80) redPixels++;
}
console.log(`\nRed pixels at y=160 (Arabic headline): ${redPixels}/300 ${redPixels > 30 ? '✓ OK' : '✗ LOW'}`);

// Check at y=250 (Arabic names in brown)
let darkPixels = 0;
for (let x = 200; x < 600; x += 2) {
  const idx = (250 * width + x) * channels;
  const r = rawBuffer[idx], g = rawBuffer[idx+1], b = rawBuffer[idx+2];
  if (r < 80 && g < 60 && b < 30) darkPixels++;
}
console.log(`Dark pixels at y=250 (Arabic names): ${darkPixels}/200 ${darkPixels > 15 ? '✓ OK' : '✗ LOW'}`);

// Compare with non-embedded version
const svgNoFont = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <radialGradient id="bg" cx="50%" cy="18%" r="80%">
      <stop offset="0%" stop-color="#fffaf2"/>
      <stop offset="62%" stop-color="#f8efe3"/>
      <stop offset="100%" stop-color="#efe0cc"/>
    </radialGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <text x="400" y="80" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#333">English Text Test</text>
  <text x="400" y="160" direction="rtl" unicode-bidi="bidi-override" text-anchor="middle" font-family="Arial, sans-serif" font-size="52" fill="#e73539">اختبار النص العربي</text>
  <text x="400" y="250" direction="rtl" unicode-bidi="bidi-override" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="#4b2b10">أحمد نور</text>
  <text x="400" y="340" text-anchor="middle" font-family="Georgia, serif" font-size="30" fill="#000">At 8 pm — Save the date</text>
  <text x="400" y="430" direction="rtl" unicode-bidi="bidi-override" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#000">قاعة لاليت العمر • امسح الكود للدعوة كاملة</text>
</svg>`;

const pngNoFont = await sharp(Buffer.from(svgNoFont)).png().toBuffer();
fs.writeFileSync('/tmp/test-no-font-embed.png', pngNoFont);
console.log(`\nWithout embedded font: ${pngNoFont.length} bytes`);

const rawNoFont = await sharp(pngNoFont).raw().toBuffer();
let redPixels2 = 0;
for (let x = 100; x < 700; x += 2) {
  const idx = (160 * width + x) * channels;
  const r = rawNoFont[idx], g = rawNoFont[idx+1], b = rawNoFont[idx+2];
  if (r > 200 && g < 80 && b < 80) redPixels2++;
}
console.log(`Red pixels at y=160 (no embed, Arial): ${redPixels2}/300`);

