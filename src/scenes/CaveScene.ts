import Phaser from 'phaser';
import { sfx } from '../audio/sound';
import { state } from '../systems/GameState';

const CAVE_W = 32;
const CAVE_H = 22;
const TILE = 16;

interface CaveNode {
  kind: 'copper' | 'tin' | 'iron' | 'flint' | 'relic_malerei' | 'relic_venus' | 'relic_loewenmensch' | 'exit';
  x: number;
  y: number;
  label?: Phaser.GameObjects.Text;
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
  private darkOverlay!: Phaser.GameObjects.RenderTexture;
  private lightCircle!: Phaser.GameObjects.Graphics;
  private playerLabel!: Phaser.GameObjects.Text;
  private exiting = false;

  constructor() {
    super('Cave');
  }

  create(): void {
    this.exiting = false;
    this.nodes = [];
    this.obstacles = this.physics.add.staticGroup();

    // 1. Höhlen-Boden & Wände rendern
    this.buildCaveMap();

    // 2. Interaktive Knoten (Erzadern, Relikte, Ausgang)
    this.spawnCaveNodes();

    // 3. Spieler platzieren (Start beim südlichen Eingang)
    const startX = 256;
    const startY = 300;
    const texKey = state.playerGender === 'female' ? 'player_female' : 'player';
    this.player = this.physics.add.sprite(startX, startY, texKey, 0);
    this.player.body!.setSize(8, 6).setOffset(4, 20);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, CAVE_W * TILE, CAVE_H * TILE);
    this.physics.add.collider(this.player, this.obstacles);

    this.playerLabel = this.add
      .text(startX, startY - 22, state.playerName, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '11px',
        color: '#fde047',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(150);

    // 4. Kamera einrichten
    this.cameras.main.setBounds(0, 0, CAVE_W * TILE, CAVE_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // 5. Fackellicht & Dunkelheits-Overlay
    this.darkOverlay = this.add
      .renderTexture(0, 0, CAVE_W * TILE, CAVE_H * TILE)
      .setOrigin(0)
      .setDepth(100);

    this.lightCircle = this.add.graphics({ x: 0, y: 0 }).setVisible(false);

    // 6. Steuerung
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,E,SPACE') as typeof this.wasd;

    state.emit('toast', 'Du betrittst die Höhle. Deine Fackel erhellt die Felswände!');
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

    this.playerLabel.setPosition(this.player.x, this.player.y - 22);

    // Fackellicht-Overlay aktualisieren
    this.updateTorchLight();

    // Interaktions-Check
    this.checkInteractions();
  }

  private updateTorchLight(): void {
    this.darkOverlay.clear();
    // Dunkle Höhlenluft
    this.darkOverlay.fill(0x08060c, 0.9);

    // Fackellichtkreis ausstanzen
    const px = this.player.x;
    const py = this.player.y;
    const radius = 72;

    this.lightCircle.clear();
    // Mehrstufiger weicher Lichtkegel
    this.lightCircle.fillStyle(0xffffff, 1);
    this.lightCircle.fillCircle(px, py, radius);
    this.lightCircle.fillStyle(0xffffff, 0.5);
    this.lightCircle.fillCircle(px, py, radius + 18);
    this.lightCircle.fillStyle(0xffffff, 0.25);
    this.lightCircle.fillCircle(px, py, radius + 32);

    // Aus Höhlenausgang scheint auch Tageslicht
    this.lightCircle.fillStyle(0xffffff, 0.85);
    this.lightCircle.fillCircle(256, 320, 36);

    this.darkOverlay.erase(this.lightCircle, 0, 0);
  }

  private buildCaveMap(): void {
    // 1. Höhlen-Boden
    const rt = this.add
      .renderTexture(0, 0, CAVE_W * TILE, CAVE_H * TILE)
      .setOrigin(0)
      .setDepth(0);

    const g = this.add.graphics();
    // Dunkler Grundstein
    g.fillStyle(0x1a1520, 1).fillRect(0, 0, CAVE_W * TILE, CAVE_H * TILE);
    // Gehweg-Bereich im Fels
    g.fillStyle(0x2d2433, 1).fillRoundedRect(32, 32, (CAVE_W - 4) * TILE, (CAVE_H - 4) * TILE, 16);
    // Unterirdischer Höhlensee
    g.fillStyle(0x133852, 1).fillEllipse(110, 160, 90, 50);
    g.fillStyle(0x1d5378, 0.7).fillEllipse(110, 160, 65, 35);
    // Stalaktiten-Schattierungen
    g.fillStyle(0x110d17, 0.85);
    g.fillRect(0, 0, CAVE_W * TILE, 32);
    g.fillRect(0, 0, 32, CAVE_H * TILE);
    g.fillRect((CAVE_W - 2) * TILE, 0, 32, CAVE_H * TILE);

    rt.draw(g, 0, 0);
    g.destroy();

    // 2. Fels-Kollision an den Rändern
    const addWall = (x: number, y: number, w: number, h: number) => {
      const z = this.add.zone(x, y, w, h).setOrigin(0);
      this.physics.add.existing(z, true);
      this.obstacles.add(z);
    };

    addWall(0, 0, CAVE_W * TILE, 36); // Nordwand
    addWall(0, 0, 32, CAVE_H * TILE); // Westwand
    addWall((CAVE_W - 2) * TILE, 0, 32, CAVE_H * TILE); // Ostwand
    addWall(0, (CAVE_H - 2) * TILE, 220, 32); // Südwand links
    addWall(292, (CAVE_H - 2) * TILE, 220, 32); // Südwand rechts
    addWall(65, 135, 90, 50); // See-Hindernis
  }

  private spawnCaveNodes(): void {
    const addLabel = (x: number, y: number, text: string, color = '#fef08a') => {
      return this.add
        .text(x, y, text, {
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: '11px',
          color,
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(90);
    };

    // 1. Ausgang zur Oberwelt
    const exitNode: CaveNode = {
      kind: 'exit',
      x: 256,
      y: 316,
      sprite: this.add.image(256, 316, 'objects', 'bubble_excl').setVisible(false),
      label: addLabel(256, 332, '☀️ Ausgang zur Oberwelt (Leertaste)', '#86efac'),
    };
    this.nodes.push(exitNode);

    // 2. Erzadern
    // Kupferader
    const copperSpr = this.add.image(380, 70, 'ores').setDepth(60);
    this.nodes.push({
      kind: 'copper',
      x: 380,
      y: 70,
      sprite: copperSpr,
      label: addLabel(380, 52, '🟠 Glänzende Kupferader', '#fb923c'),
    });

    // Zinnader
    const tinSpr = this.add.image(420, 160, 'ores').setDepth(60);
    this.nodes.push({
      kind: 'tin',
      x: 420,
      y: 160,
      sprite: tinSpr,
      label: addLabel(420, 142, '⚪ Zinnader (silbrig glänzend)', '#cbd5e1'),
    });

    // Eisenerz
    const ironSpr = this.add.image(350, 240, 'ores').setDepth(60);
    this.nodes.push({
      kind: 'iron',
      x: 350,
      y: 240,
      sprite: ironSpr,
      label: addLabel(350, 222, '⛏️ Dunkles Eisenerz', '#94a3b8'),
    });

    // Feuersteinader
    const flintSpr = this.add.image(190, 80, 'objects', 'bigrock').setDepth(60);
    this.nodes.push({
      kind: 'flint',
      x: 190,
      y: 80,
      sprite: flintSpr,
      label: addLabel(190, 60, '🪨 Feuerstein-Knollen', '#e2e8f0'),
    });

    // 3. Relikte in der Höhle
    // Relikt 1: Wandmalerei der Mammuts (Nordwand)
    const malereiSpr = this.add.image(270, 50, 'objects', 'bubble_excl').setDepth(60);
    this.nodes.push({
      kind: 'relic_malerei',
      x: 270,
      y: 50,
      sprite: malereiSpr,
      label: addLabel(270, 32, '🦣 Urzeitliche Wandmalerei', '#f43f5e'),
    });

    // Relikt 2: Venus vom Hohle Fels (am Seeufer)
    const venusSpr = this.add.image(70, 100, 'objects', 'bubble_excl').setDepth(60);
    this.nodes.push({
      kind: 'relic_venus',
      x: 70,
      y: 100,
      sprite: venusSpr,
      label: addLabel(70, 82, '🗿 Felsnische: Venus vom Hohle Fels', '#fbbf24'),
    });

    // Relikt 3: Der Löwenmensch (im Felsspalt Nordosten)
    const loewenSpr = this.add.image(440, 65, 'objects', 'bubble_excl').setDepth(60);
    this.nodes.push({
      kind: 'relic_loewenmensch',
      x: 440,
      y: 65,
      sprite: loewenSpr,
      label: addLabel(440, 48, '🦁 Felsspalt: Der Löwenmensch', '#eab308'),
    });
  }

  private checkInteractions(): void {
    const spaceDown =
      Phaser.Input.Keyboard.JustDown(this.wasd.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.E) ||
      Boolean(state.touch?.consumeAction());

    const px = this.player.x;
    const py = this.player.y;

    for (const n of this.nodes) {
      const dist = Phaser.Math.Distance.Between(px, py, n.x, n.y);
      if (dist < 32) {
        if (n.kind === 'exit') {
          if (spaceDown || dist < 18) {
            this.leaveCave();
            return;
          }
        } else if (spaceDown) {
          this.interactCaveNode(n);
          return;
        }
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
    } else if (n.kind === 'relic_venus') {
      state.emit('openRelicQuiz', 'venus');
    } else if (n.kind === 'relic_loewenmensch') {
      state.emit('openRelicQuiz', 'loewenmensch');
    }
  }

  private leaveCave(): void {
    if (this.exiting) return;
    this.exiting = true;
    sfx.step();
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('Cave');
      this.scene.wake('World');
      const worldScene = this.scene.get('World') as any;
      if (worldScene && worldScene.player) {
        // Spieler vor den Höhleneingang in der Oberwelt stellen
        worldScene.player.setPosition(370, 78);
        worldScene.cameras.main.fadeIn(350, 0, 0, 0);
      }
      state.emit('toast', 'Du trittst wieder hinaus ans helle Tageslicht.');
    });
  }
}
