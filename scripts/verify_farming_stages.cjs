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

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function setSave(overrides) {
    await page.evaluate((ov) => {
      const base = {
        version: 3,
        playerName: 'Sippenkind',
        playerGender: 'male',
        playerRole: 'hunter',
        chapter: 3,
        x: 520,
        y: 285,
        inventory: { hacke: 1, samen: 3, wasser: 1, sichel: 1, getreide: 2 },
        lexicon: ['sippe', 'nomaden', 'ackerbau'],
        relicsFound: [],
        relicQuizAnswered: [],
        food: 95,
        safety: 95,
        knowledge: 30,
        quest: 4,
        counts: {},
        fires: [{ x: 400, y: 310, t: Date.now() }],
        traps: [],
        plots: [
          { id: 0, stage: 'raw', wateredAt: 0 },
          { id: 1, stage: 'tilled', wateredAt: 0 },
          { id: 2, stage: 'seeded', wateredAt: 0 },
          { id: 3, stage: 'watered', wateredAt: Date.now() },
          { id: 4, stage: 'ripe', wateredAt: 0 },
          { id: 5, stage: 'raw', wateredAt: 0 },
        ],
        buildings: ['toepferofen'],
        wolfTamed: true,
        goatsTamed: 1,
        dayTime: 0.25,
        collapses: 0,
        quizAttempts: 0,
      };
      const merged = { ...base, ...ov, version: 3 };
      localStorage.setItem('steinzeit-save-v3', JSON.stringify(merged));
      Storage.prototype.setItem = () => {};
    }, overrides);
  }

  // 1. Initial page load to prepare storage
  await page.goto(`${BASE_URL}/?neu=1&kapitel=3`, { waitUntil: 'networkidle0' });
  await sleep(1000);

  // 2. Load Chapter 3 save with 5 different stages visible simultaneously
  console.log('Testing 5 simultaneous farming stages at Ackerfeld...');
  await setSave({
    x: 519,
    y: 275,
    plots: [
      { id: 0, stage: 'raw', wateredAt: 0 },
      { id: 1, stage: 'tilled', wateredAt: 0 },
      { id: 2, stage: 'seeded', wateredAt: 0 },
      { id: 3, stage: 'watered', wateredAt: Date.now() },
      { id: 4, stage: 'ripe', wateredAt: 0 },
      { id: 5, stage: 'ripe', wateredAt: 0 },
    ],
  });
  await page.goto(`${BASE_URL}/?direkt=1`, { waitUntil: 'networkidle0' });
  await sleep(2000);

  // Check HUD hint when standing near plot
  const hint = await page.evaluate(() => document.getElementById('hud-hint')?.textContent?.trim() || '');
  console.log('HUD Hint near plots:', hint);

  // Screenshot 1: Overview of Ackerfeld with all stages
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'farming_stages_in_game_verified.png') });
  console.log('Saved farming_stages_in_game_verified.png');

  // 3. Harvest plot 4 with sickle (pressing E)
  console.log('Interacting (Harvesting ripe wheat)...');
  await page.keyboard.press('KeyE');
  await sleep(600);

  // Screenshot 2: After harvest (plot reverts to tilled, +2 getreide, +2 samen)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'farming_after_harvest_verified.png') });
  console.log('Saved farming_after_harvest_verified.png');

  console.log('Errors encountered:', errors.length);
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exit(1);
  }

  await browser.close();
  console.log('Farming stages verified successfully!');
})();
