import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const outDir = '/Users/nicolekeller/.gemini/antigravity/brain/ab502286-c9ab-41e4-bf7e-93baa19a65ce/scratch/traps';
fs.mkdirSync(outDir, { recursive: true });

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();

  // Inspect sheets in better assets/stone age/
  for (let i = 1; i <= 9; i++) {
    const file = path.join(process.cwd(), `better assets/stone age/${i}.png`);
    if (!fs.existsSync(file)) continue;
    const b64 = fs.readFileSync(file).toString('base64');
    
    // Create a 768x768 contact sheet with 48x48 grid
    const dataUrl = await page.evaluate(async (base64) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.width;
          c.height = img.height;
          const ctx = c.getContext('2d');
          ctx.drawImage(img, 0, 0);
          // draw grid
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.4)';
          ctx.lineWidth = 1;
          for (let x = 0; x < c.width; x += 48) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, c.height); ctx.stroke();
          }
          for (let y = 0; y < c.height; y += 48) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(c.width, y); ctx.stroke();
          }
          resolve(c.toDataURL('image/png'));
        };
        img.src = 'data:image/png;base64,' + base64;
      });
    }, b64);
    
    const buffer = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    fs.writeFileSync(path.join(outDir, `stone_age_${i}_grid.png`), buffer);
    console.log(`Saved stone_age_${i}_grid.png`);
  }

  await browser.close();
  console.log('Done rendering contact sheets.');
}

run().catch(console.error);
