import { useMemo } from 'react';
import { useMission, useCurrentSample } from '../context/MissionContext.tsx';

function downsampleSamples<T>(samples: T[], maxPoints = 720): T[] {
  if (samples.length <= maxPoints) return samples;
  const step = samples.length / maxPoints;
  const res: T[] = [];
  for (let i = 0; i < maxPoints; i++) {
    res.push(samples[Math.floor(i * step)]);
  }
  return res;
}

function buildSvgPath(
  points: { az: number; el: number }[],
  scaleX: (az: number) => number,
  scaleY: (el: number) => number,
): string {
  let path = '';
  let prevAz: number | null = null;
  for (const pt of points) {
    // Break line if crossing 0°/360° boundary
    const jump = prevAz !== null && Math.abs(pt.az - prevAz) > 180;
    const cmd = path === '' || jump ? 'M' : 'L';
    path += `${cmd}${scaleX(pt.az).toFixed(1)},${scaleY(pt.el).toFixed(1)}`;
    prevAz = pt.az;
  }
  return path;
}

export function HorizonPanorama() {
  const { horizon, result } = useMission();
  const currentSample = useCurrentSample();

  const panoramaData = useMemo(() => {
    if (!horizon || !result) return null;
    const sampleSubset = downsampleSamples(result.samples, 720);
    const maxHorizon = Math.max(...horizon.elevations);
    const minHorizon = Math.min(...horizon.elevations);
    const maxTrack = Math.max(
      ...sampleSubset.map((s) => Math.max(s.sunEl, s.earthEl)),
    );
    const elMax = Math.ceil(Math.max(6, maxHorizon, maxTrack) + 1.5);
    const elMin = Math.floor(Math.min(-3, minHorizon) - 0.5);

    const scaleX = (az: number) => (az / 360) * 720;
    const scaleY = (el: number) => 140 - ((el - elMin) / (elMax - elMin)) * 140;

    // Build terrain silhouette polygon
    let terrainPath = 'M0,140';
    horizon.elevations.forEach((elev, idx) => {
      const az = idx * horizon.stepDeg;
      terrainPath += `L${scaleX(az).toFixed(1)},${scaleY(elev).toFixed(1)}`;
    });
    terrainPath += `L720,${scaleY(horizon.elevations[0]).toFixed(1)}L720,140Z`;

    // Sun and Earth tracks across 360° azimuth
    const sunTrack = buildSvgPath(
      sampleSubset.map((s) => ({ az: s.sunAz, el: s.sunEl })),
      scaleX,
      scaleY,
    );
    const earthTrack = buildSvgPath(
      sampleSubset.map((s) => ({ az: s.earthAz, el: s.earthEl })),
      scaleX,
      scaleY,
    );

    // Grid elevation intervals
    const gridLines: number[] = [];
    const interval = elMax - elMin > 16 ? 5 : 2;
    for (let el = Math.ceil(elMin / interval) * interval; el <= elMax; el += interval) {
      gridLines.push(el);
    }

    return {
      terrainPath,
      sunTrack,
      earthTrack,
      scaleX,
      scaleY,
      gridLines,
      elMax,
      elMin,
    };
  }, [horizon, result]);

  if (!panoramaData) {
    return (
      <div
        className="h-full min-h-32 animate-pulse rounded-md bg-muted/30"
        aria-label="Loading horizon profile"
      />
    );
  }

  const { terrainPath, sunTrack, earthTrack, scaleX, scaleY, gridLines } = panoramaData;

  return (
    <figure className="flex h-full flex-col">
      <figcaption className="sr-only">
        360° local horizon profile with Sun and Earth tracks across the sky during the mission.
      </figcaption>
      <div className="relative min-h-0 flex-1">
        <svg
          viewBox="0 0 720 140"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          role="img"
          aria-label="Horizon panorama"
        >
          <defs>
            <linearGradient id="terrain-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#252a36" />
              <stop offset="100%" stopColor="#0d1017" />
            </linearGradient>
          </defs>

          {/* Elevation Horizontal Grid Lines */}
          {gridLines.map((el) => (
            <line
              key={el}
              x1="0"
              x2="720"
              y1={scaleY(el)}
              y2={scaleY(el)}
              stroke="white"
              strokeOpacity={el === 0 ? 0.25 : 0.06}
              strokeDasharray={el === 0 ? '' : '2 4'}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Azimuth Vertical Grid Lines (Cardinal Directions) */}
          {[0, 90, 180, 270].map((az) => (
            <line
              key={az}
              x1={scaleX(az)}
              x2={scaleX(az)}
              y1="0"
              y2="140"
              stroke="white"
              strokeOpacity={0.08}
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Earth Sky Track */}
          <path
            d={earthTrack}
            fill="none"
            stroke="var(--earth)"
            strokeWidth={1.25}
            strokeOpacity={0.75}
            vectorEffect="non-scaling-stroke"
          />

          {/* Sun Sky Track */}
          <path
            d={sunTrack}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={1.25}
            strokeOpacity={0.85}
            vectorEffect="non-scaling-stroke"
          />

          {/* Mountain / Ridge Silhouette */}
          <path
            d={terrainPath}
            fill="url(#terrain-fill)"
            stroke="#475569"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* Live Sun and Earth Markers at current time cursor */}
        {currentSample && (
          <>
            {/* Live Earth Marker */}
            <span
              className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-earth ring-2 ring-background"
              style={{
                left: `${(scaleX(currentSample.earthAz) / 720) * 100}%`,
                top: `${(scaleY(currentSample.earthEl) / 140) * 100}%`,
              }}
              title={`Earth: az ${currentSample.earthAz.toFixed(1)}°, el ${currentSample.earthEl.toFixed(1)}°`}
              aria-hidden="true"
            />
            {/* Live Sun Marker */}
            <span
              className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_12px_var(--primary)] ring-2 ring-background"
              style={{
                left: `${(scaleX(currentSample.sunAz) / 720) * 100}%`,
                top: `${(scaleY(currentSample.sunEl) / 140) * 100}%`,
              }}
              title={`Sun: az ${currentSample.sunAz.toFixed(1)}°, el ${currentSample.sunEl.toFixed(1)}°`}
              aria-hidden="true"
            />
          </>
        )}
      </div>

      {/* Compass Azimuth Axis Legend */}
      <div
        className="mt-1 flex justify-between font-mono text-[9.5px] text-muted-foreground"
        aria-hidden="true"
      >
        <span>N 0°</span>
        <span>E 90°</span>
        <span>S 180°</span>
        <span>W 270°</span>
        <span>N 360°</span>
      </div>
    </figure>
  );
}
