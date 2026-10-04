import { getMuted, setMuted } from "./storage";

// All sounds are synthesized with WebAudio — no asset files.
let ctx: AudioContext | null = null;
let muted = getMuted();

/** Must be called from a user gesture (e.g. the Play click) to unlock audio. */
export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMuted(): boolean {
  muted = !muted;
  setMuted(muted);
  return muted;
}

function ready(): AudioContext | null {
  return !muted && ctx && ctx.state === "running" ? ctx : null;
}

export function tick(high = false): void {
  const ac = ready();
  if (!ac) return;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = high ? 1320 : 990;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.12, t + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.07);
}

export function swoosh(): void {
  const ac = ready();
  if (!ac) return;
  const t = ac.currentTime;
  const dur = 0.22;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(500, t);
  filter.frequency.exponentialRampToValueAtTime(3200, t + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.09, t + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t);
}

export function chime(): void {
  const ac = ready();
  if (!ac) return;
  const t = ac.currentTime;
  [523.25, 659.25, 783.99].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    const start = t + i * 0.09;
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.5);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.55);
  });
}
