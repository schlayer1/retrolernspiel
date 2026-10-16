/**
 * Sprite-Katalog: segmentiert die Pack-Sheets automatisch in Einzel-Sprites (Alpha-Komponenten)
 * und zeichnet nummerierte Kataloge nach scratch/catalog/<sheet>.png + <sheet>.json
 * Aufruf: node scripts/catalog_sheets.cjs
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const OUT = '/Users/nicolekeller/.gemini/antigravity/brain/ab502286-c9ab-41e4-bf7e-93baa19a65ce/scratch/catalog';

const SHEETS = JSON.parse(fs.readFileSync(path.join(__dirname, 'world_sheets.json'), 'utf8'));
const only = process.argv[2];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  for (const [name, rel] of Object.entries(SHEETS)) {
    if (only && only !== name) continue;
    const b64 = fs.readFileSync(path.join(ROOT, rel)).toString('base64');
    const res = await page.evaluate(async (b64) => {
      const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b64; });
      const W = img.width, H = img.height;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, W, H).data;
      const solid = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) solid[i] = data[i * 4 + 3] > 20 ? 1 : 0;
      // Dilatation um 2 px, damit Schatten/Teile zusammenhängen
      const D = 0;
      const dil = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!solid[y * W + x]) continue;
        for (let dy = -D; dy <= D; dy++) for (let dx = -D; dx <= D; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < W && ny < H) dil[ny * W + nx] = 1;
        }
      }
      const comp = new Int32Array(W * H).fill(-1);
      const boxes = [];
      const stack = [];
      for (let y0 = 0; y0 < H; y0++) for (let x0 = 0; x0 < W; x0++) {
        const s = y0 * W + x0;
        if (!dil[s] || comp[s] >= 0) continue;
        const id = boxes.length;
        let minX = W, minY = H, maxX = -1, maxY = -1;
        stack.push(s); comp[s] = id;
        while (stack.length) {
          const p = stack.pop();
          const px = p % W, py = (p - px) / W;
          if (solid[p]) { if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; }
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const nx = px + dx, ny = py + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const q = ny * W + nx;
            if (dil[q] && comp[q] < 0) { comp[q] = id; stack.push(q); }
          }
        }
        if (maxX >= 0) boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
        else boxes.push(null);
      }
      let list = boxes.filter((b) => b && b.w >= 10 && b.h >= 10);
      list.sort((a, b) => (Math.floor(a.y / 24) - Math.floor(b.y / 24)) || (a.x - b.x));
      list = list.map((b, i) => ({ i, ...b }));
      // Katalogbild
      const out = document.createElement('canvas'); out.width = W; out.height = H;
      const o = out.getContext('2d');
      o.fillStyle = '#6a5a8a'; o.fillRect(0, 0, W, H);
      o.drawImage(img, 0, 0);
      o.font = 'bold 10px sans-serif';
      for (const b of list) {
        o.strokeStyle = 'rgba(255,255,0,0.7)'; o.lineWidth = 1;
        o.strokeRect(b.x + 0.5, b.y + 0.5, b.w, b.h);
        const t = String(b.i);
        const tw = o.measureText(t).width + 3;
        o.fillStyle = '#000'; o.fillRect(b.x, b.y, tw, 11);
        o.fillStyle = '#0f0'; o.fillText(t, b.x + 1, b.y + 9);
      }
      return { list, png: out.toDataURL('image/png') };
    }, b64);
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(res.png.split(',')[1], 'base64'));
    fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(res.list));
    console.log(name, res.list.length, 'Sprites');
  }
  await browser.close();
})();
