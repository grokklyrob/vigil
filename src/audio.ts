export function createDrone() {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let oscA: OscillatorNode | null = null;
  let oscB: OscillatorNode | null = null;
  let oscC: OscillatorNode | null = null;
  let gainA: GainNode | null = null;
  let gainB: GainNode | null = null;
  let gainC: GainNode | null = null;
  let enabled = false;
  let still = 0;

  const ROOT = 73.42;

  function apply(): void {
    if (!ctx || !master || !oscA || !oscB || !oscC || !gainA || !gainB || !gainC) return;
    const t = ctx.currentTime;
    const tau = 0.08;
    const beat = 1.35;
    const fifth = ROOT * 1.5;
    oscA.frequency.setTargetAtTime(ROOT, t, tau);
    oscB.frequency.setTargetAtTime(ROOT + beat * (1 - still) + (fifth - ROOT) * still, t, tau);
    oscC.frequency.setTargetAtTime(ROOT * 2, t, tau);
    gainA.gain.setTargetAtTime(0.55, t, tau);
    gainB.gain.setTargetAtTime(0.45, t, tau);
    gainC.gain.setTargetAtTime(0.22 * still, t, tau);
    const amp = enabled ? 0.045 + 0.035 * still : 0;
    master.gain.setTargetAtTime(amp, t, 0.12);
  }

  function build(): void {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;
    filter.Q.value = 0.7;
    master = ctx.createGain();
    master.gain.value = 0;
    filter.connect(master);
    master.connect(ctx.destination);

    const make = (freq: number) => {
      const osc = ctx!.createOscillator();
      const g = ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.value = 0.5;
      osc.connect(g);
      g.connect(filter);
      osc.start();
      return { osc, g };
    };

    const a = make(ROOT);
    const b = make(ROOT + 1.35);
    const c = make(ROOT * 2);
    c.g.gain.value = 0;
    oscA = a.osc;
    oscB = b.osc;
    oscC = c.osc;
    gainA = a.g;
    gainB = b.g;
    gainC = c.g;
  }

  async function toggle(): Promise<boolean> {
    if (!ctx) build();
    if (ctx && ctx.state === 'suspended') await ctx.resume();
    enabled = !enabled;
    apply();
    return enabled;
  }

  function mute(): void {
    enabled = false;
    apply();
  }

  function setStillness(value: number): void {
    still = value;
    apply();
  }

  return {
    toggle,
    mute,
    setStillness,
    get enabled() {
      return enabled;
    },
  };
}

export type Drone = ReturnType<typeof createDrone>;
