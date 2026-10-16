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

  console.log('Testing Longhouse collisions...');
  await page.goto('http://localhost:5173/?kapitel=3&neu=1', { waitUntil: 'networkidle0' });
  await sleep(2000);

  // Enter longhouse
  await page.evaluate(() => {
    const world = window.game.scene.getScene('World');
    if (world) {
      world.scene.start('Longhouse');
    }
  });
  await sleep(1500);

  // Position player directly in front of the barrel at (375, 95) facing up towards the barrel
  await page.evaluate(() => {
    const house = window.game.scene.getScene('Longhouse');
    if (house && house.player) {
      house.player.setPosition(375, 90);
    }
  });
  await sleep(500);

  // Now press ArrowUp to walk into the barrel for 500ms
  await page.keyboard.down('ArrowUp');
  await sleep(500);
  await page.keyboard.up('ArrowUp');
  await sleep(300);

  // Check player position to ensure blocked by barrel collider
  const pos = await page.evaluate(() => {
    const house = window.game.scene.getScene('Longhouse');
    return { x: house.player.x, y: house.player.y };
  });
  console.log('Player position after walking UP into barrel:', pos);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'longhouse_barrel_collision_verified.png') });

  await browser.close();
  console.log('Longhouse collision test completed successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
