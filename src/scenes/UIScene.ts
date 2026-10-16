import Phaser from 'phaser';
import { sfx } from '../audio/sound';
import { CHAPTERS, DialogNode, EPOCH_COMPARISON, HIGHLIGHT_TERMS, LEXICON } from '../data/chapter1';
import { BUILDINGS, ITEMS, ItemId, RECIPES, Recipe, TRADES, TradeOffer } from '../data/items';
import { RELICS, RelicDef } from '../data/relics';
import { DialogSpec, ROLES, RoleDef, state } from '../systems/GameState';
import { PlayerRole } from '../systems/SaveManager';
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

type ActivePanel =
  | 'none'
  | 'start'
  | 'pause'
  | 'bag'
  | 'craft'
  | 'trade'
  | 'lexicon'
  | 'timeline'
  | 'chapter'
  | 'cert'
  | 'done'
  | 'milestone'
  | 'relic';

/**
 * Gestochen scharfe HTML/CSS-Oberfläche über der 16-Bit-Spielwelt:
 * Startscreen mit Spielgrafik-Vorschau & Charakterwahl (Mann/Frau + Name),
 * Pausescreen mit Spielzeit & Abenteuer-Statistiken, HUD mit Ziel-Kompass,
 * kompakter Hotbar & didaktischem Rucksack-Menü (I),
 * Dialoge mit Vorlese-Funktion, Entdecker-Karten, Lexikon, Zeitstrahl & Urkunde.
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
  private startSelectedChapter = 1;
  private selectedRole: PlayerRole = state.playerRole;
  private currentRelic: RelicDef | null = null;
  private bagTab: 'all' | 'tool' | 'food' | 'material' = 'all';
  private bagSelected: ItemId = 'faustkeil';

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

  private isTyping(): boolean {
    const el = document.activeElement;
    return Boolean(el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT'));
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
    state.on('openRelicQuiz', (relicOrId: RelicDef | string) => this.openRelicModal(relicOrId), this);

    const onVisChange = () => {
      if (document.hidden && !state.modal && this.activePanel === 'none' && !this.dialogEl.classList.contains('open')) {
        this.togglePanel('pause');
      }
    };
    document.addEventListener('visibilitychange', onVisChange);

    this.events.once('shutdown', () => {
      state.off('inventory', this.refreshHotbar, this);
      state.off('toast', this.pushToast, this);
      state.off('dialog', this.openDialog, this);
      state.off('chapterDone', this.showChapterDone, this);
      state.off('openTrade', this.openTradeModal, this);
      state.off('openCertificate', this.openCertificateModal, this);
      state.off('milestone', this.enqueueMilestone, this);
      document.removeEventListener('visibilitychange', onVisChange);
    });

    const kb = this.input.keyboard!;
    kb.disableGlobalCapture();
    kb.on('keydown-P', () => !this.isTyping() && this.togglePanel('pause'));
    kb.on('keydown-I', () => !this.isTyping() && this.togglePanel('bag'));
    kb.on('keydown-B', () => !this.isTyping() && this.togglePanel('bag'));
    kb.on('keydown-C', () => !this.isTyping() && this.togglePanel('craft'));
    kb.on('keydown-H', () => !this.isTyping() && this.togglePanel('trade'));
    kb.on('keydown-L', () => !this.isTyping() && this.togglePanel('lexicon'));
    kb.on('keydown-Z', () => !this.isTyping() && this.togglePanel('timeline'));
    kb.on('keydown-K', () => !this.isTyping() && this.togglePanel('chapter'));
    kb.on('keydown-U', () => !this.isTyping() && this.togglePanel('cert'));
    kb.on('keydown-F', () => !this.isTyping() && !state.modal && this.pushToast(state.eat()));
    kb.on('keydown-ESC', () => {
      if (this.isTyping()) {
        (document.activeElement as HTMLElement)?.blur();
        return;
      }
      if (this.activePanel === 'start') return;
      if (this.activePanel !== 'none') this.closePanels();
      else if (!this.dialogEl.classList.contains('open')) this.togglePanel('pause');
    });
    for (const k of ['E', 'SPACE', 'ENTER']) {
      kb.on(`keydown-${k}`, () => {
        if (this.isTyping()) return;
        if (this.dialogEl.classList.contains('open')) this.advanceDialog();
        else if (this.activePanel === 'milestone') this.closePanels();
        else if (this.activePanel === 'done') this.finishChapterDone();
      });
    }
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].forEach((k, i) =>
      kb.on(`keydown-${k}`, () => !this.isTyping() && this.numberKey(i)),
    );

    this.refreshHotbar();
    const pParam = new URLSearchParams(location.search).get('panel') as ActivePanel | null;
    if (pParam && ['start', 'pause', 'bag', 'craft', 'trade', 'lexicon', 'timeline', 'chapter', 'cert'].includes(pParam)) {
      this.togglePanel(pParam);
    } else if (!state.skipStartScreen) {
      this.startSelectedChapter = state.chapter || 1;
      this.togglePanel('start');
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
            <button class="retro-btn" data-act="pause" style="border-color:#fbbf24;"><span class="key-badge">P</span> ⏸ Pause</button>
            <button class="retro-btn" data-act="bag" style="border-color:#ffd86b;"><span class="key-badge">I</span> 🎒 Beutel</button>
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
        <div class="hud-bottom-row">
          <div class="hud-hotbar" id="hud-hotbar"></div>
          <button class="hotbar-bag-btn" id="hud-bag-btn" data-act="bag">
            <span>🎒 Beutel</span>
            <span class="key-badge" style="background:#e8c170;color:#1a1208;font-size:10px;padding:1px 4px;">I</span>
          </button>
        </div>
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
      if (e.target === this.backdropEl && this.activePanel !== 'start') {
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
    let totalItems = 0;
    (Object.keys(ITEMS) as ItemId[]).forEach((id) => {
      const n = state.count(id);
      if (n <= 0) return;
      totalItems += n;
      const item = ITEMS[id];
      parts.push(`
        <div class="hotbar-icon-slot" data-open-bag="${id}" title="${escapeHtml(item.name)}: ${n} (${escapeHtml(item.desc)})">
          <img src="assets/icons/${id}.png" alt="${escapeHtml(item.name)}" />
          <span class="hotbar-slot-qty">${n > 1 ? n : ''}</span>
        </div>
      `);
    });
    this.hotbarEl.innerHTML = parts.join('');

    const bagBtn = this.root.querySelector('#hud-bag-btn');
    if (bagBtn) {
      bagBtn.innerHTML = `
        <span>🎒 Beutel</span>
        <span style="background:#e8c170;color:#1a1208;font-size:11px;font-weight:900;padding:1px 5px;border-radius:99px;">${totalItems}</span>
      `;
    }

    this.hotbarEl.querySelectorAll('[data-open-bag]').forEach((slot) => {
      slot.addEventListener('click', () => {
        const id = (slot as HTMLElement).dataset.openBag as ItemId;
        if (id) {
          this.bagSelected = id;
          if (ITEMS[id]) this.bagTab = ITEMS[id].category;
        }
        this.togglePanel('bag');
      });
    });
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
    const closeBtn = this.root.querySelector('#modal-close-btn') as HTMLElement | null;
    if (closeBtn) closeBtn.style.display = this.activePanel === 'start' ? 'none' : 'inline-flex';
    if (this.activePanel === 'start') this.renderStartModal();
    else if (this.activePanel === 'pause') this.renderPauseModal();
    else if (this.activePanel === 'bag') this.renderBagModal();
    else if (this.activePanel === 'craft') this.renderCraft();
    else if (this.activePanel === 'trade') this.renderTrade();
    else if (this.activePanel === 'lexicon') this.renderLexicon();
    else if (this.activePanel === 'timeline') this.renderTimeline();
    else if (this.activePanel === 'chapter') this.renderChapterMenu();
    else if (this.activePanel === 'cert') this.renderCertificate();
    else if (this.activePanel === 'relic' && this.currentRelic) this.renderRelicModal(this.currentRelic);
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

  // ------------------------------------------------------------ Rucksack & Vorratsbeutel (I)

  private renderBagModal(): void {
    this.modalCardEl.className = 'modal-card';
    this.modalTitleEl.textContent = '🎒 Dein Vorratsbeutel & Rucksack (I)';

    const ownedIds = (Object.keys(ITEMS) as ItemId[]).filter((id) => state.count(id) > 0);
    const totalCount = ownedIds.reduce((sum, id) => sum + state.count(id), 0);

    const tabs: Array<{ id: 'all' | 'tool' | 'food' | 'material'; label: string; count: number }> = [
      { id: 'all', label: '🎒 Alle Vorräte', count: ownedIds.length },
      { id: 'tool', label: '⚒️ Werkzeuge & Waffen', count: ownedIds.filter((id) => ITEMS[id].category === 'tool').length },
      { id: 'food', label: '🥖 Nahrung & Ernte', count: ownedIds.filter((id) => ITEMS[id].category === 'food').length },
      { id: 'material', label: '🪵 Rohstoffe & Erze', count: ownedIds.filter((id) => ITEMS[id].category === 'material').length },
    ];

    const tabHtml = tabs
      .map(
        (t) => `
          <button class="bag-tab-btn ${this.bagTab === t.id ? 'active' : ''}" data-bag-tab="${t.id}">
            ${escapeHtml(t.label)} (${t.count})
          </button>
        `,
      )
      .join('');

    const filtered = ownedIds.filter((id) => this.bagTab === 'all' || ITEMS[id].category === this.bagTab);

    if (!filtered.includes(this.bagSelected) && filtered.length > 0) {
      this.bagSelected = filtered[0];
    }

    const itemsGridHtml =
      filtered.length > 0
        ? filtered
            .map((id) => {
              const item = ITEMS[id];
              const count = state.count(id);
              const active = this.bagSelected === id;
              return `
                <div class="bag-item-card ${active ? 'active' : ''}" data-select-item="${id}">
                  <span class="bag-item-count-badge">${count}×</span>
                  <img src="assets/icons/${id}.png" alt="${escapeHtml(item.name)}" />
                  <div class="bag-item-title">${escapeHtml(item.name)}</div>
                </div>
              `;
            })
            .join('')
        : `<div style="grid-column: 1 / -1; padding: 30px 10px; text-align: center; color: #786655; font-size: 14px;">
            In dieser Kategorie trägst du gerade keine Gegenstände bei dir.
          </div>`;

    const curItem = ITEMS[this.bagSelected];
    const curCount = curItem ? state.count(this.bagSelected) : 0;

    let detailHtml = '';
    if (curItem && curCount > 0) {
      const catClass = `tag-${curItem.category}`;
      const catLabel =
        curItem.category === 'tool' ? 'Werkzeug' : curItem.category === 'food' ? 'Nahrung' : 'Rohstoff';

      let actionBtn = '';
      if (curItem.foodValue) {
        actionBtn = `
          <button class="retro-btn" id="bag-eat-btn" style="background:#22c55e;color:#052e16;border-color:#86efac;font-size:14px;padding:8px 14px;font-weight:800;">
            🍴 Jetzt essen (+${curItem.foodValue} Hunger)
          </button>
        `;
      } else if (curItem.category === 'tool') {
        actionBtn = `
          <div style="font-size:12.5px;color:#166534;font-weight:700;background:#dcfce7;border:1px solid #86efac;border-radius:6px;padding:6px 10px;text-align:center;">
            ✓ Dieses Werkzeug ist automatisch ausgerüstet!
          </div>
        `;
      } else {
        actionBtn = `
          <button class="retro-btn" id="bag-craft-btn" style="padding:6px 12px;font-size:12.5px;">
            🔨 Passende Rezepte öffnen (C)
          </button>
        `;
      }

      detailHtml = `
        <div class="bag-detail-card">
          <div class="bag-detail-header">
            <img src="assets/icons/${curItem.id}.png" alt="${escapeHtml(curItem.name)}" />
            <div>
              <span class="bag-category-tag ${catClass}">${catLabel}</span>
              <div style="font-size:17px;font-weight:900;color:#3b2310;">${escapeHtml(curItem.name)}</div>
              <div style="font-size:13px;font-weight:800;color:#b45309;">Bestand im Beutel: ${curCount} Stück</div>
            </div>
          </div>
          <div style="font-size:14px;color:#2a1d10;line-height:1.55;background:#fefbf2;border:1px solid #e6d5b8;border-radius:6px;padding:10px;">
            <strong style="color:#7a3b10;">Geschichts-Wissen:</strong><br/>
            ${highlightTerms(curItem.desc)}
          </div>
          <div style="margin-top:auto;display:flex;flex-direction:column;gap:6px;">
            ${actionBtn}
          </div>
        </div>
      `;
    } else {
      detailHtml = `
        <div class="bag-detail-card" style="align-items:center;justify-content:center;text-align:center;color:#786655;">
          <div style="font-size:36px;margin-bottom:8px;">🎒</div>
          <div style="font-size:14px;font-weight:700;">Wähle einen Gegenstand aus dem Beutel aus, um seine Geschichte zu erfahren.</div>
        </div>
      `;
    }

    this.modalBodyEl.innerHTML = `
      <div class="bag-tabs">${tabHtml}</div>
      <div class="bag-layout">
        <div class="bag-items-grid">${itemsGridHtml}</div>
        ${detailHtml}
      </div>
    `;

    this.modalFooterEl.innerHTML = `
      <div style="font-size:13px;color:#5a3818;font-weight:700;">
        Gesamtbestand: <strong>${totalCount} Gegenstände</strong> im Beutel
      </div>
      <div style="display:flex;gap:8px;">
        <button class="retro-btn" id="bag-to-craft">🔨 Handwerk (C)</button>
        <button class="retro-btn" id="bag-to-trade">⚖️ Tauschhandel (H)</button>
        <button class="retro-btn" id="bag-close-btn" style="background:#3b5e2b;color:#fff;">Weiter spielen (Esc)</button>
      </div>
    `;

    this.modalBodyEl.querySelectorAll('[data-bag-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.bagTab = (btn as HTMLElement).dataset.bagTab as 'all' | 'tool' | 'food' | 'material';
        this.renderBagModal();
      });
    });

    this.modalBodyEl.querySelectorAll('[data-select-item]').forEach((card) => {
      card.addEventListener('click', () => {
        this.bagSelected = (card as HTMLElement).dataset.selectItem as ItemId;
        this.renderBagModal();
      });
    });

    const eatBtn = this.modalBodyEl.querySelector('#bag-eat-btn');
    if (eatBtn) {
      eatBtn.addEventListener('click', () => {
        this.pushToast(state.eat());
        this.renderBagModal();
        this.refreshHotbar();
      });
    }

    const craftBtn = this.modalBodyEl.querySelector('#bag-craft-btn');
    if (craftBtn) {
      craftBtn.addEventListener('click', () => {
        this.activePanel = 'craft';
        this.renderActivePanel();
      });
    }

    this.modalFooterEl.querySelector('#bag-to-craft')!.addEventListener('click', () => {
      this.activePanel = 'craft';
      this.renderActivePanel();
    });
    this.modalFooterEl.querySelector('#bag-to-trade')!.addEventListener('click', () => {
      this.activePanel = 'trade';
      this.renderActivePanel();
    });
    this.modalFooterEl.querySelector('#bag-close-btn')!.addEventListener('click', () => this.closePanels());
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

  // ------------------------------------------------------------ Startscreen (Charakterwahl, Grafik-Showcase & Wiedereinstieg)

  private renderStartModal(): void {
    this.modalCardEl.className = 'modal-card';
    this.modalTitleEl.textContent = '🏕️ Willkommen in der Urgeschichte! (Klasse 5/6)';

    const currentAvatar = state.playerGender === 'female' ? state.femalePreviewUrl : state.malePreviewUrl;
    const savedMeta = CHAPTERS[state.chapter] ?? CHAPTERS[1];
    const savedQuest = savedMeta.quests[Math.min(state.quest, savedMeta.quests.length - 1)];

    const resumeHtml = state.hasHadExistingSaveOnBoot
      ? `
        <div style="background:linear-gradient(135deg,#1d3b1a 0%,#2b5324 100%);border:2.5px solid #86efac;border-radius:10px;padding:12px 16px;color:#fff;margin-bottom:14px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
          <div style="display:flex;align-items:center;gap:14px;">
            <div class="gender-avatar-box" style="border-color:#86efac;">
              <img src="${currentAvatar}" alt="Spielfigur" />
            </div>
            <div>
              <div style="font-size:11.5px;font-weight:800;color:#bbf7d0;text-transform:uppercase;">
                ✓ Gespeicherter Spielstand auf diesem Gerät gefunden
              </div>
              <div style="font-size:18px;font-weight:900;color:#fff;">
                ${escapeHtml(state.playerName)} · ${escapeHtml(state.epochRankTitle())}
              </div>
              <div style="font-size:13px;color:#dcfce7;">
                ${escapeHtml(savedMeta.title)} · Aufgabe: ${escapeHtml(savedQuest)} · ⏱ ${escapeHtml(state.formatPlayTime())}
              </div>
            </div>
          </div>
          <button class="retro-btn" id="start-resume-btn" style="background:#22c55e;color:#052e16;border-color:#bbf7d0;font-size:15px;padding:10px 18px;">
            ▶️ Direkt weiterspielen!
          </button>
        </div>
      `
      : '';

    const chPills = [1, 2, 3, 4, 5, 6]
      .map((ch) => {
        const active = this.startSelectedChapter === ch;
        return `
          <button class="retro-btn" data-start-ch="${ch}" style="background:${active ? '#b45309' : '#3a2410'};border-color:${active ? '#fde68a' : '#8b5a2b'};padding:6px 10px;">
            <span class="key-badge">${ch}</span> ${escapeHtml(CHAPTERS[ch].title.replace(/^Kapitel \d+:\s*/, ''))}
          </button>
        `;
      })
      .join('');

    this.modalBodyEl.innerHTML = `
      <div class="start-hero">
        <div class="start-hero-title">🔥 VOM JÄGER ZUM SCHMIED · VON DER JÄGERIN ZUR SCHMIEDIN</div>
        <div class="start-hero-sub">
          Erlebe in 6 Kapiteln, wie die Menschen der Urzeit überlebten, Wölfe zähmten, die ersten Dörfer bauten und schließlich Bronze und Eisen schmiedeten!
        </div>
        <div class="showcase-strip">
          <div class="showcase-card">
            <img src="${state.showcaseSprites.fire || 'assets/icons/faustkeil.png'}" alt="Altsteinzeit" />
            <div class="showcase-era">Kap. 1 · Altsteinzeit</div>
            <div class="showcase-caption">Lagerfeuer, Jagdfallen & Faustkeil</div>
          </div>
          <div class="showcase-card">
            <img src="${state.showcaseSprites.wolf || 'assets/icons/sichel.png'}" alt="Übergang" />
            <div class="showcase-era">Kap. 2 · Übergang</div>
            <div class="showcase-caption">Wolf Lupo zähmen & erster Ackerbau</div>
          </div>
          <div class="showcase-card">
            <img src="${state.showcaseSprites.langhaus || 'assets/icons/brot.png'}" alt="Jungsteinzeit" />
            <div class="showcase-era">Kap. 3 · Siedlung</div>
            <div class="showcase-caption">Langhaus, Ziegen & Töpferofen</div>
          </div>
          <div class="showcase-card">
            <img src="${state.showcaseSprites.loom || 'assets/icons/bernstein.png'}" alt="Handel" />
            <div class="showcase-era">Kap. 4 · Handel</div>
            <div class="showcase-caption">Webstuhl, Salz & Ostsee-Bernstein</div>
          </div>
          <div class="showcase-card">
            <img src="${state.showcaseSprites.smelter || 'assets/icons/kupferbeil.png'}" alt="Kupferzeit" />
            <div class="showcase-era">Kap. 5 · Kupferzeit</div>
            <div class="showcase-caption">Bergbau, Schmelzofen & Ötzi-Beil</div>
          </div>
          <div class="showcase-card">
            <img src="${state.showcaseSprites.forge || 'assets/icons/bronzeschwert.png'}" alt="Eisenzeit" />
            <div class="showcase-era">Kap. 6 · Metallzeit</div>
            <div class="showcase-caption">Bronzeguss & glühende Eisenschmiede</div>
          </div>
        </div>
      </div>

      ${resumeHtml}

      <div style="background:#fffdf7;border:2px solid #c29b61;border-radius:10px;padding:14px 16px;margin-bottom:12px;">
        <div style="font-weight:900;font-size:15.5px;color:#5a2d0c;margin-bottom:6px;">
          1. Wähle deine Spielfigur (Jägerin oder Jäger):
        </div>
        <div class="gender-grid">
          <button type="button" class="gender-card ${state.playerGender === 'female' ? 'active' : ''}" data-pick-gender="female">
            <div class="gender-avatar-box">
              <img src="${state.femalePreviewUrl}" alt="Jägerin / Schmiedin" />
            </div>
            <div>
              <div style="font-size:16px;font-weight:900;color:#5a2d0c;">👧 Frau / Entdeckerin</div>
              <div style="font-size:13px;font-weight:700;color:#b45309;">„Von der Jägerin zur Schmiedin“</div>
              <div style="font-size:12px;color:#6b533b;margin-top:2px;">Blaue Tunika, lange Zöpfe & Stirnband</div>
            </div>
          </button>

          <button type="button" class="gender-card ${state.playerGender === 'male' ? 'active' : ''}" data-pick-gender="male">
            <div class="gender-avatar-box">
              <img src="${state.malePreviewUrl}" alt="Jäger / Schmied" />
            </div>
            <div>
              <div style="font-size:16px;font-weight:900;color:#5a2d0c;">👦 Mann / Entdecker</div>
              <div style="font-size:13px;font-weight:700;color:#b45309;">„Vom Jäger zum Schmied“</div>
              <div style="font-size:12px;color:#6b533b;margin-top:2px;">Rotes Gewand & kurzer Haarschnitt</div>
            </div>
          </button>
        </div>

        <div style="font-weight:900;font-size:15px;color:#5a2d0c;margin-top:14px;margin-bottom:6px;">
          2. Wähle deine historische Spezialisierung (Rolle):
        </div>
        <div class="role-grid">
          ${(Object.keys(ROLES) as PlayerRole[])
            .map((rKey) => {
              const r = ROLES[rKey];
              const active = this.selectedRole === rKey;
              return `
                <button type="button" class="role-card ${active ? 'active' : ''}" data-pick-role="${rKey}">
                  <div style="display:flex;align-items:center;justify-content:space-between;">
                    <span style="font-size:24px;">${r.icon}</span>
                    <span class="role-badge" style="background:${active ? '#b45309' : '#3a2410'};">${active ? '✓ Gewählt' : 'Wählen'}</span>
                  </div>
                  <div style="font-weight:900;font-size:14.5px;color:#5a2d0c;">${escapeHtml(r.name)}</div>
                  <div style="font-size:12px;color:#6b533b;">${escapeHtml(r.desc)}</div>
                  <div class="role-perk">⚡ ${escapeHtml(r.perk)}</div>
                </button>
              `;
            })
            .join('')}
        </div>

        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:14px;align-items:end;">
          <div>
            <label for="start-name-input" style="display:block;font-weight:900;font-size:14.5px;color:#5a2d0c;margin-bottom:4px;">
              3. Wie heißt du? (Dein Vorname im Spiel & auf der Urkunde):
            </label>
            <input
              id="start-name-input"
              type="text"
              maxlength="20"
              value="${escapeHtml(state.playerName === 'Sippenkind' ? '' : state.playerName)}"
              placeholder="z. B. Mia, Leo, Noah, Hannah ..."
              style="width:100%;padding:9px 12px;font-size:15px;font-weight:800;border:2px solid #b45309;border-radius:8px;background:#fff;color:#2a1d10;"
            />
          </div>
          <div>
            <div style="font-weight:900;font-size:14.5px;color:#5a2d0c;margin-bottom:4px;">
              4. Start-Epoche wählen:
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">${chPills}</div>
          </div>
        </div>
      </div>
    `;

    this.modalFooterEl.style.justifyContent = 'space-between';
    this.modalFooterEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="font-weight:800;font-size:13px;color:#5a2d0c;">🔑 Hefter-Code (anderes Gerät):</span>
        <input
          id="start-code-input"
          type="text"
          placeholder="z. B. STZ-MIA-W-J-K3-Q4"
          style="padding:7px 10px;font-size:13.5px;font-weight:800;border:2px solid #8b5a2b;border-radius:7px;background:#fff;color:#2a1d10;width:185px;text-transform:uppercase;"
        />
        <button class="retro-btn" id="start-code-btn">📂 Code laden</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${state.hasHadExistingSaveOnBoot ? `
          <button class="retro-btn" id="start-resume-bottom-btn" style="background:#22c55e;color:#052e16;font-size:15px;padding:9px 16px;border-color:#bbf7d0;">
            ▶️ Gespeicherten Stand weiterspielen (Kap. ${state.chapter})
          </button>
        ` : ''}
        <button class="retro-btn" id="start-go-btn" style="background:#b45309;color:#fff;font-size:15px;padding:9px 18px;border-color:#fde68a;">
          🚀 Neues Spiel starten (ab Kap. ${this.startSelectedChapter})
        </button>
      </div>
    `;

    const nameInput = this.modalBodyEl.querySelector('#start-name-input') as HTMLInputElement;
    const syncNameFromInput = () => {
      const v = nameInput?.value.trim();
      if (v) state.playerName = v.slice(0, 20);
      else if (!state.playerName) state.playerName = 'Sippenkind';
    };

    this.modalBodyEl.querySelectorAll('[data-pick-gender]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncNameFromInput();
        const g = (btn as HTMLElement).dataset.pickGender === 'male' ? 'male' : 'female';
        state.setProfile(state.playerName, g, this.selectedRole);
        this.renderStartModal();
      });
    });

    this.modalBodyEl.querySelectorAll('[data-pick-role]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncNameFromInput();
        this.selectedRole = ((btn as HTMLElement).dataset.pickRole as PlayerRole) ?? 'gatherer';
        state.setProfile(state.playerName, state.playerGender, this.selectedRole);
        this.renderStartModal();
      });
    });

    this.modalBodyEl.querySelectorAll('[data-start-ch]').forEach((btn) => {
      btn.addEventListener('click', () => {
        syncNameFromInput();
        this.startSelectedChapter = Number((btn as HTMLElement).dataset.startCh) || 1;
        this.renderStartModal();
      });
    });

    const handleResume = () => {
      syncNameFromInput();
      state.setProfile(state.playerName, state.playerGender, this.selectedRole);
      this.closePanels();
      this.pushToast(`Willkommen zurück, ${state.playerName} (${ROLES[state.playerRole].name})!`);
    };

    const resumeBtnTop = this.modalBodyEl.querySelector('#start-resume-btn');
    if (resumeBtnTop) resumeBtnTop.addEventListener('click', handleResume);

    const resumeBtnBottom = this.modalFooterEl.querySelector('#start-resume-bottom-btn');
    if (resumeBtnBottom) resumeBtnBottom.addEventListener('click', handleResume);

    this.modalFooterEl.querySelector('#start-go-btn')!.addEventListener('click', () => {
      syncNameFromInput();
      state.setProfile(state.playerName, state.playerGender, this.selectedRole);
      const targetCh = this.startSelectedChapter;
      state.resetNewGame(targetCh);
      this.closePanels();
      this.pushToast(`Neues Spiel ab Kapitel ${targetCh} gestartet! Willkommen, ${state.playerName} (${ROLES[state.playerRole].name})!`);
    });

    this.modalFooterEl.querySelector('#start-code-btn')!.addEventListener('click', () => {
      const codeInput = this.modalFooterEl.querySelector('#start-code-input') as HTMLInputElement;
      const raw = codeInput?.value.trim() ?? '';
      if (!raw) {
        this.pushToast('Bitte gib zuerst deinen Hefter-Code ein (z. B. STZ-MIA-W-J-K3-Q4).');
        return;
      }
      if (state.importCode(raw)) {
        this.closePanels();
        this.pushToast(`Spielstand geladen! Willkommen zurück, ${state.playerName} (Kapitel ${state.chapter})!`);
      } else {
        this.pushToast('Code nicht erkannt. Format-Beispiel: STZ-MIA-W-J-K3-Q4-12M');
      }
    });
  }

  // ------------------------------------------------------------ Relikt-Archäologie Modal

  private openRelicModal(relicOrId: RelicDef | string): void {
    const relic = typeof relicOrId === 'string' ? RELICS[relicOrId] : relicOrId;
    if (!relic) return;
    this.currentRelic = relic;
    if (!state.relicsFound.includes(relic.id)) {
      state.relicsFound.push(relic.id);
      sfx.fanfare();
      state.persist();
      state.emit('relicFound', relic.id);
    }
    this.togglePanel('relic');
  }

  private renderRelicModal(relic: RelicDef): void {
    this.modalCardEl.className = 'modal-card';
    this.modalTitleEl.textContent = `🏺 Bedeutendes Urzeit-Relikt: ${relic.title}`;

    const alreadyAnswered = state.relicQuizAnswered.includes(relic.id);

    const optsHtml = relic.options
      .map((opt, i) => {
        return `
          <button class="retro-btn relic-opt-btn" data-relic-opt="${i}" style="text-align:left;padding:10px 14px;font-size:14px;line-height:1.4;margin-bottom:6px;width:100%;">
            <span class="key-badge">${String.fromCharCode(65 + i)}</span> ${escapeHtml(opt)}
          </button>
        `;
      })
      .join('');

    this.modalBodyEl.innerHTML = `
      <div style="background:linear-gradient(135deg,#362208 0%,#54350d 100%);border:2.5px solid #fbbf24;border-radius:10px;padding:14px 18px;color:#fff;margin-bottom:12px;display:flex;align-items:center;gap:16px;">
        <div style="background:#261806;border:2px solid #e8c170;border-radius:12px;width:68px;height:68px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <img src="${relic.image}" alt="${escapeHtml(relic.title)}" style="width:48px;height:48px;image-rendering:pixelated;object-fit:contain;">
        </div>
        <div>
          <div style="font-size:11px;font-weight:900;text-transform:uppercase;color:#fde68a;letter-spacing:1px;">
            Archäologischer Fund · ${escapeHtml(relic.epoch)}
          </div>
          <div style="font-size:20px;font-weight:900;color:#fff;margin:2px 0;">
            ${escapeHtml(relic.title)}
          </div>
          <div style="font-size:12.5px;color:#fef3c7;">
            📍 Fundort: ${escapeHtml(relic.locationHint)}
          </div>
        </div>
      </div>

      <div style="background:#fffdf7;border:2px solid #c29b61;border-radius:10px;padding:14px 16px;margin-bottom:12px;font-size:14.5px;color:#3b2310;line-height:1.5;">
        <strong>Historischer Befund:</strong> ${escapeHtml(relic.lore)}
      </div>

      <div style="background:#fef3c7;border:2px solid #d97706;border-radius:10px;padding:14px 16px;">
        <div style="font-weight:900;font-size:15px;color:#78350f;margin-bottom:8px;">
          ❓ Archäologie-Rätsel: ${escapeHtml(relic.question)}
        </div>
        <div id="relic-options-container">${optsHtml}</div>
        <div id="relic-feedback" style="display:${alreadyAnswered ? 'block' : 'none'};margin-top:10px;font-size:13.5px;font-weight:800;color:#166534;background:#dcfce7;border:1.5px solid #86efac;padding:8px 12px;border-radius:7px;">
          ✓ ${escapeHtml(relic.explanation)}
        </div>
      </div>
    `;

    this.modalFooterEl.innerHTML = `
      <div style="font-size:12.5px;color:#5a2d0c;font-weight:800;">
        🏺 Bisher erforscht: ${state.relicsFound.length}/5 Relikten · Archäologen-Quiz gelöst: ${state.relicQuizAnswered.length}/5
      </div>
      <button class="retro-btn" id="relic-done-btn" style="background:#22c55e;color:#052e16;font-size:14px;padding:8px 16px;">
        ✓ Fund dokumentieren & weiterforschen
      </button>
    `;

    const feedbackEl = this.modalBodyEl.querySelector('#relic-feedback') as HTMLElement;
    this.modalBodyEl.querySelectorAll('[data-relic-opt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const optIdx = Number((btn as HTMLElement).dataset.relicOpt);
        if (optIdx === relic.correct) {
          (btn as HTMLElement).style.background = '#22c55e';
          (btn as HTMLElement).style.color = '#fff';
          if (!state.relicQuizAnswered.includes(relic.id)) {
            state.relicQuizAnswered.push(relic.id);
            sfx.fanfare();
            state.persist();
          }
          feedbackEl.style.display = 'block';
          feedbackEl.textContent = `✓ Richtig! ${relic.explanation}`;
        } else {
          (btn as HTMLElement).style.background = '#ef4444';
          (btn as HTMLElement).style.color = '#fff';
          feedbackEl.style.display = 'block';
          feedbackEl.style.background = '#fee2e2';
          feedbackEl.style.borderColor = '#fca5a5';
          feedbackEl.style.color = '#991b1b';
          feedbackEl.textContent = '✗ Leider nicht richtig. Lies den historischen Befund noch einmal aufmerksam!';
          sfx.craft();
        }
      });
    });

    this.modalFooterEl.querySelector('#relic-done-btn')!.addEventListener('click', () => {
      this.closePanels();
      this.pushToast(`Relikt „${relic.title}“ erfolgreich in deiner Geschichtssammlung erfasst!`);
    });
  }

  // ------------------------------------------------------------ Pausescreen (Statistiken, Spielzeit & Hefter-Code)

  private renderPauseModal(): void {
    state.persist();
    this.modalCardEl.className = 'modal-card';
    this.modalTitleEl.textContent = '⏸️ Spiel pausiert – Abenteuer-Statistik & Sicherung (P)';

    const avatar = state.playerGender === 'female' ? state.femalePreviewUrl : state.malePreviewUrl;
    const meta = CHAPTERS[state.chapter] ?? CHAPTERS[1];
    const qText = meta.quests[Math.min(state.quest, meta.quests.length - 1)];
    const t = state.dayTime;
    const dayPhase = t < 0.55 ? '☀️ Tag' : t < 0.7 ? '🌅 Abenddämmerung' : t < 0.9 ? '🌙 Nacht' : '🌄 Morgengrauen';
    const shortCode = state.exportCode();

    const builtList =
      state.buildings.length > 0
        ? state.buildings.map((id) => BUILDINGS.find((b) => b.id === id)?.name ?? id).join(', ')
        : 'Noch keine Dorfgebäude errichtet';

    this.modalBodyEl.innerHTML = `
      <div style="background:linear-gradient(135deg,#2b1a0c 0%,#462b14 100%);border:2px solid #e8c170;border-radius:10px;padding:12px 16px;color:#fff6e0;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
        <div style="display:flex;align-items:center;gap:14px;">
          <div class="gender-avatar-box">
            <img src="${avatar}" alt="${escapeHtml(state.playerName)}" />
          </div>
          <div>
            <div style="display:inline-block;background:#fbbf24;color:#1a1208;font-weight:900;font-size:11px;padding:2px 8px;border-radius:99px;margin-bottom:3px;">
              ⏸ ZEIT, HUNGER & SCHUTZ SIND ANGEHALTEN
            </div>
            <div style="font-size:19px;font-weight:900;color:#ffe28a;">
              ${escapeHtml(state.playerName)} · <span style="font-size:15px;color:#fed7aa;">${escapeHtml(state.epochRankTitle())}</span>
            </div>
            <div style="font-size:13px;color:#e8dec5;margin-top:2px;">
              <strong>Aktuelle Aufgabe:</strong> ${escapeHtml(qText)}
            </div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11.5px;color:#bbf7d0;font-weight:800;">✓ Automatisch auf diesem Gerät gespeichert</div>
          <div style="font-size:12px;color:#fde68a;">${escapeHtml(meta.title)}</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-tile">
          <div class="stat-icon">${ROLES[state.playerRole].icon}</div>
          <div>
            <div class="stat-val">${escapeHtml(ROLES[state.playerRole].name)}</div>
            <div class="stat-lbl">${escapeHtml(ROLES[state.playerRole].perk)}</div>
          </div>
        </div>
        <div class="stat-tile">
          <div class="stat-icon">⏱️</div>
          <div>
            <div class="stat-val">${escapeHtml(state.formatPlayTime())}</div>
            <div class="stat-lbl">Gespielte Abenteuerzeit</div>
          </div>
        </div>
        <div class="stat-tile">
          <div class="stat-icon">☀️</div>
          <div>
            <div class="stat-val">Tag ${state.daysSurvived} (${dayPhase})</div>
            <div class="stat-lbl">Überlebte Tage in der Urzeit</div>
          </div>
        </div>
        <div class="stat-tile">
          <div class="stat-icon">👣</div>
          <div>
            <div class="stat-val">${Math.round(state.distanceMeters)} Meter</div>
            <div class="stat-lbl">Zu Fuß zurückgelegte Strecke</div>
          </div>
        </div>
        <div class="stat-tile">
          <div class="stat-icon">🎒</div>
          <div>
            <div class="stat-val">${state.totalItemsCollected()} Gegenstände</div>
            <div class="stat-lbl">Gesammelt, geerntet & geschmiedet</div>
          </div>
        </div>
        <div class="stat-tile">
          <div class="stat-icon">🏠</div>
          <div>
            <div class="stat-val">${state.buildings.length} / ${BUILDINGS.length} Bauwerke</div>
            <div class="stat-lbl" title="${escapeHtml(builtList)}">Im Steinzeit-Dorf errichtet</div>
          </div>
        </div>
        <div class="stat-tile">
          <div class="stat-icon">📖</div>
          <div>
            <div class="stat-val">${state.lexicon.length} / ${Object.keys(LEXICON).length} Begriffe (${state.knowledge}%)</div>
            <div class="stat-lbl">Entdecktes Geschichtswissen</div>
          </div>
        </div>
      </div>

      <div style="background:#fffdf7;border:2px solid #c29b61;border-radius:10px;padding:12px 14px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <div style="font-weight:900;font-size:14.5px;color:#5a2d0c;">
            🏺 Urzeit-Relikte & Archäologie (${state.relicsFound.length} / 5 entdeckt):
          </div>
          <div style="font-size:12px;font-weight:800;color:${state.relicsFound.length === 5 ? '#15803d' : '#b45309'};">
            ${state.relicsFound.length === 5 ? '🏅 Vollständig (S-Rang Siegel verliehen)!' : 'Suche in Höhlen & Bergen'}
          </div>
        </div>
        <div class="relic-grid">
          ${Object.values(RELICS).map((rel) => {
            const found = state.relicsFound.includes(rel.id);
            const answered = state.relicQuizAnswered.includes(rel.id);
            return `
              <div class="relic-card ${found ? 'found' : 'locked'}" title="${escapeHtml(rel.title)} (${escapeHtml(rel.epoch)})">
                <span class="relic-icon-big">
                  ${found ? `<img src="${rel.image}" alt="${escapeHtml(rel.title)}" style="width:30px;height:30px;image-rendering:pixelated;object-fit:contain;vertical-align:middle;">` : '❓'}
                </span>
                <span class="relic-name">${escapeHtml(found ? rel.title : 'Unentdeckt')}</span>
                <span style="font-size:10.5px;color:${answered ? '#15803d' : '#854d0e'};font-weight:700;">
                  ${found ? (answered ? '✓ Erforscht' : 'Quiz offen') : 'Verborgen'}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div style="background:#fef3c7;border:2px solid #d97706;border-radius:10px;padding:12px 16px;margin-bottom:10px;">
        <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;">
          <div style="flex:1;min-width:240px;">
            <div style="font-weight:900;font-size:15px;color:#7a3b10;">
              📒 Dein kurzer Hefter-Code zum Unterbrechen / Gerätewechsel:
            </div>
            <div style="font-size:13px;color:#4a3520;margin-top:2px;">
              Auf <strong>diesem Gerät</strong> kannst du beim nächsten Mal einfach auf „Weiter spielen“ klicken. Falls du in der nächsten Stunde ein <strong>anderes iPad</strong> bekommst, notiere dir diesen kurzen Code im Heft:
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <span class="shortcode-pill">${escapeHtml(shortCode)}</span>
            <button class="retro-btn" id="pause-copy-code">📋 Code kopieren</button>
          </div>
        </div>
      </div>

      <div style="background:#fffdf7;border:1.5px solid #c29b61;border-radius:10px;padding:10px 14px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <strong style="font-size:13.5px;color:#5a2d0c;">🧑 Figur & Rolle:</strong>
          <input
            id="pause-name-input"
            type="text"
            maxlength="20"
            value="${escapeHtml(state.playerName)}"
            style="padding:5px 10px;font-size:14px;font-weight:800;border:1.5px solid #8b5a2b;border-radius:6px;width:150px;"
          />
          <button class="retro-btn" data-pause-gender="female" style="background:${state.playerGender === 'female' ? '#b45309' : '#3a2410'};">
            👧 Frau
          </button>
          <button class="retro-btn" data-pause-gender="male" style="background:${state.playerGender === 'male' ? '#b45309' : '#3a2410'};">
            👦 Mann
          </button>
          <span style="border-left:1.5px solid #d4c19c;height:22px;margin:0 4px;"></span>
          <button class="retro-btn" data-pause-role="hunter" style="background:${state.playerRole === 'hunter' ? '#b45309' : '#3a2410'};">🏹 Jäger</button>
          <button class="retro-btn" data-pause-role="gatherer" style="background:${state.playerRole === 'gatherer' ? '#b45309' : '#3a2410'};">🌿 Sammler</button>
          <button class="retro-btn" data-pause-role="crafter" style="background:${state.playerRole === 'crafter' ? '#b45309' : '#3a2410'};">⚒️ Schmied</button>
          <button class="retro-btn" id="pause-save-profile">✓ Übernehmen</button>
        </div>
      </div>
    `;

    this.modalFooterEl.innerHTML = `
      <button class="retro-btn" id="pause-startscreen-btn">🏠 Zum Startbildschirm</button>
      <button class="retro-btn" id="pause-chapter-btn">🗺️ Epoche wechseln</button>
      <button class="retro-btn" id="pause-resume-btn" style="background:#3b5e2b;color:#fff;font-size:15px;padding:8px 18px;">
        ▶️ Weiter spielen (P)
      </button>
    `;

    this.modalBodyEl.querySelector('#pause-copy-code')!.addEventListener('click', () => {
      navigator.clipboard?.writeText(shortCode);
      this.pushToast(`Hefter-Code kopiert: ${shortCode}`);
    });

    const savePauseProfile = (gender: 'female' | 'male', role?: PlayerRole) => {
      const inp = this.modalBodyEl.querySelector('#pause-name-input') as HTMLInputElement;
      const newName = inp?.value.trim() || state.playerName;
      state.setProfile(newName, gender, role ?? state.playerRole);
      this.selectedRole = state.playerRole;
      this.renderPauseModal();
      this.pushToast(`Gespeichert: ${state.playerName} (${state.roleSpecialistTitle()})`);
    };

    this.modalBodyEl.querySelectorAll('[data-pause-gender]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const g = (btn as HTMLElement).dataset.pauseGender === 'male' ? 'male' : 'female';
        savePauseProfile(g);
      });
    });

    this.modalBodyEl.querySelectorAll('[data-pause-role]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const r = ((btn as HTMLElement).dataset.pauseRole as PlayerRole) || 'gatherer';
        savePauseProfile(state.playerGender, r);
      });
    });

    this.modalBodyEl.querySelector('#pause-save-profile')!.addEventListener('click', () => {
      savePauseProfile(state.playerGender);
    });

    this.modalFooterEl.querySelector('#pause-startscreen-btn')!.addEventListener('click', () => {
      state.hasHadExistingSaveOnBoot = true;
      this.activePanel = 'start';
      this.renderActivePanel();
    });
    this.modalFooterEl.querySelector('#pause-chapter-btn')!.addEventListener('click', () => {
      this.activePanel = 'chapter';
      this.renderActivePanel();
    });
    this.modalFooterEl.querySelector('#pause-resume-btn')!.addEventListener('click', () => this.closePanels());
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
      <button class="retro-btn" id="ch-pause-btn">⏸ Profil & Statistik</button>
      <button class="retro-btn" id="ch-export-btn">📋 Hefter-Code (${escapeHtml(state.exportCode())})</button>
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

    this.modalFooterEl.querySelector('#ch-pause-btn')!.addEventListener('click', () => {
      this.activePanel = 'pause';
      this.renderActivePanel();
    });
    this.modalFooterEl.querySelector('#ch-export-btn')!.addEventListener('click', () => {
      const code = state.exportCode();
      navigator.clipboard?.writeText(code);
      window.prompt('Notiere oder kopiere diesen kurzen Hefter-Code für die nächste Stunde:', code);
    });
    this.modalFooterEl.querySelector('#ch-import-btn')!.addEventListener('click', () => {
      const code = window.prompt('Gib hier deinen kurzen Hefter-Code ein (z. B. MIA-W-K3-Q4):');
      if (code) {
        this.closePanels();
        if (state.importCode(code)) {
          this.pushToast(`Spielstand geladen: ${state.playerName} (Kapitel ${state.chapter})!`);
        } else {
          this.pushToast('Ungültiger Code. Beispiel: MIA-W-K3-Q4');
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
    this.modalTitleEl.textContent = `📜 EPOCHEN-URKUNDE: ${state.roleTitle().toUpperCase()}`;

    const lexTotal = Object.keys(LEXICON).length;
    const lexCount = state.lexicon.length;
    const bldCount = state.buildings.length;
    const f = state.playerGender === 'female';
    const score = lexCount * 4 + bldCount * 6 + state.chapter * 5 - state.quizAttempts * 2 - state.collapses * 3;
    const rank =
      score >= 85 || (state.chapter === 6 && bldCount >= 6)
        ? f
          ? '🏆 Rang S – Meisterin der Menschheitsgeschichte'
          : '🏆 Rang S – Meister der Menschheitsgeschichte'
        : score >= 50 || state.chapter >= 4
          ? f
            ? '🥈 Rang A – Kundige Dorfgründerin & Schmiedin'
            : '🥈 Rang A – Kundiger Dorfgründer & Schmied'
          : f
            ? '🥉 Rang B – Tapfere Entdeckerin der Urgeschichte'
            : '🥉 Rang B – Tapferer Entdecker der Urgeschichte';

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
            <div style="font-size:12px;color:#786655;font-weight:700;">${f ? 'ENTDECKERIN' : 'ENTDECKER'}</div>
            <div style="font-size:20px;font-weight:900;color:#5a2d0c;">${escapeHtml(state.playerName)}</div>
            <div style="font-size:12.5px;color:#b45309;font-weight:700;">${escapeHtml(state.epochRankTitle())}</div>
          </div>
          <div>
            <div style="font-size:12px;color:#786655;font-weight:700;">ERREICHTE EPOCHE</div>
            <div style="font-size:17px;font-weight:800;color:#7a3b10;">${escapeHtml(CHAPTERS[state.chapter].title)}</div>
            <div style="font-size:12.5px;color:#6b533b;">Spielzeit: ${escapeHtml(state.formatPlayTime())} · Tag ${state.daysSurvived}</div>
          </div>
          <div>
            <div style="font-size:12px;color:#786655;font-weight:700;">AUSZEICHNUNG</div>
            <div style="font-size:16px;font-weight:800;color:#b45309;">${escapeHtml(rank)}</div>
          </div>
        </div>

        <div class="grid-2col" style="margin-bottom:12px;font-size:14px;">
          <div>🎖️ <strong>Spezialisierung:</strong> ${escapeHtml(state.roleSpecialistTitle())} (${escapeHtml(ROLES[state.playerRole].name)})</div>
          <div>📖 <strong>Entdecktes Lexikon-Wissen:</strong> ${lexCount} von ${lexTotal} Einträgen (${state.knowledge}%)</div>
          <div>🏠 <strong>Dorf-Bauwerke (${bldCount}/${BUILDINGS.length}):</strong> ${escapeHtml(builtNames)}</div>
          <div>🐾 <strong>Begleiter & Herde:</strong> ${state.wolfTamed ? 'Hütehund Lupo' : '–'}, ${state.goatsTamed}× gezähmte Ziege(n)</div>
          <div>🏺 <strong>Urzeit-Relikte:</strong> ${state.relicsFound.length}/5 gehoben (${state.relicQuizAnswered.length}/5 erforscht)</div>
          <div>👣 <strong>Strecke:</strong> ${Math.round(state.distanceMeters)} m · 🎯 <strong>Quiz-Fehler:</strong> ${state.quizAttempts}</div>
        </div>

        ${state.relicsFound.length === 5 && state.relicQuizAnswered.length === 5 ? `
          <div style="background:linear-gradient(135deg,#78350f 0%,#b45309 100%);color:#fef3c7;border:2px solid #fde68a;border-radius:8px;padding:8px 14px;margin-bottom:12px;display:flex;align-items:center;gap:12px;">
            <span style="font-size:32px;">🏅</span>
            <div>
              <div style="font-weight:900;font-size:14px;color:#fff;">GOLDENES S-RANG ARCHÄOLOGEN-SIEGEL</div>
              <div style="font-size:12px;color:#fde68a;">Alle 5 bedeutenden Relikte der Urzeit entdeckt und das historische Fachquiz fehlerfrei gemeistert!</div>
            </div>
          </div>
        ` : ''}

        <div class="merksatz-box">
          <div style="font-weight:800;color:#7a3b10;margin-bottom:6px;">📒 Zusammenfassung & Hefter-Merksätze der gespielten Epochen:</div>
          ${merksaetzeDone}
        </div>

        <div style="margin-top:10px;font-size:13px;color:#6b553f;">
          <strong>Kurzer Hefter-Speichercode:</strong> <code style="font-size:14px;font-weight:900;color:#2a1d10;">${escapeHtml(state.exportCode())}</code>
        </div>
      </div>
    `;

    this.modalFooterEl.innerHTML = `
      <button class="retro-btn" id="cert-name-btn">✎ Figur & Name anpassen</button>
      <button class="retro-btn" id="cert-timeline-btn">⏳ Vergleichstabelle öffnen</button>
      <button class="retro-btn" id="cert-print-btn" style="background:#3b5e2b;color:#fff;">🖨 Urkunde & Merksätze drucken</button>
    `;

    this.modalFooterEl.querySelector('#cert-name-btn')!.addEventListener('click', () => {
      this.activePanel = 'pause';
      this.renderActivePanel();
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
