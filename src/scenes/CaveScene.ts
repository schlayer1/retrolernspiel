import Phaser from 'phaser';
import { sfx } from '../audio/sound';
import { music } from '../audio/MusicManager';
import { state } from '../systems/GameState';

const CAVE_W = 32;
const CAVE_H = 22;
const TILE = 16;

interface DomLabel {
  x: number;
  y: number;
  el: HTMLElement;
  setText(t: string): DomLabel;
  setY(y: number): DomLabel;
}

interface CaveNode {
  kind: 'copper' | 'tin' | 'iron' | 'flint' | 'relic_malerei' | 'relic_venus' | 'relic_loewenmensch' | 'exit';
  x: number;
  y: number;
  hint: string;
  label?: DomLabel;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  readyAt?: number;
}

export class CaveScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
    E: Phaser.Input.Keyboard.Key;
    SPACE: Phaser.Input.Keyboard.Key;
  };
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private nodes: CaveNode[] = [];
  private domLabels: DomLabel[] = [];
  private labelLayer!: HTMLElement;
  private promptEl!: HTMLElement;
  private darkOverlay!: Phaser.GameObjects.RenderTexture;
  private lightCircle!: Phaser.GameObjects.Graphics;
  private playerLabel?: DomLabel;
  private exiting = false;

  constructor() {
    super('Cave');
  }

  create(): void {
    state.hint = '';
    this.exiting = false;
    this.nodes = [];
    this.domLabels = [];
    this.obstacles = this.physics.add.staticGroup();

    state.on('relicFound', this.onRelicFound, this);
    this.events.once('shutdown', () => {
      state.off('relicFound', this.onRelicFound, this);
    });

    // 1. Retina-DOM-Label-Layer initialisieren
    const wl = document.getElementById('world-labels');
    if (wl) wl.style.display = 'none';

    const existingLayer = document.getElementById('cave-labels');
    this.labelLayer = existingLayer ?? document.createElement('div');
    this.labelLayer.id = 'cave-labels';
    if (!existingLayer) document.body.appendChild(this.labelLayer);
    this.labelLayer.innerHTML = '';
    this.labelLayer.style.display = 'block';

    // 2. Höhlen-Boden, Felswände & See mit echten 16-Bit-Tiles rendern
    this.buildCaveMap();

    // 3. Interaktive Knoten (Erzadern, Relikte, Ausgang)
    this.spawnCaveNodes();

    // 4. Spieler platzieren (Start beim südlichen Eingang)
    const startX = 256;
    const startY = 270;
    const texKey = state.playerGender === 'female' ? 'player_female' : 'player';
    this.player = this.physics.add.sprite(startX, startY, texKey, 0);
    this.player.body!.setSize(8, 6).setOffset(4, 20);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, CAVE_W * TILE, CAVE_H * TILE);
    this.physics.add.collider(this.player, this.obstacles);

    this.playerLabel = this.addLabel(startX, startY - 22, state.playerName, '#fde047');

    // 5. Kamera einrichten
    this.cameras.main.setBounds(0, 0, CAVE_W * TILE, CAVE_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // 6. Fackellicht & Dunkelheits-Overlay
    this.darkOverlay = this.add
      .renderTexture(0, 0, CAVE_W * TILE, CAVE_H * TILE)
      .setOrigin(0)
      .setDepth(100);

    this.lightCircle = this.add.graphics({ x: 0, y: 0 }).setVisible(false);

    // 7. Steuerung
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,E,SPACE') as typeof this.wasd;

    state.emit('toast', 'Du betrittst die Höhle. Deine Fackel erhellt die Felswände!');
    music.playTrack(state.chapter >= 5 ? 'oracle' : 'mist', 1200);
    sfx.cave?.() ?? sfx.step();
  }

  update(): void {
    if (this.exiting) return;

    // Spieler-Bewegung
    const baseSpeed = 80 * state.moveSpeedMultiplier;
    let vx = 0;
    let vy = 0;

    const left = this.cursors.left?.isDown || this.wasd.A?.isDown;
    const right = this.cursors.right?.isDown || this.wasd.D?.isDown;
    const up = this.cursors.up?.isDown || this.wasd.W?.isDown;
    const down = this.cursors.down?.isDown || this.wasd.S?.isDown;

    if (left) vx -= baseSpeed;
    if (right) vx += baseSpeed;
    if (up) vy -= baseSpeed;
    if (down) vy += baseSpeed;

    if (state.touch && state.touch.vector.lengthSq() > 0.05) {
      vx = state.touch.vector.x * baseSpeed;
      vy = state.touch.vector.y * baseSpeed;
    }

    if (vx !== 0 && vy !== 0) {
      vx *= Math.SQRT1_2;
      vy *= Math.SQRT1_2;
    }

    this.player.setVelocity(vx, vy);

    // Animation & Label
    const isFemale = state.playerGender === 'female';
    const animPfx = isFemale ? 'female_' : '';
    if (vx < 0) this.player.anims.play(`${animPfx}walk_left`, true);
    else if (vx > 0) this.player.anims.play(`${animPfx}walk_right`, true);
    else if (vy < 0) this.player.anims.play(`${animPfx}walk_up`, true);
    else if (vy > 0) this.player.anims.play(`${animPfx}walk_down`, true);
    else this.player.anims.stop();

    if (this.playerLabel) {
      this.playerLabel.x = this.player.x;
      this.playerLabel.y = this.player.y - 20;
    }

    this.player.setDepth(this.player.y + 12);

    // Fackellicht-Overlay aktualisieren
    this.updateTorchLight();

    // Interaktions-Check & gestochen scharfe DOM-Labels
    this.checkInteractions();
    this.syncLabels();
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
        return this;
      },
      setY(ny: number) {
        lbl.y = ny;
        return this;
      },
    };
    this.domLabels.push(lbl);
    return lbl;
  }

  private onRelicFound(relicId: string): void {
    const targetNode = this.nodes.find((n) => n.kind === `relic_${relicId}`);
    if (targetNode) {
      this.removeNode(targetNode, relicId === 'malerei');
      state.hint = '';
    }
  }

  private removeNode(n: CaveNode, keepSprite = false): void {
    if (n.label) {
      n.label.el.remove();
      this.domLabels = this.domLabels.filter((l) => l !== n.label);
    }
    if (!keepSprite) {
      n.sprite.destroy();
    } else {
      (n.sprite as Phaser.GameObjects.Image).setAlpha(0.85);
    }
    this.nodes = this.nodes.filter((x) => x !== n);
  }

  private syncLabels(): void {
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
      if (sx < rect.left + 5 || sx > rect.right - 5 || sy < rect.top + 5 || sy > rect.bottom - 5) {
        lbl.el.style.display = 'none';
      } else {
        lbl.el.style.display = 'block';
        lbl.el.style.left = `${sx}px`;
        lbl.el.style.top = `${sy}px`;
      }
    }
  }

  private updateTorchLight(): void {
    this.darkOverlay.clear();
    this.darkOverlay.fill(0x06040a, 0.88);

    const px = this.player.x;
    const py = this.player.y;
    const radius = 76;

    this.lightCircle.clear();
    this.lightCircle.fillStyle(0xffffff, 1);
    this.lightCircle.fillCircle(px, py, radius);
    this.lightCircle.fillStyle(0xffffff, 0.5);
    this.lightCircle.fillCircle(px, py, radius + 20);
    this.lightCircle.fillStyle(0xffffff, 0.2);
    this.lightCircle.fillCircle(px, py, radius + 36);

    this.lightCircle.fillStyle(0xffffff, 0.9);
    this.lightCircle.fillCircle(256, 320, 40);

    this.darkOverlay.erase(this.lightCircle, 0, 0);
  }

  private buildCaveMap(): void {
    const rt = this.add
      .renderTexture(0, 0, CAVE_W * TILE, CAVE_H * TILE)
      .setOrigin(0)
      .setDepth(0);

    // 1. Höhlen-Boden mit echten Stein- und Schotterkacheln füllen
    const floorFrames = ['floor_dark', 'floor_dark', 'floor_smooth', 'floor_rocky', 'floor_pebble1', 'floor_pebble2'];
    for (let ty = 0; ty < CAVE_H; ty++) {
      for (let tx = 0; tx < CAVE_W; tx++) {
        const idx = (tx * 7 + ty * 13) % floorFrames.length;
        rt.drawFrame('cave_tiles', floorFrames[idx], tx * TILE, ty * TILE);
      }
    }

    // 2. Unterirdischer Felssee (Südwesten)
    for (let ty = 9; ty <= 14; ty++) {
      for (let tx = 3; tx <= 11; tx++) {
        let f = 'water';
        if (ty === 9) f = 'water_shore_n';
        else if (ty === 14) f = 'water_shore_s';
        else if (tx === 3) f = 'water_shore_w';
        else if (tx === 11) f = 'water_shore_e';
        rt.drawFrame('cave_tiles', f, tx * TILE, ty * TILE);
      }
    }

    // 3. Felswände
    for (let tx = 0; tx < CAVE_W; tx++) {
      const topF = tx === 0 ? 'wall_tl' : tx === CAVE_W - 1 ? 'wall_tr' : 'wall_top';
      const midF = tx === 0 ? 'wall_left' : tx === CAVE_W - 1 ? 'wall_right' : 'wall_face';
      const botF = tx === 0 ? 'wall_bl' : tx === CAVE_W - 1 ? 'wall_br' : 'wall_bottom';
      rt.drawFrame('cave_tiles', topF, tx * TILE, 0);
      rt.drawFrame('cave_tiles', midF, tx * TILE, 16);
      rt.drawFrame('cave_tiles', botF, tx * TILE, 32);
    }

    for (let ty = 3; ty < CAVE_H - 2; ty++) {
      rt.drawFrame('cave_tiles', 'wall_left', 0, ty * TILE);
      rt.drawFrame('cave_tiles', 'wall_right', (CAVE_W - 1) * TILE, ty * TILE);
    }

    const exitCols = [14, 15, 16, 17];
    for (let tx = 0; tx < CAVE_W; tx++) {
      if (exitCols.includes(tx)) continue;
      rt.drawFrame('cave_tiles', 'wall_face', tx * TILE, (CAVE_H - 2) * TILE);
      rt.drawFrame('cave_tiles', 'wall_bottom', tx * TILE, (CAVE_H - 1) * TILE);
    }

    rt.drawFrame('cave_tiles', 'arch_exit', 14 * TILE, (CAVE_H - 3) * TILE);
    rt.drawFrame('cave_tiles', 'stalagmite', 32, 48);
    rt.drawFrame('cave_tiles', 'stalagmite', (CAVE_W - 3) * TILE, 48);
    rt.drawFrame('cave_tiles', 'rock_pile', 12 * TILE, 10 * TILE);
    rt.drawFrame('cave_tiles', 'rock_pile', 20 * TILE, 8 * TILE);

    const addWallZone = (x: number, y: number, w: number, h: number) => {
      const z = this.add.zone(x, y, w, h).setOrigin(0);
      this.physics.add.existing(z, true);
      this.obstacles.add(z);
    };

    addWallZone(0, 0, CAVE_W * TILE, 44);
    addWallZone(0, 0, 16, CAVE_H * TILE);
    addWallZone((CAVE_W - 1) * TILE, 0, 16, CAVE_H * TILE);
    addWallZone(0, (CAVE_H - 2) * TILE, 14 * TILE, 32);
    addWallZone(18 * TILE, (CAVE_H - 2) * TILE, 14 * TILE, 32);
    addWallZone(4 * TILE, 10 * TILE, 7 * TILE, 4 * TILE);
  }

  private makeObstacle(x: number, y: number, tex: string, frame?: string | number, collidable = true): Phaser.Physics.Arcade.Sprite {
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

  private spawnCaveNodes(): void {
    // 1. Ausgang zur Oberwelt
    const exitNode: CaveNode = {
      kind: 'exit',
      x: 256,
      y: 316,
      hint: 'Hinaus ans Tageslicht treten',
      sprite: this.add.image(256, 316, 'cave_tiles', 'arch_exit').setVisible(false),
      label: this.addLabel(256, 328, 'Zum Dorf', '#86efac'),
    };
    this.nodes.push(exitNode);

    // 2. Erzadern (Feste 16-Bit-Kollisionsobjekte)
    const copperSpr = this.makeObstacle(380, 70, 'ores', undefined, true);
    (copperSpr.body as Phaser.Physics.Arcade.StaticBody).setSize(18, 14).setOffset(3, 8);
    copperSpr.refreshBody();
    this.nodes.push({
      kind: 'copper',
      x: 380,
      y: 70,
      hint: 'Kupfererz abbauen (Spitzhacke)',
      sprite: copperSpr,
      label: this.addLabel(380, 52, 'Kupferader', '#fb923c'),
    });

    const tinSpr = this.makeObstacle(420, 160, 'ores', undefined, true);
    (tinSpr.body as Phaser.Physics.Arcade.StaticBody).setSize(18, 14).setOffset(3, 8);
    tinSpr.refreshBody();
    this.nodes.push({
      kind: 'tin',
      x: 420,
      y: 160,
      hint: 'Zinnerz abbauen (Spitzhacke)',
      sprite: tinSpr,
      label: this.addLabel(420, 142, 'Zinnader', '#cbd5e1'),
    });

    const ironSpr = this.makeObstacle(350, 240, 'ores', undefined, true);
    (ironSpr.body as Phaser.Physics.Arcade.StaticBody).setSize(18, 14).setOffset(3, 8);
    ironSpr.refreshBody();
    this.nodes.push({
      kind: 'iron',
      x: 350,
      y: 240,
      hint: 'Eisenerz abbauen (Spitzhacke)',
      sprite: ironSpr,
      label: this.addLabel(350, 222, 'Eisenerz', '#94a3b8'),
    });

    const flintSpr = this.makeObstacle(190, 80, 'objects', 'bigrock', true);
    (flintSpr.body as Phaser.Physics.Arcade.StaticBody).setSize(24, 16).setOffset(4, 10);
    flintSpr.refreshBody();
    this.nodes.push({
      kind: 'flint',
      x: 190,
      y: 80,
      hint: 'Feuersteine aus der Wand lösen',
      sprite: flintSpr,
      label: this.addLabel(190, 60, 'Feuerstein', '#e2e8f0'),
    });

    // 3. Relikte in der Höhle (verschwinden nach erfolgreicher Bergung)
    if (!state.relicsFound.includes('malerei')) {
      const malereiSpr = this.add.image(270, 48, 'relic_malerei').setDepth(48);
      this.nodes.push({
        kind: 'relic_malerei',
        x: 270,
        y: 48,
        hint: 'Urzeitliche Wandmalerei erforschen',
        sprite: malereiSpr,
        label: this.addLabel(270, 28, 'Wandmalerei', '#f43f5e'),
      });
    } else {
      this.add.image(270, 48, 'relic_malerei').setDepth(48).setAlpha(0.85);
    }

    if (!state.relicsFound.includes('venus')) {
      const venusSpr = this.makeObstacle(65, 95, 'relic_venus', undefined, true);
      (venusSpr.body as Phaser.Physics.Arcade.StaticBody).setSize(16, 16).setOffset(2, 6);
      venusSpr.refreshBody();
      venusSpr.setDepth(95 + 8);
      this.nodes.push({
        kind: 'relic_venus',
        x: 65,
        y: 95,
        hint: 'Venus vom Hohle Fels untersuchen',
        sprite: venusSpr,
        label: this.addLabel(65, 75, 'Venus-Statue', '#fbbf24'),
      });
    }

    if (!state.relicsFound.includes('loewenmensch')) {
      const loewenSpr = this.makeObstacle(440, 65, 'relic_loewenmensch', undefined, true);
      (loewenSpr.body as Phaser.Physics.Arcade.StaticBody).setSize(16, 16).setOffset(2, 6);
      loewenSpr.refreshBody();
      loewenSpr.setDepth(65 + 8);
      this.nodes.push({
        kind: 'relic_loewenmensch',
        x: 440,
        y: 65,
        hint: 'Löwenmensch-Relikt untersuchen',
        sprite: loewenSpr,
        label: this.addLabel(440, 45, 'Der Löwenmensch', '#eab308'),
      });
    }

    // 4. Urzeitliche Knochenfunde und Mammutreste in der Höhle (solide Hindernisse)
    const skull = this.makeObstacle(130, 70, 'prop_mammoth_skull', undefined, true);
    (skull.body as Phaser.Physics.Arcade.StaticBody).setSize(20, 14).setOffset(4, 6);
    skull.refreshBody();
    skull.setDepth(70 + 8);

    const bones = this.makeObstacle(80, 220, 'prop_bone_pile', undefined, true);
    (bones.body as Phaser.Physics.Arcade.StaticBody).setSize(28, 14).setOffset(4, 6);
    bones.refreshBody();
    bones.setDepth(220 + 8);
  }

  private checkInteractions(): void {
    const spaceDown =
      Phaser.Input.Keyboard.JustDown(this.wasd.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.E) ||
      Boolean(state.touch?.consumeAction());

    const px = this.player.x;
    const py = this.player.y;

    let nearestNode: CaveNode | null = null;
    let nearestDist = 999;

    for (const n of this.nodes) {
      const dist = Phaser.Math.Distance.Between(px, py, n.x, n.y);
      if (dist < 32 && dist < nearestDist) {
        nearestDist = dist;
        nearestNode = n;
      }
    }

    if (nearestNode) {
      state.hint = `E: ${nearestNode.hint}`;
    } else {
      state.hint = '';
    }

    if (nearestNode) {
      if (nearestNode.kind === 'exit') {
        if (spaceDown || py > 314) {
          this.leaveCave();
          return;
        }
      } else if (spaceDown) {
        this.interactCaveNode(nearestNode);
        return;
      }
    }
  }

  private interactCaveNode(n: CaveNode): void {
    const now = Date.now();
    if (n.readyAt && now < n.readyAt) {
      state.emit('toast', 'Diese Ader ist erschöpft. Warte kurz.');
      return;
    }

    if (n.kind === 'copper') {
      if (state.count('spitzhacke') <= 0) {
        state.emit('toast', 'Du brauchst eine Spitzhacke (C) zum Erzabbau!');
        return;
      }
      const amt = state.playerRole === 'crafter' ? 3 : 2;
      state.add('kupfererz', amt);
      state.unlock('kupfer');
      state.bump('mined_kupfer', amt);
      n.readyAt = now + 15_000;
      state.emit('toast', `+${amt} Kupfererz in der Höhle abgebaut!`);
      sfx.craft();
    } else if (n.kind === 'tin') {
      if (state.count('spitzhacke') <= 0) {
        state.emit('toast', 'Du brauchst eine Spitzhacke (C) zum Erzabbau!');
        return;
      }
      const amt = state.playerRole === 'crafter' ? 2 : 1;
      state.add('zinn', amt);
      state.unlock('zinn');
      n.readyAt = now + 15_000;
      state.emit('toast', `+${amt} Zinnerz aus der Felsader geschlagen!`);
      sfx.craft();
    } else if (n.kind === 'iron') {
      if (state.count('spitzhacke') <= 0) {
        state.emit('toast', 'Du brauchst eine Spitzhacke (C) für das harte Eisenerz!');
        return;
      }
      const amt = state.playerRole === 'crafter' ? 3 : 2;
      state.add('eisenerz', amt);
      state.unlock('eisen');
      n.readyAt = now + 15_000;
      state.emit('toast', `+${amt} Eisenerz gewonnen!`);
      sfx.craft();
    } else if (n.kind === 'flint') {
      state.add('stein', 2);
      n.readyAt = now + 10_000;
      state.emit('toast', '+2 Feuersteine aus der Höhlenwand gelöst!');
      sfx.pickup();
    } else if (n.kind === 'relic_malerei') {
      state.emit('openRelicQuiz', 'malerei');
      state.hint = '';
      this.removeNode(n, true);
    } else if (n.kind === 'relic_venus') {
      state.emit('openRelicQuiz', 'venus');
      state.hint = '';
      this.removeNode(n, false);
    } else if (n.kind === 'relic_loewenmensch') {
      state.emit('openRelicQuiz', 'loewenmensch');
      state.hint = '';
      this.removeNode(n, false);
    }
  }

  private leaveCave(): void {
    if (this.exiting) return;
    this.exiting = true;
    sfx.step();
    if (this.labelLayer) this.labelLayer.style.display = 'none';
    const wl = document.getElementById('world-labels');
    if (wl) wl.style.display = 'block';
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('Cave');
      this.scene.wake('World');
      const worldScene = this.scene.get('World') as any;
      if (worldScene && worldScene.player) {
        worldScene.player.setPosition(370, 78);
        worldScene.cameras.main.fadeIn(350, 0, 0, 0);
      }
      state.hint = '';
      music.playChapterMusic(state.chapter, 1200);
      state.emit('toast', 'Du trittst wieder hinaus ans helle Tageslicht.');
    });
  }
}
