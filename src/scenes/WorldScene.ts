import Phaser from 'phaser';
import { sfx } from '../audio/sound';
import { music } from '../audio/MusicManager';
import { CHAPTERS } from '../data/chapter1';
import { BUILDINGS, BuildingDef, BuildingId, ITEMS, ItemId, RECIPES, RecipeId } from '../data/items';
import { CROP_MS, DAY_MS, TRAP_MS, state } from '../systems/GameState';
import { FarmPlotState } from '../systems/SaveManager';
import { decorSpec } from '../world/decor';
import { WildlifeManager } from '../world/Wildlife';

const TILE = 16;
const MAP_W = 50;
const MAP_H = 38;
const SPEED = 75;
const REACH = 30;
const REGROW_MS = 35_000;

// See in der Nordost-Ecke (Tile-Koordinaten)
const LAKE = { x: 32, y: 4, w: 14, h: 9 };

type Dir = 'down' | 'right' | 'up' | 'left';
type Kind =
  | 'berry'
  | 'stump'
  | 'rock'
  | 'ota'
  | 'fire'
  | 'trap'
  | 'wildgrain'
  | 'clay'
  | 'water_spot'
  | 'wolf'
  | 'plot'
  | 'build_site'
  | 'wild_goat'
  | 'tamed_goat'
  | 'merchant'
  | 'mine_entrance'
  | 'copper_vein'
  | 'iron_vein'
  | 'relic_oetzi'
  | 'relic_himmelsscheibe';

interface DomLabel {
  x: number;
  y: number;
  el: HTMLElement;
  setText(t: string): DomLabel;
  setY(ny: number): DomLabel;
  setPosition(nx: number, ny: number): DomLabel;
}

interface Node {
  kind: Kind;
  sprite: Phaser.Physics.Arcade.Sprite;
  readyAt: number;
  fullFrame?: string;
  emptyFrame?: string;
  placed?: { x: number; y: number; t: number };
  bubble?: Phaser.GameObjects.Image;
  glow?: Phaser.GameObjects.Arc;
  plotId?: number;
  cropSprite?: Phaser.GameObjects.Image;
  buildingDef?: BuildingDef;
  label?: DomLabel;
}

/** Zusammenhängende, mitwachsende Spielwelt für alle 6 Kapitel (Altsteinzeit bis Eisenzeit). */
export class WorldScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D' | 'E' | 'SPACE', Phaser.Input.Keyboard.Key>;
  private facing: Dir = 'down';
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private nodes: Node[] = [];
  private domLabels: DomLabel[] = [];
  private labelLayer!: HTMLElement;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private saveTimer = 0;
  private sleeping = false;
  private wolfNode?: Node;
  private playerLabel?: DomLabel;
  private wildlife!: WildlifeManager;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private debugEnabled = false;

  constructor() {
    super('World');
  }

  create(): void {
    this.nodes = [];
    this.domLabels = [];
    this.sleeping = false;
    this.wildlife = new WildlifeManager(this);

    const existingLayer = document.getElementById('world-labels');
    this.labelLayer = existingLayer ?? document.createElement('div');
    this.labelLayer.id = 'world-labels';
    if (!existingLayer) document.body.appendChild(this.labelLayer);
    this.labelLayer.innerHTML = '';

    const saved = state.saves.load();
    if (saved) state.loadFrom(saved);

    this.obstacles = this.physics.add.staticGroup();
    this.buildGround();
    this.buildWater();
    this.buildMountainRidge();
    this.placeResources();
    this.placeChapter2And3Nodes();
    this.placeAtmosphericProps();
    this.placeOta();
    this.scatterNature();
    this.wildlife.spawnAmbientFliers(MAP_W * TILE, MAP_H * TILE);
    state.fires.forEach((f) => this.spawnFire(f));
    state.traps.forEach((t) => this.spawnTrap(t));

    const startX = state.playerX || (MAP_W * TILE) / 2;
    const startY = state.playerY || (MAP_H * TILE) / 2 + 20;
    const texKey = state.playerGender === 'female' ? 'player_female' : 'player';
    this.player = this.physics.add.sprite(startX, startY, texKey, 0);
    this.player.body!.setSize(8, 6).setOffset(4, 20);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.physics.add.collider(this.player, this.obstacles);
    this.playerLabel = this.addLabel(startX, startY - 22, state.playerName, '#a8e6ff');

    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,E,SPACE') as typeof this.wasd;

    // Debug-Hitbox-Ansicht (?debug=1 oder F3)
    const params = new URLSearchParams(location.search);
    this.debugEnabled = params.has('debug');
    this.debugGraphics = this.add.graphics().setDepth(9500);
    this.input.keyboard!.on('keydown-F3', () => {
      this.debugEnabled = !this.debugEnabled;
      if (!this.debugEnabled) this.debugGraphics?.clear();
    });

    this.nightOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1240, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(8000);

    music.playChapterMusic(state.chapter);

    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    state.on('craft', this.onCraft, this);
    state.on('chapterChanged', this.onChapterChanged, this);
    state.on('profileChanged', this.onProfileChanged, this);
    state.on('relicFound', this.onRelicFound, this);

    this.events.on('sleep', () => {
      if (this.labelLayer) this.labelLayer.style.display = 'none';
    });
    this.events.on('wake', () => {
      if (this.labelLayer) this.labelLayer.style.display = 'block';
    });

    this.events.once('shutdown', () => {
      state.off('craft', this.onCraft, this);
      state.off('chapterChanged', this.onChapterChanged, this);
      state.off('profileChanged', this.onProfileChanged, this);
      state.off('relicFound', this.onRelicFound, this);
    });
    window.addEventListener('beforeunload', () => this.persist());
  }

  private onProfileChanged(): void {
    if (this.player) {
      this.player.anims.play(`idle-${state.playerGender}-${this.facing}`, true);
    }
    if (this.playerLabel) {
      this.playerLabel.el.textContent = state.playerName;
    }
  }

  private onChapterChanged(): void {
    music.playChapterMusic(state.chapter);
    this.persist();
    this.scene.restart();
  }

  private onRelicFound(relicId: string): void {
    const kindMap: Record<string, Kind> = {
      oetzi_dolch: 'relic_oetzi',
      himmelsscheibe: 'relic_himmelsscheibe',
    };
    const targetKind = kindMap[relicId];
    if (!targetKind) return;
    const targetNode = this.nodes.find((n) => n.kind === targetKind);
    if (targetNode) {
      this.removeNode(targetNode);
      if (state.hint && (state.hint.includes('freilegen') || state.hint.includes('bergen'))) {
        state.hint = '';
      }
    }
  }

  private removeNode(n: Node): void {
    if (n.label) {
      n.label.el.remove();
      this.domLabels = this.domLabels.filter((l) => l !== n.label);
    }
    n.bubble?.destroy();
    n.glow?.destroy();
    n.cropSprite?.destroy();
    if (n.sprite) {
      this.wildlife.removeBySprite(n.sprite);
      this.obstacles.remove(n.sprite, true, true);
    }
    this.nodes = this.nodes.filter((x) => x !== n);
  }

  // ---------------------------------------------------------------- Atlas-Helfer & Kollisionsboxen

  /**
   * Platziert ein Sprite aus dem `world`-Atlas mit maßgeschneiderter Skalierung
   * und exakter Fuß-Kollisionsbox aus `src/world/decor.ts`.
   */
  private placeDecor(
    frame: string,
    x: number,
    y: number,
    opts?: { collidable?: boolean; scale?: number; depthOffset?: number },
  ): Phaser.Physics.Arcade.Sprite {
    const texFrame = this.textures.getFrame('world', frame);
    const fw = texFrame ? texFrame.realWidth : 32;
    const fh = texFrame ? texFrame.realHeight : 32;
    const spec = decorSpec(frame, fw, fh);
    const scale = opts?.scale ?? spec.scale;
    const wantBody = opts?.collidable ?? spec.hb !== null;

    const s = (
      wantBody ? this.obstacles.create(x, y, 'world', frame) : this.physics.add.staticSprite(x, y, 'world', frame)
    ) as Phaser.Physics.Arcade.Sprite;

    s.setScale(scale);
    const dispW = fw * scale;
    const dispH = fh * scale;
    s.setDepth(y + dispH / 2 + (opts?.depthOffset ?? 0));

    const b = s.body as Phaser.Physics.Arcade.StaticBody | null;
    if (b) {
      if (wantBody && spec.hb) {
        // Phaser StaticBody nach refreshBody() in Weltkoordinaten positionieren:
        s.refreshBody();
        const bw = Math.max(6, spec.hb.w);
        const bh = Math.max(4, spec.hb.h);
        const footY = y + dispH / 2;
        b.setSize(bw, bh, false);
        b.setOffset((dispW - bw) / 2, dispH - bh - spec.hb.by);
        b.position.set(x - bw / 2, footY - spec.hb.by - bh);
      } else if (wantBody) {
        s.refreshBody();
        const bw = Math.max(8, Math.round(dispW * 0.65));
        const bh = Math.max(6, Math.round(dispH * 0.32));
        const footY = y + dispH / 2;
        b.setSize(bw, bh, false);
        b.setOffset((dispW - bw) / 2, dispH - bh - 2);
        b.position.set(x - bw / 2, footY - 2 - bh);
      } else {
        b.enable = false;
      }
    }
    return s;
  }

  private setFootBox(s: Phaser.Physics.Arcade.Sprite, bw: number, bh: number, by = 2): void {
    const dispW = s.displayWidth;
    const dispH = s.displayHeight;
    const footY = s.y + dispH / 2;
    const b = s.body as Phaser.Physics.Arcade.StaticBody;
    s.refreshBody();
    b.setSize(bw, bh, false);
    b.setOffset((dispW - bw) / 2, dispH - bh - by);
    b.position.set(s.x - bw / 2, footY - by - bh);
  }

  // ---------------------------------------------------------------- Aufbau der Welt

  /** Liefert den kürzesten Abstand (in Pixeln) zum nächsten Dorfpfad (< 0 = mitten auf dem Weg). */
  private pathDistance(px: number, py: number): number {
    let minD = 999;
    // 1. Dorfplatz-Zentrum rund um Ota & Lagerfeuer
    minD = Math.min(minD, Phaser.Math.Distance.Between(px, py, 405, 312) - 36);
    // 2. Nordpfad: Dorfplatz -> Höhle / Bergbau-Stollen (370, 62..312)
    if (py >= 58 && py <= 316) {
      const roadX = 382 + Math.sin(py / 45) * 10;
      minD = Math.min(minD, Math.abs(px - roadX) - 13);
    }
    // 3. Ostpfad: Dorfplatz -> Ackerfeld & Seeufer (400..615)
    if (px >= 396 && px <= 618) {
      const roadY = 286 - (px - 400) * 0.14;
      minD = Math.min(minD, Math.abs(py - roadY) - 12);
    }
    // 4. Südostpfad: Dorfplatz -> Tiergehege & Ziegenweide (408..615)
    if (px >= 406 && px <= 615) {
      const roadY = 322 + (px - 410) * 0.16;
      minD = Math.min(minD, Math.abs(py - roadY) - 12);
    }
    // 5. Westpfad: Dorfplatz -> Werkstätten (255..405)
    if (px >= 252 && px <= 408) {
      const roadY = 304 - (405 - px) * 0.24;
      minD = Math.min(minD, Math.abs(py - roadY) - 12);
    }
    // 6. Südpfad: Dorfplatz -> Fernhändler Enki (x ~ 400, y: 312..490)
    if (py >= 310 && py <= 492) {
      const roadX = 400 + Math.sin(py / 40) * 8;
      minD = Math.min(minD, Math.abs(px - roadX) - 13);
    }
    // 7. Abzweig zum Sonnenberg / Himmelsscheibe (Kapitel 4+)
    if (state.chapter >= 4 && px >= 398 && px <= 575) {
      const roadY = 472 + Math.sin(px / 35) * 6;
      minD = Math.min(minD, Math.abs(py - roadY) - 11);
    }
    return minD;
  }

  private isOnPath(px: number, py: number): boolean {
    return this.pathDistance(px, py) <= 4;
  }

  private buildGround(): void {
    const mapW = MAP_W * TILE;
    const mapH = MAP_H * TILE;
    const texKey = `baked_ground_ch${state.chapter}`;

    if (!this.textures.exists(texKey)) {
      const srcImg = this.textures.get('ground_a2').getSourceImage() as HTMLImageElement;
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = srcImg.width;
      srcCanvas.height = srcImg.height;
      const sctx = srcCanvas.getContext('2d')!;
      sctx.drawImage(srcImg, 0, 0);
      const srcData = sctx.getImageData(0, 0, srcImg.width, srcImg.height).data;
      const sw = srcImg.width;

      // In RPG Maker MV A2 (768x576, 8x4 Blöcke à 96x144) liegt die 100% nahtlose
      // 48x48-Innenkachel jedes Blocks exakt bei (bx*96 + 24, by*144 + 72).
      const sampleBlock = (bx: number, by: number, x: number, y: number): [number, number, number] => {
        const u = ((x % 48) + 48) % 48;
        const v = ((y % 48) + 48) % 48;
        const sx = bx * 96 + 24 + u;
        const sy = by * 144 + 72 + v;
        const idx = (sy * sw + sx) * 4;
        return [srcData[idx], srcData[idx + 1], srcData[idx + 2]];
      };

      // 4x4 Bayer-Dither-Matrix für authentische 16-Bit-Pixel-Übergänge ohne harte Kanten
      const bayer4 = [
        [0 / 16, 8 / 16, 2 / 16, 10 / 16],
        [12 / 16, 4 / 16, 14 / 16, 6 / 16],
        [3 / 16, 11 / 16, 1 / 16, 9 / 16],
        [15 / 16, 7 / 16, 13 / 16, 5 / 16],
      ];

      const canvasTex = this.textures.createCanvas(texKey, mapW, mapH)!;
      const ctx = canvasTex.getContext();
      const out = ctx.createImageData(mapW, mapH);
      const dst = out.data;

      const lx0 = LAKE.x * TILE;
      const ly0 = LAKE.y * TILE;
      const lx1 = (LAKE.x + LAKE.w) * TILE;
      const ly1 = (LAKE.y + LAKE.h) * TILE;

      // Wir rendern in 2x2-Pixel-Clustern für knackige 16-Bit-Pixel-Art-Optik
      for (let y = 0; y < mapH; y += 2) {
        for (let x = 0; x < mapW; x += 2) {
          const dither = bayer4[(y >> 1) & 3][(x >> 1) & 3] - 0.5;

          // 1. Wiesengrün (1,1) vs. tieferes Waldgrün (0,1) an den Waldrändern
          const wave = Math.sin(x * 0.022 + y * 0.018) * 0.5 + Math.cos(x * 0.015 - y * 0.025) * 0.5;
          const edgeBoost =
            (x < 175 ? (175 - x) / 90 : 0) +
            (y < 105 ? (105 - y) / 70 : 0) +
            (x > 670 ? (x - 670) / 90 : 0) +
            (y > 515 ? (y - 515) / 70 : 0);
          let bx = wave + edgeBoost + dither * 0.55 > 0.38 ? 0 : 1;
          let by = 1;

          // 2. Sandiger Ufersaum rund um den See
          const dxLake = x < lx0 ? lx0 - x : x > lx1 ? x - lx1 : 0;
          const dyLake = y < ly0 ? ly0 - y : y > ly1 ? y - ly1 : 0;
          const distLake = Math.hypot(dxLake, dyLake);
          if (distLake < 22 + dither * 8) {
            bx = 2;
            by = 1;
          }

          // 3. Organische Dorfpfade & Dorfplatz
          const pDist = this.pathDistance(x, y);
          if (pDist < dither * 7) {
            const distPlaza = Phaser.Math.Distance.Between(x, y, 405, 312);
            if (state.chapter >= 5 && distPlaza < 34 + dither * 8) {
              bx = 6; // Natursteinpflaster auf dem Dorfplatz ab Kapitel 5
              by = 1;
            } else {
              bx = 1; // Warmer Lehm-/Erdpfad
              by = 0;
            }
          }

          // Für jedes Pixel im 2x2-Block die nahtlose 48x48-Textur abtasten
          for (let py = y; py < y + 2 && py < mapH; py++) {
            for (let px = x; px < x + 2 && px < mapW; px++) {
              const [r, g, b] = sampleBlock(bx, by, px, py);
              const oi = (py * mapW + px) * 4;
              dst[oi] = r;
              dst[oi + 1] = g;
              dst[oi + 2] = b;
              dst[oi + 3] = 255;
            }
          }
        }
      }
      ctx.putImageData(out, 0, 0);
      canvasTex.refresh();
    }

    this.add.image(0, 0, texKey).setOrigin(0).setDepth(0);

    // 2. Reiche, kollisionsfreie Bodendekorationen (Grasbüschel, kleine Blumen, Farne, Kiesel, Pilze)
    // WICHTIG: Nur echte Frame-Namen aus world_atlas.json verwenden!
    const groundFlora = [
      'grass_s1',
      'grass_s2',
      'grass_s3',
      'grass_s4',
      'grass_1',
      'grass_2',
      'fern_1',
      'fern_2',
      'fern_3',
      'fern_4',
      'flower_bunch_a',
      'flower_bunch_b',
      'flower_bunch_c',
      'flower_purple',
      'flower_white',
      'flower_pink',
      'flower_blue_a',
      'flower_tulip_y',
      'pebbles_a',
      'pebbles_b',
      'pebbles_c',
      'rock_small_a',
      'rock_small_b',
      'mushroom_small',
      'mushroom_b',
      'mushroom_red',
    ];
    const rng = new Phaser.Math.RandomDataGenerator(['boden-detail-v4']);
    for (let i = 0; i < 110; i++) {
      const x = rng.between(24, mapW - 24);
      const y = rng.between(78, mapH - 20);
      if (this.inLake(x, y)) continue;
      const onPath = this.isOnPath(x, y);
      const frame = onPath
        ? rng.pick(['pebbles_a', 'pebbles_b', 'pebbles_c', 'rock_small_a'])
        : rng.pick(groundFlora);
      const spec = decorSpec(frame, 24, 24);
      this.add.image(x, y, 'world', frame).setScale(spec.scale).setDepth(1.2);
    }
  }

  private buildWater(): void {
    const lx = LAKE.x * TILE;
    const ly = LAKE.y * TILE;
    const lw = LAKE.w * TILE;
    const lh = LAKE.h * TILE;

    const rt = this.add.renderTexture(lx, ly, lw, lh).setOrigin(0).setDepth(1);
    for (let ty = 0; ty < LAKE.h; ty++) {
      for (let tx = 0; tx < LAKE.w; tx++) rt.drawFrame('overworld', 'water', tx * TILE, ty * TILE);
    }
    const zone = this.add.zone(lx + 4, ly + 4, lw - 8, lh - 8).setOrigin(0);
    this.physics.add.existing(zone, true);
    this.obstacles.add(zone);

    // Natürliche Ufergestaltung: Felsen, Schilf/Farne und kleiner Holzsteg am Südufer
    this.add.image(lx + 56, ly + lh - 2, 'world', 'bridge_h').setScale(0.45).setDepth(2);

    const shoreRocks: Array<[string, number, number]> = [
      ['rock_moss_a', lx - 6, ly + 18],
      ['rock_moss_f', lx + 14, ly - 4],
      ['rock_moss_b', lx + lw - 12, ly + 10],
      ['rock_moss_g', lx + lw + 4, ly + lh - 18],
      ['rock_small_c', lx + 6, ly + lh + 4],
      ['rock_small_d', lx + lw - 28, ly + lh + 6],
    ];
    shoreRocks.forEach(([fr, rx, ry]) => {
      this.placeDecor(fr, rx, ry, { collidable: false, scale: 0.55 });
    });

    const shoreReeds: Array<[string, number, number]> = [
      ['fern_1', lx - 8, ly + 48],
      ['grass_1', lx - 6, ly + 88],
      ['fern_2', lx - 4, ly + 124],
      ['grass_2', lx + 30, ly + lh + 4],
      ['fern_3', lx + 150, ly + lh + 4],
      ['grass_3', lx + lw + 6, ly + 52],
      ['fern_4', lx + lw + 4, ly + 96],
    ];
    shoreReeds.forEach(([fr, rx, ry]) => {
      this.add.image(rx, ry, 'world', fr).setScale(0.52).setDepth(ry);
    });
  }

  /**
   * Baut das nördliche Gebirgsmassiv mit authentischem Höhlenportal (`cave_mouth`),
   * Fackeln und eingebetteten Erzadern – bei garantiert freiem Zugangskorridor zu allen Zielen.
   */
  private buildMountainRidge(): void {
    // Westlicher und nördlicher Felsriegel (y = 20..52), spart Ötzi (210,52) und den Höhlenvorplatz (340..400) frei
    const cliffRocks: Array<[string, number, number, boolean]> = [
      ['rock_moss_d', 36, 32, true],
      ['rock_big_a', 82, 30, true],
      ['rock_moss_e', 132, 32, true],
      ['rock_big_b', 172, 28, true],
      // Lücke um (210, 52) für Ötzis Kupferdolch
      ['rock_moss_c', 248, 28, true],
      ['rock_big_c', 286, 26, true],
      ['rock_tall_a', 322, 34, true],
      // Höhlenportal sitzt bei (370, 44)
      ['rock_tall_b', 418, 34, true],
      ['rock_big_a', 454, 28, true],
      ['rock_moss_d', 492, 32, true],
    ];
    cliffRocks.forEach(([fr, x, y, col]) => {
      this.placeDecor(fr, x, y, { collidable: col, scale: 0.65 });
    });

    // Flankierende Gebirgskiefern entlang des Nordkamm-Rands (echte Frame-Namen!)
    const ridgePines: Array<[string, number, number]> = [
      ['tree_pine_2', 58, 56],
      ['tree_pine_1', 150, 54],
      ['tree_pine_3', 258, 48],
      ['tree_pine_2', 502, 52],
    ];
    ridgePines.forEach(([fr, x, y]) => {
      this.placeDecor(fr, x, y, { scale: 0.65 });
    });

    // Fackeln links und rechts des Höhleneingangs + kleine Knochen-Warnmarkierung
    this.placeDecor('torch', 334, 62, { collidable: false, scale: 0.65 });
    this.placeDecor('torch', 406, 62, { collidable: false, scale: 0.65 });
    this.add.image(326, 74, 'world', 'skulls_pair').setScale(0.52).setDepth(74);
  }

  private inLake(x: number, y: number): boolean {
    return (
      x > (LAKE.x - 2) * TILE &&
      x < (LAKE.x + LAKE.w + 2) * TILE &&
      y > (LAKE.y - 2) * TILE &&
      y < (LAKE.y + LAKE.h + 2) * TILE
    );
  }

  private inVillageClearance(x: number, y: number): boolean {
    // 1. Hauptpfade inkl. Randstreifen immer komplett freihalten
    if (this.pathDistance(x, y) < 18) return true;
    // 2. Dorfzentrum rund um Spieler-Start & Ota
    const cx = (MAP_W * TILE) / 2;
    const cy = (MAP_H * TILE) / 2;
    if (Phaser.Math.Distance.Between(x, y, cx, cy) < 140) return true;
    // 3. Alle Bauplätze (auch für spätere Kapitel!) großzügig freihalten
    for (const b of BUILDINGS) {
      if (Phaser.Math.Distance.Between(x, y, b.x, b.y) < 58) return true;
    }
    // 4. Acker-, Wasserstellen-, Gehege- und Ziegenweide-Bereich im Osten/Südosten
    if (x > 445 && x < 720 && y > 165 && y < 440) return true;
    // 5. Westliche Werkstätten (Webstuhl, Töpferofen, Schmelzofen, Schmiede, Wolf)
    if (x > 210 && x < 370 && y > 140 && y < 405) return true;
    // 6. Nord-Stollen, Erzadern & Ötzi-Fundplatz
    if (x > 175 && x < 508 && y < 130) return true;
    // 7. Südlicher Handelsplatz (Enki) & Sonnenberg-Steinkreis (Nebra)
    if (x > 330 && x < 640 && y > 425 && y < 540) return true;
    // 8. Sicherheitsabstand zu allen aktiven Interaktionsknoten
    for (const n of this.nodes) {
      if (Phaser.Math.Distance.Between(x, y, n.sprite.x, n.sprite.y) < 46) return true;
    }
    return false;
  }

  private scatterNature(): void {
    // Handplatzierte, dichte Waldränder & Baumgruppen mit verifizierten Frame-Namen aus world_atlas.json
    const curatedTrees: Array<[string, number, number]> = [
      // Nordwestlicher Urwald
      ['tree_pine_tall', 42, 98],
      ['tree_oak_1', 95, 92],
      ['tree_pine_1', 142, 108],
      ['tree_oak_2', 55, 152],
      ['tree_fir_1', 112, 165],
      ['tree_pine_2', 48, 215],
      ['tree_oak_3', 96, 240],
      // Westlicher Waldrand
      ['tree_pine_3', 46, 305],
      ['tree_autumn_1', 88, 345],
      ['tree_dead', 52, 405],
      ['tree_oak_1', 92, 445],
      ['tree_pine_4', 58, 515],
      ['tree_fir_2', 118, 548],
      // Südlicher Waldsaum
      ['tree_oak_2', 205, 562],
      ['tree_pine_5', 278, 568],
      ['tree_willow', 485, 562],
      ['tree_oak_3', 655, 552],
      ['tree_pine_1', 735, 538],
      // Östlicher Obsthain & Uferwald
      ['tree_apple', 752, 245],
      ['tree_pear', 758, 305],
      ['tree_autumn_2', 752, 375],
      ['tree_oak_1', 744, 455],
    ];
    curatedTrees.forEach(([fr, x, y]) => {
      if (!this.inLake(x, y) && !this.inVillageClearance(x, y)) this.placeDecor(fr, x, y);
    });

    // Zusätzliche prozedurale Büsche, Felsen und Bäume in den freien Naturzonen
    const rng = new Phaser.Math.RandomDataGenerator(['steinzeit-v4']);
    const scatterPool = [
      'bush_a',
      'bush_b',
      'bush_flower_a',
      'bush_big_green',
      'bush_big_leaf',
      'bush_tall_a',
      'rock_moss_a',
      'rock_moss_b',
      'rock_moss_f',
      'rock_moss_g',
      'tree_oak_1',
      'tree_oak_2',
      'tree_pine_1',
      'tree_pine_2',
      'tree_fir_1',
      'tree_small_1',
      'tree_small_2',
    ];
    for (let i = 0; i < 46; i++) {
      const x = rng.between(28, MAP_W * TILE - 28);
      const y = rng.between(78, MAP_H * TILE - 22);
      if (this.inVillageClearance(x, y) || this.inLake(x, y)) continue;
      const frame = rng.pick(scatterPool);
      this.placeDecor(frame, x, y);
    }
  }

  private makeObstacle(x: number, y: number, tex: string, frame?: string, collidable = true): Phaser.Physics.Arcade.Sprite {
    if (tex === 'world' && frame) {
      return this.placeDecor(frame, x, y, { collidable });
    }
    const o = (
      collidable ? this.obstacles.create(x, y, tex, frame) : this.physics.add.staticSprite(x, y, tex, frame)
    ) as Phaser.Physics.Arcade.Sprite;
    o.setDepth(y + o.displayHeight / 2);
    if (collidable) {
      this.setFootBox(
        o,
        Math.max(8, Math.round(o.displayWidth * 0.68)),
        Math.max(6, Math.round(o.displayHeight * 0.36)),
        2,
      );
    } else if (o.body) {
      (o.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    }
    return o;
  }

  private addNode(kind: Kind, tex: string, frame: string | undefined, x: number, y: number, collidable = true): Node {
    const sprite = this.makeObstacle(x, y, tex, frame, collidable);
    const node: Node = { kind, sprite, readyAt: 0 };
    this.nodes.push(node);
    return node;
  }

  private addLabel(x: number, y: number, text: string, color = '#ffe9b0'): DomLabel {
    const el = document.createElement('div');
    el.className = 'world-label';
    el.style.color = color;
    el.textContent = text;
    this.labelLayer.appendChild(el);
    const lbl: DomLabel = {
      x,
      y,
      el,
      setText(t: string) {
        el.textContent = t;
        return lbl;
      },
      setY(ny: number) {
        lbl.y = ny;
        return lbl;
      },
      setPosition(nx: number, ny: number) {
        lbl.x = nx;
        lbl.y = ny;
        return lbl;
      },
    };
    this.domLabels.push(lbl);
    return lbl;
  }

  /** Sammelstellen für alle Kapitel (echte Beerensträucher, Baumstümpfe & Felsen aus dem `world`-Atlas). */
  private placeResources(): void {
    const berries: Array<[number, number, string]> = [
      [270, 240, 'bush_berry_red'],
      [480, 275, 'bush_berry_blue'],
      [215, 330, 'bush_berry_red'],
      [605, 340, 'bush_berry_red'],
      [290, 450, 'bush_berry_blue'],
      [475, 465, 'bush_berry_red'],
      [180, 215, 'bush_berry_blue'],
    ];
    const stumps: Array<[number, number, string]> = [
      [375, 395, 'stump_a'],
      [210, 275, 'stump_b'],
      [635, 420, 'logs_a'],
      [340, 155, 'stump_a'],
      [130, 380, 'stump_b'],
      [555, 505, 'logs_a'],
    ];
    const rocks: Array<[number, number, string]> = [
      [245, 195, 'rock_moss_a'],
      [560, 445, 'rock_big_a'],
      [160, 470, 'rock_moss_b'],
      [655, 290, 'rock_big_b'],
      [485, 115, 'rock_moss_c'],
      [320, 520, 'rock_big_c'],
    ];
    berries.forEach(([x, y, fr]) => {
      const n = this.addNode('berry', 'world', fr, x, y, true);
      n.fullFrame = fr;
      n.emptyFrame = 'bush_a';
    });
    stumps.forEach(([x, y, fr]) => this.addNode('stump', 'world', fr, x, y, true));
    rocks.forEach(([x, y, fr]) => this.addNode('rock', 'world', fr, x, y, true));
  }

  /** Zusätzliche Elemente für Kapitel 2 bis 6 (Wolf, Acker, Dorf-Bauplätze, Händler Enki, Bergbau-Stollen & Erzadern). */
  private placeChapter2And3Nodes(): void {
    // 1. Scheuer Wolf / gezähmter Hütehund (wandert vor der Zähmung frei auf seiner Waldlichtung)
    if (state.chapter >= 2 || state.wolfTamed) {
      const wx = state.wolfTamed ? (MAP_W * TILE) / 2 + 44 : 295;
      const wy = state.wolfTamed ? (MAP_H * TILE) / 2 + 18 : 295;
      const texKey = state.wolfTamed ? 'sdv_dog_lupo' : 'sdv_wolf';
      const wNode = this.addNode('wolf', texKey, undefined, wx, wy, false);
      wNode.sprite.setScale(1.0);
      if (state.wolfTamed) {
        wNode.sprite.play('lupo-lay');
      } else {
        wNode.sprite.play('wolf-idle');
      }
      wNode.label = this.addLabel(wx, wy - 16, state.wolfTamed ? 'Hund Lupo' : 'Scheuer Wolf', '#ffffff');
      this.wolfNode = wNode;

      if (!state.wolfTamed) {
        this.wildlife.addAnimal({
          kind: 'wolf',
          sprite: wNode.sprite,
          bounds: { minX: 272, maxX: 318, minY: 278, maxY: 316 },
          speed: 16,
          animPrefix: 'wolf',
          idleAnim: 'wolf-idle',
          specialAnim: 'wolf-howl',
          labelOffsetY: -16,
          syncLabel: (nx, ny) => wNode.label?.setPosition(nx, ny),
        });
      }
    }

    // 2. Wildkorn-Ähren südlich vom See (liefern Wildkorn-Samen)
    if (state.chapter >= 2) {
      const grains: Array<[number, number]> = [
        [490, 185],
        [515, 195],
        [540, 185],
        [565, 195],
      ];
      grains.forEach(([x, y]) => {
        const n = this.addNode('wildgrain', 'farm', 'wheat_ripe', x, y, false);
        n.sprite.setDepth(y + 8);
      });
      this.addLabel(528, 165, 'Wildkorn');

      // 3. Lehmhaufen & Wasserschöpfstelle am südlichen Seeufer
      const clays: Array<[number, number]> = [
        [520, 218],
        [555, 218],
        [590, 218],
      ];
      clays.forEach(([x, y]) => this.addNode('clay', 'clay_pile', undefined, x, y, false));
      this.addLabel(555, 206, 'Lehm');

      const waterSpot = this.addNode('water_spot', 'prop_water_trough', undefined, 625, 212, true);
      this.setFootBox(waterSpot.sprite, 32, 10, 2);
      this.addLabel(625, 198, 'Wasserstelle', '#9ee0ff');

      // 4. 6 Acker-Parzellen (2x3 Raster) südlich vom See
      state.plots.forEach((p, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const px = 495 + col * 24;
        const py = 248 + row * 24;
        const n = this.addNode('plot', 'farm_soil_raw', undefined, px, py, false);
        n.plotId = p.id;
        n.sprite.setDepth(2);
        n.sprite.setDisplaySize(24, 24);
        this.refreshPlotVisual(n, p);
      });
      this.addLabel(519, 232, 'Ackerfeld');
    }

    // 5. Kapitel 3–6: Dorf-Bauplätze, fertige Gebäude und frei ziehende Wildziegen-Herde
    if (state.chapter >= 3 || state.buildings.length > 0) {
      BUILDINGS.forEach((b) => {
        const built = state.hasBuilding(b.id);
        if (!built && state.chapter < b.minChapter) return;
        const n = this.addNode('build_site', 'farm', 'sign_build', b.x, b.y, true);
        n.buildingDef = b;
        n.label = this.addLabel(b.x, b.y - 20, built ? b.name : `Bauplatz: ${b.name}`);
        if (built) this.applyBuiltVisual(n, b);
      });

      // Frei umherziehende Wildziegen-Herde auf der südöstlichen Weide (sdv_goat)
      const goatSpawns: Array<[number, number]> = [
        [632, 372],
        [668, 395],
      ];
      goatSpawns.forEach(([gx, gy]) => {
        const wg = this.addNode('wild_goat', 'sdv_goat', undefined, gx, gy, false);
        wg.sprite.setScale(1.0).play('goat-idle');
        wg.label = this.addLabel(gx, gy - 16, 'Wildziege');
        this.wildlife.addAnimal({
          kind: 'wild_goat',
          sprite: wg.sprite,
          bounds: { minX: 595, maxX: 705, minY: 342, maxY: 422 },
          speed: 18,
          animPrefix: 'goat',
          idleAnim: 'goat-idle',
          specialAnim: 'goat-graze',
          labelOffsetY: -16,
          syncLabel: (nx, ny) => wg.label?.setPosition(nx, ny),
        });
      });

      // Friedlich grasende Auerochsen / Ur-Rinder & Kalb auf den Außenweiden
      const cattleSpawns: Array<[number, number, { minX: number; maxX: number; minY: number; maxY: number }]> = [
        [688, 282, { minX: 650, maxX: 725, minY: 255, maxY: 318 }],
        [235, 495, { minX: 195, maxX: 285, minY: 468, maxY: 532 }],
      ];
      cattleSpawns.forEach(([cx, cy, bounds]) => {
        const cowSprite = this.add.sprite(cx, cy, 'sdv_cow', 4).setScale(1.0).setDepth(cy + 10);
        cowSprite.play('cow-idle');
        const cowLabel = this.addLabel(cx, cy - 18, 'Auerochse', '#e6ccb2');
        this.wildlife.addAnimal({
          kind: 'auerochse',
          sprite: cowSprite,
          bounds,
          speed: 14,
          animPrefix: 'cow',
          idleAnim: 'cow-idle',
          specialAnim: 'cow-graze',
          labelOffsetY: -18,
          syncLabel: (nx, ny) => cowLabel.setPosition(nx, ny),
        });
      });

      // Ein neugieriges Ur-Kalb auf der südwestlichen Weide
      const calfSprite = this.add.sprite(265, 505, 'sdv_calf', 4).setScale(0.85).setDepth(515);
      calfSprite.play('calf-idle');
      const calfLabel = this.addLabel(265, 489, 'Ur-Kalb', '#f5ebe0');
      this.wildlife.addAnimal({
        kind: 'calf',
        sprite: calfSprite,
        bounds: { minX: 205, maxX: 275, minY: 478, maxY: 525 },
        speed: 15,
        animPrefix: 'calf',
        idleAnim: 'calf-idle',
        labelOffsetY: -16,
        syncLabel: (nx, ny) => calfLabel.setPosition(nx, ny),
      });

      if (state.goatsTamed > 0) {
        this.spawnTamedGoat();
      }
    }

    // Wilde Feldhasen (hoppeln über Wiesen und schnuppern an Fallen)
    const rabbitSpawns: Array<[number, number, { minX: number; maxX: number; minY: number; maxY: number }]> = [
      [275, 420, { minX: 210, maxX: 330, minY: 370, maxY: 460 }],
      [450, 380, { minX: 410, maxX: 520, minY: 340, maxY: 430 }],
    ];
    rabbitSpawns.forEach(([rx, ry, bounds]) => {
      const rSprite = this.add.sprite(rx, ry, 'sdv_rabbit', 12).setScale(1.0).setDepth(ry + 6);
      rSprite.play('rabbit-idle');
      const rLabel = this.addLabel(rx, ry - 14, 'Feldhase', '#d5bdaf');
      this.wildlife.addAnimal({
        kind: 'rabbit',
        sprite: rSprite,
        bounds,
        speed: 18,
        animPrefix: 'rabbit',
        idleAnim: 'rabbit-idle',
        specialAnim: 'rabbit-sniff',
        labelOffsetY: -14,
        syncLabel: (nx, ny) => rLabel.setPosition(nx, ny),
      });
    });

    // Wildschwein im dichten westlichen Wald
    const pigSprite = this.add.sprite(155, 380, 'sdv_pig', 4).setScale(1.0).setDepth(390);
    pigSprite.play('pig-idle');
    const pigLabel = this.addLabel(155, 362, 'Wildschwein', '#b08968');
    this.wildlife.addAnimal({
      kind: 'pig',
      sprite: pigSprite,
      bounds: { minX: 120, maxX: 190, minY: 350, maxY: 420 },
      speed: 14,
      animPrefix: 'pig',
      idleAnim: 'pig-idle',
      specialAnim: 'pig-forage',
      labelOffsetY: -18,
      syncLabel: (nx, ny) => pigLabel.setPosition(nx, ny),
    });

    // 6. Kapitel 4+: Fernhändler Enki mit Marktstand im Süden des Dorfes
    if (state.chapter >= 4) {
      const mx = 400;
      const my = 478;
      this.add.image(mx, my - 18, 'overworld', 'market_stall').setScale(0.65).setDepth(my - 6);
      const mNode = this.addNode('merchant', 'npc_enki', undefined, mx, my, true);
      this.setFootBox(mNode.sprite, 12, 8, 2);
      mNode.sprite.setDepth(my + 14);
      this.addLabel(mx, my - 42, 'Fernhändler Enki (Tauschhandel)', '#ffd86b');
    }

    // 7. Begehbarer Höhleneingang in der Nordwand (authentisches Felsportal `cave_mouth` aus dem world-Atlas)
    const cave = this.addNode('mine_entrance', 'world', 'cave_mouth', 370, 44, true);
    cave.sprite.setScale(0.92);
    this.setFootBox(cave.sprite, 74, 18, 6);
    cave.sprite.setDepth(62);
    this.addLabel(370, 16, 'Höhle & Bergbau-Stollen [E]', '#ffcc88');

    if (state.chapter >= 5) {
      const copperCoords: Array<[number, number]> = [
        [312, 78],
        [345, 92],
        [415, 80],
      ];
      copperCoords.forEach(([x, y]) => {
        const cn = this.addNode('copper_vein', 'copper_vein', undefined, x, y, true);
        this.setFootBox(cn.sprite, 18, 10, 2);
        cn.label = this.addLabel(x, y - 15, 'Kupfererz', '#ff9d5c');
      });
    }

    if (state.chapter >= 6) {
      const ironCoords: Array<[number, number]> = [
        [278, 86],
        [446, 92],
        [472, 74],
      ];
      ironCoords.forEach(([x, y]) => {
        const ir = this.addNode('iron_vein', 'iron_vein', undefined, x, y, true);
        this.setFootBox(ir.sprite, 18, 10, 2);
        ir.label = this.addLabel(x, y - 15, 'Eisenerz', '#b8d0eb');
      });
    }

    // 8. Urzeit-Relikte in der Oberwelt (echte 16-Bit-Grafiken, verschwinden nach Bergung)
    if (state.chapter >= 4 && !state.relicsFound.includes('oetzi_dolch')) {
      const oetziNode = this.addNode('relic_oetzi', 'relic_oetzi', undefined, 210, 52, true);
      oetziNode.sprite.setScale(0.35);
      this.setFootBox(oetziNode.sprite, 12, 8, 2);
      oetziNode.label = this.addLabel(210, 34, '🗡️ Ötzis Kupferdolch', '#fbbf24');
    }

    if (state.chapter >= 5 && !state.relicsFound.includes('himmelsscheibe')) {
      const nebraNode = this.addNode('relic_himmelsscheibe', 'relic_nebra', undefined, 575, 470, true);
      nebraNode.sprite.setScale(0.75);
      this.setFootBox(nebraNode.sprite, 14, 10, 2);
      nebraNode.label = this.addLabel(575, 452, '✨ Himmelsscheibe von Nebra', '#38bdf8');
    }
  }

  /** Platziert epochenspezifische atmosphärische Dekorationen (Zelte, Racks, Brunnen, Bienenstöcke, Steinkreis etc.) */
  private placeAtmosphericProps(): void {
    // Wegweiser seitlich der zentralen Dorfkreuzung
    this.placeDecor('sign_a', 376, 304);

    // 1. Kapitel 1 & 2: Nomadenlager der Altsteinzeit / Mittelsteinzeit
    if (state.chapter <= 2) {
      // Otas Mammuthaut-Tipi direkt hinter Otas Stammplatz
      const tent = this.makeObstacle(370, 268, 'prop_tent_ota', undefined, true);
      this.setFootBox(tent, 46, 18, 4);
      tent.setDepth(268 + 16);

      // Zweites kleineres Jägerzelt aus dem Hunter-Settlement-Pack im westlichen Lager
      this.placeDecor('tent_brown', 304, 246);

      // Felltrockengestell & Fleisch-Räuchergestell am Lagerplatz
      this.placeDecor('hide_rack_a', 326, 274);
      this.placeDecor('meat_rack_a', 422, 274);
      this.placeDecor('cauldron_fire', 436, 316);

      // Fisch-Trockengestell & Korb am Ufer des Sees
      this.placeDecor('fish_rack', 590, 172);
      this.placeDecor('basket_a', 614, 178);

      // Mammut-Knochenhaufen, Totem und Schädel im nördlichen Jagdrevier
      const bones = this.makeObstacle(255, 110, 'prop_bone_pile', undefined, true);
      this.setFootBox(bones, 26, 12, 2);
      bones.setDepth(110 + 8);

      const skull = this.makeObstacle(440, 112, 'prop_mammoth_skull', undefined, true);
      this.setFootBox(skull, 20, 12, 2);
      skull.setDepth(112 + 8);

      this.placeDecor('totem', 348, 124);
    } else {
      // Kapitel 3+: Sesshaftes Dorfleben mit Dorfbrunnen neben dem Platz, Rundhaus & Hof-Details
      this.placeDecor('well', 448, 344);
      this.placeDecor('hut_round_a', 498, 404);
      this.placeDecor('logs_b', 350, 278);
      this.placeDecor('barrel_a', 368, 278);
      this.placeDecor('sign_b', 422, 408);
    }

    // 2. Kapitel 2+: Tonkrüge an der Lehm-Schöpfstelle
    if (state.chapter >= 2) {
      const pots = this.makeObstacle(575, 226, 'prop_pots_group', undefined, true);
      this.setFootBox(pots, 20, 10, 2);
      pots.setDepth(226 + 6);
    }

    // 3. Kapitel 3+: Bauerndorf mit Heuschobern, Vogelscheuche, Schubkarre & Bienenstöcken
    if (state.chapter >= 3) {
      const hay1 = this.makeObstacle(460, 245, 'prop_haystack', undefined, true);
      this.setFootBox(hay1, 28, 16, 4);
      hay1.setDepth(245 + 16);

      const hay2 = this.makeObstacle(580, 248, 'prop_haystack', undefined, true);
      this.setFootBox(hay2, 28, 16, 4);
      hay2.setDepth(248 + 16);

      // Vogelscheuche & Schubkarre am Feldrand + Bienenstöcke am östlichen Wiesenrand
      this.placeDecor('scarecrow_a', 474, 272);
      this.placeDecor('wheelbarrow_hay', 566, 282);
      this.placeDecor('beehive_a', 612, 252);
      this.placeDecor('beehive_b', 632, 256);
    }

    // 4. Kapitel 4+: Fernhandels-Keramik, Kisten & Fässer am Marktstand von Enki
    if (state.chapter >= 4) {
      const marketPots = this.makeObstacle(366, 482, 'prop_pots_group', undefined, true);
      this.setFootBox(marketPots, 20, 10, 2);
      marketPots.setDepth(482 + 6);
      this.placeDecor('crate_a', 434, 480);
      this.placeDecor('sack_a', 448, 484);
      this.placeDecor('banner_a', 352, 468);
    }

    // 5. Kapitel 5+: Megalithischer Steinkreis auf dem Sonnenberg (Kultstätte der Himmelsscheibe)
    if (state.chapter >= 5) {
      const circle = this.makeObstacle(575, 470, 'prop_stone_circle', undefined, false);
      circle.setDepth(465);
      this.placeDecor('totem', 532, 458);
      this.placeDecor('torch', 542, 492, { collidable: false });
      this.placeDecor('torch', 608, 492, { collidable: false });
    }

    // 6. Kapitel 6: Brennholz-Lager & Fässer für die Eisenschmiede
    if (state.chapter >= 6) {
      this.placeDecor('logs_a', 306, 178);
      this.placeDecor('barrel_b', 364, 178);
    }
  }

  private applyBuiltVisual(n: Node, b: BuildingDef): void {
    n.label?.setText(b.name).setY(b.y - (b.id === 'langhaus' ? 42 : 24));
    if (b.id === 'toepferofen') {
      n.sprite.setTexture('kiln');
      n.sprite.setDepth(b.y + 12);
      this.setFootBox(n.sprite, 32, 18, 3);
      this.spawnHelper(b.x + 26, b.y + 4, b.helperName, b.helperSprite ?? 'npc_mila');
    } else if (b.id === 'speicher') {
      // Authentische Reetdach-Vorratshütte aus dem Stone-Age-Pack statt mittelalterlichem Schuppen
      n.sprite.setTexture('world', 'hut_round_b');
      n.sprite.setScale(0.68);
      n.sprite.setDepth(b.y + 20);
      this.setFootBox(n.sprite, 38, 18, 4);
      this.placeDecor('sack_a', b.x - 24, b.y + 14);
      this.spawnHelper(b.x + 28, b.y + 10, b.helperName, b.helperSprite ?? 'npc_kora');
    } else if (b.id === 'langhaus') {
      // Großes steinzeitliches Reetdach-Langhaus aus dem Hunter-Settlement-Pack
      n.sprite.setTexture('world', 'house_thatch_big');
      n.sprite.setScale(0.76);
      n.sprite.setDepth(b.y + 28);
      this.setFootBox(n.sprite, 66, 22, 4);
    } else if (b.id === 'gehege') {
      // Vollständiges Holzzaun-Gehege mit Pfosten, Gatter & Futtertrog aus dem world-Atlas
      n.sprite.setTexture('world', 'fence_gate');
      n.sprite.setScale(0.6);
      n.sprite.setDepth(b.y + 22);
      this.setFootBox(n.sprite, 22, 6, 2);
      for (let dx = -26; dx <= 26; dx += 26) {
        this.placeDecor('fence_a', b.x + dx, b.y - 20, { collidable: true });
        if (dx !== 0) {
          this.placeDecor('fence_a', b.x + dx, b.y + 20, { collidable: true });
        }
      }
      this.placeDecor('fence_post', b.x - 38, b.y - 4, { collidable: true });
      this.placeDecor('fence_post', b.x - 38, b.y + 12, { collidable: true });
      this.placeDecor('fence_post', b.x + 38, b.y - 4, { collidable: true });
      this.placeDecor('fence_post', b.x + 38, b.y + 12, { collidable: true });
      this.placeDecor('trough_hay', b.x + 18, b.y - 8, { collidable: true });
      this.spawnHelper(b.x - 48, b.y + 6, b.helperName, b.helperSprite ?? 'npc_tarek');
    } else if (b.id === 'webstuhl') {
      n.sprite.setTexture('loom');
      n.sprite.setDepth(b.y + 12);
      this.setFootBox(n.sprite, 32, 16, 3);
      this.spawnHelper(b.x - 24, b.y + 6, b.helperName, b.helperSprite ?? 'npc_jana');
    } else if (b.id === 'schmelzofen') {
      n.sprite.setTexture('smelter');
      n.sprite.setDepth(b.y + 14);
      this.setFootBox(n.sprite, 32, 18, 3);
      this.spawnHelper(b.x - 26, b.y + 6, b.helperName, b.helperSprite ?? 'npc_barak');
    } else if (b.id === 'schmiede') {
      n.sprite.setTexture('forge');
      n.sprite.setDepth(b.y + 14);
      this.setFootBox(n.sprite, 34, 18, 3);
      this.spawnHelper(b.x - 28, b.y + 6, b.helperName, b.helperSprite ?? 'npc_barak');
    }
  }

  private spawnHelper(x: number, y: number, name: string, spriteKey: string): void {
    const h = this.add.sprite(x, y, spriteKey, 0).setDepth(y + 12);
    void h;
    this.addLabel(x, y - 18, name.split(' ')[0], '#d8f0ff');
  }

  private spawnTamedGoat(): void {
    if (this.nodes.some((n) => n.kind === 'tamed_goat')) return;
    const gx = 524;
    const gy = 352;
    const g = this.addNode('tamed_goat', 'sdv_goat', undefined, gx, gy, false);
    g.sprite.setScale(1.0).play('goat-idle').setDepth(gy + 10);
    g.label = this.addLabel(gx, gy - 16, 'Zahme Ziege', '#bfffbf');
    this.wildlife.addAnimal({
      kind: 'tamed_goat',
      sprite: g.sprite,
      bounds: { minX: 506, maxX: 546, minY: 338, maxY: 364 },
      speed: 14,
      animPrefix: 'goat',
      idleAnim: 'goat-idle',
      specialAnim: 'goat-graze',
      labelOffsetY: -16,
      syncLabel: (nx, ny) => g.label?.setPosition(nx, ny),
    });

    // Fröhliches Zicklein im Gehege (didaktischer Beweis der neolithischen Viehzucht)
    const kx = 540;
    const ky = 352;
    const babySprite = this.add.sprite(kx, ky, 'sdv_goat_baby', 4).setScale(0.85).setDepth(ky + 10);
    babySprite.play('goat-baby-idle');
    const babyLabel = this.addLabel(kx, ky - 14, 'Zicklein', '#dcfce7');
    this.wildlife.addAnimal({
      kind: 'goat_baby',
      sprite: babySprite,
      bounds: { minX: 510, maxX: 546, minY: 340, maxY: 362 },
      speed: 13,
      animPrefix: 'goat-baby',
      idleAnim: 'goat-baby-idle',
      specialAnim: 'goat-baby-play',
      labelOffsetY: -14,
      syncLabel: (nx, ny) => babyLabel.setPosition(nx, ny),
    });
  }

  private refreshPlotVisual(n: Node, p: FarmPlotState): void {
    if (!p) return;
    if (n.cropSprite) n.cropSprite.setVisible(false);

    if (p.stage === 'raw') {
      n.sprite.setTexture('farm_soil_raw').setDisplaySize(24, 24).setOrigin(0.5, 0.5).setAlpha(1);
    } else if (p.stage === 'tilled') {
      n.sprite.setTexture('farm_soil_dry').setDisplaySize(24, 24).setOrigin(0.5, 0.5).setAlpha(1);
    } else if (p.stage === 'seeded') {
      n.sprite.setTexture('farm_soil_seeded').setDisplaySize(24, 24).setOrigin(0.5, 0.5).setAlpha(1);
      // Stufe 0: Ausgesäte Samenkörner
      if (!n.cropSprite) {
        n.cropSprite = this.add.image(n.sprite.x, n.sprite.y - 2, 'wheat_stages', 0).setDepth(n.sprite.depth + 1);
      } else {
        n.cropSprite.setTexture('wheat_stages', 0).setVisible(true).setDepth(n.sprite.depth + 1);
      }
    } else if (p.stage === 'watered') {
      n.sprite.setTexture('farm_soil_wet').setDisplaySize(24, 24).setOrigin(0.5, 0.5).setAlpha(1);
      // Dynamische Zwischenstufen während des Wachstumszeitraffers
      const elapsed = Date.now() - p.wateredAt;
      const progress = Math.min(0.99, Math.max(0, elapsed / CROP_MS));
      let stageFrame = 1; // Zarte grüne Keimlinge
      if (progress >= 0.66) stageFrame = 3; // Hohes Weizenfeld mit reifenden Ähren
      else if (progress >= 0.33) stageFrame = 2; // Dichter grüner Getreidebusch

      if (!n.cropSprite) {
        n.cropSprite = this.add.image(n.sprite.x, n.sprite.y - 4, 'wheat_stages', stageFrame).setDepth(n.sprite.depth + 1);
      } else {
        n.cropSprite.setTexture('wheat_stages', stageFrame).setVisible(true).setDepth(n.sprite.depth + 1);
      }
    } else if (p.stage === 'ripe') {
      n.sprite.setTexture('farm_soil_dry').setDisplaySize(24, 24).setOrigin(0.5, 0.5).setAlpha(1);
      // Stufe 4: Vollreifer, goldgelber Weizen (prachtvolle Ernte)
      if (!n.cropSprite) {
        n.cropSprite = this.add.image(n.sprite.x, n.sprite.y - 6, 'wheat_stages', 4).setDepth(n.sprite.depth + 1);
      } else {
        n.cropSprite.setTexture('wheat_stages', 4).setVisible(true).setDepth(n.sprite.depth + 1);
      }
    }
  }

  private placeOta(): void {
    const x = (MAP_W * TILE) / 2 + 48;
    const y = (MAP_H * TILE) / 2 - 10;
    const sprite = this.physics.add.staticSprite(x, y, 'npc_ota', 0);
    sprite.setDepth(y + 14);
    (sprite.body as Phaser.Physics.Arcade.StaticBody).setSize(10, 8).setOffset(3, 22);
    sprite.refreshBody();
    this.obstacles.add(sprite);
    this.addLabel(x, y - 22, 'Älteste Ota', '#ffffff');
    this.nodes.push({ kind: 'ota', sprite, readyAt: 0 });
  }

  private spawnFire(p: { x: number; y: number; t: number }): void {
    const node = this.addNode('fire', 'objects', 'fire0', p.x, p.y);
    node.placed = p;
    node.sprite.anims.play('fire');
    node.sprite.setScale(1.5);
    node.sprite.setDepth(p.y + 8);
    this.setFootBox(node.sprite, 10, 6, 2);
    node.glow = this.add.circle(p.x, p.y, 52, 0xffa040, 0).setDepth(8001).setBlendMode(Phaser.BlendModes.ADD);
  }

  private spawnTrap(p: { x: number; y: number; t: number }): void {
    const ready = Date.now() - p.t >= TRAP_MS;
    const node = this.addNode('trap', ready ? 'trap_full' : 'trap', undefined, p.x, p.y);
    node.placed = p;
    node.sprite.setDepth(p.y);
    this.setFootBox(node.sprite, 16, 10, 2);
    node.bubble = this.add.image(p.x, p.y - 16, 'objects', 'bubble_excl').setDepth(5000).setVisible(ready);
  }

  // ---------------------------------------------------------------- Spielschleife

  update(_t: number, delta: number): void {
    this.updateTime(delta);
    if (this.playerLabel && this.player) {
      this.playerLabel.x = this.player.x;
      this.playerLabel.y = this.player.y - 22;
      this.playerLabel.el.textContent = state.playerName;
    }

    if (!state.modal && !this.sleeping && this.player) {
      this.wildlife.update(delta, this.player.x, this.player.y);
    }
    this.syncWorldLabels();

    if (state.modal || this.sleeping) {
      this.player.setVelocity(0, 0);
      this.player.anims.play(`idle-${state.playerGender}-${this.facing}`, true);
      return;
    }

    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) vy += 1;
    if (vx === 0 && vy === 0 && state.touch) {
      vx = state.touch.vector.x;
      vy = state.touch.vector.y;
    }

    const v = new Phaser.Math.Vector2(vx, vy);
    if (v.length() > 1) v.normalize();
    const curSpeed = SPEED * state.moveSpeedMultiplier;
    this.player.setVelocity(v.x * curSpeed, v.y * curSpeed);

    if (v.length() > 0.01) {
      this.facing = Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? 'right' : 'left') : v.y > 0 ? 'down' : 'up';
      this.player.anims.play(`walk-${state.playerGender}-${this.facing}`, true);
      state.distanceMeters += (v.length() * curSpeed * (delta / 1000)) / 12;
    } else {
      this.player.anims.play(`idle-${state.playerGender}-${this.facing}`, true);
    }
    this.player.setDepth(this.player.y + 12);

    this.updateNodes();
    const target = this.nearest();
    state.hint = target ? this.hintFor(target) : '';
    this.updateCompass();
    if (this.debugEnabled) this.drawDebugOverlay();

    const pressed =
      Phaser.Input.Keyboard.JustDown(this.wasd.E) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.SPACE) ||
      (state.touch?.consumeAction() ?? false);
    if (pressed && target && performance.now() - state.lastModalClose > 250) this.interact(target);

    this.saveTimer += delta;
    if (this.saveTimer > 5000) {
      this.saveTimer = 0;
      this.persist();
    }
  }

  private drawDebugOverlay(): void {
    if (!this.debugGraphics) return;
    this.debugGraphics.clear();
    // Statische Hindernis-Hitboxen (grün)
    this.debugGraphics.lineStyle(1, 0x22c55e, 0.85);
    this.obstacles.getChildren().forEach((c) => {
      const b = (c as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.StaticBody | null;
      if (b && b.enable) {
        this.debugGraphics!.strokeRect(b.x, b.y, b.width, b.height);
      }
    });
    // Interaktions-Reichweiten (gelb)
    this.debugGraphics.lineStyle(1, 0xfacc15, 0.6);
    for (const n of this.nodes) {
      const isLanghaus = n.kind === 'build_site' && n.buildingDef?.id === 'langhaus';
      const extraReach =
        n.kind === 'mine_entrance' ? 22 : isLanghaus ? 28 : n.kind === 'wild_goat' ? 18 : 0;
      const targetY = isLanghaus ? n.sprite.y + 26 : n.sprite.y + (n.kind === 'ota' ? 8 : 4);
      this.debugGraphics.strokeCircle(n.sprite.x, targetY, REACH + extraReach);
    }
    // Spieler-Fußbox (hellblau)
    const pb = this.player.body as Phaser.Physics.Arcade.Body;
    this.debugGraphics.lineStyle(1.5, 0x38bdf8, 1);
    this.debugGraphics.strokeRect(pb.x, pb.y, pb.width, pb.height);
  }

  private updateCompass(): void {
    const ch = state.chapter;
    const q = state.quest;
    const findKind = (k: Kind, bId?: BuildingId): Node | undefined => {
      const candidates = this.nodes.filter(
        (n) => n.kind === k && (!bId || n.buildingDef?.id === bId) && Date.now() >= n.readyAt,
      );
      if (candidates.length === 0) return this.nodes.find((n) => n.kind === k && (!bId || n.buildingDef?.id === bId));
      return candidates.reduce((best, cur) =>
        Phaser.Math.Distance.Between(this.player.x, this.player.y, cur.sprite.x, cur.sprite.y) <
        Phaser.Math.Distance.Between(this.player.x, this.player.y, best.sprite.x, best.sprite.y)
          ? cur
          : best,
      );
    };

    let targetNode: Node | undefined;
    let label = '';

    if (q === 0 || state.isReadyForQuiz() || state.isChapterComplete()) {
      targetNode = findKind('ota');
      label = 'Älteste Ota';
    } else if (ch === 1) {
      if (q === 1) {
        targetNode = findKind('berry');
        label = 'Beerenstrauch';
      } else if (q === 2) {
        if (state.count('stock') >= 3 && state.count('stein') >= 2) {
          state.compassText = '🔨 Drücke C -> Lagerfeuer bauen!';
          return;
        }
        targetNode = state.count('stock') < 3 ? findKind('stump') : findKind('rock');
        label = state.count('stock') < 3 ? 'Baumstumpf (Stöcke)' : 'Felsen (Steine)';
      } else if (q === 3) {
        if (state.count('stock') >= 3) {
          state.compassText = '🔨 Drücke C -> Falle bauen!';
          return;
        }
        targetNode = findKind('stump');
        label = 'Baumstumpf (Stöcke)';
      } else if (q === 4) {
        targetNode = findKind('trap');
        label = 'Gestellte Falle';
      } else if (q === 5) {
        targetNode = findKind('fire');
        label = 'Lagerfeuer';
      } else if (q === 6) {
        if (state.count('stein') >= 2) {
          state.compassText = '🔨 Drücke C -> Faustkeil herstellen!';
          return;
        }
        targetNode = findKind('rock');
        label = 'Felsen (Steine)';
      }
    } else if (ch === 2) {
      if (q === 1) {
        targetNode = findKind('wolf');
        label = 'Scheuer Wolf (Westen)';
      } else if (q === 2) {
        targetNode = findKind('wildgrain');
        label = 'Wildkorn am See';
      } else if (q === 3) {
        state.compassText = '🔨 Sammle 2 Stöcke & 2 Steine -> Drücke C (Steinhacke)';
        return;
      } else if (q === 4) {
        targetNode = findKind('clay');
        label = 'Lehm am Seeufer';
      } else if (q === 5) {
        const needsWater = state.plots.some((p) => p.stage === 'seeded') && state.count('wasser') === 0;
        targetNode = needsWater ? findKind('water_spot') : findKind('plot');
        label = needsWater ? 'Wasserstelle am See' : 'Ackerfeld am See';
      } else if (q === 6) {
        targetNode = findKind('plot');
        label = 'Ackerfeld (mit Sichel ernten)';
      }
    } else if (ch === 3) {
      if (q === 1) {
        targetNode = findKind('build_site', 'toepferofen');
        label = 'Bauplatz: Töpferofen';
      } else if (q === 2) {
        targetNode = findKind('build_site', 'gehege');
        label = 'Bauplatz: Tiergehege';
      } else if (q === 3) {
        targetNode = findKind('wild_goat');
        label = 'Wildziege (Südosten)';
      } else if (q === 4) {
        targetNode = findKind('tamed_goat');
        label = 'Zahme Ziege im Gehege';
      } else if (q === 5) {
        if (!state.hasBuilding('speicher')) {
          targetNode = findKind('build_site', 'speicher');
          label = 'Bauplatz: Vorratsspeicher';
        } else {
          state.compassText = '🥖 Drücke C -> Fladenbrot backen!';
          return;
        }
      } else if (q === 6) {
        targetNode = findKind('build_site', 'langhaus');
        label = 'Bauplatz: Langhaus';
      }
    } else if (ch === 4) {
      if (q === 1) {
        targetNode = findKind('build_site', 'webstuhl');
        label = 'Bauplatz: Webstuhl';
      } else if (q === 2) {
        targetNode = findKind('tamed_goat');
        label = 'Zahme Ziege im Gehege';
      } else if (q === 3) {
        state.compassText = '🧶 Drücke C -> Gewebten Stoff herstellen!';
        return;
      } else {
        targetNode = findKind('merchant');
        label = 'Fernhändler Enki (Süden)';
      }
    } else if (ch === 5) {
      if (q === 1) {
        state.compassText = '⛏️ Drücke C -> Spitzhacke herstellen!';
        return;
      } else if (q === 2) {
        targetNode = findKind('build_site', 'schmelzofen');
        label = 'Bauplatz: Schmelzofen';
      } else if (q === 3) {
        targetNode = findKind('copper_vein');
        label = 'Kupfererz am Nord-Stollen';
      } else if (q === 4) {
        state.compassText = '🔥 Drücke C -> Kupfer schmelzen!';
        return;
      } else if (q === 5) {
        state.compassText = '🪓 Drücke C -> Kupferbeil gießen!';
        return;
      }
    } else if (ch === 6) {
      if (q === 1) {
        targetNode = findKind('merchant');
        label = 'Fernhändler Enki (Zinnerz)';
      } else if (q === 2) {
        state.compassText = '⚔️ Drücke C -> Bronze legieren & Bronzeschwert gießen!';
        return;
      } else if (q === 3) {
        targetNode = findKind('build_site', 'schmiede');
        label = 'Bauplatz: Eisenschmiede';
      } else if (q === 4) {
        if (state.count('eisenerz') < 2) {
          targetNode = findKind('iron_vein');
          label = 'Eisenerz am Nord-Stollen';
        } else {
          state.compassText = '🔥 Drücke C -> Eisen verhütten!';
          return;
        }
      } else if (q === 5) {
        state.compassText = '⚒️ Drücke C -> Eisenwerkzeug schmieden!';
        return;
      }
    }

    if (!targetNode) {
      state.compassText = '';
      return;
    }

    const dx = targetNode.sprite.x - this.player.x;
    const dy = targetNode.sprite.y - this.player.y;
    const distPx = Math.hypot(dx, dy);
    if (distPx < 32) {
      state.compassText = `📍 Ziel direkt vor dir: ${label} (drücke E)`;
      return;
    }
    const meters = Math.max(2, Math.round(distPx / 8));
    const angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180..180, 0 = Ost, -90 = Nord, 90 = Süd
    let dirStr = '→ Osten';
    if (angle >= -112.5 && angle < -67.5) dirStr = '↑ Norden';
    else if (angle >= -67.5 && angle < -22.5) dirStr = '↗ Nordosten';
    else if (angle >= -22.5 && angle < 22.5) dirStr = '→ Osten';
    else if (angle >= 22.5 && angle < 67.5) dirStr = '↘ Südosten';
    else if (angle >= 67.5 && angle < 112.5) dirStr = '↓ Süden';
    else if (angle >= 112.5 && angle < 157.5) dirStr = '↙ Südwesten';
    else if (angle >= -157.5 && angle < -112.5) dirStr = '↖ Nordwesten';
    else dirStr = '← Westen';

    state.compassText = `🧭 ${label}: ${dirStr} (${meters} m)`;
  }

  private nightness(): number {
    const t = state.dayTime;
    if (t < 0.6) return 0;
    if (t < 0.7) return (t - 0.6) / 0.1;
    if (t < 0.9) return 1;
    return 1 - (t - 0.9) / 0.1;
  }

  private nearFire(range: number): boolean {
    return this.nodes.some(
      (n) => n.kind === 'fire' && Phaser.Math.Distance.Between(n.sprite.x, n.sprite.y, this.player.x, this.player.y) < range,
    );
  }

  private updateTime(delta: number): void {
    const dt = delta / 1000;
    if (!state.modal && !this.sleeping) {
      state.playTimeSec += dt;
      const nextDayTime = state.dayTime + delta / DAY_MS;
      if (nextDayTime >= 1) state.daysSurvived++;
      state.dayTime = nextDayTime % 1;
      state.food = Math.max(0, state.food - dt * 0.3);
      const night = this.nightness();
      const safeBonus = (state.wolfTamed ? 0.35 : 0) + (state.hasBuilding('langhaus') ? 0.5 : 0);
      if (night > 0.4) {
        state.safety = this.nearFire(95) || safeBonus >= 0.5
          ? Math.min(100, state.safety + dt * 4)
          : Math.max(0, state.safety - dt * Math.max(0.2, 0.85 - safeBonus));
        if (this.nearFire(95)) state.unlock('nacht');
      } else {
        state.safety = Math.min(100, state.safety + dt * 0.7);
      }
      if (state.food <= 0 || state.safety <= 0) this.collapse();
    }

    const night = this.nightness();
    this.nightOverlay.setFillStyle(0x0b1240, night * 0.55);
    this.nodes.forEach((n) => n.glow?.setFillStyle(0xffa040, 0.22 * night));
  }

  private collapse(): void {
    state.collapses++;
    state.food = Math.max(state.food, 40);
    state.safety = Math.max(state.safety, 50);
    this.player.setPosition((MAP_W * TILE) / 2, (MAP_H * TILE) / 2 + 20);
    state.openDialog({
      speaker: 'Ota',
      nodes: [
        { text: 'Du bist vor Erschöpfung umgefallen! Wir haben dich zurück ins Lager gebracht und dir etwas zu essen gegeben.' },
        { text: 'Denk daran: Iss regelmäßig (F) und bleib nachts am Feuer oder im Langhaus.' },
      ],
    });
  }

  private updateNodes(): void {
    const now = Date.now();
    for (const n of this.nodes) {
      if (n.kind === 'berry' && n.fullFrame && n.emptyFrame) {
        const depleted = now < n.readyAt;
        const targetFrame = depleted ? n.emptyFrame : n.fullFrame;
        if (n.sprite.frame.name !== targetFrame) {
          n.sprite.setFrame(targetFrame);
        }
        n.sprite.setAlpha(1);
      } else if (
        n.kind === 'stump' ||
        n.kind === 'rock' ||
        n.kind === 'wildgrain' ||
        n.kind === 'clay' ||
        n.kind === 'tamed_goat' ||
        n.kind === 'copper_vein' ||
        n.kind === 'iron_vein'
      ) {
        const depleted = now < n.readyAt;
        n.sprite.setAlpha(depleted ? 0.5 : 1);
      }
      if (n.kind === 'trap' && n.placed && n.bubble) {
        const ready = now - n.placed.t >= TRAP_MS;
        const targetTex = ready ? 'trap_full' : 'trap';
        if (n.sprite.texture.key !== targetTex) {
          n.sprite.setTexture(targetTex);
        }
        n.bubble.setVisible(ready).setY(n.placed.y - 16 + Math.sin(this.time.now / 200) * 2);
      }
      if (n.kind === 'plot' && n.plotId !== undefined) {
        const p = state.plots[n.plotId];
        if (p && p.stage === 'watered') {
          if (now - p.wateredAt >= CROP_MS) {
            p.stage = 'ripe';
            this.refreshPlotVisual(n, p);
            state.emit('toast', 'Dein Getreide auf dem Acker ist reif zur Ernte!');
          } else {
            this.refreshPlotVisual(n, p);
          }
        }
      }
    }
    // Gezähmter Hund folgt dem Spieler in gemütlichem Abstand mit 4-Richtungs-Animation
    if (state.wolfTamed && this.wolfNode) {
      const ws = this.wolfNode.sprite;
      const d = Phaser.Math.Distance.Between(ws.x, ws.y, this.player.x, this.player.y);
      if (d > 52) {
        const angle = Phaser.Math.Angle.Between(ws.x, ws.y, this.player.x, this.player.y);
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        ws.x += dx * 1.35;
        ws.y += dy * 1.35;
        if (Math.abs(dx) >= Math.abs(dy)) {
          ws.play('lupo-walk-right', true);
          ws.setFlipX(dx < 0);
        } else if (dy > 0) {
          ws.play('lupo-walk-down', true);
          ws.setFlipX(false);
        } else {
          ws.play('lupo-walk-up', true);
          ws.setFlipX(false);
        }
        ws.setDepth(ws.y + 8);
        this.wolfNode.label?.setPosition(ws.x, ws.y - 16);
      } else if (d < 26) {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, ws.x, ws.y);
        ws.x += Math.cos(angle) * 0.9;
        ws.y += Math.sin(angle) * 0.9;
        ws.setDepth(ws.y + 8);
        this.wolfNode.label?.setPosition(ws.x, ws.y - 16);
      } else {
        // Spieler steht still -> Lupo legt sich gemütlich hin und bleibt ruhig liegen
        if (ws.anims.currentAnim?.key !== 'lupo-lay' && ws.anims.currentAnim?.key !== 'lupo-wag') {
          ws.play('lupo-lay', true);
        }
      }
    }
  }

  // ---------------------------------------------------------------- Interaktion

  private nearest(): Node | null {
    const fx = this.player.x;
    const fy = this.player.y + 8;
    let best: Node | null = null;
    let bestD = REACH;
    let petCandidate: Node | null = null;
    for (const n of this.nodes) {
      const isLanghaus = n.kind === 'build_site' && n.buildingDef?.id === 'langhaus';
      const isTamedWolf = n.kind === 'wolf' && state.wolfTamed;
      const extraReach =
        n.kind === 'mine_entrance' ? 22 : isLanghaus ? 28 : n.kind === 'wild_goat' ? 18 : 0;
      const targetY = isLanghaus ? n.sprite.y + 26 : n.sprite.y + (n.kind === 'ota' ? 8 : 4);
      const d = Phaser.Math.Distance.Between(fx, fy, n.sprite.x, targetY) - extraReach;
      if (isTamedWolf) {
        if (d < 22) petCandidate = n;
        continue;
      }
      if (d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best ?? petCandidate;
  }

  private hintFor(n: Node): string {
    const depleted = Date.now() < n.readyAt;
    switch (n.kind) {
      case 'berry':
        return depleted ? 'Der Strauch trägt gerade keine Beeren.' : 'E: Beeren pflücken';
      case 'stump':
        return depleted ? 'Hier gibt es gerade keine Stöcke.' : 'E: Stöcke sammeln';
      case 'rock':
        return depleted ? 'Hier liegen gerade keine Steine.' : 'E: Steine sammeln';
      case 'wildgrain':
        return depleted ? 'Die Ähren wachsen nach ...' : 'E: Wildkorn-Samen sammeln';
      case 'clay':
        return depleted ? 'Neuer Lehm sammelt sich am Ufer ...' : 'E: Feuchten Lehm ausgraben';
      case 'water_spot':
        return state.count('tontopf') > 0 ? 'E: Wasser mit Tontopf schöpfen' : 'Wasserstelle (benötigt leeren Tontopf)';
      case 'wolf':
        return state.wolfTamed
          ? 'E: Hütehund Lupo streicheln'
          : state.count('fleisch') > 0 || state.count('gebraten') > 0
            ? 'E: Wolf mit Fleisch füttern & zähmen'
            : 'Scheuer Wolf (gib ihm 1× Fleisch zum Zähmen)';
      case 'plot': {
        const p = state.plots[n.plotId ?? 0];
        if (!p) return '';
        if (p.stage === 'raw') return state.count('hacke') > 0 ? 'E: Boden mit Steinhacke umgraben' : 'Ackerboden (benötigt Steinhacke, C)';
        if (p.stage === 'tilled') return state.count('samen') > 0 ? 'E: Wildkorn-Samen aussäen' : 'Gepflügter Boden (benötigt Wildkorn-Samen)';
        if (p.stage === 'seeded') return state.count('wasser') > 0 ? 'E: Saat mit Wasser gießen' : 'Gesätes Korn (hole Wasser im Tontopf am See!)';
        if (p.stage === 'watered') return 'Getreide wächst ... (warte kurz oder schlafe am Feuer)';
        return state.count('sichel') > 0 ? 'E: Reifes Getreide mit Erntesichel schneiden' : 'Reifes Getreide (benötigt Erntesichel, C)';
      }
      case 'build_site': {
        const b = n.buildingDef!;
        if (state.hasBuilding(b.id)) {
          if (b.id === 'langhaus') return 'E: Langhaus betreten (Schlafplatz & Vorräte)';
          return `E: Mit ${b.helperName} (${b.name}) sprechen`;
        }
        const cost = state.getBuildingCost(b.cost);
        const costStr = Object.entries(cost)
          .map(([id, cnt]) => `${cnt}× ${ITEMS[id as ItemId].name}`)
          .join(', ');
        return `E: ${b.name} bauen (${costStr})${state.buildingDiscount < 1 ? ' (⚒️ Rabatt)' : ''}`;
      }
      case 'wild_goat':
        if (!state.hasBuilding('gehege')) return 'Wildziege (baue zuerst das Tiergehege!)';
        return state.count('getreide') > 0 ? 'E: Wildziege mit 1× Getreide ins Gehege locken' : 'Wildziege (locke sie mit 1× Getreide an)';
      case 'tamed_goat':
        return depleted ? 'Die Ziege ruht sich gerade aus.' : 'E: Ziege melken & Wolle scheren';
      case 'merchant':
        return 'E: Mit Fernhändler Enki Waren tauschen (ohne Münzen!)';
      case 'mine_entrance':
        return 'E: Höhle & Bergbau-Stollen betreten';
      case 'relic_oetzi':
        return 'E: Ötzis Kupferdolchklinge untersuchen';
      case 'relic_himmelsscheibe':
        return 'E: Fragment der Himmelsscheibe von Nebra freilegen';
      case 'copper_vein':
        if (depleted) return 'Die Kupferader erholt sich ...';
        return state.count('spitzhacke') > 0 ? 'E: Rötliches Kupfererz mit Spitzhacke abbauen' : 'Kupfererz-Ader (benötigt Spitzhacke, C)';
      case 'iron_vein':
        if (depleted) return 'Die Eisenader erholt sich ...';
        return state.count('spitzhacke') > 0 ? 'E: Bläuliches Eisenerz mit Spitzhacke abbauen' : 'Eisenerz-Ader (benötigt Spitzhacke, C)';
      case 'ota':
        return 'E: Mit Ältester Ota sprechen';
      case 'fire':
        if (state.count('fleisch') > 0) return 'E: Fleisch braten';
        return 'E: Am Lagerfeuer ausruhen (bis zum nächsten Tag)';
      case 'trap':
        return n.placed && Date.now() - n.placed.t >= TRAP_MS ? 'E: Falle leeren (Beute einsammeln)' : 'Die Falle ist noch leer (wartet auf Beute) ...';
      default:
        return '';
    }
  }

  private interact(n: Node): void {
    const now = Date.now();
    switch (n.kind) {
      case 'berry':
      case 'stump':
      case 'rock':
      case 'wildgrain':
      case 'clay': {
        if (now < n.readyAt) return;
        if (n.kind === 'berry') {
          const base = Phaser.Math.Between(1, 3);
          const amt = base * state.berryYieldMultiplier;
          state.add('beere', amt);
          state.unlock('sammeln');
          state.bump('beere', amt);
          this.playToolActionFeedback('gather');
          state.emit('toast', `+${amt} Beeren${state.berryYieldMultiplier > 1 ? ' (🌿 Sammler-Bonus!)' : ''}`);
        } else if (n.kind === 'stump') {
          state.add('stock', 2);
          state.bump('stock', 2);
          this.playToolActionFeedback('chop');
          state.emit('toast', '+2 Stöcke');
        } else if (n.kind === 'rock') {
          const amt = Phaser.Math.Between(1, 2);
          state.add('stein', amt);
          state.bump('stein', amt);
          this.playToolActionFeedback('mine');
          state.emit('toast', `+${amt} Steine`);
        } else if (n.kind === 'wildgrain') {
          state.add('samen', 2);
          state.unlock('wildkorn');
          state.bump('samen', 2);
          this.playToolActionFeedback('gather');
          state.emit('toast', '+2 Wildkorn-Samen');
        } else if (n.kind === 'clay') {
          state.add('lehm', 2);
          state.bump('lehm', 2);
          this.playToolActionFeedback('gather');
          state.emit('toast', '+2 Feuchter Lehm');
        }
        n.readyAt = now + REGROW_MS;
        break;
      }
      case 'water_spot': {
        if (state.count('tontopf') <= 0) {
          state.emit('toast', 'Du brauchst erst einen leeren Tontopf (C: 2 Lehm).');
          return;
        }
        state.add('tontopf', -1);
        state.add('wasser', 1);
        this.playToolActionFeedback('water');
        state.emit('toast', 'Tontopf mit frischem Seewasser gefüllt!');
        break;
      }
      case 'wolf':
        this.interactWolf(n);
        break;
      case 'plot':
        this.interactPlot(n);
        break;
      case 'build_site':
        this.interactBuilding(n);
        break;
      case 'wild_goat':
        this.interactWildGoat(n);
        break;
      case 'tamed_goat': {
        if (now < n.readyAt) return;
        state.add('milch', 1);
        state.add('wolle', 1);
        n.readyAt = now + REGROW_MS;
        state.bump('goat_product', 1);
        state.emit('toast', '+1 Ziegenmilch, +1 Wolle');
        break;
      }
      case 'merchant': {
        state.unlock('tauschhandel');
        state.bump('talked_merchant', 1);
        state.emit('openTrade');
        break;
      }
      case 'mine_entrance': {
        this.enterCave();
        break;
      }
      case 'relic_oetzi': {
        state.emit('openRelicQuiz', 'oetzi_dolch');
        state.hint = '';
        this.removeNode(n);
        break;
      }
      case 'relic_himmelsscheibe': {
        state.emit('openRelicQuiz', 'himmelsscheibe');
        state.hint = '';
        this.removeNode(n);
        break;
      }
      case 'copper_vein': {
        if (now < n.readyAt) return;
        if (state.count('spitzhacke') <= 0) {
          state.emit('toast', 'Das Gestein ist zu hart! Baue zuerst eine Spitzhacke (C: 2 Stöcke, 3 Steine).');
          return;
        }
        state.add('kupfererz', 2);
        state.unlock('bergbau');
        state.unlock('kupfer');
        state.bump('mined_kupfer', 2);
        n.readyAt = now + REGROW_MS * 0.6;
        state.emit('toast', '+2 Kupfererz aus dem Fels geschlagen!');
        break;
      }
      case 'iron_vein': {
        if (now < n.readyAt) return;
        if (state.count('spitzhacke') <= 0) {
          state.emit('toast', 'Du brauchst eine Spitzhacke (C) zum Erzabbau!');
          return;
        }
        state.add('eisenerz', 2);
        state.unlock('bergbau');
        state.unlock('eisen');
        state.bump('mined_eisen', 2);
        n.readyAt = now + REGROW_MS * 0.6;
        state.emit('toast', '+2 Eisenerz aus dem Fels geschlagen!');
        break;
      }
      case 'ota':
        this.talkToOta();
        break;
      case 'fire':
        this.useFire();
        break;
      case 'trap':
        this.emptyTrap(n);
        break;
    }
  }

  private interactWolf(n: Node): void {
    if (state.wolfTamed) {
      state.safety = Math.min(100, state.safety + 10);
      n.sprite.play('lupo-wag', true);
      this.time.delayedCall(2500, () => {
        if (n.sprite && n.sprite.active) n.sprite.play('lupo-lay', true);
      });
      state.emit('toast', 'Wuff! Hütehund Lupo freut sich und passt auf dich auf (+10 Schutz).');
      return;
    }
    if (state.count('fleisch') > 0) {
      state.add('fleisch', -1);
    } else if (state.count('gebraten') > 0) {
      state.add('gebraten', -1);
    } else {
      state.emit('toast', 'Der Wolf hat Hunger. Bring ihm 1× Fleisch aus einer Falle!');
      return;
    }
    state.wolfTamed = true;
    n.sprite.setTexture('sdv_dog_lupo', 24);
    n.sprite.play('lupo-wag');
    this.time.delayedCall(2500, () => {
      if (n.sprite && n.sprite.active) n.sprite.play('lupo-lay', true);
    });
    n.label?.setText('Hund Lupo');
    state.unlock('wolf');
    state.checkQuest();
    state.emit('toast', 'Du hast den Wolf gezähmt! Hund Lupo wedelt mit dem Schwanz und begleitet dich jetzt.');
  }

  private interactPlot(n: Node): void {
    const p = state.plots[n.plotId ?? 0];
    if (!p) return;
    if (p.stage === 'raw') {
      if (state.count('hacke') <= 0) {
        state.emit('toast', 'Stelle zuerst eine Steinhacke her (C: 2 Stöcke, 2 Steine).');
        return;
      }
      p.stage = 'tilled';
      this.refreshPlotVisual(n, p);
      this.playToolActionFeedback('hoe');
      state.unlock('ackerbau');
      state.emit('toast', 'Boden mit der Steinhacke aufgelockert!');
    } else if (p.stage === 'tilled') {
      if (state.count('samen') <= 0) {
        state.emit('toast', 'Dir fehlen Wildkorn-Samen (pflücke gelbe Ähren am See).');
        return;
      }
      state.add('samen', -1);
      p.stage = 'seeded';
      this.refreshPlotVisual(n, p);
      this.playToolActionFeedback('gather');
      state.emit('toast', 'Wildkorn ausgesät! Jetzt mit Wasser gießen.');
    } else if (p.stage === 'seeded') {
      if (state.count('wasser') <= 0) {
        state.emit('toast', 'Hole erst Wasser mit dem Tontopf an der Wasserstelle am See!');
        return;
      }
      state.add('wasser', -1);
      state.add('tontopf', 1); // Topf ist danach wieder leer nutzbar
      p.stage = 'watered';
      p.wateredAt = Date.now();
      this.refreshPlotVisual(n, p);
      this.playToolActionFeedback('water');
      state.bump('watered_plot', 1);
      state.emit('toast', 'Feld gegossen! Nach kurzer Zeit (oder 1× Schlafen) ist es reif.');
    } else if (p.stage === 'watered') {
      state.emit('toast', 'Das Korn wächst noch. Warte kurz oder ruh dich am Feuer aus!');
    } else if (p.stage === 'ripe') {
      if (state.count('sichel') <= 0) {
        state.emit('toast', 'Du brauchst eine Erntesichel (C: 2 Stöcke, 2 Steine) zum Ernten!');
        return;
      }
      p.stage = 'tilled';
      this.refreshPlotVisual(n, p);
      this.playToolActionFeedback('gather');
      state.add('getreide', 2);
      state.add('samen', 2);
      state.bump('harvested_wheat', 1);
      state.emit('toast', 'Ernte eingebracht: +2 Getreide, +2 Samen!');
    }
  }

  /**
   * Taktiles Aktions-Feedback beim Benutzen von Werkzeugen (Axt, Hacke, Sichel, Wasser).
   */
  private playToolActionFeedback(type: 'chop' | 'mine' | 'hoe' | 'water' | 'gather'): void {
    if (!this.player) return;
    this.tweens.add({
      targets: this.player,
      scaleX: 1.18,
      scaleY: 0.82,
      duration: 80,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    const colors = {
      chop: 0x96603a,  // Holzspäne
      mine: 0xc4c7cc,  // Steinsplitter
      hoe: 0x664426,   // Ackererde
      water: 0x67e8f9, // Wassertropfen
      gather: 0x86efac,// Pflanzenreste
    };
    const col = colors[type] ?? 0xffffff;
    for (let i = 0; i < 4; i++) {
      const p = this.add.circle(this.player.x + Phaser.Math.Between(-6, 6), this.player.y + 12 + Phaser.Math.Between(-4, 4), 2, col, 0.9).setDepth(4000);
      this.tweens.add({
        targets: p,
        x: p.x + Phaser.Math.Between(-14, 14),
        y: p.y - Phaser.Math.Between(8, 20),
        alpha: 0,
        scale: 0.4,
        duration: 300,
        onComplete: () => p.destroy(),
      });
    }
  }

  private interactBuilding(n: Node): void {
    const b = n.buildingDef!;
    if (state.hasBuilding(b.id)) {
      if (b.id === 'langhaus') {
        this.enterLonghouse();
        return;
      }
      if (b.id === 'toepferofen' && state.count('tontopf') === 0 && state.count('wasser') === 0) {
        state.add('tontopf', 1);
        state.emit('toast', `${b.helperName}: „Hier hast du einen frischen Tontopf!“`);
      } else {
        state.openDialog({
          speaker: b.helperName,
          nodes: [{ text: `${b.name}: ${b.helperRole}` }],
        });
      }
      return;
    }
    const cost = state.getBuildingCost(b.cost);
    if (!state.canAffordBuilding(b)) {
      const missing = Object.entries(cost)
        .map(([id, cnt]) => `${cnt}× ${ITEMS[id as ItemId].name} (du hast ${state.count(id as ItemId)})`)
        .join(', ');
      state.emit('toast', `Für ${b.name} benötigt: ${missing}`);
      return;
    }
    state.spendCost(cost);
    state.buildings.push(b.id);
    this.applyBuiltVisual(n, b);
    if (b.id === 'langhaus') state.unlock('langhaus');
    else if (b.id === 'webstuhl') state.unlock('weben');
    else if (b.id === 'schmelzofen') state.unlock('kupfer');
    else if (b.id === 'schmiede') state.unlock('eisen');
    else state.unlock('arbeitsteilung');
    state.checkQuest();
    state.emit('toast', `${b.name} fertiggestellt! ${b.helperName} hilft jetzt im Dorf.`);
  }

  private interactWildGoat(n: Node): void {
    if (!state.hasBuilding('gehege')) {
      state.emit('toast', 'Baue zuerst das Tiergehege am Bauplatz im Osten!');
      return;
    }
    if (state.count('getreide') <= 0) {
      state.emit('toast', 'Du brauchst 1× geerntetes Getreide, um die Wildziege anzulocken.');
      return;
    }
    state.add('getreide', -1);
    state.goatsTamed++;
    if (this.nodes.filter((x) => x.kind === 'wild_goat').length > 1) {
      this.removeNode(n);
    }
    this.spawnTamedGoat();
    state.unlock('domestizierung');
    state.checkQuest();
    state.emit('toast', 'Die Ziege folgt dir ins Gehege! Drücke dort E zum Melken.');
  }

  private talkToOta(): void {
    const meta = CHAPTERS[state.chapter];
    const q = state.quest;
    if (q === 0) {
      state.openDialog({
        speaker: 'Älteste Ota',
        nodes: meta.intro,
        onDone: () => {
          if (state.chapter === 1) {
            state.unlock('sippe');
            state.unlock('nomaden');
          } else if (state.chapter === 2) {
            state.unlock('klimawandel');
          } else if (state.chapter === 4) {
            state.unlock('tauschhandel');
          } else if (state.chapter === 5) {
            state.unlock('kupfer');
          } else if (state.chapter === 6) {
            state.unlock('bronze');
          }
          state.setQuest(1);
        },
      });
    } else if (state.isReadyForQuiz()) {
      state.openDialog({
        speaker: 'Älteste Ota',
        nodes: meta.quiz,
        onDone: () => {
          state.setQuest(8);
          state.emit('chapterDone');
        },
      });
    } else if (state.isChapterComplete()) {
      if (state.chapter < 6) {
        const nextCh = state.chapter + 1;
        state.openDialog({
          speaker: 'Älteste Ota',
          nodes: [{ text: `Bist du bereit für ${CHAPTERS[nextCh].title}? Lass uns aufbrechen!` }],
          onDone: () => state.startChapter(nextCh),
        });
      } else {
        state.openDialog({
          speaker: 'Älteste Ota',
          nodes: [
            {
              text: 'Du hast alle sechs Epochen von der Altsteinzeit bis zur Eisenzeit gemeistert! Hier ist deine offizielle Epochen-Urkunde.',
            },
          ],
          onDone: () => state.emit('openCertificate'),
        });
      }
    } else {
      state.openDialog({ speaker: 'Älteste Ota', nodes: [{ text: meta.hints[q] ?? 'Schau auf deine aktuelle Aufgabe oben links!' }] });
    }
  }

  private useFire(): void {
    if (state.count('fleisch') > 0) {
      state.inventory.fleisch = state.count('fleisch') - 1;
      state.add('gebraten', 1);
      state.unlock('braten');
      state.bump('cooked');
      state.emit('toast', 'Das Fleisch ist schön knusprig gebraten!');
      return;
    }
    this.sleepAtFire();
  }

  private sleepAtFire(): void {
    this.sleeping = true;
    this.cameras.main.fadeOut(650, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      state.dayTime = 0.05;
      state.daysSurvived++;
      state.safety = Math.min(100, state.safety + 35);
      // Gegossene Felder reifen über Nacht garantiert heran
      state.plots.forEach((p) => {
        if (p.stage === 'watered') p.stage = 'ripe';
      });
      this.nodes.forEach((n) => {
        if (n.kind === 'plot' && n.plotId !== undefined) {
          this.refreshPlotVisual(n, state.plots[n.plotId]);
        }
      });
      this.time.delayedCall(450, () => {
        this.cameras.main.fadeIn(650, 0, 0, 0);
        this.sleeping = false;
        state.emit('toast', 'Ein neuer Tag bricht an! Gegossene Felder sind gereift.');
      });
    });
  }

  private emptyTrap(n: Node): void {
    if (!n.placed || Date.now() - n.placed.t < TRAP_MS) {
      state.emit('toast', 'Noch nichts gefangen. Komm gleich wieder.');
      return;
    }
    const amt = 1 * state.trapYieldMultiplier;
    state.add('fleisch', amt);
    state.add('fell', amt);
    state.unlock('falle');
    state.traps = state.traps.filter((t) => t !== n.placed);
    this.removeNode(n);
    state.emit('toast', `+${amt} Fleisch, +${amt} Fell${state.trapYieldMultiplier > 1 ? ' (🏹 Jäger-Bonus!)' : ''}`);
    state.bump('meat', amt);
  }

  public enterCave(): void {
    state.modal = true;
    state.hint = '';
    sfx.step();
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      state.modal = false;
      this.scene.sleep('World');
      this.scene.run('Cave');
    });
  }

  public enterLonghouse(): void {
    state.modal = true;
    state.hint = '';
    sfx.door();
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      state.modal = false;
      this.scene.sleep('World');
      this.scene.run('Longhouse');
    });
  }

  // ---------------------------------------------------------------- Handwerk (C)

  private onCraft(id: RecipeId): void {
    const recipe = RECIPES.find((r) => r.id === id);
    if (!recipe) return;
    if (recipe.requiresBuilding && !state.hasBuilding(recipe.requiresBuilding)) {
      const bName = BUILDINGS.find((b) => b.id === recipe.requiresBuilding)?.name ?? recipe.requiresBuilding;
      state.emit('toast', `Du musst zuerst „${bName}“ am Bauplatz im Dorf errichten!`);
      return;
    }
    if (!state.canAfford(recipe)) {
      state.emit('toast', 'Dafür fehlt dir noch Material.');
      return;
    }
    if (id !== 'fire' && id !== 'trap') {
      state.spend(recipe);
      state.add(id, 1);
      if (id === 'faustkeil') state.unlock('faustkeil');
      if (id === 'tontopf') state.unlock('keramik');
      if (id === 'hacke' || id === 'sichel') state.unlock('ackerbau');
      if (id === 'stoff') state.unlock('weben');
      if (id === 'spitzhacke') state.unlock('bergbau');
      if (id === 'kupfer') state.unlock('kupfer');
      if (id === 'kupferbeil') state.unlock('oetzi');
      if (id === 'bronze') state.unlock('bronze');
      if (id === 'bronzeschwert') state.unlock('schwert');
      if (id === 'eisen' || id === 'eisenwerkzeug') state.unlock('eisen');
      state.bump(id, 1);
      state.emit('toast', `Hergestellt: 1× ${ITEMS[id].name}!`);
      return;
    }

    const off: Record<Dir, [number, number]> = { down: [0, 18], up: [0, -14], left: [-18, 6], right: [18, 6] };
    const x = this.player.x + off[this.facing][0];
    const y = this.player.y + 8 + off[this.facing][1];
    if (this.inLake(x, y)) {
      state.emit('toast', 'Im Wasser kann man nichts bauen.');
      return;
    }
    if (id === 'fire') {
      if (state.fires.length >= 3) {
        state.emit('toast', 'Drei Lagerfeuer reichen vollkommen.');
        return;
      }
      const p = { x, y, t: Date.now() };
      state.spend(recipe);
      state.fires.push(p);
      this.spawnFire(p);
      state.unlock('feuer');
      state.bump('fire');
      state.emit('toast', 'Das Lagerfeuer brennt!');
    } else if (id === 'trap') {
      if (state.traps.length >= 4) {
        state.emit('toast', 'Du hast schon vier Fallen aufgestellt.');
        return;
      }
      const p = { x, y, t: Date.now() };
      state.spend(recipe);
      state.traps.push(p);
      this.spawnTrap(p);
      state.bump('trap');
      state.emit('toast', 'Falle aufgestellt. Komm gleich wieder!');
    }
  }

  private syncWorldLabels(): void {
    const canvas = this.game.canvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cam = this.cameras.main;
    const hideAll = state.modal;
    for (const lbl of this.domLabels) {
      if (hideAll) {
        lbl.el.style.display = 'none';
        continue;
      }
      const sx = ((lbl.x - cam.scrollX) / cam.width) * rect.width + rect.left;
      const sy = ((lbl.y - cam.scrollY) / cam.height) * rect.height + rect.top;
      if (sx < rect.left + 20 || sx > rect.right - 20 || sy < rect.top + 15 || sy > rect.bottom - 15) {
        lbl.el.style.display = 'none';
      } else {
        lbl.el.style.display = 'block';
        lbl.el.style.left = `${sx}px`;
        lbl.el.style.top = `${sy}px`;
      }
    }
  }

  private persist(): void {
    if (!this.player) return;
    state.playerX = this.player.x;
    state.playerY = this.player.y;
    state.persist();
  }
}
