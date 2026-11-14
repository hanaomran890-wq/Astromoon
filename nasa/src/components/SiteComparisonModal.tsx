import { useState, useMemo } from 'react';
import { useMission } from '../context/MissionContext.tsx';
import { CATEGORY_LABEL } from '../lib/constants.ts';
import { formatLat, formatLon } from '../lib/dem.ts';
import { cn } from './UIElements.tsx';
import {
  X,
  Scale,
  BarChart2,
  Table as TableIcon,
  Swords,
  Sun,
  Radio,
  Mountain,
  Download,
  Search,
  Check,
  Thermometer,
  ArrowUpDown,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

type ViewMode = 'charts' | 'table' | 'duel';
type SortField =
  | 'name'
  | 'illuminationPct'
  | 'earthVisiblePct'
  | 'elevationM'
  | 'meanSlopeDeg'
  | 'longestDarkH'
  | 'safetyScore'
  | 'peakPowerW';

const PALETTE = [
  '#38bdf8', // sky blue
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
];

export function SiteComparisonModal() {
  const {
    showComparisonModal,
    setShowComparisonModal,
    comparisonData,
    mission,
    selectSite,
    durationH,
    settings,
  } = useMission();

  const [viewMode, setViewMode] = useState<ViewMode>('charts');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>(() =>
    comparisonData.slice(0, 4).map((d) => d.site.id),
  );
  const [sortField, setSortField] = useState<SortField>('safetyScore');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Duel mode selection
  const [duelSiteAId, setDuelSiteAId] = useState<string>(
    comparisonData[0]?.site.id || 'mons-mouton-plateau',
  );
  const [duelSiteBId, setDuelSiteBId] = useState<string>(
    comparisonData[2]?.site.id || 'malapert-massif',
  );

  const prec = settings.decimalPrecision ?? 1;

  // Filtered dataset
  const filteredData = useMemo(() => {
    return comparisonData.filter((item) => {
      if (categoryFilter !== 'all' && item.site.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.site.name.toLowerCase().includes(q);
        const matchesShort = item.site.shortName.toLowerCase().includes(q);
        const matchesTags = item.site.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesShort && !matchesTags) return false;
      }
      return true;
    });
  }, [comparisonData, categoryFilter, searchQuery]);

  // Sorted dataset for table view
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;
      switch (sortField) {
        case 'name':
          valA = a.site.shortName;
          valB = b.site.shortName;
          break;
        case 'illuminationPct':
          valA = a.illuminationPct;
          valB = b.illuminationPct;
          break;
        case 'earthVisiblePct':
          valA = a.earthVisiblePct;
          valB = b.earthVisiblePct;
          break;
        case 'elevationM':
          valA = a.elevationM;
          valB = b.elevationM;
          break;
        case 'meanSlopeDeg':
          valA = a.meanSlopeDeg;
          valB = b.meanSlopeDeg;
          break;
        case 'longestDarkH':
          valA = a.longestDarkH;
          valB = b.longestDarkH;
          break;
        case 'safetyScore':
          valA = a.safetyScore;
          valB = b.safetyScore;
          break;
        case 'peakPowerW':
          valA = a.peakPowerW;
          valB = b.peakPowerW;
          break;
      }
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortAsc ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [filteredData, sortField, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const toggleSiteSelection = (id: string) => {
    setSelectedSiteIds((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev;
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  const selectAllSites = () => {
    setSelectedSiteIds(comparisonData.map((d) => d.site.id));
  };

  const selectTopArtemis = () => {
    setSelectedSiteIds(['mons-mouton-plateau', 'malapert-massif', 'de-gerlache-rim-2', 'slater-plain']);
  };

  // Radar chart data preparation
  const radarChartData = useMemo(() => {
    const axes = [
      { key: 'illumination', label: 'Illumination' },
      { key: 'earthComms', label: 'Earth Comms' },
      { key: 'slopeSafety', label: 'Slope Safety' },
      { key: 'powerHarvest', label: 'Solar Power' },
      { key: 'thermalMildness', label: 'Thermal Stability' },
      { key: 'elevationAdvantage', label: 'High Elevation' },
    ];
    const selectedSites = comparisonData.filter((d) => selectedSiteIds.includes(d.site.id));
    return axes.map((axis) => {
      const row: Record<string, any> = { axis: axis.label };
      selectedSites.forEach((s) => {
        row[s.site.id] = (s.radarScores as any)[axis.key] || 0;
      });
      return row;
    });
  }, [comparisonData, selectedSiteIds]);

  // Grouped Bar chart data
  const barChartData = useMemo(() => {
    return filteredData.map((d) => ({
      name: d.site.shortName,
      id: d.site.id,
      illuminationPct: Number(d.illuminationPct.toFixed(prec)),
      earthVisiblePct: Number(d.earthVisiblePct.toFixed(prec)),
      elevationKm: Number((d.elevationM / 1000).toFixed(2)),
      meanSlopeDeg: Number(d.meanSlopeDeg.toFixed(prec)),
      longestDarkH: Number(d.longestDarkH.toFixed(prec)),
      longestBlackoutH: Number(d.longestBlackoutH.toFixed(prec)),
      peakPowerKW: Number((d.peakPowerW / 1000).toFixed(2)),
      safetyScore: d.safetyScore,
      isActive: d.site.id === mission.siteId,
    }));
  }, [filteredData, mission.siteId, prec]);

  // Scatter plot trade-off data (Pareto Frontier)
  const scatterData = useMemo(() => {
    return filteredData.map((d) => ({
      x: Number(d.illuminationPct.toFixed(prec)),
      y: Number(d.earthVisiblePct.toFixed(prec)),
      z: d.safetyScore,
      name: d.site.shortName,
      category: d.site.category,
      elevationM: d.elevationM,
      slopeDeg: d.meanSlopeDeg,
      id: d.site.id,
    }));
  }, [filteredData, prec]);

  // Duel sites
  const duelSiteA = useMemo(
    () => comparisonData.find((d) => d.site.id === duelSiteAId) || comparisonData[0],
    [comparisonData, duelSiteAId],
  );
  const duelSiteB = useMemo(
    () => comparisonData.find((d) => d.site.id === duelSiteBId) || comparisonData[1],
    [comparisonData, duelSiteBId],
  );

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'Site ID',
      'Site Name',
      'Category',
      'Latitude (°)',
      'Longitude (°)',
      'Elevation (m)',
      'Mean Slope (°)',
      'Max Slope (°)',
      'Safe Area (%)',
      'Illumination (%)',
      'Sunlit Hours',
      'Max Continuous Dark (h)',
      'Earth Visibility (%)',
      'Max Comm Blackout (h)',
      'Peak Power (W)',
      'Energy Harvested (kWh)',
      'Min Battery (kWh)',
      'Min Temp (K)',
      'Max Temp (K)',
      'Distance to South Pole (km)',
      'Safety Score (0-100)',
      'Readiness Verdict',
    ];

    const rows = comparisonData.map((d) => [
      d.site.id,
      `"${d.site.name}"`,
      d.site.category,
      d.site.lat.toFixed(3),
      d.site.lon.toFixed(3),
      d.elevationM.toFixed(0),
      d.meanSlopeDeg.toFixed(2),
      d.maxSlopeDeg.toFixed(2),
      d.safeAreaPct.toFixed(1),
      d.illuminationPct.toFixed(1),
      d.sunlitHours.toFixed(1),
      d.longestDarkH.toFixed(1),
      d.earthVisiblePct.toFixed(1),
      d.longestBlackoutH.toFixed(1),
      d.peakPowerW.toFixed(0),
      d.energyKWh.toFixed(2),
      d.minBatteryKWh.toFixed(2),
      d.tempMinK.toFixed(1),
      d.tempMaxK.toFixed(1),
      d.distanceToPoleKm.toFixed(1),
      d.safetyScore,
      d.verdict,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `lunar_landing_sites_comparison_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(comparisonData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `lunar_landing_sites_comparison_${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!showComparisonModal) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="comparison-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative flex max-h-[92vh] w-full max-w-7xl flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg border border-primary/40 bg-primary/10">
              <Scale className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="comparison-title"
                  className="text-base font-semibold tracking-tight text-foreground"
                >
                  Landing Sites Comparative Analytics & Multi-Target Matrix
                </h2>
                <span className="rounded bg-primary/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-primary">
                  {comparisonData.length} Target Regions
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Statistical trade-offs, illumination persistence, Earth direct line-of-sight & terrain hazard evaluations across NASA’s October 2024 Artemis III candidate regions and historical polar benchmarks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:border-primary/50"
              title="Download entire comparative matrix as CSV"
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background/80 px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:border-primary/50"
              title="Download entire comparative dataset as JSON"
            >
              <Download className="size-3.5" aria-hidden="true" />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={() => setShowComparisonModal(false)}
              className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close comparative analysis matrix"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Global Mission Context Banner & View Mode Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/50 px-6 py-2.5">
          {/* View Mode Switcher */}
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('charts')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'charts'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <BarChart2 className="size-3.5" aria-hidden="true" />
              <span>Graphical Charts (6 Views)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <TableIcon className="size-3.5" aria-hidden="true" />
              <span>Statistical Matrix Table</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('duel')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                viewMode === 'duel'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Swords className="size-3.5" aria-hidden="true" />
              <span>Head-to-Head Duel (A vs B)</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All Sites' },
              { id: 'artemis', label: 'Artemis III Candidates' },
              { id: 'rim', label: 'Crater Rims' },
              { id: 'psr', label: 'PSRs' },
              { id: 'massif', label: 'Massifs' },
              { id: 'robotic', label: 'Robotic Sites' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                  categoryFilter === cat.id
                    ? 'bg-primary/20 text-primary border border-primary/50'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative min-w-44">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter sites..."
              className="w-full rounded-md border border-border bg-card/60 py-1 pr-2.5 pl-8 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
          {comparisonData.length === 0 ? (
            <div className="py-16 text-center font-mono text-sm text-muted-foreground">
              Ingesting LOLA 297 m/px DEM for scientific cross-site evaluation...
            </div>
          ) : (
            <>
              {/* KPI Summary Highlights Row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-lg border border-border/80 bg-card/60 p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-medium">Top Illumination</span>
                    <Sun className="size-3.5 text-warning" />
                  </div>
                  <div className="mt-1 text-base font-bold text-foreground">
                    {(() => {
                      const top = [...comparisonData].sort((a, b) => b.illuminationPct - a.illuminationPct)[0];
                      return top ? `${top.site.shortName} (${top.illuminationPct.toFixed(1)}%)` : '—';
                    })()}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Continuous solar power generation</p>
                </div>

                <div className="rounded-lg border border-border/80 bg-card/60 p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-medium">Best Direct Earth Comms</span>
                    <Radio className="size-3.5 text-earth" />
                  </div>
                  <div className="mt-1 text-base font-bold text-foreground">
                    {(() => {
                      const top = [...comparisonData].sort((a, b) => b.earthVisiblePct - a.earthVisiblePct)[0];
                      return top ? `${top.site.shortName} (${top.earthVisiblePct.toFixed(1)}%)` : '—';
                    })()}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Near-side line-of-sight</p>
                </div>

                <div className="rounded-lg border border-border/80 bg-card/60 p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-medium">Flattest Landing Zone</span>
                    <Mountain className="size-3.5 text-success" />
                  </div>
                  <div className="mt-1 text-base font-bold text-foreground">
                    {(() => {
                      const top = [...comparisonData].sort((a, b) => a.meanSlopeDeg - b.meanSlopeDeg)[0];
                      return top ? `${top.site.shortName} (${top.meanSlopeDeg.toFixed(1)}°)` : '—';
                    })()}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Lowest landing touchdown hazard</p>
                </div>

                <div className="rounded-lg border border-border/80 bg-card/60 p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-medium">Highest Elevation Peak</span>
                    <Mountain className="size-3.5 text-primary" />
                  </div>
                  <div className="mt-1 text-base font-bold text-foreground">
                    {(() => {
                      const top = [...comparisonData].sort((a, b) => b.elevationM - a.elevationM)[0];
                      return top ? `${top.site.shortName} (+${(top.elevationM / 1000).toFixed(2)} km)` : '—';
                    })()}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Relief vantage point above shadow</p>
                </div>

                <div className="rounded-lg border border-border/80 bg-card/60 p-3">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[11px] font-medium">Deepest Volatile Trap</span>
                    <Thermometer className="size-3.5 text-earth" />
                  </div>
                  <div className="mt-1 text-base font-bold text-foreground">
                    {(() => {
                      const top = [...comparisonData].sort((a, b) => a.tempMinK - b.tempMinK)[0];
                      return top ? `${top.site.shortName} (${top.tempMinK.toFixed(0)} K)` : '—';
                    })()}
                  </div>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Permanently shadowed water ice</p>
                </div>
              </div>

              {/* VIEW 1: GRAPHICAL CHARTS */}
              {viewMode === 'charts' && (
                <div className="space-y-6">
                  {/* Chart Grid 1: Radar Spider Chart & Sunlight vs Earth Bar Chart */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* 1. Multi-Site Radar Spider Chart (5 cols) */}
                    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-4 lg:col-span-5">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                            Multi-Factor Spider Chart
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            Comprehensive trade-off comparison (0-100 scale)
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={selectTopArtemis}
                            className="rounded border border-border bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            Top 4
                          </button>
                          <button
                            type="button"
                            onClick={selectAllSites}
                            className="rounded border border-border bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            All
                          </button>
                        </div>
                      </div>

                      {/* Site Legend Selector Pills */}
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {comparisonData.map((d, idx) => {
                          const isSelected = selectedSiteIds.includes(d.site.id);
                          const color = PALETTE[idx % PALETTE.length];
                          return (
                            <button
                              key={d.site.id}
                              type="button"
                              onClick={() => toggleSiteSelection(d.site.id)}
                              className={cn(
                                'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all',
                                isSelected
                                  ? 'border bg-background text-foreground shadow-xs'
                                  : 'border border-transparent bg-muted/30 text-muted-foreground opacity-60 hover:opacity-100',
                              )}
                              style={{
                                borderColor: isSelected ? color : 'transparent',
                              }}
                            >
                              <span
                                className="size-2 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span>{d.site.shortName}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Radar Canvas */}
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarChartData}>
                            <PolarGrid stroke="#374151" strokeDasharray="3 3" />
                            <PolarAngleAxis
                              dataKey="axis"
                              tick={{ fill: '#9ca3af', fontSize: 10 }}
                            />
                            <PolarRadiusAxis
                              angle={30}
                              domain={[0, 100]}
                              tick={{ fill: '#6b7280', fontSize: 9 }}
                            />
                            {comparisonData
                              .filter((d) => selectedSiteIds.includes(d.site.id))
                              .map((d) => {
                                const originalIdx = comparisonData.findIndex((x) => x.site.id === d.site.id);
                                const color = PALETTE[originalIdx % PALETTE.length];
                                return (
                                  <Radar
                                    key={d.site.id}
                                    name={d.site.shortName}
                                    dataKey={d.site.id}
                                    stroke={color}
                                    fill={color}
                                    fillOpacity={0.25}
                                  />
                                );
                              })}
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#111827',
                                borderColor: '#374151',
                                borderRadius: '0.375rem',
                                fontSize: '11px',
                              }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 2. Grouped Bar Chart: Sunlight vs Earth Direct Line-of-Sight (7 cols) */}
                    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-4 lg:col-span-7">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                            Solar Illumination vs Earth Line-of-Sight
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            Percentage of active mission epoch with solar disk unocculted vs Earth visible
                          </p>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-sm bg-warning" /> Sunlight (%)
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-sm bg-earth" /> Earth Comms (%)
                          </span>
                        </div>
                      </div>

                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                            <XAxis
                              dataKey="name"
                              tick={{ fill: '#9ca3af', fontSize: 10 }}
                              interval={0}
                              angle={-25}
                              textAnchor="end"
                            />
                            <YAxis
                              domain={[0, 100]}
                              tick={{ fill: '#6b7280', fontSize: 10 }}
                              unit="%"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#111827',
                                borderColor: '#374151',
                                borderRadius: '0.375rem',
                                fontSize: '11px',
                              }}
                              formatter={(value: any, name: any) => [
                                `${value}%`,
                                name === 'illuminationPct' ? 'Sunlight Illumination' : 'Earth Visibility',
                              ]}
                            />
                            <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="3 3" label={{ value: '80% Goal', fill: '#22c55e', fontSize: 9 }} />
                            <Bar
                              dataKey="illuminationPct"
                              name="illuminationPct"
                              fill="#eab308"
                              radius={[3, 3, 0, 0]}
                            />
                            <Bar
                              dataKey="earthVisiblePct"
                              name="earthVisiblePct"
                              fill="#38bdf8"
                              radius={[3, 3, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Chart Grid 2: Worst-case Darkness vs Comm Blackout & Topographic Profiles */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* 3. Longest Continuous Dark & Comm Blackout Streaks (6 cols) */}
                    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-4 lg:col-span-6">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                            Critical Hazard: Continuous Eclipse & Blackout
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            Longest consecutive hours in shadow (battery constraint) vs comm blackout
                          </p>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-sm bg-destructive" /> Max Dark (h)
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-sm bg-purple-500" /> Comm Blackout (h)
                          </span>
                        </div>
                      </div>

                      <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                            <XAxis
                              dataKey="name"
                              tick={{ fill: '#9ca3af', fontSize: 10 }}
                              interval={0}
                              angle={-25}
                              textAnchor="end"
                            />
                            <YAxis
                              tick={{ fill: '#6b7280', fontSize: 10 }}
                              unit="h"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#111827',
                                borderColor: '#374151',
                                borderRadius: '0.375rem',
                                fontSize: '11px',
                              }}
                              formatter={(value: any, name: any) => [
                                `${value} hours`,
                                name === 'longestDarkH' ? 'Max Continuous Dark' : 'Max Comm Blackout',
                              ]}
                            />
                            <Bar
                              dataKey="longestDarkH"
                              name="longestDarkH"
                              fill="#ef4444"
                              radius={[3, 3, 0, 0]}
                            />
                            <Bar
                              dataKey="longestBlackoutH"
                              name="longestBlackoutH"
                              fill="#a855f7"
                              radius={[3, 3, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 4. Topography & Slope Relief (6 cols) */}
                    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-4 lg:col-span-6">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                            LOLA Topographic Elevation & Mean Slope
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            Elevation relative to 1737.4 km lunar sphere vs landing ellipse slope (°)
                          </p>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-sm bg-emerald-500" /> Elevation (km)
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="size-2.5 rounded-sm bg-amber-500" /> Mean Slope (°)
                          </span>
                        </div>
                      </div>

                      <div className="h-60 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                            <XAxis
                              dataKey="name"
                              tick={{ fill: '#9ca3af', fontSize: 10 }}
                              interval={0}
                              angle={-25}
                              textAnchor="end"
                            />
                            <YAxis
                              yAxisId="left"
                              tick={{ fill: '#6b7280', fontSize: 10 }}
                              unit="km"
                            />
                            <YAxis
                              yAxisId="right"
                              orientation="right"
                              domain={[0, 25]}
                              tick={{ fill: '#6b7280', fontSize: 10 }}
                              unit="°"
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#111827',
                                borderColor: '#374151',
                                borderRadius: '0.375rem',
                                fontSize: '11px',
                              }}
                            />
                            <ReferenceLine
                              yAxisId="right"
                              y={8}
                              stroke="#ef4444"
                              strokeDasharray="3 3"
                              label={{ value: '8° Lander Limit', fill: '#ef4444', fontSize: 9 }}
                            />
                            <Bar
                              yAxisId="left"
                              dataKey="elevationKm"
                              name="Elevation (km)"
                              fill="#10b981"
                              radius={[3, 3, 0, 0]}
                            />
                            <Bar
                              yAxisId="right"
                              dataKey="meanSlopeDeg"
                              name="Mean Slope (°)"
                              fill="#f59e0b"
                              radius={[3, 3, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Chart Grid 3: 2D Pareto Trade-Off Scatter Plot & Overall Safety Ranking */}
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                    {/* 5. 2D Pareto Trade-Off Scatter Plot (7 cols) */}
                    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-4 lg:col-span-7">
                      <div className="mb-2 flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                            2D Pareto Trade-off Matrix (Sunlight vs Earth Line-of-Sight)
                          </h3>
                          <p className="text-[11px] text-muted-foreground">
                            Upper right corner represents optimal dual-visibility landing sites. Bubble size represents Artemis Suitability Score.
                          </p>
                        </div>
                      </div>

                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 15, right: 20, bottom: 25, left: -10 }}>
                            <XAxis
                              type="number"
                              dataKey="x"
                              name="Sunlight (%)"
                              unit="%"
                              domain={[0, 100]}
                              tick={{ fill: '#9ca3af', fontSize: 10 }}
                              label={{ value: 'Sunlight Illumination (%)', position: 'insideBottom', offset: -15, fill: '#6b7280', fontSize: 10 }}
                            />
                            <YAxis
                              type="number"
                              dataKey="y"
                              name="Earth Comms (%)"
                              unit="%"
                              domain={[0, 100]}
                              tick={{ fill: '#9ca3af', fontSize: 10 }}
                              label={{ value: 'Earth Direct Line-of-Sight (%)', angle: -90, position: 'insideLeft', offset: 15, fill: '#6b7280', fontSize: 10 }}
                            />
                            <ZAxis type="number" dataKey="z" range={[80, 400]} name="Safety Score" />
                            <Tooltip
                              cursor={{ strokeDasharray: '3 3' }}
                              content={({ active, payload }) => {
                                if (!active || !payload || !payload.length) return null;
                                const d = payload[0].payload;
                                return (
                                  <div className="rounded-md border border-border bg-popover/95 p-2 text-xs shadow-md">
                                    <div className="font-semibold text-foreground">{d.name}</div>
                                    <div className="mt-1 space-y-0.5 text-muted-foreground">
                                      <div>Sunlight: <span className="font-mono text-warning font-semibold">{d.x}%</span></div>
                                      <div>Earth LOS: <span className="font-mono text-earth font-semibold">{d.y}%</span></div>
                                      <div>Safety Score: <span className="font-mono text-success font-semibold">{d.z}/100</span></div>
                                      <div>Elevation: <span className="font-mono text-foreground">{d.elevationM > 0 ? `+${d.elevationM} m` : `${d.elevationM} m`}</span></div>
                                    </div>
                                  </div>
                                );
                              }}
                            />
                            <Scatter name="Landing Sites" data={scatterData} fill="#38bdf8">
                              {scatterData.map((entry, index) => {
                                const isCurrent = entry.id === mission.siteId;
                                return (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={isCurrent ? '#f59e0b' : entry.z >= 75 ? '#10b981' : entry.z >= 50 ? '#38bdf8' : '#ef4444'}
                                    stroke={isCurrent ? '#ffffff' : '#000000'}
                                    strokeWidth={isCurrent ? 2 : 1}
                                  />
                                );
                              })}
                            </Scatter>
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* 6. Overall Mission Readiness Ranking & Quick Activation (5 cols) */}
                    <div className="flex flex-col rounded-xl border border-border bg-card/50 p-4 lg:col-span-5">
                      <div className="mb-2">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                          Ranked Readiness Leaderboard
                        </h3>
                        <p className="text-[11px] text-muted-foreground">
                          Composite Artemis III suitability index & quick selection
                        </p>
                      </div>

                      <div className="space-y-2 overflow-y-auto max-h-64 pr-1">
                        {[...comparisonData]
                          .sort((a, b) => b.safetyScore - a.safetyScore)
                          .map((d, rank) => {
                            const isCurrent = d.site.id === mission.siteId;
                            return (
                              <div
                                key={d.site.id}
                                className={cn(
                                  'flex items-center justify-between rounded-lg border p-2 transition-all',
                                  isCurrent
                                    ? 'border-primary bg-primary/10 shadow-xs'
                                    : 'border-border/60 bg-card/40 hover:border-border',
                                )}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="grid size-5 shrink-0 place-items-center rounded bg-muted font-mono text-[10px] font-bold text-muted-foreground">
                                    #{rank + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate text-xs font-semibold text-foreground">
                                        {d.site.shortName}
                                      </span>
                                      {isCurrent && (
                                        <span className="rounded bg-primary px-1.5 py-0.2 font-mono text-[9px] font-bold text-primary-foreground uppercase">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 font-mono text-[10px] text-muted-foreground">
                                      <span>Sun: {d.illuminationPct.toFixed(0)}%</span>
                                      <span>•</span>
                                      <span>Earth: {d.earthVisiblePct.toFixed(0)}%</span>
                                      <span>•</span>
                                      <span>Slope: {d.meanSlopeDeg.toFixed(1)}°</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <div
                                      className={cn(
                                        'font-mono text-xs font-bold',
                                        d.verdict === 'SAFE'
                                          ? 'text-success'
                                          : d.verdict === 'CAUTION'
                                            ? 'text-warning'
                                            : d.verdict === 'HAZARDOUS'
                                              ? 'text-destructive'
                                              : 'text-muted-foreground',
                                      )}
                                    >
                                      {d.safetyScore}/100
                                    </div>
                                    <div className="text-[9px] text-muted-foreground uppercase">
                                      {d.verdict === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT DATA' : d.verdict}
                                    </div>
                                  </div>
                                  {!isCurrent && (
                                    <button
                                      type="button"
                                      onClick={() => selectSite(d.site.id)}
                                      className="rounded border border-border bg-background px-2 py-1 text-[10px] font-medium text-foreground transition-colors hover:bg-accent hover:border-primary/50"
                                    >
                                      Select
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VIEW 2: COMPREHENSIVE STATISTICAL MATRIX TABLE */}
              {viewMode === 'table' && (
                <div className="rounded-xl border border-border bg-card/60 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/60 font-mono text-[10px] uppercase text-muted-foreground">
                          <th className="p-3 font-semibold">
                            <button
                              type="button"
                              onClick={() => toggleSort('name')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              <span>Candidate Site</span>
                              <ArrowUpDown className="size-3" />
                            </button>
                          </th>
                          <th className="p-3 font-semibold">Category</th>
                          <th className="p-3 font-semibold">Coordinates</th>
                          <th className="p-3 font-semibold">
                            <button
                              type="button"
                              onClick={() => toggleSort('elevationM')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              <span>Elevation</span>
                              <ArrowUpDown className="size-3" />
                            </button>
                          </th>
                          <th className="p-3 font-semibold">
                            <button
                              type="button"
                              onClick={() => toggleSort('meanSlopeDeg')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              <span>Slope (Mean / Max)</span>
                              <ArrowUpDown className="size-3" />
                            </button>
                          </th>
                          <th className="p-3 font-semibold">
                            <button
                              type="button"
                              onClick={() => toggleSort('illuminationPct')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              <span>Sunlight %</span>
                              <ArrowUpDown className="size-3" />
                            </button>
                          </th>
                          <th className="p-3 font-semibold">
                            <button
                              type="button"
                              onClick={() => toggleSort('longestDarkH')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              <span>Max Dark (h)</span>
                              <ArrowUpDown className="size-3" />
                            </button>
                          </th>
                          <th className="p-3 font-semibold">
                            <button
                              type="button"
                              onClick={() => toggleSort('earthVisiblePct')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              <span>Earth Comms %</span>
                              <ArrowUpDown className="size-3" />
                            </button>
                          </th>
                          <th className="p-3 font-semibold">
                            <button
                              type="button"
                              onClick={() => toggleSort('peakPowerW')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              <span>Peak Power / Energy</span>
                              <ArrowUpDown className="size-3" />
                            </button>
                          </th>
                          <th className="p-3 font-semibold">Thermal (Min / Max)</th>
                          <th className="p-3 font-semibold">Dist to Pole</th>
                          <th className="p-3 font-semibold">
                            <button
                              type="button"
                              onClick={() => toggleSort('safetyScore')}
                              className="flex items-center gap-1 hover:text-foreground"
                            >
                              <span>Suitability Score</span>
                              <ArrowUpDown className="size-3" />
                            </button>
                          </th>
                          <th className="p-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {sortedData.map((d) => {
                          const isCurrent = d.site.id === mission.siteId;
                          return (
                            <tr
                              key={d.site.id}
                              className={cn(
                                'transition-colors hover:bg-muted/30',
                                isCurrent && 'bg-primary/5 font-medium',
                              )}
                            >
                              {/* Site Name */}
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {isCurrent && (
                                    <span className="size-2 rounded-full bg-primary" title="Currently selected site" />
                                  )}
                                  <div>
                                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                                      <span>{d.site.shortName}</span>
                                      {isCurrent && (
                                        <span className="rounded bg-primary/20 px-1 py-0.2 font-mono text-[9px] text-primary">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground line-clamp-1">
                                      {d.site.name}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Category Badge */}
                              <td className="p-3">
                                <span className="inline-block rounded-md border border-border/80 bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground uppercase">
                                  {CATEGORY_LABEL[d.site.category] || d.site.category}
                                </span>
                              </td>

                              {/* Coordinates */}
                              <td className="p-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                {formatLat(d.site.lat)} • {formatLon(d.site.lon)}
                              </td>

                              {/* Elevation */}
                              <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                                <span
                                  className={cn(
                                    d.elevationM > 1000
                                      ? 'text-success font-semibold'
                                      : d.elevationM < -2000
                                        ? 'text-earth font-semibold'
                                        : 'text-foreground',
                                  )}
                                >
                                  {d.elevationM > 0 ? `+${d.elevationM.toFixed(0)} m` : `${d.elevationM.toFixed(0)} m`}
                                </span>
                              </td>

                              {/* Slope */}
                              <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                                <span
                                  className={cn(
                                    d.meanSlopeDeg <= 8
                                      ? 'text-success'
                                      : d.meanSlopeDeg <= 12
                                        ? 'text-warning'
                                        : 'text-destructive font-semibold',
                                  )}
                                >
                                  {d.meanSlopeDeg.toFixed(1)}°
                                </span>
                                <span className="text-muted-foreground"> / {d.maxSlopeDeg.toFixed(1)}°</span>
                              </td>

                              {/* Sunlight */}
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-warning">
                                  <Sun className="size-3" />
                                  <span>{d.illuminationPct.toFixed(1)}%</span>
                                </div>
                                <div className="font-mono text-[10px] text-muted-foreground">
                                  {d.sunlitHours.toFixed(1)}h lit
                                </div>
                              </td>

                              {/* Longest Dark */}
                              <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                                <span
                                  className={cn(
                                    d.longestDarkH < 12
                                      ? 'text-success'
                                      : d.longestDarkH < 48
                                        ? 'text-warning'
                                        : 'text-destructive font-semibold',
                                  )}
                                >
                                  {d.longestDarkH.toFixed(1)}h
                                </span>
                              </td>

                              {/* Earth Comms */}
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-earth">
                                  <Radio className="size-3" />
                                  <span>{d.earthVisiblePct.toFixed(1)}%</span>
                                </div>
                                <div className="font-mono text-[10px] text-muted-foreground">
                                  Max blackout: {d.longestBlackoutH.toFixed(1)}h
                                </div>
                              </td>

                              {/* Solar Power & Energy */}
                              <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                                <div>{(d.peakPowerW / 1000).toFixed(2)} kW pk</div>
                                <div className="text-[10px] text-muted-foreground">
                                  {d.energyKWh.toFixed(1)} kWh total
                                </div>
                              </td>

                              {/* Thermal */}
                              <td className="p-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                <span className="text-earth">{d.tempMinK.toFixed(0)} K</span>
                                <span> … </span>
                                <span className="text-warning">{d.tempMaxK.toFixed(0)} K</span>
                              </td>

                              {/* Distance to South Pole */}
                              <td className="p-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                {d.distanceToPoleKm.toFixed(1)} km
                              </td>

                              {/* Suitability Score */}
                              <td className="p-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={cn(
                                      'font-mono text-xs font-bold',
                                      d.verdict === 'SAFE'
                                        ? 'text-success'
                                        : d.verdict === 'CAUTION'
                                          ? 'text-warning'
                                          : d.verdict === 'HAZARDOUS'
                                            ? 'text-destructive'
                                            : 'text-muted-foreground',
                                    )}
                                  >
                                    {d.safetyScore}
                                  </span>
                                  <span
                                    className={cn(
                                      'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase',
                                      d.verdict === 'SAFE'
                                        ? 'bg-success/15 text-success'
                                        : d.verdict === 'CAUTION'
                                          ? 'bg-warning/15 text-warning'
                                          : d.verdict === 'HAZARDOUS'
                                            ? 'bg-destructive/15 text-destructive'
                                            : 'bg-muted text-muted-foreground',
                                    )}
                                  >
                                    {d.verdict === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT DATA' : d.verdict}
                                  </span>
                                </div>
                              </td>

                              {/* Action Button */}
                              <td className="p-3 text-right whitespace-nowrap">
                                {isCurrent ? (
                                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-primary">
                                    <Check className="size-3" /> Selected
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => selectSite(d.site.id)}
                                    className="rounded border border-primary/50 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20"
                                  >
                                    Select Site
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* VIEW 3: HEAD-TO-HEAD DUEL (SITE A vs SITE B) */}
              {viewMode === 'duel' && (
                <div className="space-y-6">
                  {/* Site Selectors */}
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {/* Site A Card */}
                    <div className="rounded-xl border border-sky-500/50 bg-sky-950/20 p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-sky-500/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-sky-400">
                          Target Alpha (Site A)
                        </span>
                        <button
                          type="button"
                          onClick={() => selectSite(duelSiteA.site.id)}
                          className="rounded border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-xs font-medium text-sky-300 hover:bg-sky-500/20"
                        >
                          {mission.siteId === duelSiteA.site.id ? 'Active in Viewport' : 'Make Active'}
                        </button>
                      </div>
                      <div className="mt-3">
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Select Landing Site</label>
                        <select
                          value={duelSiteAId}
                          onChange={(e) => setDuelSiteAId(e.target.value)}
                          className="mt-1 w-full rounded-md border border-border bg-card p-2 text-sm font-semibold text-foreground"
                        >
                          {comparisonData.map((d) => (
                            <option key={d.site.id} value={d.site.id}>
                              {d.site.shortName} ({CATEGORY_LABEL[d.site.category] || d.site.category})
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {duelSiteA.site.summary}
                      </p>
                    </div>

                    {/* Site B Card */}
                    <div className="rounded-xl border border-amber-500/50 bg-amber-950/20 p-5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-amber-400">
                          Target Beta (Site B)
                        </span>
                        <button
                          type="button"
                          onClick={() => selectSite(duelSiteB.site.id)}
                          className="rounded border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
                        >
                          {mission.siteId === duelSiteB.site.id ? 'Active in Viewport' : 'Make Active'}
                        </button>
                      </div>
                      <div className="mt-3">
                        <label className="text-[10px] font-medium uppercase text-muted-foreground">Select Landing Site</label>
                        <select
                          value={duelSiteBId}
                          onChange={(e) => setDuelSiteBId(e.target.value)}
                          className="mt-1 w-full rounded-md border border-border bg-card p-2 text-sm font-semibold text-foreground"
                        >
                          {comparisonData.map((d) => (
                            <option key={d.site.id} value={d.site.id}>
                              {d.site.shortName} ({CATEGORY_LABEL[d.site.category] || d.site.category})
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                        {duelSiteB.site.summary}
                      </p>
                    </div>
                  </div>

                  {/* Head-to-Head Quantitative Delta Matrix */}
                  <div className="rounded-xl border border-border bg-card/60 p-5">
                    <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-foreground">
                      Direct Metric Comparison & Delta Analysis
                    </h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Metric 1: Illumination */}
                      <div className="rounded-lg border border-border/80 bg-background/50 p-3">
                        <div className="text-[11px] text-muted-foreground">Illumination Availability</div>
                        <div className="mt-2 flex items-baseline justify-between font-mono">
                          <span className="text-sm font-bold text-sky-400">{duelSiteA.illuminationPct.toFixed(1)}%</span>
                          <span className="text-xs text-muted-foreground">vs</span>
                          <span className="text-sm font-bold text-amber-400">{duelSiteB.illuminationPct.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1.5 text-[10px] font-mono">
                          {duelSiteA.illuminationPct >= duelSiteB.illuminationPct ? (
                            <span className="text-sky-400 font-semibold">
                              Site A +{(duelSiteA.illuminationPct - duelSiteB.illuminationPct).toFixed(1)}% more lit
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold">
                              Site B +{(duelSiteB.illuminationPct - duelSiteA.illuminationPct).toFixed(1)}% more lit
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metric 2: Earth Direct Visibility */}
                      <div className="rounded-lg border border-border/80 bg-background/50 p-3">
                        <div className="text-[11px] text-muted-foreground">Earth Direct Comms</div>
                        <div className="mt-2 flex items-baseline justify-between font-mono">
                          <span className="text-sm font-bold text-sky-400">{duelSiteA.earthVisiblePct.toFixed(1)}%</span>
                          <span className="text-xs text-muted-foreground">vs</span>
                          <span className="text-sm font-bold text-amber-400">{duelSiteB.earthVisiblePct.toFixed(1)}%</span>
                        </div>
                        <div className="mt-1.5 text-[10px] font-mono">
                          {duelSiteA.earthVisiblePct >= duelSiteB.earthVisiblePct ? (
                            <span className="text-sky-400 font-semibold">
                              Site A +{(duelSiteA.earthVisiblePct - duelSiteB.earthVisiblePct).toFixed(1)}% higher LOS
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold">
                              Site B +{(duelSiteB.earthVisiblePct - duelSiteA.earthVisiblePct).toFixed(1)}% higher LOS
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metric 3: Landing Slope Hazard */}
                      <div className="rounded-lg border border-border/80 bg-background/50 p-3">
                        <div className="text-[11px] text-muted-foreground">Mean Ellipse Slope</div>
                        <div className="mt-2 flex items-baseline justify-between font-mono">
                          <span className="text-sm font-bold text-sky-400">{duelSiteA.meanSlopeDeg.toFixed(1)}°</span>
                          <span className="text-xs text-muted-foreground">vs</span>
                          <span className="text-sm font-bold text-amber-400">{duelSiteB.meanSlopeDeg.toFixed(1)}°</span>
                        </div>
                        <div className="mt-1.5 text-[10px] font-mono">
                          {duelSiteA.meanSlopeDeg <= duelSiteB.meanSlopeDeg ? (
                            <span className="text-sky-400 font-semibold">
                              Site A is {(duelSiteB.meanSlopeDeg - duelSiteA.meanSlopeDeg).toFixed(1)}° flatter (safer)
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold">
                              Site B is {(duelSiteA.meanSlopeDeg - duelSiteB.meanSlopeDeg).toFixed(1)}° flatter (safer)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metric 4: Max Darkness Duration */}
                      <div className="rounded-lg border border-border/80 bg-background/50 p-3">
                        <div className="text-[11px] text-muted-foreground">Max Continuous Dark</div>
                        <div className="mt-2 flex items-baseline justify-between font-mono">
                          <span className="text-sm font-bold text-sky-400">{duelSiteA.longestDarkH.toFixed(1)}h</span>
                          <span className="text-xs text-muted-foreground">vs</span>
                          <span className="text-sm font-bold text-amber-400">{duelSiteB.longestDarkH.toFixed(1)}h</span>
                        </div>
                        <div className="mt-1.5 text-[10px] font-mono">
                          {duelSiteA.longestDarkH <= duelSiteB.longestDarkH ? (
                            <span className="text-sky-400 font-semibold">
                              Site A has {(duelSiteB.longestDarkH - duelSiteA.longestDarkH).toFixed(1)}h shorter dark
                            </span>
                          ) : (
                            <span className="text-amber-400 font-semibold">
                              Site B has {(duelSiteA.longestDarkH - duelSiteB.longestDarkH).toFixed(1)}h shorter dark
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Strategic Operational Synthesis Box */}
                    <div className="mt-5 rounded-lg border border-border/80 bg-muted/30 p-4">
                      <h4 className="text-xs font-semibold text-foreground">Mission Operational Trade-Off Verdict</h4>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                        {duelSiteA.illuminationPct > duelSiteB.illuminationPct && duelSiteB.earthVisiblePct > duelSiteA.earthVisiblePct ? (
                          <>
                            <strong className="text-sky-400">{duelSiteA.site.shortName}</strong> provides superior solar illumination for continuous surface power operations, while <strong className="text-amber-400">{duelSiteB.site.shortName}</strong> offers stronger direct-to-Earth communications visibility without reliance on lunar orbital relays.
                          </>
                        ) : duelSiteA.safetyScore > duelSiteB.safetyScore ? (
                          <>
                            <strong className="text-sky-400">{duelSiteA.site.shortName}</strong> demonstrates an overall higher landing feasibility score ({duelSiteA.safetyScore} vs {duelSiteB.safetyScore}), driven by gentler topography ({duelSiteA.meanSlopeDeg.toFixed(1)}° vs {duelSiteB.meanSlopeDeg.toFixed(1)}°) and more favorable thermal margins.
                          </>
                        ) : (
                          <>
                            <strong className="text-amber-400">{duelSiteB.site.shortName}</strong> holds the operational advantage with a suitability score of {duelSiteB.safetyScore}/100, providing {duelSiteB.safeAreaPct.toFixed(0)}% safe touchdown area within the landing ellipse.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/40 px-6 py-3 font-mono text-[11px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>NASA LOLA 2048² DEM • Topocentric Ephemeris</span>
            <span>•</span>
            <span>Mission Epoch: {durationH.toFixed(0)}h duration</span>
          </div>
          <button
            type="button"
            onClick={() => setShowComparisonModal(false)}
            className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium text-foreground hover:bg-accent"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
}
