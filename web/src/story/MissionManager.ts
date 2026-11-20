import type { StoryHost } from './StoryHost';
import { MissionContext, MissionAborted, MissionFailed } from './MissionContext';

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
  /** Replaces the "+₹reward" line on the MISSION PASSED stamp. */
  rewardText?: string;
  /** Walk/drive here to start. Missions without a trigger start right away. */
  trigger?: { x: number; z: number; radius: number; label: string };
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

  /** First mission not yet completed (in story order). */
  nextAvailable(): Mission | null {
    const done = this.host.save.data.completed;
    return [...this.registry.values()].find((m) => !done.includes(m.id)) ?? null;
  }

  /** Resume a saved checkpoint, or start the next mission if it has no trigger. */
  startNext(): boolean {
    const save = this.host.save.data;
    if (save.current && this.registry.has(save.current.mission)) {
      const m = this.registry.get(save.current.mission)!;
      void this.run(m, save.current.stage, save.current.vars, true);
      return true;
    }
    const next = this.nextAvailable();
    if (!next || next.trigger) return false;
    void this.run(next, 0, {}, false);
    return true;
  }

  start(m: Mission) {
    void this.run(m, 0, {}, false);
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
      let restore = resume;
      for (let i = fromStage; i < m.stages.length; ) {
        const stage = m.stages[i];
        host.save.data.current = { mission: m.id, stage: i, vars: ctx.vars };
        host.save.save();
        const snapshot = structuredClone(ctx.vars);
        if (restore) stage.restore?.(host, ctx);
        try {
          await stage.run(ctx);
          i++;
          restore = false;
        } catch (err) {
          if (!(err instanceof MissionFailed)) throw err;
          // failed: show why, then retry this stage from its checkpoint
          ctx.clearFailure();
          ctx.cleanup();
          host.setControlsLocked(false);
          host.dialogue.hide();
          host.hud.splash('MISSION FAILED', m.title, err.message, 3.2);
          await ctx.wait(3.2);
          ctx.vars = structuredClone(snapshot);
          restore = true;
        }
      }
      // completed
      const save = host.save.data;
      save.completed.push(m.id);
      save.current = null;
      save.money += m.reward;
      host.save.save();
      host.hud.setWallet(save.money);
      m.onComplete?.(host);
      const reward = m.rewardText ?? `+₹${m.reward.toLocaleString('en-IN')}`;
      host.hud.splash('MISSION PASSED', m.title, `${reward}${m.next ? ` · Next: ${m.next}` : ''}`);
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
