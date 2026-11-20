import type { StoryHost } from './StoryHost';
import { MissionContext, MissionAborted } from './MissionContext';

export interface Stage {
  id: string;
  /** Re-creates the world state when the game is loaded at this checkpoint. */
  restore?: (host: StoryHost, ctx: MissionContext) => void;
  run: (ctx: MissionContext) => Promise<void>;
}

export interface Mission {
  id: string;
  title: string;
  reward: number;
  next?: string;
  stages: Stage[];
  onComplete?: (host: StoryHost) => void;
}

/** Runs one mission at a time, saving a checkpoint at the start of every stage. */
export class MissionManager {
  private ctx: MissionContext | null = null;
  private active: Mission | null = null;
  private registry = new Map<string, Mission>();

  constructor(private readonly host: StoryHost, missions: Mission[]) {
    for (const m of missions) this.registry.set(m.id, m);
  }

  get running(): Mission | null {
    return this.active;
  }

  get context(): MissionContext | null {
    return this.ctx;
  }

  tick(dt: number) {
    this.ctx?.tick(dt);
  }

  /** Resume a saved checkpoint, or start the first mission not yet completed. */
  startNext(): boolean {
    const save = this.host.save.data;
    if (save.current && this.registry.has(save.current.mission)) {
      const m = this.registry.get(save.current.mission)!;
      void this.run(m, save.current.stage, save.current.vars, true);
      return true;
    }
    const next = [...this.registry.values()].find((m) => !save.completed.includes(m.id));
    if (!next) return false;
    void this.run(next, 0, {}, false);
    return true;
  }

  abort() {
    this.ctx?.abort();
  }

  private async run(m: Mission, fromStage: number, vars: Record<string, unknown>, resume: boolean) {
    if (this.active) return;
    const host = this.host;
    const ctx = new MissionContext(host, vars);
    this.active = m;
    this.ctx = ctx;
    try {
      for (let i = fromStage; i < m.stages.length; i++) {
        const stage = m.stages[i];
        host.save.data.current = { mission: m.id, stage: i, vars: ctx.vars };
        host.save.save();
        if (resume && i === fromStage) stage.restore?.(host, ctx);
        await stage.run(ctx);
      }
      // completed
      const save = host.save.data;
      save.completed.push(m.id);
      save.current = null;
      save.money += m.reward;
      host.save.save();
      host.hud.setWallet(save.money);
      m.onComplete?.(host);
      host.hud.splash('MISSION PASSED', m.title, `+₹${m.reward.toLocaleString('en-IN')}${m.next ? ` · Next: ${m.next}` : ''}`);
    } catch (err) {
      if (!(err instanceof MissionAborted)) {
        console.error(`Mission ${m.id} crashed`, err);
        host.hud.showToast('Mission error — see console');
      }
    } finally {
      ctx.cleanup();
      this.active = null;
      this.ctx = null;
    }
  }
}
