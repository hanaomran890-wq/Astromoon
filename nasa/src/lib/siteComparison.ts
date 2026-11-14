import {
  LandingSite,
  DemData,
  AnalysisConstraints,
  UserSettings,
} from '../types/mission.ts';
import { LANDING_SITES, MOON_RADIUS_KM, D2R } from './constants.ts';
import {
  computeHorizonProfile,
  simulateMission,
  computeTerrainStatistics,
  computeSafetyScore,
} from './physics.ts';

export interface SiteComparisonData {
  site: LandingSite;
  elevationM: number;
  meanSlopeDeg: number;
  maxSlopeDeg: number;
  p90SlopeDeg: number;
  reliefM: number;
  roughnessM: number;
  safeAreaPct: number;
  illuminationPct: number;
  sunlitHours: number;
  longestDarkH: number;
  longestLightH: number;
  earthVisiblePct: number;
  longestBlackoutH: number;
  energyKWh: number;
  peakPowerW: number;
  avgPowerW: number;
  minBatteryKWh: number;
  batteryDepleted: boolean;
  dodExceeded?: boolean;
  tempMinK: number;
  tempMaxK: number;
  meanSunEl: number;
  maxSunEl: number;
  distanceToPoleKm: number;
  safetyScore: number;
  verdict: 'SAFE' | 'CAUTION' | 'HAZARDOUS' | 'INSUFFICIENT_DATA';
  radarScores: {
    illumination: number;
    earthComms: number;
    slopeSafety: number;
    powerHarvest: number;
    thermalMildness: number;
    elevationAdvantage: number;
  };
}

export function calculateDistanceToSouthPoleKm(lat: number): number {
  const colatitudeRad = (90 + lat) * D2R;
  return colatitudeRad * MOON_RADIUS_KM;
}

/**
 * Computes comparative metrics across all defined landing sites using the loaded LOLA DEM and ephemeris.
 * Does NOT substitute fabricated numbers when DEM is unavailable.
 */
export function computeAllSitesComparison(
  dem: DemData | null,
  startMs: number,
  durationDays: number,
  constraints: AnalysisConstraints,
  landerId: string,
  settings?: UserSettings,
): SiteComparisonData[] {
  if (!dem) {
    // Return empty array when DEM data is not yet loaded, eliminating fabricated fallback values
    return [];
  }

  const isDeck = landerId === 'clps';
  const durationHours = Math.max(1, 24 * durationDays);
  // Efficient 60-min step for comparison calculation across all sites
  const stepMin = Math.max(60, Math.ceil((durationHours * 60) / 200));

  return LANDING_SITES.map((site) => {
    const distToPole = calculateDistanceToSouthPoleKm(site.lat);

    // 1. Calculate terrain statistics using real LOLA DEM
    const terrainStats = computeTerrainStatistics(
      dem,
      site.lat,
      site.lon,
      constraints,
    );

    // 2. Calculate local horizon profile
    const horizon = computeHorizonProfile(dem, site.lat, site.lon, constraints);

    // 3. Simulate mission orbital mechanics & solar angles
    const missionRes = simulateMission(
      dem,
      site.lat,
      site.lon,
      startMs,
      durationHours,
      stepMin,
      horizon,
      constraints,
      isDeck,
      settings,
    );

    // 4. Calculate landing safety score with mandatory constraint checks
    const safetyScore = computeSafetyScore(terrainStats, missionRes, constraints, settings);

    // 5. Calculate normalized radar scores (0 to 100) with strict finite-number validation
    const rawSlopeSafety = (1 - terrainStats.meanSlopeDeg / constraints.slopeLimitDeg) * 100;
    const slopeSafety = Number.isFinite(rawSlopeSafety)
      ? Math.max(0, Math.min(100, Math.round(rawSlopeSafety)))
      : 0;

    const rawPowerScore =
      (missionRes.energyKWh / Math.max(1, (constraints.loadPowerW * durationHours) / 1000)) * 100;
    const powerScore = Number.isFinite(rawPowerScore)
      ? Math.max(0, Math.min(100, Math.round(rawPowerScore)))
      : 0;

    const rawThermalScore = 100 - (missionRes.tempMaxK - missionRes.tempMinK) / 2.5;
    const thermalScore = Number.isFinite(rawThermalScore)
      ? Math.max(0, Math.min(100, Math.round(rawThermalScore)))
      : 0;

    const rawElevationScore = ((terrainStats.elevationM + 4500) / 10500) * 100;
    const elevationScore = Number.isFinite(rawElevationScore)
      ? Math.max(0, Math.min(100, Math.round(rawElevationScore)))
      : 0;

    return {
      site,
      elevationM: terrainStats.elevationM,
      meanSlopeDeg: terrainStats.meanSlopeDeg,
      maxSlopeDeg: terrainStats.maxSlopeDeg,
      p90SlopeDeg: terrainStats.p90SlopeDeg,
      reliefM: terrainStats.reliefM,
      roughnessM: terrainStats.roughnessM,
      safeAreaPct: terrainStats.safeAreaPct,
      illuminationPct: missionRes.illuminationPct,
      sunlitHours: (missionRes.illuminationPct / 100) * durationHours,
      longestDarkH: missionRes.longestDarkH,
      longestLightH: missionRes.longestLightH,
      earthVisiblePct: missionRes.earthVisiblePct,
      longestBlackoutH: missionRes.longestBlackoutH,
      energyKWh: missionRes.energyKWh,
      peakPowerW: missionRes.peakPowerW,
      avgPowerW: missionRes.avgPowerW,
      minBatteryKWh: missionRes.minBatteryKWh,
      batteryDepleted: missionRes.batteryDepleted,
      dodExceeded: missionRes.dodExceeded,
      tempMinK: missionRes.tempMinK,
      tempMaxK: missionRes.tempMaxK,
      meanSunEl: missionRes.meanSunEl,
      maxSunEl: missionRes.maxSunEl,
      distanceToPoleKm: distToPole,
      safetyScore: safetyScore.score,
      verdict: safetyScore.verdict,
      radarScores: {
        illumination: Math.round(missionRes.illuminationPct),
        earthComms: Math.round(missionRes.earthVisiblePct),
        slopeSafety,
        powerHarvest: Math.min(100, powerScore),
        thermalMildness: Math.max(10, Math.min(100, thermalScore)),
        elevationAdvantage: Math.max(5, Math.min(100, elevationScore)),
      },
    };
  });
}
