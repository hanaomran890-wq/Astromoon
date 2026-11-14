import React, { useState } from 'react';
import {
  useMission,
  useMissionTime,
  useCurrentSample,
} from '../context/MissionContext.tsx';
import {
  Section,
  MetricCard,
  ScoreGauge,
  cn,
} from './UIElements.tsx';
import {
  ShieldAlert,
  Zap,
  Radio,
  Mountain,
  BookOpen,
  Database,
  ExternalLink,
  Sun,
  Globe2,
  Thermometer,
  Scale,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { DATA_SOURCES, CATEGORY_LABEL, getSite } from '../lib/constants.ts';
import { SCIENTIFIC_FORMULAS } from '../lib/scientificFormulas.ts';
import { SiteCategory } from '../types/mission.ts';

const CATEGORY_TONE: Record<SiteCategory, string> = {
  artemis: 'bg-primary',
  rim: 'bg-success',
  psr: 'bg-earth',
  robotic: 'bg-[#79818d]',
  massif: 'bg-warning',
};

function formatIsoTime(timestampMs: number): string {
  const d = new Date(timestampMs);
  return d.toISOString().slice(5, 16).replace('T', ' ');
}

function formatTemperature(
  tempK: number,
  unit: 'K' | 'C' | 'F' = 'K',
  precision = 0,
): { value: string; unit: string } {
  if (!Number.isFinite(tempK)) return { value: '—', unit: '' };
  if (unit === 'C') {
    return { value: (tempK - 273.15).toFixed(precision), unit: '°C' };
  }
  if (unit === 'F') {
    return { value: ((tempK - 273.15) * 1.8 + 32).toFixed(precision), unit: '°F' };
  }
  return { value: tempK.toFixed(precision), unit: 'K' };
}

export function SidebarRight() {
  const [activeTab, setActiveTab] = useState<
    'assess' | 'power' | 'comms' | 'terrain' | 'compare' | 'methods' | 'data'
  >('assess');

  const {
    mission,
    result,
    terrain,
    safety,
    analysis,
    settings,
    durationH,
    startMs,
    setShowFormulasModal,
    setShowComparisonModal,
    comparisonData,
    selectSite,
  } = useMission();

  const { cursorH, setCursorH, setPlaying } = useMissionTime();
  const currentSample = useCurrentSample();
  const site = getSite(mission.siteId);

  const prec = settings.decimalPrecision ?? 1;
  const tempUnit = settings.tempUnit ?? 'K';

  // Downsample chart data for smooth interactive performance
  const chartData = React.useMemo(() => {
    if (!result || !result.samples.length) return [];
    const maxPoints = 200;
    const step = Math.max(1, Math.floor(result.samples.length / maxPoints));
    return result.samples
      .filter((_, idx) => idx % step === 0)
      .map((s) => {
        let tempDisplay = s.tempK;
        if (tempUnit === 'C') tempDisplay = s.tempK - 273.15;
        else if (tempUnit === 'F') tempDisplay = (s.tempK - 273.15) * 1.8 + 32;

        return {
          hours: Number(s.hours.toFixed(1)),
          powerKW: Number((s.powerW / 1000).toFixed(2)),
          batteryKWh: Number(s.batteryKWh.toFixed(1)),
          tempK: Number(tempDisplay.toFixed(prec)),
          earthEl: Number(s.earthEl.toFixed(2)),
          sunEl: Number(s.sunEl.toFixed(2)),
          earthHorizon: Number(s.earthHorizon.toFixed(2)),
        };
      });
  }, [result, tempUnit, prec]);

  return (
    <aside
      aria-label="Site assessment"
      className="order-3 border-border bg-card/40 lg:order-none lg:min-h-0 lg:border-l flex flex-col h-full"
    >
      {/* Top Navigation Tabs */}
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div
          role="tablist"
          aria-label="Assessment views"
          className="grid grid-cols-7 gap-0.5 rounded-lg bg-background/60 p-1"
        >
          {[
            { id: 'assess', label: 'Assess' },
            { id: 'power', label: 'Power' },
            { id: 'comms', label: 'Comms' },
            { id: 'terrain', label: 'Terrain' },
            { id: 'compare', label: 'Compare' },
            { id: 'methods', label: 'Sci' },
            { id: 'data', label: 'Data' },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'rounded py-1.5 font-mono text-[9.5px] uppercase tracking-wider transition-colors text-center truncate',
                activeTab === tab.id
                  ? 'bg-secondary text-primary font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* TAB 1: ASSESS */}
        {activeTab === 'assess' && (
          <div>
            {/* Safety Score Dial */}
            <Section
              title="Landing safety assessment"
              icon={<ShieldAlert />}
              actions={
                <button
                  type="button"
                  onClick={() => setShowComparisonModal(true)}
                  className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary hover:bg-primary/20"
                >
                  Compare Sites →
                </button>
              }
            >
              {safety && terrain && result ? (
                <>
                  <div className="flex items-center gap-4">
                    <ScoreGauge score={safety.score} />
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          'font-mono text-lg font-semibold tracking-[0.12em]',
                          safety.verdict === 'SAFE'
                            ? 'text-success'
                            : safety.verdict === 'CAUTION'
                              ? 'text-warning'
                              : safety.verdict === 'HAZARDOUS'
                                ? 'text-destructive'
                                : 'text-muted-foreground',
                        )}
                      >
                        {safety.verdict === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT DATA' : safety.verdict}
                      </div>
                      <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">
                        {safety.terrainVerdict}
                      </p>
                    </div>
                  </div>

                  {/* Components Breakdown */}
                  <ul className="mt-4 flex flex-col gap-2.5">
                    {safety.components.map((c) => {
                      const barColor =
                        c.score >= 70
                          ? 'bg-success'
                          : c.score >= 45
                            ? 'bg-warning'
                            : 'bg-destructive';
                      return (
                        <li key={c.key}>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[11.5px] text-foreground">
                              {c.label}
                              <span className="ml-1.5 font-mono text-[9.5px] text-muted-foreground">
                                × {c.weight.toFixed(2)}
                              </span>
                            </span>
                            <span className="font-mono text-[11px] tabular-nums text-foreground">
                              {c.score}
                            </span>
                          </div>
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn('h-full rounded-full transition-all duration-500', barColor)}
                              style={{ width: `${c.score}%` }}
                            />
                          </div>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {c.detail}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <div className="h-64 animate-pulse rounded-md bg-muted/30" />
              )}
            </Section>

            {/* Key Mission Metrics */}
            {result && terrain && (
              <Section title="Key metrics">
                <div className="grid grid-cols-2 gap-1.5">
                  <MetricCard
                    label="Illumination"
                    value={result.illuminationPct.toFixed(prec)}
                    unit="%"
                    tone="sun"
                  />
                  <MetricCard
                    label="Earth visible"
                    value={result.earthVisiblePct.toFixed(prec)}
                    unit="%"
                    tone="earth"
                  />
                  <MetricCard
                    label="Longest night"
                    value={result.longestDarkH.toFixed(prec)}
                    unit="h"
                    tone={result.longestDarkH > 100 ? 'bad' : result.longestDarkH > 24 ? 'warn' : 'good'}
                  />
                  <MetricCard
                    label="Longest blackout"
                    value={result.longestBlackoutH.toFixed(prec)}
                    unit="h"
                    tone={result.longestBlackoutH > 72 ? 'bad' : result.longestBlackoutH > 0 ? 'warn' : 'good'}
                  />
                  <MetricCard
                    label="Local slope"
                    value={Number.isFinite(terrain.slopeDeg) ? terrain.slopeDeg.toFixed(prec) : '—'}
                    unit="°"
                    tone={terrain.slopeDeg <= analysis.slopeLimitDeg ? 'good' : 'bad'}
                  />
                  <MetricCard
                    label="Safe area"
                    value={terrain.safeAreaPct.toFixed(0)}
                    unit="%"
                    tone={terrain.safeAreaPct > 60 ? 'good' : terrain.safeAreaPct > 30 ? 'warn' : 'bad'}
                  />
                  <MetricCard
                    label="Elevation"
                    value={Number.isFinite(terrain.elevationM) ? (terrain.elevationM / 1000).toFixed(2) : '—'}
                    unit="km"
                  />
                  <MetricCard
                    label="Battery min"
                    value={result.minBatteryKWh.toFixed(prec)}
                    unit="kWh"
                    tone={result.batteryDepleted ? 'bad' : result.dodExceeded ? 'warn' : 'good'}
                  />
                </div>
              </Section>
            )}

            {/* Live Telemetry at Current Time Cursor */}
            {currentSample && (
              <Section title="Live telemetry">
                <div className="grid grid-cols-3 gap-1.5">
                  <MetricCard
                    label="Sun el"
                    value={currentSample.sunEl.toFixed(prec + 1)}
                    unit="°"
                    tone="sun"
                  />
                  <MetricCard
                    label="Sun az"
                    value={currentSample.sunAz.toFixed(prec)}
                    unit="°"
                  />
                  <MetricCard
                    label="Disc lit"
                    value={(100 * currentSample.sunFraction).toFixed(0)}
                    unit="%"
                  />
                  <MetricCard
                    label="Earth el"
                    value={currentSample.earthEl.toFixed(prec + 1)}
                    unit="°"
                    tone="earth"
                  />
                  <MetricCard
                    label="Clearance"
                    value={currentSample.earthClearance.toFixed(prec + 1)}
                    unit="°"
                    tone={currentSample.earthVisible ? 'good' : 'bad'}
                  />
                  <MetricCard
                    label="Light time"
                    value={currentSample.lightTimeS.toFixed(3)}
                    unit="s"
                  />
                  <MetricCard
                    label="Array"
                    value={(currentSample.powerW / 1000).toFixed(2)}
                    unit="kW"
                    tone="sun"
                  />
                  <MetricCard
                    label="Battery"
                    value={currentSample.batteryKWh.toFixed(prec)}
                    unit="kWh"
                  />
                  {(() => {
                    const temp = formatTemperature(currentSample.tempK, tempUnit, prec > 1 ? 1 : 0);
                    return (
                      <MetricCard
                        label="Surface"
                        value={temp.value}
                        unit={temp.unit}
                      />
                    );
                  })()}
                </div>
              </Section>
            )}

            {/* Site Brief */}
            {site && (
              <Section title="Site brief">
                <div className="flex items-center gap-2">
                  <span
                    className={cn('size-2 rounded-full', CATEGORY_TONE[site.category])}
                    aria-hidden="true"
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    {CATEGORY_LABEL[site.category]}
                  </span>
                </div>
                <h3 className="mt-1.5 text-sm font-semibold text-foreground">{site.name}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                  {site.summary}
                </p>
                {site.science.length > 0 && (
                  <ul className="mt-2.5 flex flex-col gap-1">
                    {site.science.map((sci, idx) => (
                      <li key={idx} className="flex gap-2 text-[11.5px] leading-relaxed text-foreground/90">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <span>{sci}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {site.heritage && (
                  <p className="mt-2.5 border-l-2 border-primary/40 pl-2.5 text-[11px] leading-relaxed text-muted-foreground">
                    {site.heritage}
                  </p>
                )}
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {site.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded border border-border px-1.5 py-0.5 font-mono text-[9.5px] text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}

        {/* TAB 2: POWER */}
        {activeTab === 'power' && (
          <div>
            {result ? (
              <>
                <Section title="Power budget" icon={<Zap />}>
                  <div className="mb-3 grid grid-cols-2 gap-1.5">
                    <MetricCard
                      label="Energy harvested"
                      value={result.energyKWh.toFixed(0)}
                      unit="kWh"
                      tone="sun"
                    />
                    <MetricCard
                      label="Average output"
                      value={(result.avgPowerW / 1000).toFixed(2)}
                      unit="kW"
                    />
                    <MetricCard
                      label="Peak output"
                      value={(result.peakPowerW / 1000).toFixed(2)}
                      unit="kW"
                    />
                    <MetricCard
                      label="Continuous load"
                      value={(analysis.loadPowerW / 1000).toFixed(2)}
                      unit="kW"
                    />
                    <MetricCard
                      label="Battery state"
                      value={
                        result.batteryDepleted
                          ? 'DEPLETED (0 kWh)'
                          : result.dodExceeded
                            ? 'DOD THRESHOLD EXCEEDED'
                            : 'NOMINAL'
                      }
                      tone={result.batteryDepleted ? 'bad' : result.dodExceeded ? 'warn' : 'good'}
                      className="col-span-2"
                    />
                  </div>

                  {/* Dual-axis Chart: Battery (kWh) & Solar Array (kW) */}
                  <div className="h-52 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                          dataKey="hours"
                          tick={{ fontSize: 9.5, fill: '#9a9fa6' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          yAxisId="battery"
                          domain={[0, analysis.batteryKWh]}
                          tick={{ fontSize: 9.5, fill: '#4ac777' }}
                          tickLine={false}
                          axisLine={false}
                          unit=" kWh"
                        />
                        <YAxis
                          yAxisId="power"
                          orientation="right"
                          tick={{ fontSize: 9.5, fill: '#fcb442' }}
                          tickLine={false}
                          axisLine={false}
                          unit=" kW"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0d1014',
                            borderColor: 'rgba(255,255,255,0.1)',
                            fontSize: '11px',
                          }}
                        />
                        <Area
                          yAxisId="battery"
                          type="monotone"
                          dataKey="batteryKWh"
                          stroke="var(--color-battery)"
                          fill="var(--color-battery)"
                          fillOpacity={0.15}
                          strokeWidth={1.5}
                          name="Battery (kWh)"
                        />
                        <Area
                          yAxisId="power"
                          type="stepAfter"
                          dataKey="powerKW"
                          stroke="var(--color-power)"
                          fill="var(--color-power)"
                          fillOpacity={0.25}
                          strokeWidth={1.5}
                          name="Solar Power (kW)"
                        />
                        <ReferenceLine
                          yAxisId="battery"
                          x={Number(cursorH.toFixed(1))}
                          stroke="white"
                          strokeDasharray="3 3"
                          strokeOpacity={0.8}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Section>

                {/* Thermal Environment */}
                <Section title="Thermal environment" icon={<Thermometer />}>
                  {(() => {
                    const minT = formatTemperature(result.tempMinK, tempUnit, 0);
                    const maxT = formatTemperature(result.tempMaxK, tempUnit, 0);
                    return (
                      <div className="mb-3 grid grid-cols-2 gap-1.5">
                        <MetricCard
                          label="Min surface"
                          value={minT.value}
                          unit={minT.unit}
                          tone="earth"
                        />
                        <MetricCard
                          label="Max surface"
                          value={maxT.value}
                          unit={maxT.unit}
                          tone="bad"
                        />
                      </div>
                    );
                  })()}

                  <div className="h-40 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                          dataKey="hours"
                          tick={{ fontSize: 9.5, fill: '#9a9fa6' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          tick={{ fontSize: 9.5, fill: '#f0b135' }}
                          tickLine={false}
                          axisLine={false}
                          unit={` ${tempUnit}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0d1014',
                            borderColor: 'rgba(255,255,255,0.1)',
                            fontSize: '11px',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="tempK"
                          stroke="var(--color-temp)"
                          strokeWidth={1.5}
                          dot={false}
                          name={`Surface Temp (${tempUnit})`}
                        />
                        <ReferenceLine
                          x={Number(cursorH.toFixed(1))}
                          stroke="white"
                          strokeDasharray="3 3"
                          strokeOpacity={0.8}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              </>
            ) : (
              <div className="m-4 h-64 animate-pulse rounded-md bg-muted/30" />
            )}
          </div>
        )}

        {/* TAB 3: COMMS */}
        {activeTab === 'comms' && (
          <div>
            {result ? (
              <>
                <Section title="Direct-to-Earth link" icon={<Radio />}>
                  <div className="mb-3 grid grid-cols-2 gap-1.5">
                    <MetricCard
                      label="Coverage"
                      value={result.earthVisiblePct.toFixed(prec)}
                      unit="%"
                      tone="earth"
                    />
                    <MetricCard
                      label="Longest blackout"
                      value={result.longestBlackoutH.toFixed(prec)}
                      unit="h"
                      tone={result.longestBlackoutH > 0 ? 'warn' : 'good'}
                    />
                    <MetricCard
                      label="Earth el range"
                      value={`${result.minEarthEl.toFixed(1)}° … ${result.maxEarthEl.toFixed(1)}°`}
                      unit=""
                    />
                    <MetricCard
                      label="Mean light time"
                      value={result.meanLightTimeS.toFixed(3)}
                      unit="s"
                    />
                  </div>

                  {/* Elevation Curves: Earth Elevation vs Earth Horizon and Mask */}
                  <div className="h-52 w-full pt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                          dataKey="hours"
                          tick={{ fontSize: 9.5, fill: '#9a9fa6' }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 9.5, fill: '#9a9fa6' }}
                          tickLine={false}
                          axisLine={false}
                          unit="°"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0d1014',
                            borderColor: 'rgba(255,255,255,0.1)',
                            fontSize: '11px',
                          }}
                        />
                        <ReferenceLine
                          y={analysis.commMaskDeg}
                          stroke="var(--destructive)"
                          strokeOpacity={0.5}
                          strokeDasharray="4 4"
                          label={{
                            value: `Mask ${analysis.commMaskDeg}°`,
                            fill: 'var(--destructive)',
                            fontSize: 9,
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="earthHorizon"
                          stroke="var(--muted-foreground)"
                          strokeWidth={1}
                          strokeDasharray="2 2"
                          dot={false}
                          name="Horizon Mask (°)"
                        />
                        <Line
                          type="monotone"
                          dataKey="earthEl"
                          stroke="var(--earth)"
                          strokeWidth={1.5}
                          dot={false}
                          name="Earth El (°)"
                        />
                        <Line
                          type="monotone"
                          dataKey="sunEl"
                          stroke="var(--primary)"
                          strokeWidth={1.2}
                          dot={false}
                          name="Sun El (°)"
                        />
                        <ReferenceLine
                          x={Number(cursorH.toFixed(1))}
                          stroke="white"
                          strokeDasharray="3 3"
                          strokeOpacity={0.8}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
                    Link is available when Earth clears the local terrain horizon plus the{' '}
                    {analysis.commMaskDeg}° elevation mask.
                  </p>
                </Section>

                {/* Event Log */}
                <Section
                  title="Event log"
                  actions={
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {result.events.length}
                    </span>
                  }
                >
                  <ol className="flex max-h-80 flex-col overflow-y-auto">
                    {result.events.length === 0 ? (
                      <li className="py-3 text-xs text-muted-foreground">
                        No rise/set events in this window.
                      </li>
                    ) : (
                      result.events.map((evt, idx) => {
                        const elapsedH = (evt.t - startMs) / 3600000;
                        const isPast = elapsedH <= cursorH;
                        const isSun = evt.type === 'sunrise' || evt.type === 'sunset';
                        return (
                          <li key={idx}>
                            <button
                              type="button"
                              onClick={() => {
                                setPlaying(false);
                                setCursorH(elapsedH);
                              }}
                              className={cn(
                                'flex w-full items-center gap-2.5 border-b border-border/60 py-1.5 text-left transition-colors hover:bg-accent/40',
                                !isPast && 'opacity-60',
                              )}
                            >
                              {isSun ? (
                                <Sun className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                              ) : (
                                <Globe2 className="size-3.5 shrink-0 text-earth" aria-hidden="true" />
                              )}
                              <span className="flex-1 text-[11.5px] text-foreground">
                                {evt.label}
                              </span>
                              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                                {formatIsoTime(evt.t)}
                              </span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ol>
                </Section>
              </>
            ) : (
              <div className="m-4 h-64 animate-pulse rounded-md bg-muted/30" />
            )}
          </div>
        )}

        {/* TAB 4: TERRAIN */}
        {activeTab === 'terrain' && (
          <div>
            {terrain ? (
              <Section title="Terrain within ellipse" icon={<Mountain />}>
                <div className="mb-3 grid grid-cols-2 gap-1.5">
                  <MetricCard
                    label="Center slope"
                    value={Number.isFinite(terrain.slopeDeg) ? terrain.slopeDeg.toFixed(prec) : '—'}
                    unit="°"
                    tone={terrain.slopeDeg <= analysis.slopeLimitDeg ? 'good' : 'bad'}
                  />
                  <MetricCard
                    label="Mean slope"
                    value={Number.isFinite(terrain.meanSlopeDeg) ? terrain.meanSlopeDeg.toFixed(prec) : '—'}
                    unit="°"
                  />
                  <MetricCard
                    label="Max slope"
                    value={Number.isFinite(terrain.maxSlopeDeg) ? terrain.maxSlopeDeg.toFixed(prec) : '—'}
                    unit="°"
                    tone={terrain.maxSlopeDeg > 2 * analysis.slopeLimitDeg ? 'warn' : 'default'}
                  />
                  <MetricCard
                    label="Safe area"
                    value={terrain.safeAreaPct.toFixed(0)}
                    unit="%"
                    tone={terrain.safeAreaPct > 60 ? 'good' : 'warn'}
                  />
                  <MetricCard
                    label="Relief"
                    value={terrain.reliefM.toFixed(0)}
                    unit="m"
                  />
                  <MetricCard
                    label="Roughness"
                    value={terrain.roughnessM.toFixed(prec)}
                    unit="m"
                  />
                  <MetricCard
                    label="Elevation"
                    value={Number.isFinite(terrain.elevationM) ? terrain.elevationM.toFixed(0) : '—'}
                    unit="m"
                  />
                  <MetricCard
                    label="DEM samples"
                    value={terrain.sampleCount.toLocaleString()}
                  />
                </div>

                <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
                  Slope distribution
                </div>
                <div className="h-44 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={terrain.slopeHistogram} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <XAxis
                        dataKey="bin"
                        tick={{ fontSize: 9, fill: '#9a9fa6' }}
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                      />
                      <YAxis
                        tick={{ fontSize: 9.5, fill: '#9a9fa6' }}
                        tickLine={false}
                        axisLine={false}
                        unit="%"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0d1014',
                          borderColor: 'rgba(255,255,255,0.1)',
                          fontSize: '11px',
                        }}
                      />
                      <Bar dataKey="pct" radius={2} name="Area Share (%)">
                        {terrain.slopeHistogram.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.safe ? 'var(--success)' : 'var(--destructive)'}
                            fillOpacity={entry.safe ? 0.85 : 0.7}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
                  Computed from LOLA 297 m/px DEM within a {analysis.ellipseRadiusKm.toFixed(1)} km radius.
                  Green bins are below the {analysis.slopeLimitDeg}° lander slope limit. Note: Small boulder hazards require sub-meter photogrammetry.
                </p>
              </Section>
            ) : (
              <div className="m-4 h-64 animate-pulse rounded-md bg-muted/30" />
            )}
          </div>
        )}

        {/* TAB 5: COMPARE */}
        {activeTab === 'compare' && (
          <div>
            <Section
              title="Landing Sites Comparison"
              icon={<Scale />}
              actions={
                <button
                  type="button"
                  onClick={() => setShowComparisonModal(true)}
                  className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary hover:bg-primary/20"
                >
                  Full Matrix →
                </button>
              }
            >
              {comparisonData.length > 0 ? (
                <>
                  <div className="mb-3 rounded-md border border-border/80 bg-background/50 p-2.5">
                    <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground">
                      <span>EPOCH: {durationH.toFixed(0)}h SIMULATION</span>
                      <span className="font-semibold text-primary">{comparisonData.length} CANDIDATE REGIONS</span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Direct cross-target comparison of illumination persistence, Earth comms line-of-sight, and LOLA slope safety.
                    </p>
                  </div>

                  {/* Grouped Bar Chart */}
                  <div className="mb-4 rounded-md border border-border bg-card/60 p-2.5">
                    <div className="mb-2 flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-foreground">Sunlight vs Earth Line-of-Sight</span>
                      <div className="flex items-center gap-2 font-mono text-[9px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-xs bg-warning" /> Sun %
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="size-2 rounded-xs bg-earth" /> Earth %
                        </span>
                      </div>
                    </div>
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={comparisonData.map((d) => ({
                            name: d.site.shortName,
                            illumination: Number(d.illuminationPct.toFixed(1)),
                            earth: Number(d.earthVisiblePct.toFixed(1)),
                            isActive: d.site.id === mission.siteId,
                          }))}
                          margin={{ top: 5, right: 5, left: -25, bottom: 20 }}
                        >
                          <XAxis
                            dataKey="name"
                            tick={{ fill: '#9ca3af', fontSize: 8 }}
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                          />
                          <YAxis
                            domain={[0, 100]}
                            tick={{ fill: '#6b7280', fontSize: 9 }}
                            unit="%"
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#111827',
                              borderColor: '#374151',
                              borderRadius: '0.375rem',
                              fontSize: '11px',
                            }}
                          />
                          <Bar dataKey="illumination" name="Sunlight (%)" fill="#eab308" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="earth" name="Earth Comms (%)" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Ranked Candidate Leaderboard */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                      <span>SUITABILITY LEADERBOARD</span>
                      <span className="font-mono text-[10px]">READINESS SCORE</span>
                    </div>
                    {[...comparisonData]
                      .sort((a, b) => b.safetyScore - a.safetyScore)
                      .map((item, idx) => {
                        const isSelected = item.site.id === mission.siteId;
                        return (
                          <div
                            key={item.site.id}
                            className={cn(
                              'flex items-center justify-between rounded-lg border p-2.5 transition-all',
                              isSelected
                                ? 'border-primary/60 bg-primary/10 shadow-xs'
                                : 'border-border/60 bg-background/40 hover:border-border',
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="grid size-5 shrink-0 place-items-center rounded bg-muted/80 font-mono text-[10px] font-bold text-muted-foreground">
                                #{idx + 1}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate text-xs font-semibold text-foreground">
                                    {item.site.shortName}
                                  </span>
                                  {isSelected && (
                                    <span className="rounded bg-primary/20 px-1 py-0.2 font-mono text-[9px] font-bold text-primary uppercase">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex items-center gap-2 font-mono text-[9.5px] text-muted-foreground">
                                  <span>Sun: {item.illuminationPct.toFixed(0)}%</span>
                                  <span>•</span>
                                  <span>Earth: {item.earthVisiblePct.toFixed(0)}%</span>
                                  <span>•</span>
                                  <span>Slope: {item.meanSlopeDeg.toFixed(1)}°</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <div
                                  className={cn(
                                    'font-mono text-xs font-bold',
                                    item.verdict === 'SAFE'
                                      ? 'text-success'
                                      : item.verdict === 'CAUTION'
                                        ? 'text-warning'
                                        : 'text-destructive',
                                  )}
                                >
                                  {item.safetyScore}/100
                                </div>
                                <div className="text-[9px] text-muted-foreground uppercase">{item.verdict}</div>
                              </div>
                              {!isSelected && (
                                <button
                                  type="button"
                                  onClick={() => selectSite(item.site.id)}
                                  className="rounded border border-border bg-card px-2 py-1 text-[10px] font-medium text-foreground hover:bg-accent hover:border-primary/50"
                                >
                                  Select
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Full Matrix Launcher CTA */}
                  <div className="mt-4 rounded-lg border border-primary/40 bg-primary/5 p-3 text-center">
                    <div className="text-xs font-semibold text-foreground">
                      Multi-Chart Analytics & Statistical Matrix
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Explore 6 interactive chart views including Spider Radar plots, 2D Pareto trade-off scatter, head-to-head duels, and export CSV/JSON telemetry.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowComparisonModal(true)}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
                    >
                      <Scale className="size-3.5" aria-hidden="true" />
                      <span>Launch Full Comparison Workbench</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center font-mono text-xs text-muted-foreground">
                  Loading LOLA DEM for cross-site analytics...
                </div>
              )}
            </Section>
          </div>
        )}

        {/* TAB 6: METHODS */}
        {activeTab === 'methods' && (
          <div>
            <Section
              title="Scientific Methodology & Equations"
              icon={<BookOpen />}
              actions={
                <button
                  type="button"
                  onClick={() => setShowFormulasModal(true)}
                  className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary hover:bg-primary/20"
                >
                  Full Modal
                </button>
              }
            >
              <p className="text-[11.5px] leading-relaxed text-muted-foreground mb-3">
                Rigorous scientific formulas and verified mathematical models for all mission metrics, incorporating peer-reviewed physical constants and planetary physics.
              </p>

              <div className="flex flex-col gap-3">
                {SCIENTIFIC_FORMULAS.map((sec) => (
                  <div
                    key={sec.id}
                    className="rounded-md border border-border bg-background/30 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-primary">
                        {sec.category}
                      </div>
                    </div>
                    <h4 className="mt-1 text-xs font-semibold text-foreground">
                      {sec.title}
                    </h4>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
                      {sec.summary}
                    </p>

                    <div className="mt-2.5 flex flex-col gap-2">
                      {sec.formulas.map((form, fIdx) => (
                        <div
                          key={fIdx}
                          className="rounded border border-border/70 bg-card/60 p-2 font-mono text-[10.5px]"
                        >
                          <div className="flex items-center justify-between text-[11px] font-sans font-medium text-foreground mb-1">
                            <span>{form.name}</span>
                          </div>
                          <div className="overflow-x-auto rounded bg-black/40 p-1.5 text-primary tracking-wide text-center">
                            <code>{form.latex}</code>
                          </div>
                          <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] text-muted-foreground font-sans">
                            {form.variables.slice(0, 3).map((v, vIdx) => (
                              <div key={vIdx} className="flex items-baseline gap-1.5">
                                <span className="font-mono text-primary font-semibold shrink-0">
                                  {v.symbol}:
                                </span>
                                <span className="flex-1">{v.description}</span>
                                <span className="font-mono text-[9px] text-muted-foreground/80 shrink-0">
                                  [{v.unit}]
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-2 border-t border-border/40 pt-1.5 text-[10px] font-sans text-muted-foreground flex items-center justify-between">
                            <span className="truncate pr-2">{form.scientificSource}</span>
                            {form.referenceUrl && (
                              <a
                                href={form.referenceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 text-primary hover:underline flex items-center gap-0.5"
                              >
                                Source <ExternalLink className="size-2.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {/* TAB 7: DATA */}
        {activeTab === 'data' && (
          <div>
            <Section title="Data provenance" icon={<Database />}>
              <ul className="flex flex-col gap-3">
                {DATA_SOURCES.map((source, idx) => (
                  <li
                    key={idx}
                    className="rounded-md border border-border bg-background/40 p-3"
                  >
                    <div className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-primary">
                      {source.org}
                    </div>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 flex items-start gap-1.5 text-[12px] font-medium text-foreground hover:underline"
                    >
                      {source.title}
                      <ExternalLink className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                    </a>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      {source.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        )}
      </div>
    </aside>
  );
}
