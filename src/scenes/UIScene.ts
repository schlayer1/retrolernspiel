import Phaser from 'phaser';
import { CHAPTERS, DialogNode, LEXICON } from '../data/chapter1';
import { BUILDINGS, ITEMS, ItemId, RECIPES, Recipe, TRADES, TradeOffer } from '../data/items';
import { DialogSpec, state } from '../systems/GameState';
import { TouchControls } from '../ui/TouchControls';

const FONT = 'monospace';
const W = 480;
const H = 270;

function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 9,
  color = '#ffffff',
  wrap = 0,
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, s, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      stroke: '#1a1208',
      strokeThickness: 2,
      wordWrap: wrap ? { width: wrap } : undefined,
      lineSpacing: 2,
    })
    .setScrollFactor(0);
}

/** Oberfläche über der Spielwelt: HUD, Hotbar, Dialoge, Handwerk, Tauschhandel, Lexikon, Kapitelwahl & Urkunde. */
export class UIScene extends Phaser.Scene {
  private bars!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private questText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private hotbar!: Phaser.GameObjects.Container;

  private toastBox!: Phaser.GameObjects.Container;
  private toastText!: Phaser.GameObjects.Text;
  private toastQueue: string[] = [];
  private toastBusy = false;

  private dialog!: Phaser.GameObjects.Container;
  private dlgSpeaker!: Phaser.GameObjects.Text;
  private dlgText!: Phaser.GameObjects.Text;
  private dlgOptions: Phaser.GameObjects.Text[] = [];
  private dlgMore!: Phaser.GameObjects.Text;
  private spec?: DialogSpec;
  private nodeIdx = 0;
  private questionActive = false;

  private craft!: Phaser.GameObjects.Container;
  private craftRows: Phaser.GameObjects.Text[] = [];
  private visibleRecipes: Recipe[] = [];

  private trade!: Phaser.GameObjects.Container;
  private tradeRows: Phaser.GameObjects.Text[] = [];
  private visibleTrades: TradeOffer[] = [];

  private lex!: Phaser.GameObjects.Container;
  private lexList: Phaser.GameObjects.Text[] = [];
  private lexBody!: Phaser.GameObjects.Text;
  private lexSelected = 0;

  private chapterMenu!: Phaser.GameObjects.Container;
  private cert!: Phaser.GameObjects.Container;
  private certBody!: Phaser.GameObjects.Text;
  private certCode!: Phaser.GameObjects.Text;

  private done!: Phaser.GameObjects.Container;
  private doneTitle!: Phaser.GameObjects.Text;
  private doneBody!: Phaser.GameObjects.Text;

  constructor() {
    super('UI');
  }

  create(): void {
    state.touch = new TouchControls(this) as unknown as typeof state.touch;

    this.bars = this.add.graphics().setScrollFactor(0).setDepth(1000);
    this.titleText = txt(this, 8, 5, '', 9, '#ffe9b0').setDepth(1000);
    this.questText = txt(this, 8, 18, '', 8, '#d8f0ff', 280).setDepth(1000);
    this.hintText = txt(this, W / 2, H - 24, '', 9, '#ffffff').setOrigin(0.5).setDepth(1000);
    this.clockText = txt(this, W - 8, 46, '', 8, '#ffe9b0').setOrigin(1, 0).setDepth(1000);
    this.hotbar = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);

    this.buildButtons();
    this.buildToast();
    this.buildDialog();
    this.buildCraft();
    this.buildTrade();
    this.buildLexicon();
    this.buildChapterMenu();
    this.buildCertificate();
    this.buildChapterDone();

    state.on('inventory', this.refreshHotbar, this);
    state.on('toast', this.pushToast, this);
    state.on('dialog', this.openDialog, this);
    state.on('chapterDone', this.showChapterDone, this);
    state.on('openTrade', this.openTradeModal, this);
    state.on('openCertificate', this.openCertificateModal, this);
    this.events.once('shutdown', () => {
      state.off('inventory', this.refreshHotbar, this);
      state.off('toast', this.pushToast, this);
      state.off('dialog', this.openDialog, this);
      state.off('chapterDone', this.showChapterDone, this);
      state.off('openTrade', this.openTradeModal, this);
      state.off('openCertificate', this.openCertificateModal, this);
    });

    const kb = this.input.keyboard!;
    kb.on('keydown-C', () => this.toggleCraft());
    kb.on('keydown-H', () => this.toggleTrade());
    kb.on('keydown-L', () => this.toggleLexicon());
    kb.on('keydown-K', () => this.toggleChapterMenu());
    kb.on('keydown-U', () => this.toggleCertificate());
    kb.on('keydown-F', () => !state.modal && this.pushToast(state.eat()));
    kb.on('keydown-ESC', () => this.closePanels());
    for (const k of ['E', 'SPACE', 'ENTER']) kb.on(`keydown-${k}`, () => this.advanceDialog());
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].forEach((k, i) =>
      kb.on(`keydown-${k}`, () => this.numberKey(i)),
    );

    this.refreshHotbar();
  }

  // ------------------------------------------------------------ HUD

  update(): void {
    const meta = CHAPTERS[state.chapter] ?? CHAPTERS[1];
    this.titleText.setText(meta.title);
    const qList = meta.quests;
    this.questText.setText(`Aufgabe: ${qList[Math.min(state.quest, qList.length - 1)]}`);
    this.hintText.setText(state.modal ? '' : state.hint);

    const g = this.bars;
    g.clear();
    g.fillStyle(0x1a1208, 0.65).fillRoundedRect(4, 3, 286, 38, 4);
    const rows: Array<[string, number, number]> = [
      ['Essen', state.food, 0xe0894a],
      ['Schutz', state.safety, 0x5aa6e8],
      ['Wissen', state.knowledge, 0xe8d25a],
    ];
    rows.forEach(([, val, col], i) => {
      const y = 8 + i * 10;
      g.fillStyle(0x1a1208, 0.8).fillRect(W - 78, y, 70, 7);
      g.fillStyle(val < 20 ? 0xd94040 : col, 1).fillRect(W - 77, y + 1, Math.max(0, 68 * (val / 100)), 5);
    });
    const t = state.dayTime;
    this.clockText.setText(t < 0.6 ? 'Tag' : t < 0.9 ? 'Nacht' : 'Morgen');
  }

  private labels?: Phaser.GameObjects.Text[];
  private ensureLabels(): void {
    if (this.labels) return;
    this.labels = ['Essen', 'Schutz', 'Wissen'].map((s, i) =>
      txt(this, W - 82, 6 + i * 10, s, 8, '#ffffff').setOrigin(1, 0).setDepth(1001),
    );
  }

  private refreshHotbar(): void {
    this.ensureLabels();
    this.hotbar.removeAll(true);
    let i = 0;
    (Object.keys(ITEMS) as ItemId[]).forEach((id) => {
      const n = state.count(id);
      if (n <= 0) return;
      const x = 6 + i * 21;
      const y = H - 20;
      const bg = this.add.rectangle(x, y, 20, 20, 0x1a1208, 0.8).setOrigin(0).setStrokeStyle(1, 0xe8c170, 0.85);
      const icon = this.add.image(x + 10, y + 10, `icon-${id}`).setDisplaySize(16, 16);
      if (ITEMS[id].tint) icon.setTint(ITEMS[id].tint!);
      const cnt = txt(this, x + 19, y + 11, String(n), 8, '#ffffff').setOrigin(1, 0);
      this.hotbar.add([bg, icon, cnt]);
      i++;
    });
  }

  private buildButtons(): void {
    const defs: Array<[string, () => void]> = [
      ['C', () => this.toggleCraft()],
      ['H', () => this.toggleTrade()],
      ['L', () => this.toggleLexicon()],
      ['F', () => !state.modal && this.pushToast(state.eat())],
      ['K', () => this.toggleChapterMenu()],
      ['U', () => this.toggleCertificate()],
    ];
    defs.forEach(([key, fn], i) => {
      const x = W - 150 + i * 24;
      const r = this.add
        .rectangle(x, 58, 21, 14, 0x1a1208, 0.85)
        .setOrigin(0)
        .setStrokeStyle(1, 0xe8c170)
        .setScrollFactor(0)
        .setDepth(1000)
        .setInteractive({ useHandCursor: true });
      r.on('pointerdown', fn);
      txt(this, x + 10.5, 61, key, 9, '#e8c170').setOrigin(0.5, 0).setDepth(1001);
    });
    txt(this, W - 4, 74, 'C Bau · H Handel · L Lexikon · F Essen · K Epoche · U Urkunde', 7, '#ffe9b0')
      .setOrigin(1, 0)
      .setDepth(1001);
  }

  // ------------------------------------------------------------ Meldungen

  private buildToast(): void {
    const bg = this.add.rectangle(0, 0, 320, 18, 0x1a1208, 0.92).setStrokeStyle(1, 0xe8c170);
    this.toastText = txt(this, 0, 0, '', 9, '#ffe9b0').setOrigin(0.5).setScrollFactor(1);
    this.toastBox = this.add.container(W / 2, 46, [bg, this.toastText]).setScrollFactor(0).setDepth(3000).setAlpha(0);
  }

  private pushToast(msg: string): void {
    this.toastQueue.push(msg);
    if (!this.toastBusy) this.nextToast();
  }

  private nextToast(): void {
    const msg = this.toastQueue.shift();
    if (!msg) {
      this.toastBusy = false;
      return;
    }
    this.toastBusy = true;
    this.toastText.setText(msg);
    (this.toastBox.list[0] as Phaser.GameObjects.Rectangle).width = Math.max(120, this.toastText.width + 20);
    this.tweens.add({ targets: this.toastBox, alpha: 1, duration: 150 });
    this.time.delayedCall(2500, () => {
      this.tweens.add({ targets: this.toastBox, alpha: 0, duration: 200, onComplete: () => this.nextToast() });
    });
  }

  // ------------------------------------------------------------ Dialog

  private setModal(on: boolean): void {
    if (state.modal && !on) state.lastModalClose = performance.now();
    state.modal = on;
  }

  private buildDialog(): void {
    const bg = this.add.rectangle(20, 148, 440, 108, 0xf3e6c4, 0.97).setOrigin(0).setStrokeStyle(2, 0x5a3a1a);
    bg.setInteractive();
    bg.on('pointerdown', () => this.advanceDialog());
    this.dlgSpeaker = txt(this, 30, 152, '', 9, '#7a3b10').setStroke('#f3e6c4', 0);
    this.dlgText = txt(this, 30, 166, '', 9, '#2a1d10', 420).setStroke('#f3e6c4', 0);
    this.dlgMore = txt(this, 450, 244, '▼ E', 8, '#7a3b10').setOrigin(1, 0).setStroke('#f3e6c4', 0);
    const items: Phaser.GameObjects.GameObject[] = [bg, this.dlgSpeaker, this.dlgText, this.dlgMore];
    for (let i = 0; i < 4; i++) {
      const o = txt(this, 34, 202 + i * 12, '', 8, '#2a1d10', 410).setStroke('#f3e6c4', 0);
      o.setInteractive({ useHandCursor: true });
      o.on('pointerdown', () => this.answer(i));
      this.dlgOptions.push(o);
      items.push(o);
    }
    this.dialog = this.add.container(0, 0, items).setScrollFactor(0).setDepth(2000).setVisible(false);
  }

  private openDialog(spec: DialogSpec): void {
    if (state.modal) return;
    this.spec = spec;
    this.nodeIdx = 0;
    this.dialog.setVisible(true);
    this.setModal(true);
    this.showNode();
  }

  private showNode(): void {
    const node: DialogNode = this.spec!.nodes[this.nodeIdx];
    this.dlgSpeaker.setText(this.spec!.speaker);
    this.dlgOptions.forEach((o) => o.setText('').setVisible(false));
    if ('question' in node) {
      this.questionActive = true;
      this.dlgText.setText(node.question);
      this.dlgMore.setVisible(false);
      node.options.forEach((opt, i) => this.dlgOptions[i].setText(`${i + 1}) ${opt}`).setVisible(true));
    } else {
      this.questionActive = false;
      this.dlgText.setText(node.text);
      this.dlgMore.setVisible(true);
    }
  }

  private numberKey(i: number): void {
    if (this.dialog.visible && this.questionActive) this.answer(i);
    else if (this.craft.visible) this.craftRecipe(i);
    else if (this.trade.visible) this.executeTradeIndex(i);
    else if (this.chapterMenu.visible && i < 6) {
      this.closePanels();
      state.startChapter(i + 1);
    } else if (this.lex.visible) this.selectLexicon(i);
  }

  private answer(i: number): void {
    if (!this.dialog.visible || !this.questionActive) return;
    const node = this.spec!.nodes[this.nodeIdx];
    if (!('question' in node) || i >= node.options.length) return;
    if (i === node.correct) {
      this.questionActive = false;
      this.dlgOptions.forEach((o) => o.setVisible(false));
      this.dlgText.setText(`Richtig! ${node.explain}`);
      this.dlgMore.setVisible(true);
    } else {
      state.quizAttempts++;
      this.dlgText.setText(`${node.question}\n\nNicht ganz. Überleg nochmal!`);
    }
  }

  private advanceDialog(): void {
    if (!this.dialog.visible || this.questionActive) return;
    this.nodeIdx++;
    if (this.nodeIdx >= this.spec!.nodes.length) {
      const done = this.spec!.onDone;
      this.dialog.setVisible(false);
      this.spec = undefined;
      this.setModal(false);
      done?.();
    } else {
      this.showNode();
    }
  }

  // ------------------------------------------------------------ Handwerk (C) – 2 Spalten für bis zu 15 Rezepte

  private buildCraft(): void {
    const bg = this.add.rectangle(18, 16, 444, 234, 0x2a1d10, 0.97).setOrigin(0).setStrokeStyle(2, 0xe8c170);
    const title = txt(
      this,
      28,
      22,
      'Handwerk, Weben & Metallguss  (Klicken oder Tasten 1–9, Esc)',
      9,
      '#ffe9b0',
    );
    const items: Phaser.GameObjects.GameObject[] = [bg, title];
    for (let i = 0; i < 16; i++) {
      const col = i < 8 ? 0 : 1;
      const rowIdx = i % 8;
      const x = 28 + col * 218;
      const y = 40 + rowIdx * 25;
      const row = txt(this, x, y, '', 7, '#ffffff', 210);
      row.setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => this.craftRecipe(i));
      this.craftRows.push(row);
      items.push(row);
    }
    this.craft = this.add.container(0, 0, items).setScrollFactor(0).setDepth(2000).setVisible(false);
  }

  private refreshCraft(): void {
    this.visibleRecipes = RECIPES.filter((r) => r.minChapter <= state.chapter);
    this.craftRows.forEach((row, i) => {
      const r = this.visibleRecipes[i];
      if (!r) {
        row.setText('').setVisible(false);
        return;
      }
      const cost = Object.entries(r.cost)
        .map(([id, n]) => `${n}× ${ITEMS[id as ItemId].name}(${state.count(id as ItemId)})`)
        .join(', ');
      const bReq = r.requiresBuilding
        ? ` [${BUILDINGS.find((b) => b.id === r.requiresBuilding)?.name ?? r.requiresBuilding}]`
        : '';
      const hasBld = !r.requiresBuilding || state.hasBuilding(r.requiresBuilding);
      const canMat = state.canAfford(r);
      const color = canMat && hasBld ? '#bfffbf' : !hasBld ? '#ffcc88' : '#a89988';
      row
        .setText(`${i + 1}) ${r.name}${bReq}\n   ${cost}`)
        .setColor(color)
        .setVisible(true);
    });
  }

  private toggleCraft(): void {
    if (this.craft.visible) return this.closePanels();
    if (state.modal) return;
    this.refreshCraft();
    this.craft.setVisible(true);
    this.setModal(true);
  }

  private craftRecipe(i: number): void {
    const r = this.visibleRecipes[i];
    if (!this.craft.visible || !r) return;
    if (r.requiresBuilding && !state.hasBuilding(r.requiresBuilding)) {
      const bName = BUILDINGS.find((b) => b.id === r.requiresBuilding)?.name ?? r.requiresBuilding;
      this.closePanels();
      this.pushToast(`Baue zuerst „${bName}“ an einem Bauplatz im Dorf!`);
      return;
    }
    const ok = state.canAfford(r);
    this.closePanels();
    if (ok) state.emit('craft', r.id);
    else this.pushToast('Dafür fehlt dir noch Material.');
  }

  // ------------------------------------------------------------ Tauschhandel (H / Fernhändler Enki)

  private buildTrade(): void {
    const bg = this.add.rectangle(44, 24, 392, 216, 0x2a1d10, 0.97).setOrigin(0).setStrokeStyle(2, 0xffd86b);
    const title = txt(this, 56, 30, 'Fernhändler Enki: Tauschhandel ohne Münzgeld (H / Esc)', 9, '#ffd86b');
    const sub = txt(
      this,
      56,
      44,
      'In der Stein- und Bronzezeit tauschte man Dorf-Überschüsse direkt Ware gegen Ware:',
      7,
      '#ffe9b0',
    );
    const items: Phaser.GameObjects.GameObject[] = [bg, title, sub];
    for (let i = 0; i < 6; i++) {
      const row = txt(this, 56, 62 + i * 28, '', 8, '#ffffff', 368);
      row.setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => this.executeTradeIndex(i));
      this.tradeRows.push(row);
      items.push(row);
    }
    this.trade = this.add.container(0, 0, items).setScrollFactor(0).setDepth(2000).setVisible(false);
  }

  private refreshTrade(): void {
    this.visibleTrades = TRADES.filter((t) => t.minChapter <= state.chapter);
    this.tradeRows.forEach((row, i) => {
      const t = this.visibleTrades[i];
      if (!t) {
        row.setText('').setVisible(false);
        return;
      }
      const giveStr = Object.entries(t.give)
        .map(([id, n]) => `${n}× ${ITEMS[id as ItemId].name} (du hast ${state.count(id as ItemId)})`)
        .join(', ');
      const recStr = `${t.receive.count}× ${ITEMS[t.receive.item].name}`;
      const ok = state.canAffordTrade(t);
      row
        .setText(`${i + 1}) Gib ${giveStr}  ➔  Erhalte ${recStr}\n   ${t.desc}`)
        .setColor(ok ? '#bfffbf' : '#a89988')
        .setVisible(true);
    });
  }

  private openTradeModal(): void {
    if (state.chapter < 4) {
      this.pushToast('Fernhändler Enki reist erst ab Kapitel 4 (Handel & Dorf) an!');
      return;
    }
    this.closePanels();
    this.refreshTrade();
    this.trade.setVisible(true);
    this.setModal(true);
  }

  private toggleTrade(): void {
    if (this.trade.visible) return this.closePanels();
    if (state.modal) return;
    this.openTradeModal();
  }

  private executeTradeIndex(i: number): void {
    const t = this.visibleTrades[i];
    if (!this.trade.visible || !t) return;
    if (!state.canAffordTrade(t)) {
      this.pushToast('Dir fehlen noch die Tauschwaren aus eurem Dorf.');
      return;
    }
    state.executeTrade(t);
    this.refreshTrade();
    this.pushToast(`Getauscht: +${t.receive.count}× ${ITEMS[t.receive.item].name}!`);
  }

  // ------------------------------------------------------------ Lexikon (L) – 22 Einträge in 2 Spalten

  private buildLexicon(): void {
    const bg = this.add.rectangle(16, 16, 448, 234, 0xf3e6c4, 0.98).setOrigin(0).setStrokeStyle(2, 0x5a3a1a);
    const title = txt(this, 26, 22, 'Lexikon: Wissen der Menschheitsgeschichte (L / Esc)', 9, '#7a3b10').setStroke(
      '#f3e6c4',
      0,
    );
    this.lexBody = txt(this, 248, 44, '', 8, '#2a1d10', 206).setStroke('#f3e6c4', 0);
    const items: Phaser.GameObjects.GameObject[] = [bg, title, this.lexBody];
    Object.keys(LEXICON).forEach((_, i) => {
      const col = i < 11 ? 0 : 1;
      const row = i % 11;
      const x = 24 + col * 110;
      const y = 42 + row * 18;
      const t = txt(this, x, y, '', 7, '#2a1d10').setStroke('#f3e6c4', 0);
      t.setInteractive({ useHandCursor: true });
      t.on('pointerdown', () => this.selectLexicon(i));
      this.lexList.push(t);
      items.push(t);
    });
    this.lex = this.add.container(0, 0, items).setScrollFactor(0).setDepth(2000).setVisible(false);
  }

  private selectLexicon(i: number): void {
    const ids = Object.keys(LEXICON);
    if (i < 0 || i >= ids.length) return;
    this.lexSelected = i;
    ids.forEach((id, idx) => {
      const known = state.lexicon.includes(id);
      const shortTitle = known ? LEXICON[id].title.slice(0, 15) : '???';
      this.lexList[idx]
        .setText(`${idx === i ? '▶' : ' '} ${shortTitle}`)
        .setColor(known ? '#2a1d10' : '#8a7a68');
    });
    const id = ids[i];
    this.lexBody.setText(
      state.lexicon.includes(id)
        ? `${LEXICON[id].title}\n\n${LEXICON[id].text}`
        : 'Noch nicht entdeckt.\n\nErkunde die Welt, sprich mit Ota, tausche mit Enki und probiere neue Werkzeuge aus!',
    );
  }

  private toggleLexicon(): void {
    if (this.lex.visible) return this.closePanels();
    if (state.modal) return;
    this.selectLexicon(this.lexSelected);
    this.lex.setVisible(true);
    this.setModal(true);
  }

  // ------------------------------------------------------------ Kapitel-Auswahl & Hefter-Speichercode (K)

  private buildChapterMenu(): void {
    const bg = this.add.rectangle(24, 16, 432, 236, 0x2a1d10, 0.97).setOrigin(0).setStrokeStyle(2, 0xe8c170);
    const title = txt(
      this,
      36,
      22,
      'Epoche / Kapitel direkt wählen (1–6) & Hefter-Speichercode (Esc)',
      9,
      '#ffe9b0',
    );
    const items: Phaser.GameObjects.GameObject[] = [bg, title];
    [1, 2, 3, 4, 5, 6].forEach((ch, idx) => {
      const meta = CHAPTERS[ch];
      const col = idx < 3 ? 0 : 1;
      const rIdx = idx % 3;
      const x = 36 + col * 208;
      const y = 42 + rIdx * 48;
      const row = txt(
        this,
        x,
        y,
        `${ch}) ${meta.title}\n   ${meta.subtitle}\n   ${meta.era}`,
        7,
        '#bfffbf',
        198,
      );
      row.setInteractive({ useHandCursor: true });
      row.on('pointerdown', () => {
        this.closePanels();
        state.startChapter(ch);
      });
      items.push(row);
    });

    // Aktions-Buttons unten im Kapitelmenü: Name ändern, Code kopieren, Code laden, Urkunde
    const actions: Array<[string, () => void]> = [
      [
        '✎ Name ändern',
        () => {
          const n = window.prompt('Dein Vorname für die Epochen-Urkunde:', state.playerName);
          if (n && n.trim()) {
            state.playerName = n.trim();
            state.persist();
            this.pushToast(`Name gespeichert: ${state.playerName}`);
          }
        },
      ],
      [
        '📋 Hefter-Code kopieren',
        () => {
          const code = state.exportCode();
          window.prompt('Kopiere diesen kurzen Speichercode in deinen Geschichtshefter:', code);
        },
      ],
      [
        '📂 Hefter-Code laden',
        () => {
          const code = window.prompt('Füge hier deinen Speichercode (SZ3-...) aus dem Hefter ein:');
          if (code) {
            this.closePanels();
            if (state.importCode(code)) {
              this.pushToast('Spielstand aus Hefter-Code erfolgreich geladen!');
            } else {
              this.pushToast('Ungültiger Speichercode.');
            }
          }
        },
      ],
      [
        '📜 Epochen-Urkunde',
        () => {
          this.closePanels();
          this.openCertificateModal();
        },
      ],
    ];

    actions.forEach(([label, fn], idx) => {
      const bx = 36 + idx * 102;
      const by = 198;
      const btn = this.add
        .rectangle(bx, by, 96, 22, 0x47321d, 1)
        .setOrigin(0)
        .setStrokeStyle(1, 0xe8c170)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerdown', fn);
      const bTxt = txt(this, bx + 48, by + 6, label, 7, '#ffe9b0').setOrigin(0.5, 0);
      items.push(btn, bTxt);
    });

    this.chapterMenu = this.add.container(0, 0, items).setScrollFactor(0).setDepth(2000).setVisible(false);
  }

  private toggleChapterMenu(): void {
    if (this.chapterMenu.visible) return this.closePanels();
    if (state.modal) return;
    this.chapterMenu.setVisible(true);
    this.setModal(true);
  }

  // ------------------------------------------------------------ Epochen-Urkunde (U)

  private buildCertificate(): void {
    const bg = this.add.rectangle(20, 14, 440, 240, 0xf6ebd2, 0.99).setOrigin(0).setStrokeStyle(3, 0x7a3b10);
    const innerBorder = this.add
      .rectangle(25, 19, 430, 230, 0x000000, 0)
      .setOrigin(0)
      .setStrokeStyle(1, 0xb8860b);
    const title = txt(
      this,
      W / 2,
      26,
      '★ EPOCHEN-URKUNDE: VOM JÄGER ZUM SCHMIED ★',
      10,
      '#7a3b10',
    )
      .setOrigin(0.5, 0)
      .setStroke('#f6ebd2', 0);

    this.certBody = txt(this, 36, 48, '', 8, '#2a1d10', 408).setStroke('#f6ebd2', 0);
    this.certCode = txt(this, 36, 196, '', 7, '#5a3a1a', 408).setStroke('#f6ebd2', 0);

    const btnName = this.add
      .rectangle(36, 222, 118, 22, 0x5a3a1a, 1)
      .setOrigin(0)
      .setStrokeStyle(1, 0xe8c170)
      .setInteractive({ useHandCursor: true });
    btnName.on('pointerdown', () => {
      const n = window.prompt('Dein Vorname für die Urkunde:', state.playerName);
      if (n && n.trim()) {
        state.playerName = n.trim();
        state.persist();
        this.refreshCertificate();
      }
    });
    const txtName = txt(this, 95, 228, '✎ Name eintragen', 8, '#ffe9b0').setOrigin(0.5, 0);

    const btnPrint = this.add
      .rectangle(168, 222, 136, 22, 0x3b5e2b, 1)
      .setOrigin(0)
      .setStrokeStyle(1, 0xe8c170)
      .setInteractive({ useHandCursor: true });
    btnPrint.on('pointerdown', () => window.print());
    const txtPrint = txt(this, 236, 228, '🖨 Urkunde drucken', 8, '#ffffff').setOrigin(0.5, 0);

    const btnClose = this.add
      .rectangle(318, 222, 124, 22, 0x7a3b10, 1)
      .setOrigin(0)
      .setStrokeStyle(1, 0xe8c170)
      .setInteractive({ useHandCursor: true });
    btnClose.on('pointerdown', () => this.closePanels());
    const txtClose = txt(this, 380, 228, 'Schließen (Esc)', 8, '#ffe9b0').setOrigin(0.5, 0);

    this.cert = this.add
      .container(0, 0, [
        bg,
        innerBorder,
        title,
        this.certBody,
        this.certCode,
        btnName,
        txtName,
        btnPrint,
        txtPrint,
        btnClose,
        txtClose,
      ])
      .setScrollFactor(0)
      .setDepth(3500)
      .setVisible(false);
  }

  private refreshCertificate(): void {
    const lexTotal = Object.keys(LEXICON).length;
    const lexCount = state.lexicon.length;
    const bldCount = state.buildings.length;
    const score = lexCount * 4 + bldCount * 6 + state.chapter * 5 - state.quizAttempts * 2 - state.collapses * 3;
    const rank =
      score >= 85 || (state.chapter === 6 && bldCount >= 6)
        ? 'Rang S – Meister/in der Menschheitsgeschichte'
        : score >= 50 || state.chapter >= 4
          ? 'Rang A – Kundige/r Dorfgründer/in & Schmied/in'
          : 'Rang B – Tapfere/r Entdecker/in der Urgeschichte';

    const builtNames =
      state.buildings.map((id) => BUILDINGS.find((b) => b.id === id)?.name ?? id).join(', ') || 'Noch im Aufbau';

    this.certBody.setText(
      [
        `Name: ${state.playerName}     |     Erreichte Epoche: ${CHAPTERS[state.chapter].title}`,
        `Auszeichnung: ${rank}`,
        '',
        `• Entdecktes Lexikon-Wissen: ${lexCount} von ${lexTotal} Einträgen (${state.knowledge}% Wissen)`,
        `• Errichtete Dorf-Bauwerke (${bldCount}/${BUILDINGS.length}): ${builtNames}`,
        `• Haustiere & Begleiter: ${state.wolfTamed ? 'Hütehund Lupo' : '–'}, ${state.goatsTamed}× gezähmte Ziege(n)`,
        `• Quiz-Fehlversuche: ${state.quizAttempts}   |   Erschöpfungen: ${state.collapses}`,
        '',
        'Fachliche Zusammenfassung für den Geschichtshefter:',
        'Altsteinzeit (Jäger & Sammler, Faustkeil, Feuer) ➔ Jungsteinzeit (Sesshaftwerdung, Ackerbau,',
        'Viehzucht, Arbeitsteilung, Tauschhandel) ➔ Metallzeit (Kupferbeil/Ötzi, Bronze aus Kupfer+Zinn, Eisen).',
      ].join('\n'),
    );
    const code = state.exportCode();
    this.certCode.setText(`Hefter-Speichercode: ${code.slice(0, 62)}${code.length > 62 ? '...' : ''}`);
  }

  private openCertificateModal(): void {
    this.closePanels();
    this.refreshCertificate();
    this.cert.setVisible(true);
    this.setModal(true);
  }

  private toggleCertificate(): void {
    if (this.cert.visible) return this.closePanels();
    if (state.modal) return;
    this.openCertificateModal();
  }

  // ------------------------------------------------------------ Sonstiges

  private closePanels(): void {
    if (this.craft.visible || this.trade.visible || this.lex.visible || this.chapterMenu.visible || this.cert.visible) {
      this.craft.setVisible(false);
      this.trade.setVisible(false);
      this.lex.setVisible(false);
      this.chapterMenu.setVisible(false);
      this.cert.setVisible(false);
      this.setModal(false);
    }
  }

  private buildChapterDone(): void {
    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.85).setOrigin(0).setInteractive();
    this.doneTitle = txt(this, W / 2, 68, 'Kapitel geschafft!', 16, '#ffe9b0').setOrigin(0.5);
    this.doneBody = txt(this, W / 2, 108, '', 9, '#ffffff', 380).setOrigin(0.5, 0).setAlign('center');
    this.done = this.add
      .container(0, 0, [bg, this.doneTitle, this.doneBody])
      .setScrollFactor(0)
      .setDepth(4000)
      .setVisible(false);
    const close = () => {
      if (!this.done.visible) return;
      this.done.setVisible(false);
      this.setModal(false);
      if (state.chapter < 6) {
        state.startChapter(state.chapter + 1);
      } else {
        this.openCertificateModal();
      }
    };
    bg.on('pointerdown', close);
    this.input.keyboard!.on('keydown-E', close);
  }

  private showChapterDone(): void {
    const ch = state.chapter;
    this.doneTitle.setText(`${CHAPTERS[ch].title} geschafft!`);
    const nextHint =
      ch < 6
        ? `Tippe oder drücke E, um direkt mit ${CHAPTERS[ch + 1].title} weiterzumachen!`
        : 'Du hast alle 6 Epochen gemeistert! Tippe oder drücke E für deine persönliche Epochen-Urkunde!';
    this.doneBody.setText(
      `Du hast alle Aufgaben dieser Epoche gemeistert und das Abschlussquiz gelöst.\n\n${nextHint}`,
    );
    this.done.setVisible(true);
    this.setModal(true);
  }
}

