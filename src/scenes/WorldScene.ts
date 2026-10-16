import Phaser from 'phaser';
import { CHAPTERS } from '../data/chapter1';
import { BUILDINGS, BuildingDef, BuildingId, ITEMS, ItemId, RECIPES, RecipeId } from '../data/items';
import { CROP_MS, DAY_MS, TRAP_MS, state } from '../systems/GameState';
import { FarmPlotState } from '../systems/SaveManager';

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
  | 'iron_vein';

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

  constructor() {
    super('World');
  }

  create(): void {
    this.nodes = [];
    this.domLabels = [];
    this.sleeping = false;

    const existingLayer = document.getElementById('world-labels');
    this.labelLayer = existingLayer ?? document.createElement('div');
    this.labelLayer.id = 'world-labels';
    if (!existingLayer) document.body.appendChild(this.labelLayer);
    this.labelLayer.innerHTML = '';

    const saved = state.saves.load();
    if (saved) state.loadFrom(saved);

    this.buildGround();
    this.obstacles = this.physics.add.staticGroup();
    this.buildWater();
    this.scatterNature();
    this.placeResources();
    this.placeChapter2And3Nodes();
    this.placeOta();
    state.fires.forEach((f) => this.spawnFire(f));
    state.traps.forEach((t) => this.spawnTrap(t));

    const startX = state.playerX || (MAP_W * TILE) / 2;
    const startY = state.playerY || (MAP_H * TILE) / 2 + 20;
    this.player = this.physics.add.sprite(startX, startY, 'player', 0);
    this.player.body!.setSize(8, 6).setOffset(4, 20);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.physics.add.collider(this.player, this.obstacles);

    this.cameras.main.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,E,SPACE') as typeof this.wasd;

    this.nightOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1240, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(8000);

    if (!this.scene.isActive('UI')) this.scene.launch('UI');
    state.on('craft', this.onCraft, this);
    state.on('chapterChanged', this.onChapterChanged, this);
    this.events.once('shutdown', () => {
      state.off('craft', this.onCraft, this);
      state.off('chapterChanged', this.onChapterChanged, this);
    });
    window.addEventListener('beforeunload', () => this.persist());

    if (!saved) {
      this.time.delayedCall(600, () => state.emit('toast', 'Willkommen! Geh zu Ota (E zum Sprechen).'));
    }
  }

  private onChapterChanged(): void {
    this.persist();
    this.scene.restart();
  }

  // ---------------------------------------------------------------- Aufbau der Welt

  private buildGround(): void {
    const rt = this.add.renderTexture(0, 0, MAP_W * TILE, MAP_H * TILE).setOrigin(0).setDepth(0);
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) rt.drawFrame('overworld', 'grass', x * TILE, y * TILE);
    }
    const rng = new Phaser.Math.RandomDataGenerator(['blumen']);
    for (let i = 0; i < 55; i++) {
      rt.drawFrame('overworld', 'flowers', rng.between(0, MAP_W - 1) * TILE, rng.between(0, MAP_H - 1) * TILE);
    }
  }

  private buildWater(): void {
    const rt = this.add.renderTexture(LAKE.x * TILE, LAKE.y * TILE, LAKE.w * TILE, LAKE.h * TILE).setOrigin(0).setDepth(1);
    for (let ty = 0; ty < LAKE.h; ty++) {
      for (let tx = 0; tx < LAKE.w; tx++) rt.drawFrame('overworld', 'water', tx * TILE, ty * TILE);
    }
    const zone = this.add.zone(LAKE.x * TILE, LAKE.y * TILE, LAKE.w * TILE, LAKE.h * TILE).setOrigin(0);
    this.physics.add.existing(zone, true);
    this.obstacles.add(zone);
  }

  private inLake(x: number, y: number): boolean {
    return (
      x > (LAKE.x - 1) * TILE &&
      x < (LAKE.x + LAKE.w + 1) * TILE &&
      y > (LAKE.y - 1) * TILE &&
      y < (LAKE.y + LAKE.h + 1) * TILE
    );
  }

  private inVillageClearance(x: number, y: number): boolean {
    const cx = (MAP_W * TILE) / 2;
    const cy = (MAP_H * TILE) / 2;
    if (Phaser.Math.Distance.Between(x, y, cx, cy) < 165) return true;
    // Acker- und Gehegebereich im Osten/Südosten freihalten
    if (x > 460 && x < 650 && y > 180 && y < 410) return true;
    // Westliche Werkstätten (Webstuhl, Schmelzofen, Schmiede) freihalten
    if (x > 210 && x < 360 && y > 140 && y < 410) return true;
    // Nord-Stollen & Erzfeld freihalten
    if (x > 250 && x < 490 && y < 130) return true;
    // Südlicher Handelsplatz freihalten
    if (x > 330 && x < 470 && y > 430 && y < 530) return true;
    return false;
  }

  private scatterNature(): void {
    const rng = new Phaser.Math.RandomDataGenerator(['steinzeit']);
    for (let i = 0; i < 55; i++) {
      const x = rng.between(16, MAP_W * TILE - 16);
      const y = rng.between(24, MAP_H * TILE - 8);
      if (this.inVillageClearance(x, y) || this.inLake(x, y)) continue;
      const kind = rng.pick(['rocks', 'bush', 'bush']);
      this.makeObstacle(x, y, 'overworld', kind);
    }
  }

  private makeObstacle(x: number, y: number, tex: string, frame?: string, collidable = true): Phaser.Physics.Arcade.Sprite {
    const o = (
      collidable ? this.obstacles.create(x, y, tex, frame) : this.physics.add.staticSprite(x, y, tex, frame)
    ) as Phaser.Physics.Arcade.Sprite;
    o.setDepth(y + o.height / 2);
    const b = o.body as Phaser.Physics.Arcade.StaticBody;
    b.setSize(o.width * 0.7, o.height * 0.45);
    b.setOffset(o.width * 0.15, o.height * 0.55);
    o.refreshBody();
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

  /** Sammelstellen für alle Kapitel. */
  private placeResources(): void {
    const berries: Array<[number, number]> = [
      [270, 240],
      [480, 275],
      [215, 330],
      [605, 340],
      [290, 450],
      [475, 465],
      [180, 215],
    ];
    const stumps: Array<[number, number]> = [
      [375, 395],
      [210, 275],
      [635, 420],
      [340, 155],
      [130, 380],
      [555, 505],
    ];
    const rocks: Array<[number, number]> = [
      [245, 195],
      [560, 445],
      [160, 470],
      [655, 290],
      [485, 115],
      [320, 520],
    ];
    berries.forEach(([x, y]) => this.addNode('berry', 'objects', 'berrybush', x, y).sprite.setTint(0xff9a9a));
    stumps.forEach(([x, y]) => this.addNode('stump', 'objects', 'stump', x, y));
    rocks.forEach(([x, y]) => this.addNode('rock', 'objects', 'bigrock', x, y));
  }

  /** Zusätzliche Elemente für Kapitel 2 bis 6 (Wolf, Acker, Dorf-Bauplätze, Händler Enki, Bergbau-Stollen & Erzadern). */
  private placeChapter2And3Nodes(): void {
    // 1. Scheuer Wolf / gezähmter Hütehund
    if (state.chapter >= 2 || state.wolfTamed) {
      const wx = state.wolfTamed ? (MAP_W * TILE) / 2 + 24 : 295;
      const wy = state.wolfTamed ? (MAP_H * TILE) / 2 + 12 : 295;
      const wNode = this.addNode('wolf', 'wolf', undefined, wx, wy, false);
      wNode.sprite.setScale(1.3);
      wNode.label = this.addLabel(wx, wy - 14, state.wolfTamed ? 'Hund Lupo' : 'Scheuer Wolf', '#ffffff');
      this.wolfNode = wNode;
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

      const waterSpot = this.addNode('water_spot', 'objects', 'pot', 625, 212, false);
      waterSpot.sprite.setTint(0x7ec8ff);
      this.addLabel(625, 198, 'Wasserstelle', '#9ee0ff');

      // 4. 6 Acker-Parzellen (2x3 Raster) südlich vom See
      state.plots.forEach((p, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const px = 495 + col * 24;
        const py = 248 + row * 24;
        const n = this.addNode('plot', 'farm', 'soil_raw', px, py, false);
        n.plotId = p.id;
        n.sprite.setDepth(2);
        n.cropSprite = this.add.image(px, py - 4, 'farm', 'wheat_seed').setDepth(py + 6).setVisible(false);
        this.refreshPlotVisual(n, p);
      });
      this.addLabel(519, 232, 'Ackerfeld');
    }

    // 5. Kapitel 3–6: Dorf-Bauplätze, fertige Gebäude und Wildziegen
    if (state.chapter >= 3 || state.buildings.length > 0) {
      BUILDINGS.forEach((b) => {
        const built = state.hasBuilding(b.id);
        if (!built && state.chapter < b.minChapter) return;
        const n = this.addNode('build_site', 'farm', 'sign_build', b.x, b.y, true);
        n.buildingDef = b;
        n.label = this.addLabel(b.x, b.y - 20, built ? b.name : `Bauplatz: ${b.name}`);
        if (built) this.applyBuiltVisual(n, b);
      });

      // Wildziege auf der Weide im Südosten
      const wildGoat = this.addNode('wild_goat', 'goat', undefined, 635, 375, false);
      wildGoat.sprite.setScale(0.55).play('goat-idle');
      wildGoat.label = this.addLabel(635, 355, 'Wildziege');

      if (state.goatsTamed > 0) {
        this.spawnTamedGoat();
      }
    }

    // 6. Kapitel 4+: Fernhändler Enki mit Marktstand im Süden des Dorfes
    if (state.chapter >= 4) {
      const mx = 400;
      const my = 478;
      this.add.image(mx, my - 18, 'overworld', 'market_stall').setScale(0.65).setDepth(my - 6);
      const mNode = this.addNode('merchant', 'npc', undefined, mx, my, true);
      mNode.sprite.setTint(0xffc978).setDepth(my + 14);
      this.addLabel(mx, my - 42, 'Fernhändler Enki (Tauschhandel)', '#ffd86b');
    }

    // 7. Kapitel 5+: Bergbau-Stollen im hohen Norden + Kupfererz-Adern (und Eisenerz ab Kap. 6)
    if (state.chapter >= 5) {
      const cave = this.addNode('mine_entrance', 'overworld', 'cave_entrance', 370, 56, true);
      cave.sprite.setDepth(64);
      this.addLabel(370, 22, 'Bergbau-Stollen (Nordwand)', '#ffcc88');

      const copperCoords: Array<[number, number]> = [
        [312, 78],
        [345, 92],
        [415, 80],
      ];
      copperCoords.forEach(([x, y]) => {
        const cn = this.addNode('copper_vein', 'copper_vein', undefined, x, y, true);
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
        ir.label = this.addLabel(x, y - 15, 'Eisenerz', '#b8d0eb');
      });
    }
  }

  private applyBuiltVisual(n: Node, b: BuildingDef): void {
    n.label?.setText(b.name).setY(b.y - (b.id === 'langhaus' ? 42 : 24));
    if (b.id === 'toepferofen') {
      n.sprite.setTexture('kiln');
      n.sprite.setDepth(b.y + 12);
      this.spawnHelper(b.x + 24, b.y + 4, b.helperName, 0xe8b598);
    } else if (b.id === 'speicher') {
      n.sprite.setTexture('overworld', 'speicher_hut');
      n.sprite.setDepth(b.y + 18);
      this.spawnHelper(b.x + 26, b.y + 10, b.helperName, 0xf2d399);
    } else if (b.id === 'langhaus') {
      n.sprite.setTexture('overworld', 'langhaus');
      n.sprite.setDepth(b.y + 30);
      const body = n.sprite.body as Phaser.Physics.Arcade.StaticBody;
      body.setSize(68, 36).setOffset(6, 40);
      n.sprite.refreshBody();
    } else if (b.id === 'gehege') {
      n.sprite.setTexture('overworld', 'fence_h');
      // Holzzaun-Rechteck um das Gehege zeichnen
      for (let dx = -24; dx <= 24; dx += 24) {
        this.add.image(b.x + dx, b.y - 18, 'overworld', 'fence_h').setDepth(b.y - 10);
        this.add.image(b.x + dx, b.y + 22, 'overworld', 'fence_h').setDepth(b.y + 24);
      }
      this.spawnHelper(b.x - 36, b.y + 4, b.helperName, 0xc2d9a3);
    } else if (b.id === 'webstuhl') {
      n.sprite.setTexture('loom');
      n.sprite.setDepth(b.y + 12);
      this.spawnHelper(b.x - 22, b.y + 6, b.helperName, 0xf5b8d0);
    } else if (b.id === 'schmelzofen') {
      n.sprite.setTexture('smelter');
      n.sprite.setDepth(b.y + 14);
      this.spawnHelper(b.x - 24, b.y + 6, b.helperName, 0xffaa77);
    } else if (b.id === 'schmiede') {
      n.sprite.setTexture('forge');
      n.sprite.setDepth(b.y + 14);
      this.spawnHelper(b.x - 26, b.y + 6, b.helperName, 0xa8c4e0);
    }
  }

  private spawnHelper(x: number, y: number, name: string, tint: number): void {
    const h = this.add.sprite(x, y, 'npc', 0).setTint(tint).setDepth(y + 12);
    void h;
    this.addLabel(x, y - 18, name.split(' ')[0], '#d8f0ff');
  }

  private spawnTamedGoat(): void {
    if (this.nodes.some((n) => n.kind === 'tamed_goat')) return;
    const gx = 530;
    const gy = 354;
    const g = this.addNode('tamed_goat', 'goat', undefined, gx, gy, false);
    g.sprite.setScale(0.55).play('goat-idle').setDepth(gy + 10);
    g.label = this.addLabel(gx, gy + 18, 'Zahme Ziege', '#bfffbf');
  }

  private refreshPlotVisual(n: Node, p: FarmPlotState): void {
    if (!n.cropSprite) return;
    if (p.stage === 'raw') {
      n.sprite.setTexture('farm', 'soil_raw').setAlpha(0.75);
      n.cropSprite.setVisible(false);
    } else if (p.stage === 'tilled') {
      n.sprite.setTexture('farm', 'soil_dry').setAlpha(1);
      n.cropSprite.setVisible(false);
    } else if (p.stage === 'seeded') {
      n.sprite.setTexture('farm', 'soil_dry').setAlpha(1);
      n.cropSprite.setTexture('farm', 'wheat_seed').setPosition(n.sprite.x, n.sprite.y).setVisible(true);
    } else if (p.stage === 'watered') {
      n.sprite.setTexture('farm', 'soil_wet').setAlpha(1);
      n.cropSprite.setTexture('farm', 'wheat_sprout').setPosition(n.sprite.x, n.sprite.y - 2).setVisible(true);
    } else if (p.stage === 'ripe') {
      n.sprite.setTexture('farm', 'soil_dry').setAlpha(1);
      n.cropSprite.setTexture('farm', 'wheat_ripe').setPosition(n.sprite.x, n.sprite.y - 8).setVisible(true);
    }
  }

  private placeOta(): void {
    const x = (MAP_W * TILE) / 2 + 48;
    const y = (MAP_H * TILE) / 2 - 10;
    const sprite = this.physics.add.staticSprite(x, y, 'npc', 0);
    sprite.setTint(0xd9d2c0).setDepth(y + 14);
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
    (node.sprite.body as Phaser.Physics.Arcade.StaticBody).setSize(10, 6).setOffset(3, 10);
    node.sprite.refreshBody();
    node.glow = this.add.circle(p.x, p.y, 52, 0xffa040, 0).setDepth(8001).setBlendMode(Phaser.BlendModes.ADD);
  }

  private spawnTrap(p: { x: number; y: number; t: number }): void {
    const node = this.addNode('trap', 'trap', undefined, p.x, p.y);
    node.placed = p;
    node.sprite.setDepth(p.y);
    node.bubble = this.add.image(p.x, p.y - 16, 'objects', 'bubble_excl').setDepth(5000).setVisible(false);
  }

  // ---------------------------------------------------------------- Spielschleife

  update(_t: number, delta: number): void {
    this.updateTime(delta);
    this.syncWorldLabels();

    if (state.modal || this.sleeping) {
      this.player.setVelocity(0, 0);
      this.player.anims.play(`idle-${this.facing}`, true);
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
    this.player.setVelocity(v.x * SPEED, v.y * SPEED);

    if (v.length() > 0.01) {
      this.facing = Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? 'right' : 'left') : v.y > 0 ? 'down' : 'up';
      this.player.anims.play(`walk-${this.facing}`, true);
    } else {
      this.player.anims.play(`idle-${this.facing}`, true);
    }
    this.player.setDepth(this.player.y + 12);

    this.updateNodes();
    const target = this.nearest();
    state.hint = target ? this.hintFor(target) : '';
    this.updateCompass();

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
      state.dayTime = (state.dayTime + delta / DAY_MS) % 1;
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
      if (
        n.kind === 'berry' ||
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
        n.bubble.setVisible(ready).setY(n.placed.y - 16 + Math.sin(this.time.now / 200) * 2);
      }
      if (n.kind === 'plot' && n.plotId !== undefined) {
        const p = state.plots[n.plotId];
        if (p && p.stage === 'watered' && now - p.wateredAt >= CROP_MS) {
          p.stage = 'ripe';
          this.refreshPlotVisual(n, p);
          state.emit('toast', 'Dein Getreide auf dem Acker ist reif zur Ernte!');
        }
      }
    }
    // Gezähmter Hund folgt dem Spieler in gemütlichem Abstand
    if (state.wolfTamed && this.wolfNode) {
      const ws = this.wolfNode.sprite;
      const d = Phaser.Math.Distance.Between(ws.x, ws.y, this.player.x, this.player.y);
      if (d > 34) {
        const angle = Phaser.Math.Angle.Between(ws.x, ws.y, this.player.x, this.player.y);
        ws.x += Math.cos(angle) * 1.1;
        ws.y += Math.sin(angle) * 1.1;
        ws.setFlipX(Math.cos(angle) < 0);
        ws.setDepth(ws.y + 8);
        this.wolfNode.label?.setPosition(ws.x, ws.y - 14);
      }
    }
  }

  // ---------------------------------------------------------------- Interaktion

  private nearest(): Node | null {
    const fx = this.player.x;
    const fy = this.player.y + 8;
    let best: Node | null = null;
    let bestD = REACH;
    for (const n of this.nodes) {
      const extraReach = n.kind === 'mine_entrance' ? 14 : 0;
      const d = Phaser.Math.Distance.Between(fx, fy, n.sprite.x, n.sprite.y + (n.kind === 'ota' ? 8 : 4)) - extraReach;
      if (d < bestD) {
        best = n;
        bestD = d;
      }
    }
    return best;
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
          return `E: ${b.name} (${b.helperName})`;
        }
        const costStr = Object.entries(b.cost)
          .map(([id, cnt]) => `${cnt}× ${ITEMS[id as ItemId].name}`)
          .join(', ');
        return `E: ${b.name} bauen (${costStr})`;
      }
      case 'wild_goat':
        if (!state.hasBuilding('gehege')) return 'Wildziege (baue zuerst das Tiergehege!)';
        return state.count('getreide') > 0 ? 'E: Wildziege mit 1× Getreide ins Gehege locken' : 'Wildziege (locke sie mit 1× Getreide an)';
      case 'tamed_goat':
        return depleted ? 'Die Ziege ruht sich gerade aus.' : 'E: Ziege melken & Wolle scheren';
      case 'merchant':
        return 'E: Mit Fernhändler Enki Waren tauschen (ohne Münzen!)';
      case 'mine_entrance':
        return 'E: Bergbau-Stollen in der Nordwand inspizieren';
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
        return n.placed && Date.now() - n.placed.t >= TRAP_MS ? 'E: Falle leeren' : 'Die Falle ist noch leer ...';
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
          const amt = Phaser.Math.Between(1, 3);
          state.add('beere', amt);
          state.unlock('sammeln');
          state.bump('beere', amt);
          state.emit('toast', `+${amt} Beeren`);
        } else if (n.kind === 'stump') {
          state.add('stock', 2);
          state.bump('stock', 2);
          state.emit('toast', '+2 Stöcke');
        } else if (n.kind === 'rock') {
          const amt = Phaser.Math.Between(1, 2);
          state.add('stein', amt);
          state.bump('stein', amt);
          state.emit('toast', `+${amt} Steine`);
        } else if (n.kind === 'wildgrain') {
          state.add('samen', 2);
          state.unlock('wildkorn');
          state.bump('samen', 2);
          state.emit('toast', '+2 Wildkorn-Samen');
        } else if (n.kind === 'clay') {
          state.add('lehm', 2);
          state.bump('lehm', 2);
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
        this.interactWildGoat();
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
        state.unlock('bergbau');
        state.openDialog({
          speaker: 'Bergbau-Stollen',
          nodes: [
            {
              text: 'Tiefe Schürfspuren führen in die Nordwand. Mit einer Spitzhacke (C) kannst du an den glitzernden Felsen vor dem Stollen Kupfer- und Eisenerz abbauen!',
            },
          ],
        });
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
    n.label?.setText('Hund Lupo');
    state.unlock('wolf');
    state.checkQuest();
    state.emit('toast', 'Du hast den Wolf gezähmt! Hund Lupo begleitet dich jetzt.');
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
      state.add('getreide', 2);
      state.add('samen', 2);
      state.bump('harvested_wheat', 1);
      state.emit('toast', 'Ernte eingebracht: +2 Getreide, +2 Samen!');
    }
  }

  private interactBuilding(n: Node): void {
    const b = n.buildingDef!;
    if (state.hasBuilding(b.id)) {
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
    if (!state.canAffordBuilding(b)) {
      const missing = Object.entries(b.cost)
        .map(([id, cnt]) => `${cnt}× ${ITEMS[id as ItemId].name} (du hast ${state.count(id as ItemId)})`)
        .join(', ');
      state.emit('toast', `Für ${b.name} benötigt: ${missing}`);
      return;
    }
    state.spendCost(b.cost);
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

  private interactWildGoat(): void {
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
    state.add('fleisch', 1);
    state.add('fell', 1);
    state.unlock('falle');
    state.traps = state.traps.filter((t) => t !== n.placed);
    n.bubble?.destroy();
    n.sprite.destroy();
    this.nodes = this.nodes.filter((x) => x !== n);
    state.emit('toast', '+1 Fleisch, +1 Fell');
    state.bump('meat');
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
