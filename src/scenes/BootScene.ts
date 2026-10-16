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

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const w = this.scale.width;
    const h = this.scale.height;
    const bar = this.add.rectangle(w / 2 - 60, h / 2, 0, 6, 0xe8c170).setOrigin(0, 0.5);
    this.load.on('progress', (p: number) => (bar.width = 120 * p));

    this.load.image('overworld', 'assets/gfx/Overworld.png');
    this.load.image('objects', 'assets/gfx/objects.png');
    this.load.image('farm', 'assets/gfx/farm.png');
    this.load.image('ores', 'assets/gfx/ores.png');
    this.load.spritesheet('goat', 'assets/gfx/goat.png', { frameWidth: 80, frameHeight: 80 });
    this.load.spritesheet('player', 'assets/gfx/character.png', { frameWidth: 16, frameHeight: 32 });
    this.load.spritesheet('npc', 'assets/gfx/NPC_test.png', { frameWidth: 16, frameHeight: 32 });

    for (const id of Object.keys(ITEMS)) this.load.image(`icon-${id}`, `assets/icons/${id}.png`);
  }

  create(): void {
    const params = new URLSearchParams(location.search);
    if (params.has('neu')) state.saves.clear();

    const ow = this.textures.get('overworld');
    for (const [name, [x, y, fw, fh]] of Object.entries(OVERWORLD_FRAMES)) ow.add(name, 0, x, y, fw, fh);
    const ob = this.textures.get('objects');
    for (const [name, [x, y, fw, fh]] of Object.entries(OBJECT_FRAMES)) ob.add(name, 0, x, y, fw, fh);
    const fm = this.textures.get('farm');
    for (const [name, [x, y, fw, fh]] of Object.entries(FARM_FRAMES)) fm.add(name, 0, x, y, fw, fh);

    for (const id of Object.keys(ITEMS)) this.textures.get(`icon-${id}`).setFilter(Phaser.Textures.FilterMode.LINEAR);

    this.createCustomSprites();

    const dirs = ['down', 'right', 'up', 'left'];
    dirs.forEach((dir, row) => {
      const start = row * 17;
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
    });

    this.anims.create({
      key: 'fire',
      frames: Array.from({ length: 7 }, (_, i) => ({ key: 'objects', frame: `fire${i}` })),
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'goat-idle',
      frames: this.anims.generateFrameNumbers('goat', { start: 4, end: 7 }),
      frameRate: 4,
      repeat: -1,
    });

    const chParam = Number(params.get('kapitel'));
    if (chParam >= 1 && chParam <= 6) {
      state.startChapter(chParam);
    }

    this.scene.start('World');
  }

  /** Erzeugt saubere 16-Bit-Pixel-Sprites für Falle, Wolf/Hund, Lehmhaufen, Öfen, Webstuhl und Erzadern. */
  private createCustomSprites(): void {
    // 1. Falle (gekreuzte Holzstöcke)
    const g1 = this.add.graphics();
    g1.fillStyle(0x5a3a1a, 1).fillRect(1, 11, 14, 3);
    g1.fillStyle(0x8b5a2b, 1).fillRect(1, 10, 14, 2).fillRect(2, 4, 2, 8).fillRect(12, 4, 2, 8).fillRect(2, 4, 12, 2);
    g1.fillStyle(0xc9a063, 1).fillRect(2, 4, 12, 1);
    g1.generateTexture('trap', 16, 16);
    g1.destroy();

    // 2. Wolf / Hütehund (20x16 Pixelart)
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

    // 3. Lehmhaufen am Ufer (16x16)
    const g3 = this.add.graphics();
    g3.fillStyle(0x4a2e1b, 1).fillEllipse(8, 11, 14, 7);
    g3.fillStyle(0x8c5230, 1).fillEllipse(8, 9, 12, 6);
    g3.fillStyle(0xb86f43, 1).fillEllipse(7, 8, 7, 3);
    g3.generateTexture('clay_pile', 16, 16);
    g3.destroy();

    // 4. Töpferofen (32x32 Lehmkuppel mit Glutöffnung)
    const g4 = this.add.graphics();
    g4.fillStyle(0x3a2314, 1).fillEllipse(16, 26, 28, 10);
    g4.fillStyle(0x8c5230, 1).fillEllipse(16, 18, 24, 20);
    g4.fillStyle(0xb86f43, 1).fillEllipse(14, 14, 16, 12);
    g4.fillStyle(0x2a180d, 1).fillRect(11, 19, 10, 8);
    g4.fillStyle(0xff7722, 1).fillRect(13, 21, 6, 5);
    g4.fillStyle(0xffdd55, 1).fillRect(14, 22, 4, 3);
    g4.generateTexture('kiln', 32, 32);
    g4.destroy();

    // 5. Gewichtswebstuhl (32x32 Holzrahmen mit Kettfäden, Tuchbahn und Tongewichten)
    const g5 = this.add.graphics();
    g5.fillStyle(0x3a2314, 1).fillEllipse(16, 28, 26, 6);
    g5.fillStyle(0x6b4226, 1).fillRect(5, 4, 3, 24).fillRect(24, 4, 3, 24).fillRect(4, 4, 24, 3);
    g5.fillStyle(0xd8c8a8, 1).fillRect(9, 7, 14, 9); // Gewebtes Tuch oben
    g5.fillStyle(0xb3472b, 1).fillRect(9, 10, 14, 2); // Rotes Zierband
    g5.fillStyle(0xe8dec5, 1);
    for (let x = 10; x <= 21; x += 2) g5.fillRect(x, 16, 1, 8); // Kettfäden
    g5.fillStyle(0x8c5230, 1);
    for (let x = 9; x <= 21; x += 3) g5.fillRect(x, 24, 2, 3); // Tongewichte unten
    g5.generateTexture('loom', 32, 32);
    g5.destroy();

    // 6. Schmelzofen (36x36 Steinschachtofen mit Blasebalg und heller Kupferglut)
    const g6 = this.add.graphics();
    g6.fillStyle(0x222026, 1).fillEllipse(18, 31, 30, 8);
    g6.fillStyle(0x5c5b66, 1).fillRect(7, 8, 22, 22);
    g6.fillStyle(0x7c7b88, 1).fillRect(9, 6, 18, 18);
    g6.fillStyle(0x3e3d47, 1).fillRect(11, 4, 14, 4); // Schlotöffnung
    g6.fillStyle(0xff6600, 1).fillRect(13, 3, 10, 2); // Glut oben
    g6.fillStyle(0x1b181f, 1).fillRect(12, 20, 12, 9); // Abstichloch
    g6.fillStyle(0xff8822, 1).fillRect(14, 22, 8, 6);
    g6.fillStyle(0xffee66, 1).fillRect(15, 24, 6, 3);
    g6.fillStyle(0x6b4226, 1).fillRect(2, 22, 6, 6); // Blasebalg links
    g6.generateTexture('smelter', 36, 36);
    g6.destroy();

    // 7. Eisenschmiede (40x36 Esse + dunkler Eisenamboss)
    const g7 = this.add.graphics();
    g7.fillStyle(0x222026, 1).fillEllipse(20, 31, 36, 8);
    g7.fillStyle(0x4a4952, 1).fillRect(4, 12, 20, 18); // Steinesse
    g7.fillStyle(0xff5500, 1).fillRect(7, 10, 14, 4);
    g7.fillStyle(0xffdd44, 1).fillRect(9, 11, 10, 2);
    g7.fillStyle(0x6b4226, 1).fillRect(27, 23, 10, 7); // Holzklotz unter Amboss
    g7.fillStyle(0x2f3540, 1).fillRect(25, 18, 14, 5).fillRect(28, 22, 8, 2); // Amboss
    g7.fillStyle(0x667080, 1).fillRect(26, 18, 12, 2); // Glänzende Ambossbahn
    g7.generateTexture('forge', 40, 36);
    g7.destroy();

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
  }
}

