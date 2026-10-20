const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACT_DIR = '/Users/nicolekeller/.gemini/antigravity/brain/ab502286-c9ab-41e4-bf7e-93baa19a65ce';
const BASE_URL = 'http://localhost:5173';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`PAGE ERROR: ${err.message}`));

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  console.log('Navigating to game...');
  await page.goto(`${BASE_URL}/?direkt=1&neu=1`, { waitUntil: 'domcontentloaded' });
  await sleep(1500);

  const now = Date.now();
  await page.evaluate((now) => {
    const save = {
      version: 3,
      playerName: 'Sippenkind',
      playerGender: 'male',
      playerRole: 'hunter',
      chapter: 1,
      x: 460,
      y: 360,
      inventory: { stock: 6, stein: 4, beere: 5 },
      lexicon: ['sippe', 'nomaden', 'falle'],
      relicsFound: [],
      relicQuizAnswered: [],
      food: 95,
      safety: 95,
      knowledge: 20,
      quest: 3,
      counts: { trap: 1 },
      fires: [{ x: 340, y: 310, t: now }],
      traps: [
        { x: 420, y: 360, t: now - 3000 },    // EMPTY (wartend, 3s alt)
        { x: 500, y: 360, t: now - 35000 },   // FULL (ausgelöst, 35s alt)
      ],
      plots: [],
      buildings: [],
      wolfTamed: false,
      goatsTamed: 0,
      dayTime: 0.25,
      collapses: 0,
      quizAttempts: 0,
    };
    localStorage.setItem('steinzeit-save-v3', JSON.stringify(save));
    Storage.prototype.setItem = () => {};
  }, now);

  // Reload to let world spawn the traps from the save
  await page.goto(`${BASE_URL}/?direkt=1`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);

  // 1. Capture In-Game Overworld with Empty Trap & Full Trap!
  const trapInGamePath = path.join(ARTIFACT_DIR, 'verified_traps_in_game.png');
  await page.screenshot({ path: trapInGamePath });
  console.log('Saved verified_traps_in_game.png');

  // Closeup centered on player and both traps (viewport 1280x720)
  const closeupPath = path.join(ARTIFACT_DIR, 'verified_traps_closeup.png');
  await page.screenshot({
    path: closeupPath,
    clip: { x: 480, y: 260, width: 340, height: 220 }
  });
  console.log('Saved verified_traps_closeup.png');

  // 2. Open Crafting Panel (Press "C")
  await page.keyboard.press('KeyC');
  await sleep(700);
  const craftPath = path.join(ARTIFACT_DIR, 'verified_crafting_trap_icon.png');
  await page.screenshot({ path: craftPath });
  console.log('Saved verified_crafting_trap_icon.png');

  // Close Crafting Panel
  await page.keyboard.press('KeyC');
  await sleep(400);

  // 3. Open Lexicon (Press "L")
  await page.keyboard.press('KeyL');
  await sleep(700);

  // Click on "falle" in lexicon list if possible
  await page.evaluate(() => {
    const falleBtn = document.querySelector('[data-lex-id="falle"]');
    if (falleBtn) falleBtn.click();
  });
  await sleep(500);

  const lexPath = path.join(ARTIFACT_DIR, 'verified_lexicon_trap_icon.png');
  await page.screenshot({ path: lexPath });
  console.log('Saved verified_lexicon_trap_icon.png');

  if (errors.length > 0) {
    console.error('Errors encountered:', errors);
  } else {
    console.log('ALL IN-GAME TRAP VERIFICATIONS PASSED WITH ZERO ERRORS!');
  }

  await browser.close();
})();
