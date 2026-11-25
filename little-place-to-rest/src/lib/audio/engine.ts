import { music } from "@/config/audio.config";
import { useAudio } from "@/state/audio";

/**
 * One persistent audio element for the whole visit: never recreated, never reset
 * between scenes, so music can't overlap or restart. Volume fades are done by hand
 * (iOS ignores element.volume, so a GainNode is used once Web Audio is unlocked).
 */
let el: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let data: Uint8Array<ArrayBuffer> | null = null;
let fadeRaf = 0;
let fadeValue = 0;

function targetVolume() {
  const s = useAudio.getState();
  return s.muted ? 0 : s.volume;
}

function applyVolume(v: number) {
  if (gain && ctx) gain.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
  else if (el) el.volume = Math.max(0, Math.min(1, v));
}

function fadeTo(to: number, seconds: number, done?: () => void) {
  cancelAnimationFrame(fadeRaf);
  const from = fadeValue;
  const start = performance.now();
  const step = () => {
    const t = seconds <= 0 ? 1 : Math.min(1, (performance.now() - start) / (seconds * 1000));
    const e = t * t * (3 - 2 * t);
    fadeValue = from + (to - from) * e;
    applyVolume(fadeValue * targetVolume());
    if (t < 1) fadeRaf = requestAnimationFrame(step);
    else done?.();
  };
  step();
}

function ensureElement() {
  if (el) return el;
  el = new Audio();
  el.src = music.src;
  el.loop = true;
  el.preload = "auto";
  el.crossOrigin = "anonymous";
  el.volume = 0; // faded in after play starts
  el.addEventListener("timeupdate", () => {
    if (el) useAudio.getState().setProgress(el.currentTime, el.duration || 0);
  });
  el.addEventListener("loadedmetadata", () => {
    if (el) useAudio.getState().setProgress(el.currentTime, el.duration || 0);
  });
  el.addEventListener("pause", () => useAudio.getState().setPlaying(false));
  el.addEventListener("play", () => useAudio.getState().setPlaying(true));
  el.addEventListener("error", () => useAudio.getState().setAvailability("missing"));
  return el;
}

/** Must be called from a user gesture (click/tap). */
function unlockWebAudio() {
  if (ctx || !el) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    const src = ctx.createMediaElementSource(el);
    gain = ctx.createGain();
    gain.gain.value = 0;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.85;
    data = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    src.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);
    el.volume = 1;
  } catch {
    ctx = null;
    gain = null;
    analyser = null;
  }
}

export async function play() {
  if (useAudio.getState().availability !== "available") return;
  const a = ensureElement();
  // play() must start synchronously inside the user gesture (iOS Safari).
  const started = a.play();
  unlockWebAudio();
  if (ctx?.state === "suspended") ctx.resume().catch(() => {});
  try {
    await started;
    fadeTo(1, music.fade);
  } catch {
    useAudio.getState().setPlaying(false);
  }
}

export function pause() {
  if (!el) return;
  fadeTo(0, Math.min(0.9, music.fade), () => el?.pause());
}

export function toggle() {
  if (useAudio.getState().playing) pause();
  else play();
}

export function seek(fraction: number) {
  if (!el || !el.duration) return;
  el.currentTime = Math.max(0, Math.min(el.duration - 0.1, fraction * el.duration));
}

/** Re-apply volume/mute after the store changes. */
export function syncVolume() {
  applyVolume(fadeValue * targetVolume());
}

/** 0..1 loudness from low/mid frequencies (0 if analyser unavailable or paused). */
export function sampleLevel() {
  if (!analyser || !data || !useAudio.getState().playing) return 0;
  analyser.getByteFrequencyData(data);
  let sum = 0;
  const n = Math.min(32, data.length);
  for (let i = 2; i < n; i++) sum += data[i];
  return (sum / ((n - 2) * 255)) * fadeValue;
}
