const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = '/Users/nicolekeller/.gemini/antigravity/brain/ab502286-c9ab-41e4-bf7e-93baa19a65ce';
const BASE_URL = 'http://localhost:5173';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`PAGE ERROR: ${err.message}`));
  page.on('requestfailed', (req) => {
    const errText = req.failure()?.errorText || '';
    if (req.url().endsWith('.mp3') && errText.includes('ERR_ABORTED')) return;
    errors.push(`REQ FAILED: ${req.url()} (${errText})`);
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Helper to write a valid SaveData v3 object to localStorage('steinzeit-save-v3')
  async function setSave(overrides) {
    await page.evaluate((ov) => {
      const raw = localStorage.getItem('steinzeit-save-v3');
      const base = raw
        ? JSON.parse(raw)
        : {
            version: 3,
            playerName: 'Sippenkind',
            playerGender: 'male',
            playerRole: 'hunter',
            chapter: 1,
            x: 400,
            y: 324,
            inventory: {},
            lexicon: ['sippe', 'nomaden'],
            relicsFound: [],
            relicQuizAnswered: [],
            food: 90,
            safety: 95,
            knowledge: 20,
            quest: 1,
            counts: {},
            fires: [{ x: 400, y: 310, t: Date.now() }],
            traps: [],
            plots: [
              { id: 0, stage: 'ripe', wateredAt: 0 },
              { id: 1, stage: 'ripe', wateredAt: 0 },
              { id: 2, stage: 'watered', wateredAt: Date.now() },
              { id: 3, stage: 'seeded', wateredAt: 0 },
              { id: 4, stage: 'tilled', wateredAt: 0 },
              { id: 5, stage: 'raw', wateredAt: 0 },
            ],
            buildings: [],
            wolfTamed: false,
            goatsTamed: 0,
            dayTime: 0.25,
            collapses: 0,
            quizAttempts: 0,
          };
      const merged = { ...base, ...ov, version: 3 };
      localStorage.setItem('steinzeit-save-v3', JSON.stringify(merged));
      // Prevent current page's beforeunload handler from overwriting our newly injected save
      Storage.prototype.setItem = () => {};
    }, overrides);
  }

  // 1. Chapter 1: Nomad Camp & Seamless Terrain
  console.log('1. Testing Chapter 1 (Nomad Camp, Seamless Ground, Paths, Berries)...');
  await page.goto(`${BASE_URL}/?neu=1&kapitel=1`, { waitUntil: 'networkidle0' });
  await sleep(1600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'world_ch1_nomad_camp_upgraded.png') });

  // 2. Chapter 3: Roaming Wild Goats & Catching Quest Verification
  console.log('2. Testing Chapter 3 (Roaming Wild Goats & Catching Quest)...');
  await setSave({
    chapter: 3,
    quest: 3,
    buildings: ['toepferofen', 'gehege'],
    inventory: { getreide: 2, stock: 8, stein: 8, lehm: 6, sichel: 1, hacke: 1 },
    wolfTamed: true,
    goatsTamed: 0,
    x: 618,
    y: 374,
  });
  await page.goto(`${BASE_URL}/?direkt=1`, { waitUntil: 'networkidle0' });
  await sleep(2000); // Let roaming wild goat walk curiously toward player with grain!

  const hintBeforeCatch = await page.evaluate(() => {
    const el = document.getElementById('hud-hint');
    return el ? el.textContent.trim() : '';
  });
  console.log('Hint near roaming wild goat:', hintBeforeCatch);
  if (!hintBeforeCatch.includes('Wildziege')) {
    throw new Error(`Expected Wildziege interaction hint, got: "${hintBeforeCatch}"`);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'world_ch3_goats_pasture_upgraded.png') });

  // Press E to catch the wild goat!
  await page.keyboard.press('KeyE');
  await sleep(800);

  // Move player to show Fenced Gehege with newly tamed goat + Farm + Auerochse
  await setSave({
    chapter: 3,
    quest: 4,
    buildings: ['toepferofen', 'gehege', 'speicher'],
    inventory: { getreide: 1, stock: 8, stein: 8 },
    wolfTamed: true,
    goatsTamed: 1,
    x: 545,
    y: 315,
  });
  await page.goto(`${BASE_URL}/?direkt=1`, { waitUntil: 'networkidle0' });
  await sleep(1600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'world_ch3_gehege_farm_upgraded.png') });

  // 3. Northern Mountain Ridge & Cave Entrance (`cave_mouth`) + Ore Veins in Chapter 6
  console.log('3. Testing Northern Mountain Ridge & Cave Entrance (Chapter 6)...');
  await setSave({
    chapter: 6,
    quest: 4,
    buildings: ['toepferofen', 'gehege', 'speicher', 'langhaus', 'webstuhl', 'schmelzofen', 'schmiede'],
    inventory: { spitzhacke: 1 },
    wolfTamed: true,
    goatsTamed: 1,
    x: 370,
    y: 74,
  });
  await page.goto(`${BASE_URL}/?direkt=1`, { waitUntil: 'networkidle0' });
  await sleep(1600);
  const caveHint = await page.evaluate(() => document.getElementById('hud-hint')?.textContent?.trim() || '');
  console.log('Hint at cave entrance:', caveHint);
  if (!caveHint.includes('Höhle')) {
    throw new Error(`Expected Höhle hint at (370,74), got: "${caveHint}"`);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'world_cave_entrance_upgraded.png') });

  // 4. Chapter 6 Full Settlement (Langhaus, Speicher, Well, Cobblestone Plaza, Workshops)
  console.log('4. Testing Chapter 6 Full Settlement...');
  await setSave({
    chapter: 6,
    quest: 4,
    buildings: ['toepferofen', 'gehege', 'speicher', 'langhaus', 'webstuhl', 'schmelzofen', 'schmiede'],
    wolfTamed: true,
    goatsTamed: 1,
    x: 385,
    y: 285,
  });
  await page.goto(`${BASE_URL}/?direkt=1`, { waitUntil: 'networkidle0' });
  await sleep(1600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'world_ch6_settlement_upgraded.png') });

  // 5. Debug Hitbox & Reach Overlay (F3)
  console.log('5. Testing F3 Debug Hitbox Overlay...');
  await page.keyboard.press('F3');
  await sleep(400);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'world_debug_hitboxes_verified.png') });

  console.log('Errors count:', errors.length);
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
  }

  await browser.close();
  console.log('All verification checks passed!');
})();
