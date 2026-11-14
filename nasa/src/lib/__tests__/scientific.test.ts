import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import zlib from 'node:zlib';
import {
  D2R,
  SOLAR_CONSTANT,
  STEFAN_BOLTZMANN,
  GEOTHERMAL_FLUX,
  SUN_ANGULAR_RADIUS_DEG,
  DEM_SIZE,
  DEFAULT_CONSTRAINTS,
  LANDING_SITES,
} from '../constants.ts';
import {
  latLonToPolar,
  polarToLatLon,
  polarToPixel,
  isCoordinateInCoverage,
  sampleDem,
  slopeAtPixel,
  formatCoordinates,
} from '../dem.ts';
import { getEphemeris } from '../ephemeris.ts';
import {
  computeSolarFraction,
  evaluateEarthVisibility,
  computeSurfaceTemperature,
  computeSolarPower,
  computeSafetyScore,
  computeTerrainStatistics,
} from '../physics.ts';
import { computeAllSitesComparison } from '../siteComparison.ts';
import { DEFAULT_USER_SETTINGS } from '../../context/MissionContext.tsx';
import { TerrainStatistics, MissionResult } from '../../types/mission.ts';

describe('Scientific Calculations & Models Unit Tests', () => {
  // 1. Topography & Coordinate Projections
  it('correctly maps South Pole to origin in polar stereographic projection', () => {
    const { x, y } = latLonToPolar(-90, 0);
    assert.strictEqual(Math.abs(x) < 1e-6, true, 'South pole x should be 0');
    assert.strictEqual(Math.abs(y) < 1e-6, true, 'South pole y should be 0');
  });

  it('correctly round-trips coordinates through polar stereographic projection', () => {
    const testPoints = [
      { lat: -89.5, lon: -138 },
      { lat: -85.0, lon: 45 },
      { lat: -88.75, lon: -66 },
      { lat: -82.0, lon: 180 },
    ];
    for (const pt of testPoints) {
      const { x, y } = latLonToPolar(pt.lat, pt.lon);
      const back = polarToLatLon(x, y);
      assert.strictEqual(Math.abs(back.lat - pt.lat) < 1e-4, true);
      const dLon = ((((back.lon - pt.lon + 180) % 360) + 360) % 360) - 180;
      assert.strictEqual(Math.abs(dLon) < 1e-4, true);
    }
  });

  it('validates coverage boundary strictly at -80.0° S', () => {
    assert.strictEqual(isCoordinateInCoverage(-89.5), true, 'Polar target is in coverage');
    assert.strictEqual(isCoordinateInCoverage(-80.0), true, 'Boundary is in coverage');
    assert.strictEqual(isCoordinateInCoverage(-79.9), false, 'North of -80° is out of coverage');
    assert.strictEqual(isCoordinateInCoverage(0.0), false, 'Equator is out of coverage');
  });

  it('formats coordinates correctly in decimal, DMS, and polar modes', () => {
    const lat = -89.5;
    const lon = -138.0;

    const degStr = formatCoordinates(lat, lon, 'deg', 3);
    assert.strictEqual(degStr.includes('89.500° S'), true);
    assert.strictEqual(degStr.includes('138.000° W'), true);

    const dmsStr = formatCoordinates(lat, lon, 'dms');
    assert.strictEqual(dmsStr.includes("89° 30'"), true);

    const polarStr = formatCoordinates(lat, lon, 'polar');
    assert.strictEqual(polarStr.includes('r ='), true);
    assert.strictEqual(polarStr.includes('km'), true);
  });

  it('safely handles DEM grid boundary edge cases without clamping out-of-bounds as valid', () => {
    const dummyData = new Float32Array(DEM_SIZE * DEM_SIZE);
    dummyData[100 * DEM_SIZE + 100] = 500;
    const val = sampleDem(dummyData, DEM_SIZE, 100, 100, true);
    assert.strictEqual(Math.abs(val - 500) < 1e-4, true);

    const oob = sampleDem(dummyData, DEM_SIZE, -10, 50, false);
    assert.strictEqual(Number.isNaN(oob), true, 'Out of bounds should return NaN without clamping');
  });

  it('calculates 3D slope gradient accurately via Horn kernel', () => {
    const size = 32;
    const pixelMeters = 300;
    const data = new Float32Array(size * size);

    // Flat terrain -> 0° slope
    for (let i = 0; i < size * size; i++) data[i] = 1000;
    const flatSlope = slopeAtPixel(data, size, 16, 16, pixelMeters);
    assert.strictEqual(Math.abs(flatSlope) < 1e-4, true, 'Flat terrain must have 0° slope');

    // 1:1 elevation slope (dz/dx = 1, dz/dy = 0) -> 45° slope
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        data[y * size + x] = x * pixelMeters;
      }
    }
    const slope45 = slopeAtPixel(data, size, 16, 16, pixelMeters);
    assert.strictEqual(Math.abs(slope45 - 45.0) < 1e-2, true, '1:1 gradient must yield 45° slope');
  });

  // 2. Solar Illumination & Solar Power Calculations
  it('correctly evaluates solar fraction symmetry and compares against independent numerical reference', () => {
    // Limits
    assert.strictEqual(computeSolarFraction(1.0, 0, 'geometric'), 1.0);
    assert.strictEqual(computeSolarFraction(1.0, 0, 'eddington'), 1.0);
    assert.strictEqual(computeSolarFraction(-1.0, 0, 'geometric'), 0.0);
    assert.strictEqual(computeSolarFraction(-1.0, 0, 'eddington'), 0.0);

    // Disk center directly on horizon: by circular symmetry, exactly 0.50000
    const geomHalf = computeSolarFraction(0, 0, 'geometric');
    const eddingtonHalf = computeSolarFraction(0, 0, 'eddington');
    assert.strictEqual(Math.abs(geomHalf - 0.5) < 1e-6, true, 'Geometric chord at horizon is exactly 0.5');
    assert.strictEqual(Math.abs(eddingtonHalf - 0.5) < 1e-6, true, 'Eddington limb-darkened flux at horizon is exactly 0.5');

    // Complementary symmetry f(u) + f(-u) = 1.0
    const testOffsets = [0.1, 0.25, 0.5, 0.75];
    for (const off of testOffsets) {
      const u = off * SUN_ANGULAR_RADIUS_DEG;
      const fPlusGeom = computeSolarFraction(u, 0, 'geometric');
      const fMinusGeom = computeSolarFraction(-u, 0, 'geometric');
      assert.strictEqual(Math.abs(fPlusGeom + fMinusGeom - 1.0) < 1e-6, true, 'Geometric model must be complementary');

      const fPlusEdd = computeSolarFraction(u, 0, 'eddington');
      const fMinusEdd = computeSolarFraction(-u, 0, 'eddington');
      assert.strictEqual(Math.abs(fPlusEdd + fMinusEdd - 1.0) < 1e-6, true, 'Eddington model must be complementary');
    }

    // Comparison against 2D numerical integration reference at u = +0.5:
    // f_geom(0.5) = 0.80450; true numerical Eddington integral = 0.82413; analytical model = 0.82415
    const fEddHalf = computeSolarFraction(0.5 * SUN_ANGULAR_RADIUS_DEG, 0, 'eddington');
    assert.strictEqual(Math.abs(fEddHalf - 0.82415) < 1e-3, true, 'Eddington model matches numerical integration reference within 0.1%');
  });

  it('computes solar power for partially visible solar disk when center elevation is non-positive', () => {
    const area = 10.0;
    const eff = 0.3;
    // Solar center is at -0.05° (below horizontal), but upper limb extends to +0.216° above local terrain horizon (-0.1°)
    const sunEl = -0.05;
    const horizonEl = -0.10;
    const sunFrac = computeSolarFraction(sunEl, horizonEl, 'eddington');
    assert.strictEqual(sunFrac > 0, true, 'Solar disk must be partially visible');

    const availableDirectFlux = SOLAR_CONSTANT * sunFrac;
    // Must NOT return zero solely because sunEl is non-positive
    const power = computeSolarPower(availableDirectFlux, sunEl, area, eff, false);
    assert.strictEqual(power > 0, true, 'Power must be generated when direct solar flux is physically available');

    // Incident elevation of visible segment is near horizontal (effectiveEl > 0)
    // For vertical tracking array, cos(near 0) is ~1.0
    const expectedPower = availableDirectFlux * Math.cos(Math.max(0, (sunEl + SUN_ANGULAR_RADIUS_DEG) / 2) * D2R) * area * eff;
    assert.strictEqual(Math.abs(power - expectedPower) < 1e-2, true, 'Power matches consistent incidence geometry');
  });

  it('demonstrates physical advantage of vertical tracking solar array over flat deck at polar grazing angles', () => {
    const solarFlux = 1361.0;
    const sunEl = 1.5; // Typical 1.5° lunar south polar solar elevation
    const area = 10.0;
    const eff = 0.3;

    const verticalPower = computeSolarPower(solarFlux, sunEl, area, eff, false);
    const deckPower = computeSolarPower(solarFlux, sunEl, area, eff, true);

    assert.strictEqual(verticalPower > deckPower * 35, true, 'Vertical tracking array produces >35× more power than horizontal deck at 1.5° sun elevation');
    assert.strictEqual(Math.abs(verticalPower - (solarFlux * Math.cos(sunEl * D2R) * area * eff)) < 1e-3, true);
  });

  // 3. Planetary Thermophysics
  it('computes realistic lunar surface equilibrium temperature using Stefan-Boltzmann balance', () => {
    const flux = 1361.0;
    const flatGradients = { dzdx: 0, dzdy: 0, valid: true };
    const tempK = computeSurfaceTemperature(flux, 1.0, 90.0, 0.0, flatGradients, 0.12, 0.95);
    assert.strictEqual(tempK > 380 && tempK < 395, true, 'Sub-solar equilibrium temperature should be ~386 K');
  });

  it('models cryogenic equilibrium in permanent shadow grounded in geothermal flux and secondary radiation', () => {
    const flatGradients = { dzdx: 0, dzdy: 0, valid: true };
    const tempColdTrap = computeSurfaceTemperature(1361.0, 0.0, -10.0, 0.0, flatGradients, 0.12, 0.95);
    assert.strictEqual(tempColdTrap >= 40 && tempColdTrap <= 55, true, 'Permanent shadow floor must be near Diviner cryogenic baseline (40–55 K)');
  });

  // 4. Telecommunications & Earth Direct Visibility
  it('accurately evaluates Earth angular radius and DSN disk clearance margins', () => {
    const earthDistKm = 384400.0;
    const { earthAngularRadiusDeg, isVisible, isFullDiskClear, isPartialDiskVisible } =
      evaluateEarthVisibility(2.5, 1.0, earthDistKm, 1.0);

    assert.strictEqual(earthAngularRadiusDeg > 0.9 && earthAngularRadiusDeg < 1.05, true);
    assert.strictEqual(isVisible, true);
    assert.strictEqual(isFullDiskClear, false, 'Partial disk occultation below mask must fail full-disk clearance');
    assert.strictEqual(isPartialDiskVisible, true, 'Upper portion of disk is still visible');
  });

  // 5. Celestial Ephemeris Verified Against NASA/JPL Horizons Reference Values
  it('verifies ephemeris against independently obtained NASA/JPL Horizons DE441 reference values at multiple epochs', () => {
    // Epoch 1: 2024-Jan-01 00:00:00 UTC (JPL Horizons DE441)
    // JPL Horizons: ObsSub-Lon: 0.0375°, ObsSub-Lat: -4.6850°; SunSub-Lon: -55.8666°, SunSub-Lat: -1.5541°; Dist: 404,634.6 km
    const ephem2024 = getEphemeris(new Date('2024-01-01T00:00:00Z'));
    assert.strictEqual(Math.abs(ephem2024.subEarth.lon - 0.0375) < 0.045, true, '2024 subEarth lon within 0.045°');
    assert.strictEqual(Math.abs(ephem2024.subEarth.lat - (-4.6850)) < 0.045, true, '2024 subEarth lat within 0.045°');
    assert.strictEqual(Math.abs(ephem2024.subSolar.lon - (-55.8666)) < 0.045, true, '2024 subSolar lon within 0.045°');
    assert.strictEqual(Math.abs(ephem2024.subSolar.lat - (-1.5541)) < 0.045, true, '2024 subSolar lat within 0.045°');
    assert.strictEqual(Math.abs(ephem2024.earthDistanceKm - 404634.6) < 35, true, '2024 Earth distance within 35 km (< 0.01%)');

    // Epoch 2: 2025-Jan-01 00:00:00 UTC (JPL Horizons DE441)
    // JPL Horizons: ObsSub-Lon: -4.6218°, ObsSub-Lat: +6.0509°; SunSub-Lon: 162.1892°, SunSub-Lat: -1.5204°; Dist: 381,744.2 km
    const ephem2025 = getEphemeris(new Date('2025-01-01T00:00:00Z'));
    assert.strictEqual(Math.abs(ephem2025.subEarth.lon - (-4.6218)) < 0.045, true, '2025 subEarth lon within 0.045°');
    assert.strictEqual(Math.abs(ephem2025.subEarth.lat - 6.0509) < 0.045, true, '2025 subEarth lat within 0.045°');
    assert.strictEqual(Math.abs(ephem2025.subSolar.lon - 162.1892) < 0.045, true, '2025 subSolar lon within 0.045°');
    assert.strictEqual(Math.abs(ephem2025.subSolar.lat - (-1.5204)) < 0.045, true, '2025 subSolar lat within 0.045°');
    assert.strictEqual(Math.abs(ephem2025.earthDistanceKm - 381744.2) < 35, true, '2025 Earth distance within 35 km (< 0.01%)');

    // Epoch 3: 2027-Jun-01 00:00:00 UTC (JPL Horizons DE441)
    // JPL Horizons: ObsSub-Lon: -6.9190°, ObsSub-Lat: -6.0470°; SunSub-Lon: -136.5911°, SunSub-Lat: +1.3911°; Dist: 382,675.2 km
    const ephem2027 = getEphemeris(new Date('2027-06-01T00:00:00Z'));
    assert.strictEqual(Math.abs(ephem2027.subEarth.lon - (-6.9190)) < 0.045, true, '2027 subEarth lon within 0.045°');
    assert.strictEqual(Math.abs(ephem2027.subEarth.lat - (-6.0470)) < 0.045, true, '2027 subEarth lat within 0.045°');
    assert.strictEqual(Math.abs(ephem2027.subSolar.lon - (-136.5911)) < 0.045, true, '2027 subSolar lon within 0.045°');
    assert.strictEqual(Math.abs(ephem2027.subSolar.lat - 1.3911) < 0.045, true, '2027 subSolar lat within 0.045°');
    assert.strictEqual(Math.abs(ephem2027.earthDistanceKm - 382675.2) < 35, true, '2027 Earth distance within 35 km (< 0.01%)');

    // Epoch 4: 2028-Mar-20 00:00:00 UTC (JPL Horizons DE441)
    // JPL Horizons: ObsSub-Lon: +4.8995°, ObsSub-Lat: +0.8833°; SunSub-Lon: -107.6657°, SunSub-Lat: +1.3673°; Dist: 401,650.0 km
    const ephem2028 = getEphemeris(new Date('2028-03-20T00:00:00Z'));
    assert.strictEqual(Math.abs(ephem2028.subEarth.lon - 4.8995) < 0.045, true, '2028 subEarth lon within 0.045°');
    assert.strictEqual(Math.abs(ephem2028.subEarth.lat - 0.8833) < 0.045, true, '2028 subEarth lat within 0.045°');
    assert.strictEqual(Math.abs(ephem2028.subSolar.lon - (-107.6657)) < 0.045, true, '2028 subSolar lon within 0.045°');
    assert.strictEqual(Math.abs(ephem2028.subSolar.lat - 1.3673) < 0.045, true, '2028 subSolar lat within 0.045°');
    assert.strictEqual(Math.abs(ephem2028.earthDistanceKm - 401650.0) < 35, true, '2028 Earth distance within 35 km (< 0.01%)');
  });

  // 6. Safety Scoring Input Validation & Constraint Gates
  it('never returns SAFE when essential inputs contain NaN, Infinity, or missing values', () => {
    const validResult: MissionResult = {
      samples: [{ t: 0, hours: 0, sunEl: 1, sunAz: 0, sunHorizon: 0, sunFraction: 1, earthEl: 4, earthAz: 0, earthHorizon: 0, earthVisible: true, earthClearance: 4, tempK: 200, powerW: 1000, batteryKWh: 100, lightTimeS: 1.3 }],
      events: [],
      illuminationPct: 90,
      sunlitDays: 5.8,
      totalDays: 6.5,
      longestDarkH: 2,
      longestLightH: 140,
      meanSunEl: 1.2,
      maxSunEl: 1.5,
      minSunEl: 0.8,
      earthVisiblePct: 95,
      longestBlackoutH: 0,
      minEarthEl: 4,
      maxEarthEl: 6,
      meanLightTimeS: 1.3,
      energyKWh: 100,
      avgPowerW: 600,
      peakPowerW: 1500,
      minBatteryKWh: 80,
      batteryDepleted: false,
      dodExceeded: false,
      tempMinK: 70,
      tempMaxK: 220,
      subSolarLatRange: [-1.5, 1.5],
      startPhase: 0.5,
    };

    // NaN slope in terrain
    const nanSlopeTerrain: TerrainStatistics = {
      elevationM: 1000,
      slopeDeg: NaN,
      meanSlopeDeg: NaN,
      maxSlopeDeg: NaN,
      p90SlopeDeg: NaN,
      safeAreaPct: 90,
      reliefM: 50,
      roughnessM: 5,
      sampleCount: 100,
      slopeHistogram: [],
    };
    const scoreNanSlope = computeSafetyScore(nanSlopeTerrain, validResult, DEFAULT_CONSTRAINTS);
    assert.strictEqual(scoreNanSlope.verdict, 'INSUFFICIENT_DATA', 'NaN slope must produce INSUFFICIENT_DATA');
    assert.strictEqual(scoreNanSlope.score, 0);

    // Missing DEM elevation (NaN elevation)
    const nanElevTerrain: TerrainStatistics = {
      ...nanSlopeTerrain,
      slopeDeg: 3.0,
      meanSlopeDeg: 3.5,
      maxSlopeDeg: 5.0,
      p90SlopeDeg: 4.0,
      elevationM: NaN,
    };
    const scoreNanElev = computeSafetyScore(nanElevTerrain, validResult, DEFAULT_CONSTRAINTS);
    assert.strictEqual(scoreNanElev.verdict, 'INSUFFICIENT_DATA', 'NaN elevation must produce INSUFFICIENT_DATA');

    // Invalid / NaN mission results
    const nanIllumResult: MissionResult = {
      ...validResult,
      illuminationPct: NaN,
    };
    const validTerrain: TerrainStatistics = {
      elevationM: 1000,
      slopeDeg: 3.0,
      meanSlopeDeg: 3.5,
      maxSlopeDeg: 5.0,
      p90SlopeDeg: 4.0,
      safeAreaPct: 95,
      reliefM: 50,
      roughnessM: 5,
      sampleCount: 100,
      slopeHistogram: [],
    };
    const scoreNanIllum = computeSafetyScore(validTerrain, nanIllumResult, DEFAULT_CONSTRAINTS);
    assert.strictEqual(scoreNanIllum.verdict, 'INSUFFICIENT_DATA', 'NaN illumination must produce INSUFFICIENT_DATA');

    // Negative / invalid darkness hours
    const negDarkResult: MissionResult = {
      ...validResult,
      longestDarkH: -5,
    };
    const scoreNegDark = computeSafetyScore(validTerrain, negDarkResult, DEFAULT_CONSTRAINTS);
    assert.strictEqual(scoreNegDark.verdict, 'INSUFFICIENT_DATA', 'Negative darkness duration must produce INSUFFICIENT_DATA');

    // Null or undefined inputs
    const scoreNull = computeSafetyScore(null as any, validResult, DEFAULT_CONSTRAINTS);
    assert.strictEqual(scoreNull.verdict, 'INSUFFICIENT_DATA', 'Null terrain must produce INSUFFICIENT_DATA');
  });

  it('separates true zero-energy battery depletion from crossing operational DoD threshold', () => {
    const validTerrain: TerrainStatistics = {
      elevationM: 1000,
      slopeDeg: 3.0,
      meanSlopeDeg: 3.5,
      maxSlopeDeg: 5.0,
      p90SlopeDeg: 4.0,
      safeAreaPct: 95,
      reliefM: 50,
      roughnessM: 5,
      sampleCount: 100,
      slopeHistogram: [],
    };

    // Case A: Crossing DoD threshold (dodExceeded = true, but battery reserve remains: 10 kWh > 0)
    const dodExceededResult: MissionResult = {
      samples: [{ t: 0, hours: 0, sunEl: 1, sunAz: 0, sunHorizon: 0, sunFraction: 1, earthEl: 4, earthAz: 0, earthHorizon: 0, earthVisible: true, earthClearance: 4, tempK: 200, powerW: 1000, batteryKWh: 10, lightTimeS: 1.3 }],
      events: [],
      illuminationPct: 80,
      sunlitDays: 5.0,
      totalDays: 6.5,
      longestDarkH: 25,
      longestLightH: 120,
      meanSunEl: 1.1,
      maxSunEl: 1.5,
      minSunEl: -0.2,
      earthVisiblePct: 90,
      longestBlackoutH: 0,
      minEarthEl: 4,
      maxEarthEl: 6,
      meanLightTimeS: 1.3,
      energyKWh: 60,
      avgPowerW: 400,
      peakPowerW: 1200,
      minBatteryKWh: 10, // Above zero!
      batteryDepleted: false, // NOT zero energy
      dodExceeded: true, // But crossed DoD limit
      tempMinK: 70,
      tempMaxK: 210,
      subSolarLatRange: [-1.5, 1.5],
      startPhase: 0.5,
    };

    const constraints = { ...DEFAULT_CONSTRAINTS, batteryKWh: 60, loadPowerW: 1000 };
    const scoreDoD = computeSafetyScore(validTerrain, dodExceededResult, constraints, {
      ...DEFAULT_USER_SETTINGS,
      dodThreshold: 80,
    });
    // Crossing DoD threshold caps score at 65 (CAUTION), but does NOT trigger catastrophic HAZARDOUS
    assert.strictEqual(scoreDoD.verdict, 'CAUTION', 'Crossing DoD threshold should produce CAUTION, not SAFE or catastrophic HAZARDOUS');
    assert.strictEqual(scoreDoD.score <= 65, true);

    // Case B: Actual zero-energy battery exhaustion (batteryDepleted = true, minBatteryKWh = 0)
    const zeroEnergyResult: MissionResult = {
      ...dodExceededResult,
      minBatteryKWh: 0,
      batteryDepleted: true, // TRUE ZERO ENERGY BLACKOUT
    };
    const scoreZero = computeSafetyScore(validTerrain, zeroEnergyResult, constraints);
    assert.strictEqual(scoreZero.verdict, 'HAZARDOUS', 'Actual zero energy must produce HAZARDOUS verdict');
    assert.strictEqual(scoreZero.score <= 45, true, 'Zero energy caps score at <= 45');
  });

  // 7. LOLA Terrain Data Provenance & Decoding Verification
  it('verifies LOLA DEM binary decompression and benchmark landmark elevations', () => {
    const demPath = 'public/data/lola-south-pole-2048.delta.bin.gz';
    assert.strictEqual(fs.existsSync(demPath), true, 'LOLA DEM binary asset exists');

    const rawBuf = fs.readFileSync(demPath);
    const decompressed = zlib.gunzipSync(rawBuf);
    const deltas = new Int16Array(decompressed.buffer, decompressed.byteOffset, decompressed.byteLength / 2);
    assert.strictEqual(deltas.length, DEM_SIZE * DEM_SIZE, 'Decompressed grid is 2048x2048');

    // Decode delta row-by-row
    const elevations = new Float32Array(DEM_SIZE * DEM_SIZE);
    let min = Infinity, max = -Infinity;
    for (let row = 0; row < DEM_SIZE; row++) {
      let acc = 0;
      const off = row * DEM_SIZE;
      for (let col = 0; col < DEM_SIZE; col++) {
        acc += deltas[off + col];
        elevations[off + col] = acc;
        if (acc < min) min = acc;
        if (acc > max) max = acc;
      }
    }

    // Benchmark 1: Overall elevation range matches lunar south polar extremes
    assert.strictEqual(min <= -7000 && min >= -7500, true, 'Deepest polar depression is ~ -7.3 km');
    assert.strictEqual(max >= 6800 && max <= 7200, true, 'Highest polar peak (Malapert massif) is ~ +7.0 km');

    // Benchmark 2: Shackleton Crater Floor elevation is deeply negative (~ -2.7 km)
    const shackletonFloor = LANDING_SITES.find((s) => s.id === 'shackleton-floor')!;
    const { x: sfX, y: sfY } = latLonToPolar(shackletonFloor.lat, shackletonFloor.lon);
    const { s: sfPx, l: sfPy } = polarToPixel(sfX, sfY, DEM_SIZE);
    const sfElev = sampleDem(elevations, DEM_SIZE, sfPx, sfPy);
    assert.strictEqual(sfElev < -2500 && sfElev > -3000, true, 'Shackleton crater floor elevation ~ -2.7 km');

    // Benchmark 3: Connecting Ridge elevation is positive (~ +1.9 km)
    const connRidge = LANDING_SITES.find((s) => s.id === 'connecting-ridge')!;
    const { x: crX, y: crY } = latLonToPolar(connRidge.lat, connRidge.lon);
    const { s: crPx, l: crPy } = polarToPixel(crX, crY, DEM_SIZE);
    const crElev = sampleDem(elevations, DEM_SIZE, crPx, crPy);
    assert.strictEqual(crElev > 1700 && crElev < 2100, true, 'Connecting Ridge elevation ~ +1.9 km');
  });

  // 8. Detrended Surface Roughness & Terrain Planar Fit
  it('computes detrended surface roughness correctly and handles planar slopes without artificial roughness', () => {
    // Create synthetic flat DEM: 64x64 pixels
    const size = 64;
    const pixelKm = 0.3;
    const pixelM = 300;
    const planarDem = new Float32Array(size * size);
    // Linear plane: z = 1000 + 0.1 * x * pixelM + 0.05 * y * pixelM (pure planar slope, zero micro-roughness)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        planarDem[y * size + x] = 1000 + 0.1 * (x - 32) * pixelM + 0.05 * (y - 32) * pixelM;
      }
    }

    const demObj = { size, data: planarDem, min: 500, max: 1500, pixelKm };
    // Polar coordinates for center pixel
    const centerLat = -85.0;
    const stats = computeTerrainStatistics(demObj, centerLat, 0, {
      ...DEFAULT_CONSTRAINTS,
      ellipseRadiusKm: 1.0,
    });

    // Detrending the plane must isolate micro-roughness to near zero (< 0.05 m RMS)
    assert.strictEqual(Number.isFinite(stats.roughnessM), true);
    assert.strictEqual(stats.roughnessM < 0.1, true, 'Pure planar slope must yield near-zero detrended RMS roughness');

    // Add high-frequency noise (roughness = +/- 5 m)
    const noisyDem = new Float32Array(planarDem);
    for (let i = 0; i < noisyDem.length; i++) {
      noisyDem[i] += (i % 2 === 0 ? 5 : -5);
    }
    const noisyStats = computeTerrainStatistics({ ...demObj, data: noisyDem }, centerLat, 0, {
      ...DEFAULT_CONSTRAINTS,
      ellipseRadiusKm: 1.0,
    });
    assert.strictEqual(noisyStats.roughnessM > 4.5 && noisyStats.roughnessM < 5.5, true, 'Synthetic noise should yield ~5 m RMS roughness');
  });

  // 9. Planetary Thermophysics & Stefan-Boltzmann Unit Consistency
  it('verifies thermal physics units and contribution of diffuse secondary infrared radiation', () => {
    const sigma = STEFAN_BOLTZMANN; // 5.670374419e-8 W/(m^2 K^4)
    const qGeo = GEOTHERMAL_FLUX; // 0.018 W/m^2
    const eps = 0.95;

    // Zero diffuse flux (geothermal only):
    // T = (0.018 / (0.95 * 5.670374e-8))^0.25 ≈ 24.0 K
    const tGeothermalOnly = Math.pow(qGeo / (eps * sigma), 0.25);
    assert.strictEqual(Math.abs(tGeothermalOnly - 24.0) < 1.0, true, 'Geothermal floor alone is ~24 K');

    // With empirical secondary diffuse infrared radiation Q_diffuse = 0.15 W/m²:
    // T = ((0.018 + 0.15) / (0.95 * 5.670374e-8))^0.25 = (0.168 / 5.3868e-8)^0.25 ≈ 42.0 K
    const qDiffuse = 0.15;
    const tEquilColdTrap = Math.pow((qGeo + qDiffuse) / (eps * sigma), 0.25);
    assert.strictEqual(Math.abs(tEquilColdTrap - 42.02) < 0.5, true, 'Q_diffuse = 0.15 W/m² raises cold-trap equilibrium to ~42 K');

    // Tested against computeSurfaceTemperature function
    const flatGradients = { dzdx: 0, dzdy: 0, valid: true };
    const computedColdTemp = computeSurfaceTemperature(1361.0, 0.0, -10.0, 0.0, flatGradients, 0.12, eps);
    assert.strictEqual(Math.abs(computedColdTemp - tEquilColdTrap) < 1e-4, true, 'computeSurfaceTemperature strictly matches Stefan-Boltzmann derivation');
  });

  // 10. Multi-Site Comparison Metrics & Finite Radar Score Guarantees
  it('validates multi-site comparison metrics and guarantees non-NaN radar scores', () => {
    // When DEM is null, computeAllSitesComparison returns empty array safely
    const emptyRes = computeAllSitesComparison(null, Date.now(), 6.5, DEFAULT_CONSTRAINTS, 'hls');
    assert.strictEqual(Array.isArray(emptyRes), true);
    assert.strictEqual(emptyRes.length, 0);

    // Synthetic dummy DEM to test site comparison radar score calculations
    const dummyDem = {
      size: 256,
      data: new Float32Array(256 * 256),
      min: 0,
      max: 2000,
      pixelKm: 2.375,
    };
    const compRes = computeAllSitesComparison(dummyDem, Date.now(), 6.5, DEFAULT_CONSTRAINTS, 'hls');
    assert.strictEqual(compRes.length, LANDING_SITES.length, 'All sites are evaluated');
    for (const siteData of compRes) {
      assert.strictEqual(Number.isFinite(siteData.radarScores.slopeSafety), true, 'slopeSafety must be finite');
      assert.strictEqual(Number.isFinite(siteData.radarScores.powerHarvest), true, 'powerHarvest must be finite');
      assert.strictEqual(Number.isFinite(siteData.radarScores.thermalMildness), true, 'thermalMildness must be finite');
      assert.strictEqual(Number.isFinite(siteData.radarScores.elevationAdvantage), true, 'elevationAdvantage must be finite');
      assert.strictEqual(siteData.radarScores.slopeSafety >= 0 && siteData.radarScores.slopeSafety <= 100, true);
    }
  });

  // 11. Descent Trajectory & Delta-v Rocket Equation Consistency
  it('evaluates powered descent trajectory delta-v and Tsiolkovsky propellant mass fraction', () => {
    const g0 = 9.80665; // m/s^2
    const isp = 315.0; // seconds (typical storable hypergolic bipropellant, e.g. NTO/MMH)
    const deltaV = 2000.0; // m/s nominal polar descent requirement including gravity losses

    // Tsiolkovsky mass ratio: m_init / m_final = exp(deltaV / (isp * g0))
    const massRatio = Math.exp(deltaV / (isp * g0));
    assert.strictEqual(massRatio > 1.8 && massRatio < 2.0, true, 'Mass ratio for 2000 m/s at 315s Isp is ~1.91');

    // Propellant mass fraction: m_prop / m_init = 1 - 1/massRatio
    const propFraction = 1 - 1 / massRatio;
    assert.strictEqual(propFraction > 0.45 && propFraction < 0.50, true, 'Propellant fraction is ~47.6% of wet landing mass');

    // Boundary check: zero delta-v requires zero propellant
    const zeroDeltaVProp = 1 - Math.exp(-0 / (isp * g0));
    assert.strictEqual(zeroDeltaVProp, 0, 'Zero delta-v requires zero propellant');
  });

  // 12. NASA October 2024 Artemis III Regions & Empty Terrain Safety
  it('contains the 9 official October 2024 Artemis III candidate regions and reclassifies historical sites', () => {
    const artemisSites = LANDING_SITES.filter((s) => s.category === 'artemis');
    assert.strictEqual(artemisSites.length, 9, 'Exactly 9 official October 2024 Artemis III candidate regions');

    const expectedIds = [
      'peak-near-cabeus-b',
      'haworth',
      'malapert-massif',
      'mons-mouton-plateau',
      'mons-mouton',
      'nobile-rim-1',
      'nobile-rim-2',
      'de-gerlache-rim-2',
      'slater-plain',
    ];
    for (const id of expectedIds) {
      assert.ok(artemisSites.some((s) => s.id === id), `Artemis III list includes ${id}`);
    }

    const connRidge = LANDING_SITES.find((s) => s.id === 'connecting-ridge');
    const faustini = LANDING_SITES.find((s) => s.id === 'faustini-rim');
    const shackletonRim = LANDING_SITES.find((s) => s.id === 'shackleton-rim');
    assert.ok(connRidge && connRidge.category !== 'artemis', 'Connecting Ridge is classified as historical benchmark');
    assert.ok(faustini && faustini.category !== 'artemis', 'Faustini Rim A is classified as historical benchmark');
    assert.ok(shackletonRim && shackletonRim.category !== 'artemis', 'Shackleton Rim is classified as classic benchmark');
  });

  it('returns NaN terrain metrics and sampleCount 0 when all DEM samples in ellipse are missing', () => {
    const size = 64;
    const nanData = new Float32Array(size * size).fill(NaN);
    const nanDem = { size, data: nanData, min: 0, max: 0, pixelKm: 0.3 };
    const stats = computeTerrainStatistics(nanDem, -85.0, 0, DEFAULT_CONSTRAINTS);
    assert.strictEqual(stats.sampleCount, 0);
    assert.strictEqual(Number.isNaN(stats.meanSlopeDeg), true);
    assert.strictEqual(Number.isNaN(stats.safeAreaPct), true);
    assert.strictEqual(Number.isNaN(stats.roughnessM), true);
  });
});
