import { Buffer } from 'buffer';
import sharp from 'sharp';

async function checkTextRendering(pngPath, label) {
  const { readFile } = await import('fs/promises');
  const png = await readFile(pngPath);
  const image = sharp(png);
  const metadata = await image.metadata();
  
  // Sample pixels at text positions in the image
  // Arabic text "اختبار النص العربي" starts at around y=300-340
  // English text "English Text Test" at y=200-240
  
  // Sample a row of pixels at y=300 (Arabic text area)
  const buffer = await image.raw().toBuffer();
  const width = metadata.width;
  const channels = metadata.channels || 4;
  
  const results = { label };
  
  // Sample English text area (y=200)
  let engNonWhite = 0;
  let engTotal = 0;
  for (let x = 200; x < 800; x += 4) {
    const idx = (200 * width + x) * channels;
    const r = buffer[idx], g = buffer[idx+1], b = buffer[idx+2], a = buffer[idx+3];
    // Count non-white pixels (text)
    if (r < 200 || g < 200 || b < 200) engNonWhite++;
    engTotal++;
  }
  results.englishTextPixels = `${engNonWhite}/${engTotal} non-white (${Math.round(engNonWhite/engTotal*100)}%)`;
  
  // Sample Arabic text area (y=300)
  let araNonWhite = 0;
  let araTotal = 0;
  for (let x = 200; x < 800; x += 4) {
    const idx = (300 * width + x) * channels;
    const r = buffer[idx], g = buffer[idx+1], b = buffer[idx+2], a = buffer[idx+3];
    if (r < 200 || g < 200 || b < 200) araNonWhite++;
    araTotal++;
  }
  results.arabicTextPixels = `${araNonWhite}/${araTotal} non-white (${Math.round(araNonWhite/araTotal*100)}%)`;
  
  // Sample red area (Arabic headline at y=300, should be #e73539 red)
  let redPixels = 0;
  let redTotal = 0;
  for (let x = 250; x < 750; x += 4) {
    const idx = (300 * width + x) * channels;
    const r = buffer[idx], g = buffer[idx+1], b = buffer[idx+2];
    // Check if it's red (#e73539 → rgb(231, 53, 57))
    if (r > 200 && g < 80 && b < 80) redPixels++;
    redTotal++;
  }
  results.redTextPixels = `${redPixels}/${redTotal} red (${Math.round(redPixels/redTotal*100)}%)`;
  
  // Sample brown area (Arabic names at y=400, #4b2b10)
  let brownPixels = 0;
  let brownTotal = 0;
  for (let x = 250; x < 750; x += 4) {
    const idx = (400 * width + x) * channels;
    const r = buffer[idx], g = buffer[idx+1], b = buffer[idx+2];
    if (r < 100 && g < 60 && b < 30) brownPixels++;
    brownTotal++;
  }
  results.brownTextPixels = `${brownPixels}/${brownTotal} dark (${Math.round(brownPixels/brownTotal*100)}%)`;
  
  return results;
}

const results1 = await checkTextRendering('/tmp/test-poster.png', 'WITH Cairo @import');
console.log('WITH Cairo @import:', JSON.stringify(results1, null, 2));

const results2 = await checkTextRendering('/tmp/test-poster-no-cairo.png', 'WITHOUT Cairo (Arial only)');
console.log('WITHOUT Cairo:', JSON.stringify(results2, null, 2));
