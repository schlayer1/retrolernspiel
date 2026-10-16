import Phaser from 'phaser';
import { sfx } from '../audio/sound';
import { state } from '../systems/GameState';
import { FarmPlotState } from '../systems/SaveManager';

const HOUSE_W = 26;
const HOUSE_H = 18;
const TILE = 16;

interface HouseNode {
  kind: 'bed' | 'fire' | 'chest' | 'elder' | 'exit';
  x: number;
  y: number;
  label?: Phaser.GameObjects.Text;
  sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
}

export class LonghouseScene extends Phaser.Scene {
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
  private nodes: HouseNode[] = [];
  private playerLabel!: Phaser.GameObjects.Text;
  private exiting = false;
  private sleeping = false;

  constructor() {
    super('Longhouse');
  }

  create(): void {
    this.exiting = false;
    this.sleeping = false;
    this.nodes = [];
    this.obstacles = this.physics.add.staticGroup();

    // 1. Raum rendern (Holzboden, Blockhaus-Wände)
    this.buildHouseMap();

    // 2. Interaktive Objekte
    this.spawnHouseNodes();

    // 3. Spieler platzieren (vor der Eingangstür im Süden)
    const startX = 208;
    const startY = 245;
    const texKey = state.playerGender === 'female' ? 'player_female' : 'player';
    this.player = this.physics.add.sprite(startX, startY, texKey, 0);
    this.player.body!.setSize(8, 6).setOffset(4, 20);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, HOUSE_W * TILE, HOUSE_H * TILE);
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

    // 4. Kamera
    this.cameras.main.setBounds(0, 0, HOUSE_W * TILE, HOUSE_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // 5. Steuerung
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,E,SPACE') as typeof this.wasd;

    state.emit('toast', 'Du betrittst das geschützte Langhaus. Angenehme Wärme empfängt dich!');
    sfx.step();
  }

  update(): void {
    if (this.exiting || this.sleeping) return;

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

    const isFemale = state.playerGender === 'female';
    const animPfx = isFemale ? 'female_' : '';
    if (vx < 0) this.player.anims.play(`${animPfx}walk_left`, true);
    else if (vx > 0) this.player.anims.play(`${animPfx}walk_right`, true);
    else if (vy < 0) this.player.anims.play(`${animPfx}walk_up`, true);
    else if (vy > 0) this.player.anims.play(`${animPfx}walk_down`, true);
    else this.player.anims.stop();

    this.playerLabel.setPosition(this.player.x, this.player.y - 22);

    this.checkInteractions();
  }

  private buildHouseMap(): void {
    const rt = this.add
      .renderTexture(0, 0, HOUSE_W * TILE, HOUSE_H * TILE)
      .setOrigin(0)
      .setDepth(0);

    const g = this.add.graphics();
    // Dunkler Außenbereich
    g.fillStyle(0x140e0a, 1).fillRect(0, 0, HOUSE_W * TILE, HOUSE_H * TILE);

    // Warmer Holzboden (Bohlen)
    g.fillStyle(0x6e492b, 1).fillRect(32, 32, (HOUSE_W - 4) * TILE, (HOUSE_H - 4) * TILE);
    // Holzdielen-Muster
    g.fillStyle(0x5a391e, 0.4);
    for (let y = 32; y < (HOUSE_H - 2) * TILE; y += 16) {
      g.fillRect(32, y, (HOUSE_W - 4) * TILE, 1);
    }

    // Wandbalken (Umrandung)
    g.fillStyle(0x3e2413, 1);
    g.fillRect(0, 0, HOUSE_W * TILE, 36); // Nordwand
    g.fillRect(0, 0, 32, HOUSE_H * TILE); // Westwand
    g.fillRect((HOUSE_W - 2) * TILE, 0, 32, HOUSE_H * TILE); // Ostwand
    g.fillRect(0, (HOUSE_H - 2) * TILE, 176, 32); // Südwand links
    g.fillRect(240, (HOUSE_H - 2) * TILE, 176, 32); // Südwand rechts

    // Schlaf-Felle im Nordwesten
    g.fillStyle(0xd97706, 0.6).fillRoundedRect(44, 44, 90, 50, 8);
    g.fillStyle(0xfde68a, 0.4).fillRoundedRect(50, 50, 78, 38, 6);

    // Kisten-Bereich im Nordosten
    g.fillStyle(0x451a03, 0.5).fillRect(300, 44, 70, 35);

    rt.draw(g, 0, 0);
    g.destroy();

    // Feste Kollisionszonen
    const addWall = (x: number, y: number, w: number, h: number) => {
      const z = this.add.zone(x, y, w, h).setOrigin(0);
      this.physics.add.existing(z, true);
      this.obstacles.add(z);
    };

    addWall(0, 0, HOUSE_W * TILE, 36);
    addWall(0, 0, 32, HOUSE_H * TILE);
    addWall((HOUSE_W - 2) * TILE, 0, 32, HOUSE_H * TILE);
    addWall(0, (HOUSE_H - 2) * TILE, 176, 32);
    addWall(240, (HOUSE_H - 2) * TILE, 176, 32);
  }

  private spawnHouseNodes(): void {
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

    // 1. Schlaffelle (Volle Erholung)
    const bedSpr = this.add.image(88, 65, 'objects', 'bubble_excl').setDepth(60);
    this.nodes.push({
      kind: 'bed',
      x: 88,
      y: 65,
      sprite: bedSpr,
      label: addLabel(88, 48, '🛏️ Schlaflager (Felle: 100% Schutz & Wärme)', '#fde047'),
    });

    // 2. Sippen-Feuerstelle in der Mitte
    const fireSpr = this.add.image(208, 140, 'objects', 'fire0').setDepth(60);
    this.nodes.push({
      kind: 'fire',
      x: 208,
      y: 140,
      sprite: fireSpr,
      label: addLabel(208, 120, '🔥 Sippenfeuer (Fleisch braten)', '#fb923c'),
    });

    // 3. Gemeinschaftstruhe im Nordosten
    const chestSpr = this.add.image(330, 60, 'objects', 'pot').setDepth(60);
    this.nodes.push({
      kind: 'chest',
      x: 330,
      y: 60,
      sprite: chestSpr,
      label: addLabel(330, 42, '📦 Vorrats-Truhe der Sippe', '#a3e635'),
    });

    // 4. Sippenälteste am Feuer
    const elderSpr = this.add.image(245, 140, 'npc', 0).setDepth(60);
    this.nodes.push({
      kind: 'elder',
      x: 245,
      y: 140,
      sprite: elderSpr,
      label: addLabel(245, 118, '👵 Sippenmutter Alva', '#86efac'),
    });

    // 5. Ausgangstür
    const exitSpr = this.add.image(208, 275, 'objects', 'bubble_excl').setVisible(false);
    this.nodes.push({
      kind: 'exit',
      x: 208,
      y: 275,
      sprite: exitSpr,
      label: addLabel(208, 268, '🚪 Ausgang zum Dorf (Leertaste)', '#67e8f9'),
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
          if (spaceDown || dist < 16) {
            this.leaveHouse();
            return;
          }
        } else if (spaceDown) {
          this.interactHouseNode(n);
          return;
        }
      }
    }
  }

  private interactHouseNode(n: HouseNode): void {
    if (n.kind === 'bed') {
      this.sleepInBed();
    } else if (n.kind === 'fire') {
      if (state.count('fleisch') > 0) {
        state.inventory.fleisch = state.count('fleisch') - 1;
        state.add('gebraten', 1);
        state.unlock('feuer');
        state.bump('cooked');
        state.emit('toast', 'Frisches Fleisch auf den heißen Steinen gebraten!');
        sfx.craft();
      } else {
        state.emit('toast', 'Das Sippenfeuer wärmt das ganze Langhaus.');
      }
    } else if (n.kind === 'chest') {
      state.openDialog({
        speaker: 'Vorrats-Truhe',
        nodes: [
          {
            text: 'Hier bewahrt die Sippe geschützt vor Wind und Raubtieren Getreide, Felle und Vorräte auf.',
          },
          {
            text: `Aktuell im Dorf gesichert: ${state.count('getreide')}× Getreide, ${state.count('fell')}× Tierfelle, ${state.count('stock')}× Hölzer.`,
          },
        ],
      });
    } else if (n.kind === 'elder') {
      state.openDialog({
        speaker: 'Sippenmutter Alva',
        nodes: [
          {
            text: `Willkommen im Langhaus, ${state.playerName}! Dieses feste Dach schützt uns vor Schnee und Stürmen.`,
          },
          {
            text: 'Seit wir sesshaft geworden sind und Getreide anbauen, müssen wir nicht mehr jede Nacht im Freien zittern. Ruh dich auf den weichen Fellen aus!',
          },
        ],
      });
    }
  }

  private sleepInBed(): void {
    if (this.sleeping) return;
    this.sleeping = true;
    sfx.eat();
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      state.dayTime = 0.05;
      state.daysSurvived++;
      // 100% Wärme und Sicherheit im Langhaus!
      state.safety = 100;
      state.food = Math.min(100, state.food + 15);

      // Gegossene Beete reifen heran
      state.plots.forEach((p: FarmPlotState) => {
        if (p.stage === 'watered') p.stage = 'ripe';
      });

      this.time.delayedCall(500, () => {
        this.cameras.main.fadeIn(700, 0, 0, 0);
        this.sleeping = false;
        state.emit('toast', '✨ Du hast geborgen im Langhaus geschlafen! Volle Sicherheit (100%) regeneriert.');
        sfx.quest();
      });
    });
  }

  private leaveHouse(): void {
    if (this.exiting) return;
    this.exiting = true;
    sfx.step();
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('Longhouse');
      this.scene.wake('World');
      const worldScene = this.scene.get('World') as any;
      if (worldScene && worldScene.player) {
        // Vor die Langhaustür in der Oberwelt stellen
        worldScene.player.setPosition(240, 205);
        worldScene.cameras.main.fadeIn(350, 0, 0, 0);
      }
      state.emit('toast', 'Du trittst aus dem Langhaus zurück ins Dorf.');
    });
  }
}
