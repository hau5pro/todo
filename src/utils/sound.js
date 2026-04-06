let _ctx = null;
function getCtx() {
    if (!_ctx || _ctx.state === 'closed') {
        _ctx = new AudioContext();
    }
    if (_ctx.state === 'suspended')
        void _ctx.resume();
    return _ctx;
}
export function playComplete() {
    try {
        const ctx = getCtx();
        const now = ctx.currentTime;
        const tone = (freq, freq2, vol, dur) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.exponentialRampToValueAtTime(freq2, now + dur * 0.55);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(vol, now + 0.006);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
            osc.start(now);
            osc.stop(now + dur + 0.01);
        };
        tone(580, 400, 0.13, 0.09); // main warm pop
        tone(870, 600, 0.06, 0.06); // soft harmonic
    }
    catch {
        // silently ignore if Web Audio is unavailable
    }
}
