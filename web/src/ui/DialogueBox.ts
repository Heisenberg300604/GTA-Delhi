import { CAST, type CastId } from '../story/cast';
import type { Input } from '../engine/Input';

export interface Line {
  who: CastId;
  /** Hinglish line as spoken. */
  text: string;
  /** English translation, shown as a subtitle when enabled. */
  en?: string;
  /** Phone call styling. */
  phone?: boolean;
}

/**
 * Speech box with typewriter text, Hinglish + English subtitle, and choices.
 * Lines auto-advance after a reading delay; E / Space / click skips ahead.
 */
export class DialogueBox {
  private el: HTMLDivElement;
  private nameEl: HTMLDivElement;
  private textEl: HTMLDivElement;
  private enEl: HTMLDivElement;
  private choicesEl: HTMLDivElement;
  private full = '';
  private shown = 0;
  private hold = 0;
  private line: Line | null = null;
  private choices: string[] | null = null;
  private chosen = -1;
  private linger = 0;
  showTranslation = true;
  /** Set when the current line/choice is finished. */
  done = true;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'dialogue';
    this.el.innerHTML = `<div class="who"></div><div class="text"></div><div class="en"></div><div class="choices"></div><div class="hint">E / click ›</div>`;
    parent.appendChild(this.el);
    this.nameEl = this.el.querySelector('.who')!;
    this.textEl = this.el.querySelector('.text')!;
    this.enEl = this.el.querySelector('.en')!;
    this.choicesEl = this.el.querySelector('.choices')!;
  }

  say(line: Line) {
    const c = CAST[line.who];
    this.line = line;
    this.choices = null;
    this.full = line.text;
    this.shown = 0;
    this.hold = 1.1 + line.text.length * 0.045;
    this.done = false;
    this.nameEl.textContent = (line.phone ? '📞 ' : '') + c.name;
    this.nameEl.style.color = c.color;
    this.enEl.textContent = this.showTranslation && line.en ? line.en : '';
    this.choicesEl.innerHTML = '';
    this.el.classList.toggle('phone', !!line.phone);
    this.el.style.opacity = '1';
    this.linger = 0;
  }

  choose(who: CastId, options: { text: string; en?: string }[]) {
    this.line = null;
    this.choices = options.map((o) => o.text);
    this.chosen = -1;
    this.done = false;
    this.nameEl.textContent = CAST[who].name;
    this.nameEl.style.color = CAST[who].color;
    this.textEl.textContent = '';
    this.enEl.textContent = '';
    this.choicesEl.innerHTML = options
      .map((o, i) => `<div class="choice"><b>${i + 1}</b> ${o.text}${this.showTranslation && o.en ? `<span>${o.en}</span>` : ''}</div>`)
      .join('');
    this.el.classList.remove('phone');
    this.el.style.opacity = '1';
  }

  get choice(): number {
    return this.chosen;
  }

  hide() {
    this.el.style.opacity = '0';
    this.line = null;
    this.choices = null;
    this.done = true;
  }

  update(dt: number, input: Input) {
    if (this.choices) {
      for (let i = 0; i < this.choices.length; i++) {
        if (input.consumeUI(`Digit${i + 1}`) || input.consumeUI(`Numpad${i + 1}`)) {
          this.chosen = i;
          this.done = true;
          this.hide();
          return;
        }
      }
      return;
    }
    if (this.line && this.done) {
      // hide if no new line follows shortly (avoids flicker between lines)
      this.linger += dt;
      if (this.linger > 0.3) this.hide();
      return;
    }
    if (!this.line) return;
    const advance = input.consumeUI('KeyE') || input.consumeUI('Space') || input.consumeUI('Mouse0') || input.consumeUI('Enter');
    if (this.shown < this.full.length) {
      this.shown = advance ? this.full.length : Math.min(this.full.length, this.shown + dt * 55);
      this.textEl.textContent = this.full.slice(0, Math.floor(this.shown));
      return;
    }
    this.hold -= dt;
    if (advance || this.hold <= 0) this.done = true;
  }
}
