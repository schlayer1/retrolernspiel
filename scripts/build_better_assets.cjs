const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function buildBetterAssets() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();

  async function cropImage(srcRelPath, sx, sy, sw, sh, targetRelPath, targetW, targetH) {
    const srcAbs = path.join(__dirname, '..', srcRelPath);
    if (!fs.existsSync(srcAbs)) {
      console.error('Source not found:', srcAbs);
      return;
    }
    const b64 = fs.readFileSync(srcAbs).toString('base64');
    const outW = targetW || sw;
    const outH = targetH || sh;

    const dataUrl = await page.evaluate(async (base64, sx, sy, sw, sh, outW, outH) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = outW;
          canvas.height = outH;
          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = 'data:image/png;base64,' + base64;
      });
    }, b64, sx, sy, sw, sh, outW, outH);

    const targetAbs = path.join(__dirname, '..', targetRelPath);
    const targetDir = path.dirname(targetAbs);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    const buffer = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ''), 'base64');
    fs.writeFileSync(targetAbs, buffer);
    console.log(`Saved: ${targetRelPath} (${outW}x${outH})`);
  }

  console.log('--- 1. Extracting 31 Item Icons from Shikashi Pack v2 ---');
  const shikashiPath = 'better assets/Shikashi\'s Fantasy Icons Pack v2/#1 - Transparent Icons.png';
  
  const iconCoords = {
    beere: [4, 14],         // Ripe forest berries
    stock: [0, 17],         // Cut wood branches
    stein: [1, 17],         // Flint / stone block
    fleisch: [3, 15],       // Raw fresh meat
    gebraten: [1, 15],      // Cooked steak
    fell: [8, 17],          // Tanned pelt / animal fur
    faustkeil: [7, 5],      // Flint blade / hand axe
    samen: [13, 12],        // Hand sowing seeds
    getreide: [7, 14],      // Golden wheat ear
    hacke: [2, 10],         // Digging hoe
    sichel: [6, 6],         // Sickle
    lehm: [0, 20],          // Raw clay in basket/lump
    tontopf: [4, 12],       // Clay pot / vessel
    wasser: [1, 9],         // Fresh water flask
    wolle: [6, 17],         // Wool yarn ball
    milch: [8, 15],         // Milk bottle
    brot: [13, 14],         // Loaf of bread
    stoff: [7, 17],         // Bolt of woven fabric
    salz: [10, 15],         // Salt bowl / crystals
    bernstein: [15, 12],    // Glowing amber gem
    spitzhacke: [4, 4],     // Mining pickaxe
    kupfererz: [2, 17],     // Raw copper ore stone
    kupfer: [11, 19],       // Reddish copper bar / ingot
    kupferbeil: [10, 5],    // Copper / bronze axe
    zinn: [14, 12],         // Tin / silver crystals
    bronze: [3, 17],        // Golden bronze ingot
    bronzeschwert: [1, 5],  // Bronze / steel sword
    eisenerz: [2, 17],      // Heavy ore stone
    eisen: [1, 17],         // Dark iron ingot / block
    eisenwerkzeug: [3, 4],  // Blacksmith anvil & hammer
  };

  for (const [id, [col, row]] of Object.entries(iconCoords)) {
    await cropImage(shikashiPath, col * 32, row * 32, 32, 32, `public/assets/icons/${id}.png`, 32, 32);
  }

  console.log('--- 2. Extracting Buildings & Workshop Sprites ---');
  // Stone kiln (Töpferofen): Stone dome oven with fire & chimney from Hunter Settlement tile-B-02 (x=96, y=288, w=96, h=96) -> 44x44
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-02.png', 96, 288, 96, 96, 'public/assets/props/kiln.png', 44, 44);

  // Webstuhl (loom): Tall upright wooden frame with hanging weights and woven cloth from Hunter Settlement tile-B-02 (x=144, y=0, w=48, h=96) -> 36x44
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-02.png', 144, 0, 48, 96, 'public/assets/props/loom.png', 36, 44);

  // Schmelzofen (smelter): Open stone hearth with glowing fire and chimney from Hunter Settlement tile-B-02 (x=192, y=288, w=96, h=96) -> 44x44
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-02.png', 192, 288, 96, 96, 'public/assets/props/smelter.png', 44, 44);

  // Eisenschmiede (forge): Heavy stone forge with iron basin and glowing embers from Hunter Settlement tile-B-02 (x=576, y=288, w=96, h=96) -> 48x44
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-02.png', 576, 288, 96, 96, 'public/assets/props/forge.png', 48, 44);

  // Lehmgrube (clay_pile): Clay patch from Hunter Settlement tile-B-01 (x=480, y=720, w=48, h=48) -> 24x20
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-01.png', 480, 720, 48, 48, 'public/assets/props/clay_pile.png', 24, 20);

  console.log('--- 3. Extracting Atmospheric World Decoration Props ---');
  // Mammuthaut-Zelt für Ota: Stone Age-1 tile-B-01 (x=0, y=0, w=96, h=96) -> 64x64
  await cropImage('better assets/extracted/Stone Age-1/tile-B-01.png', 0, 0, 96, 96, 'public/assets/props/tent_ota.png', 64, 64);

  // Felltrockengestell: Hunter Settlement tile-B-02 (x=0, y=0, w=96, h=96) -> 40x40
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-02.png', 0, 0, 96, 96, 'public/assets/props/fur_rack.png', 40, 40);

  // Räuchergestell (Fleisch/Fisch): Hunter Settlement tile-B-02 (x=0, y=96, w=96, h=96) -> 40x40
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-02.png', 0, 96, 96, 96, 'public/assets/props/meat_rack.png', 40, 40);

  // Fisch-Räuchergestell: Hunter Settlement tile-B-02 (x=288, y=96, w=96, h=96) -> 40x40
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-02.png', 288, 96, 96, 96, 'public/assets/props/fish_rack.png', 40, 40);

  // Lagerfeuer mit Kessel: Hunter Settlement tile-B-01 (x=96, y=336, w=48, h=48) -> 32x32
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-01.png', 96, 336, 48, 48, 'public/assets/props/campfire_pot.png', 32, 32);

  // Heuschober / Strohschober: farm-2 tile-B-04 or Stone Age-1 (x=240, y=0, w=48, h=64) -> 36x48
  await cropImage('better assets/extracted/Stone Age-1/tile-B-04.png', 240, 0, 48, 64, 'public/assets/props/haystack.png', 36, 48);

  // Wassertrog & Bottich: Hunter Settlement tile-B-01 (x=0, y=720, w=96, h=48) -> 44x22
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-01.png', 0, 720, 96, 48, 'public/assets/props/water_trough.png', 44, 22);

  // Knochenhaufen & Stoßzähne: Hunter Settlement tile-B-01 (x=528, y=672, w=96, h=48) -> 42x24
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-01.png', 528, 672, 96, 48, 'public/assets/props/bone_pile.png', 42, 24);

  // Steinkreis (Megalith-Monument): Stone Age-1 tile-B-01 (x=384, y=48, w=96, h=96) -> 64x64
  await cropImage('better assets/extracted/Stone Age-1/tile-B-01.png', 384, 48, 96, 96, 'public/assets/props/stone_circle.png', 64, 64);

  // Holzstapel mit Axt: Hunter Settlement tile-B-01 (x=576, y=672, w=48, h=48) -> 28x28
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-01.png', 576, 672, 48, 48, 'public/assets/props/wood_stack.png', 28, 28);

  // Jagdfalle: Hunter Settlement tile-B-01 (x=432, y=144, w=48, h=48) -> 24x24
  await cropImage('better assets/extracted/Hunter Settlement/tile-B-01.png', 432, 144, 48, 48, 'public/assets/props/trap_active.png', 24, 24);

  // Upgraded Farmland (4-stage wheat from farm-2 tile-B-02)
  await cropImage('better assets/extracted/farm-2/tile-B-02.png', 0, 96, 48, 48, 'public/assets/props/farm_soil_dry.png', 16, 16);
  await cropImage('better assets/extracted/farm-2/tile-B-02.png', 48, 48, 48, 48, 'public/assets/props/farm_soil_wet.png', 16, 16);
  await cropImage('better assets/extracted/farm-2/tile-B-02.png', 96, 48, 48, 48, 'public/assets/props/farm_wheat_sprout.png', 16, 20);
  await cropImage('better assets/extracted/farm-2/tile-B-02.png', 240, 48, 48, 48, 'public/assets/props/farm_wheat_ripe.png', 16, 28);

  await browser.close();
  console.log('All better assets extracted successfully!');
}

buildBetterAssets().catch(console.error);
