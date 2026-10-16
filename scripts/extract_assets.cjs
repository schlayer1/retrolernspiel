const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function sliceIcons() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  const iconSheetPath = path.join(__dirname, '../better assets/Shikashi\'s Fantasy Icons Pack v2/#1 - Transparent Icons.png');
  const iconBase64 = fs.readFileSync(iconSheetPath).toString('base64');

  const outDir = path.join(__dirname, '../better assets/icon_slices');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const result = await page.evaluate(async (base64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const cols = 16;
        const rows = Math.floor(img.height / 32);
        const tiles = [];
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.clearRect(0, 0, 32, 32);
            ctx.drawImage(img, c * 32, r * 32, 32, 32, 0, 0, 32, 32);
            tiles.push({ r, c, data: canvas.toDataURL('image/png') });
          }
        }
        resolve(tiles);
      };
      img.src = 'data:image/png;base64,' + base64;
    });
  }, iconBase64);

  for (const t of result) {
    const filePath = path.join(outDir, `icon_r${t.r}_c${t.c}.png`);
    const base64Data = t.data.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
  }

  await browser.close();
  console.log('Successfully sliced', result.length, 'icons into ./better assets/icon_slices');
}

sliceIcons().catch(console.error);
