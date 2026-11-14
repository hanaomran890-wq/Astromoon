import { useEffect, useMemo, useRef } from 'react';
import { useMission, useMissionTime } from '../context/MissionContext.tsx';
import { cn } from './UIElements.tsx';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sun,
  Globe2,
} from 'lucide-react';

function formatUtc(timestampMs: number): string {
  const d = new Date(timestampMs);
  return d.toISOString().replace('.000Z', ' UTC').replace('T', ' ');
}

export function TimelinePlayer() {
  const { result, durationH, startMs, settings } = useMission();
  const { cursorH, setCursorH, playing, setPlaying, speed, setSpeed } = useMissionTime();

  // Audio chime for events
  const audioContextRef = useRef<AudioContext | null>(null);
  const prevEventCountRef = useRef<number>(0);

  useEffect(() => {
    if (!settings.audioAlerts || !result) return;
    const pastEvents = result.events.filter((e) => (e.t - startMs) / 3600000 <= cursorH);
    if (pastEvents.length > prevEventCountRef.current && playing) {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch (err) {
        // AudioContext autoplay restrictions
      }
    }
    prevEventCountRef.current = pastEvents.length;
  }, [cursorH, result, settings.audioAlerts, startMs, playing]);

  // Animation frame loop for playback
  const lastTimeRef = useRef<number>(0);
  useEffect(() => {
    if (!playing) return;
    let animId: number;
    lastTimeRef.current = performance.now();
    const loop = (now: number) => {
      const dtSec = Math.min(0.1, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;
      setCursorH((prev) => {
        const next = prev + dtSec * speed;
        if (next >= durationH) {
          setPlaying(false);
          return durationH;
        }
        return next;
      });
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [playing, speed, durationH, setCursorH, setPlaying]);

  // Compute sunlit intervals for indicator bar
  const sunIntervals = useMemo(() => {
    if (!result || !result.samples.length) return [];
    const intervals: { from: number; to: number }[] = [];
    let start: number | null = null;
    for (const s of result.samples) {
      const isLit = s.sunFraction >= 0.5;
      if (isLit && start === null) {
        start = s.hours;
      } else if (!isLit && start !== null) {
        intervals.push({ from: start, to: s.hours });
        start = null;
      }
    }
    if (start !== null) {
      intervals.push({ from: start, to: durationH });
    }
    return intervals;
  }, [result, durationH]);

  // Compute Earth visible intervals for indicator bar
  const earthIntervals = useMemo(() => {
    if (!result || !result.samples.length) return [];
    const intervals: { from: number; to: number }[] = [];
    let start: number | null = null;
    for (const s of result.samples) {
      if (s.earthVisible && start === null) {
        start = s.hours;
      } else if (!s.earthVisible && start !== null) {
        intervals.push({ from: start, to: s.hours });
        start = null;
      }
    }
    if (start !== null) {
      intervals.push({ from: start, to: durationH });
    }
    return intervals;
  }, [result, durationH]);

  const currentMs = startMs + cursorH * 3600000;
  const daysElapsed = (cursorH / 24).toFixed(1);

  return (
    <div className="flex flex-col gap-2 border-t border-border bg-card/60 px-4 py-3">
      {/* Upper Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Transport Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursorH(0)}
            aria-label="Jump to mission start"
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <SkipBack className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying(!playing)}
            aria-label={playing ? 'Pause mission playback' : 'Play mission playback'}
            className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 hover:bg-primary/90"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
          </button>
          <button
            type="button"
            onClick={() => setCursorH(durationH)}
            aria-label="Jump to mission end"
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <SkipForward className="size-4" />
          </button>

          {/* Speed Presets */}
          <div className="ml-2 flex items-center gap-0.5 rounded-md border border-border bg-background/50 p-0.5">
            {[1, 6, 24, 72].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  'rounded px-1.5 py-0.5 font-mono text-[10px] transition-colors',
                  speed === s
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s}h/s
              </button>
            ))}
          </div>
        </div>

        {/* Current Time Telemetry */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="text-muted-foreground">
            MET <strong className="text-primary font-mono">+{cursorH.toFixed(1)} h</strong> ({daysElapsed} d)
          </span>
          <span className="text-muted-foreground hidden sm:inline" aria-hidden="true">|</span>
          <span className="text-foreground font-mono text-[11px] tabular-nums">
            {formatUtc(currentMs)}
          </span>
        </div>
      </div>

      {/* Scrub Bar & Timeline Indicator Tracks */}
      <div className="relative pt-1">
        {/* Scrubber Range Input */}
        <input
          type="range"
          min={0}
          max={durationH}
          step={0.05}
          value={cursorH}
          onChange={(e) => {
            setPlaying(false);
            setCursorH(Number(e.target.value));
          }}
          className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary focus:outline-none"
        />

        {/* Status Indicator Bands */}
        <div className="mt-1 flex flex-col gap-1">
          {/* Sunlight Track Bar */}
          <div className="flex items-center gap-2">
            <span className="flex w-14 shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              <Sun className="size-2.5 text-primary" /> Sun
            </span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded bg-background/60">
              {sunIntervals.map((int, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 bg-primary/80"
                  style={{
                    left: `${(int.from / durationH) * 100}%`,
                    width: `${((int.to - int.from) / durationH) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Earth Link Track Bar */}
          <div className="flex items-center gap-2">
            <span className="flex w-14 shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
              <Globe2 className="size-2.5 text-earth" /> Earth
            </span>
            <div className="relative h-1.5 flex-1 overflow-hidden rounded bg-background/60">
              {earthIntervals.map((int, i) => (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 bg-earth/80"
                  style={{
                    left: `${(int.from / durationH) * 100}%`,
                    width: `${((int.to - int.from) / durationH) * 100}%`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
