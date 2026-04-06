function buildWavDataUri(samples: Float32Array, sampleRate: number): string {
  const numSamples = samples.length;
  const buf = new ArrayBuffer(44 + numSamples * 2);
  const v = new DataView(buf);
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };

  str(0, 'RIFF');  v.setUint32(4,  36 + numSamples * 2, true);
  str(8, 'WAVE');  str(12, 'fmt ');
  v.setUint32(16, 16, true);          // chunk size
  v.setUint16(20, 1, true);           // PCM
  v.setUint16(22, 1, true);           // mono
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

let _dataUri: string | null = null;

function getDataUri(): string {
  if (_dataUri) return _dataUri;
  const sampleRate = 44100;
  const duration = 0.14;
  const samples = new Float32Array(Math.floor(sampleRate * duration));
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 28);
    samples[i] = (Math.sin(2 * Math.PI * 520 * t) * 0.55
                + Math.sin(2 * Math.PI * 780 * t) * 0.22) * env;
  }
  _dataUri = buildWavDataUri(samples, sampleRate);
  return _dataUri;
}

export function playComplete(): void {
  try {
    const audio = new Audio(getDataUri());
    audio.play().catch((err) => console.error('[sound]', err));
  } catch (err) {
    console.error('[sound] failed:', err);
  }
}
