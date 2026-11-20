/**
 * Plain-DOM HUD for Phase 1. Becomes React components once the phone,
 * dialogue and menus arrive (the engine only talks to it through these methods).
 */
export class Hud {
  private root: HTMLDivElement;
  private prompt: HTMLDivElement;
  private speedo: HTMLDivElement;
  private overlay: HTMLDivElement;
  private toast: HTMLDivElement;
  private toastTimer = 0;
  private bark: HTMLDivElement;
  private barkTimer = 0;
  private splashTimer = 0;

  constructor(parent: HTMLElement, onStart: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud-title">RING ROAD <span>· Project Dilli · Phase 4 · Mission 1</span></div>
      <div class="hud-hisaab hidden"><div class="label">हिसाब · FAMILY DEBT</div><div class="amount">₹14,00,000</div></div>
      <div class="hud-wallet">₹1,200</div>
      <div class="hud-objective"></div>
      <div class="hud-meter"><div class="label"></div><div class="bar"><div class="fill"></div></div></div>
      <div class="letterbox top"></div><div class="letterbox bottom"></div>
      <div class="hud-skip">Hold <b>Enter</b> to skip</div>
      <div class="hud-fade"></div>
      <div class="hud-splash"><div class="stamp"></div><div class="title"></div><div class="sub"></div></div>
      <div class="hud-help">
        <b>E</b> talk · <b>WASD</b> move · <b>Shift</b> run · <b>Space</b> jump / brake · <b>F</b> enter / exit · <b>Click</b> punch · <b>H</b> horn · <b>Mouse</b> camera · <b>F3</b> stats
      </div>
      <div class="hud-prompt"></div>
      <div class="hud-speedo"><span class="kmh">0</span><span class="unit">km/h</span><div class="name">VAYU SPARK 125</div></div>
      <div class="hud-toast"></div>
      <div class="hud-bark"></div>
      <div class="hud-overlay">
        <div class="card">
          <div class="logo">RING ROAD</div>
          <div class="logo-hi">रिंग रोड</div>
          <div class="tag">Har raasta kisi hisaab pe khatam hota hai.</div>
          <div class="start">Click to play</div>
          <div class="small">Kamla Nagar, North Delhi · golden hour</div>
        </div>
      </div>`;
    parent.appendChild(this.root);
    this.prompt = this.root.querySelector('.hud-prompt')!;
    this.speedo = this.root.querySelector('.hud-speedo')!;
    this.overlay = this.root.querySelector('.hud-overlay')!;
    this.toast = this.root.querySelector('.hud-toast')!;
    this.bark = this.root.querySelector('.hud-bark')!;
    this.overlay.addEventListener('click', onStart);
  }

  showOverlay(show: boolean) {
    this.overlay.style.display = show ? 'flex' : 'none';
    const start = this.overlay.querySelector('.start');
    if (start && !show) start.textContent = 'Click to resume';
  }

  setPrompt(text: string | null) {
    this.prompt.textContent = text ?? '';
    this.prompt.style.opacity = text ? '1' : '0';
  }

  setSpeed(kmh: number | null, name?: string) {
    this.speedo.style.opacity = kmh === null ? '0' : '1';
    if (kmh !== null) this.speedo.querySelector('.kmh')!.textContent = String(Math.round(kmh));
    if (name) this.speedo.querySelector('.name')!.textContent = name.toUpperCase();
  }

  showToast(text: string, seconds = 2.5) {
    this.toast.textContent = text;
    this.toast.style.opacity = '1';
    this.toastTimer = seconds;
  }

  /** Ambient NPC line, shown as a subtitle. */
  showBark(text: string) {
    this.bark.innerHTML = `<span>Raahgir:</span> ${text}`;
    this.bark.style.opacity = '1';
    this.barkTimer = 2.4;
  }

  private q<T extends HTMLElement = HTMLDivElement>(sel: string): T {
    return this.root.querySelector(sel) as T;
  }

  setObjective(text: string | null) {
    const el = this.q('.hud-objective');
    el.innerHTML = text ?? '';
    el.style.opacity = text ? '1' : '0';
  }

  setMeter(label: string | null, value = 1) {
    const el = this.q('.hud-meter');
    el.style.opacity = label ? '1' : '0';
    if (!label) return;
    this.q('.hud-meter .label').textContent = label;
    const fill = this.q('.hud-meter .fill');
    fill.style.width = `${Math.round(value * 100)}%`;
    fill.style.background = value > 0.6 ? '#7bd389' : value > 0.3 ? '#f5c518' : '#e53935';
  }

  setLetterbox(on: boolean) {
    this.root.classList.toggle('cinematic', on);
  }

  setSkipHint(on: boolean) {
    this.q('.hud-skip').style.opacity = on ? '1' : '0';
  }

  /** 0 = clear, 1 = black. */
  setFade(v: number) {
    this.q('.hud-fade').style.opacity = String(v);
  }

  setWallet(amount: number) {
    this.q('.hud-wallet').textContent = `₹${amount.toLocaleString('en-IN')}`;
  }

  setDebt(amount: number, revealed: boolean) {
    const el = this.q('.hud-hisaab');
    el.classList.toggle('hidden', !revealed);
    this.q('.hud-hisaab .amount').textContent = `₹${amount.toLocaleString('en-IN')}`;
  }

  /** Big rubber-stamp splash (mission passed, debt reveal...). */
  splash(stamp: string, title: string, sub: string, seconds = 4.5) {
    const el = this.q('.hud-splash');
    this.q('.hud-splash .stamp').textContent = stamp;
    this.q('.hud-splash .title').textContent = title;
    this.q('.hud-splash .sub').textContent = sub;
    el.classList.remove('show');
    void el.offsetWidth; // restart animation
    el.classList.add('show');
    this.splashTimer = seconds;
  }

  setTitleProgress(hasSave: boolean) {
    const small = this.overlay.querySelector('.small');
    if (small) small.innerHTML = hasSave
      ? 'Click to continue · press <b>N</b> for a new game'
      : 'Kamla Nagar, North Delhi · golden hour';
  }

  update(dt: number) {
    if (this.splashTimer > 0) {
      this.splashTimer -= dt;
      if (this.splashTimer <= 0) this.q('.hud-splash').classList.remove('show');
    }
    if (this.barkTimer > 0) {
      this.barkTimer -= dt;
      if (this.barkTimer <= 0) this.bark.style.opacity = '0';
    }
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toast.style.opacity = '0';
    }
  }
}
