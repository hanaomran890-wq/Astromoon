import { useState } from 'react';
import { useMission } from '../context/MissionContext.tsx';
import {
  LANDING_SITES,
  LANDER_PROFILES,
  DATE_PRESETS,
  DURATION_PRESETS,
  CATEGORY_LABEL,
} from '../lib/constants.ts';
import { formatLat, formatLon } from '../lib/dem.ts';
import {
  Section,
  SliderControl,
  PresetButton,
  ToggleSwitch,
  cn,
} from './UIElements.tsx';
import {
  Crosshair,
  Calendar,
  Sliders,
  Layers,
  Search,
  Scale,
} from 'lucide-react';
import { SiteCategory } from '../types/mission.ts';

const CATEGORY_TONE: Record<SiteCategory, string> = {
  artemis: 'bg-primary',
  rim: 'bg-success',
  psr: 'bg-earth',
  robotic: 'bg-[#79818d]',
  massif: 'bg-warning',
};

export function SidebarLeft() {
  const {
    mission,
    setMission,
    selectSite,
    setCustomSite,
    applyLander,
    analysis,
    setAnalysis,
    visual,
    setVisual,
    setShowComparisonModal,
  } = useMission();

  // Search state
  const [search, setSearch] = useState('');
  const [customLat, setCustomLat] = useState('');
  const [customLon, setCustomLon] = useState('');

  const filteredSites = LANDING_SITES.filter((site) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const matchName = site.name.toLowerCase().includes(q);
    const matchShort = site.shortName.toLowerCase().includes(q);
    const matchTags = site.tags.some((t) => t.toLowerCase().includes(q));
    return matchName || matchShort || matchTags;
  });

  const numLat = Number(customLat);
  const numLon = Number(customLon);
  const customValid =
    customLat !== '' &&
    customLon !== '' &&
    Number.isFinite(numLat) &&
    Number.isFinite(numLon) &&
    numLat >= -90.0 &&
    numLat <= -80.0 &&
    numLon >= -180.0 &&
    numLon <= 360.0;

  const handleApplyCustom = () => {
    if (customValid) {
      setCustomSite(numLat, numLon);
    }
  };

  return (
    <aside
      aria-label="Mission planning"
      className="order-2 border-border bg-card/40 lg:order-none lg:min-h-0 lg:overflow-y-auto lg:border-r"
    >
      {/* 1. Landing Targets */}
      <Section
        title="Landing targets"
        icon={<Crosshair />}
        actions={
          <span className="font-mono text-[10px] text-muted-foreground">
            {filteredSites.length}
          </span>
        }
      >
        <button
          type="button"
          onClick={() => setShowComparisonModal(true)}
          className="mb-2.5 flex w-full items-center justify-between rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 hover:border-primary shadow-xs"
        >
          <span className="flex items-center gap-1.5">
            <Scale className="size-3.5" aria-hidden="true" />
            <span>Compare Landing Sites</span>
          </span>
          <span className="font-mono text-[10px] text-primary/80">Charts & Stats →</span>
        </button>

        <div className="relative mb-2">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sites, tags..."
            aria-label="Search landing sites"
            className="h-8 w-full rounded-md border border-border bg-background/50 pl-8 pr-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
          />
        </div>

        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
          {filteredSites.map((site) => {
            const isSelected = mission.siteId === site.id;
            return (
              <li key={site.id}>
                <button
                  type="button"
                  onClick={() => selectSite(site.id)}
                  className={cn(
                    'group flex w-full flex-col items-start gap-1 rounded-md border p-2 text-left transition-colors',
                    isSelected
                      ? 'border-primary/60 bg-primary/10 text-foreground'
                      : 'border-border/60 bg-background/20 text-muted-foreground hover:border-border hover:bg-accent/40 hover:text-foreground',
                  )}
                >
                  <div className="flex w-full items-center justify-between gap-1.5">
                    <span className="truncate text-[11.5px] font-medium text-foreground">
                      {site.shortName}
                    </span>
                    <span
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        CATEGORY_TONE[site.category],
                      )}
                      title={CATEGORY_LABEL[site.category]}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                    <span>{formatLat(site.lat)}</span>
                    <span aria-hidden="true">•</span>
                    <span>{formatLon(site.lon)}</span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Custom Landing Target Input */}
        <div className="mt-3 border-t border-border/60 pt-2.5">
          <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
            Custom coordinates (-80.0° to -90.0° S)
          </div>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.01"
              min="-90"
              max="-80.0"
              placeholder="Lat (-89.5)"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              className="h-7 w-1/2 rounded border border-border bg-background/50 px-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
            />
            <input
              type="number"
              step="0.01"
              min="-180"
              max="180"
              placeholder="Lon (-135.0)"
              value={customLon}
              onChange={(e) => setCustomLon(e.target.value)}
              className="h-7 w-1/2 rounded border border-border bg-background/50 px-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
            />
            <button
              type="button"
              disabled={!customValid}
              onClick={handleApplyCustom}
              className={cn(
                'h-7 rounded border px-2.5 font-mono text-[11px] transition-colors',
                customValid
                  ? 'border-primary/60 bg-primary/20 text-primary hover:bg-primary/30'
                  : 'cursor-not-allowed border-border text-muted-foreground opacity-50',
              )}
            >
              Set
            </button>
          </div>
        </div>
      </Section>

      {/* 2. Mission Window */}
      <Section title="Mission window" icon={<Calendar />}>
        <label
          htmlFor="mission-start"
          className="mb-1.5 block font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Landing epoch (UTC)
        </label>
        <input
          id="mission-start"
          type="datetime-local"
          value={mission.startIso}
          onChange={(e) => e.target.value && setMission({ startIso: e.target.value })}
          className="h-8 w-full rounded-md border border-border bg-background/50 px-2.5 font-mono text-xs text-foreground [color-scheme:dark] focus:border-primary/60 focus:outline-none"
        />

        <div className="mt-2 flex flex-wrap gap-1">
          {DATE_PRESETS.map((preset) => (
            <PresetButton
              key={preset.iso}
              active={mission.startIso === preset.iso}
              onClick={() => setMission({ startIso: preset.iso })}
            >
              {preset.label}
            </PresetButton>
          ))}
        </div>

        <div className="mt-4 mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Surface duration
        </div>
        <div className="flex flex-wrap gap-1">
          {DURATION_PRESETS.map((dp) => (
            <PresetButton
              key={dp.value}
              title={dp.hint}
              active={Math.abs(mission.durationDays - dp.value) < 0.05}
              onClick={() => setMission({ durationDays: dp.value })}
            >
              {dp.label}
            </PresetButton>
          ))}
        </div>

        <div className="mt-4 mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.14em] text-muted-foreground">
          Lander profile
        </div>
        <div className="flex flex-col gap-1">
          {LANDER_PROFILES.map((profile) => {
            const isSelected = mission.landerId === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => applyLander(profile.id)}
                className={cn(
                  'flex flex-col items-start rounded-md border p-2 text-left transition-colors',
                  isSelected
                    ? 'border-primary/60 bg-primary/10 text-foreground'
                    : 'border-border/60 bg-background/20 text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                <span className="text-[11.5px] font-medium text-foreground">
                  {profile.name}
                </span>
                <span className="text-[10px] text-muted-foreground leading-relaxed">
                  {profile.description}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* 3. Constraints */}
      <Section title="Constraints" icon={<Sliders />}>
        <div className="flex flex-col gap-3.5">
          <SliderControl
            label="Max slope"
            value={analysis.slopeLimitDeg}
            min={2}
            max={20}
            step={0.5}
            unit="°"
            onChange={(val) => setAnalysis({ slopeLimitDeg: val })}
          />
          <SliderControl
            label="Landing ellipse radius"
            value={analysis.ellipseRadiusKm}
            min={0.1}
            max={5}
            step={0.1}
            unit=" km"
            format={(v) => v.toFixed(1)}
            onChange={(val) => setAnalysis({ ellipseRadiusKm: val })}
          />
          <SliderControl
            label="Solar array / antenna mast"
            value={analysis.mastHeightM}
            min={0}
            max={50}
            step={0.5}
            unit=" m"
            onChange={(val) => setAnalysis({ mastHeightM: val })}
          />
          <SliderControl
            label="Array area"
            value={analysis.panelAreaM2}
            min={1}
            max={100}
            step={1}
            unit=" m²"
            onChange={(val) => setAnalysis({ panelAreaM2: val })}
          />
          <SliderControl
            label="Cell efficiency"
            value={analysis.panelEfficiency}
            min={0.1}
            max={0.45}
            step={0.01}
            format={(v) => `${Math.round(100 * v)}%`}
            onChange={(val) => setAnalysis({ panelEfficiency: val })}
          />
          <SliderControl
            label="Average load"
            value={analysis.loadPowerW}
            min={50}
            max={20000}
            step={50}
            unit=" W"
            format={(v) => v.toLocaleString()}
            onChange={(val) => setAnalysis({ loadPowerW: val })}
          />
          <SliderControl
            label="Battery capacity"
            value={analysis.batteryKWh}
            min={1}
            max={1000}
            step={1}
            unit=" kWh"
            onChange={(val) => setAnalysis({ batteryKWh: val })}
          />
          <SliderControl
            label="Direct-to-Earth mask"
            value={analysis.commMaskDeg}
            min={0}
            max={10}
            step={0.5}
            unit="°"
            onChange={(val) => setAnalysis({ commMaskDeg: val })}
          />
        </div>
      </Section>

      {/* 4. Display Layers */}
      <Section title="Display layers" icon={<Layers />}>
        <div className="flex flex-col gap-3.5">
          <SliderControl
            label="Vertical exaggeration"
            value={visual.exaggeration}
            min={1}
            max={6}
            step={0.5}
            unit="×"
            onChange={(val) => setVisual({ exaggeration: val })}
          />
          <SliderControl
            label="Exposure"
            value={visual.exposure}
            min={0.4}
            max={4}
            step={0.1}
            format={(v) => v.toFixed(1)}
            onChange={(val) => setVisual({ exposure: val })}
          />
          <SliderControl
            label="Earthshine"
            value={visual.earthshine}
            min={0}
            max={0.15}
            step={0.005}
            format={(v) => v.toFixed(3)}
            onChange={(val) => setVisual({ earthshine: val })}
          />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5">
          <ToggleSwitch
            label="Ray-traced shadows"
            checked={visual.shadows}
            onChange={(val) => setVisual({ shadows: val })}
          />
          <ToggleSwitch
            label="Candidate landing sites"
            checked={visual.showCandidates}
            onChange={(val) => setVisual({ showCandidates: val })}
          />
          <ToggleSwitch
            label="Touchdown ellipse"
            checked={visual.showEllipse}
            onChange={(val) => setVisual({ showEllipse: val })}
          />
          <ToggleSwitch
            label="Sun incident ray"
            checked={visual.showSunRay}
            onChange={(val) => setVisual({ showSunRay: val })}
          />
          <ToggleSwitch
            label="Earth line-of-sight ray"
            checked={visual.showEarthRay}
            onChange={(val) => setVisual({ showEarthRay: val })}
          />
          <ToggleSwitch
            label="Site labels"
            checked={visual.showLabels}
            onChange={(val) => setVisual({ showLabels: val })}
          />
          <ToggleSwitch
            label="Polar coordinate graticule"
            checked={visual.showGraticule}
            onChange={(val) => setVisual({ showGraticule: val })}
          />
          <ToggleSwitch
            label="Starfield background"
            checked={visual.showStars}
            onChange={(val) => setVisual({ showStars: val })}
          />
          <ToggleSwitch
            label="Earth in lunar sky"
            checked={visual.showEarth}
            onChange={(val) => setVisual({ showEarth: val })}
          />
          <ToggleSwitch
            label="Auto-rotate globe"
            checked={visual.autoRotate}
            onChange={(val) => setVisual({ autoRotate: val })}
          />
        </div>
      </Section>
    </aside>
  );
}
