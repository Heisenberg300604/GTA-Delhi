/**
 * Synthesised placeholder audio (no files yet): bike engine hum and horn.
 * Browsers only allow audio after a user gesture, so call unlock() from a click.
 */
export class AudioSystem {
  private ctx?: AudioContext;
  private engineOsc?: OscillatorNode;
  private engineOsc2?: OscillatorNode;
  private engineGain?: GainNode;
  private hornGain?: GainNode;
  private master?: GainNode;
  private ambientGain?: GainNode;
  private nextHorn = 1;

  unlock() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(ctx.destination);

    // engine: two detuned saws through a low-pass
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc2 = ctx.createOscillator();
    this.engineOsc2.type = 'square';
    this.engineOsc.connect(lp);
    this.engineOsc2.connect(lp);
    lp.connect(this.engineGain).connect(this.master);
    this.engineOsc.start();
    this.engineOsc2.start();

    // horn: the classic two-tone "pom"
    this.hornGain = ctx.createGain();
    this.hornGain.gain.value = 0;
    const hlp = ctx.createBiquadFilter();
    hlp.type = 'lowpass';
    hlp.frequency.value = 2200;
    for (const f of [415, 494]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = f;
      o.connect(hlp);
      o.start();
    }
    hlp.connect(this.hornGain).connect(this.master);

    // ambient city bed: looping brown noise through a low-pass = distant traffic rumble
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.loop = true;
    const nlp = ctx.createBiquadFilter();
    nlp.type = 'lowpass';
    nlp.frequency.value = 500;
    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0.25;
    noise.connect(nlp).connect(this.ambientGain).connect(this.master);
    noise.start();
  }

  /** Phone ringtone: three double-beeps. */
  ring() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    for (let r = 0; r < 3; r++) {
      for (const [off, f] of [[0, 880], [0.18, 1046]] as const) {
        const t = ctx.currentTime + r * 0.9 + off;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.06, t + 0.02);
        g.gain.linearRampToValueAtTime(0, t + 0.15);
        o.connect(g).connect(this.master);
        o.start(t);
        o.stop(t + 0.16);
      }
    }
  }

  /** A car engine passing by (cutscenes). */
  engineBy(seconds = 3) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(55, t);
    o.frequency.linearRampToValueAtTime(80, t + seconds * 0.5);
    o.frequency.linearRampToValueAtTime(45, t + seconds);
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.08, t + seconds * 0.4);
    g.gain.linearRampToValueAtTime(0, t + seconds);
    o.connect(lp).connect(g).connect(this.master);
    o.start(t);
    o.stop(t + seconds);
  }

  /** Distant honking: Delhi's percussion section. busy: 0..1 traffic density near the player. */
  updateAmbient(dt: number, busy: number) {
    if (!this.ctx || !this.master) return;
    this.nextHorn -= dt * (0.4 + busy);
    if (this.nextHorn > 0) return;
    this.nextHorn = 0.6 + Math.random() * 3;
    this.playHorn(0.015 + Math.random() * 0.04 * (0.5 + busy), Math.random() * 2 - 1, 900 + Math.random() * 1500);
  }

  /**
   * One honk (or a "pom-pom" pattern). volume ~0..0.15, pan -1..1,
   * cutoff in Hz: lower sounds further away.
   */
  playHorn(volume: number, pan: number, cutoff: number, base = 330 + Math.random() * 300) {
    if (!this.ctx || !this.master || volume <= 0.002) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    const g = ctx.createGain();
    g.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = cutoff;
    const r = Math.random();
    const pattern = r < 0.4 ? [0, 0.18] : r < 0.7 ? [0] : [0, 0.14, 0.28];
    const dur = Math.random() < 0.2 ? 0.7 : 0.12;
    for (const off of pattern) {
      for (const f of [base, base * 1.19]) {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = f;
        o.connect(lp);
        o.start(t0 + off);
        o.stop(t0 + off + dur);
      }
      g.gain.setValueAtTime(0, t0 + off);
      g.gain.linearRampToValueAtTime(volume, t0 + off + 0.01);
      g.gain.setValueAtTime(volume, t0 + off + dur - 0.02);
      g.gain.linearRampToValueAtTime(0, t0 + off + dur);
    }
    lp.connect(g).connect(panner).connect(this.master);
  }

  /** riding: whether the engine is running; speed in m/s; throttle -1..1. */
  setEngine(riding: boolean, speed: number, throttle: number, pitch = 1) {
    if (!this.ctx || !this.engineOsc || !this.engineOsc2 || !this.engineGain) return;
    const t = this.ctx.currentTime;
    // fake 4-speed gearbox: rpm climbs and drops within each gear
    const s = Math.abs(speed);
    const gearTop = [0, 6, 11, 16, 24];
    let gear = 1;
    while (gear < 4 && s > gearTop[gear]) gear++;
    const lo = gearTop[gear - 1], hi = gearTop[gear];
    const rpm = 0.25 + 0.75 * Math.min(1, (s - lo) / (hi - lo));
    const base = (38 + rpm * 70 + (throttle > 0 ? 8 : 0)) * pitch;
    this.engineOsc.frequency.setTargetAtTime(base, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(base * 0.5, t, 0.05);
    const vol = riding ? 0.07 + (throttle > 0 ? 0.06 : 0) + Math.min(s / 23, 1) * 0.05 : 0;
    this.engineGain.gain.setTargetAtTime(vol, t, 0.08);
  }

  setHorn(on: boolean) {
    if (!this.ctx || !this.hornGain) return;
    this.hornGain.gain.setTargetAtTime(on ? 0.12 : 0, this.ctx.currentTime, 0.015);
  }

  thump(strength: number) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);
    g.gain.setValueAtTime(0.5 * strength, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    o.connect(g).connect(this.master);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  }
}
