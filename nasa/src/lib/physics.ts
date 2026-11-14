import {
  D2R,
  R2D,
  MOON_RADIUS_KM,
  EARTH_RADIUS_KM,
  SPEED_OF_LIGHT_KMS,
  SOLAR_CONSTANT,
  SUN_ANGULAR_RADIUS_DEG,
  STEFAN_BOLTZMANN,
  GEOTHERMAL_FLUX,
  LUNAR_AU_KM,
  DEM_MAX_RADIUS_KM,
} from './constants.ts';
import {
  DemData,
  AnalysisConstraints,
  UserSettings,
  HorizonProfile,
  MissionSample,
  MissionEvent,
  MissionResult,
  TerrainStatistics,
  SafetyScore,
  SafetyComponent,
} from '../types/mission.ts';
import {
  latLonToPolar,
  polarToPixel,
  sampleDem,
  heightAt,
  slopeAtPixel,
  surfaceGradientsAtPixel,
  isCoordinateInCoverage,
  isPolarInCoverage,
  localFrame,
  dot,
} from './dem.ts';
import { getEphemeris } from './ephemeris.ts';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Normalizes utility score from [worst, best] into [0, 100].
 */
export function scoreUtility(val: number, best: number, worst: number): number {
  return Math.round(100 * clamp((worst - val) / (worst - best), 0, 1));
}

/**
 * Computes elevation and azimuth of a 3D target vector in the observer's local topocentric frame.
 */
export function vectorToAzEl(
  vec: [number, number, number],
  frame: { up: [number, number, number]; east: [number, number, number]; north: [number, number, number] },
): { el: number; az: number } {
  const dist = Math.hypot(vec[0], vec[1], vec[2]);
  const el = Math.asin(clamp(dot(vec, frame.up) / (dist || 1), -1, 1)) * R2D;
  let az = Math.atan2(dot(vec, frame.east), dot(vec, frame.north)) * R2D;
  if (az < 0) az += 360;
  return { el, az };
}

/**
 * Computes local horizon elevation profile across 360° azimuth.
 * Uses exact spherical geodesic geometry for planetary curvature drop.
 * Formula:
 * tan(alpha_el) = [ (R_M + h_tgt)*cos(d / R_M) - (R_M + h_obs) ] / [ (R_M + h_tgt)*sin(d / R_M) ]
 * Reference: Mazarico et al. (NASA GSFC LOLA Science Team), NASA NTRS 20120010094.
 */
export function computeHorizonProfile(
  dem: DemData,
  lat: number,
  lon: number,
  constraints: AnalysisConstraints,
): HorizonProfile {
  const steps = Math.round(360 / constraints.horizonStepDeg);
  const elevations = new Float32Array(steps);
  const distancesKm = new Float32Array(steps);
  const { x: originX, y: originY } = latLonToPolar(lat, lon);
  const rawHeight = heightAt(dem, lat, lon);
  const obsElevationM = Number.isFinite(rawHeight) ? rawHeight : 0;
  const obsHeightM = obsElevationM + constraints.mastHeightM;
  const radLon = lon * D2R;

  // Topocentric North and East direction vectors in polar stereographic plane
  const projNorth: [number, number] = [Math.sin(radLon), Math.cos(radLon)];
  const projEast: [number, number] = [Math.cos(radLon), -Math.sin(radLon)];
  const pixelKm = dem.pixelKm;
  const R_moon_m = MOON_RADIUS_KM * 1000;
  const maxRadiusSq = DEM_MAX_RADIUS_KM * DEM_MAX_RADIUS_KM;

  for (let s = 0; s < steps; s++) {
    const azimuthRad = s * constraints.horizonStepDeg * D2R;
    const rayDirX = projNorth[0] * Math.cos(azimuthRad) + projEast[0] * Math.sin(azimuthRad);
    const rayDirY = projNorth[1] * Math.cos(azimuthRad) + projEast[1] * Math.sin(azimuthRad);
    let maxEl = -90;
    let horizonDistKm = 0;
    let distKm = 0.5 * pixelKm;

    while (distKm < constraints.horizonRangeKm) {
      const curX = originX + rayDirX * distKm;
      const curY = originY + rayDirY * distKm;
      if (curX * curX + curY * curY > maxRadiusSq) break;

      const { s: px, l: py } = polarToPixel(curX, curY, dem.size);
      const tgtElevationM = sampleDem(dem.data, dem.size, px, py, true);
      if (!Number.isFinite(tgtElevationM)) break;

      // Spherical geodesic arc angle subtended by distance on lunar surface
      const thetaArc = (distKm * 1000) / R_moon_m;
      const R_tgt = R_moon_m + tgtElevationM;
      const R_obs = R_moon_m + obsHeightM;

      // Exact trigonometric elevation angle relative to local tangent plane
      const num = R_tgt * Math.cos(thetaArc) - R_obs;
      const den = R_tgt * Math.sin(thetaArc);
      const elDeg = Math.atan2(num, den) * R2D;

      if (elDeg > maxEl) {
        maxEl = elDeg;
        horizonDistKm = distKm;
      }

      // Adaptive step size: fine resolution near observer, coarser further out
      distKm += Math.max(0.5 * pixelKm, 0.02 * distKm);
    }
    elevations[s] = maxEl;
    distancesKm[s] = horizonDistKm;
  }

  return {
    stepDeg: constraints.horizonStepDeg,
    elevations,
    distancesKm,
  };
}

/**
 * Evaluates horizon elevation at an arbitrary azimuth using linear interpolation.
 */
export function sampleHorizon(horizon: HorizonProfile, azimuthDeg: number): number {
  const count = horizon.elevations.length;
  const normAz = (((azimuthDeg % 360) + 360) % 360) / horizon.stepDeg;
  const idx = Math.floor(normAz) % count;
  const frac = normAz - Math.floor(normAz);
  const nextIdx = (idx + 1) % count;
  return horizon.elevations[idx] * (1 - frac) + horizon.elevations[nextIdx] * frac;
}

/**
 * Computes partial solar disk illumination fraction (direct solar flux fraction received).
 * Respects the user's solarModel setting:
 * - 'geometric': Pure geometric circular segment area fraction:
 *     f_geom(u) = 1 - (arccos(u) - u * sqrt(1 - u^2)) / pi
 *     where u = (sunEl - horizonEl) / SUN_ANGULAR_RADIUS_DEG in [-1, +1].
 * - 'eddington': Eddington-Milne limb-darkening model.
 *     Assumes standard solar photospheric linear limb-darkening coefficient u_L = 0.60
 *     in the visible band (I(mu)/I_0 = 1 - u_L*(1 - mu), where mu = cos(theta)).
 *     Evaluates the normalized circular chord integral of direct intensity across the occulting horizon.
 *     Due to circular disk symmetry about the center, f_eddington(0) = 0.50000 exactly,
 *     and satisfies physical complementary symmetry f(u) + f(-u) = 1.00000.
 *     The higher central surface brightness relative to the limb means that when >50% of the
 *     disk is visible (u > 0), the flux fraction exceeds the area fraction; when <50% is visible
 *     (u < 0), the flux fraction is less than the area fraction.
 *     Formulation: f_eddington(u) = clamp(f_geom(u) + 0.0524 * u * (1 - u^2), 0, 1),
 *     which matches numerical integration of the 2D chord integral to within < 0.003 across [-1, +1].
 *
 * Assumptions & Limitations:
 * 1. Assumes a straight knife-edge local horizon across the solar angular semi-diameter (~0.267°).
 * 2. Employs a monochromatic visible-band limb-darkening coefficient (u_L = 0.60); does not
 *    account for wavelength dependence across the full solar spectrum.
 * 3. Assumes an airless, unscattered line of sight (no atmospheric refraction or diffusion).
 */
export function computeSolarFraction(
  sunEl: number,
  horizonEl: number,
  solarModel: 'eddington' | 'geometric' = 'eddington',
): number {
  const u = (sunEl - horizonEl) / SUN_ANGULAR_RADIUS_DEG;
  if (u >= 1) return 1.0;
  if (u <= -1) return 0.0;

  // Exact geometric circular segment area fraction
  const geometricFrac = 1 - (Math.acos(u) - u * Math.sqrt(1 - u * u)) / Math.PI;

  if (solarModel === 'geometric') {
    return clamp(geometricFrac, 0, 1);
  }

  // Linear Eddington limb darkening model (u_L = 0.60, symmetric about u = 0):
  // Satisfies f(0) = 0.5, f(-u) = 1 - f(u), f(1) = 1.0, f(-1) = 0.0
  const eddingtonFrac = geometricFrac + 0.0524 * u * (1 - u * u);
  return clamp(eddingtonFrac, 0, 1);
}

/**
 * Evaluates Direct-To-Earth (DTE) line-of-sight clearance.
 * Checks whether the Earth center boresight and Earth disk limbs clear the local terrain horizon.
 */
export function evaluateEarthVisibility(
  earthEl: number,
  horizonEl: number,
  earthDistKm: number,
  commMaskDeg: number,
): {
  isVisible: boolean;
  clearanceDeg: number;
  isFullDiskClear: boolean;
  isPartialDiskVisible: boolean;
  earthAngularRadiusDeg: number;
} {
  // Angular semi-diameter of Earth seen from lunar distance (~0.95° - 1.05°)
  const earthAngularRadiusDeg = Math.asin(clamp(EARTH_RADIUS_KM / (earthDistKm || 1), 0, 1)) * R2D;

  // Margin above required terrain + mask angle
  const clearanceDeg = earthEl - (horizonEl + commMaskDeg);

  // Operational link closure requires the boresight center to clear terrain + mask
  const isVisible = earthEl > horizonEl + commMaskDeg;

  // Full Earth disk visible (all DSN ground stations unobstructed as Earth rotates)
  const isFullDiskClear = earthEl - earthAngularRadiusDeg > horizonEl + commMaskDeg;

  // Any portion of Earth disk visible
  const isPartialDiskVisible = earthEl + earthAngularRadiusDeg > horizonEl + commMaskDeg;

  return {
    isVisible,
    clearanceDeg,
    isFullDiskClear,
    isPartialDiskVisible,
    earthAngularRadiusDeg,
  };
}

/**
 * Computes instantaneous 1D steady-state radiative equilibrium surface temperature
 * using Stefan-Boltzmann radiative balance.
 *
 * Thermal Formulation:
 * - Sunlit terrain:
 *     T_eq = [ ((1 - A) * Q_sun * cos(theta_i) + Q_geo) / (epsilon * sigma) ]^(1/4)
 *     where cos(theta_i) = max(0.001, normal · sun_direction).
 * - Permanently shadowed regions & polar night:
 *     T_min = [ (Q_geo + Q_diffuse) / (epsilon * sigma) ]^(1/4)
 *   where Q_geo = 0.018 W/m² is internal geothermal flux (Apollo 15/17 heat flow probes) and
 *   Q_diffuse = 0.15 W/m² parameterizes secondary infrared re-radiation from surrounding sunlit
 *   crater rims, yielding a ~42 K baseline consistent with LRO Diviner cold-trap measurements
 *   and the NASA Lunar Thermal Analysis Guidebook (L-TAG, NTRS 20220013412).
 */
export function computeSurfaceTemperature(
  solarFluxW: number,
  sunFraction: number,
  sunEl: number,
  sunAz: number,
  surfaceGradients: { dzdx: number; dzdy: number; valid: boolean },
  albedo: number,
  emissivity: number,
): number {
  if (sunFraction > 0.001 && sunEl > -SUN_ANGULAR_RADIUS_DEG) {
    // Topocentric solar unit vector (East, North, Up)
    const elRad = Math.max(0, sunEl) * D2R;
    const azRad = sunAz * D2R;
    const sunEast = Math.cos(elRad) * Math.sin(azRad);
    const sunNorth = Math.cos(elRad) * Math.cos(azRad);
    const sunUp = Math.sin(elRad);

    // 3D surface normal vector in topocentric frame
    // x = East, y = North, z = Up
    const p = surfaceGradients.valid ? surfaceGradients.dzdx : 0;
    const q = surfaceGradients.valid ? surfaceGradients.dzdy : 0;
    const normLen = Math.hypot(-p, -q, 1);
    const normEast = -p / normLen;
    const normNorth = -q / normLen;
    const normUp = 1 / normLen;

    // Dot product between surface normal and sun vector
    const cosIncidence = Math.max(0.001, normEast * sunEast + normNorth * sunNorth + normUp * sunUp);

    const absorbedSolar = (1 - albedo) * solarFluxW * sunFraction * cosIncidence;
    const totalInput = absorbedSolar + GEOTHERMAL_FLUX;
    const tEquilibrium = Math.pow(totalInput / (emissivity * STEFAN_BOLTZMANN), 0.25);
    return Math.max(40.0, tEquilibrium);
  }

  // Cryogenic equilibrium in polar night / permanent shadow:
  // Combines internal lunar geothermal heat flow with parameterized diffuse IR re-radiation
  // from elevated illuminated crater rims and terrain within line of sight.
  const Q_diffuse = 0.15; // W/m² secondary diffuse infrared radiation baseline
  return Math.pow((GEOTHERMAL_FLUX + Q_diffuse) / (emissivity * STEFAN_BOLTZMANN), 0.25);
}

/**
 * Computes electrical power output of solar array based on mounting geometry:
 * - Vertical tracking arrays (rovers, towers, HLS masts): tracks Sun azimuthally, normal tilts horizontal:
 *   receives solarFluxW * cos(effectiveEl) * arrayAreaM2 * efficiency.
 * - Deck-mounted horizontal arrays (CLPS): normal points zenith:
 *   receives solarFluxW * sin(effectiveEl) * arrayAreaM2 * efficiency.
 *
 * solarFluxW already includes partial solar disk occultation scaling (sunFraction).
 * Under grazing polar angles where the solar center lies at or slightly below horizontal
 * while the upper limb clears local terrain (sunFraction > 0), effective incidence elevation
 * is evaluated from the visible disk segment centroid above the horizon.
 */
export function computeSolarPower(
  solarFluxW: number,
  sunEl: number,
  arrayAreaM2: number,
  efficiency: number,
  isDeckMounted = false,
): number {
  if (solarFluxW <= 0 || arrayAreaM2 <= 0 || efficiency <= 0) return 0;

  // Effective elevation angle of incoming direct rays relative to the horizontal plane:
  // When sunEl > 0, rays arrive from approximately sunEl.
  // When sunEl <= 0 but solarFluxW > 0, rays arrive from the visible portion of the solar disk above the horizon.
  const effectiveEl =
    sunEl > 0
      ? sunEl
      : Math.max(0, (sunEl + SUN_ANGULAR_RADIUS_DEG) / 2);

  const incidenceFactor = isDeckMounted
    ? Math.max(0, Math.sin(effectiveEl * D2R)) // Horizontal deck panel normal points to zenith
    : Math.max(0, Math.cos(effectiveEl * D2R)); // Vertical tracking panel normal faces sun azimuthally

  return solarFluxW * incidenceFactor * arrayAreaM2 * efficiency;
}

/**
 * Runs full mission simulation over time steps.
 * Consistently applies user settings:
 * - solarModel ('eddington' | 'geometric')
 * - chargeEfficiency (from settings.chargeEfficiency)
 * - dodThreshold (from settings.dodThreshold)
 */
export function simulateMission(
  dem: DemData,
  lat: number,
  lon: number,
  startMs: number,
  durationHours: number,
  stepMinutes: number,
  horizon: HorizonProfile,
  constraints: AnalysisConstraints,
  isDeckMounted = false,
  settings?: UserSettings,
): MissionResult {
  const frame = localFrame(lat, lon);
  const rawHeight = heightAt(dem, lat, lon);
  const obsElevationM = Number.isFinite(rawHeight) ? rawHeight : 0;
  const obsHeightM = obsElevationM + constraints.mastHeightM;
  const obsRadiusKm = MOON_RADIUS_KM + obsHeightM / 1000;
  const obsPosKm: [number, number, number] = [
    frame.up[0] * obsRadiusKm,
    frame.up[1] * obsRadiusKm,
    frame.up[2] * obsRadiusKm,
  ];

  const totalSteps = Math.max(2, Math.ceil((durationHours * 60) / stepMinutes) + 1);
  const stepHours = stepMinutes / 60;
  const samples: MissionSample[] = [];
  const events: MissionEvent[] = [];

  let batteryKWh = constraints.batteryKWh;
  let minBatteryKWh = batteryKWh;
  let batteryDepleted = false;
  let dodExceeded = false;

  let totalSunlitHours = 0;
  let totalEarthVisibleHours = 0;
  let totalEnergyHarvestedKWh = 0;

  let darkStreakHours = 0;
  let maxDarkStreakHours = 0;
  let lightStreakHours = 0;
  let maxLightStreakHours = 0;
  let blackoutStreakHours = 0;
  let maxBlackoutStreakHours = 0;

  let sumSunEl = 0;
  let maxSunEl = -90;
  let minSunEl = 90;
  let minEarthEl = 90;
  let maxEarthEl = -90;
  let minTempK = Infinity;
  let maxTempK = -Infinity;
  let peakPowerW = 0;
  let sumLightTimeS = 0;

  let minSubSolarLat = 90;
  let maxSubSolarLat = -90;
  let initialPhase = 0;

  // Surface gradients at target point
  const { x: pxCoord, y: pyCoord } = latLonToPolar(lat, lon);
  const { s: ppx, l: ppy } = polarToPixel(pxCoord, pyCoord, dem.size);
  const gradients = surfaceGradientsAtPixel(
    dem.data,
    dem.size,
    Math.floor(ppx),
    Math.floor(ppy),
    dem.pixelKm * 1000,
  );

  // Settings consumption
  const solarModel = settings?.solarModel ?? 'eddington';
  const chargeEfficiency = (settings?.chargeEfficiency ?? 96) / 100;
  const dodLimit = (settings?.dodThreshold ?? 80) / 100;
  const minAllowedBattery = constraints.batteryKWh * (1 - dodLimit);

  for (let step = 0; step < totalSteps; step++) {
    const elapsedHours = Math.min(durationHours, step * stepHours);
    const timeMs = startMs + elapsedHours * 3600000;
    const ephem = getEphemeris(new Date(timeMs));

    if (step === 0) initialPhase = ephem.moonIllumination;
    minSubSolarLat = Math.min(minSubSolarLat, ephem.subSolar.lat);
    maxSubSolarLat = Math.max(maxSubSolarLat, ephem.subSolar.lat);

    // Sun topocentric angles
    const sunTopocentric = vectorToAzEl(ephem.sunDir, frame);
    const sunHorizonEl = sampleHorizon(horizon, sunTopocentric.az);
    const sunFraction = computeSolarFraction(sunTopocentric.el, sunHorizonEl, solarModel);

    // Earth topocentric angles
    const earthVecKm: [number, number, number] = [
      ephem.earthPos[0] - obsPosKm[0],
      ephem.earthPos[1] - obsPosKm[1],
      ephem.earthPos[2] - obsPosKm[2],
    ];
    const earthDistKm = Math.hypot(earthVecKm[0], earthVecKm[1], earthVecKm[2]);
    const earthTopocentric = vectorToAzEl(earthVecKm, frame);
    const earthHorizonEl = sampleHorizon(horizon, earthTopocentric.az);
    const { isVisible: earthVisible, clearanceDeg: earthClearance } = evaluateEarthVisibility(
      earthTopocentric.el,
      earthHorizonEl,
      earthDistKm,
      constraints.commMaskDeg,
    );

    // True solar flux at Moon distance via inverse-square law
    const solarFluxW =
      SOLAR_CONSTANT * Math.pow(LUNAR_AU_KM / ephem.sunDistanceKm, 2) * sunFraction;

    const surfaceTempK = computeSurfaceTemperature(
      SOLAR_CONSTANT * Math.pow(LUNAR_AU_KM / ephem.sunDistanceKm, 2),
      sunFraction,
      sunTopocentric.el,
      sunTopocentric.az,
      gradients,
      constraints.albedo,
      constraints.emissivity,
    );

    const powerGeneratedW = computeSolarPower(
      solarFluxW,
      sunTopocentric.el,
      constraints.panelAreaM2,
      constraints.panelEfficiency,
      isDeckMounted,
    );

    const lightTimeS = earthDistKm / SPEED_OF_LIGHT_KMS;

    // Time integration for power, battery, and events
    if (step > 0) {
      const prev = samples[step - 1];
      const dtHours = elapsedHours - prev.hours;
      totalSunlitHours += ((prev.sunFraction + sunFraction) / 2) * dtHours;

      if (prev.earthVisible && earthVisible) {
        totalEarthVisibleHours += dtHours;
      } else if (prev.earthVisible || earthVisible) {
        totalEarthVisibleHours += dtHours / 2;
      }

      const avgPowerStepW = (prev.powerW + powerGeneratedW) / 2;
      totalEnergyHarvestedKWh += (avgPowerStepW * dtHours) / 1000;

      // Net power flow to/from battery with configurable charge efficiency
      const netPowerW = avgPowerStepW - constraints.loadPowerW;
      const energyDeltaKWh =
        netPowerW >= 0
          ? (netPowerW * dtHours * chargeEfficiency) / 1000
          : (netPowerW * dtHours) / 1000;

      batteryKWh = Math.min(constraints.batteryKWh, batteryKWh + energyDeltaKWh);
      if (batteryKWh <= 0) {
        batteryKWh = 0;
        batteryDepleted = true; // True zero-energy state
      }
      if (batteryKWh < minAllowedBattery) {
        dodExceeded = true; // Permitted depth-of-discharge threshold crossed
      }
      minBatteryKWh = Math.min(minBatteryKWh, batteryKWh);

      // Illumination streak tracking
      if (sunFraction >= 0.5) {
        lightStreakHours += dtHours;
        darkStreakHours = 0;
      } else {
        darkStreakHours += dtHours;
        lightStreakHours = 0;
      }
      maxDarkStreakHours = Math.max(maxDarkStreakHours, darkStreakHours);
      maxLightStreakHours = Math.max(maxLightStreakHours, lightStreakHours);

      // Comms blackout streak tracking
      if (earthVisible) {
        blackoutStreakHours = 0;
      } else {
        blackoutStreakHours += dtHours;
      }
      maxBlackoutStreakHours = Math.max(maxBlackoutStreakHours, blackoutStreakHours);

      // Event transitions
      if (prev.sunFraction < 0.5 && sunFraction >= 0.5) {
        events.push({ t: timeMs, type: 'sunrise', label: 'Sunrise over local horizon' });
      } else if (prev.sunFraction >= 0.5 && sunFraction < 0.5) {
        events.push({ t: timeMs, type: 'sunset', label: 'Sun blocked by terrain / set' });
      }
      if (!prev.earthVisible && earthVisible) {
        events.push({ t: timeMs, type: 'earthrise', label: 'Earth in view — DTE link opens' });
      } else if (prev.earthVisible && !earthVisible) {
        events.push({ t: timeMs, type: 'earthset', label: 'Earth hidden — DTE link lost' });
      }
    }

    sumSunEl += sunTopocentric.el;
    maxSunEl = Math.max(maxSunEl, sunTopocentric.el);
    minSunEl = Math.min(minSunEl, sunTopocentric.el);
    minEarthEl = Math.min(minEarthEl, earthTopocentric.el);
    maxEarthEl = Math.max(maxEarthEl, earthTopocentric.el);
    minTempK = Math.min(minTempK, surfaceTempK);
    maxTempK = Math.max(maxTempK, surfaceTempK);
    peakPowerW = Math.max(peakPowerW, powerGeneratedW);
    sumLightTimeS += lightTimeS;

    samples.push({
      t: timeMs,
      hours: elapsedHours,
      sunEl: sunTopocentric.el,
      sunAz: sunTopocentric.az,
      sunHorizon: sunHorizonEl,
      sunFraction,
      earthEl: earthTopocentric.el,
      earthAz: earthTopocentric.az,
      earthHorizon: earthHorizonEl,
      earthVisible,
      earthClearance,
      tempK: surfaceTempK,
      powerW: powerGeneratedW,
      batteryKWh,
      lightTimeS,
    });
  }

  const safeDuration = Math.max(durationHours, 1e-6);

  return {
    samples,
    events,
    illuminationPct: (totalSunlitHours / safeDuration) * 100,
    sunlitDays: totalSunlitHours / 24,
    totalDays: durationHours / 24,
    longestDarkH: maxDarkStreakHours,
    longestLightH: maxLightStreakHours,
    meanSunEl: sumSunEl / samples.length,
    maxSunEl,
    minSunEl,
    earthVisiblePct: (totalEarthVisibleHours / safeDuration) * 100,
    longestBlackoutH: maxBlackoutStreakHours,
    minEarthEl,
    maxEarthEl,
    meanLightTimeS: sumLightTimeS / samples.length,
    energyKWh: totalEnergyHarvestedKWh,
    avgPowerW: (1000 * totalEnergyHarvestedKWh) / safeDuration,
    peakPowerW,
    minBatteryKWh,
    batteryDepleted,
    dodExceeded,
    tempMinK: minTempK,
    tempMaxK: maxTempK,
    subSolarLatRange: [minSubSolarLat, maxSubSolarLat],
    startPhase: initialPhase,
  };
}

/**
 * Computes terrain slope statistics and micro-roughness within the landing ellipse.
 * Robustly detrends regional slope to isolate true local surface roughness.
 */
export function computeTerrainStatistics(
  dem: DemData,
  lat: number,
  lon: number,
  constraints: AnalysisConstraints,
): TerrainStatistics {
  if (!isCoordinateInCoverage(lat, lon)) {
    return {
      elevationM: NaN,
      slopeDeg: NaN,
      meanSlopeDeg: NaN,
      maxSlopeDeg: NaN,
      p90SlopeDeg: NaN,
      safeAreaPct: 0,
      reliefM: 0,
      roughnessM: 0,
      sampleCount: 0,
      slopeHistogram: [],
    };
  }

  const { x: polarX, y: polarY } = latLonToPolar(lat, lon);
  if (!isPolarInCoverage(polarX, polarY)) {
    return {
      elevationM: NaN,
      slopeDeg: NaN,
      meanSlopeDeg: NaN,
      maxSlopeDeg: NaN,
      p90SlopeDeg: NaN,
      safeAreaPct: 0,
      reliefM: 0,
      roughnessM: 0,
      sampleCount: 0,
      slopeHistogram: [],
    };
  }

  const { s: centerPx, l: centerPy } = polarToPixel(polarX, polarY, dem.size);
  const centerIntX = Math.floor(centerPx);
  const centerIntY = Math.floor(centerPy);
  const pixelMeters = dem.pixelKm * 1000;
  const radiusPixels = Math.max(1.5, constraints.ellipseRadiusKm / dem.pixelKm);
  const rCeil = Math.ceil(radiusPixels);

  const slopes: number[] = [];
  const elevations: number[] = [];
  const coords: { dx: number; dy: number; z: number }[] = [];

  for (let dy = -rCeil; dy <= rCeil; dy++) {
    for (let dx = -rCeil; dx <= rCeil; dx++) {
      if (dx * dx + dy * dy > radiusPixels * radiusPixels) continue;
      const px = centerIntX + dx;
      const py = centerIntY + dy;
      if (px < 1 || py < 1 || px >= dem.size - 1 || py >= dem.size - 1) continue;

      const slope = slopeAtPixel(dem.data, dem.size, px, py, pixelMeters);
      const elev = dem.data[py * dem.size + px];
      if (Number.isFinite(slope) && Number.isFinite(elev)) {
        slopes.push(slope);
        elevations.push(elev);
        coords.push({ dx: dx * pixelMeters, dy: dy * pixelMeters, z: elev });
      }
    }
  }

  if (slopes.length === 0 || elevations.length === 0) {
    return {
      elevationM: NaN,
      slopeDeg: NaN,
      meanSlopeDeg: NaN,
      maxSlopeDeg: NaN,
      p90SlopeDeg: NaN,
      safeAreaPct: NaN,
      reliefM: NaN,
      roughnessM: NaN,
      sampleCount: 0,
      slopeHistogram: [],
    };
  }

  const sampleCount = slopes.length;
  const sortedSlopes = [...slopes].sort((a, b) => a - b);
  const meanElevation = elevations.reduce((a, b) => a + b, 0) / sampleCount;

  // Full 2x2 OLS planar slope detrending to isolate true RMS surface roughness
  let sumX2 = 0, sumY2 = 0, sumXY = 0, sumXZ = 0, sumYZ = 0;
  for (const c of coords) {
    const dz = c.z - meanElevation;
    sumX2 += c.dx * c.dx;
    sumY2 += c.dy * c.dy;
    sumXY += c.dx * c.dy;
    sumXZ += c.dx * dz;
    sumYZ += c.dy * dz;
  }
  const det = sumX2 * sumY2 - sumXY * sumXY;
  let planeA = 0;
  let planeB = 0;
  if (Math.abs(det) > 1e-9) {
    planeA = (sumY2 * sumXZ - sumXY * sumYZ) / det;
    planeB = (sumX2 * sumYZ - sumXY * sumXZ) / det;
  } else {
    planeA = sumX2 > 0 ? sumXZ / sumX2 : 0;
    planeB = sumY2 > 0 ? sumYZ / sumY2 : 0;
  }

  const detrendedVarSum = coords.reduce((sum, c) => {
    const planeZ = meanElevation + planeA * c.dx + planeB * c.dy;
    return sum + Math.pow(c.z - planeZ, 2);
  }, 0);
  const roughnessRMS = Math.sqrt(detrendedVarSum / sampleCount);

  const reliefM = Math.max(...elevations) - Math.min(...elevations);

  const bins = [0, 3, 6, 9, 12, 15, 20, 25, 30, 90];
  const slopeHistogram = bins.slice(0, -1).map((lower, i) => {
    const upper = bins[i + 1];
    const inBin = slopes.filter((s) => s >= lower && s < upper).length;
    return {
      bin: upper === 90 ? `${lower}°+` : `${lower}–${upper}°`,
      pct: (inBin / sampleCount) * 100,
      safe: upper <= constraints.slopeLimitDeg,
    };
  });

  const safeCount = slopes.filter((s) => s <= constraints.slopeLimitDeg).length;

  return {
    elevationM: heightAt(dem, lat, lon),
    slopeDeg: slopeAtPixel(dem.data, dem.size, centerIntX, centerIntY, pixelMeters),
    meanSlopeDeg: slopes.reduce((a, b) => a + b, 0) / sampleCount,
    maxSlopeDeg: sortedSlopes[sortedSlopes.length - 1],
    p90SlopeDeg: sortedSlopes[Math.min(sortedSlopes.length - 1, Math.floor(0.9 * (sortedSlopes.length - 1)))],
    safeAreaPct: (safeCount / sampleCount) * 100,
    reliefM,
    roughnessM: roughnessRMS,
    sampleCount,
    slopeHistogram,
  };
}

/**
 * Evaluates the AstroMoon composite landing safety score using multi-attribute utility theory.
 *
 * Decision Scoring Architecture:
 * - Combines weighted metrics for touchdown slope (25%), safe area (15%), roughness (10%),
 *   solar illumination (20%), Earth communication visibility (15%), and darkness endurance (15%)
 *   for comparative site evaluation.
 * - Physical thresholds reference NASA Apollo Lunar Module stability studies (NASA NTRS 19730010151),
 *   Artemis Human Landing System (HLS) guidelines, and NASA / CSA lunar surface power standards.
 * - Hard constraint gates ensure sites violating slope tipping limits, experiencing zero-energy
 *   battery depletion, or suffering total solar blackout cannot receive a SAFE classification.
 */
export function computeSafetyScore(
  terrain: TerrainStatistics,
  result: MissionResult,
  constraints: AnalysisConstraints,
  settings?: UserSettings,
): SafetyScore {
  // 1. INPUT VALIDATION:
  // Validate that essential terrain, ephemeris mission results, and engineering constraints are finite numbers.
  // Missing DEM elevations, NaN slopes, or invalid mission simulations must NEVER produce a SAFE verdict.
  if (
    !terrain ||
    !result ||
    !constraints ||
    !Number.isFinite(terrain.slopeDeg) ||
    !Number.isFinite(terrain.safeAreaPct) ||
    !Number.isFinite(terrain.roughnessM) ||
    !Number.isFinite(terrain.elevationM) ||
    terrain.sampleCount <= 0 ||
    !Number.isFinite(result.illuminationPct) ||
    result.illuminationPct < 0 ||
    result.illuminationPct > 100 ||
    !Number.isFinite(result.longestDarkH) ||
    result.longestDarkH < 0 ||
    !Number.isFinite(result.earthVisiblePct) ||
    result.earthVisiblePct < 0 ||
    result.earthVisiblePct > 100 ||
    !Number.isFinite(result.minBatteryKWh) ||
    !Number.isFinite(constraints.slopeLimitDeg) ||
    constraints.slopeLimitDeg <= 0 ||
    !Number.isFinite(constraints.batteryKWh) ||
    constraints.batteryKWh <= 0 ||
    !Number.isFinite(constraints.loadPowerW) ||
    constraints.loadPowerW <= 0
  ) {
    return {
      score: 0,
      verdict: 'INSUFFICIENT_DATA',
      components: [
        {
          key: 'slope',
          label: 'Touchdown slope',
          score: 0,
          weight: 0.25,
          detail: Number.isFinite(terrain?.slopeDeg) ? `${terrain.slopeDeg.toFixed(1)}°` : 'Data unavailable',
          formulaNote: 'Evaluated at landing point via Horn gradient kernel on LOLA DEM.',
        },
        {
          key: 'area',
          label: 'Safe area in landing ellipse',
          score: 0,
          weight: 0.15,
          detail: Number.isFinite(terrain?.safeAreaPct) ? `${terrain.safeAreaPct.toFixed(0)}%` : 'Data unavailable',
          formulaNote: 'Fraction of DEM pixels within landing ellipse meeting slope limits.',
        },
        {
          key: 'roughness',
          label: 'Relief & roughness',
          score: 0,
          weight: 0.1,
          detail: Number.isFinite(terrain?.roughnessM) ? `${terrain.roughnessM.toFixed(0)} m` : 'Data unavailable',
          formulaNote: 'Detrended planar residual elevation variance across landing ellipse.',
        },
        {
          key: 'illumination',
          label: 'Solar illumination',
          score: 0,
          weight: 0.2,
          detail: Number.isFinite(result?.illuminationPct) ? `${result.illuminationPct.toFixed(1)}%` : 'Data unavailable',
          formulaNote: 'Spherical geodesic ray-tracing of solar disk over 360° horizon silhouette.',
        },
        {
          key: 'comm',
          label: 'Direct-to-Earth visibility',
          score: 0,
          weight: 0.15,
          detail: Number.isFinite(result?.earthVisiblePct) ? `${result.earthVisiblePct.toFixed(1)}%` : 'Data unavailable',
          formulaNote: 'Boresight line-of-sight elevation of Earth above terrain with communication mask.',
        },
        {
          key: 'night',
          label: 'Survivable darkness',
          score: 0,
          weight: 0.15,
          detail: Number.isFinite(result?.longestDarkH) ? `${result.longestDarkH.toFixed(1)} h` : 'Data unavailable',
          formulaNote: 'Darkness duration benchmarked against usable battery capacity.',
        },
      ],
      terrainVerdict: 'Insufficient, missing, or invalid terrain/mission data to evaluate landing safety.',
    };
  }

  // 2. COMPONENT UTILITY SCORING:
  // Configurable usable Depth of Discharge (DoD) from settings
  const dodLimit = (settings?.dodThreshold ?? 80) / 100;
  const usableBatteryKWh = constraints.batteryKWh * dodLimit;
  const loadKW = Math.max(0.05, constraints.loadPowerW / 1000);
  const enduranceHours = usableBatteryKWh / loadKW;

  // Calibrate darkness score against actual battery endurance
  const darknessScore =
    result.longestDarkH <= 0.1
      ? 100
      : result.longestDarkH <= enduranceHours
        ? Math.round(100 * (1 - 0.3 * (result.longestDarkH / enduranceHours)))
        : Math.round(Math.max(0, 70 * (1 - (result.longestDarkH - enduranceHours) / (enduranceHours * 2))));

  const touchdownSlopeScore = scoreUtility(
    terrain.slopeDeg,
    0.5 * constraints.slopeLimitDeg,
    2.2 * constraints.slopeLimitDeg,
  );

  const components: SafetyComponent[] = [
    {
      key: 'slope',
      label: 'Touchdown slope',
      score: touchdownSlopeScore,
      weight: 0.25,
      detail: `${terrain.slopeDeg.toFixed(1)}° at target vs ${constraints.slopeLimitDeg}° lander limit`,
      formulaNote: 'Evaluated at landing point via 3×3 Horn gradient kernel on LOLA 297 m/px DEM.',
    },
    {
      key: 'area',
      label: 'Safe area in landing ellipse',
      score: Math.round(terrain.safeAreaPct),
      weight: 0.15,
      detail: `${terrain.safeAreaPct.toFixed(0)}% of terrain within ${constraints.ellipseRadiusKm} km is ≤ ${constraints.slopeLimitDeg}°`,
      formulaNote: 'Fraction of DEM pixels within landing ellipse meeting slope limits.',
    },
    {
      key: 'roughness',
      label: 'Relief & roughness',
      score: scoreUtility(terrain.roughnessM, 10, 150),
      weight: 0.1,
      detail: `RMS roughness ${terrain.roughnessM.toFixed(0)} m, relief ${terrain.reliefM.toFixed(0)} m`,
      formulaNote: 'Detrended planar residual elevation variance across landing ellipse.',
    },
    {
      key: 'illumination',
      label: 'Solar illumination',
      score: Math.round(100 * clamp(result.illuminationPct / 80, 0, 1)),
      weight: 0.2,
      detail: `${result.illuminationPct.toFixed(1)}% of mission in sunlight`,
      formulaNote: 'Spherical geodesic ray-tracing of solar disk over 360° horizon silhouette.',
    },
    {
      key: 'comm',
      label: 'Direct-to-Earth visibility',
      score: Math.round(100 * clamp(result.earthVisiblePct / 85, 0, 1)),
      weight: 0.15,
      detail: `${result.earthVisiblePct.toFixed(1)}% of mission with Earth in view`,
      formulaNote: 'Boresight line-of-sight elevation of Earth above terrain with communication mask.',
    },
    {
      key: 'night',
      label: 'Survivable darkness',
      score: darknessScore,
      weight: 0.15,
      detail: `Longest continuous darkness ${result.longestDarkH.toFixed(1)} h (battery limit: ${enduranceHours.toFixed(1)} h)`,
      formulaNote: `Darkness duration benchmarked against usable battery capacity (${Math.round(dodLimit * 100)}% DoD).`,
    },
  ];

  const rawScore = Math.round(
    components.reduce((sum, item) => sum + item.score * item.weight, 0),
  );

  // 3. MANDATORY CONSTRAINT CHECKS (Engineering Hard Limits)
  const failsTouchdownSlope = terrain.slopeDeg > constraints.slopeLimitDeg;
  const severelyFailsSlope = terrain.slopeDeg > 1.5 * constraints.slopeLimitDeg;

  // Separate true zero-energy battery exhaustion from crossing operational DoD threshold
  const batteryZeroEnergy = result.batteryDepleted || result.minBatteryKWh <= 0;
  const failsBatteryDoD =
    result.dodExceeded ||
    result.minBatteryKWh < constraints.batteryKWh * (1 - dodLimit);
  const excessiveDarkness = result.longestDarkH > enduranceHours;
  const severelyFailsDarkness = result.longestDarkH > enduranceHours * 1.5;
  const zeroIllumination = result.illuminationPct === 0 && constraints.loadPowerW > 0;

  // Capping score if mandatory constraints fail:
  // Catastrophic failures (severe slope, actual zero energy battery depletion, zero sunlight): cap at 45 (HAZARDOUS)
  // Operational constraint violations (slope exceeds limit, DoD threshold crossed, darkness > endurance): cap at 65 (CAUTION)
  let cappedScore = rawScore;
  if (severelyFailsSlope || batteryZeroEnergy || zeroIllumination || severelyFailsDarkness) {
    cappedScore = Math.min(rawScore, 45);
  } else if (failsTouchdownSlope || failsBatteryDoD || excessiveDarkness) {
    cappedScore = Math.min(rawScore, 65);
  }

  // 4. VERDICT DETERMINATION:
  // Under NO circumstances can a site with NaN, failing slope limits, or zero energy receive SAFE!
  let verdict: 'SAFE' | 'CAUTION' | 'HAZARDOUS' | 'INSUFFICIENT_DATA';
  if (!Number.isFinite(cappedScore) || Number.isNaN(cappedScore)) {
    verdict = 'INSUFFICIENT_DATA';
    cappedScore = 0;
  } else if (severelyFailsSlope || batteryZeroEnergy || zeroIllumination || severelyFailsDarkness || cappedScore < 48) {
    verdict = 'HAZARDOUS';
  } else if (failsTouchdownSlope || failsBatteryDoD || excessiveDarkness || cappedScore < 72) {
    verdict = 'CAUTION';
  } else {
    verdict = 'SAFE';
  }

  const terrainVerdict =
    terrain.slopeDeg <= constraints.slopeLimitDeg && terrain.safeAreaPct >= 60
      ? 'Terrain is within lander slope limits.'
      : terrain.slopeDeg <= 1.5 * constraints.slopeLimitDeg
        ? 'Terrain is marginal — precision landing and hazard avoidance required.'
        : 'Terrain is too steep for a safe touchdown.';

  return {
    score: cappedScore,
    verdict,
    components,
    terrainVerdict,
  };
}
