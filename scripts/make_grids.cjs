const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = '/Users/nicolekeller/.gemini/antigravity/brain/ab502286-c9ab-41e4-bf7e-93baa19a65ce/scratch/grids';

const SHEETS = {
  hunter_b01: 'better assets/Hunter Settlement/tile-B-01.png',
  hunter_b02: 'better assets/Hunter Settlement/tile-B-02.png',
  hunter_b03: 'better assets/Hunter Settlement/tile-B-03.png',
  hunter_b04: 'better assets/Hunter Settlement/tile-B-04.png',
  hunter_b05: 'better assets/Hunter Settlement/tile-B-05.png',
  hunter_a2: 'better assets/Hunter Settlement/Tile_A2-1 (2).png',
  sa1_b01: 'better assets/Stone Age-1/tile-B-01.png',
  sa1_b03: 'better assets/Stone Age-1/tile-B-03.png',
  sa1_b04: 'better assets/Stone Age-1/tile-B-04.png',
  farm2_b05: 'better assets/farm-2/tile-B-05.png',
  farm2_b07: 'better assets/farm-2/tile-B-07.png',
  farm2_b04: 'better assets/farm-2/tile-B-04.png',
};

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  for (const [name, rel] of Object.entries(SHEETS)) {
    const b64 = fs.readFileSync(path.join(ROOT, rel)).toString('base64');
    const dataUrl = await page.evaluate(async (b64) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const S = 1; // nativ
          const c = document.createElement('canvas');
          c.width = img.width * S;
          c.height = img.height * S;
          const ctx = c.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.fillStyle = '#6a5a8a';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0);
          ctx.strokeStyle = 'rgba(255,255,0,0.55)';
          ctx.lineWidth = 1;
          ctx.font = 'bold 9px sans-serif';
          for (let x = 0; x < c.width; x += 32) {
            ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, c.height); ctx.stroke();
          }
          for (let y = 0; y < c.height; y += 32) {
            ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(c.width, y + 0.5); ctx.stroke();
          }
          for (let r = 0; r < c.height / 32; r++) {
            for (let col = 0; col < c.width / 32; col++) {
              if (r % 1 === 0 && col % 1 === 0) {
                ctx.fillStyle = '#000'; ctx.fillRect(col * 32 + 1, r * 32 + 1, 24, 10);
                ctx.fillStyle = '#ff0'; ctx.fillText(`${col},${r}`, col * 32 + 2, r * 32 + 9);
              }
            }
          }
          resolve(c.toDataURL('image/png'));
        };
        img.src = 'data:image/png;base64,' + b64;
      });
    }, b64);
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('grid', name);
  }
  await browser.close();
})();
