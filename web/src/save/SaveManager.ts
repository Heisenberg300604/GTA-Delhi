/** Versioned save in localStorage. Bump VERSION and add a migration when the shape changes. */

export interface SaveData {
  version: number;
  money: number;
  debt: number;
  debtRevealed: boolean;
  completed: string[];
  flags: Record<string, string | number | boolean>;
  /** In-progress mission checkpoint. */
  current: { mission: string; stage: number; vars: Record<string, unknown> } | null;
}

const KEY = 'ringroad.save';
const VERSION = 1;

export const NEW_GAME: SaveData = {
  version: VERSION,
  money: 1200,
  debt: 1400000,
  debtRevealed: false,
  completed: [],
  flags: {},
  current: null,
};

export class SaveManager {
  data: SaveData;

  constructor() {
    this.data = this.load() ?? structuredClone(NEW_GAME);
  }

  private load(): SaveData | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const d = JSON.parse(raw) as SaveData;
      if (d.version !== VERSION) return null; // future: migrate
      return { ...structuredClone(NEW_GAME), ...d };
    } catch {
      return null;
    }
  }

  get hasProgress(): boolean {
    return this.data.completed.length > 0 || this.data.current !== null;
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      /* storage full or blocked: the game keeps running */
    }
  }

  reset() {
    this.data = structuredClone(NEW_GAME);
    this.save();
  }
}
