import Phaser from 'phaser';
import { CHAPTERS, DialogNode, EPOCH_COMPARISON, HIGHLIGHT_TERMS, LEXICON } from '../data/chapter1';
import { BUILDINGS, ITEMS, ItemId, RECIPES, Recipe, TRADES, TradeOffer } from '../data/items';
import { DialogSpec, state } from '../systems/GameState';
import { TouchControls } from '../ui/TouchControls';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const TERM_REGEX = new RegExp(
  `(${[...HIGHLIGHT_TERMS]
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')})`,
  'gi',
);

/** Hebt historische Fachbegriffe für die 5./6. Klasse farblich hervor. */
function highlightTerms(raw: string): string {
  return escapeHtml(raw).replace(TERM_REGEX, '<span class="term-highlight">$1</span>');
}

/** Liest einen Text per Web Speech API (Deutsch) vor. */
function speakGerman(text: string): void {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'de-DE';
  u.rate = 0.96;
  window.speechSynthesis.speak(u);
}

function stopSpeech(): void {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

type ActivePanel = 'none' | 'craft' | 'trade' | 'lexicon' | 'timeline' | 'chapter' | 'cert' | 'done' | 'milestone';

/**
 * Gestochen scharfe HTML/CSS-Oberfläche über der 16-Bit-Spielwelt:
 * HUD mit Ziel-Kompass, Hotbar, Dialoge mit Vorlese-Funktion, Entdecker-Karten,
 * Handwerk, Tauschhandel, illustriertes Lexikon, Epochen-Vergleichstabelle & Urkunde.
 */
export class UIScene extends Phaser.Scene {
  private root!: HTMLElement;
  private titleEl!: HTMLElement;
  private questEl!: HTMLElement;
  private compassEl!: HTMLElement;
  private foodBar!: HTMLElement;
  private safetyBar!: HTMLElement;
  private knowBar!: HTMLElement;
  private clockEl!: HTMLElement;
  private hintEl!: HTMLElement;
  private hotbarEl!: HTMLElement;
  private toastEl!: HTMLElement;

  private dialogEl!: HTMLElement;
  private dlgSpeakerEl!: HTMLElement;
  private dlgTextEl!: HTMLElement;
  private dlgOptsEl!: HTMLElement;
  private dlgNextBtn!: HTMLButtonElement;
  private dlgSpeakBtn!: HTMLButtonElement;

  private backdropEl!: HTMLElement;
  private modalCardEl!: HTMLElement;
  private modalTitleEl!: HTMLElement;
  private modalBodyEl!: HTMLElement;
  private modalFooterEl!: HTMLElement;

  private activePanel: ActivePanel = 'none';
  private lexSelected = 'sippe';
  private milestoneQueue: string[] = [];

  private toastQueue: string[] = [];
  private toastBusy = false;

  private spec?: DialogSpec;
  private nodeIdx = 0;
  private questionActive = false;
  private visibleRecipes: Recipe[] = [];
  private visibleTrades: TradeOffer[] = [];

  constructor() {
    super('UI');
  }

  create(): void {
    state.touch = new TouchControls(this) as unknown as typeof state.touch;
    this.mountDOM();

    state.on('inventory', this.refreshHotbar, this);
    state.on('toast', this.pushToast, this);
    state.on('dialog', this.openDialog, this);
    state.on('chapterDone', this.showChapterDone, this);
    state.on('openTrade', this.openTradeModal, this);
    state.on('openCertificate', this.openCertificateModal, this);
    state.on('milestone', this.enqueueMilestone, this);

    this.events.once('shutdown', () => {
      state.off('inventory', this.refreshHotbar, this);
      state.off('toast', this.pushToast, this);
      state.off('dialog', this.openDialog, this);
      state.off('chapterDone', this.showChapterDone, this);
      state.off('openTrade', this.openTradeModal, this);
      state.off('openCertificate', this.openCertificateModal, this);
      state.off('milestone', this.enqueueMilestone, this);
    });

    const kb = this.input.keyboard!;
    kb.on('keydown-C', () => this.togglePanel('craft'));
    kb.on('keydown-H', () => this.togglePanel('trade'));
    kb.on('keydown-L', () => this.togglePanel('lexicon'));
    kb.on('keydown-Z', () => this.togglePanel('timeline'));
    kb.on('keydown-K', () => this.togglePanel('chapter'));
    kb.on('keydown-U', () => this.togglePanel('cert'));
    kb.on('keydown-F', () => !state.modal && this.pushToast(state.eat()));
    kb.on('keydown-ESC', () => this.closePanels());
    for (const k of ['E', 'SPACE', 'ENTER']) {
      kb.on(`keydown-${k}`, () => {
        if (this.dialogEl.classList.contains('open')) this.advanceDialog();
        else if (this.activePanel === 'milestone') this.closePanels();
        else if (this.activePanel === 'done') this.finishChapterDone();
      });
    }
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].forEach((k, i) =>
      kb.on(`keydown-${k}`, () => this.numberKey(i)),
    );

    this.refreshHotbar();
    const pParam = new URLSearchParams(location.search).get('panel') as ActivePanel | null;
    if (pParam && ['craft', 'trade', 'lexicon', 'timeline', 'chapter', 'cert'].includes(pParam)) {
      this.togglePanel(pParam);
    }
  }

  private mountDOM(): void {
    const existing = document.getElementById('ui-root');
    this.root = existing ?? document.createElement('div');
    this.root.id = 'ui-root';
    if (!existing) document.body.appendChild(this.root);

    this.root.innerHTML = `
      <div class="hud-top">
        <div class="hud-quest-box">
          <div class="hud-chapter-title" id="hud-title"></div>
          <div class="hud-quest-text" id="hud-quest"></div>
          <div class="hud-compass" id="hud-compass"></div>
        </div>
        <div class="hud-right">
          <div class="hud-bars-card">
            <div class="hud-bar-row">
              <span>🍖 Essen</span>
              <div class="hud-bar-track"><div class="hud-bar-fill" id="bar-food" style="background:#e0894a;width:85%"></div></div>
            </div>
            <div class="hud-bar-row">
              <span>🛡️ Schutz</span>
              <div class="hud-bar-track"><div class="hud-bar-fill" id="bar-safety" style="background:#5aa6e8;width:85%"></div></div>
            </div>
            <div class="hud-bar-row">
              <span>📖 Wissen</span>
              <div class="hud-bar-track"><div class="hud-bar-fill" id="bar-know" style="background:#e8d25a;width:0%"></div></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:11px;color:#ffe9b0;margin-top:2px;">
              <span id="hud-lex-count">Lexikon: 0/27</span>
              <span id="hud-clock">☀️ Tag</span>
            </div>
          </div>
          <div class="hud-btn-row">
            <button class="retro-btn" data-act="craft"><span class="key-badge">C</span> Handwerk</button>
            <button class="retro-btn" data-act="trade"><span class="key-badge">H</span> Handel</button>
            <button class="retro-btn" data-act="lexicon"><span class="key-badge">L</span> Lexikon</button>
            <button class="retro-btn" data-act="timeline"><span class="key-badge">Z</span> Zeitstrahl</button>
            <button class="retro-btn" data-act="eat"><span class="key-badge">F</span> Essen</button>
            <button class="retro-btn" data-act="chapter"><span class="key-badge">K</span> Epoche</button>
            <button class="retro-btn" data-act="cert"><span class="key-badge">U</span> Urkunde</button>
          </div>
        </div>
      </div>

      <div class="hud-toast" id="hud-toast"></div>

      <div class="hud-bottom">
        <div class="hud-hint-pill" id="hud-hint" style="display:none"></div>
        <div class="hud-hotbar" id="hud-hotbar"></div>
      </div>

      <div class="dialog-dock" id="dlg-dock">
        <div class="dialog-speaker-row">
          <span class="dialog-speaker" id="dlg-speaker"></span>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="retro-btn" id="dlg-speak-btn" style="padding:3px 8px;font-size:12px;">🔊 Vorlesen</button>
            <button class="retro-btn" id="dlg-next-btn" style="padding:3px 10px;font-size:12px;">Weiter (E) ▼</button>
          </div>
        </div>
        <div class="dialog-text" id="dlg-text"></div>
        <div class="dialog-options" id="dlg-opts"></div>
      </div>

      <div class="modal-backdrop" id="modal-backdrop">
        <div class="modal-card" id="modal-card">
          <div class="modal-header">
            <h2 class="modal-title" id="modal-title"></h2>
            <button class="retro-btn no-print" id="modal-close-btn">✕ Schließen (Esc)</button>
          </div>
          <div class="modal-body" id="modal-body"></div>
          <div class="modal-footer no-print" id="modal-footer"></div>
        </div>
      </div>
    `;

    this.titleEl = this.root.querySelector('#hud-title')!;
    this.questEl = this.root.querySelector('#hud-quest')!;
    this.compassEl = this.root.querySelector('#hud-compass')!;
    this.foodBar = this.root.querySelector('#bar-food')!;
    this.safetyBar = this.root.querySelector('#bar-safety')!;
    this.knowBar = this.root.querySelector('#bar-know')!;
    this.clockEl = this.root.querySelector('#hud-clock')!;
    this.hintEl = this.root.querySelector('#hud-hint')!;
    this.hotbarEl = this.root.querySelector('#hud-hotbar')!;
    this.toastEl = this.root.querySelector('#hud-toast')!;

    this.dialogEl = this.root.querySelector('#dlg-dock')!;
    this.dlgSpeakerEl = this.root.querySelector('#dlg-speaker')!;
    this.dlgTextEl = this.root.querySelector('#dlg-text')!;
    this.dlgOptsEl = this.root.querySelector('#dlg-opts')!;
    this.dlgNextBtn = this.root.querySelector('#dlg-next-btn')!;
    this.dlgSpeakBtn = this.root.querySelector('#dlg-speak-btn')!;

    this.backdropEl = this.root.querySelector('#modal-backdrop')!;
    this.modalCardEl = this.root.querySelector('#modal-card')!;
    this.modalTitleEl = this.root.querySelector('#modal-title')!;
    this.modalBodyEl = this.root.querySelector('#modal-body')!;
    this.modalFooterEl = this.root.querySelector('#modal-footer')!;

    this.root.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = (btn as HTMLElement).dataset.act;
        if (act === 'eat') {
          if (!state.modal) this.pushToast(state.eat());
        } else if (act) {
          this.togglePanel(act as ActivePanel);
        }
      });
    });

    this.dlgNextBtn.addEventListener('click', () => this.advanceDialog());
    this.dlgSpeakBtn.addEventListener('click', () => {
      if (!this.spec) return;
      const node = this.spec.nodes[this.nodeIdx];
      speakGerman('question' in node ? `${node.question} ${node.options.join('. ')}` : node.text);
    });

    this.root.querySelector('#modal-close-btn')!.addEventListener('click', () => {
      if (this.activePanel === 'done') this.finishChapterDone();
      else this.closePanels();
    });
    this.backdropEl.addEventListener('click', (e) => {
      if (e.target === this.backdropEl) {
        if (this.activePanel === 'done') this.finishChapterDone();
        else this.closePanels();
      }
    });
  }

  // ------------------------------------------------------------ HUD Update

  update(): void {
    const meta = CHAPTERS[state.chapter] ?? CHAPTERS[1];
    this.titleEl.textContent = `${meta.title} · ${meta.era}`;
    const qList = meta.quests;
    const rawQuest = qList[Math.min(state.quest, qList.length - 1)];
    this.questEl.innerHTML = `<strong>Aufgabe:</strong> ${highlightTerms(rawQuest)}`;

    if (state.compassText) {
      this.compassEl.style.display = 'block';
      this.compassEl.textContent = state.compassText;
    } else {
      this.compassEl.style.display = 'none';
    }

    this.foodBar.style.width = `${Math.max(0, Math.min(100, state.food))}%`;
    this.foodBar.style.background = state.food < 20 ? '#ef4444' : '#e0894a';
    this.safetyBar.style.width = `${Math.max(0, Math.min(100, state.safety))}%`;
    this.safetyBar.style.background = state.safety < 20 ? '#ef4444' : '#5aa6e8';
    this.knowBar.style.width = `${Math.max(0, Math.min(100, state.knowledge))}%`;

    const lexCnt = this.root.querySelector('#hud-lex-count');
    if (lexCnt) lexCnt.textContent = `Lexikon: ${state.lexicon.length}/${Object.keys(LEXICON).length}`;

    const t = state.dayTime;
    this.clockEl.textContent = t < 0.6 ? '☀️ Tag' : t < 0.9 ? '🌙 Nacht' : '🌅 Morgen';

    if (!state.modal && state.hint) {
      this.hintEl.style.display = 'block';
      this.hintEl.textContent = state.hint;
    } else {
      this.hintEl.style.display = 'none';
    }
  }

  private refreshHotbar(): void {
    if (!this.hotbarEl) return;
    const parts: string[] = [];
    (Object.keys(ITEMS) as ItemId[]).forEach((id) => {
      const n = state.count(id);
      if (n <= 0) return;
      parts.push(`
        <div class="hotbar-slot" title="${escapeHtml(ITEMS[id].name)}">
          <img class="pixel-icon" src="assets/icons/${id}.png" alt="${escapeHtml(ITEMS[id].name)}" style="width:18px;height:18px;" />
          <span>${escapeHtml(ITEMS[id].name)}: <strong>${n}</strong></span>
        </div>
      `);
    });
    this.hotbarEl.innerHTML = parts.join('');
  }

  // ------------------------------------------------------------ Toasts

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
    this.toastEl.textContent = msg;
    this.toastEl.classList.add('visible');
    this.time.delayedCall(2500, () => {
      this.toastEl.classList.remove('visible');
      this.time.delayedCall(200, () => this.nextToast());
    });
  }

  // ------------------------------------------------------------ Modal State

  private setModal(on: boolean): void {
    if (state.modal && !on) state.lastModalClose = performance.now();
    state.modal = on;
  }

  private closePanels(): void {
    stopSpeech();
    if (this.activePanel !== 'none') {
      this.activePanel = 'none';
      this.backdropEl.classList.remove('open');
      this.setModal(false);
      this.checkPendingMilestone();
    }
  }

  private togglePanel(panel: ActivePanel): void {
    if (this.dialogEl.classList.contains('open')) return;
    if (this.activePanel === panel) {
      this.closePanels();
      return;
    }
    if (panel === 'trade' && state.chapter < 4) {
      this.pushToast('Fernhändler Enki reist erst ab Kapitel 4 (Handel & Dorf) an!');
      return;
    }
    this.activePanel = panel;
    this.backdropEl.classList.add('open');
    this.setModal(true);
    this.renderActivePanel();
  }

  private renderActivePanel(): void {
    this.modalFooterEl.innerHTML = '';
    if (this.activePanel === 'craft') this.renderCraft();
    else if (this.activePanel === 'trade') this.renderTrade();
    else if (this.activePanel === 'lexicon') this.renderLexicon();
    else if (this.activePanel === 'timeline') this.renderTimeline();
    else if (this.activePanel === 'chapter') this.renderChapterMenu();
    else if (this.activePanel === 'cert') this.renderCertificate();
  }

  // ------------------------------------------------------------ Meilenstein Entdecker-Karten

  private enqueueMilestone(id: string): void {
    if (!LEXICON[id]) return;
    if (!this.milestoneQueue.includes(id)) this.milestoneQueue.push(id);
    if (!state.modal && !this.dialogEl.classList.contains('open')) {
      this.checkPendingMilestone();
    }
  }

  private checkPendingMilestone(): void {
    if (state.modal || this.dialogEl.classList.contains('open') || this.milestoneQueue.length === 0) return;
    const id = this.milestoneQueue.shift()!;
    const entry = LEXICON[id];
    if (!entry) return;

    this.activePanel = 'milestone';
    this.modalCardEl.className = 'modal-card';
    this.modalTitleEl.textContent = `✨ Meilenstein entdeckt: ${entry.title}`;
    this.modalBodyEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;background:#fffdf7;border:2px solid #c29b61;border-radius:10px;padding:16px;">
        <img class="pixel-icon" src="assets/icons/${entry.icon}.png" alt="${escapeHtml(entry.title)}" style="width:56px;height:56px;" />
        <div>
          <div style="font-size:12px;font-weight:800;color:#b45309;text-transform:uppercase;margin-bottom:4px;">
            Epoche: ${escapeHtml(entry.era)}
          </div>
          <div style="font-size:16px;line-height:1.55;">
            ${highlightTerms(entry.text)}
          </div>
        </div>
      </div>
    `;
    this.modalFooterEl.innerHTML = `
      <button class="retro-btn" id="ms-speak-btn">🔊 Erklärtext vorlesen</button>
      <button class="retro-btn" id="ms-lex-btn">📖 Im Lexikon öffnen</button>
      <button class="retro-btn" id="ms-ok-btn" style="background:#3b5e2b;color:#fff;">Verstanden! Weiter (E)</button>
    `;
    this.modalFooterEl.querySelector('#ms-speak-btn')!.addEventListener('click', () => speakGerman(`${entry.title}. ${entry.text}`));
    this.modalFooterEl.querySelector('#ms-lex-btn')!.addEventListener('click', () => {
      this.lexSelected = id;
      this.activePanel = 'lexicon';
      this.renderActivePanel();
    });
    this.modalFooterEl.querySelector('#ms-ok-btn')!.addEventListener('click', () => this.closePanels());

    this.backdropEl.classList.add('open');
    this.setModal(true);
  }

  // ------------------------------------------------------------ Dialoge & Quiz

  private openDialog(spec: DialogSpec): void {
    if (this.activePanel !== 'none') this.closePanels();
    this.spec = spec;
    this.nodeIdx = 0;
    this.dialogEl.classList.add('open');
    this.setModal(true);
    this.showNode();
  }

  private showNode(): void {
    if (!this.spec) return;
    const node: DialogNode = this.spec.nodes[this.nodeIdx];
    this.dlgSpeakerEl.textContent = this.spec.speaker;
    this.dlgOptsEl.innerHTML = '';

    if ('question' in node) {
      this.questionActive = true;
      this.dlgTextEl.innerHTML = `<strong>Quiz-Frage:</strong> ${highlightTerms(node.question)}`;
      this.dlgNextBtn.style.display = 'none';
      node.options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'dialog-opt-btn';
        btn.innerHTML = `<span class="key-badge">${i + 1}</span> ${highlightTerms(opt)}`;
        btn.addEventListener('click', () => this.answer(i));
        this.dlgOptsEl.appendChild(btn);
      });
    } else {
      this.questionActive = false;
      this.dlgTextEl.innerHTML = highlightTerms(node.text);
      this.dlgNextBtn.style.display = 'inline-flex';
    }
  }

  private answer(i: number): void {
    if (!this.dialogEl.classList.contains('open') || !this.questionActive || !this.spec) return;
    const node = this.spec.nodes[this.nodeIdx];
    if (!('question' in node) || i >= node.options.length) return;
    if (i === node.correct) {
      this.questionActive = false;
      this.dlgOptsEl.innerHTML = '';
      this.dlgTextEl.innerHTML = `✅ <strong>Richtig!</strong> ${highlightTerms(node.explain)}`;
      this.dlgNextBtn.style.display = 'inline-flex';
    } else {
      state.quizAttempts++;
      this.dlgTextEl.innerHTML = `<strong>Quiz-Frage:</strong> ${highlightTerms(node.question)}<br><br><span style="color:#b91c1c;font-weight:700;">❌ Nicht ganz. Überleg nochmal!</span>`;
    }
  }

  private advanceDialog(): void {
    if (!this.dialogEl.classList.contains('open') || this.questionActive || !this.spec) return;
    stopSpeech();
    this.nodeIdx++;
    if (this.nodeIdx >= this.spec.nodes.length) {
      const done = this.spec.onDone;
      this.dialogEl.classList.remove('open');
      this.spec = undefined;
      this.setModal(false);
      done?.();
      this.checkPendingMilestone();
    } else {
      this.showNode();
    }
  }

  private numberKey(i: number): void {
    if (this.dialogEl.classList.contains('open') && this.questionActive) this.answer(i);
    else if (this.activePanel === 'craft') this.craftRecipe(i);
    else if (this.activePanel === 'trade') this.executeTradeIndex(i);
    else if (this.activePanel === 'chapter' && i < 6) {
      this.closePanels();
      state.startChapter(i + 1);
    }
  }

  // ------------------------------------------------------------ Handwerk (C)

  private renderCraft(): void {
    this.modalCardEl.className = 'modal-card dark';
    this.modalTitleEl.textContent = '🔨 Handwerk, Weben & Metallguss (C)';
    this.visibleRecipes = RECIPES.filter((r) => r.minChapter <= state.chapter);

    const cards = this.visibleRecipes.map((r, i) => {
      const costStr = Object.entries(r.cost)
        .map(([id, n]) => `${n}× ${ITEMS[id as ItemId].name} (du hast ${state.count(id as ItemId)})`)
        .join(', ');
      const bName = r.requiresBuilding
        ? BUILDINGS.find((b) => b.id === r.requiresBuilding)?.name ?? r.requiresBuilding
        : '';
      const hasBld = !r.requiresBuilding || state.hasBuilding(r.requiresBuilding);
      const canMat = state.canAfford(r);
      const cls = canMat && hasBld ? 'recipe-card affordable' : !hasBld ? 'recipe-card missing-bld' : 'recipe-card';
      const iconId: ItemId = r.id === 'fire' ? 'stock' : r.id === 'trap' ? 'fleisch' : (r.id as ItemId);
      return `
        <div class="${cls}" data-craft-idx="${i}">
          <img class="pixel-icon" src="assets/icons/${iconId}.png" alt="${escapeHtml(r.name)}" style="width:32px;height:32px;margin-top:2px;" />
          <div style="flex:1">
            <div style="font-weight:800;font-size:14.5px;color:#ffe9b0;">
              <span class="key-badge" style="background:#e8c170;color:#1a1208;padding:1px 5px;border-radius:3px;font-size:11px;">${i + 1}</span>
              ${escapeHtml(r.name)}
            </div>
            <div style="font-size:12.5px;color:#d6c7b2;margin:2px 0;">${highlightTerms(r.desc)}</div>
            <div style="font-size:12px;color:${canMat ? '#86efac' : '#fca5a5'};font-weight:700;">
              Kosten: ${escapeHtml(costStr)}
            </div>
            ${
              bName
                ? `<div style="font-size:11.5px;font-weight:700;color:${hasBld ? '#93c5fd' : '#fbbf24'};margin-top:2px;">
                    ${hasBld ? `✓ Werkstatt bereit: ${escapeHtml(bName)}` : `⚠ Benötigt Dorf-Gebäude: ${escapeHtml(bName)}`}
                  </div>`
                : ''
            }
          </div>
        </div>
      `;
    });

    this.modalBodyEl.innerHTML = `<div class="grid-2col">${cards.join('')}</div>`;
    this.modalBodyEl.querySelectorAll('[data-craft-idx]').forEach((el) => {
      el.addEventListener('click', () => this.craftRecipe(Number((el as HTMLElement).dataset.craftIdx)));
    });
  }

  private craftRecipe(i: number): void {
    const r = this.visibleRecipes[i];
    if (this.activePanel !== 'craft' || !r) return;
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

  // ------------------------------------------------------------ Tauschhandel (H)

  private openTradeModal(): void {
    if (state.chapter < 4) {
      this.pushToast('Fernhändler Enki reist erst ab Kapitel 4 (Handel & Dorf) an!');
      return;
    }
    this.activePanel = 'trade';
    this.backdropEl.classList.add('open');
    this.setModal(true);
    this.renderActivePanel();
  }

  private renderTrade(): void {
    this.modalCardEl.className = 'modal-card dark';
    this.modalTitleEl.textContent = '⚖️ Fernhändler Enki: Tauschhandel ohne Münzgeld (H)';
    this.visibleTrades = TRADES.filter((t) => t.minChapter <= state.chapter);

    const cards = this.visibleTrades.map((t, i) => {
      const giveStr = Object.entries(t.give)
        .map(([id, n]) => `${n}× ${ITEMS[id as ItemId].name} (du hast ${state.count(id as ItemId)})`)
        .join(', ');
      const recStr = `${t.receive.count}× ${ITEMS[t.receive.item].name}`;
      const ok = state.canAffordTrade(t);
      return `
        <div class="recipe-card ${ok ? 'affordable' : ''}" data-trade-idx="${i}">
          <img class="pixel-icon" src="assets/icons/${t.receive.item}.png" alt="${escapeHtml(recStr)}" style="width:34px;height:34px;" />
          <div style="flex:1">
            <div style="font-weight:800;font-size:15px;color:#ffd86b;">
              <span class="key-badge" style="background:#ffd86b;color:#1a1208;padding:1px 5px;border-radius:3px;font-size:11px;">${i + 1}</span>
              ${escapeHtml(t.name)}: Erhalte ${escapeHtml(recStr)}
            </div>
            <div style="font-size:13px;color:#e5dec9;margin:3px 0;">${highlightTerms(t.desc)}</div>
            <div style="font-size:12.5px;font-weight:700;color:${ok ? '#86efac' : '#fca5a5'};">
              Gib dafür: ${escapeHtml(giveStr)}
            </div>
          </div>
        </div>
      `;
    });

    this.modalBodyEl.innerHTML = `
      <div style="margin-bottom:12px;padding:10px 12px;background:rgba(255,216,107,0.12);border-left:4px solid #ffd86b;border-radius:6px;font-size:13.5px;">
        <strong>Historischer Hintergrund:</strong> In der Stein- und Bronzezeit gab es noch <strong>kein Münzgeld</strong>!
        Dörfer tauschten ihre landwirtschaftlichen <span class="term-highlight">Überschüsse</span> (Getreide, Wolle, gewebte Stoffe) direkt Ware gegen Ware gegen seltene Rohstoffe wie <span class="term-highlight">Salz</span>, <span class="term-highlight">Bernstein</span> und <span class="term-highlight">Zinnerz</span>.
      </div>
      <div class="grid-2col">${cards.join('')}</div>
    `;
    this.modalBodyEl.querySelectorAll('[data-trade-idx]').forEach((el) => {
      el.addEventListener('click', () => this.executeTradeIndex(Number((el as HTMLElement).dataset.tradeIdx)));
    });
  }

  private executeTradeIndex(i: number): void {
    const t = this.visibleTrades[i];
    if (this.activePanel !== 'trade' || !t) return;
    if (!state.canAffordTrade(t)) {
      this.pushToast('Dir fehlen noch die Tauschwaren aus eurem Dorf.');
      return;
    }
    state.executeTrade(t);
    this.renderTrade();
    this.pushToast(`Getauscht: +${t.receive.count}× ${ITEMS[t.receive.item].name}!`);
  }

  // ------------------------------------------------------------ Illustriertes Lexikon (L)

  private renderLexicon(): void {
    this.modalCardEl.className = 'modal-card';
    const ids = Object.keys(LEXICON);
    this.modalTitleEl.textContent = `📖 Lexikon der Ur- und Frühgeschichte (${state.lexicon.length} / ${ids.length} entdeckt)`;

    if (!LEXICON[this.lexSelected]) this.lexSelected = ids[0];
    const current = LEXICON[this.lexSelected];
    const isKnown = state.lexicon.includes(this.lexSelected);

    const listHtml = ids
      .map((id) => {
        const e = LEXICON[id];
        const known = state.lexicon.includes(id);
        const active = id === this.lexSelected ? 'active' : '';
        const locked = known ? '' : 'locked';
        return `
          <button class="lex-item-btn ${active} ${locked}" data-lex-id="${id}">
            ${
              known
                ? `<img class="pixel-icon" src="assets/icons/${e.icon}.png" alt="" style="width:20px;height:20px;" />`
                : `<span style="font-size:15px;width:20px;text-align:center;">🔒</span>`
            }
            <div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${escapeHtml(e.title)}
            </div>
          </button>
        `;
      })
      .join('');

    const detailHtml = isKnown
      ? `
        <div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid #e6d5b8;padding-bottom:12px;">
          <img class="pixel-icon" src="assets/icons/${current.icon}.png" alt="${escapeHtml(current.title)}" style="width:48px;height:48px;" />
          <div>
            <div style="font-size:12px;font-weight:800;color:#b45309;text-transform:uppercase;">${escapeHtml(current.era)}</div>
            <h3 style="margin:2px 0 0 0;font-size:20px;color:#3d200a;">${escapeHtml(current.title)}</h3>
          </div>
        </div>
        <div style="font-size:16px;line-height:1.65;color:#2a1d10;">
          ${highlightTerms(current.text)}
        </div>
        <div style="margin-top:auto;padding-top:12px;display:flex;gap:8px;">
          <button class="retro-btn" id="lex-speak-btn">🔊 Eintrag vorlesen</button>
        </div>
      `
      : `
        <div style="display:flex;align-items:center;gap:14px;border-bottom:2px solid #e6d5b8;padding-bottom:12px;">
          <span style="font-size:38px;">🔒</span>
          <div>
            <div style="font-size:12px;font-weight:800;color:#786655;text-transform:uppercase;">${escapeHtml(current.era)}</div>
            <h3 style="margin:2px 0 0 0;font-size:19px;color:#57493c;">${escapeHtml(current.title)} (Noch nicht entdeckt)</h3>
          </div>
        </div>
        <div class="merksatz-box">
          <strong>💡 Such-Tipp – Wie schalte ich diesen Eintrag frei?</strong><br>
          ${highlightTerms(current.unlockHint)}
        </div>
      `;

    this.modalBodyEl.innerHTML = `
      <div class="lex-layout">
        <div class="lex-list">${listHtml}</div>
        <div class="lex-detail-card">${detailHtml}</div>
      </div>
    `;

    this.modalBodyEl.querySelectorAll('[data-lex-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.lexSelected = (btn as HTMLElement).dataset.lexId!;
        this.renderLexicon();
      });
    });

    const speakBtn = this.modalBodyEl.querySelector('#lex-speak-btn');
    if (speakBtn) {
      speakBtn.addEventListener('click', () => speakGerman(`${current.title}. ${current.text}`));
    }
  }

  // ------------------------------------------------------------ Epochen-Zeitstrahl & Hefter-Merksätze (Z)

  private renderTimeline(): void {
    this.modalCardEl.className = 'modal-card';
    this.modalTitleEl.textContent = '⏳ Epochen-Zeitstrahl & Hefter-Merksätze (Altsteinzeit bis Eisenzeit)';

    const rowsHtml = EPOCH_COMPARISON.map((row) => {
      const isCurrent = row.chapter === state.chapter || (state.chapter === 4 && row.chapter === 3);
      return `
        <tr class="${isCurrent ? 'current-era' : ''}">
          <td><strong>${escapeHtml(row.era)}</strong><br><span style="font-size:11.5px;color:#6b553f;">${escapeHtml(row.time)}</span></td>
          <td>${highlightTerms(row.housing)}</td>
          <td>${highlightTerms(row.food)}</td>
          <td>${highlightTerms(row.tools)}</td>
          <td>${highlightTerms(row.society)}</td>
        </tr>
      `;
    }).join('');

    const merksaetzeHtml = [1, 2, 3, 4, 5, 6]
      .map((ch) => {
        const m = CHAPTERS[ch];
        return `
          <div class="merksatz-box" style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:4px;">
              <strong style="color:#7a3b10;">📒 ${escapeHtml(m.title)} (${escapeHtml(m.era)})</strong>
              <div class="no-print" style="display:flex;gap:6px;">
                <button class="retro-btn" data-speak-ch="${ch}" style="padding:2px 7px;font-size:11px;">🔊 Vorlesen</button>
                <button class="retro-btn" data-copy-ch="${ch}" style="padding:2px 7px;font-size:11px;">📋 Kopieren</button>
              </div>
            </div>
            <div>${highlightTerms(m.merksatz)}</div>
          </div>
        `;
      })
      .join('');

    this.modalBodyEl.innerHTML = `
      <div style="margin-bottom:14px;">
        <h3 style="margin:0 0 8px 0;color:#5a2d0c;">1. Vorher / Nachher: Die großen Epochen im Vergleich</h3>
        <div style="overflow-x:auto;">
          <table class="epoch-table">
            <thead>
              <tr>
                <th>Epoche & Zeitraum</th>
                <th>⛺ Wohnen & Lebensweise</th>
                <th>🌾 Ernährung</th>
                <th>⚒️ Werkzeuge & Technik</th>
                <th>🤝 Gesellschaft & Handel</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 style="margin:14px 0 8px 0;color:#5a2d0c;">2. Merksätze für deinen Geschichtshefter</h3>
        ${merksaetzeHtml}
      </div>
    `;

    this.modalFooterEl.innerHTML = `
      <button class="retro-btn" id="tl-print-btn" style="background:#3b5e2b;color:#fff;">🖨 Übersicht & Merksätze drucken</button>
    `;
    this.modalFooterEl.querySelector('#tl-print-btn')!.addEventListener('click', () => window.print());

    this.modalBodyEl.querySelectorAll('[data-speak-ch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ch = Number((btn as HTMLElement).dataset.speakCh);
        speakGerman(`${CHAPTERS[ch].title}. ${CHAPTERS[ch].merksatz}`);
      });
    });
    this.modalBodyEl.querySelectorAll('[data-copy-ch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const ch = Number((btn as HTMLElement).dataset.copyCh);
        navigator.clipboard?.writeText(`${CHAPTERS[ch].title} (${CHAPTERS[ch].era}):\n${CHAPTERS[ch].merksatz}`);
        this.pushToast(`Merksatz zu Kapitel ${ch} in die Zwischenablage kopiert!`);
      });
    });
  }

  // ------------------------------------------------------------ Kapitel-Auswahl & Hefter-Code (K)

  private renderChapterMenu(): void {
    this.modalCardEl.className = 'modal-card dark';
    this.modalTitleEl.textContent = '🗺️ Epoche / Kapitel direkt wählen & Hefter-Speichercode (K)';

    const chCards = [1, 2, 3, 4, 5, 6]
      .map((ch) => {
        const meta = CHAPTERS[ch];
        const active = state.chapter === ch;
        return `
          <div class="recipe-card ${active ? 'affordable' : ''}" data-goto-ch="${ch}">
            <div style="flex:1">
              <div style="font-weight:800;font-size:15px;color:#ffe9b0;">
                <span class="key-badge" style="background:#e8c170;color:#1a1208;padding:1px 5px;border-radius:3px;">${ch}</span>
                ${escapeHtml(meta.title)} ${active ? '(Aktiv)' : ''}
              </div>
              <div style="font-size:13px;color:#d8f0ff;margin:3px 0;">${escapeHtml(meta.subtitle)}</div>
              <div style="font-size:12px;color:#b8a68e;">${escapeHtml(meta.era)}</div>
            </div>
          </div>
        `;
      })
      .join('');

    this.modalBodyEl.innerHTML = `
      <div style="margin-bottom:12px;font-size:13.5px;color:#e5dec9;">
        Wähle eine Epoche zum direkten Einstieg im Unterricht (benötigte Werkzeuge und Dorf-Gebäude früherer Kapitel werden automatisch bereitgestellt):
      </div>
      <div class="grid-2col">${chCards}</div>
    `;

    this.modalFooterEl.innerHTML = `
      <button class="retro-btn" id="ch-name-btn">✎ Name ändern (${escapeHtml(state.playerName)})</button>
      <button class="retro-btn" id="ch-export-btn">📋 Hefter-Code kopieren</button>
      <button class="retro-btn" id="ch-import-btn">📂 Hefter-Code laden</button>
      <button class="retro-btn" id="ch-cert-btn">📜 Epochen-Urkunde</button>
    `;

    this.modalBodyEl.querySelectorAll('[data-goto-ch]').forEach((el) => {
      el.addEventListener('click', () => {
        const ch = Number((el as HTMLElement).dataset.gotoCh);
        this.closePanels();
        state.startChapter(ch);
      });
    });

    this.modalFooterEl.querySelector('#ch-name-btn')!.addEventListener('click', () => {
      const n = window.prompt('Dein Vorname für die Epochen-Urkunde:', state.playerName);
      if (n && n.trim()) {
        state.playerName = n.trim();
        state.persist();
        this.renderChapterMenu();
        this.pushToast(`Name gespeichert: ${state.playerName}`);
      }
    });
    this.modalFooterEl.querySelector('#ch-export-btn')!.addEventListener('click', () => {
      const code = state.exportCode();
      navigator.clipboard?.writeText(code);
      window.prompt('Kopiere diesen kurzen Speichercode in deinen Geschichtshefter:', code);
    });
    this.modalFooterEl.querySelector('#ch-import-btn')!.addEventListener('click', () => {
      const code = window.prompt('Füge hier deinen Speichercode (SZ3-...) aus dem Hefter ein:');
      if (code) {
        this.closePanels();
        if (state.importCode(code)) {
          this.pushToast('Spielstand aus Hefter-Code erfolgreich geladen!');
        } else {
          this.pushToast('Ungültiger Speichercode.');
        }
      }
    });
    this.modalFooterEl.querySelector('#ch-cert-btn')!.addEventListener('click', () => {
      this.activePanel = 'cert';
      this.renderActivePanel();
    });
  }

  // ------------------------------------------------------------ Epochen-Urkunde (U)

  private openCertificateModal(): void {
    this.activePanel = 'cert';
    this.backdropEl.classList.add('open');
    this.setModal(true);
    this.renderActivePanel();
  }

  private renderCertificate(): void {
    this.modalCardEl.className = 'modal-card';
    this.modalTitleEl.textContent = '📜 EPOCHEN-URKUNDE: VOM JÄGER ZUM SCHMIED';

    const lexTotal = Object.keys(LEXICON).length;
    const lexCount = state.lexicon.length;
    const bldCount = state.buildings.length;
    const score = lexCount * 4 + bldCount * 6 + state.chapter * 5 - state.quizAttempts * 2 - state.collapses * 3;
    const rank =
      score >= 85 || (state.chapter === 6 && bldCount >= 6)
        ? '🏆 Rang S – Meister/in der Menschheitsgeschichte'
        : score >= 50 || state.chapter >= 4
          ? '🥈 Rang A – Kundige/r Dorfgründer/in & Schmied/in'
          : '🥉 Rang B – Tapfere/r Entdecker/in der Urgeschichte';

    const builtNames =
      state.buildings.map((id) => BUILDINGS.find((b) => b.id === id)?.name ?? id).join(', ') || 'Noch im Aufbau';

    const merksaetzeDone = Array.from({ length: state.chapter }, (_, i) => i + 1)
      .map(
        (ch) => `
          <div style="margin-bottom:6px;">
            <strong>${escapeHtml(CHAPTERS[ch].title)}:</strong> ${highlightTerms(CHAPTERS[ch].merksatz)}
          </div>
        `,
      )
      .join('');

    this.modalBodyEl.innerHTML = `
      <div style="background:#fffdf7;border:2px solid #b8860b;border-radius:10px;padding:16px;margin-bottom:12px;">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;border-bottom:2px solid #e6d5b8;padding-bottom:10px;margin-bottom:12px;">
          <div>
            <div style="font-size:12px;color:#786655;font-weight:700;">SCHÜLER/IN</div>
            <div style="font-size:20px;font-weight:900;color:#5a2d0c;">${escapeHtml(state.playerName)}</div>
          </div>
          <div>
            <div style="font-size:12px;color:#786655;font-weight:700;">ERREICHTE EPOCHE</div>
            <div style="font-size:17px;font-weight:800;color:#7a3b10;">${escapeHtml(CHAPTERS[state.chapter].title)}</div>
          </div>
          <div>
            <div style="font-size:12px;color:#786655;font-weight:700;">AUSZEICHNUNG</div>
            <div style="font-size:16px;font-weight:800;color:#b45309;">${escapeHtml(rank)}</div>
          </div>
        </div>

        <div class="grid-2col" style="margin-bottom:12px;font-size:14px;">
          <div>📖 <strong>Entdecktes Lexikon-Wissen:</strong> ${lexCount} von ${lexTotal} Einträgen (${state.knowledge}%)</div>
          <div>🏠 <strong>Dorf-Bauwerke (${bldCount}/${BUILDINGS.length}):</strong> ${escapeHtml(builtNames)}</div>
          <div>🐾 <strong>Begleiter & Herde:</strong> ${state.wolfTamed ? 'Hütehund Lupo' : '–'}, ${state.goatsTamed}× gezähmte Ziege(n)</div>
          <div>🎯 <strong>Quiz-Fehlversuche:</strong> ${state.quizAttempts}</div>
        </div>

        <div class="merksatz-box">
          <div style="font-weight:800;color:#7a3b10;margin-bottom:6px;">📒 Zusammenfassung & Hefter-Merksätze der gespielten Epochen:</div>
          ${merksaetzeDone}
        </div>

        <div style="margin-top:10px;font-size:11.5px;color:#6b553f;word-break:break-all;">
          <strong>Hefter-Speichercode:</strong> <code>${escapeHtml(state.exportCode())}</code>
        </div>
      </div>
    `;

    this.modalFooterEl.innerHTML = `
      <button class="retro-btn" id="cert-name-btn">✎ Name eintragen</button>
      <button class="retro-btn" id="cert-timeline-btn">⏳ Vergleichstabelle öffnen</button>
      <button class="retro-btn" id="cert-print-btn" style="background:#3b5e2b;color:#fff;">🖨 Urkunde & Merksätze drucken</button>
    `;

    this.modalFooterEl.querySelector('#cert-name-btn')!.addEventListener('click', () => {
      const n = window.prompt('Dein Vorname für die Urkunde:', state.playerName);
      if (n && n.trim()) {
        state.playerName = n.trim();
        state.persist();
        this.renderCertificate();
      }
    });
    this.modalFooterEl.querySelector('#cert-timeline-btn')!.addEventListener('click', () => {
      this.activePanel = 'timeline';
      this.renderActivePanel();
    });
    this.modalFooterEl.querySelector('#cert-print-btn')!.addEventListener('click', () => window.print());
  }

  // ------------------------------------------------------------ Kapitel geschafft + Hefter-Merksatz

  private showChapterDone(): void {
    const ch = state.chapter;
    const meta = CHAPTERS[ch];
    this.activePanel = 'done';
    this.modalCardEl.className = 'modal-card';
    this.modalTitleEl.textContent = `🎉 ${meta.title} erfolgreich gemeistert!`;

    const nextText =
      ch < 6
        ? `Nächste Epoche: ${CHAPTERS[ch + 1].title} (${CHAPTERS[ch + 1].era})`
        : 'Du hast alle 6 Kapitel von der Altsteinzeit bis zur Eisenzeit abgeschlossen!';

    this.modalBodyEl.innerHTML = `
      <div style="font-size:16px;margin-bottom:12px;">
        Du hast alle Aufgaben dieser Epoche erfüllt und Otas Abschlussquiz gelöst!
      </div>
      <div class="merksatz-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <strong style="font-size:16px;color:#7a3b10;">📒 Merksatz für deinen Geschichtshefter (${escapeHtml(meta.era)}):</strong>
          <button class="retro-btn no-print" id="done-speak-btn" style="padding:3px 8px;font-size:12px;">🔊 Vorlesen</button>
        </div>
        <div style="font-size:15.5px;line-height:1.6;">
          ${highlightTerms(meta.merksatz)}
        </div>
      </div>
      <div style="margin-top:14px;font-weight:700;color:#3b5e2b;">
        ➔ ${escapeHtml(nextText)}
      </div>
    `;

    this.modalFooterEl.innerHTML = `
      <button class="retro-btn" id="done-copy-btn">📋 Merksatz kopieren</button>
      <button class="retro-btn" id="done-next-btn" style="background:#3b5e2b;color:#fff;">
        ${ch < 6 ? `Weiter zu Kapitel ${ch + 1} (E) ▶` : '📜 Epochen-Urkunde öffnen (E)'}
      </button>
    `;

    this.modalBodyEl
      .querySelector('#done-speak-btn')!
      .addEventListener('click', () => speakGerman(`${meta.title}. Merksatz: ${meta.merksatz}`));
    this.modalFooterEl.querySelector('#done-copy-btn')!.addEventListener('click', () => {
      navigator.clipboard?.writeText(`${meta.title} (${meta.era}):\n${meta.merksatz}`);
      this.pushToast('Merksatz in die Zwischenablage kopiert!');
    });
    this.modalFooterEl.querySelector('#done-next-btn')!.addEventListener('click', () => this.finishChapterDone());

    this.backdropEl.classList.add('open');
    this.setModal(true);
  }

  private finishChapterDone(): void {
    stopSpeech();
    this.activePanel = 'none';
    this.backdropEl.classList.remove('open');
    this.setModal(false);
    if (state.chapter < 6) {
      state.startChapter(state.chapter + 1);
    } else {
      this.openCertificateModal();
    }
  }
}
