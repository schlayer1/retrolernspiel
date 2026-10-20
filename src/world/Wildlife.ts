import Phaser from 'phaser';
import { state } from '../systems/GameState';

export interface RoamingAnimal {
  kind: 'wild_goat' | 'tamed_goat' | 'goat_baby' | 'auerochse' | 'calf' | 'wolf' | 'dog_lupo' | 'rabbit' | 'pig';
  sprite: Phaser.GameObjects.Sprite;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  speed: number;
  state: 'idle' | 'walk' | 'lured' | 'special';
  timer: number;
  targetX: number;
  targetY: number;
  animPrefix?: string;
  idleAnim?: string;
  walkAnim?: string;
  specialAnim?: string;
  syncLabel?: (x: number, y: number) => void;
  labelOffsetY: number;
}

interface LakeDuck {
  sprite: Phaser.GameObjects.Sprite;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  speed: number;
  state: 'swim' | 'idle' | 'dive' | 'flap';
  timer: number;
  targetX: number;
  targetY: number;
}

interface LakeFish {
  sprite: Phaser.GameObjects.Graphics;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

interface AmbientButterfly {
  sprite: Phaser.GameObjects.Sprite;
  vx: number;
  vy: number;
  phase: number;
  baseY: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

interface LakeFrog {
  sprite: Phaser.GameObjects.Sprite;
  startX: number;
  startY: number;
  state: 'sit' | 'jump' | 'underwater';
  timer: number;
}

interface TreeSquirrel {
  sprite: Phaser.GameObjects.Sprite;
  groundX: number;
  groundY: number;
  treeTopY: number;
  state: 'ground' | 'climb' | 'perched';
  timer: number;
}

/**
 * Steuert die gesamte lebendige Fauna & Ökologie des Steinzeit-Dorfes:
 * - 4-Richtungs-animierte Nutz- & Wildtiere (Ziegen, Kälber, Auerochsen, Wolf/Hund Lupo, Hasen, Wildschweine)
 * - See-Ökosystem: Schwimmende Wildenten, Fischschatten unter Wasser
 * - Reaktive Critters: Schmetterlinge, springende Seeufer-Frösche & flinke Baum-Eichhörnchen
 */
export class WildlifeManager {
  private scene: Phaser.Scene;
  private animals: RoamingAnimal[] = [];
  private ducks: LakeDuck[] = [];
  private fishes: LakeFish[] = [];
  private butterflies: AmbientButterfly[] = [];
  private frogs: LakeFrog[] = [];
  private squirrels: TreeSquirrel[] = [];
  private rng = new Phaser.Math.RandomDataGenerator(['wildlife_v2']);

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public addAnimal(cfg: {
    kind: RoamingAnimal['kind'];
    sprite: Phaser.GameObjects.Sprite;
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
    speed?: number;
    animPrefix?: string;
    idleAnim?: string;
    walkAnim?: string;
    specialAnim?: string;
    labelOffsetY?: number;
    syncLabel?: (x: number, y: number) => void;
  }): RoamingAnimal {
    const animal: RoamingAnimal = {
      kind: cfg.kind,
      sprite: cfg.sprite,
      bounds: cfg.bounds,
      speed: cfg.speed ?? 18,
      state: 'idle',
      timer: this.rng.realInRange(1.2, 3.2),
      targetX: cfg.sprite.x,
      targetY: cfg.sprite.y,
      animPrefix: cfg.animPrefix,
      idleAnim: cfg.idleAnim,
      walkAnim: cfg.walkAnim,
      specialAnim: cfg.specialAnim,
      syncLabel: cfg.syncLabel,
      labelOffsetY: cfg.labelOffsetY ?? -16,
    };
    if (animal.idleAnim && this.scene.anims.exists(animal.idleAnim)) {
      animal.sprite.play(animal.idleAnim, true);
    }
    this.animals.push(animal);
    return animal;
  }

  public removeBySprite(sprite: Phaser.GameObjects.Sprite): void {
    this.animals = this.animals.filter((a) => a.sprite !== sprite);
  }

  /**
   * Spawnt das lebendige See-Ökosystem (Enten & Fische) und Wiesen-Critters (Schmetterlinge, Frösche, Eichhörnchen).
   */
  public spawnAmbientFliers(mapW: number, mapH: number): void {
    // 1. Schmetterlinge über Blumenwiesen
    const butterflyAnims = ['critter-butterfly-1', 'critter-butterfly-2', 'critter-butterfly-3'];
    const meadowZones = [
      { minX: 180, maxX: 340, minY: 320, maxY: 480 },
      { minX: 420, maxX: 640, minY: 280, maxY: 420 },
      { minX: 480, maxX: 700, minY: 440, maxY: 560 },
    ];
    for (let i = 0; i < 7; i++) {
      const zone = meadowZones[i % meadowZones.length];
      const x = this.rng.between(zone.minX, zone.maxX);
      const y = this.rng.between(zone.minY, zone.maxY);
      const animKey = butterflyAnims[i % butterflyAnims.length];
      const sprite = this.scene.add.sprite(x, y, 'sdv_critters', 128).setScale(1.0).setDepth(3500);
      if (this.scene.anims.exists(animKey)) sprite.play(animKey);
      const angle = this.rng.realInRange(0, Math.PI * 2);
      const spd = this.rng.realInRange(10, 16);
      this.butterflies.push({
        sprite,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd * 0.6,
        phase: this.rng.realInRange(0, 10),
        baseY: y,
        bounds: zone,
      });
    }

    // 2. See-Ökosystem (Nordost-See: x ~ 512..736, y ~ 64..208)
    const lakeBounds = { minX: 524, maxX: 720, minY: 72, maxY: 200 };

    // 2.1 Wildenten auf dem See
    for (let i = 0; i < 3; i++) {
      const dx = this.rng.between(lakeBounds.minX + 20, lakeBounds.maxX - 20);
      const dy = this.rng.between(lakeBounds.minY + 16, lakeBounds.maxY - 16);
      const duckSprite = this.scene.add.sprite(dx, dy, 'sdv_duck', 16).setScale(1.0).setDepth(dy + 6);
      if (this.scene.anims.exists('duck-swim-right')) duckSprite.play('duck-swim-right');
      this.ducks.push({
        sprite: duckSprite,
        bounds: lakeBounds,
        speed: this.rng.realInRange(12, 18),
        state: 'swim',
        timer: this.rng.realInRange(2.5, 6.0),
        targetX: this.rng.between(lakeBounds.minX, lakeBounds.maxX),
        targetY: this.rng.between(lakeBounds.minY, lakeBounds.maxY),
      });
    }

    // 2.2 Fische unter Wasser
    for (let i = 0; i < 4; i++) {
      const fx = this.rng.between(lakeBounds.minX + 30, lakeBounds.maxX - 30);
      const fy = this.rng.between(lakeBounds.minY + 20, lakeBounds.maxY - 20);
      const g = this.scene.add.graphics().setDepth(fy + 2);
      this.fishes.push({
        sprite: g,
        x: fx,
        y: fy,
        vx: (this.rng.pick([1, -1]) * this.rng.realInRange(8, 16)),
        vy: this.rng.realInRange(-4, 4),
        phase: this.rng.realInRange(0, Math.PI * 2),
        bounds: lakeBounds,
      });
    }

    // 2.3 Frösche am Seeufer
    const frogBankSpawns = [
      { x: 508, y: 110 },
      { x: 512, y: 155 },
      { x: 518, y: 195 },
      { x: 555, y: 216 },
    ];
    frogBankSpawns.forEach((pos) => {
      const frogSprite = this.scene.add.sprite(pos.x, pos.y, 'sdv_critters', 280).setScale(1.0).setDepth(pos.y + 6);
      if (this.scene.anims.exists('critter-frog-idle')) frogSprite.play('critter-frog-idle');
      this.frogs.push({
        sprite: frogSprite,
        startX: pos.x,
        startY: pos.y,
        state: 'sit',
        timer: this.rng.realInRange(2.0, 5.0),
      });
    });

    // 3. Baum-Eichhörnchen im Wald
    const squirrelSpawns = [
      { groundX: 230, groundY: 260, treeTopY: 232 },
      { groundX: 305, groundY: 345, treeTopY: 318 },
    ];
    squirrelSpawns.forEach((pos) => {
      const sSprite = this.scene.add.sprite(pos.groundX, pos.groundY, 'sdv_critters', 320).setScale(1.0).setDepth(pos.groundY + 8);
      if (this.scene.anims.exists('critter-squirrel-idle')) sSprite.play('critter-squirrel-idle');
      this.squirrels.push({
        sprite: sSprite,
        groundX: pos.groundX,
        groundY: pos.groundY,
        treeTopY: pos.treeTopY,
        state: 'ground',
        timer: this.rng.realInRange(3.0, 7.0),
      });
    });
  }

  public update(deltaMs: number, playerX: number, playerY: number): void {
    const dt = deltaMs / 1000;

    // ---------------------------------------------------- 1. Tiere auf dem Land
    for (const a of this.animals) {
      if (!a.sprite || !a.sprite.active) continue;
      if (a.kind === 'wolf' && state.wolfTamed) continue;

      const distToPlayer = Phaser.Math.Distance.Between(a.sprite.x, a.sprite.y, playerX, playerY);

      // 1.1 Wildziege: Getreide-Lockung
      if (a.kind === 'wild_goat') {
        const hasGrain = state.count('getreide') > 0;
        if (distToPlayer < 88) {
          if (hasGrain && distToPlayer > 26) {
            a.state = 'lured';
            const ang = Phaser.Math.Angle.Between(a.sprite.x, a.sprite.y, playerX, playerY);
            const step = 16 * dt;
            a.sprite.x = Phaser.Math.Clamp(a.sprite.x + Math.cos(ang) * step, a.bounds.minX, a.bounds.maxX);
            a.sprite.y = Phaser.Math.Clamp(a.sprite.y + Math.sin(ang) * step, a.bounds.minY, a.bounds.maxY);
            this.playDirectionAnim(a, Math.cos(ang), Math.sin(ang));
          } else {
            a.state = 'idle';
            a.timer = 1.5;
            this.playIdleAnim(a);
          }
          a.sprite.setDepth(a.sprite.y + 10);
          a.syncLabel?.(a.sprite.x, a.sprite.y + a.labelOffsetY);
          continue;
        }
      }

      // 1.2 Scheuer Grauwolf: Aufmerksamer Stopp
      if (a.kind === 'wolf' && !state.wolfTamed && distToPlayer < 75) {
        a.state = 'idle';
        a.timer = 1.5;
        a.sprite.setFlipX(playerX < a.sprite.x);
        this.playIdleAnim(a);
        a.sprite.setDepth(a.sprite.y + 8);
        a.syncLabel?.(a.sprite.x, a.sprite.y + a.labelOffsetY);
        continue;
      }

      // 1.3 Wilde Feldhasen: Anziehung zu aufgestellten Jagdfallen
      if (a.kind === 'rabbit' && state.traps.length > 0 && a.state !== 'lured') {
        // Suche nächste Falle im Umkreis von 120 px
        let nearestTrap: { x: number; y: number } | null = null;
        let nearDist = 120;
        for (const t of state.traps) {
          const d = Phaser.Math.Distance.Between(a.sprite.x, a.sprite.y, t.x, t.y);
          if (d < nearDist) {
            nearDist = d;
            nearestTrap = t;
          }
        }
        if (nearestTrap && nearDist > 16) {
          // Hase hoppelt neugierig auf die Falle zu
          const ang = Phaser.Math.Angle.Between(a.sprite.x, a.sprite.y, nearestTrap.x, nearestTrap.y);
          const step = (a.speed * 0.8) * dt;
          a.sprite.x += Math.cos(ang) * step;
          a.sprite.y += Math.sin(ang) * step;
          this.playDirectionAnim(a, Math.cos(ang), Math.sin(ang));
          a.sprite.setDepth(a.sprite.y + 6);
          a.syncLabel?.(a.sprite.x, a.sprite.y + a.labelOffsetY);
          continue;
        } else if (nearestTrap && nearDist <= 16) {
          // Hase schnuppert neugierig an der Falle
          if (this.scene.anims.exists('rabbit-sniff')) a.sprite.play('rabbit-sniff', true);
          a.sprite.setDepth(a.sprite.y + 6);
          a.syncLabel?.(a.sprite.x, a.sprite.y + a.labelOffsetY);
          continue;
        }
      }

      // 1.4 Standard-Tierwanderung (Weide-Zustandsautomat)
      a.timer -= dt;
      if (a.state === 'idle' || a.state === 'lured' || a.state === 'special') {
        if (a.timer <= 0) {
          a.state = 'walk';
          a.timer = this.rng.realInRange(2.0, 4.5);
          a.targetX = this.rng.realInRange(a.bounds.minX, a.bounds.maxX);
          a.targetY = this.rng.realInRange(a.bounds.minY, a.bounds.maxY);
        } else {
          this.playIdleAnim(a);
        }
      } else if (a.state === 'walk') {
        const dx = a.targetX - a.sprite.x;
        const dy = a.targetY - a.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4 || a.timer <= 0) {
          a.state = 'idle';
          a.timer = this.rng.realInRange(2.5, 5.5);
          // Zufällig Grasen/Schnüffeln/Wedeln statt bloßem Stillstehen
          if (this.rng.frac() > 0.4 && a.specialAnim && this.scene.anims.exists(a.specialAnim)) {
            a.sprite.play(a.specialAnim, true);
          } else {
            this.playIdleAnim(a);
          }
        } else {
          const step = Math.min(dist, a.speed * dt);
          const nx = a.sprite.x + (dx / dist) * step;
          const ny = a.sprite.y + (dy / dist) * step;
          a.sprite.x = Phaser.Math.Clamp(nx, a.bounds.minX, a.bounds.maxX);
          a.sprite.y = Phaser.Math.Clamp(ny, a.bounds.minY, a.bounds.maxY);
          this.playDirectionAnim(a, dx, dy);
        }
      }

      a.sprite.setDepth(a.sprite.y + 10);
      a.syncLabel?.(a.sprite.x, a.sprite.y + a.labelOffsetY);
    }

    // ---------------------------------------------------- 2. See-Enten
    for (const d of this.ducks) {
      if (!d.sprite || !d.sprite.active) continue;
      d.timer -= dt;
      if (d.state === 'swim') {
        const dx = d.targetX - d.sprite.x;
        const dy = d.targetY - d.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4 || d.timer <= 0) {
          // Pause mit Abtauchen oder Flügelschlagen
          d.state = this.rng.pick(['dive', 'flap', 'idle']);
          d.timer = this.rng.realInRange(2.0, 4.0);
          if (d.state === 'dive' && this.scene.anims.exists('duck-dive')) {
            d.sprite.play('duck-dive', true);
          } else if (d.state === 'flap' && this.scene.anims.exists('duck-flap')) {
            d.sprite.play('duck-flap', true);
          } else if (this.scene.anims.exists('duck-idle')) {
            d.sprite.play('duck-idle', true);
          }
        } else {
          const step = Math.min(dist, d.speed * dt);
          d.sprite.x += (dx / dist) * step;
          d.sprite.y += (dy / dist) * step;
          if (Math.abs(dx) >= Math.abs(dy)) {
            if (this.scene.anims.exists('duck-swim-right')) {
              d.sprite.play('duck-swim-right', true);
              d.sprite.setFlipX(dx < 0);
            }
          } else if (dy > 0) {
            if (this.scene.anims.exists('duck-swim-down')) {
              d.sprite.play('duck-swim-down', true);
              d.sprite.setFlipX(false);
            }
          } else {
            if (this.scene.anims.exists('duck-swim-up')) {
              d.sprite.play('duck-swim-up', true);
              d.sprite.setFlipX(false);
            }
          }
        }
      } else {
        if (d.timer <= 0) {
          d.state = 'swim';
          d.timer = this.rng.realInRange(3.5, 7.0);
          d.targetX = this.rng.between(d.bounds.minX, d.bounds.maxX);
          d.targetY = this.rng.between(d.bounds.minY, d.bounds.maxY);
        }
      }
      d.sprite.setDepth(d.sprite.y + 6);
    }

    // ---------------------------------------------------- 3. Fische unter Wasser
    for (const f of this.fishes) {
      f.phase += dt * 3.5;
      f.x += f.vx * dt;
      f.y += f.vy * dt + Math.sin(f.phase) * 0.2;
      if (f.x < f.bounds.minX + 15 || f.x > f.bounds.maxX - 15) f.vx = -f.vx;
      if (f.y < f.bounds.minY + 15 || f.y > f.bounds.maxY - 15) f.vy = -f.vy;

      f.sprite.clear();
      // Transparenter Fischschatten unter der Wasseroberfläche
      f.sprite.fillStyle(0x1a4055, 0.45);
      f.sprite.fillEllipse(f.x, f.y, 8, 3.5);
      // Kleine Schwanzflosse
      const tailX = f.vx > 0 ? f.x - 5 : f.x + 5;
      f.sprite.fillStyle(0x275973, 0.4);
      f.sprite.fillTriangle(tailX, f.y - 2, tailX, f.y + 2, f.x, f.y);
      // Zarte Wasserblase
      if (Math.sin(f.phase * 2) > 0.85) {
        f.sprite.fillStyle(0xaee2ff, 0.6);
        f.sprite.fillCircle(f.x + (f.vx > 0 ? 4 : -4), f.y - 2, 1.2);
      }
    }

    // ---------------------------------------------------- 4. Schmetterlinge
    for (const b of this.butterflies) {
      b.phase += dt * 5;
      b.sprite.x += b.vx * dt;
      b.sprite.y = b.baseY + Math.sin(b.phase) * 6;
      if (b.sprite.x < b.bounds.minX || b.sprite.x > b.bounds.maxX) {
        b.vx = -b.vx;
        b.sprite.setFlipX(b.vx < 0);
      }
      if (b.baseY < b.bounds.minY || b.baseY > b.bounds.maxY) {
        b.vy = -b.vy;
      }
      b.baseY += b.vy * dt;
    }

    // ---------------------------------------------------- 5. Seeufer-Frösche (reaktiv)
    for (const fr of this.frogs) {
      const dToP = Phaser.Math.Distance.Between(fr.sprite.x, fr.sprite.y, playerX, playerY);
      if (fr.state === 'sit') {
        if (dToP < 38) {
          // Spieler tritt zu nah -> Frosch springt ins Wasser!
          fr.state = 'jump';
          fr.timer = 0.55;
          if (this.scene.anims.exists('critter-frog-jump')) fr.sprite.play('critter-frog-jump', true);
        } else {
          fr.timer -= dt;
          if (fr.timer <= 0) {
            fr.timer = this.rng.realInRange(3.0, 7.0);
            if (this.scene.anims.exists('critter-frog-croak')) fr.sprite.play('critter-frog-croak', true);
          }
        }
      } else if (fr.state === 'jump') {
        fr.timer -= dt;
        // Bogenförmiger Sprung nach Osten (in den See hinein)
        fr.sprite.x += 38 * dt;
        fr.sprite.y -= 12 * Math.sin(fr.timer * Math.PI) * dt;
        if (fr.timer <= 0) {
          fr.state = 'underwater';
          fr.sprite.setVisible(false);
          fr.timer = this.rng.realInRange(8.0, 16.0); // Taucht nach Zeit wieder am Ufer auf
        }
      } else if (fr.state === 'underwater') {
        fr.timer -= dt;
        if (fr.timer <= 0 && dToP > 55) {
          fr.state = 'sit';
          fr.sprite.setPosition(fr.startX, fr.startY);
          fr.sprite.setVisible(true);
          if (this.scene.anims.exists('critter-frog-idle')) fr.sprite.play('critter-frog-idle', true);
        }
      }
    }

    // ---------------------------------------------------- 6. Baum-Eichhörnchen (reaktiv)
    for (const sq of this.squirrels) {
      const dToP = Phaser.Math.Distance.Between(sq.sprite.x, sq.sprite.y, playerX, playerY);
      if (sq.state === 'ground') {
        if (dToP < 42) {
          // Spieler kommt zu nah -> huscht den Baumstamm hoch!
          sq.state = 'climb';
          if (this.scene.anims.exists('critter-squirrel-climb')) sq.sprite.play('critter-squirrel-climb', true);
        } else {
          sq.timer -= dt;
          if (sq.timer <= 0) {
            sq.timer = this.rng.realInRange(2.5, 6.0);
            // Kleiner Hupfer auf dem Boden
            sq.sprite.x = sq.groundX + this.rng.between(-8, 8);
          }
        }
      } else if (sq.state === 'climb') {
        sq.sprite.y -= 35 * dt;
        if (sq.sprite.y <= sq.treeTopY) {
          sq.state = 'perched';
          sq.timer = this.rng.realInRange(6.0, 12.0);
          if (this.scene.anims.exists('critter-squirrel-idle')) sq.sprite.play('critter-squirrel-idle', true);
        }
      } else if (sq.state === 'perched') {
        sq.timer -= dt;
        if (sq.timer <= 0 && dToP > 60) {
          // Klettert wieder sanft herunter
          sq.sprite.y += 25 * dt;
          if (sq.sprite.y >= sq.groundY) {
            sq.sprite.y = sq.groundY;
            sq.state = 'ground';
            if (this.scene.anims.exists('critter-squirrel-idle')) sq.sprite.play('critter-squirrel-idle', true);
          }
        }
      }
    }
  }

  private playDirectionAnim(a: RoamingAnimal, dx: number, dy: number): void {
    const prefix = a.animPrefix;
    if (!prefix) {
      if (a.walkAnim && this.scene.anims.exists(a.walkAnim)) a.sprite.play(a.walkAnim, true);
      a.sprite.setFlipX(dx < 0);
      return;
    }

    if (Math.abs(dx) >= Math.abs(dy)) {
      const rightKey = `${prefix}-walk-right`;
      const hopRightKey = `${prefix}-hop-right`;
      if (this.scene.anims.exists(rightKey)) {
        a.sprite.play(rightKey, true);
      } else if (this.scene.anims.exists(hopRightKey)) {
        a.sprite.play(hopRightKey, true);
      } else if (a.walkAnim && this.scene.anims.exists(a.walkAnim)) {
        a.sprite.play(a.walkAnim, true);
      }
      a.sprite.setFlipX(dx < 0);
    } else if (dy > 0) {
      const downKey = `${prefix}-walk-down`;
      const hopDownKey = `${prefix}-hop-down`;
      if (this.scene.anims.exists(downKey)) {
        a.sprite.play(downKey, true);
      } else if (this.scene.anims.exists(hopDownKey)) {
        a.sprite.play(hopDownKey, true);
      } else if (a.walkAnim && this.scene.anims.exists(a.walkAnim)) {
        a.sprite.play(a.walkAnim, true);
      }
      a.sprite.setFlipX(false);
    } else {
      const upKey = `${prefix}-walk-up`;
      const hopUpKey = `${prefix}-hop-up`;
      if (this.scene.anims.exists(upKey)) {
        a.sprite.play(upKey, true);
      } else if (this.scene.anims.exists(hopUpKey)) {
        a.sprite.play(hopUpKey, true);
      } else if (a.walkAnim && this.scene.anims.exists(a.walkAnim)) {
        a.sprite.play(a.walkAnim, true);
      }
      a.sprite.setFlipX(false);
    }
  }

  private playIdleAnim(a: RoamingAnimal): void {
    if (a.idleAnim && this.scene.anims.exists(a.idleAnim)) {
      a.sprite.play(a.idleAnim, true);
    } else if (a.animPrefix) {
      const defaultIdle = `${a.animPrefix}-idle`;
      if (this.scene.anims.exists(defaultIdle)) {
        a.sprite.play(defaultIdle, true);
      }
    }
  }
}
