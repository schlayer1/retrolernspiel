const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACTS_DIR = '/Users/nicolekeller/.gemini/antigravity/brain/ab502286-c9ab-41e4-bf7e-93baa19a65ce';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1200,900'],
    defaultViewport: { width: 1200, height: 900 }
  });

  const page = await browser.newPage();

  // Test 1: Chapter 1 (Ota's Tent, Fur rack, Meat rack, Camp)
  console.log('Capturing Chapter 1...');
  await page.goto('http://localhost:5173/?kapitel=1&neu=1', { waitUntil: 'networkidle0' });
  await sleep(2000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ch1_ota_camp_verified.png') });

  // Add sample items and open Inventory to verify new 32x32 Shikashi icons
  console.log('Capturing Inventory with new Shikashi icons...');
  await page.evaluate(() => {
    window.state.add('faustkeil', 1);
    window.state.add('beere', 8);
    window.state.add('fell', 3);
    window.state.add('gebraten', 2);
    window.state.add('fleisch', 2);
    window.state.add('stein', 5);
    window.state.add('stock', 6);
  });
  await sleep(300);
  await page.keyboard.press('KeyI');
  await sleep(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ch1_inventory_icons_verified.png') });
  await page.keyboard.press('KeyI'); // close inventory
  await sleep(400);

  // Test 2: Chapter 3 (Neolithic Village, Haystacks, Farm plots, Water trough)
  console.log('Capturing Chapter 3...');
  await page.goto('http://localhost:5173/?kapitel=3&neu=1', { waitUntil: 'networkidle0' });
  await sleep(2000);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ch3_village_haystacks_verified.png') });

  // Test 3: Chapter 5 (Megalithic Stone Circle, Nebra sky disk)
  console.log('Capturing Chapter 5 Stone Circle...');
  await page.goto('http://localhost:5173/?kapitel=5&neu=1', { waitUntil: 'networkidle0' });
  await sleep(2000);
  // Move player near stone circle at (575, 470)
  await page.evaluate(() => {
    const world = window.game.scene.getScene('World');
    if (world && world.player) {
      world.player.setPosition(575, 470);
    }
  });
  await sleep(800);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ch5_stone_circle_nebra_verified.png') });

  // Test 4: Enter Cave with Ice Age Mammoth skull and bone piles
  console.log('Entering Cave...');
  await page.evaluate(() => {
    const world = window.game.scene.getScene('World');
    if (world) {
      world.enterCave();
    }
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'cave_with_bones_verified.png') });

  // Test 5: Chapter 6 (Celtic Palisade, Forge, Torin)
  console.log('Capturing Chapter 6 Forge...');
  await page.goto('http://localhost:5173/?kapitel=6&neu=1', { waitUntil: 'networkidle0' });
  await sleep(2000);
  // Build the forge to see its sprite
  await page.evaluate(() => {
    window.state.buildings.push('schmiede');
    const world = window.game.scene.getScene('World');
    if (world) {
      world.scene.restart();
    }
  });
  await sleep(1500);
  // Position player near forge at (335, 175)
  await page.evaluate(() => {
    const world = window.game.scene.getScene('World');
    if (world && world.player) {
      world.player.setPosition(335, 205);
    }
  });
  await sleep(600);
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'ch6_forge_verified.png') });

  await browser.close();
  console.log('All screenshots captured successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
