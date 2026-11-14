import React, { useId } from 'react';

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export type Tone = 'default' | 'good' | 'warn' | 'bad' | 'sun' | 'earth';

export function StatusDot({ tone = 'default', pulse = false }: { tone?: Tone; pulse?: boolean }) {
  const tones: Record<Tone, string> = {
    default: 'bg-muted-foreground',
    good: 'bg-success',
    warn: 'bg-warning',
    bad: 'bg-destructive',
    sun: 'bg-primary',
    earth: 'bg-earth',
  };

  return (
    <span className="relative inline-flex size-2" aria-hidden="true">
      {pulse && (
        <span
          className={cn(
            'absolute inset-0 animate-ping rounded-full opacity-60',
            tones[tone],
          )}
        />
      )}
      <span className={cn('relative inline-flex size-2 rounded-full', tones[tone])} />
    </span>
  );
}

export function StatusPill({
  label,
  tone = 'default',
  pulse = false,
}: {
  label: string;
  tone?: Tone;
  pulse?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
      <StatusDot tone={tone} pulse={pulse} />
      {label}
    </span>
  );
}

export function Section({
  title,
  icon,
  actions,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('border-b border-border', className)} aria-label={title}>
      <header className="flex h-9 items-center justify-between gap-2 px-4">
        <h2 className="flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted-foreground [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
          {icon}
          {title}
        </h2>
        {actions}
      </header>
      <div className="p-4 pt-1">{children}</div>
    </section>
  );
}

export function MetricCard({
  label,
  value,
  unit,
  tone = 'default',
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  tone?: Tone;
  className?: string;
}) {
  const tones: Record<Tone, string> = {
    default: 'text-foreground',
    good: 'text-success',
    warn: 'text-warning',
    bad: 'text-destructive',
    sun: 'text-primary',
    earth: 'text-earth',
  };

  return (
    <div
      className={cn(
        'rounded-md border border-border bg-background/40 px-2.5 py-2',
        className,
      )}
    >
      <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className={cn('mt-0.5 font-mono text-sm tabular-nums', tones[tone])}>
        {value}
        {unit && <span className="ml-1 text-[10px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function ScoreGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 52;
  const arcLength = 0.75 * circumference;
  const strokeOffset = (score / 100) * arcLength;
  const strokeColor =
    score >= 70 ? 'var(--success)' : score >= 45 ? 'var(--warning)' : 'var(--destructive)';

  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 128 128" className="size-full rotate-[135deg]" aria-hidden="true">
        <circle
          cx="64"
          cy="64"
          r="52"
          fill="none"
          stroke="var(--muted)"
          strokeWidth="8"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeLinecap="round"
        />
        <circle
          cx="64"
          cy="64"
          r="52"
          fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeDasharray={`${strokeOffset} ${circumference}`}
          strokeLinecap="round"
          className="transition-[stroke-dasharray] duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
          {score}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
          Safety Score
        </span>
      </div>
    </div>
  );
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  format?: (v: number) => string;
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[11.5px] text-muted-foreground">{label}</span>
        <span className="font-mono text-[11px] tabular-nums text-foreground">
          {format ? format(value) : value}
          {unit && <span className="ml-0.5 text-muted-foreground">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary focus:outline-none"
      />
    </div>
  );
}

export function PresetButton({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'rounded-md border px-2 py-1 font-mono text-[10.5px] transition-colors',
        active
          ? 'border-primary/60 bg-primary/15 text-primary'
          : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export function ToggleSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (c: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-2">
      <label htmlFor={id} className="cursor-pointer text-[11.5px] text-muted-foreground">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-border transition-colors',
          checked ? 'bg-primary' : 'bg-muted',
        )}
      >
        <span
          className={cn(
            'inline-block size-3 rounded-full bg-foreground transition-transform',
            checked ? 'translate-x-3.5 bg-primary-foreground' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  );
}
