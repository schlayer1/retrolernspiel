import Phaser from 'phaser';
import { ITEMS } from '../data/items';
import { state } from '../systems/GameState';

/** Benannte Ausschnitte (x, y, w, h in Pixeln) aus gfx/Overworld.png. */
export const OVERWORLD_FRAMES: Record<string, [number, number, number, number]> = {
  grass: [0, 0, 16, 16],
  water: [48, 48, 16, 16],
  rocks: [68, 24, 24, 22],
  bush: [81, 256, 30, 26],
  flowers: [0, 128, 16, 16],
  langhaus: [96, 0, 80, 80],
  speicher_hut: [208, 64, 32, 48],
  fence_h: [16, 288, 32, 16],
  cave_entrance: [208, 496, 64, 64],
  market_stall: [288, 368, 96, 80],
};

/** Benannte Ausschnitte aus gfx/objects.png. */
export const OBJECT_FRAMES: Record<string, [number, number, number, number]> = {
  stump: [0, 160, 32, 32],
  berrybush: [256, 192, 32, 32],
  bigrock: [320, 4, 32, 30],
  bubble_excl: [32, 128, 16, 16],
  pot: [64, 96, 16, 16],
  ...Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`fire${i}`, [64 + 16 * i, 48, 16, 16]])),
};

/** Benannte Ausschnitte aus gfx/farm.png (Farming 101). */
export const FARM_FRAMES: Record<string, [number, number, number, number]> = {
  soil_raw: [144, 96, 16, 16],
  soil_dry: [176, 48, 16, 16],
  soil_wet: [32, 96, 16, 16],
  wheat_seed: [240, 16, 16, 16],
  wheat_sprout: [256, 16, 16, 16],
  wheat_tall: [272, 0, 16, 32],
  wheat_ripe: [288, 0, 16, 32],
  sign_build: [288, 96, 16, 16],
};

/** Benannte Kachelausschnitte aus gfx/cave.png (Höhlen-Tileset). */
export const CAVE_FRAMES: Record<string, [number, number, number, number]> = {
  // Böden
  floor_dark: [16, 0, 16, 16],
  floor_smooth: [32, 0, 16, 16],
  floor_rocky: [48, 0, 16, 16],
  floor_pebble1: [16, 16, 16, 16],
  floor_pebble2: [32, 16, 16, 16],
  floor_cracked: [48, 16, 16, 16],

  // Nordwand / Felswand
  wall_tl: [64, 0, 16, 16],
  wall_top: [80, 0, 16, 16],
  wall_tr: [96, 0, 16, 16],
  wall_left: [64, 16, 16, 16],
  wall_face: [80, 16, 16, 16],
  wall_right: [96, 16, 16, 16],
  wall_bl: [64, 32, 16, 16],
  wall_bottom: [80, 32, 16, 16],
  wall_br: [96, 32, 16, 16],

  // Vertikale Felswände
  wall_face_upper: [16, 48, 16, 16],
  wall_face_mid: [16, 64, 16, 16],
  wall_face_lower: [16, 80, 16, 16],

  // Höhlen-Wasser
  water: [64, 144, 16, 16],
  water_shore_n: [112, 144, 16, 16],
  water_shore_s: [128, 144, 16, 16],
  water_shore_w: [144, 144, 16, 16],
  water_shore_e: [160, 144, 16, 16],

  // Höhlen-Deko & Geologie
  stalagmite: [0, 0, 16, 32],
  stalactite: [0, 32, 16, 16],
  ore_crystal: [112, 48, 16, 16],
  rock_pile: [160, 64, 16, 16],
  arch_exit: [128, 64, 32, 32],
};

/** Benannte Kachelausschnitte aus gfx/Inner.png (Innenraum-Tileset). */
export const INNER_FRAMES: Record<string, [number, number, number, number]> = {
  // Holzdielen- & Steinböden (glatte, warme Holzplanken)
  wood_floor_1: [16, 64, 16, 16],
  wood_floor_2: [32, 64, 16, 16],
  wood_floor_3: [48, 64, 16, 16],
  stone_floor: [16, 0, 16, 16],

  // Urzeit-Holzbalken-Wände
  wall_top: [112, 0, 16, 16],
  wall_mid: [112, 16, 16, 16],
  wall_base: [112, 32, 16, 16],
  wall_corner_tl: [96, 0, 16, 16],
  wall_corner_tr: [128, 0, 16, 16],
  wall_side_left: [96, 16, 16, 16],
  wall_side_right: [128, 16, 16, 16],
  wall_corner_bl: [96, 32, 16, 16],
  wall_corner_br: [128, 32, 16, 16],

  // Deko & Einbauten
  hearth: [0, 112, 48, 48],
  shelf: [64, 48, 32, 16],
  rug: [224, 0, 48, 32],
  clay_pots: [144, 96, 16, 16],
  window: [160, 0, 16, 16],
  stool: [64, 144, 16, 16],
};

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const bar = this.add.rectangle(w / 2 - 60, h / 2, 0, 6, 0xe8c170).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => (bar.width = 120 * p));

    this.load.atlas('world', 'assets/world/world_atlas.png', 'assets/world/world_atlas.json');
    this.load.image('ground_a2', 'assets/world/ground_a2.png');
    this.load.image('overworld', 'assets/gfx/Overworld.png');
    this.load.image('objects', 'assets/gfx/objects.png');
    this.load.image('farm', 'assets/gfx/farm.png');
    this.load.image('ores', 'assets/gfx/ores.png');
    this.load.image('cave_tiles', 'assets/gfx/cave.png');
    this.load.image('inner_tiles', 'assets/gfx/Inner.png');
    this.load.spritesheet('goat', 'assets/gfx/goat.png', { frameWidth: 80, frameHeight: 80 });
    this.load.spritesheet('cow', 'assets/gfx/cow.png', { frameWidth: 80, frameHeight: 80 });
    this.load.spritesheet('player', 'assets/gfx/character.png', { frameWidth: 16, frameHeight: 32 });
    this.load.spritesheet('characters_all', 'assets/gfx/characters.png', { frameWidth: 16, frameHeight: 16 });

    // Neue lebendige SNES-Fauna & Flora
    this.load.spritesheet('sdv_goat', 'assets/fauna/goat.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('sdv_goat_baby', 'assets/fauna/goat_baby.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('sdv_cow', 'assets/fauna/cow.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('sdv_calf', 'assets/fauna/calf.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('sdv_wolf', 'assets/fauna/wolf.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('sdv_dog_lupo', 'assets/fauna/dog_lupo.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('sdv_rabbit', 'assets/fauna/rabbit.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sdv_pig', 'assets/fauna/pig.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('sdv_duck', 'assets/fauna/duck.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sdv_critters', 'assets/fauna/critters.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('sdv_crops', 'assets/flora/crops.png', { frameWidth: 16, frameHeight: 32 });
    this.load.spritesheet('sdv_cave_plants', 'assets/flora/cave_plants.png', { frameWidth: 16, frameHeight: 24 });
    this.load.spritesheet('sdv_bushes', 'assets/flora/bushes.png', { frameWidth: 32, frameHeight: 32 });

    // Vollwertige 16-Bit-Charaktere für alle Dorf-NPCs (16x32)
    const npcIds = ['ota', 'alva', 'barak', 'mila', 'jana', 'kora', 'tarek', 'enki'];
    npcIds.forEach((id) => {
      this.load.spritesheet(`npc_${id}`, `assets/gfx/npcs/npc_${id}.png`, { frameWidth: 16, frameHeight: 32 });
    });

    // Hochwertige Möbel & Props
    this.load.image('prop_bed', 'assets/props/bed.png');
    this.load.image('prop_chest', 'assets/props/chest.png');
    this.load.image('prop_fireplace', 'assets/props/fireplace.png');
    this.load.image('prop_table', 'assets/props/table.png');
    this.load.image('prop_sack', 'assets/props/sack.png');
    this.load.image('prop_barrel', 'assets/props/barrel.png');
    this.load.image('prop_hay', 'assets/props/hay.png');

    // Neue hochwertige 16-Bit-Werkstätten & Gebäude-Props
    this.load.image('kiln', 'assets/props/kiln.png');
    this.load.image('loom', 'assets/props/loom.png');
    this.load.image('smelter', 'assets/props/smelter.png');
    this.load.image('forge', 'assets/props/forge.png');
    this.load.image('clay_pile', 'assets/props/clay_pile.png');
    this.load.image('trap', 'assets/props/trap_active.png');
    this.load.image('trap_full', 'assets/props/trap_full.png');
    this.load.image('icon-trap', 'assets/icons/trap.png');

    // Atmosphärische Welt-Dekorationen & Epochen-Props
    this.load.image('prop_tent_ota', 'assets/props/tent_ota.png');
    this.load.image('prop_fur_rack', 'assets/props/fur_rack.png');
    this.load.image('prop_meat_rack', 'assets/props/meat_rack.png');
    this.load.image('prop_fish_rack', 'assets/props/fish_rack.png');
    this.load.image('prop_campfire_pot', 'assets/props/campfire_pot.png');
    this.load.image('prop_haystack', 'assets/props/haystack.png');
    this.load.image('prop_water_trough', 'assets/props/water_trough.png');
    this.load.image('prop_bone_pile', 'assets/props/bone_pile.png');
    this.load.image('prop_stone_circle', 'assets/props/stone_circle.png');
    this.load.image('prop_roundhouse', 'assets/props/roundhouse.png');
    this.load.image('prop_wood_stack', 'assets/props/wood_stack.png');
    this.load.image('prop_mammoth_skull', 'assets/props/mammoth_skull.png');
    this.load.image('prop_pots_group', 'assets/props/pots_group.png');

    // Neue Feldbau-Stufen (konsistente 16-Bit-Grafiken aus farm-2)
    this.load.image('farm_soil_raw', 'assets/props/farm_soil_raw.png');
    this.load.image('farm_soil_dry', 'assets/props/farm_soil_dry.png');
    this.load.image('farm_soil_seeded', 'assets/props/farm_soil_seeded.png');
    this.load.image('farm_soil_wet', 'assets/props/farm_soil_wet.png');
    this.load.image('farm_wheat_sprout', 'assets/props/farm_wheat_sprout.png');
    this.load.image('farm_wheat_ripe', 'assets/props/farm_wheat_ripe.png');

    // Authentische 16-Bit-Relikt-Icons
    this.load.image('relic_venus', 'assets/icons/relic_venus.png');
    this.load.image('relic_loewenmensch', 'assets/icons/relic_loewenmensch.png');
    this.load.image('relic_malerei', 'assets/icons/relic_malerei.png');
    this.load.image('relic_oetzi', 'assets/icons/relic_oetzi.png');
    this.load.image('relic_nebra', 'assets/icons/relic_nebra.png');

    for (const id of Object.keys(ITEMS)) this.load.image(`icon-${id}`, `assets/icons/${id}.png`);
  }

  create(): void {
    const params = new URLSearchParams(location.search);
    if (params.has('neu')) state.saves.clear();
    state.hasHadExistingSaveOnBoot = state.saves.hasSave();
    state.skipStartScreen = params.has('kapitel') || params.has('direkt');

    const ow = this.textures.get('overworld');
    for (const [name, [x, y, fw, fh]] of Object.entries(OVERWORLD_FRAMES)) ow.add(name, 0, x, y, fw, fh);
    const ob = this.textures.get('objects');
    for (const [name, [x, y, fw, fh]] of Object.entries(OBJECT_FRAMES)) ob.add(name, 0, x, y, fw, fh);
    const fm = this.textures.get('farm');
    for (const [name, [x, y, fw, fh]] of Object.entries(FARM_FRAMES)) fm.add(name, 0, x, y, fw, fh);
    const cv = this.textures.get('cave_tiles');
    for (const [name, [x, y, fw, fh]] of Object.entries(CAVE_FRAMES)) cv.add(name, 0, x, y, fw, fh);
    const inn = this.textures.get('inner_tiles');
    for (const [name, [x, y, fw, fh]] of Object.entries(INNER_FRAMES)) inn.add(name, 0, x, y, fw, fh);

    // 32x32 nahtlose Boden-Kacheln aus Hunter Settlement Tile_A2-1 (ground_a2)
    const gr = this.textures.get('ground_a2');
    const groundFrames: Record<string, [number, number, number, number]> = {
      grassA: [32, 224, 32, 32],
      grassB: [128, 224, 32, 32],
      dirtA: [32, 64, 32, 32],
      dirtB: [128, 64, 32, 32],
      sandA: [224, 64, 32, 32],
      sandC: [224, 224, 32, 32],
      cobA: [224, 480, 32, 32],
    };
    for (const [name, [x, y, fw, fh]] of Object.entries(groundFrames)) gr.add(name, 0, x, y, fw, fh);

    for (const id of Object.keys(ITEMS)) this.textures.get(`icon-${id}`).setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.createCustomSprites();
    this.createFemaleCharacterSheet();
    this.extractPreviewImages();

    const dirs = ['down', 'right', 'up', 'left'];
    dirs.forEach((dir, row) => {
      const start = row * 17;
      // Male animations (and legacy fallback)
      this.anims.create({
        key: `walk-male-${dir}`,
        frames: this.anims.generateFrameNumbers('player', { start, end: start + 3 }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `idle-male-${dir}`,
        frames: [{ key: 'player', frame: start }],
        frameRate: 1,
      });
      this.anims.create({
        key: `walk-${dir}`,
        frames: this.anims.generateFrameNumbers('player', { start, end: start + 3 }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `idle-${dir}`,
        frames: [{ key: 'player', frame: start }],
        frameRate: 1,
      });

      // Female animations
      this.anims.create({
        key: `walk-female-${dir}`,
        frames: this.anims.generateFrameNumbers('player_female', { start, end: start + 3 }),
        frameRate: 8,
        repeat: -1,
      });
      this.anims.create({
        key: `idle-female-${dir}`,
        frames: [{ key: 'player_female', frame: start }],
        frameRate: 1,
      });

      });

    this.anims.create({
      key: 'fire',
      frames: Array.from({ length: 7 }, (_, i) => ({ key: 'objects', frame: `fire${i}` })),
      frameRate: 10,
      repeat: -1,
    });

    // ----------------------------------------------------
    // Neue lebendige SNES-Fauna & Tier-Animationen
    // ----------------------------------------------------
    // Ziege (sdv_goat)
    this.anims.create({ key: 'goat-idle', frames: [{ key: 'sdv_goat', frame: 4 }], frameRate: 1 });
    this.anims.create({ key: 'goat-walk', frames: this.anims.generateFrameNumbers('sdv_goat', { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'goat-walk-down', frames: this.anims.generateFrameNumbers('sdv_goat', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'goat-walk-right', frames: this.anims.generateFrameNumbers('sdv_goat', { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'goat-walk-up', frames: this.anims.generateFrameNumbers('sdv_goat', { start: 8, end: 11 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'goat-graze', frames: this.anims.generateFrameNumbers('sdv_goat', { start: 12, end: 15 }), frameRate: 4, repeat: -1 });

    // Zicklein (sdv_goat_baby)
    this.anims.create({ key: 'goat-baby-idle', frames: [{ key: 'sdv_goat_baby', frame: 4 }], frameRate: 1 });
    this.anims.create({ key: 'goat-baby-walk', frames: this.anims.generateFrameNumbers('sdv_goat_baby', { start: 4, end: 7 }), frameRate: 7, repeat: -1 });
    this.anims.create({ key: 'goat-baby-walk-down', frames: this.anims.generateFrameNumbers('sdv_goat_baby', { start: 0, end: 3 }), frameRate: 7, repeat: -1 });
    this.anims.create({ key: 'goat-baby-walk-right', frames: this.anims.generateFrameNumbers('sdv_goat_baby', { start: 4, end: 7 }), frameRate: 7, repeat: -1 });
    this.anims.create({ key: 'goat-baby-walk-up', frames: this.anims.generateFrameNumbers('sdv_goat_baby', { start: 8, end: 11 }), frameRate: 7, repeat: -1 });
    this.anims.create({ key: 'goat-baby-play', frames: this.anims.generateFrameNumbers('sdv_goat_baby', { start: 12, end: 15 }), frameRate: 5, repeat: -1 });

    // Auerochse / Ur-Rind (sdv_cow)
    this.anims.create({ key: 'cow-idle', frames: [{ key: 'sdv_cow', frame: 4 }], frameRate: 1 });
    this.anims.create({ key: 'cow-walk', frames: this.anims.generateFrameNumbers('sdv_cow', { start: 4, end: 7 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'cow-walk-down', frames: this.anims.generateFrameNumbers('sdv_cow', { start: 0, end: 3 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'cow-walk-right', frames: this.anims.generateFrameNumbers('sdv_cow', { start: 4, end: 7 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'cow-walk-up', frames: this.anims.generateFrameNumbers('sdv_cow', { start: 8, end: 11 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'cow-graze', frames: this.anims.generateFrameNumbers('sdv_cow', { start: 12, end: 15 }), frameRate: 3, repeat: -1 });

    // Ur-Kalb (sdv_calf)
    this.anims.create({ key: 'calf-idle', frames: [{ key: 'sdv_calf', frame: 4 }], frameRate: 1 });
    this.anims.create({ key: 'calf-walk', frames: this.anims.generateFrameNumbers('sdv_calf', { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'calf-walk-down', frames: this.anims.generateFrameNumbers('sdv_calf', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'calf-walk-right', frames: this.anims.generateFrameNumbers('sdv_calf', { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'calf-walk-up', frames: this.anims.generateFrameNumbers('sdv_calf', { start: 8, end: 11 }), frameRate: 6, repeat: -1 });

    // Wilder Grauwolf (sdv_wolf)
    this.anims.create({ key: 'wolf-idle', frames: [{ key: 'sdv_wolf', frame: 4 }], frameRate: 1 });
    this.anims.create({ key: 'wolf-walk', frames: this.anims.generateFrameNumbers('sdv_wolf', { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'wolf-walk-down', frames: this.anims.generateFrameNumbers('sdv_wolf', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'wolf-walk-right', frames: this.anims.generateFrameNumbers('sdv_wolf', { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'wolf-walk-up', frames: this.anims.generateFrameNumbers('sdv_wolf', { start: 8, end: 11 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'wolf-stalk', frames: this.anims.generateFrameNumbers('sdv_wolf', { start: 12, end: 15 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'wolf-howl', frames: this.anims.generateFrameNumbers('sdv_wolf', { start: 24, end: 27 }), frameRate: 3, repeat: -1 });

    // Gezähmter Hütehund Lupo (sdv_dog_lupo)
    this.anims.create({ key: 'lupo-idle', frames: [{ key: 'sdv_dog_lupo', frame: 24 }], frameRate: 1 });
    this.anims.create({ key: 'lupo-walk', frames: this.anims.generateFrameNumbers('sdv_dog_lupo', { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'lupo-walk-down', frames: this.anims.generateFrameNumbers('sdv_dog_lupo', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'lupo-walk-right', frames: this.anims.generateFrameNumbers('sdv_dog_lupo', { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'lupo-walk-up', frames: this.anims.generateFrameNumbers('sdv_dog_lupo', { start: 8, end: 11 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'lupo-wag', frames: this.anims.generateFrameNumbers('sdv_dog_lupo', { start: 28, end: 31 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'lupo-sleep', frames: this.anims.generateFrameNumbers('sdv_dog_lupo', { start: 32, end: 35 }), frameRate: 2, repeat: -1 });

    // Wilde Feldhasen (sdv_rabbit)
    this.anims.create({ key: 'rabbit-idle', frames: [{ key: 'sdv_rabbit', frame: 12 }], frameRate: 1 });
    this.anims.create({ key: 'rabbit-hop', frames: this.anims.generateFrameNumbers('sdv_rabbit', { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'rabbit-hop-down', frames: this.anims.generateFrameNumbers('sdv_rabbit', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'rabbit-hop-right', frames: this.anims.generateFrameNumbers('sdv_rabbit', { start: 4, end: 7 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'rabbit-hop-up', frames: this.anims.generateFrameNumbers('sdv_rabbit', { start: 8, end: 11 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'rabbit-sniff', frames: this.anims.generateFrameNumbers('sdv_rabbit', { start: 12, end: 15 }), frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'rabbit-graze', frames: this.anims.generateFrameNumbers('sdv_rabbit', { start: 16, end: 19 }), frameRate: 4, repeat: -1 });

    // Wildschwein (sdv_pig)
    this.anims.create({ key: 'pig-idle', frames: [{ key: 'sdv_pig', frame: 4 }], frameRate: 1 });
    this.anims.create({ key: 'pig-walk', frames: this.anims.generateFrameNumbers('sdv_pig', { start: 4, end: 7 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'pig-walk-down', frames: this.anims.generateFrameNumbers('sdv_pig', { start: 0, end: 3 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'pig-walk-right', frames: this.anims.generateFrameNumbers('sdv_pig', { start: 4, end: 7 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'pig-walk-up', frames: this.anims.generateFrameNumbers('sdv_pig', { start: 8, end: 11 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'pig-forage', frames: this.anims.generateFrameNumbers('sdv_pig', { start: 12, end: 15 }), frameRate: 4, repeat: -1 });

    // Wildente auf See (sdv_duck)
    this.anims.create({ key: 'duck-idle', frames: [{ key: 'sdv_duck', frame: 12 }], frameRate: 1 });
    this.anims.create({ key: 'duck-swim', frames: this.anims.generateFrameNumbers('sdv_duck', { start: 16, end: 19 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'duck-swim-down', frames: this.anims.generateFrameNumbers('sdv_duck', { start: 12, end: 15 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'duck-swim-right', frames: this.anims.generateFrameNumbers('sdv_duck', { start: 16, end: 19 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'duck-swim-up', frames: this.anims.generateFrameNumbers('sdv_duck', { start: 20, end: 23 }), frameRate: 5, repeat: -1 });
    this.anims.create({ key: 'duck-dive', frames: this.anims.generateFrameNumbers('sdv_duck', { start: 24, end: 27 }), frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'duck-flap', frames: this.anims.generateFrameNumbers('sdv_duck', { start: 28, end: 31 }), frameRate: 6, repeat: -1 });

    // Umgebungs-Critters (sdv_critters)
    this.anims.create({ key: 'critter-butterfly-1', frames: this.anims.generateFrameNumbers('sdv_critters', { start: 128, end: 131 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'critter-butterfly-2', frames: this.anims.generateFrameNumbers('sdv_critters', { start: 132, end: 135 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'critter-butterfly-3', frames: this.anims.generateFrameNumbers('sdv_critters', { start: 136, end: 139 }), frameRate: 6, repeat: -1 });
    this.anims.create({ key: 'critter-frog-idle', frames: this.anims.generateFrameNumbers('sdv_critters', { start: 280, end: 281 }), frameRate: 2, repeat: -1 });
    this.anims.create({ key: 'critter-frog-croak', frames: this.anims.generateFrameNumbers('sdv_critters', { start: 281, end: 283 }), frameRate: 4, repeat: -1 });
    this.anims.create({ key: 'critter-frog-jump', frames: this.anims.generateFrameNumbers('sdv_critters', { start: 284, end: 287 }), frameRate: 8, repeat: 0 });
    this.anims.create({ key: 'critter-squirrel-idle', frames: [{ key: 'sdv_critters', frame: 320 }], frameRate: 1 });
    this.anims.create({ key: 'critter-squirrel-run', frames: this.anims.generateFrameNumbers('sdv_critters', { start: 320, end: 323 }), frameRate: 8, repeat: -1 });
    this.anims.create({ key: 'critter-squirrel-climb', frames: this.anims.generateFrameNumbers('sdv_critters', { start: 324, end: 327 }), frameRate: 8, repeat: -1 });

    this.anims.create({
      key: 'alva_idle',
      frames: [{ key: 'npc_alva', frame: 0 }],
      frameRate: 1,
    });
    this.anims.create({
      key: 'ota_idle',
      frames: [{ key: 'npc_ota', frame: 0 }],
      frameRate: 1,
    });

    const chParam = Number(params.get('kapitel'));
    if (chParam >= 1 && chParam <= 6) {
      state.startChapter(chParam);
    }

    this.scene.start('World');
  }

  /**
   * Erzeugt aus dem 16x32 Charakter-Spritesheet eine klar unterscheidbare weibliche Spielfigur
   * (türkis-blaues Gewand, längere Haare/Zöpfe an den Seiten und goldenes Stirnband).
   */
  private createFemaleCharacterSheet(): void {
    const srcImg = this.textures.get('player').getSourceImage() as HTMLImageElement;
    const w = srcImg.width;
    const h = srcImg.height;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(srcImg, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    // Rote Tunika-Pixel in ein warmes Beeren-/Türkis-Blau umfärben
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const a = d[i + 3];
      if (a > 128 && r > 130 && r > g * 1.45 && r > b * 1.45) {
        // Rotton -> Blau/Türkis-Gewand mit gleicher Helligkeitsabstufung
        d[i] = Math.min(255, Math.round(b * 0.9 + 25));
        d[i + 1] = Math.min(255, Math.round(r * 0.68));
        d[i + 2] = Math.min(255, Math.round(r * 1.05));
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // Für die 4 Lauf-Reihen (down=0, right=1, up=2, left=3) je Frame lange Zöpfe & Stirnband ergänzen
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const fx = col * 16;
        const fy = row * 32;
        // Goldenes Stirnband / Haarschmuck
        ctx.fillStyle = '#f2c94c';
        ctx.fillRect(fx + 5, fy + 9, 6, 1);
        // Lange kastanienbraune Zöpfe über die Schultern
        ctx.fillStyle = '#5a3420';
        if (row === 0 || row === 2) {
          ctx.fillRect(fx + 2, fy + 14, 2, 6);
          ctx.fillRect(fx + 12, fy + 14, 2, 6);
          ctx.fillStyle = '#f2c94c'; // kleine Haarperlen unten am Zopf
          ctx.fillRect(fx + 2, fy + 19, 1, 1);
          ctx.fillRect(fx + 13, fy + 19, 1, 1);
        } else if (row === 1) {
          // Rechtslaufend: Zopf links hinten
          ctx.fillRect(fx + 2, fy + 13, 2, 7);
          ctx.fillStyle = '#f2c94c';
          ctx.fillRect(fx + 2, fy + 19, 1, 1);
        } else if (row === 3) {
          // Linkslaufend: Zopf rechts hinten
          ctx.fillRect(fx + 12, fy + 13, 2, 7);
          ctx.fillStyle = '#f2c94c';
          ctx.fillRect(fx + 13, fy + 19, 1, 1);
        }
      }
    }

    this.textures.addSpriteSheet('player_female', canvas as unknown as HTMLImageElement, {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.textures.addSpriteSheet('player_egypt_female', canvas as unknown as HTMLImageElement, {
      frameWidth: 16,
      frameHeight: 32,
    });
    this.textures.addSpriteSheet(
      'player_egypt_male',
      this.textures.get('player').getSourceImage() as HTMLImageElement,
      { frameWidth: 16, frameHeight: 32 },
    );
  }

  /** Extrahiert scharfe Data-URLs der Spielgrafiken für den Start- und Pausescreen. */
  private extractPreviewImages(): void {
    const toDataUrl = (texKey: string, sx?: number, sy?: number, sw?: number, sh?: number): string => {
      const src = this.textures.get(texKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
      const w = sw ?? src.width;
      const h = sh ?? src.height;
      const x = sx ?? 0;
      const y = sy ?? 0;
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, x, y, w, h, 0, 0, w, h);
      return c.toDataURL();
    };

    state.malePreviewUrl = toDataUrl('player', 0, 6, 16, 26);
    state.femalePreviewUrl = toDataUrl('player_female', 0, 6, 16, 26);

    state.showcaseSprites = {
      fire: toDataUrl('objects', 64, 48, 16, 16),
      wolf: toDataUrl('sdv_wolf', 0, 32, 32, 32),
      kiln: toDataUrl('kiln'),
      loom: toDataUrl('loom'),
      smelter: toDataUrl('smelter'),
      forge: toDataUrl('forge'),
      langhaus: toDataUrl('overworld', 96, 0, 80, 80),
      market: toDataUrl('overworld', 288, 368, 96, 80),
      goat: toDataUrl('sdv_goat', 0, 32, 32, 32),
    };
  }

  /** Erzeugt saubere 16-Bit-Pixel-Sprites für Wolf/Hund und Erzadern. */
  private createCustomSprites(): void {
    // 1. Wolf / Hütehund (20x16 Pixelart)
    const g2 = this.add.graphics();
    g2.fillStyle(0x2b2b33, 1).fillRect(3, 13, 14, 2); // Schatten
    g2.fillStyle(0x7a7e8a, 1).fillRect(4, 6, 10, 6); // Körper
    g2.fillStyle(0x9ca0ad, 1).fillRect(5, 7, 8, 3); // Rücken hell
    g2.fillStyle(0x5b5e69, 1).fillRect(5, 11, 2, 3).fillRect(11, 11, 2, 3); // Beine
    g2.fillStyle(0x7a7e8a, 1).fillRect(12, 3, 6, 6); // Kopf
    g2.fillStyle(0x4a4d57, 1).fillRect(13, 1, 2, 2).fillRect(16, 1, 2, 2); // Ohren
    g2.fillStyle(0x5b5e69, 1).fillRect(1, 7, 3, 2); // Rute
    g2.fillStyle(0xffd24a, 1).fillRect(15, 5, 1, 1); // Auge
    g2.fillStyle(0x1f1f24, 1).fillRect(17, 6, 1, 1); // Nase
    g2.generateTexture('wolf', 20, 16);
    g2.destroy();

    // 8. Kupfererz-Ader (24x22 Fels mit grün-goldenen Malachit/Kupfer-Adern)
    const g8 = this.add.graphics();
    g8.fillStyle(0x2c2825, 1).fillEllipse(12, 18, 22, 7);
    g8.fillStyle(0x5e5750, 1).fillEllipse(12, 12, 20, 15);
    g8.fillStyle(0x7a7167, 1).fillEllipse(10, 9, 14, 9);
    g8.fillStyle(0xd97b29, 1).fillRect(6, 8, 4, 3).fillRect(13, 11, 4, 3).fillRect(9, 14, 3, 2);
    g8.fillStyle(0x3ec28f, 1).fillRect(7, 7, 2, 2).fillRect(14, 10, 2, 2); // Türkisgrüner Malachit-Schimmer
    g8.generateTexture('copper_vein', 24, 22);
    g8.destroy();

    // 9. Eisenerz-Ader (24x22 dunkler Fels mit rostrot-silbernen Eisenadern)
    const g9 = this.add.graphics();
    g9.fillStyle(0x1f1d22, 1).fillEllipse(12, 18, 22, 7);
    g9.fillStyle(0x3d3b44, 1).fillEllipse(12, 12, 20, 15);
    g9.fillStyle(0x565460, 1).fillEllipse(10, 9, 14, 9);
    g9.fillStyle(0xa83c28, 1).fillRect(5, 9, 5, 3).fillRect(13, 10, 4, 4).fillRect(9, 14, 4, 2);
    g9.fillStyle(0xc8d2de, 1).fillRect(6, 9, 2, 2).fillRect(14, 11, 2, 2); // Metallischer Eisenglanz
    g9.generateTexture('iron_vein', 24, 22);
    g9.destroy();

    // 10. Schaduf-Schöpfwerk (32x32)
    const gs = this.add.graphics();
    gs.fillStyle(0x6b4226, 1).fillRect(14, 12, 4, 18); // Senkrechter Pfosten
    gs.fillStyle(0x8b5a2b, 1).fillRect(4, 8, 24, 3);   // Schwingbalken
    gs.fillStyle(0x3e3d47, 1).fillRect(4, 5, 6, 6);   // Gegengewichts-Stein
    gs.fillStyle(0x358dbf, 1).fillRect(24, 14, 2, 8); // Seil & Ledereimer
    gs.fillStyle(0x2774a3, 1).fillRect(23, 22, 4, 4); // Eimer
    gs.generateTexture('schaduf_prop', 32, 32);
    gs.destroy();

    // 11. Nilometer (16x32)
    const gn = this.add.graphics();
    gn.fillStyle(0xd9c298, 1).fillRect(2, 4, 12, 28); // Steinsäule
    gn.fillStyle(0x8c734b, 1).fillRect(2, 4, 12, 2).fillRect(2, 30, 12, 2); // Sockel/Kapitell
    gn.fillStyle(0x1e293b, 1);
    for (let y = 8; y < 28; y += 4) {
      gn.fillRect(4, y, 8, 2); // Mess-Einkerbungen
    }
    gn.generateTexture('nilometer_prop', 16, 32);
    gn.destroy();

    // 12. Fischreuse (16x16 geflochtenes Schilf)
    const gf = this.add.graphics();
    gf.fillStyle(0x8a703b, 1).fillEllipse(8, 8, 14, 8);
    gf.fillStyle(0x4a3b1d, 1).fillEllipse(8, 8, 10, 4);
    gf.generateTexture('fish_trap', 16, 16);
    gf.destroy();

    // 13. Nilschlamm-Haufen (clay_pile, 16x16)
    const gc = this.add.graphics();
    gc.fillStyle(0x3d2817, 1).fillEllipse(8, 11, 14, 6);
    gc.fillStyle(0x593d25, 1).fillEllipse(8, 9, 10, 5);
    gc.generateTexture('clay_pile', 16, 16);
    gc.destroy();
  }
}

