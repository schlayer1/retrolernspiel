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
    this.load.image('cave_tiles', 'assets/gfx/cave.png');
    this.load.image('inner_tiles', 'assets/gfx/Inner.png');
    this.load.spritesheet('goat', 'assets/gfx/goat.png', { frameWidth: 80, frameHeight: 80 });
    this.load.spritesheet('player', 'assets/gfx/character.png', { frameWidth: 16, frameHeight: 32 });
    this.load.spritesheet('npc', 'assets/gfx/NPC_test.png', { frameWidth: 16, frameHeight: 32 });

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
    const cropToDataUrl = (texKey: string, sx: number, sy: number, sw: number, sh: number): string => {
      const src = this.textures.get(texKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
      const c = document.createElement('canvas');
      c.width = sw;
      c.height = sh;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(src, sx, sy, sw, sh, 0, 0, sw, sh);
      return c.toDataURL();
    };

    state.malePreviewUrl = cropToDataUrl('player', 0, 6, 16, 26);
    state.femalePreviewUrl = cropToDataUrl('player_female', 0, 6, 16, 26);

    state.showcaseSprites = {
      fire: cropToDataUrl('objects', 64, 48, 16, 16),
      wolf: cropToDataUrl('wolf', 0, 0, 20, 16),
      kiln: cropToDataUrl('kiln', 0, 0, 32, 32),
      loom: cropToDataUrl('loom', 0, 0, 32, 32),
      smelter: cropToDataUrl('smelter', 0, 0, 36, 36),
      forge: cropToDataUrl('forge', 0, 0, 40, 36),
      langhaus: cropToDataUrl('overworld', 96, 0, 80, 80),
      market: cropToDataUrl('overworld', 288, 368, 96, 80),
      goat: cropToDataUrl('goat', 24, 24, 36, 36),
    };
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

