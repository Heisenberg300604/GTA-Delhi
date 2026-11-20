/**
 * Keyboard + mouse input. Key presses are latched until consumed by the fixed-step
 * simulation so a quick tap is never lost between physics ticks.
 */
export class Input {
  private held = new Set<string>();
  private latched = new Set<string>();
  mouseDX = 0;
  mouseDY = 0;
  pointerLocked = false;
  /** When true, gameplay queries return nothing (cutscenes). UI uses the *UI variants. */
  locked = false;

  constructor(private readonly target: HTMLElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.held.add(e.code);
      this.latched.add(e.code);
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => this.held.clear());
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.target;
    });
    document.addEventListener('mousedown', (e) => {
      if (this.pointerLocked) this.latched.add(`Mouse${e.button}`);
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
  }

  requestPointerLock() {
    Promise.resolve(this.target.requestPointerLock()).catch(() => {});
  }

  down(code: string): boolean {
    return !this.locked && this.held.has(code);
  }

  /** -1..1 from two keys (with arrow-key alternates). */
  axis(neg: string[], pos: string[]): number {
    if (this.locked) return 0;
    let v = 0;
    if (neg.some((k) => this.held.has(k))) v -= 1;
    if (pos.some((k) => this.held.has(k))) v += 1;
    return v;
  }

  /** True once per physical key press. */
  consume(code: string): boolean {
    if (this.locked || !this.latched.has(code)) return false;
    this.latched.delete(code);
    return true;
  }

  /** UI input that works even while gameplay is locked. */
  consumeUI(code: string): boolean {
    if (!this.latched.has(code)) return false;
    this.latched.delete(code);
    return true;
  }

  downUI(code: string): boolean {
    return this.held.has(code);
  }

  clearLatched() {
    this.latched.clear();
  }

  endFrame() {
    this.mouseDX = 0;
    this.mouseDY = 0;
  }
}
