/**
 * Web Audio API sound effects — no audio files required.
 * All tones are synthesised on-the-fly.
 */
import { useRef, useCallback } from 'react';

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabled = useRef(true);

  const getCtx = useCallback((): AudioContext => {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume();
    return ctxRef.current;
  }, []);

  const tone = useCallback(
    (freq: number, dur: number, type: OscillatorType = 'square', gain = 0.18, delay = 0) => {
      if (!enabled.current) return;
      try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.type = type;
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + delay);
        g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur + 0.05);
      } catch (_) { /* AudioContext blocked – silently ignore */ }
    },
    [getCtx],
  );

  const playCorrect = useCallback(() => {
    // Ascending arpeggio: C5 E5 G5 C6
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, 0.18, 'square', 0.2, i * 0.09));
  }, [tone]);

  const playWrong = useCallback(() => {
    tone(220, 0.15, 'sawtooth', 0.2);
    tone(180, 0.25, 'sawtooth', 0.15, 0.15);
  }, [tone]);

  const playStreak = useCallback(() => {
    // Extra fanfare for streak ≥ 3
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => tone(f, 0.14, 'square', 0.22, i * 0.07));
  }, [tone]);

  const playTick = useCallback(() => {
    tone(880, 0.05, 'sine', 0.08);
  }, [tone]);

  const playUrgent = useCallback(() => {
    tone(440, 0.08, 'square', 0.25);
  }, [tone]);

  const playFlip = useCallback(() => {
    tone(600, 0.06, 'sine', 0.1);
    tone(900, 0.06, 'sine', 0.08, 0.06);
  }, [tone]);

  const toggle = useCallback(() => {
    enabled.current = !enabled.current;
    return enabled.current;
  }, []);

  return { playCorrect, playWrong, playStreak, playTick, playUrgent, playFlip, toggle };
}
