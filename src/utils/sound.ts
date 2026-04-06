export type SoundStyle = 'chime' | 'pop' | 'snap' | 'pluck' | 'soft' | 'rim';

export const SOUND_STYLES: { key: SoundStyle; label: string }[] = [
  { key: 'pop',   label: 'Pop'   },
  { key: 'chime', label: 'Chime' },
  { key: 'snap',  label: 'Snap'  },
  { key: 'pluck', label: 'Pluck' },
  { key: 'soft',  label: 'Soft'  },
  { key: 'rim',   label: 'Rim'   },
];

function buildWavDataUri(samples: Float32Array, sampleRate: number): string {
  const numSamples = samples.length;
  const buf = new ArrayBuffer(44 + numSamples * 2);
  const v = new DataView(buf);
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };

  str(0, 'RIFF');  v.setUint32(4,  36 + numSamples * 2, true);
  str(8, 'WAVE');  str(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  }

  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return 'data:audio/wav;base64,' + btoa(bin);
}

// Simple deterministic noise (LCG) — consistent across renders
function makeNoise() {
  let seed = 1;
  return () => { seed = (seed * 16807) % 2147483647; return (seed / 2147483647) * 2 - 1; };
}

function buildSamples(style: SoundStyle, sampleRate: number): Float32Array {
  const sin = (freq: number, t: number) => Math.sin(2 * Math.PI * freq * t);

  if (style === 'chime') {
    // Two-note ascending: C5 then G5
    const samples = new Float32Array(Math.floor(sampleRate * 0.28));
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      const note1 = sin(523, t) * Math.exp(-t * 40) * 0.5;
      const t2 = Math.max(0, t - 0.06);
      const note2 = sin(784, t2) * Math.exp(-t2 * 18) * 0.45;
      samples[i] = note1 + note2;
    }
    return samples;
  }

  if (style === 'pop') {
    // Short punchy single tone
    const samples = new Float32Array(Math.floor(sampleRate * 0.1));
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      samples[i] = sin(600, t) * Math.exp(-t * 38) * 0.65;
    }
    return samples;
  }

  if (style === 'snap') {
    // Finger snap: noise burst with brief ramp-up, softer than a click
    const noise = makeNoise();
    const samples = new Float32Array(Math.floor(sampleRate * 0.07));
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      const attack = Math.min(1, t / 0.003);  // 3ms ramp
      const decay  = Math.exp(-t * 120);
      samples[i] = noise() * attack * decay * 0.7;
    }
    return samples;
  }

  if (style === 'pluck') {
    // Guitar/harp: harmonics with frequency-proportional decay
    const samples = new Float32Array(Math.floor(sampleRate * 0.5));
    const fund = 294; // D4
    const harmonics = [1, 2, 3, 4, 5, 6];
    const amps      = [0.5, 0.25, 0.13, 0.07, 0.04, 0.02];
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      let s = 0;
      for (let h = 0; h < harmonics.length; h++) {
        s += sin(fund * harmonics[h], t) * amps[h] * Math.exp(-t * 5 * harmonics[h]);
      }
      samples[i] = s;
    }
    return samples;
  }

  if (style === 'rim') {
    // Rimshot: sharp noise transient + short resonant ring
    const noise = makeNoise();
    const samples = new Float32Array(Math.floor(sampleRate * 0.09));
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      const crack = noise() * Math.exp(-t * 200) * 0.65;
      const ring  = sin(380, t) * Math.exp(-t * 45) * 0.3;
      samples[i] = crack + ring;
    }
    return samples;
  }

  // soft: gentle low tone, barely there
  const samples = new Float32Array(Math.floor(sampleRate * 0.22));
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    samples[i] = sin(440, t) * Math.exp(-t * 20) * 0.28;
  }
  return samples;
}

const _cache: Partial<Record<SoundStyle, string>> = {};

function getDataUri(style: SoundStyle): string {
  if (!_cache[style]) {
    const sampleRate = 44100;
    _cache[style] = buildWavDataUri(buildSamples(style, sampleRate), sampleRate);
  }
  return _cache[style]!;
}

export function playComplete(style: SoundStyle = 'pop'): void {
  try {
    const audio = new Audio(getDataUri(style));
    audio.play().catch((err) => console.error('[sound]', err));
  } catch (err) {
    console.error('[sound] failed:', err);
  }
}
