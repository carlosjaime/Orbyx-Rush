import { AUDIO, clamp } from '@/game/config/balance';

/**
 * Fully procedural audio engine built on the Web Audio API.
 *
 * Nothing here loads an external file, so the game ships with zero third-party
 * audio and zero copyright exposure. Every sound is synthesised from
 * oscillators and shaped noise at runtime.
 *
 * The public surface is intentionally tiny (`playSfx`, `startMusic`,
 * `setIntensity`, volume setters) so the whole implementation can later be
 * swapped for sample playback without touching a single call site.
 */

export type SfxName =
  | 'launch'
  | 'capture'
  | 'perfect'
  | 'fragment'
  | 'combo'
  | 'record'
  | 'shield'
  | 'impact'
  | 'gameover'
  | 'ui-tap'
  | 'ui-back'
  | 'unlock';

export type MusicTrack = 'menu' | 'run';

interface SfxRecipe {
  /** Oscillator layers. */
  layers: Array<{
    type: OscillatorType;
    startFreq: number;
    endFreq: number;
    gain: number;
    attack: number;
    decay: number;
    detune?: number;
  }>;
  /** Optional shaped-noise burst. */
  noise?: { gain: number; decay: number; filterFreq: number; filterQ?: number };
  duration: number;
}

const SFX_RECIPES: Record<SfxName, SfxRecipe> = {
  launch: {
    duration: 0.3,
    layers: [
      { type: 'triangle', startFreq: 520, endFreq: 900, gain: 0.35, attack: 0.005, decay: 0.22 },
      { type: 'sine', startFreq: 260, endFreq: 460, gain: 0.22, attack: 0.005, decay: 0.18 },
    ],
    noise: { gain: 0.1, decay: 0.1, filterFreq: 2400 },
  },
  capture: {
    duration: 0.28,
    layers: [
      { type: 'sine', startFreq: 620, endFreq: 880, gain: 0.32, attack: 0.004, decay: 0.2 },
      { type: 'sine', startFreq: 1240, endFreq: 1760, gain: 0.12, attack: 0.004, decay: 0.14 },
    ],
  },
  perfect: {
    duration: 0.5,
    layers: [
      { type: 'sine', startFreq: 880, endFreq: 1320, gain: 0.3, attack: 0.004, decay: 0.3 },
      { type: 'sine', startFreq: 1320, endFreq: 1980, gain: 0.18, attack: 0.006, decay: 0.34 },
      { type: 'triangle', startFreq: 440, endFreq: 660, gain: 0.14, attack: 0.004, decay: 0.24 },
    ],
  },
  fragment: {
    duration: 0.2,
    layers: [
      { type: 'sine', startFreq: 1180, endFreq: 1560, gain: 0.2, attack: 0.002, decay: 0.14 },
      { type: 'sine', startFreq: 1560, endFreq: 2340, gain: 0.08, attack: 0.002, decay: 0.1 },
    ],
  },
  combo: {
    duration: 0.34,
    layers: [
      { type: 'square', startFreq: 380, endFreq: 760, gain: 0.14, attack: 0.006, decay: 0.24 },
      { type: 'sine', startFreq: 760, endFreq: 1140, gain: 0.16, attack: 0.004, decay: 0.26 },
    ],
  },
  record: {
    duration: 0.9,
    layers: [
      { type: 'sine', startFreq: 523, endFreq: 1046, gain: 0.26, attack: 0.01, decay: 0.6 },
      { type: 'triangle', startFreq: 784, endFreq: 1568, gain: 0.18, attack: 0.02, decay: 0.7 },
      { type: 'sine', startFreq: 1046, endFreq: 2093, gain: 0.1, attack: 0.03, decay: 0.8 },
    ],
  },
  shield: {
    duration: 0.55,
    layers: [
      { type: 'sawtooth', startFreq: 180, endFreq: 420, gain: 0.16, attack: 0.02, decay: 0.4 },
      { type: 'sine', startFreq: 540, endFreq: 720, gain: 0.16, attack: 0.02, decay: 0.45 },
    ],
    noise: { gain: 0.07, decay: 0.35, filterFreq: 1200, filterQ: 6 },
  },
  impact: {
    duration: 0.6,
    layers: [
      { type: 'sawtooth', startFreq: 240, endFreq: 46, gain: 0.4, attack: 0.002, decay: 0.44 },
      { type: 'square', startFreq: 120, endFreq: 30, gain: 0.22, attack: 0.002, decay: 0.3 },
    ],
    noise: { gain: 0.32, decay: 0.3, filterFreq: 900, filterQ: 1.2 },
  },
  gameover: {
    duration: 1.3,
    layers: [
      { type: 'sine', startFreq: 420, endFreq: 96, gain: 0.3, attack: 0.02, decay: 1.1 },
      { type: 'triangle', startFreq: 280, endFreq: 64, gain: 0.2, attack: 0.04, decay: 1.2 },
    ],
    noise: { gain: 0.12, decay: 0.9, filterFreq: 520 },
  },
  'ui-tap': {
    duration: 0.12,
    layers: [
      { type: 'sine', startFreq: 720, endFreq: 900, gain: 0.16, attack: 0.002, decay: 0.08 },
    ],
  },
  'ui-back': {
    duration: 0.14,
    layers: [{ type: 'sine', startFreq: 620, endFreq: 420, gain: 0.16, attack: 0.002, decay: 0.1 }],
  },
  unlock: {
    duration: 1,
    layers: [
      { type: 'sine', startFreq: 660, endFreq: 990, gain: 0.24, attack: 0.01, decay: 0.5 },
      { type: 'sine', startFreq: 990, endFreq: 1320, gain: 0.16, attack: 0.05, decay: 0.6 },
      { type: 'triangle', startFreq: 1320, endFreq: 1980, gain: 0.1, attack: 0.12, decay: 0.7 },
    ],
  },
};

/** Pentatonic-ish scale in Hz; avoids dissonance no matter what the loop picks. */
const MUSIC_SCALE = [174.61, 196.0, 233.08, 261.63, 293.66, 349.23, 392.0, 466.16];
const BASS_SCALE = [58.27, 65.41, 73.42, 87.31];

export interface AudioManagerOptions {
  musicVolume?: number;
  sfxVolume?: number;
  muted?: boolean;
}

export class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicBus: GainNode | null = null;

  private musicVolume: number = AUDIO.defaultMusicVolume;
  private sfxVolume: number = AUDIO.defaultSfxVolume;
  private muted = false;
  private unlocked = false;
  private destroyed = false;

  private currentTrack: MusicTrack | null = null;
  private schedulerId: ReturnType<typeof setInterval> | null = null;
  private nextNoteTime = 0;
  private step = 0;
  /** 0..1 — drives layer density and filter brightness as the combo grows. */
  private intensity = 0;
  private targetIntensity = 0;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(options: AudioManagerOptions = {}) {
    if (options.musicVolume !== undefined) this.musicVolume = options.musicVolume;
    if (options.sfxVolume !== undefined) this.sfxVolume = options.sfxVolume;
    if (options.muted !== undefined) this.muted = options.muted;
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  /**
   * Creates (or resumes) the AudioContext.
   *
   * Browsers require this to happen inside a user gesture, so it is called from
   * the first pointerdown/keydown rather than at boot.
   */
  async unlock(): Promise<boolean> {
    if (this.destroyed) return false;
    if (typeof window === 'undefined') return false;

    try {
      if (!this.context) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return false;
        this.context = new Ctor();
        this.buildGraph();
      }
      const context = this.context;
      if (context.state === 'suspended') await context.resume();
      this.unlocked = context.state === 'running';
      return this.unlocked;
    } catch (error) {
      console.warn('[AudioManager] could not unlock audio context', error);
      return false;
    }
  }

  private buildGraph(): void {
    const ctx = this.context;
    if (!ctx) return;
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : AUDIO.masterCeiling;
    this.masterGain.connect(ctx.destination);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.masterGain);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = 1;
    this.musicBus.connect(this.musicGain);

    // Pre-render one second of white noise; every percussive hit reuses it.
    const frames = Math.floor(ctx.sampleRate);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = clamp(volume, 0, 1);
    if (this.musicGain && this.context) {
      this.musicGain.gain.setTargetAtTime(this.musicVolume, this.context.currentTime, 0.05);
    }
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = clamp(volume, 0, 1);
    if (this.sfxGain && this.context) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.context.currentTime, 0.05);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(
        muted ? 0 : AUDIO.masterCeiling,
        this.context.currentTime,
        0.04,
      );
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Drives the dynamic music layers. `value` is normalised 0..1. */
  setIntensity(value: number): void {
    this.targetIntensity = clamp(value, 0, 1);
  }

  playSfx(name: SfxName, pitchShift = 1): void {
    const ctx = this.context;
    if (!ctx || !this.sfxGain || this.muted || this.sfxVolume <= 0) return;
    const recipe = SFX_RECIPES[name];
    const now = ctx.currentTime;

    for (const layer of recipe.layers) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = layer.type;
      if (layer.detune) osc.detune.value = layer.detune;
      osc.frequency.setValueAtTime(layer.startFreq * pitchShift, now);
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, layer.endFreq * pitchShift),
        now + recipe.duration,
      );
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, layer.gain), now + layer.attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + layer.attack + layer.decay);
      osc.connect(gain).connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + recipe.duration + 0.05);
    }

    if (recipe.noise && this.noiseBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = recipe.noise.filterFreq;
      filter.Q.value = recipe.noise.filterQ ?? 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(recipe.noise.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + recipe.noise.decay);
      source.connect(filter).connect(gain).connect(this.sfxGain);
      source.start(now);
      source.stop(now + recipe.noise.decay + 0.05);
    }
  }

  startMusic(track: MusicTrack): void {
    if (!this.context || this.currentTrack === track) return;
    this.currentTrack = track;
    this.step = 0;
    this.nextNoteTime = this.context.currentTime + 0.08;
    if (this.schedulerId === null) {
      // 25 ms look-ahead window: accurate enough for a 124 BPM grid and cheap.
      this.schedulerId = setInterval(() => this.scheduleMusic(), 25);
    }
  }

  stopMusic(): void {
    this.currentTrack = null;
    if (this.schedulerId !== null) {
      clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  /** Suspends the whole graph (tab hidden, app backgrounded, phone call). */
  async suspend(): Promise<void> {
    if (this.context && this.context.state === 'running') {
      try {
        await this.context.suspend();
      } catch {
        /* iOS occasionally rejects; the next resume() fixes it */
      }
    }
  }

  async resume(): Promise<void> {
    if (this.context && this.context.state === 'suspended') {
      try {
        const context = this.context;
        await context.resume();
        this.unlocked = context.state === 'running';
      } catch {
        this.unlocked = false;
      }
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.stopMusic();
    if (this.context) {
      void this.context.close().catch(() => undefined);
      this.context = null;
    }
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicBus = null;
    this.unlocked = false;
  }

  // ---------------------------------------------------------------- music ---

  private scheduleMusic(): void {
    const ctx = this.context;
    if (!ctx || !this.musicBus || !this.currentTrack) return;

    // Ease the intensity so combo changes fade in instead of jumping.
    this.intensity += (this.targetIntensity - this.intensity) * 0.06;

    const secondsPerStep = 60 / AUDIO.musicBpm / 2;
    const lookAhead = 0.12;

    while (this.nextNoteTime < ctx.currentTime + lookAhead) {
      this.scheduleStep(this.nextNoteTime, secondsPerStep);
      this.nextNoteTime += secondsPerStep;
      this.step = (this.step + 1) % 32;
    }
  }

  private scheduleStep(time: number, stepDuration: number): void {
    const ctx = this.context;
    const bus = this.musicBus;
    if (!ctx || !bus) return;

    const inRun = this.currentTrack === 'run';
    const energy = inRun ? this.intensity : 0.18;

    // Bass pulse on every 4th step — the spine of the track.
    if (this.step % 4 === 0) {
      const note = BASS_SCALE[(this.step / 4) % BASS_SCALE.length] ?? BASS_SCALE[0]!;
      this.scheduleTone(bus, note, time, stepDuration * 3.4, 'sine', 0.24 + energy * 0.1, 600);
    }

    // Arpeggio: density scales with intensity.
    const arpDensity = inRun ? 2 + Math.floor(energy * 2) : 4;
    if (this.step % arpDensity === 0) {
      const index = (this.step * 3 + (inRun ? Math.floor(energy * 5) : 0)) % MUSIC_SCALE.length;
      const note = MUSIC_SCALE[index] ?? MUSIC_SCALE[0]!;
      this.scheduleTone(
        bus,
        note * (inRun ? 1 : 0.5),
        time,
        stepDuration * 1.6,
        'triangle',
        0.1 + energy * 0.09,
        1400 + energy * 3200,
      );
    }

    // High shimmer layer only unlocks at higher combo tiers.
    if (inRun && energy > 0.45 && this.step % 8 === 6) {
      const note = MUSIC_SCALE[(this.step + 5) % MUSIC_SCALE.length] ?? MUSIC_SCALE[0]!;
      this.scheduleTone(
        bus,
        note * 2,
        time,
        stepDuration * 2.2,
        'sine',
        0.06 + energy * 0.05,
        6000,
      );
    }

    // Hat: shaped noise, gated by intensity so the menu stays calm.
    if (this.noiseBuffer && this.step % 2 === 1 && (inRun ? energy > 0.15 : this.step % 8 === 7)) {
      const source = ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6200;
      const gain = ctx.createGain();
      const level = 0.035 + energy * 0.03;
      gain.gain.setValueAtTime(level, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
      source.connect(filter).connect(gain).connect(bus);
      source.start(time);
      source.stop(time + 0.09);
    }
  }

  private scheduleTone(
    destination: AudioNode,
    frequency: number,
    time: number,
    duration: number,
    type: OscillatorType,
    gainValue: number,
    filterFreq: number,
  ): void {
    const ctx = this.context;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    osc.connect(filter).connect(gain).connect(destination);
    osc.start(time);
    osc.stop(time + duration + 0.05);
  }
}

let singleton: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!singleton) singleton = new AudioManager();
  return singleton;
}

export function destroyAudioManager(): void {
  singleton?.destroy();
  singleton = null;
}
