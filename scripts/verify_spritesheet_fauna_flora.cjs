const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = '/Users/nicolekeller/.gemini/antigravity/brain/ab502286-c9ab-41e4-bf7e-93baa19a65ce';
const BASE_URL = 'http://localhost:5173';

(async () => {
  console.log('Launching Chrome for fauna & flora verification...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error('Browser console error:', msg.text());
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    console.error('Browser page error:', err.message);
    errors.push(err.message);
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ----------------------------------------------------
  // Test 1: See-Ökosystem & Critters (Enten, Fische, Frösche, Schmetterlinge)
  // ----------------------------------------------------
  console.log('Test 1: Lake & Critters...');
  await page.goto(`${BASE_URL}/?direkt=1&neu=1`, { waitUntil: 'domcontentloaded' });
  await sleep(1800);

  const now = Date.now();
  await page.evaluate((now) => {
    const save = {
      version: 3,
      playerName: 'Sippenkind',
      playerGender: 'male',
      playerRole: 'gatherer',
      chapter: 3,
      x: 580,
      y: 190,
      inventory: { getreide: 3, milch: 2, beere: 5 },
      lexicon: ['sippe', 'falle', 'ackerbau', 'viehzucht'],
      relicsFound: [],
      relicQuizAnswered: [],
      food: 95,
      safety: 95,
      knowledge: 40,
      quest: 2,
      counts: { trap: 1 },
      fires: [{ x: 340, y: 310, t: now }],
      traps: [{ x: 440, y: 360, t: now - 35000 }],
      plots: [
        { id: 0, stage: 'seeded', wateredAt: 0 },
        { id: 1, stage: 'watered', wateredAt: now - 12000 },
        { id: 2, stage: 'watered', wateredAt: now - 24000 },
        { id: 3, stage: 'ripe', wateredAt: now - 40000 },
        { id: 4, stage: 'tilled', wateredAt: 0 },
        { id: 5, stage: 'raw', wateredAt: 0 },
      ],
      buildings: ['zaun_gehege'],
      wolfTamed: true,
      goatsTamed: 1,
      dayTime: 0.28,
      collapses: 0,
      quizAttempts: 0,
    };
    localStorage.setItem('snes_retro_game_save_v1', JSON.stringify(save));
  }, now);

  await page.goto(`${BASE_URL}/?direkt=1`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);

  const lakeShot = path.join(ARTIFACT_DIR, 'verified_lake_fauna.png');
  await page.screenshot({ path: lakeShot });
  console.log('Saved:', lakeShot);

  // ----------------------------------------------------
  // Test 2: Neolithischer Ackerbau & Wilde Feldhasen (x: 510, y: 260)
  // ----------------------------------------------------
  console.log('Test 2: Crops & Rabbits...');
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    // Walk player south towards the crop plots
    const scene = game?.scene?.getScene('World');
    if (scene && scene.player) {
      scene.player.setPosition(520, 260);
      scene.cameras.main.centerOn(520, 260);
    }
  });
  await sleep(1500);

  const cropShot = path.join(ARTIFACT_DIR, 'verified_wheat_and_rabbits.png');
  await page.screenshot({ path: cropShot });
  console.log('Saved:', cropShot);

  // ----------------------------------------------------
  // Test 3: Ziegengehege mit Nachwuchs & treuer Hütehund Lupo (x: 535, y: 355)
  // ----------------------------------------------------
  console.log('Test 3: Goat pen, Baby kid & Lupo...');
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game?.scene?.getScene('World');
    if (scene && scene.player) {
      scene.player.setPosition(535, 355);
      scene.cameras.main.centerOn(535, 355);
    }
  });
  await sleep(1800);

  const penShot = path.join(ARTIFACT_DIR, 'verified_livestock_and_lupo.png');
  await page.screenshot({ path: penShot });
  console.log('Saved:', penShot);

  // ----------------------------------------------------
  // Test 4: Auerochsen & Ur-Kalb auf der Weide (x: 250, y: 500)
  // ----------------------------------------------------
  console.log('Test 4: Auerochse & Ur-Kalb...');
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const scene = game?.scene?.getScene('World');
    if (scene && scene.player) {
      scene.player.setPosition(250, 500);
      scene.cameras.main.centerOn(250, 500);
    }
  });
  await sleep(1500);

  const pastureShot = path.join(ARTIFACT_DIR, 'verified_pasture_auerochse_calf.png');
  await page.screenshot({ path: pastureShot });
  console.log('Saved:', pastureShot);

  // ----------------------------------------------------
  // Test 5: Höhle mit leuchtenden Pilzen & Flechten
  // ----------------------------------------------------
  console.log('Test 5: Cave mushrooms & flora...');
  await page.evaluate(() => {
    const game = window.__PHASER_GAME__;
    const worldScene = game?.scene?.getScene('World');
    if (worldScene) {
      worldScene.enterCave();
    }
  });
  await sleep(2200);

  const caveShot = path.join(ARTIFACT_DIR, 'verified_cave_mushrooms.png');
  await page.screenshot({ path: caveShot });
  console.log('Saved:', caveShot);

  await browser.close();

  if (errors.length > 0) {
    console.error('Verification encountered errors:', errors);
    process.exit(1);
  } else {
    console.log('Verification successful with 0 errors!');
  }
})();
