const sharp = require('sharp');
const fs = require('fs');

// Read the Cairo font
const fontBuffer = fs.readFileSync('/tmp/cairo-900.ttf');
const fontBase64 = fontBuffer.toString('base64');

// Simple SVG with embedded font
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300">
  <defs>
    <style>
      @font-face {
        font-family: 'TestCairo';
        src: url(data:font/ttf;base64,${fontBase64}) format('truetype');
        font-weight: 900;
      }
    </style>
  </defs>
  <rect width="600" height="300" fill="#f0e8d8"/>
  <text x="300" y="100" text-anchor="middle" font-family="'TestCairo', sans-serif" font-size="42" font-weight="900" fill="#cc2222">اختبار الخط العربي</text>
  <text x="300" y="180" text-anchor="middle" font-family="'TestCairo', sans-serif" font-size="36" font-weight="900" fill="#333">أحمد بن نور</text>
  <text x="300" y="260" text-anchor="middle" font-family="Georgia, serif" font-size="28" fill="#000">English Text at Bottom</text>
</svg>`;

console.log(`SVG size: ${svg.length} bytes`);
console.log(`Font base64: ${fontBase64.substring(0, 20)}... (${fontBase64.length} chars)`);

async function test() {
  try {
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    fs.writeFileSync('/tmp/test-datauri.png', png);
    console.log(`✓ Success: ${png.length} bytes`);
    
    // Sample pixels
    const metadata = await sharp(png).metadata();
    const raw = await sharp(png).raw().toBuffer();
    const w = metadata.width;
    const ch = metadata.channels || 4;
    
    // Scan for red text at y=100
    let redCount = 0;
    for (let x = 50; x < 550; x += 2) {
      const idx = (100 * w + x) * ch;
      if (raw[idx] > 180 && raw[idx+1] < 60 && raw[idx+2] < 60) redCount++;
    }
    console.log(`Red pixels at y=100: ${redCount}/250`);
    
    // Scan for dark text at y=180
    let darkCount = 0;
    for (let x = 150; x < 450; x += 2) {
      const idx = (180 * w + x) * ch;
      if (raw[idx] < 80 && raw[idx+1] < 80 && raw[idx+2] < 80) darkCount++;
    }
    console.log(`Dark pixels at y=180: ${darkCount}/150`);
    
    console.log(`\nSummary: Red=${redCount}/250, Dark=${darkCount}/150`);
    if (redCount > 20 && darkCount > 10) {
      console.log('✓ TEXT RENDERS WITH EMBEDDED FONT');
    } else {
      console.log('✗ TEXT DOES NOT RENDER PROPERLY');
    }
  } catch (err) {
    console.error('✗ Error:', err.message);
  }
}
test();
