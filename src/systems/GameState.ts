import Phaser from 'phaser';
import { sfx } from '../audio/sound';
import { CHAPTERS, DialogNode, LEXICON } from '../data/chapter1';
import { BuildingDef, BuildingId, ItemId, Recipe, TradeOffer } from '../data/items';
import { FarmPlotState, Placed, SaveData, SaveManager } from './SaveManager';

export const DAY_MS = 240_000; // Dauer eines Tages in Echtzeit
export const TRAP_MS = 20_000; // Zeit, bis eine Falle etwas gefangen hat
export const CROP_MS = 18_000; // Zeit nach dem Gießen, bis Getreide reif ist (oder sofort durch Schlafen)

export interface DialogSpec {
  speaker: string;
  nodes: DialogNode[];
  onDone?: () => void;
}

/**
 * Zentraler Spielzustand, geteilt zwischen WorldScene (Spielwelt) und UIScene (Oberfläche).
 */
class GameState extends Phaser.Events.EventEmitter {
  playerName = 'Sippenkind';
  chapter = 1;
  inventory: Partial<Record<ItemId, number>> = {};
  food = 85;
  safety = 85;
  knowledge = 0;
  quest = 0;
  lexicon: string[] = [];
  counts: Record<string, number> = {};
  fires: Placed[] = [];
  traps: Placed[] = [];
  plots: FarmPlotState[] = [
    { id: 0, stage: 'raw', wateredAt: 0 },
    { id: 1, stage: 'raw', wateredAt: 0 },
    { id: 2, stage: 'raw', wateredAt: 0 },
    { id: 3, stage: 'raw', wateredAt: 0 },
    { id: 4, stage: 'raw', wateredAt: 0 },
    { id: 5, stage: 'raw', wateredAt: 0 },
  ];
  buildings: BuildingId[] = [];
  wolfTamed = false;
  goatsTamed = 0;
  dayTime = 0.08;
  collapses = 0;
  quizAttempts = 0;
  playerX?: number;
  playerY?: number;

  /** true, solange Dialog, Bau- oder Lexikonfenster offen sind (Spielfigur steht still). */
  modal = false;
  lastModalClose = 0;
  hint = '';
  touch?: { vector: Phaser.Math.Vector2; consumeAction(): boolean };

  readonly saves = new SaveManager();

  count(item: ItemId): number {
    return this.inventory[item] ?? 0;
  }

  add(item: ItemId, n = 1): void {
    this.inventory[item] = Math.max(0, this.count(item) + n);
    if (n > 0) sfx.pickup();
    this.emit('inventory');
  }

  bump(key: string, n = 1): void {
    this.counts[key] = (this.counts[key] ?? 0) + n;
    this.checkQuest();
  }

  canAfford(r: Recipe): boolean {
    return Object.entries(r.cost).every(([id, n]) => this.count(id as ItemId) >= (n ?? 0));
  }

  canCraft(r: Recipe): boolean {
    if (r.requiresBuilding && !this.hasBuilding(r.requiresBuilding)) return false;
    return this.canAfford(r);
  }

  canAffordBuilding(b: BuildingDef): boolean {
    return Object.entries(b.cost).every(([id, n]) => this.count(id as ItemId) >= (n ?? 0));
  }

  canAffordTrade(t: TradeOffer): boolean {
    return Object.entries(t.give).every(([id, n]) => this.count(id as ItemId) >= (n ?? 0));
  }

  executeTrade(t: TradeOffer): void {
    if (!this.canAffordTrade(t)) return;
    this.spendCost(t.give);
    this.add(t.receive.item, t.receive.count);
    this.bump('trade', 1);
    this.bump(`trade_${t.receive.item}`, t.receive.count);
    this.unlock('tauschhandel');
    if (t.receive.item === 'salz' || t.receive.item === 'bernstein' || t.receive.item === 'zinn') {
      this.unlock(t.receive.item);
    }
    this.checkQuest();
    this.persist();
  }

  spend(r: Recipe): void {
    for (const [id, n] of Object.entries(r.cost)) {
      this.inventory[id as ItemId] = this.count(id as ItemId) - (n ?? 0);
    }
    sfx.craft();
    this.emit('inventory');
  }

  spendCost(cost: Partial<Record<ItemId, number>>): void {
    for (const [id, n] of Object.entries(cost)) {
      this.inventory[id as ItemId] = Math.max(0, this.count(id as ItemId) - (n ?? 0));
    }
    sfx.craft();
    this.emit('inventory');
  }

  hasBuilding(id: BuildingId): boolean {
    return this.buildings.includes(id);
  }

  ensureBuilding(id: BuildingId): void {
    if (!this.buildings.includes(id)) this.buildings.push(id);
  }

  /** Schaltet einen Lexikon-Eintrag frei und gibt Wissenspunkte. */
  unlock(id: string): void {
    if (this.lexicon.includes(id) || !LEXICON[id]) return;
    this.lexicon.push(id);
    this.knowledge = Math.min(100, this.knowledge + 5);
    this.emit('lexicon', id);
    this.emit('toast', `Neu im Lexikon: ${LEXICON[id].title}`);
  }

  setQuest(n: number): void {
    this.quest = n;
    sfx.quest();
    this.emit('quest');
    this.checkQuest();
  }

  /** Wechselt in ein neues Kapitel (über Ota oder über den Kapitel-Umschalter). */
  startChapter(ch: number): void {
    if (!CHAPTERS[ch]) return;
    this.chapter = ch;
    this.quest = 0;
    // Sinnvolle Grundausstattung, falls direkt in ein höheres Kapitel gesprungen wird
    if (ch >= 2 && this.fires.length === 0) {
      this.fires.push({ x: 418, y: 296, t: Date.now() });
    }
    if (ch >= 3) {
      this.wolfTamed = true;
      if (this.count('hacke') === 0) this.inventory.hacke = 1;
      if (this.count('sichel') === 0) this.inventory.sichel = 1;
      if (this.count('tontopf') === 0 && this.count('wasser') === 0) this.inventory.tontopf = 1;
      if (this.count('getreide') < 2) this.inventory.getreide = 2;
    }
    if (ch >= 4) {
      this.ensureBuilding('toepferofen');
      this.ensureBuilding('gehege');
      this.ensureBuilding('speicher');
      this.ensureBuilding('langhaus');
      if (this.goatsTamed < 1) this.goatsTamed = 1;
      if (this.count('wolle') < 2) this.inventory.wolle = 2;
      if (this.count('getreide') < 3) this.inventory.getreide = 3;
    }
    if (ch >= 5) {
      this.ensureBuilding('webstuhl');
      if (this.count('stoff') < 1) this.inventory.stoff = 1;
    }
    if (ch >= 6) {
      this.ensureBuilding('schmelzofen');
      if (this.count('spitzhacke') === 0) this.inventory.spitzhacke = 1;
      if (this.count('kupferbeil') === 0) this.inventory.kupferbeil = 1;
    }
    sfx.quest();
    this.emit('chapterChanged', ch);
    this.emit('inventory');
    this.emit('quest');
    this.persist();
  }

  /** Prüft automatisch erfüllbare Aufgaben je Kapitel. */
  checkQuest(): void {
    const c = (k: string) => this.counts[k] ?? 0;
    let conds: Array<() => boolean> = [];

    if (this.chapter === 1) {
      conds = [
        () => false,
        () => c('beere') >= 5,
        () => c('fire') >= 1,
        () => c('trap') >= 1,
        () => c('meat') >= 1,
        () => c('cooked') >= 1,
        () => c('faustkeil') >= 1,
      ];
    } else if (this.chapter === 2) {
      conds = [
        () => false,
        () => this.wolfTamed,
        () => c('samen') >= 3,
        () => this.count('hacke') >= 1,
        () => this.count('tontopf') >= 1 || this.count('wasser') >= 1,
        () => c('watered_plot') >= 1,
        () => c('harvested_wheat') >= 1,
      ];
    } else if (this.chapter === 3) {
      conds = [
        () => false,
        () => this.hasBuilding('toepferofen'),
        () => this.hasBuilding('gehege'),
        () => this.goatsTamed >= 1,
        () => c('goat_product') >= 1,
        () => this.hasBuilding('speicher') && c('brot') >= 1,
        () => this.hasBuilding('langhaus'),
      ];
    } else if (this.chapter === 4) {
      conds = [
        () => false,
        () => this.hasBuilding('webstuhl'),
        () => c('goat_product') >= 1 || this.count('wolle') >= 1 || this.count('stoff') >= 1,
        () => c('stoff') >= 1 || this.count('stoff') >= 1 || this.count('bernstein') >= 1,
        () => c('trade_salz') >= 1 || this.count('salz') >= 1,
        () => c('trade_bernstein') >= 1 || this.count('bernstein') >= 1,
      ];
    } else if (this.chapter === 5) {
      conds = [
        () => false,
        () => this.count('spitzhacke') >= 1,
        () => this.hasBuilding('schmelzofen'),
        () => c('mined_kupfer') >= 2 || this.count('kupfererz') >= 2 || this.count('kupfer') >= 1 || this.count('kupferbeil') >= 1,
        () => c('kupfer') >= 1 || this.count('kupfer') >= 1 || this.count('kupferbeil') >= 1,
        () => c('kupferbeil') >= 1 || this.count('kupferbeil') >= 1,
      ];
    } else if (this.chapter === 6) {
      conds = [
        () => false,
        () => c('trade_zinn') >= 1 || this.count('zinn') >= 1 || this.count('bronze') >= 1 || this.count('bronzeschwert') >= 1,
        () => c('bronzeschwert') >= 1 || this.count('bronzeschwert') >= 1,
        () => this.hasBuilding('schmiede'),
        () => c('eisen') >= 1 || this.count('eisen') >= 1 || this.count('eisenwerkzeug') >= 1,
        () => c('eisenwerkzeug') >= 1 || this.count('eisenwerkzeug') >= 1,
      ];
    }

    while (this.quest < conds.length && conds[this.quest]()) {
      this.quest++;
      sfx.quest();
      this.emit('quest');
      this.emit('toast', 'Aufgabe geschafft!');
    }
  }

  /** Index der Aufgabe „Sprich mit Ota (Quiz)“ im aktuellen Kapitel. */
  quizQuestIndex(): number {
    return this.chapter <= 3 ? 7 : 6;
  }

  isReadyForQuiz(): boolean {
    return this.quest === this.quizQuestIndex() || (this.chapter >= 4 && this.quest === 7);
  }

  isChapterComplete(): boolean {
    return this.quest >= 8;
  }

  openDialog(spec: DialogSpec): void {
    sfx.click();
    this.emit('dialog', spec);
  }

  /** Isst das beste verfügbare Nahrungsmittel. */
  eat(): string {
    if (this.count('brot') > 0) {
      this.inventory.brot = this.count('brot') - 1;
      this.food = Math.min(100, this.food + 50);
      sfx.eat();
      this.emit('inventory');
      return 'Warmes Fladenbrot aus dem Dorf! (+50 Essen)';
    }
    if (this.count('gebraten') > 0) {
      this.inventory.gebraten = this.count('gebraten') - 1;
      this.food = Math.min(100, this.food + 40);
      sfx.eat();
      this.emit('inventory');
      return 'Gebratenes Fleisch macht richtig satt! (+40 Essen)';
    }
    if (this.count('milch') > 0) {
      this.inventory.milch = this.count('milch') - 1;
      this.food = Math.min(100, this.food + 25);
      sfx.eat();
      this.emit('inventory');
      return 'Frische Ziegenmilch! (+25 Essen)';
    }
    if (this.count('beere') > 0) {
      this.inventory.beere = this.count('beere') - 1;
      this.food = Math.min(100, this.food + 12);
      sfx.eat();
      this.emit('inventory');
      return 'Mmh, saftige Beeren! (+12 Essen)';
    }
    if (this.count('fleisch') > 0) {
      this.inventory.fleisch = this.count('fleisch') - 1;
      this.food = Math.min(100, this.food + 15);
      sfx.eat();
      this.emit('inventory');
      return 'Rohes Fleisch ... Am Feuer wäre es besser gewesen. (+15 Essen)';
    }
    return 'Du hast nichts zu essen.';
  }

  /** Erzeugt einen kompakten Speichercode für das Schulheft. */
  exportCode(): string {
    const compact = {
      n: this.playerName,
      c: this.chapter,
      q: this.quest,
      b: this.buildings,
      l: this.lexicon,
      i: this.inventory,
      w: this.wolfTamed ? 1 : 0,
      g: this.goatsTamed,
    };
    const json = JSON.stringify(compact);
    return 'SZ3-' + btoa(unescape(encodeURIComponent(json)));
  }

  /** Lädt einen kompakten Speichercode aus dem Schulheft. */
  importCode(raw: string): boolean {
    try {
      const cleaned = raw.trim().replace(/^SZ3-/, '');
      const json = decodeURIComponent(escape(atob(cleaned)));
      const d = JSON.parse(json);
      if (!d || typeof d.c !== 'number') return false;
      this.playerName = typeof d.n === 'string' && d.n.trim() ? d.n.trim() : 'Sippenkind';
      this.chapter = Math.max(1, Math.min(6, d.c));
      this.quest = d.q ?? 0;
      this.buildings = Array.isArray(d.b) ? d.b : [];
      this.lexicon = Array.isArray(d.l) ? d.l : [];
      this.inventory = d.i && typeof d.i === 'object' ? d.i : {};
      this.wolfTamed = Boolean(d.w);
      this.goatsTamed = Number(d.g) || 0;
      this.knowledge = Math.min(100, this.lexicon.length * 5);
      this.emit('chapterChanged', this.chapter);
      this.emit('inventory');
      this.emit('quest');
      this.persist();
      return true;
    } catch {
      return false;
    }
  }

  toSave(): SaveData {
    return {
      version: 3,
      playerName: this.playerName,
      chapter: this.chapter,
      x: this.playerX ?? 0,
      y: this.playerY ?? 0,
      inventory: { ...this.inventory } as Record<string, number>,
      lexicon: [...this.lexicon],
      food: this.food,
      safety: this.safety,
      knowledge: this.knowledge,
      quest: this.quest,
      counts: { ...this.counts },
      fires: this.fires,
      traps: this.traps,
      plots: this.plots,
      buildings: [...this.buildings],
      wolfTamed: this.wolfTamed,
      goatsTamed: this.goatsTamed,
      dayTime: this.dayTime,
      collapses: this.collapses,
      quizAttempts: this.quizAttempts,
    };
  }

  loadFrom(d: SaveData): void {
    this.playerName = d.playerName || 'Sippenkind';
    this.chapter = d.chapter ?? 1;
    this.inventory = { ...d.inventory } as Partial<Record<ItemId, number>>;
    this.lexicon = [...d.lexicon];
    this.food = d.food;
    this.safety = d.safety;
    this.knowledge = d.knowledge;
    this.quest = d.quest;
    this.counts = { ...d.counts };
    this.fires = d.fires ?? [];
    this.traps = d.traps ?? [];
    if (d.plots && d.plots.length === 6) this.plots = d.plots;
    this.buildings = d.buildings ?? [];
    this.wolfTamed = Boolean(d.wolfTamed);
    this.goatsTamed = d.goatsTamed ?? 0;
    this.dayTime = d.dayTime;
    this.collapses = d.collapses;
    this.quizAttempts = d.quizAttempts;
    this.playerX = d.x;
    this.playerY = d.y;
  }

  persist(): void {
    this.saves.save(this.toSave());
  }
}

export const state = new GameState();

