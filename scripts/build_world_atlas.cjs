/**
 * Baut den Welt-Atlas aus den "better assets"-Packs.
 * Voraussetzung: node scripts/catalog_sheets.cjs (erzeugt scratch/catalog/<sheet>.json mit Sprite-Indizes)
 * Ausgabe: public/assets/world/world_atlas.png + world_atlas.json, ground_a2.png, contact sheet
 */
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CAT = '/Users/nicolekeller/.gemini/antigravity/brain/ab502286-c9ab-41e4-bf7e-93baa19a65ce/scratch/catalog';
const OUT_DIR = path.join(ROOT, 'public/assets/world');
const SHEETS = JSON.parse(fs.readFileSync(path.join(__dirname, 'world_sheets.json'), 'utf8'));

// id -> [sheet, index]
const PICKS = {
  // Bäume
  tree_pine_1: ['hunter_b01', 24], tree_pine_2: ['hunter_b01', 25], tree_pine_3: ['hunter_b01', 26],
  tree_pine_4: ['hunter_b01', 27], tree_pine_5: ['hunter_b01', 28],
  tree_fir_1: ['hunter_b01', 32], tree_fir_2: ['hunter_b01', 33], tree_fir_3: ['hunter_b01', 34],
  tree_oak_1: ['hunter_b01', 29], tree_oak_2: ['hunter_b01', 30], tree_oak_3: ['hunter_b01', 31],
  tree_pine_tall: ['sa1_b03', 0], tree_oak_tall: ['sa1_b03', 1], tree_pine_slim: ['sa1_b03', 2],
  tree_small_1: ['sa1_b03', 8], tree_small_2: ['sa1_b03', 9], tree_small_3: ['sa1_b03', 14], tree_small_4: ['sa1_b03', 15],
  tree_apple: ['farm2_b07', 11], tree_pear: ['farm2_b07', 12], tree_willow: ['farm2_b07', 8],
  tree_autumn_1: ['farm2_b07', 13], tree_autumn_2: ['farm2_b07', 14],
  tree_dead: ['hunter_b04', 186], tree_bare_1: ['hunter_b04', 191], tree_bare_2: ['hunter_b04', 192],
  // Baumstümpfe & Holz
  stump_a: ['hunter_b01', 38], stump_b: ['hunter_b01', 37], stump_c: ['hunter_b01', 44], stump_axe: ['hunter_b01', 49],
  logs_a: ['hunter_b01', 46], logs_b: ['hunter_b01', 47], logs_c: ['hunter_b01', 40], logs_d: ['hunter_b01', 42],
  log_tall_a: ['sa1_b03', 3], log_tall_b: ['sa1_b03', 4],
  // Felsen
  rock_big_a: ['sa1_b03', 23], rock_big_b: ['sa1_b03', 24], rock_big_c: ['sa1_b03', 25],
  rock_tall_a: ['sa1_b03', 26], rock_tall_b: ['sa1_b03', 34],
  rock_small_a: ['sa1_b03', 27], rock_small_b: ['sa1_b03', 28], rock_small_c: ['sa1_b03', 38], rock_small_d: ['sa1_b03', 39],
  rock_moss_a: ['hunter_b03', 34], rock_moss_b: ['hunter_b03', 35], rock_moss_c: ['hunter_b03', 43], rock_moss_d: ['hunter_b03', 44],
  rock_moss_e: ['hunter_b03', 45], rock_moss_f: ['hunter_b03', 46], rock_moss_g: ['hunter_b03', 49], rock_moss_h: ['hunter_b03', 50],
  rock_moss_i: ['hunter_b03', 51], rock_moss_j: ['hunter_b03', 52], rock_moss_k: ['hunter_b03', 53],
  rock_cluster: ['hunter_b04', 160], rock_flat: ['hunter_b04', 176],
  // Büsche & Beeren
  bush_a: ['hunter_b01', 117], bush_b: ['hunter_b01', 118],
  bush_berry_red: ['hunter_b01', 119], bush_berry_red2: ['hunter_b01', 120], bush_berry_blue: ['hunter_b01', 128],
  bush_berry_orange: ['hunter_b01', 129], bush_flower_a: ['hunter_b01', 123],
  bush_big_berry: ['hunter_b04', 130], bush_big_blue: ['hunter_b04', 151], bush_big_flower: ['hunter_b04', 169],
  bush_big_leaf: ['hunter_b04', 172], bush_big_green: ['hunter_b04', 188], bush_big_pink: ['hunter_b04', 154],
  bush_tall_a: ['hunter_b04', 132], bush_tall_b: ['hunter_b04', 153], bush_huge: ['sa1_b03', 5], fern_big: ['sa1_b03', 16],
  hedge_a: ['farm2_b07', 103], hedge_b: ['farm2_b07', 104],
  // Gras, Farne, Blumen, Pilze
  grass_1: ['sa1_b03', 6], grass_2: ['sa1_b03', 12], grass_3: ['sa1_b03', 17], grass_4: ['sa1_b03', 21],
  grass_s1: ['sa1_b03', 7], grass_s2: ['sa1_b03', 13], grass_s3: ['sa1_b03', 18], grass_s4: ['sa1_b03', 22],
  fern_1: ['hunter_b04', 144], fern_2: ['hunter_b04', 145], fern_3: ['hunter_b04', 146], fern_4: ['hunter_b04', 155],
  flower_purple: ['hunter_b04', 135], flower_white: ['hunter_b04', 143],
  flower_sun: ['farm2_b07', 62], flower_tulip_y: ['farm2_b07', 53], flower_red_a: ['farm2_b07', 56], flower_red_b: ['farm2_b07', 72],
  flower_pink: ['farm2_b07', 58], flower_blue_a: ['farm2_b07', 86], flower_blue_b: ['farm2_b07', 91], flower_purple_b: ['farm2_b07', 96],
  flower_bunch_a: ['farm2_b07', 82], flower_bunch_b: ['farm2_b07', 83], flower_bunch_c: ['farm2_b07', 84],
  mushroom_red: ['hunter_b01', 122], mushroom_small: ['hunter_b01', 121], mushroom_b: ['hunter_b01', 130],
  // Zäune, Dorf
  fence_a: ['hunter_b01', 8], fence_b: ['hunter_b01', 9], fence_picket: ['hunter_b01', 10], fence_c: ['hunter_b01', 11],
  fence_cross: ['hunter_b01', 12], fence_gate: ['hunter_b01', 13], fence_post: ['hunter_b01', 14],
  well: ['farm2_b07', 135], scarecrow_a: ['farm2_b07', 132], scarecrow_b: ['farm2_b07', 133],
  sign_a: ['farm2_b07', 125], sign_b: ['farm2_b07', 126], sign_c: ['farm2_b07', 127],
  hay_bale_a: ['farm2_b07', 130], hay_bale_b: ['farm2_b07', 131],
  wheelbarrow: ['farm2_b06', 8], wheelbarrow_hay: ['farm2_b06', 9], wheelbarrow_veg: ['farm2_b06', 10],
  beehive_a: ['farm2_b06', 4], beehive_b: ['farm2_b06', 12], beehive_c: ['farm2_b06', 19],
  trough_a: ['farm2_b06', 31], trough_hay: ['farm2_b06', 32], trough_b: ['farm2_b06', 47], trough_hay2: ['farm2_b06', 49],
  barrel_a: ['hunter_b01', 143], barrel_b: ['hunter_b01', 146], crate_a: ['hunter_b01', 141], crate_b: ['hunter_b01', 149],
  sack_a: ['hunter_b01', 145], basket_a: ['hunter_b01', 147], basket_b: ['hunter_b01', 148],
  torch: ['hunter_b01', 156], lantern: ['hunter_b01', 154], banner_a: ['hunter_b01', 160], banner_b: ['hunter_b01', 161],
  // Gebäude
  hut_thatch_a: ['sa1_b01', 3], hut_thatch_b: ['sa1_b01', 4],
  hut_round_a: ['sa1_b01', 5], hut_round_b: ['sa1_b01', 6], hut_round_c: ['sa1_b01', 7],
  house_thatch_long: ['hunter_b03', 3], house_thatch_big: ['hunter_b03', 4], house_thatch_big2: ['hunter_b03', 5],
  house_thatch_small: ['hunter_b03', 10], house_thatch_wide: ['hunter_b03', 11], cabin_log: ['hunter_b01', 0],
  shelter_thatch: ['hunter_b01', 4],
  // Lager (Kapitel 1-2)
  tent_fur_a: ['sa1_b01', 0], tent_fur_b: ['sa1_b01', 1], tent_straw: ['sa1_b01', 2], tent_hide: ['sa1_b01', 8],
  tent_green: ['sa1_b01', 9], tent_brown: ['sa1_b01', 18], tent_tan: ['sa1_b01', 26],
  campfire: ['sa1_b03', 59], cauldron_fire: ['sa1_b03', 55], hide_rack_a: ['sa1_b03', 56], hide_rack_b: ['sa1_b03', 65],
  hide_rack_c: ['sa1_b03', 66], meat_rack_a: ['hunter_b03', 61], meat_rack_b: ['hunter_b03', 62], meat_rack_c: ['hunter_b03', 63],
  fish_rack: ['hunter_b01', 71], skull_bull: ['sa1_b03', 86], skulls_pair: ['sa1_b03', 101], totem: ['sa1_b03', 103],
  gravestone: ['sa1_b03', 102], bones_pile: ['sa1_b03', 51], bones_small: ['sa1_b03', 42], stone_ring: ['sa1_b03', 60],
  // Höhle & Felsrücken
  cave_mouth: ['sa1_b03', 47], stone_arch_a: ['sa1_b03', 46], stone_arch_b: ['sa1_b03', 53], stone_arch_c: ['sa1_b03', 54],
  stone_wall: ['sa1_b03', 45],
  // See & Brücke
  bridge_v: ['sa1_b03', 100], bridge_h: ['hunter_b01', 165], ladder: ['hunter_b01', 162],
  pebbles_a: ['sa1_b03', 30], pebbles_b: ['sa1_b03', 31], pebbles_c: ['sa1_b03', 40],
};

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  const catalogs = {};
  const images = {};
  for (const name of Object.keys(SHEETS)) {
    catalogs[name] = JSON.parse(fs.readFileSync(path.join(CAT, name + '.json'), 'utf8'));
    images[name] = fs.readFileSync(path.join(ROOT, SHEETS[name])).toString('base64');
  }

  const entries = [];
  for (const [id, [sheet, idx]] of Object.entries(PICKS)) {
    const box = catalogs[sheet][idx];
    if (!box) throw new Error(`Unbekannter Sprite ${id}: ${sheet}[${idx}]`);
    entries.push({ id, sheet, x: box.x, y: box.y, w: box.w, h: box.h });
  }

  const result = await page.evaluate(async (entries, images) => {
    const loaded = {};
    for (const [k, b64] of Object.entries(images)) {
      loaded[k] = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + b64; });
    }
    // Shelf-Packing, Breite 1024, Padding 2
    const PAD = 2, W = 1024;
    const sorted = [...entries].sort((a, b) => b.h - a.h);
    let x = PAD, y = PAD, rowH = 0;
    for (const e of sorted) {
      if (x + e.w + PAD > W) { x = PAD; y += rowH + PAD; rowH = 0; }
      e.ax = x; e.ay = y; x += e.w + PAD; rowH = Math.max(rowH, e.h);
    }
    const H = y + rowH + PAD;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    for (const e of sorted) ctx.drawImage(loaded[e.sheet], e.x, e.y, e.w, e.h, e.ax, e.ay, e.w, e.h);
    const frames = {};
    for (const e of entries) {
      frames[e.id] = {
        frame: { x: e.ax, y: e.ay, w: e.w, h: e.h }, rotated: false, trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: e.w, h: e.h }, sourceSize: { w: e.w, h: e.h },
      };
    }
    // Kontaktbogen
    const cs = document.createElement('canvas'); cs.width = 1400; cs.height = 1600;
    const cx = cs.getContext('2d'); cx.imageSmoothingEnabled = false;
    cx.fillStyle = '#4a7a3a'; cx.fillRect(0, 0, cs.width, cs.height);
    cx.font = '9px sans-serif';
    let px = 4, py = 4, rh = 0;
    for (const e of entries) {
      const cw = Math.max(e.w, 60) + 6;
      if (px + cw > cs.width) { px = 4; py += rh + 14; rh = 0; }
      cx.drawImage(loaded[e.sheet], e.x, e.y, e.w, e.h, px, py, e.w, e.h);
      cx.fillStyle = '#fff'; cx.fillText(e.id, px, py + e.h + 9);
      px += cw; rh = Math.max(rh, e.h);
    }
    return { atlas: c.toDataURL('image/png'), W, H, frames, contact: cs.toDataURL('image/png') };
  }, entries, images);

  fs.writeFileSync(path.join(OUT_DIR, 'world_atlas.png'), Buffer.from(result.atlas.split(',')[1], 'base64'));
  fs.writeFileSync(
    path.join(OUT_DIR, 'world_atlas.json'),
    JSON.stringify({ frames: result.frames, meta: { image: 'world_atlas.png', size: { w: result.W, h: result.H }, scale: '1' } }),
  );
  fs.writeFileSync(
    '/Users/nicolekeller/.gemini/antigravity/brain/ab502286-c9ab-41e4-bf7e-93baa19a65ce/scratch/contact_world.png',
    Buffer.from(result.contact.split(',')[1], 'base64'),
  );
  fs.copyFileSync(path.join(ROOT, 'better assets/Hunter Settlement/Tile_A2-1 (2).png'), path.join(OUT_DIR, 'ground_a2.png'));
  console.log('Atlas', result.W, 'x', result.H, '-', entries.length, 'Sprites');
  await browser.close();
})();
