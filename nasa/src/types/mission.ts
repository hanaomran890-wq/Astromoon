export type SiteCategory = 'artemis' | 'rim' | 'psr' | 'robotic' | 'massif';

export interface LandingSite {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  category: SiteCategory;
  tags: string[];
  summary: string;
  science: string[];
  heritage?: string;
  sources: { label: string; url: string }[];
}

export interface LanderProfile {
  id: string;
  name: string;
  description: string;
  arrayType?: 'vertical_tracking' | 'deck_mounted' | 'tilted';
  overrides: {
    slopeLimitDeg: number;
    ellipseRadiusKm: number;
    mastHeightM: number;
    panelAreaM2: number;
    panelEfficiency: number;
    loadPowerW: number;
    batteryKWh: number;
  };
}

export interface MissionState {
  siteId: string;
  siteName: string;
  lat: number;
  lon: number;
  startIso: string;
  durationDays: number;
  stepMin: number;
  landerId: string;
}

export interface AnalysisConstraints {
  mastHeightM: number;
  horizonStepDeg: number;
  horizonRangeKm: number;
  panelAreaM2: number;
  panelEfficiency: number;
  loadPowerW: number;
  batteryKWh: number;
  commMaskDeg: number;
  slopeLimitDeg: number;
  ellipseRadiusKm: number;
  albedo: number;
  emissivity: number;
}

export type ShadingMode = 'sunlight' | 'illumination' | 'slope' | 'elevation' | 'hillshade';
export type CameraPreset = 'globe' | 'pole' | 'site' | 'ground';

export interface VisualSettings {
  shadingMode: ShadingMode;
  shadingRes: number;
  meshSegments: number;
  exaggeration: number;
  shadows: boolean;
  exposure: number;
  earthshine: number;
  showGraticule: boolean;
  showCandidates: boolean;
  showLabels: boolean;
  showSunRay: boolean;
  showEarthRay: boolean;
  showEllipse: boolean;
  showStars: boolean;
  showEarth: boolean;
  autoRotate: boolean;
}

export type UiDensity = 'compact' | 'standard' | 'spacious';

export interface UserSettings {
  uiDensity: UiDensity;
  gridOverlay: boolean;
  highContrast: boolean;
  tempUnit: 'K' | 'C' | 'F';
  coordFormat: 'deg' | 'dms' | 'polar';
  decimalPrecision: number;
  graphicsQuality: 'high' | 'medium' | 'low';
  antiAliasing: boolean;
  wireframe: boolean;
  highDpi: boolean;
  targetFps: number;
  audioAlerts: boolean;
  telemetryDensity: 'standard' | 'compact';
  chargeEfficiency: number;
  dodThreshold: number;
  solarModel: 'eddington' | 'geometric';
}

export interface DemData {
  size: number;
  data: Float32Array;
  min: number;
  max: number;
  pixelKm: number;
}

export interface HorizonProfile {
  stepDeg: number;
  elevations: Float32Array;
  distancesKm: Float32Array;
}

export interface EphemerisData {
  jd: number;
  sunDir: [number, number, number];
  earthPos: [number, number, number];
  subSolar: { lat: number; lon: number };
  subEarth: { lat: number; lon: number };
  earthDistanceKm: number;
  sunDistanceKm: number;
  moonIllumination: number;
  phaseAngle: number;
  colongitude: number;
}

export interface MissionSample {
  t: number;
  hours: number;
  sunEl: number;
  sunAz: number;
  sunHorizon: number;
  sunFraction: number;
  earthEl: number;
  earthAz: number;
  earthHorizon: number;
  earthVisible: boolean;
  earthClearance: number;
  tempK: number;
  powerW: number;
  batteryKWh: number;
  lightTimeS: number;
}

export interface MissionEvent {
  t: number;
  type: 'sunrise' | 'sunset' | 'earthrise' | 'earthset';
  label: string;
}

export interface MissionResult {
  samples: MissionSample[];
  events: MissionEvent[];
  illuminationPct: number;
  sunlitDays: number;
  totalDays: number;
  longestDarkH: number;
  longestLightH: number;
  meanSunEl: number;
  maxSunEl: number;
  minSunEl: number;
  earthVisiblePct: number;
  longestBlackoutH: number;
  minEarthEl: number;
  maxEarthEl: number;
  meanLightTimeS: number;
  energyKWh: number;
  avgPowerW: number;
  peakPowerW: number;
  minBatteryKWh: number;
  batteryDepleted: boolean;
  dodExceeded?: boolean;
  tempMinK: number;
  tempMaxK: number;
  subSolarLatRange: [number, number];
  startPhase: number;
}

export interface SlopeBin {
  bin: string;
  pct: number;
  safe: boolean;
}

export interface TerrainStatistics {
  elevationM: number;
  slopeDeg: number;
  meanSlopeDeg: number;
  maxSlopeDeg: number;
  p90SlopeDeg: number;
  safeAreaPct: number;
  reliefM: number;
  roughnessM: number;
  sampleCount: number;
  slopeHistogram: SlopeBin[];
}

export interface SafetyComponent {
  key: string;
  label: string;
  score: number;
  weight: number;
  detail: string;
  formulaNote?: string;
}

export interface SafetyScore {
  score: number;
  verdict: 'SAFE' | 'CAUTION' | 'HAZARDOUS' | 'INSUFFICIENT_DATA';
  components: SafetyComponent[];
  terrainVerdict: string;
}

export interface DataSourceItem {
  title: string;
  org: string;
  detail: string;
  url: string;
}
