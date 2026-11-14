import { useMission } from '../context/MissionContext.tsx';
import { StatusPill, cn } from './UIElements.tsx';
import { Moon, BookOpen, ShieldCheck, AlertTriangle, XCircle, Clock, Users, Sliders, Scale } from 'lucide-react';

export function Header() {
  const {
    dem,
    demError,
    computing,
    safety,
    setShowFormulasModal,
    setShowAboutModal,
    setShowSettingsModal,
    setShowComparisonModal,
  } = useMission();

  const verdict = safety?.verdict;
  const statusLabel =
    verdict === 'SAFE'
      ? 'GO'
      : verdict === 'CAUTION'
        ? 'HOLD'
        : verdict === 'HAZARDOUS'
          ? 'NO-GO'
          : verdict === 'INSUFFICIENT_DATA'
            ? 'UNVERIFIED'
            : 'STANDBY';

  const statusTone =
    verdict === 'SAFE'
      ? 'border-success/40 bg-success/10 text-success'
      : verdict === 'CAUTION'
        ? 'border-warning/40 bg-warning/10 text-warning'
        : verdict === 'HAZARDOUS'
          ? 'border-destructive/40 bg-destructive/10 text-destructive'
          : 'border-muted text-muted-foreground';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-card/60 px-4 backdrop-blur">
      {/* Title & App Branding */}
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-8 shrink-0 place-items-center rounded-md border border-primary/40 bg-primary/10">
          <Moon className="size-4 text-primary" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold tracking-tight text-foreground">
            Lunar South Pole Landing Planner
          </h1>
          <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Surface Ops — LSP Mission Control • Team Astromoon
          </p>
        </div>
      </div>

      {/* Operational System Health Status Indicators */}
      <div className="hidden items-center gap-5 lg:flex">
        <StatusPill
          label="LOLA DEM"
          tone={demError ? 'bad' : dem ? 'good' : 'warn'}
          pulse={!dem && !demError}
        />
        <StatusPill label="Ephemeris" tone="good" />
        <StatusPill
          label={computing ? 'Computing...' : 'Analysis nominal'}
          tone={computing ? 'warn' : dem ? 'good' : 'default'}
          pulse={computing}
        />
      </div>

      {/* Action Bar: Team Astromoon, Settings, Scientific Equations, and Readiness Verdict */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAboutModal(true)}
          className="flex items-center gap-1.5 rounded-md border border-border/80 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-accent hover:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          title="About Team Astromoon (6 Students) & Complete Platform User Guide"
        >
          <Users className="size-3.5 text-primary" aria-hidden="true" />
          <span className="hidden md:inline">Team Astromoon & Guide</span>
          <span className="md:hidden font-mono text-[10px]">Team</span>
        </button>

        <button
          type="button"
          onClick={() => setShowComparisonModal(true)}
          className="flex items-center gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary shadow-xs"
          title="Open Landing Sites Comparative Analytics Matrix & Statistical Workbench"
        >
          <Scale className="size-3.5 text-primary" aria-hidden="true" />
          <span className="hidden md:inline">Site Comparison</span>
          <span className="md:hidden font-mono text-[10px]">Compare</span>
        </button>

        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          className="flex items-center gap-1.5 rounded-md border border-border/80 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors hover:bg-accent hover:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          title="Mission Simulation, 3D Rendering & Display Settings"
        >
          <Sliders className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <span className="hidden md:inline">Settings</span>
          <span className="md:hidden font-mono text-[10px]">Config</span>
        </button>

        <button
          type="button"
          onClick={() => setShowFormulasModal(true)}
          className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          title="Open scientific equations, derivations and verified data sources"
        >
          <BookOpen className="size-3.5" aria-hidden="true" />
          <span className="hidden xl:inline">Scientific Equations & Sources</span>
          <span className="xl:hidden font-mono text-[10px]">Math / Sci</span>
        </button>

        <div
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wider transition-colors',
            statusTone,
          )}
          role="status"
          aria-label={`Landing readiness status: ${statusLabel}`}
        >
          {statusLabel === 'GO' && <ShieldCheck className="size-3.5" aria-hidden="true" />}
          {statusLabel === 'HOLD' && <AlertTriangle className="size-3.5" aria-hidden="true" />}
          {statusLabel === 'NO-GO' && <XCircle className="size-3.5" aria-hidden="true" />}
          {statusLabel === 'STANDBY' && <Clock className="size-3.5" aria-hidden="true" />}
          <span>{statusLabel}</span>
        </div>
      </div>
    </header>
  );
}
