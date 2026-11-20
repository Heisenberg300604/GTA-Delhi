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

  constructor(parent: HTMLElement, onStart: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'hud';
    this.root.innerHTML = `
      <div class="hud-title">RING ROAD <span>· Project Dilli · Phase 2 prototype</span></div>
      <div class="hud-hisaab"><div class="label">हिसाब · FAMILY DEBT</div><div class="amount">₹14,00,000</div></div>
      <div class="hud-help">
        <b>WASD</b> move · <b>Shift</b> run · <b>Space</b> jump / brake · <b>F</b> enter / exit · <b>H</b> horn · <b>Mouse</b> camera · <b>F3</b> stats
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

  update(dt: number) {
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
