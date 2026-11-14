import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useDeferredValue,
} from 'react';
import {
  MissionState,
  AnalysisConstraints,
  VisualSettings,
  UserSettings,
  DemData,
  HorizonProfile,
  MissionResult,
  MissionSample,
  TerrainStatistics,
  SafetyScore,
  CameraPreset,
} from '../types/mission.ts';
import {
  DEFAULT_CONSTRAINTS,
  DEFAULT_VISUAL,
  LANDING_SITES,
  LANDER_PROFILES,
  DEFAULT_SITE_ID,
  getSite,
} from '../lib/constants.ts';
import { loadDem } from '../lib/dem.ts';
import {
  computeHorizonProfile,
  simulateMission,
  computeTerrainStatistics,
  computeSafetyScore,
} from '../lib/physics.ts';
import { computeAllSitesComparison, SiteComparisonData } from '../lib/siteComparison.ts';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  uiDensity: 'standard',
  gridOverlay: false,
  highContrast: false,
  tempUnit: 'K',
  coordFormat: 'deg',
  decimalPrecision: 1,
  graphicsQuality: 'high',
  antiAliasing: true,
  wireframe: false,
  highDpi: true,
  targetFps: 60,
  audioAlerts: false,
  telemetryDensity: 'standard',
  chargeEfficiency: 96,
  dodThreshold: 80,
  solarModel: 'eddington',
};

interface MissionContextValue {
  dem: DemData | null;
  demError: string | null;
  mission: MissionState;
  setMission: (updates: Partial<MissionState>) => void;
  selectSite: (id: string) => void;
  setCustomSite: (lat: number, lon: number) => void;
  applyLander: (landerId: string) => void;
  analysis: AnalysisConstraints;
  setAnalysis: (updates: Partial<AnalysisConstraints>) => void;
  visual: VisualSettings;
  setVisual: (updates: Partial<VisualSettings>) => void;
  settings: UserSettings;
  setSettings: (updates: Partial<UserSettings>) => void;
  startMs: number;
  durationH: number;
  horizon: HorizonProfile | null;
  result: MissionResult | null;
  terrain: TerrainStatistics | null;
  safety: SafetyScore | null;
  computing: boolean;
  view: { preset: CameraPreset; nonce: number };
  requestView: (preset: CameraPreset) => void;
  showFormulasModal: boolean;
  setShowFormulasModal: (show: boolean) => void;
  showSettingsModal: boolean;
  setShowSettingsModal: (show: boolean) => void;
  showAboutModal: boolean;
  setShowAboutModal: (show: boolean) => void;
  showComparisonModal: boolean;
  setShowComparisonModal: (show: boolean) => void;
  comparisonData: SiteComparisonData[];
}

interface MissionTimeContextValue {
  cursorH: number;
  setCursorH: React.Dispatch<React.SetStateAction<number>>;
  playing: boolean;
  setPlaying: (p: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
}

const MissionContext = createContext<MissionContextValue | null>(null);
const MissionTimeContext = createContext<MissionTimeContextValue | null>(null);

const defaultSite = getSite(DEFAULT_SITE_ID) || LANDING_SITES[0];
const defaultLander = LANDER_PROFILES[0];

export function MissionProvider({ children }: { children: React.ReactNode }) {
  const [dem, setDem] = useState<DemData | null>(null);
  const [demError, setDemError] = useState<string | null>(null);

  // Load DEM asynchronously on mount
  useEffect(() => {
    let active = true;
    loadDem()
      .then((data) => {
        if (active) {
          setDem(data);
          setDemError(null);
        }
      })
      .catch((err) => {
        if (active) {
          console.error('LOLA DEM load error:', err);
          setDemError(err.message || 'Failed to load LOLA DEM');
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const [mission, setMissionInternal] = useState<MissionState>({
    siteId: defaultSite.id,
    siteName: defaultSite.name,
    lat: defaultSite.lat,
    lon: defaultSite.lon,
    startIso: '2027-06-15T00:00',
    durationDays: 6.5,
    stepMin: 30,
    landerId: defaultLander.id,
  });

  const [analysis, setAnalysisInternal] = useState<AnalysisConstraints>({
    ...DEFAULT_CONSTRAINTS,
    ...defaultLander.overrides,
  });

  const [visual, setVisualInternal] = useState<VisualSettings>(DEFAULT_VISUAL);
  const [settings, setSettingsInternal] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem('astromoon_user_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_USER_SETTINGS,
          uiDensity: parsed.uiDensity ?? DEFAULT_USER_SETTINGS.uiDensity,
          gridOverlay: parsed.gridOverlay ?? DEFAULT_USER_SETTINGS.gridOverlay,
          highContrast: parsed.highContrast ?? DEFAULT_USER_SETTINGS.highContrast,
          tempUnit: parsed.tempUnit ?? DEFAULT_USER_SETTINGS.tempUnit,
          coordFormat: parsed.coordFormat ?? DEFAULT_USER_SETTINGS.coordFormat,
          decimalPrecision: parsed.decimalPrecision ?? DEFAULT_USER_SETTINGS.decimalPrecision,
          graphicsQuality: parsed.graphicsQuality ?? DEFAULT_USER_SETTINGS.graphicsQuality,
          antiAliasing: parsed.antiAliasing ?? DEFAULT_USER_SETTINGS.antiAliasing,
          wireframe: parsed.wireframe ?? DEFAULT_USER_SETTINGS.wireframe,
          highDpi: parsed.highDpi ?? DEFAULT_USER_SETTINGS.highDpi,
          targetFps: parsed.targetFps ?? DEFAULT_USER_SETTINGS.targetFps,
          audioAlerts: parsed.audioAlerts ?? DEFAULT_USER_SETTINGS.audioAlerts,
          telemetryDensity: parsed.telemetryDensity ?? DEFAULT_USER_SETTINGS.telemetryDensity,
          chargeEfficiency: parsed.chargeEfficiency ?? DEFAULT_USER_SETTINGS.chargeEfficiency,
          dodThreshold: parsed.dodThreshold ?? DEFAULT_USER_SETTINGS.dodThreshold,
          solarModel: parsed.solarModel ?? DEFAULT_USER_SETTINGS.solarModel,
        };
      }
    } catch {
      // Storage unavailable or invalid
    }
    return DEFAULT_USER_SETTINGS;
  });

  // Synchronize display attributes and persist settings
  useEffect(() => {
    try {
      localStorage.setItem('astromoon_user_settings', JSON.stringify(settings));
    } catch {
      // Ignore storage errors
    }
    document.documentElement.setAttribute('data-density', settings.uiDensity || 'standard');
    document.documentElement.setAttribute('data-contrast', settings.highContrast ? 'high' : 'normal');
    document.documentElement.setAttribute('data-grid', settings.gridOverlay ? 'true' : 'false');
    document.documentElement.classList.remove('light');
    document.documentElement.classList.add('dark');
  }, [settings]);

  const [view, setView] = useState<{ preset: CameraPreset; nonce: number }>({
    preset: 'site',
    nonce: 0,
  });

  const [showFormulasModal, setShowFormulasModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);

  // Time playback state
  const [cursorH, setCursorH] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(6);

  const setMission = useCallback((updates: Partial<MissionState>) => {
    setMissionInternal((prev) => ({ ...prev, ...updates }));
  }, []);

  const setAnalysis = useCallback((updates: Partial<AnalysisConstraints>) => {
    setAnalysisInternal((prev) => ({ ...prev, ...updates }));
  }, []);

  const setVisual = useCallback((updates: Partial<VisualSettings>) => {
    setVisualInternal((prev) => ({ ...prev, ...updates }));
  }, []);

  const setSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettingsInternal((prev) => ({ ...prev, ...updates }));
  }, []);

  const requestView = useCallback((preset: CameraPreset) => {
    setView((prev) => ({ preset, nonce: prev.nonce + 1 }));
  }, []);

  const selectSite = useCallback((id: string) => {
    const s = getSite(id);
    if (!s) return;
    setMissionInternal((prev) => ({
      ...prev,
      siteId: s.id,
      siteName: s.name,
      lat: s.lat,
      lon: s.lon,
    }));
    setView((prev) => ({ preset: 'site', nonce: prev.nonce + 1 }));
  }, []);

  const setCustomSite = useCallback((lat: number, lon: number) => {
    setMissionInternal((prev) => ({
      ...prev,
      siteId: 'custom',
      siteName: 'Custom Landing Site',
      lat,
      lon,
    }));
  }, []);

  const applyLander = useCallback((landerId: string) => {
    const l = LANDER_PROFILES.find((p) => p.id === landerId);
    if (!l) return;
    setMissionInternal((prev) => ({ ...prev, landerId }));
    setAnalysisInternal((prev) => ({ ...prev, ...l.overrides }));
  }, []);

  const startMs = useMemo(() => {
    const parsed = Date.parse(`${mission.startIso}:00Z`);
    return Number.isFinite(parsed) ? parsed : Date.parse('2027-06-15T00:00:00Z');
  }, [mission.startIso]);

  const durationH = Math.max(1, 24 * mission.durationDays);

  const deferredMission = useDeferredValue(mission);
  const deferredAnalysis = useDeferredValue(analysis);
  const deferredSettings = useDeferredValue(settings);
  const deferredStartMs = useDeferredValue(startMs);

  const computing =
    deferredMission !== mission ||
    deferredAnalysis !== analysis ||
    deferredSettings !== settings ||
    deferredStartMs !== startMs;

  // Compute 360° terrain horizon profile
  const horizon = useMemo(() => {
    if (!dem) return null;
    return computeHorizonProfile(
      dem,
      deferredMission.lat,
      deferredMission.lon,
      deferredAnalysis,
    );
  }, [dem, deferredMission.lat, deferredMission.lon, deferredAnalysis]);

  // Compute full mission simulation
  const result = useMemo(() => {
    if (!dem || !horizon) return null;
    const isDeck = deferredMission.landerId === 'clps';
    const totalDurationHours = Math.max(1, 24 * deferredMission.durationDays);
    const minStep = Math.max(
      deferredMission.stepMin,
      Math.ceil((totalDurationHours * 60) / 6000),
    );
    return simulateMission(
      dem,
      deferredMission.lat,
      deferredMission.lon,
      deferredStartMs,
      totalDurationHours,
      minStep,
      horizon,
      deferredAnalysis,
      isDeck,
      deferredSettings,
    );
  }, [dem, horizon, deferredMission, deferredStartMs, deferredAnalysis, deferredSettings]);

  // Compute terrain statistics within landing ellipse
  const terrain = useMemo(() => {
    if (!dem) return null;
    return computeTerrainStatistics(
      dem,
      deferredMission.lat,
      deferredMission.lon,
      deferredAnalysis,
    );
  }, [dem, deferredMission.lat, deferredMission.lon, deferredAnalysis]);

  // Compute composite landing safety assessment
  const safety = useMemo(() => {
    if (!terrain || !result) return null;
    return computeSafetyScore(terrain, result, deferredAnalysis, deferredSettings);
  }, [terrain, result, deferredAnalysis, deferredSettings]);

  // Precompute comprehensive comparison analytics across all landing sites
  const comparisonData: SiteComparisonData[] = useMemo(() => {
    if (!dem) return [];
    return computeAllSitesComparison(
      dem,
      deferredStartMs,
      deferredMission.durationDays,
      deferredAnalysis,
      deferredMission.landerId,
      deferredSettings,
    );
  }, [
    dem,
    deferredStartMs,
    deferredMission.durationDays,
    deferredAnalysis,
    deferredMission.landerId,
    deferredSettings,
  ]);

  const missionValue: MissionContextValue = useMemo(
    () => ({
      dem,
      demError,
      mission,
      setMission,
      selectSite,
      setCustomSite,
      applyLander,
      analysis,
      setAnalysis,
      visual,
      setVisual,
      settings,
      setSettings,
      startMs,
      durationH,
      horizon,
      result,
      terrain,
      safety,
      computing,
      view,
      requestView,
      showFormulasModal,
      setShowFormulasModal,
      showSettingsModal,
      setShowSettingsModal,
      showAboutModal,
      setShowAboutModal,
      showComparisonModal,
      setShowComparisonModal,
      comparisonData,
    }),
    [
      dem,
      demError,
      mission,
      setMission,
      selectSite,
      setCustomSite,
      applyLander,
      analysis,
      setAnalysis,
      visual,
      setVisual,
      settings,
      setSettings,
      startMs,
      durationH,
      horizon,
      result,
      terrain,
      safety,
      computing,
      view,
      requestView,
      showFormulasModal,
      setShowFormulasModal,
      showSettingsModal,
      setShowSettingsModal,
      showAboutModal,
      setShowAboutModal,
      showComparisonModal,
      setShowComparisonModal,
      comparisonData,
    ],
  );

  const timeValue: MissionTimeContextValue = useMemo(
    () => ({
      cursorH: Math.min(cursorH, durationH),
      setCursorH,
      playing,
      setPlaying,
      speed,
      setSpeed,
    }),
    [cursorH, durationH, playing, speed],
  );

  return (
    <MissionContext.Provider value={missionValue}>
      <MissionTimeContext.Provider value={timeValue}>
        {children}
      </MissionTimeContext.Provider>
    </MissionContext.Provider>
  );
}

export function useMission(): MissionContextValue {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error('useMission must be used within a MissionProvider');
  return ctx;
}

export function useMissionTime(): MissionTimeContextValue {
  const ctx = useContext(MissionTimeContext);
  if (!ctx) throw new Error('useMissionTime must be used within a MissionProvider');
  return ctx;
}

export function useCurrentSample(): MissionSample | null {
  const { result, durationH } = useMission();
  const { cursorH } = useMissionTime();

  return useMemo(() => {
    if (!result || !result.samples.length) return null;
    const clampedH = Math.max(0, Math.min(cursorH, durationH));
    const samples = result.samples;
    const frac = clampedH / Math.max(1, durationH);
    const estIdx = Math.round(frac * (samples.length - 1));
    const safeIdx = Math.max(0, Math.min(samples.length - 1, estIdx));
    return samples[safeIdx] || samples[0];
  }, [result, cursorH, durationH]);
}
