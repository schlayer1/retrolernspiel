import Phaser from 'phaser';
import { sfx } from '../audio/sound';
import { state } from '../systems/GameState';
import { FarmPlotState } from '../systems/SaveManager';

const HOUSE_W = 26;
const HOUSE_H = 18;
const TILE = 16;

interface DomLabel {
  x: number;
  y: number;
  el: HTMLElement;
  setText(t: string): DomLabel;
  setY(y: number): DomLabel;
}

interface HouseNode {
  kind: 'bed' | 'fire' | 'chest' | 'elder' | 'exit';
  x: number;
  y: number;
  hint: string;
  label?: DomLabel;
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
  private domLabels: DomLabel[] = [];
  private labelLayer!: HTMLElement;
  private playerLabel?: DomLabel;
  private promptEl!: HTMLElement;
  private exiting = false;
  private sleeping = false;

  constructor() {
    super('Longhouse');
  }

  create(): void {
    state.hint = '';
    this.exiting = false;
    this.sleeping = false;
    this.nodes = [];
    this.domLabels = [];
    this.obstacles = this.physics.add.staticGroup();

    // 1. Retina-DOM-Label-Layer initialisieren
    const wl = document.getElementById('world-labels');
    if (wl) wl.style.display = 'none';

    const existingLayer = document.getElementById('longhouse-labels');
    this.labelLayer = existingLayer ?? document.createElement('div');
    this.labelLayer.id = 'longhouse-labels';
    if (!existingLayer) document.body.appendChild(this.labelLayer);
    this.labelLayer.innerHTML = '';
    this.labelLayer.style.display = 'block';

    // 2. Innenraum mit Holzkacheln, Stein-Herd und Möbeln rendern
    this.buildHouseMap();

    // 3. Interaktive Knoten (Schlaffelle, Sippenfeuer, Truhe, Sippenmutter Alva, Ausgang)
    this.spawnHouseNodes();

    // 4. Spieler platzieren (Start beim Eingang)
    const startX = (HOUSE_W * TILE) / 2;
    const startY = (HOUSE_H - 2) * TILE - 8;
    const texKey = state.playerGender === 'female' ? 'player_female' : 'player';
    this.player = this.physics.add.sprite(startX, startY, texKey, 0);
    this.player.body!.setSize(8, 6).setOffset(4, 20);
    this.player.setCollideWorldBounds(true);
    this.physics.world.setBounds(0, 0, HOUSE_W * TILE, HOUSE_H * TILE);
    this.physics.add.collider(this.player, this.obstacles);

    this.playerLabel = this.addLabel(startX, startY - 22, state.playerName, '#fde047');

    // 5. Kamera einrichten
    this.cameras.main.setBounds(0, 0, HOUSE_W * TILE, HOUSE_H * TILE);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setRoundPixels(true);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    // 6. Steuerung
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys('W,A,S,D,E,SPACE') as typeof this.wasd;

    state.emit('toast', 'Du betrittst das warme Langhaus der Sippe.');
    sfx.door?.() ?? sfx.step();
  }

  update(): void {
    if (this.exiting || this.sleeping) return;

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

    // Interaktions-Check & gestochen scharfe Label-Synchronisation
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

  private buildHouseMap(): void {
    const rt = this.add
      .renderTexture(0, 0, HOUSE_W * TILE, HOUSE_H * TILE)
      .setOrigin(0)
      .setDepth(0);

    // 1. Warmer, glatter Dielenboden aus echten Holzkacheln (py=64)
    const woodPlanks = ['wood_floor_1', 'wood_floor_2', 'wood_floor_3', 'wood_floor_1'];
    for (let ty = 0; ty < HOUSE_H; ty++) {
      for (let tx = 0; tx < HOUSE_W; tx++) {
        const idx = (tx * 3 + ty * 7) % woodPlanks.length;
        rt.drawFrame('inner_tiles', woodPlanks[idx], tx * TILE, ty * TILE);
      }
    }

    // 2. Feuerfester Steinboden rund um den Herd
    for (let ty = 6; ty <= 10; ty++) {
      for (let tx = 9; tx <= 13; tx++) {
        rt.drawFrame('inner_tiles', 'stone_floor', tx * TILE, ty * TILE);
      }
    }

    // 3. Authentische Holzbalken-Wände
    for (let tx = 0; tx < HOUSE_W; tx++) {
      const topF = tx === 0 ? 'wall_corner_tl' : tx === HOUSE_W - 1 ? 'wall_corner_tr' : 'wall_top';
      rt.drawFrame('inner_tiles', topF, tx * TILE, 0);
      rt.drawFrame('inner_tiles', 'wall_mid', tx * TILE, 16);
      rt.drawFrame('inner_tiles', 'wall_base', tx * TILE, 32);
    }

    // Seitenwände (West & Ost)
    for (let ty = 3; ty < HOUSE_H - 1; ty++) {
      rt.drawFrame('inner_tiles', 'wall_side_left', 0, ty * TILE);
      rt.drawFrame('inner_tiles', 'wall_side_right', (HOUSE_W - 1) * TILE, ty * TILE);
    }

    // Südwand mit Türöffnung
    const doorCols = [11, 12, 13, 14];
    for (let tx = 0; tx < HOUSE_W; tx++) {
      if (doorCols.includes(tx)) continue;
      const botF = tx === 0 ? 'wall_corner_bl' : tx === HOUSE_W - 1 ? 'wall_corner_br' : 'wall_base';
      rt.drawFrame('inner_tiles', botF, tx * TILE, (HOUSE_H - 1) * TILE);
    }

    // 4. Wanddekorationen: Regale, Fenster, Krüge
    rt.drawFrame('inner_tiles', 'shelf', 4 * TILE, 16);
    rt.drawFrame('inner_tiles', 'clay_pots', 4 * TILE, 16);
    rt.drawFrame('inner_tiles', 'window', 10 * TILE, 16);
    rt.drawFrame('inner_tiles', 'window', 15 * TILE, 16);
    rt.drawFrame('inner_tiles', 'shelf', 19 * TILE, 16);
    rt.drawFrame('inner_tiles', 'clay_pots', 20 * TILE, 16);

    // 5. Webteppich im Schlafbereich
    rt.drawFrame('inner_tiles', 'rug', 3 * TILE, 4 * TILE);

    // Feste Kollisionszonen
    const addWallZone = (x: number, y: number, w: number, h: number) => {
      const z = this.add.zone(x, y, w, h).setOrigin(0);
      this.physics.add.existing(z, true);
      this.obstacles.add(z);
    };

    addWallZone(0, 0, HOUSE_W * TILE, 44);
    addWallZone(0, 0, 16, HOUSE_H * TILE);
    addWallZone((HOUSE_W - 1) * TILE, 0, 16, HOUSE_H * TILE);
    addWallZone(0, (HOUSE_H - 1) * TILE, 11 * TILE, 16);
    addWallZone(15 * TILE, (HOUSE_H - 1) * TILE, 11 * TILE, 16);
  }

  private spawnHouseNodes(): void {
    // 1. Schlaffelle (Echtes Pixel-Art Bärenfellbett)
    const bedSpr = this.add.image(76, 76, 'prop_bed').setDepth(60);
    this.nodes.push({
      kind: 'bed',
      x: 76,
      y: 76,
      hint: 'Auf Fellen schlafen (100% Wärme & Erholung)',
      sprite: bedSpr,
      label: this.addLabel(76, 40, 'Bärenfell-Lager', '#fde047'),
    });

    // 2. Sippen-Feuerstelle & Herdfeuer
    const fireSpr = this.add.image(180, 135, 'prop_fireplace').setDepth(60);
    this.add.sprite(180, 134, 'objects', 'fire0').setDepth(62).play('fire');
    this.nodes.push({
      kind: 'fire',
      x: 180,
      y: 135,
      hint: 'Fleisch am Herdfeuer braten',
      sprite: fireSpr,
      label: this.addLabel(180, 110, 'Herdfeuer', '#fb923c'),
    });

    // 3. Gemeinschaftstruhe & Vorräte im Nordosten
    const chestSpr = this.add.image(320, 65, 'prop_chest').setScale(1.2).setDepth(60);
    this.add.image(350, 65, 'prop_sack').setDepth(58);
    this.add.image(375, 68, 'prop_barrel').setDepth(58);
    this.add.image(355, 95, 'prop_hay').setDepth(58);

    this.nodes.push({
      kind: 'chest',
      x: 320,
      y: 65,
      hint: 'Sippen-Vorratstruhe öffnen',
      sprite: chestSpr,
      label: this.addLabel(320, 44, 'Vorratstruhe', '#a3e635'),
    });

    // 4. Sippentisch mit Hockern
    const tableSpr = this.add.image(275, 140, 'prop_table').setDepth(60);
    this.add.image(250, 140, 'inner_tiles', 'stool').setDepth(58);
    this.add.image(300, 140, 'inner_tiles', 'stool').setDepth(58);
    const tableZone = this.add.zone(255, 125, 42, 30).setOrigin(0);
    this.physics.add.existing(tableZone, true);
    this.obstacles.add(tableZone);

    // 5. Sippenmutter Alva am Herdfeuer (vollwertiger 16x32-Charakter)
    const elderSpr = this.add.sprite(140, 135, 'npc_alva', 0).setDepth(60);
    this.nodes.push({
      kind: 'elder',
      x: 140,
      y: 135,
      hint: 'Mit Sippenmutter Alva sprechen',
      sprite: elderSpr,
      label: this.addLabel(140, 110, 'Sippenmutter Alva', '#86efac'),
    });

    // 6. Ausgangstür
    const exitSpr = this.add.image(208, 275, 'objects', 'bubble_excl').setVisible(false);
    this.nodes.push({
      kind: 'exit',
      x: 208,
      y: 275,
      hint: 'Hinaus ins Dorf treten',
      sprite: exitSpr,
      label: this.addLabel(208, 270, 'Zum Dorf', '#67e8f9'),
    });
  }

  private checkInteractions(): void {
    const spaceDown =
      Phaser.Input.Keyboard.JustDown(this.wasd.SPACE) ||
      Phaser.Input.Keyboard.JustDown(this.wasd.E) ||
      Boolean(state.touch?.consumeAction());

    const px = this.player.x;
    const py = this.player.y;

    let nearestNode: HouseNode | null = null;
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
        if (spaceDown || py > 268) {
          this.leaveHouse();
          return;
        }
      } else if (spaceDown) {
        this.interactHouseNode(nearestNode);
        return;
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
        state.emit('toast', 'Frisches Fleisch auf dem warmen Herdfeuer gebraten!');
        sfx.craft();
      } else {
        state.emit('toast', 'Das Herdfeuer wärmt das ganze Langhaus.');
      }
    } else if (n.kind === 'chest') {
      state.openDialog({
        speaker: 'Vorrats-Truhe',
        nodes: [
          {
            text: 'Hier bewahrt die Sippe geschützt vor Kälte und Raubtieren Getreide, Felle und Vorräte auf.',
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
    if (this.promptEl) this.promptEl.style.display = 'none';
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      state.dayTime = 0.05;
      state.daysSurvived++;
      state.safety = 100;
      state.food = Math.min(100, state.food + 15);

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
    if (this.labelLayer) this.labelLayer.style.display = 'none';
    const wl = document.getElementById('world-labels');
    if (wl) wl.style.display = 'block';
    this.cameras.main.fadeOut(350, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.stop('Longhouse');
      this.scene.wake('World');
      const worldScene = this.scene.get('World') as any;
      if (worldScene && worldScene.player) {
        worldScene.player.setPosition(410, 270);
        worldScene.cameras.main.fadeIn(350, 0, 0, 0);
      }
      state.hint = '';
      state.emit('toast', 'Du trittst aus dem Langhaus zurück ins Dorf.');
    });
  }
}
