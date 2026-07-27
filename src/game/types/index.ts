/** Shared domain types for Orbyx Rush. */

export type Vector2 = { x: number; y: number };

/** Direction of rotation around a core. */
export type SpinDirection = 1 | -1;

export type CoreKind = 'standard' | 'moving' | 'pulsing' | 'reverse' | 'decoy' | 'anchor';

export type ZoneKind = 'slow' | 'boost' | 'gravity' | 'portal';

export type HazardKind = 'bar' | 'laser';

export type CaptureQuality = 'perfect' | 'good';

export interface CoreSpec {
  id: number;
  x: number;
  y: number;
  kind: CoreKind;
  /** Radius at which the orb settles once captured. */
  orbitRadius: number;
  /** Angular speed in rad/s. */
  angularSpeed: number;
  /** Rotation direction imposed on the orb. */
  spin: SpinDirection;
  /** Moving cores oscillate horizontally around their anchor x. */
  motion?: {
    amplitude: number;
    period: number;
    phase: number;
    axis: 'x' | 'y';
  };
  /** Pulsing cores breathe their orbit radius. */
  pulse?: {
    amplitude: number;
    period: number;
    phase: number;
  };
  /** Decoy cores collapse after the orb leaves them. */
  decoy?: boolean;
}

export interface HazardSpec {
  id: number;
  kind: HazardKind;
  x: number;
  y: number;
  length: number;
  thickness: number;
  angle: number;
  spin: number;
  /** Laser timing offset so beams do not blink in unison. */
  phase: number;
}

export interface FragmentSpec {
  id: number;
  x: number;
  y: number;
  /** Shield pickups reuse the fragment pipeline with a different payload. */
  payload: 'fragment' | 'shield';
}

export interface ZoneSpec {
  id: number;
  kind: ZoneKind;
  x: number;
  y: number;
  radius: number;
  /** Portals teleport to this destination. */
  destination?: Vector2;
}

/** One generated step of the endless track. */
export interface TrackSegment {
  index: number;
  core: CoreSpec;
  hazards: HazardSpec[];
  fragments: FragmentSpec[];
  zones: ZoneSpec[];
  /** Difficulty tier that produced this segment (0..DIFFICULTY.maxTier). */
  tier: number;
}

export interface RunStats {
  score: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  coresReached: number;
  perfectCaptures: number;
  bestPerfectStreak: number;
  nearMisses: number;
  fragments: number;
  distance: number;
  durationSeconds: number;
  tier: number;
  shieldActive: boolean;
  revivesUsed: number;
}

export interface RunResult extends RunStats {
  isNewRecord: boolean;
  previousBest: number;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  unlockedSkins: string[];
  unlockedAchievements: string[];
  mode: GameMode;
  seed: string;
}

export type GameMode = 'endless' | 'daily' | 'tutorial';

export type ParticleQuality = 'low' | 'medium' | 'high';

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  muted: boolean;
  hapticsEnabled: boolean;
  screenShakeEnabled: boolean;
  reducedMotion: boolean;
  reducedFlashes: boolean;
  backgroundMotion: boolean;
  particleQuality: ParticleQuality;
  highContrast: boolean;
  powerSaver: boolean;
  showKeyboardHints: boolean;
}

export interface PlayerProfile {
  bestScore: number;
  bestDailyScore: number;
  totalRuns: number;
  totalDistance: number;
  totalFragments: number;
  fragments: number;
  totalPerfectCaptures: number;
  maxCombo: number;
  totalPlaySeconds: number;
  challengesCompleted: number;
  daysPlayed: string[];
  xp: number;
  level: number;
  unlockedSkins: string[];
  equippedSkin: string;
  unlockedTrails: string[];
  equippedTrail: string;
  unlockedThemes: string[];
  equippedTheme: string;
  achievements: Record<string, number>;
  tutorialCompleted: boolean;
  lastDailyDate: string | null;
  lastDailyBest: number;
  nearMissTotal: number;
}
