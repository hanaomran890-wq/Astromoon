import { useState } from 'react';
import { useMission, DEFAULT_USER_SETTINGS } from '../context/MissionContext.tsx';
import {
  X,
  Settings,
  Sliders,
  Monitor,
  Cpu,
  Download,
  RotateCcw,
  Layers,
} from 'lucide-react';
import { DEFAULT_VISUAL, DEFAULT_CONSTRAINTS } from '../lib/constants.ts';
import type { UiDensity } from '../types/mission.ts';

type SettingsTab = 'graphics' | 'physics' | 'units' | 'export';

export function SettingsModal() {
  const {
    showSettingsModal,
    setShowSettingsModal,
    visual,
    setVisual,
    settings,
    setSettings,
    analysis,
    setAnalysis,
    mission,
    result,
    terrain,
    horizon,
  } = useMission();

  const [activeTab, setActiveTab] = useState<SettingsTab>('graphics');

  if (!showSettingsModal) return null;

  // Export Mission Plan as JSON
  const handleExportJson = () => {
    const data = {
      mission,
      analysis,
      visual,
      settings,
      resultsSummary: result
        ? {
            illuminationPct: result.illuminationPct,
            earthVisiblePct: result.earthVisiblePct,
            energyKWh: result.energyKWh,
            peakPowerW: result.peakPowerW,
            longestDarkH: result.longestDarkH,
            longestBlackoutH: result.longestBlackoutH,
            tempMinK: result.tempMinK,
            tempMaxK: result.tempMaxK,
          }
        : null,
      terrainSummary: terrain
        ? {
            slopeDeg: terrain.slopeDeg,
            meanSlopeDeg: terrain.meanSlopeDeg,
            safeAreaPct: terrain.safeAreaPct,
            reliefM: terrain.reliefM,
            roughnessM: terrain.roughnessM,
          }
        : null,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lunar-mission-${mission.siteId}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Horizon Profile as CSV
  const handleExportCsv = () => {
    if (!horizon) return;
    let csv = 'Azimuth_Deg,Elevation_Deg,Obstacle_Distance_Km\n';
    horizon.elevations.forEach((el, idx) => {
      const az = idx * horizon.stepDeg;
      const dist = horizon.distancesKm[idx];
      csv += `${az.toFixed(2)},${el.toFixed(3)},${dist.toFixed(2)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horizon-profile-${mission.siteId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset to Baseline Defaults
  const handleResetDefaults = () => {
    setVisual(DEFAULT_VISUAL);
    setAnalysis(DEFAULT_CONSTRAINTS);
    setSettings(DEFAULT_USER_SETTINGS);
  };

  const tabs: { id: SettingsTab; label: string; icon: typeof Monitor }[] = [
    { id: 'graphics', label: '3D Graphics & Display', icon: Monitor },
    { id: 'physics', label: 'Physics & Simulation', icon: Cpu },
    { id: 'units', label: 'Units & Telemetry', icon: Sliders },
    { id: 'export', label: 'Data & Export', icon: Download },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="relative flex h-full max-h-[88vh] w-full max-w-3xl flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/40 bg-primary/10">
              <Settings className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 id="settings-modal-title" className="text-base font-semibold text-foreground">
                Mission Control Configuration & Preferences
              </h2>
              <p className="font-mono text-xs text-muted-foreground">
                3D rendering fidelity, simulation physics, telemetry units & mission exports
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSettingsModal(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close settings"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex shrink-0 items-center gap-1 border-b border-border bg-background/50 px-4 sm:px-6 overflow-x-auto py-2 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 font-medium text-xs transition-all ${
                  isActive
                    ? 'border border-primary/40 bg-primary/15 text-primary shadow-sm font-semibold'
                    : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                }`}
              >
                <Icon className={`size-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* TAB 1: 3D GRAPHICS & DISPLAY */}
          {activeTab === 'graphics' && (
            <div className="space-y-5">
              <section className="rounded-lg border border-border bg-background/30 p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <Monitor className="size-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    3D WebGL Graphics & Rendering Engine
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Shading Resolution */}
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground font-medium">Shading Texture Resolution</label>
                    <div className="flex gap-1.5">
                      {[512, 768, 1024].map((res) => (
                        <button
                          key={res}
                          type="button"
                          onClick={() => setVisual({ shadingRes: res })}
                          className={`flex-1 py-1 px-2 rounded border font-mono text-[11px] transition-colors ${
                            visual.shadingRes === res
                              ? 'border-primary bg-primary/15 text-primary font-semibold'
                              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          {res}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mesh Geometry Segments */}
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground font-medium">Terrain Mesh Segments</label>
                    <div className="flex gap-1.5">
                      {[128, 256, 384, 512].map((segs) => (
                        <button
                          key={segs}
                          type="button"
                          onClick={() => setVisual({ meshSegments: segs })}
                          className={`flex-1 py-1 px-2 rounded border font-mono text-[11px] transition-colors ${
                            visual.meshSegments === segs
                              ? 'border-primary bg-primary/15 text-primary font-semibold'
                              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          {segs}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Frame Rate */}
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground font-medium">Target Frame Rate (FPS)</label>
                    <div className="flex gap-1.5">
                      {[30, 60].map((fps) => (
                        <button
                          key={fps}
                          type="button"
                          onClick={() => setSettings({ targetFps: fps })}
                          className={`flex-1 py-1 px-2 rounded border font-mono text-[11px] transition-colors ${
                            settings.targetFps === fps
                              ? 'border-primary bg-primary/15 text-primary font-semibold'
                              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          {fps} FPS
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audio Alerts */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-foreground">Mission Event Audio Chimes</span>
                      <p className="text-[11px] text-muted-foreground">Synthesizes audio alerts on rise/set events</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ audioAlerts: !settings.audioAlerts })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                        settings.audioAlerts ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`size-4 rounded-full bg-foreground transition-transform ${
                          settings.audioAlerts ? 'translate-x-5 bg-primary-foreground' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Anti-Aliasing */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-2 sm:col-span-2">
                    <div>
                      <span className="font-medium text-foreground">Hardware FXAA Anti-Aliasing</span>
                      <p className="text-[11px] text-muted-foreground">Smooths crater rims and high-frequency shadow penumbras</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ antiAliasing: !settings.antiAliasing })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                        settings.antiAliasing ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`size-4 rounded-full bg-foreground transition-transform ${
                          settings.antiAliasing ? 'translate-x-5 bg-primary-foreground' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* High-DPI Canvas */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-2 sm:col-span-2">
                    <div>
                      <span className="font-medium text-foreground">Retina / High-DPI Viewport Scaling</span>
                      <p className="text-[11px] text-muted-foreground">Renders at native device pixel ratio up to 2× for crisp displays</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ highDpi: !settings.highDpi })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                        settings.highDpi ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`size-4 rounded-full bg-foreground transition-transform ${
                          settings.highDpi ? 'translate-x-5 bg-primary-foreground' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-border bg-background/30 p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                  <Layers className="size-4 text-primary" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Interface Layout & Density
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* UI Density */}
                  <div className="space-y-1.5">
                    <label className="text-muted-foreground font-medium">UI Layout Density</label>
                    <div className="flex gap-1.5">
                      {(['compact', 'standard', 'spacious'] as UiDensity[]).map((density) => (
                        <button
                          key={density}
                          type="button"
                          onClick={() => setSettings({ uiDensity: density })}
                          className={`flex-1 py-1.5 px-2 rounded border font-mono text-[11px] capitalize transition-colors ${
                            (settings.uiDensity || 'standard') === density
                              ? 'border-primary bg-primary/15 text-primary font-semibold'
                              : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                          }`}
                        >
                          {density}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* High Contrast Mode */}
                  <div className="flex items-center justify-between border-t sm:border-t-0 border-border/40 pt-2 sm:pt-0">
                    <div>
                      <span className="font-medium text-foreground">High-Contrast Border Outlines</span>
                      <p className="text-[11px] text-muted-foreground">Enhances card borders for high-glare environments</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ highContrast: !settings.highContrast })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                        settings.highContrast ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`size-4 rounded-full bg-foreground transition-transform ${
                          settings.highContrast ? 'translate-x-5 bg-primary-foreground' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Tactical Grid Overlay */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-2 sm:col-span-2">
                    <div>
                      <span className="font-medium text-foreground">Tactical Cartographic Grid</span>
                      <p className="text-[11px] text-muted-foreground">Subtle coordinate dot matrix overlay on application backgrounds</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ gridOverlay: !settings.gridOverlay })}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                        settings.gridOverlay ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`size-4 rounded-full bg-foreground transition-transform ${
                          settings.gridOverlay ? 'translate-x-5 bg-primary-foreground' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: ASTRODYNAMICS & PHYSICS */}
          {activeTab === 'physics' && (
            <section className="rounded-lg border border-border bg-background/30 p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <Cpu className="size-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Astrodynamics & Physics Simulation Models
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Solar Model */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">Solar Disk Occultation Model</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSettings({ solarModel: 'eddington' })}
                      className={`flex-1 py-1.5 px-2 rounded border font-mono text-[10.5px] transition-colors ${
                        settings.solarModel === 'eddington'
                          ? 'border-primary bg-primary/15 text-primary font-semibold'
                          : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      Eddington-Milne (Limb Darkened)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSettings({ solarModel: 'geometric' })}
                      className={`flex-1 py-1.5 px-2 rounded border font-mono text-[10.5px] transition-colors ${
                        settings.solarModel === 'geometric'
                          ? 'border-primary bg-primary/15 text-primary font-semibold'
                          : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      Geometric Chord Only
                    </button>
                  </div>
                </div>

                {/* Battery DoD Limit */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">Max Usable Depth of Discharge (DoD)</label>
                  <div className="flex gap-1.5">
                    {[70, 80, 90].map((dod) => (
                      <button
                        key={dod}
                        type="button"
                        onClick={() => setSettings({ dodThreshold: dod })}
                        className={`flex-1 py-1 px-2 rounded border font-mono text-[11px] transition-colors ${
                          settings.dodThreshold === dod
                            ? 'border-primary bg-primary/15 text-primary font-semibold'
                            : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {dod}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Charge Efficiency */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">Battery Charge Efficiency</label>
                  <div className="flex gap-1.5">
                    {[90, 96, 99].map((eff) => (
                      <button
                        key={eff}
                        type="button"
                        onClick={() => setSettings({ chargeEfficiency: eff })}
                        className={`flex-1 py-1 px-2 rounded border font-mono text-[11px] transition-colors ${
                          settings.chargeEfficiency === eff
                            ? 'border-primary bg-primary/15 text-primary font-semibold'
                            : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {eff}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Regolith Albedo & Emissivity */}
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Regolith Hemispherical Albedo</span>
                    <span className="font-mono text-foreground">{analysis.albedo.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.08"
                    max="0.18"
                    step="0.01"
                    value={analysis.albedo}
                    onChange={(e) => setAnalysis({ albedo: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-medium">Thermal Infrared Emissivity</span>
                    <span className="font-mono text-foreground">{analysis.emissivity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.85"
                    max="0.99"
                    step="0.01"
                    value={analysis.emissivity}
                    onChange={(e) => setAnalysis({ emissivity: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-secondary accent-primary"
                  />
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: UNITS & TELEMETRY */}
          {activeTab === 'units' && (
            <section className="rounded-lg border border-border bg-background/30 p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <Sliders className="size-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Unit Standards & Telemetry Formatting
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Temperature Unit */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">Surface Temperature Display</label>
                  <div className="flex gap-1.5">
                    {(['K', 'C', 'F'] as const).map((unit) => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setSettings({ tempUnit: unit })}
                        className={`flex-1 py-1 px-2 rounded border font-mono text-[11px] transition-colors ${
                          settings.tempUnit === unit
                            ? 'border-primary bg-primary/15 text-primary font-semibold'
                            : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {unit === 'K' ? 'Kelvin (K)' : unit === 'C' ? 'Celsius (°C)' : 'Fahrenheit (°F)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Decimal Precision */}
                <div className="space-y-1.5">
                  <label className="text-muted-foreground font-medium">Display Numeric Precision</label>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((dec) => (
                      <button
                        key={dec}
                        type="button"
                        onClick={() => setSettings({ decimalPrecision: dec })}
                        className={`flex-1 py-1 px-2 rounded border font-mono text-[11px] transition-colors ${
                          settings.decimalPrecision === dec
                            ? 'border-primary bg-primary/15 text-primary font-semibold'
                            : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {dec} dec
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coordinate Format */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-muted-foreground font-medium">Coordinate Display Format</label>
                  <div className="flex gap-1.5">
                    {(['deg', 'dms', 'polar'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setSettings({ coordFormat: fmt })}
                        className={`flex-1 py-1 px-2 rounded border font-mono text-[11px] transition-colors ${
                          settings.coordFormat === fmt
                            ? 'border-primary bg-primary/15 text-primary font-semibold'
                            : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {fmt === 'deg' ? 'Decimal (89.450° S)' : fmt === 'dms' ? 'DMS (89° 27\' S)' : 'Polar (r, θ)'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TAB 4: DATA EXPORT TOOLS */}
          {activeTab === 'export' && (
            <section className="rounded-lg border border-border bg-background/30 p-4 space-y-4">
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <Download className="size-4 text-primary" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Data Export & Archival Tools
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Export computed mission ephemerides, solar profiles, and high-resolution LOLA horizon silhouette arrays for offline analysis and flight review.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleExportJson}
                  className="flex items-center gap-1.5 rounded-md border border-primary/50 bg-primary/10 px-3.5 py-2 font-mono text-xs text-primary hover:bg-primary/20 transition-colors"
                >
                  <Download className="size-3.5" />
                  Export Mission Plan (JSON)
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3.5 py-2 font-mono text-xs text-foreground hover:bg-accent transition-colors"
                >
                  <Download className="size-3.5 text-muted-foreground" />
                  Export 360° Horizon Profile (CSV)
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  className="flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3.5 py-2 font-mono text-xs text-destructive hover:bg-destructive/20 transition-colors ml-auto"
                >
                  <RotateCcw className="size-3.5" />
                  Reset Baseline Defaults
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 border-t border-border bg-card/90 px-6 py-3 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">
            Configuration auto-persists in active simulation state
          </span>
          <button
            type="button"
            onClick={() => setShowSettingsModal(false)}
            className="rounded-md bg-primary px-4 py-1.5 font-mono text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
