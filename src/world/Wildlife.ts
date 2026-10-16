import Phaser from 'phaser';
import { state } from '../systems/GameState';

export interface RoamingAnimal {
  kind: 'wild_goat' | 'tamed_goat' | 'auerochse' | 'wolf';
  sprite: Phaser.GameObjects.Sprite;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  speed: number;
  state: 'idle' | 'walk' | 'lured';
  timer: number;
  targetX: number;
  targetY: number;
  idleAnim?: string;
  walkAnim?: string;
  syncLabel?: (x: number, y: number) => void;
  labelOffsetY: number;
}

interface AmbientFlier {
  g: Phaser.GameObjects.Arc;
  wing: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
  phase: number;
  baseY: number;
}

/**
 * Steuert frei umherziehende Wildtiere (Wildziegen-Herde, zahme Ziegen im Gehege,
 * Auerochsen/ Ur-Rinder, scheuer Wolf) sowie Schmetterlinge über den Wiesen.
 *
 * WICHTIG für die Kapitel-3-Quest ("Wildziege fangen"):
 * - Wildziegen bewegen sich gemächlich (18-22 px/s) mit langen Graspausen (2.5-4.5 s).
 * - Sobald sich der Spieler auf < 85 px nähert, bleibt die Wildziege neugierig stehen
 *   (oder tapst bei vorhandenem Getreide im Inventar sogar langsam auf den Spieler zu),
 *   sodass das Einfangen mit [E] jederzeit mühelos gelingt!
 */
export class WildlifeManager {
  private scene: Phaser.Scene;
  private animals: RoamingAnimal[] = [];
  private fliers: AmbientFlier[] = [];
  private rng = new Phaser.Math.RandomDataGenerator(['wildlife']);

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public addAnimal(cfg: {
    kind: RoamingAnimal['kind'];
    sprite: Phaser.GameObjects.Sprite;
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
    speed?: number;
    idleAnim?: string;
    walkAnim?: string;
    labelOffsetY?: number;
    syncLabel?: (x: number, y: number) => void;
  }): RoamingAnimal {
    const animal: RoamingAnimal = {
      kind: cfg.kind,
      sprite: cfg.sprite,
      bounds: cfg.bounds,
      speed: cfg.speed ?? 20,
      state: 'idle',
      timer: this.rng.realInRange(1.2, 3.5),
      targetX: cfg.sprite.x,
      targetY: cfg.sprite.y,
      idleAnim: cfg.idleAnim,
      walkAnim: cfg.walkAnim,
      syncLabel: cfg.syncLabel,
      labelOffsetY: cfg.labelOffsetY ?? -18,
    };
    if (animal.idleAnim) {
      animal.sprite.play(animal.idleAnim, true);
    }
    this.animals.push(animal);
    return animal;
  }

  public removeBySprite(sprite: Phaser.GameObjects.Sprite): void {
    this.animals = this.animals.filter((a) => a.sprite !== sprite);
  }

  /** Erzeugt kleine Schmetterlinge & Libellen an Wiesen und Seeufer. */
  public spawnAmbientFliers(mapW: number, mapH: number): void {
    const colors = [0xffe066, 0xff99c8, 0x90e0ef, 0xffffff, 0xffb703, 0xa8e6cf];
    for (let i = 0; i < 8; i++) {
      const x = this.rng.between(80, mapW - 80);
      const y = this.rng.between(110, mapH - 70);
      const col = colors[i % colors.length];
      const g = this.scene.add.circle(x, y, 2, col, 0.9).setDepth(3500);
      const wing = this.scene.add.circle(x + 2, y - 1, 1.5, 0xffffff, 0.75).setDepth(3500);
      const angle = this.rng.realInRange(0, Math.PI * 2);
      const spd = this.rng.realInRange(10, 18);
      this.fliers.push({
        g,
        wing,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd * 0.6,
        phase: this.rng.realInRange(0, 10),
        baseY: y,
      });
    }
  }

  public update(deltaMs: number, playerX: number, playerY: number): void {
    const dt = deltaMs / 1000;

    for (const a of this.animals) {
      if (!a.sprite || !a.sprite.active) continue;

      // Wenn der Wolf gezähmt wurde, übernimmt WorldScene die Folge-Logik
      if (a.kind === 'wolf' && state.wolfTamed) continue;

      const distToPlayer = Phaser.Math.Distance.Between(a.sprite.x, a.sprite.y, playerX, playerY);

      // Spielerfreundliches Verhalten für Quest-Tiere (Wildziege & scheuer Wolf):
      if (a.kind === 'wild_goat') {
        const hasGrain = state.count('getreide') > 0;
        if (distToPlayer < 88) {
          if (hasGrain && distToPlayer > 26) {
            // Mit Getreide in der Tasche läuft die Wildziege neugierig langsam auf den Spieler zu!
            a.state = 'lured';
            const ang = Phaser.Math.Angle.Between(a.sprite.x, a.sprite.y, playerX, playerY);
            const step = 16 * dt;
            a.sprite.x = Phaser.Math.Clamp(a.sprite.x + Math.cos(ang) * step, a.bounds.minX, a.bounds.maxX);
            a.sprite.y = Phaser.Math.Clamp(a.sprite.y + Math.sin(ang) * step, a.bounds.minY, a.bounds.maxY);
            // Goat-Sprite schaut standardmäßig nach links (flipX=true für rechts)
            a.sprite.setFlipX(Math.cos(ang) > 0);
            if (a.walkAnim) a.sprite.play(a.walkAnim, true);
          } else {
            // Nahe am Spieler bleibt sie ruhig grasend stehen, damit man bequem E drücken kann
            a.state = 'idle';
            a.timer = 1.5;
            if (a.idleAnim) a.sprite.play(a.idleAnim, true);
          }
          a.sprite.setDepth(a.sprite.y + 10);
          a.syncLabel?.(a.sprite.x, a.sprite.y + a.labelOffsetY);
          continue;
        }
      }

      if (a.kind === 'wolf' && !state.wolfTamed && distToPlayer < 75) {
        // Scheuer Wolf bleibt aufmerksam stehen, sobald der Spieler sich nähert
        a.state = 'idle';
        a.timer = 1.5;
        a.sprite.setFlipX(playerX < a.sprite.x);
        a.sprite.setDepth(a.sprite.y + 8);
        a.syncLabel?.(a.sprite.x, a.sprite.y + a.labelOffsetY);
        continue;
      }

      // Normale Weide-/Wander-Zustandsmaschine
      a.timer -= dt;
      if (a.state === 'idle' || a.state === 'lured') {
        if (a.idleAnim) a.sprite.play(a.idleAnim, true);
        if (a.timer <= 0) {
          a.state = 'walk';
          a.timer = this.rng.realInRange(1.8, 3.8);
          a.targetX = this.rng.realInRange(a.bounds.minX, a.bounds.maxX);
          a.targetY = this.rng.realInRange(a.bounds.minY, a.bounds.maxY);
          if (a.walkAnim) a.sprite.play(a.walkAnim, true);
        }
      } else if (a.state === 'walk') {
        const dx = a.targetX - a.sprite.x;
        const dy = a.targetY - a.sprite.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 4 || a.timer <= 0) {
          a.state = 'idle';
          a.timer = this.rng.realInRange(2.4, 5.0);
          if (a.idleAnim) a.sprite.play(a.idleAnim, true);
        } else {
          const step = Math.min(dist, a.speed * dt);
          const nx = a.sprite.x + (dx / dist) * step;
          const ny = a.sprite.y + (dy / dist) * step;
          a.sprite.x = Phaser.Math.Clamp(nx, a.bounds.minX, a.bounds.maxX);
          a.sprite.y = Phaser.Math.Clamp(ny, a.bounds.minY, a.bounds.maxY);
          // Goat & Cow schauen im Originalsprite nach links; Wolf schaut nach rechts
          if (a.kind === 'wolf') {
            a.sprite.setFlipX(dx < -0.5);
          } else {
            a.sprite.setFlipX(dx > 0.5);
          }
          if (a.walkAnim) a.sprite.play(a.walkAnim, true);
        }
      }

      a.sprite.setDepth(a.sprite.y + 10);
      a.syncLabel?.(a.sprite.x, a.sprite.y + a.labelOffsetY);
    }

    // Schmetterlinge aktualisieren
    for (const f of this.fliers) {
      f.phase += dt * 6;
      f.g.x += f.vx * dt;
      f.g.y += f.vy * dt + Math.sin(f.phase) * 0.25;
      f.wing.setPosition(f.g.x + Math.cos(f.phase * 2) * 2, f.g.y - 1 + Math.sin(f.phase * 2) * 1.2);
      if (f.g.x < 40 || f.g.x > 760) f.vx = -f.vx;
      if (f.g.y < 80 || f.g.y > 560) f.vy = -f.vy;
    }
  }
}
