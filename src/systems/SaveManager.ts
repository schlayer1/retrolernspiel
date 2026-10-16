import { BuildingId } from '../data/items';

export interface Placed {
  x: number;
  y: number;
  /** Zeitstempel (Date.now) der Platzierung */
  t: number;
}

export type PlotStage = 'raw' | 'tilled' | 'seeded' | 'watered' | 'ripe';

export interface FarmPlotState {
  id: number;
  stage: PlotStage;
  wateredAt: number;
}

export type PlayerGender = 'female' | 'male';
export type PlayerRole = 'hunter' | 'gatherer' | 'crafter';

export interface SaveData {
  version: 3;
  playerName: string;
  playerGender?: PlayerGender;
  playerRole?: PlayerRole;
  chapter: number;
  x: number;
  y: number;
  inventory: Record<string, number>;
  lexicon: string[];
  relicsFound?: string[];
  relicQuizAnswered?: string[];
  food: number;
  safety: number;
  knowledge: number;
  quest: number;
  counts: Record<string, number>;
  fires: Placed[];
  traps: Placed[];
  plots: FarmPlotState[];
  buildings: BuildingId[];
  wolfTamed: boolean;
  goatsTamed: number;
  dayTime: number;
  collapses: number;
  quizAttempts: number;
  playTimeSec?: number;
  distanceMeters?: number;
  daysSurvived?: number;
}

/** Austauschbares Speicher-Backend. */
export interface SaveBackend {
  load(key: string): SaveData | null;
  save(key: string, data: SaveData): void;
  clear(key: string): void;
}

export class LocalStorageBackend implements SaveBackend {
  load(key: string): SaveData | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as SaveData) : null;
    } catch {
      return null;
    }
  }
  save(key: string, data: SaveData): void {
    localStorage.setItem(key, JSON.stringify(data));
  }
  clear(key: string): void {
    localStorage.removeItem(key);
  }
}

export class SaveManager {
  constructor(private backend: SaveBackend = new LocalStorageBackend(), private key = 'steinzeit-save-v3') {}

  hasSave(): boolean {
    return this.load() !== null;
  }
  load(): SaveData | null {
    const d = this.backend.load(this.key);
    return d && d.version === 3 ? d : null;
  }
  save(data: SaveData): void {
    this.backend.save(this.key, data);
  }
  clear(): void {
    this.backend.clear(this.key);
  }
}
