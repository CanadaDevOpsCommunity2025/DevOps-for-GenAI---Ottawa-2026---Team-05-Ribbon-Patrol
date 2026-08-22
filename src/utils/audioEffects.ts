/**
 * GitPet Companion Audio Effects Synthesizer
 * Uses Web Audio API to produce subtle, pleasant audio feedback without external asset dependencies.
 */

let audioCtx: AudioContext | null = null;
const AUDIO_MUTED_STORAGE_KEY = 'gitpet_audio_muted';

// Rate-limiting timestamps to prevent sound overlapping/distortion
const lastPlayedTimestamps: Record<string, number> = {
  sync: 0,
  alert: 0,
  pet: 0,
};

const COOLDOWN_MS: Record<string, number> = {
  sync: 300,
  alert: 400,
  pet: 100,
};

type MuteListener = (muted: boolean) => void;
const muteListeners = new Set<MuteListener>();

function notifyMuteListeners(muted: boolean): void {
  muteListeners.forEach((listener) => {
    try {
      listener(muted);
    } catch (_) {}
  });
}

export function subscribeAudioMute(callback: MuteListener): () => void {
  muteListeners.add(callback);
  return () => {
    muteListeners.delete(callback);
  };
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (_) {
    return null;
  }
  return audioCtx;
}

export function isAudioMuted(): boolean {
  if (typeof window === 'undefined') return true;
  // Default to true (muted by default for ambient safety unless explicitly unmuted)
  const stored = localStorage.getItem(AUDIO_MUTED_STORAGE_KEY);
  if (stored === null) {
    return false; // sound enabled by default if not set
  }
  return stored === 'true';
}

export function setAudioMuted(muted: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUDIO_MUTED_STORAGE_KEY, muted ? 'true' : 'false');
    notifyMuteListeners(muted);
  } catch (_) {}
}

export function toggleAudioMuted(): boolean {
  const next = !isAudioMuted();
  setAudioMuted(next);
  return next;
}

function shouldPlaySound(type: string): boolean {
  if (isAudioMuted()) return false;
  const now = Date.now();
  const lastTime = lastPlayedTimestamps[type] || 0;
  const cooldown = COOLDOWN_MS[type] || 150;

  if (now - lastTime < cooldown) {
    return false;
  }

  lastPlayedTimestamps[type] = now;
  return true;
}

/**
 * Play a warm ascending melodic chime upon successful repository sync/action.
 */
export function playSyncSuccessSound(): void {
  if (!shouldPlaySound('sync')) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.35);
    });
  } catch (_) {
    // Audio failures are silent and non-blocking
  }
}

/**
 * Play a subtle dual-tone warning tone when a conflict or unsafe hazard appears.
 */
export function playConflictAlertSound(): void {
  if (!shouldPlaySound('alert')) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [440, 370]; // A4 -> F#4

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  } catch (_) {}
}

/**
 * Play a cheerful mascot chirp when petting the mascot.
 */
export function playPetChirpSound(): void {
  if (!shouldPlaySound('pet')) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.22);
  } catch (_) {}
}
