import {
  D2R,
  R2D,
  DEM_SIZE,
  DEM_EXTENT_KM,
  DEM_MIN_LAT,
  DEM_MAX_RADIUS_KM,
  DEM_PIXEL_KM,
  DEM_URL,
} from './constants.ts';
import { DemData } from '../types/mission.ts';

/**
 * Polar stereographic projection for Lunar South Pole.
 * Origin (0,0) is at the South Pole (-90°).
 * Standard projection formula: r = 2 * R_moon * tan(pi/4 + lat/2)
 * where lat is in radians and negative in southern hemisphere.
 * Reference: Snyder, J. P. (1987). Map Projections — A Working Manual, USGS Paper 1395.
 */
export function latLonToPolarRadius(lat: number): number {
  return 3474.8 * Math.tan(Math.PI / 4 + (lat * D2R) / 2);
}

export function latLonToPolar(lat: number, lon: number): { x: number; y: number } {
  const r = latLonToPolarRadius(lat);
  const radLon = lon * D2R;
  return {
    x: r * Math.sin(radLon),
    y: r * Math.cos(radLon),
  };
}

export function polarToLatLon(x: number, y: number): { lat: number; lon: number } {
  const hyp = Math.hypot(x, y);
  const lat = (2 * Math.atan(hyp / 3474.8) - Math.PI / 2) * R2D;
  const lon = hyp === 0 ? 0 : Math.atan2(x, y) * R2D;
  return { lat, lon };
}

export function polarToPixel(x: number, y: number, size = DEM_SIZE): { s: number; l: number } {
  const pixelKm = DEM_EXTENT_KM / size;
  return {
    s: x / pixelKm + size / 2,
    l: size / 2 - y / pixelKm,
  };
}

export function pixelToPolar(s: number, l: number, size = DEM_SIZE): { x: number; y: number } {
  const pixelKm = DEM_EXTENT_KM / size;
  return {
    x: (s - size / 2) * pixelKm,
    y: (size / 2 - l) * pixelKm,
  };
}

/**
 * Geographic coverage check for LOLA South Polar DEM.
 * Coverage spans from the South Pole (-90°) up to the northern limit (-80°).
 */
export function isCoordinateInCoverage(lat: number, _lon?: number): boolean {
  if (lat > DEM_MIN_LAT || lat < -90.0) return false;
  return true;
}

export function isPolarInCoverage(x: number, y: number): boolean {
  return Math.hypot(x, y) <= DEM_MAX_RADIUS_KM;
}

export function latLonToVector(lat: number, lon: number, r = 1): [number, number, number] {
  const phi = lat * D2R;
  const lam = lon * D2R;
  return [
    r * Math.cos(phi) * Math.cos(lam),
    r * Math.cos(phi) * Math.sin(lam),
    r * Math.sin(phi),
  ];
}

export function vectorToLatLon(vec: [number, number, number]): { lat: number; lon: number } {
  const hyp = Math.hypot(vec[0], vec[1], vec[2]);
  return {
    lat: Math.asin(vec[2] / (hyp || 1)) * R2D,
    lon: Math.atan2(vec[1], vec[0]) * R2D,
  };
}

export function localFrame(
  lat: number,
  lon: number,
): {
  up: [number, number, number];
  east: [number, number, number];
  north: [number, number, number];
} {
  const phi = lat * D2R;
  const lam = lon * D2R;
  const up: [number, number, number] = [
    Math.cos(phi) * Math.cos(lam),
    Math.cos(phi) * Math.sin(lam),
    Math.sin(phi),
  ];
  const east: [number, number, number] = [-Math.sin(lam), Math.cos(lam), 0];
  const north: [number, number, number] = [
    -Math.sin(phi) * Math.cos(lam),
    -Math.sin(phi) * Math.sin(lam),
    Math.cos(phi),
  ];
  return { up, east, north };
}

export function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function moonToThree(v: [number, number, number]): [number, number, number] {
  return [v[0], v[2], -v[1]];
}

export function threeToMoon(v: [number, number, number]): [number, number, number] {
  return [v[0], -v[2], v[1]];
}

export function formatLat(lat: number, format = 'deg', precision = 3): string {
  if (format === 'dms') {
    const abs = Math.abs(lat);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = ((abs - d - m / 60) * 3600).toFixed(1);
    return `${d}° ${m}' ${s}" ${lat < 0 ? 'S' : 'N'}`;
  }
  return `${Math.abs(lat).toFixed(precision)}° ${lat < 0 ? 'S' : 'N'}`;
}

export function formatLon(lon: number, format = 'deg', precision = 3): string {
  const normalized = ((((lon + 180) % 360) + 360) % 360) - 180;
  if (format === 'dms') {
    const abs = Math.abs(normalized);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = ((abs - d - m / 60) * 3600).toFixed(1);
    return `${d}° ${m}' ${s}" ${normalized < 0 ? 'W' : 'E'}`;
  }
  return `${Math.abs(normalized).toFixed(precision)}° ${normalized < 0 ? 'W' : 'E'}`;
}

export function formatCoordinates(
  lat: number,
  lon: number,
  format: 'deg' | 'dms' | 'polar' = 'deg',
  precision = 3,
): string {
  if (format === 'polar') {
    const { x, y } = latLonToPolar(lat, lon);
    const rKm = Math.hypot(x, y);
    const az = ((((Math.atan2(x, y) * R2D) % 360) + 360) % 360).toFixed(1);
    return `r = ${rKm.toFixed(1)} km, θ = ${az}°`;
  }
  return `${formatLat(lat, format, precision)}   ${formatLon(lon, format, precision)}`;
}

/**
 * Bilinear interpolation sampling of DEM elevation grid.
 * Consistent node indexing: continuous pixel coordinates s in [0, size - 1], l in [0, size - 1].
 * If clamp=false and sample falls outside grid, returns NaN.
 */
export function sampleDem(
  data: Float32Array,
  size: number,
  sampleX: number,
  sampleY: number,
  clamp = true,
): number {
  if (!clamp && (sampleX < 0 || sampleX > size - 1 || sampleY < 0 || sampleY > size - 1)) {
    return NaN;
  }
  const s = Math.max(0, Math.min(size - 1.0001, sampleX));
  const l = Math.max(0, Math.min(size - 1.0001, sampleY));
  const s0 = Math.floor(s);
  const l0 = Math.floor(l);
  const ds = s - s0;
  const dl = l - l0;
  const idx = l0 * size + s0;
  const v00 = data[idx];
  const v10 = data[idx + 1];
  const v01 = data[idx + size];
  const v11 = data[idx + size + 1];
  return (1 - dl) * ((1 - ds) * v00 + ds * v10) + dl * ((1 - ds) * v01 + ds * v11);
}

/**
 * Returns height in meters above 1737.4 km reference sphere.
 * Explicitly validates coverage boundary.
 */
export function heightAt(dem: DemData, lat: number, lon: number): number {
  if (!isCoordinateInCoverage(lat, lon)) {
    return NaN;
  }
  const { x, y } = latLonToPolar(lat, lon);
  if (!isPolarInCoverage(x, y)) {
    return NaN;
  }
  const { s, l } = polarToPixel(x, y, dem.size);
  return sampleDem(dem.data, dem.size, s, l, true);
}

/**
 * Computes 3D surface gradient components (dz/dx, dz/dy) in meters/meter
 * using Horn (1981) 3x3 finite-difference kernel.
 * x is in East projection direction, y is in North projection direction.
 */
export function surfaceGradientsAtPixel(
  data: Float32Array,
  size: number,
  px: number,
  py: number,
  pixelMeters: number,
): { dzdx: number; dzdy: number; valid: boolean } {
  if (px < 1 || px >= size - 1 || py < 1 || py >= size - 1) {
    return { dzdx: 0, dzdy: 0, valid: false };
  }
  const getVal = (dx: number, dy: number) => data[(py + dy) * size + (px + dx)];
  // Horn's 1981 3x3 weighted kernel
  const dzdx =
    (getVal(1, -1) + 2 * getVal(1, 0) + getVal(1, 1) -
      (getVal(-1, -1) + 2 * getVal(-1, 0) + getVal(-1, 1))) /
    (8 * pixelMeters);
  const dzdy =
    (getVal(-1, 1) + 2 * getVal(0, 1) + getVal(1, 1) -
      (getVal(-1, -1) + 2 * getVal(0, -1) + getVal(1, -1))) /
    (8 * pixelMeters);
  return { dzdx, dzdy, valid: true };
}

/**
 * Computes surface slope in degrees using 3x3 Sobel/Horn gradient kernel on DEM grid.
 * pixelMeters is the physical grid spacing in meters (296.875 m for 2048 LOLA DEM).
 */
export function slopeAtPixel(
  data: Float32Array,
  size: number,
  px: number,
  py: number,
  pixelMeters: number,
): number {
  const { dzdx, dzdy, valid } = surfaceGradientsAtPixel(data, size, px, py, pixelMeters);
  if (!valid) return NaN;
  return Math.atan(Math.hypot(dzdx, dzdy)) * R2D;
}

/**
 * Loads and decodes the LOLA South Pole 2048×2048 Digital Elevation Model (DEM).
 *
 * Data Provenance & Specifications:
 * - Source: NASA Planetary Data System (PDS) Geosciences Node / NASA Goddard Space Flight Center.
 * - Product: LRO LOLA Gridded Data Record (GDR) polar stereographic product LDEM_80S_80M,
 *   resampled to 2048×2048 pixels at 296.875 meters/pixel.
 * - Coordinate Reference System: Moon 2000 IAU/IAG Cartographic Frame, polar stereographic
 *   projection centered at the Lunar South Pole (-90°), reference sphere R_M = 1737.4 km.
 * - Vertical Datum: Elevation in integer meters relative to the 1737.4 km reference sphere.
 *
 * Spatial Resolution Scope:
 * - Regional analysis (~297 m/pixel) resolves regional topography, crater rims, massifs, and broad
 *   slope gradients (> 600 m) for preliminary candidate landing site screening and comparison.
 * - Terminal touchdown hazard assessment (< 300 m boulders, rocks, and small craters within a 10–100 m
 *   landing footprint) requires meter-scale LROC NAC stereo-photogrammetry via LROC QuickMap or
 *   descent Hazard Detection and Avoidance (HDA) lidar.
 */
export async function loadDem(url = DEM_URL): Promise<DemData> {
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`Failed to load LOLA DEM (${resp.status} ${resp.statusText})`);
  }
  const rawBuf = await resp.arrayBuffer();
  let uncompressedBuf: ArrayBuffer;
  const header = new Uint8Array(rawBuf, 0, 2);
  if (header[0] === 31 && header[1] === 139) {
    const ds = new DecompressionStream('gzip');
    const decompressedStream = new Response(new Blob([rawBuf]).stream().pipeThrough(ds));
    uncompressedBuf = await decompressedStream.arrayBuffer();
  } else {
    uncompressedBuf = rawBuf;
  }
  const deltas = new Int16Array(uncompressedBuf);
  const totalPixels = DEM_SIZE * DEM_SIZE;
  const elevations = new Float32Array(totalPixels);
  let minVal = Infinity;
  let maxVal = -Infinity;
  for (let row = 0; row < DEM_SIZE; row++) {
    let acc = 0;
    const rowOffset = row * DEM_SIZE;
    for (let col = 0; col < DEM_SIZE; col++) {
      acc += deltas[rowOffset + col];
      elevations[rowOffset + col] = acc;
      if (acc < minVal) minVal = acc;
      if (acc > maxVal) maxVal = acc;
    }
  }
  return {
    size: DEM_SIZE,
    data: elevations,
    min: minVal,
    max: maxVal,
    pixelKm: DEM_PIXEL_KM,
  };
}
