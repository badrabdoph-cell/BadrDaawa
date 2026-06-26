import { Buffer } from 'buffer';
import sharp from 'sharp';

const arabicFont = "'Cairo', 'Noto Kufi Arabic', 'Arial', sans-serif";

// Test 1: @font-face with direct Google Fonts CDN URL
const svg1 = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
  <defs>
    <style>
      @font-face {
        font-family: 'Cairo';
        src: url('https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-a1PiKg.woff2') format('woff2');
        font-weight: 900;
      }
    </style>
  </defs>
  <rect width="800" height="400" fill="#fffaf2"/>
  <text x="400" y="100" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" fill="#333">English text (Arial)</text>
  <text x="400" y="200" direction="rtl" unicode-bidi="bidi-override" text-anchor="middle" font-family="${arabicFont}" font-size="36" fill="#e73539">اختبار النص العربي</text>
  <text x="400" y="300" direction="rtl" unicode-bidi="bidi-override" text-anchor="middle" font-family="${arabicFont}" font-size="28" fill="#4b2b10">أحمد نور - قاعة لاليت العمر</text>
</svg>`;

try {
  const png = await sharp(Buffer.from(svg1)).png().toBuffer();
  const fs = await import('fs');
  fs.writeFileSync('/tmp/test-fontface-url.png', png);
  console.log(`Test 1 (@font-face with CDN URL): ${png.length} bytes`);
  
  // Sample pixels
  const image = sharp(png);
  const metadata = await image.metadata();
  const buffer = await image.raw().toBuffer();
  const width = metadata.width;
  const channels = metadata.channels || 4;
  
  // Check at y=200 (Arabic text in red)
  let redPixels = 0;
  for (let x = 100; x < 700; x += 2) {
    const idx = (200 * width + x) * channels;
    const r = buffer[idx], g = buffer[idx+1], b = buffer[idx+2];
    if (r > 200 && g < 80 && b < 80) redPixels++;
  }
  console.log(`Red pixels at y=200: ${redPixels}/300`);
  
  // Check at y=300 (Arabic in brown/dark)
  let darkPixels = 0;
  for (let x = 100; x < 700; x += 2) {
    const idx = (300 * width + x) * channels;
    const r = buffer[idx], g = buffer[idx+1], b = buffer[idx+2];
    if (r < 80 && g < 60 && b < 30) darkPixels++;
  }
  console.log(`Dark pixels at y=300: ${darkPixels}/300`);
  
  // If red pixels > 10 and dark pixels > 10, the font likely rendered
  if (redPixels > 10 && darkPixels > 10) {
    console.log('✓ Font rendering appears successful');
  } else {
    console.log('✗ Font rendering appears to have FAILED (very few text pixels detected)');
  }
  
} catch (err) {
  console.error('Error:', err.message);
}
