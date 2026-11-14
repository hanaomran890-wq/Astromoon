/**
 * High-performance Web Worker for Lunar LOLA DEM Shading & Illumination Mapping
 * Generates real-time raymarched shadows, slope gradients, elevation contours, and illumination maps.
 */

export interface ShadingInitMessage {
  type: 'init';
  data: Float32Array;
  size: number;
  min: number;
  max: number;
}

export interface ShadingRenderMessage {
  type: 'render';
  id: number;
  mode: 'sunlight' | 'illumination' | 'slope' | 'elevation' | 'hillshade';
  res: number;
  sun: [number, number, number];
  suns?: [number, number, number][];
  exposure: number;
  earthshine: number;
  slopeLimit: number;
  shadows: boolean;
  solarModel?: 'eddington' | 'geometric';
}

export interface ShadingResultMessage {
  type: 'frame';
  id: number;
  res: number;
  pixels: Uint8ClampedArray;
  ms: number;
}

const workerScript = `
let dem = null;
const SUN_R = 0.2666;
const DEM_EXTENT_KM = 608;
const MOON_RADIUS_KM = 1737.4;
const R2D = 180 / Math.PI;

const VIRIDIS = [
  [0.267, 0.005, 0.329],
  [0.283, 0.141, 0.458],
  [0.254, 0.265, 0.53],
  [0.207, 0.372, 0.553],
  [0.164, 0.471, 0.558],
  [0.128, 0.567, 0.551],
  [0.135, 0.659, 0.518],
  [0.267, 0.749, 0.441],
  [0.478, 0.821, 0.318],
  [0.741, 0.873, 0.15],
  [0.993, 0.906, 0.144],
];

const INFERNO = [
  [0.001, 0.0, 0.014],
  [0.087, 0.045, 0.224],
  [0.258, 0.039, 0.406],
  [0.416, 0.09, 0.433],
  [0.578, 0.148, 0.404],
  [0.735, 0.216, 0.33],
  [0.865, 0.317, 0.226],
  [0.954, 0.469, 0.098],
  [0.988, 0.645, 0.04],
  [0.964, 0.84, 0.273],
  [0.988, 0.998, 0.645],
];

function sampleDem(data, size, sampleX, sampleY) {
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

function ramp(table, t) {
  const x = Math.max(0, Math.min(0.9999, t)) * (table.length - 1);
  const i = Math.floor(x);
  const f = x - i;
  const a = table[i];
  const b = table[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

function slopeColor(deg, limit) {
  if (deg <= limit * 0.5) return [0.2, 0.75, 0.45];
  if (deg <= limit) return [0.62, 0.82, 0.3];
  if (deg <= limit * 2) return [0.96, 0.7, 0.2];
  if (deg <= limit * 3) return [0.94, 0.38, 0.18];
  return [0.78, 0.12, 0.16];
}

function shadowFraction(data, size, s0, l0, h0, dirS, dirL, elevDeg, pxM, maxH, solarModel) {
  const tanE = Math.tan(elevDeg * (Math.PI / 180));
  const Rm = MOON_RADIUS_KM * 1000;
  let best = -90;
  let d = 0.75;
  const limit = (size * 0.75) | 0;

  while (d < limit) {
    const s = s0 + dirS * d;
    const l = l0 + dirL * d;
    if (s < 0 || l < 0 || s >= size || l >= size) break;
    const dm = d * pxM;
    const h = sampleDem(data, size, s, l) - (dm * dm) / (2 * Rm);
    const ang = Math.atan2(h - h0, dm) * R2D;
    if (ang > best) {
      best = ang;
      if (best > elevDeg + SUN_R) return 0;
    }
    if (dm > 2000 && h0 + dm * Math.max(tanE, 0.0005) > maxH + 50) break;
    d += Math.max(0.75, d * 0.045);
  }

  const x = (elevDeg - best) / SUN_R;
  if (x >= 1) return 1;
  if (x <= -1) return 0;
  const geomFrac = 1 - (Math.acos(x) - x * Math.sqrt(1 - x * x)) / Math.PI;
  if (solarModel === 'geometric') return geomFrac;
  return geomFrac * (0.4 + 0.6 * geomFrac);
}

function render(req) {
  if (!dem) return null;
  const { data, size, min, max } = dem;
  const res = req.res;
  const out = new Uint8ClampedArray(res * res * 4);
  const scale = size / res;
  const pxKm = DEM_EXTENT_KM / size;
  const pxM = pxKm * 1000;
  const rMax = (size / 2) * 1.0;
  const suns = req.mode === 'illumination' ? (req.suns || [req.sun]) : [req.sun];
  const solarModel = req.solarModel || 'eddington';

  for (let j = 0; j < res; j++) {
    for (let i = 0; i < res; i++) {
      const o = (j * res + i) * 4;
      const s = (i + 0.5) * scale;
      const l = (j + 0.5) * scale;

      const gx = s - size / 2;
      const gy = size / 2 - l;
      if (gx * gx + gy * gy > rMax * rMax) {
        out[o + 3] = 0;
        continue;
      }

      const h = sampleDem(data, size, s, l);
      const hx = (sampleDem(data, size, s + scale, l) - sampleDem(data, size, s - scale, l)) / (2 * scale * pxM);
      const hy = (sampleDem(data, size, s, l - scale) - sampleDem(data, size, s, l + scale)) / (2 * scale * pxM);

      let nx = -hx;
      let ny = -hy;
      let nz = 1;
      const nl = Math.hypot(nx, ny, nz);
      nx /= nl;
      ny /= nl;
      nz /= nl;

      const xKm = gx * pxKm;
      const yKm = gy * pxKm;
      const rho = Math.hypot(xKm, yKm);
      const lam = Math.atan2(xKm, yKm);
      const phi = 2 * Math.atan(rho / (2 * MOON_RADIUS_KM)) - Math.PI / 2;

      const cphi = Math.cos(phi);
      const sphi = Math.sin(phi);
      const clam = Math.cos(lam);
      const slam = Math.sin(lam);

      const upX = cphi * clam;
      const upY = cphi * slam;
      const upZ = sphi;

      const eX = -slam;
      const eY = clam;

      const nX = -sphi * clam;
      const nY = -sphi * slam;
      const nZ = cphi;

      let r = 0;
      let g = 0;
      let b = 0;

      if (req.mode === 'sunlight' || req.mode === 'illumination') {
        let acc = 0;
        let accLit = 0;

        for (const sun of suns) {
          const sUp = sun[0] * upX + sun[1] * upY + sun[2] * upZ;
          const sE = sun[0] * eX + sun[1] * eY;
          const sN = sun[0] * nX + sun[1] * nY + sun[2] * nZ;

          const el = Math.asin(Math.max(-1, Math.min(1, sUp))) * R2D;
          const gdx = sN * slam + sE * clam;
          const gdy = sN * clam - sE * slam;
          const hl = Math.hypot(gdx, gdy) || 1;
          const dirS = gdx / hl;
          const dirL = -gdy / hl;

          let frac = 0;
          if (el > -SUN_R - 2) {
            frac = (req.shadows || req.mode === 'illumination')
              ? shadowFraction(data, size, s, l, h + 1, dirS, dirL, el, pxM, max, solarModel)
              : (el > SUN_R ? 1 : el < -SUN_R ? 0 : (el + SUN_R) / (2 * SUN_R));
          }

          if (req.mode === 'illumination') {
            accLit += frac;
          } else {
            const ndl = Math.max(0, (nx * gdx) + (ny * gdy) + nz * sUp);
            acc += frac * ndl;
          }
        }

        if (req.mode === 'illumination') {
          const t = accLit / suns.length;
          const hill = 0.55 + 0.45 * Math.max(0, nx * -0.5 + ny * 0.5 + nz * 0.7);
          const [cr, cg, cb] = ramp(INFERNO, t);
          r = cr * hill;
          g = cg * hill;
          b = cb * hill;
        } else {
          const lit = Math.pow(acc * req.exposure, 0.8);
          const amb = req.earthshine * (0.6 + 0.4 * nz);
          const v = Math.min(1, lit + amb);
          r = v * 0.97;
          g = v * 0.95;
          b = v * 0.92;
        }
      } else {
        const hill = Math.max(0, nx * -0.5 + ny * 0.55 + nz * 0.67);
        const shade = 0.35 + 0.65 * hill;

        if (req.mode === 'elevation') {
          const [cr, cg, cb] = ramp(VIRIDIS, (h - min) / (max - min));
          r = cr * shade;
          g = cg * shade;
          b = cb * shade;
        } else if (req.mode === 'slope') {
          const deg = Math.atan(Math.hypot(hx, hy)) * R2D;
          const [cr, cg, cb] = slopeColor(deg, req.slopeLimit);
          r = cr * shade;
          g = cg * shade;
          b = cb * shade;
        } else {
          // hillshade
          const v = Math.pow(hill, 0.9) * 0.9;
          r = v;
          g = v;
          b = v;
        }
      }

      out[o] = Math.round(Math.pow(Math.min(1, r), 1 / 2.2) * 255);
      out[o + 1] = Math.round(Math.pow(Math.min(1, g), 1 / 2.2) * 255);
      out[o + 2] = Math.round(Math.pow(Math.min(1, b), 1 / 2.2) * 255);
      out[o + 3] = 255;
    }
  }

  return out;
}

self.onmessage = function(e) {
  const msg = e.data;
  if (msg.type === 'init') {
    dem = {
      data: msg.data,
      size: msg.size,
      min: msg.min,
      max: msg.max
    };
  } else if (msg.type === 'render') {
    const t0 = performance.now();
    const pixels = render(msg);
    const ms = performance.now() - t0;
    if (pixels) {
      self.postMessage(
        { type: 'frame', id: msg.id, res: msg.res, pixels, ms },
        [pixels.buffer]
      );
    }
  }
};
`;

export function createShadingWorker(): Worker {
  const blob = new Blob([workerScript], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  return worker;
}
