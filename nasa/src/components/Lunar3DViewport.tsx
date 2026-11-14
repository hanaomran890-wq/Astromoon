import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useMission, useCurrentSample, useMissionTime } from '../context/MissionContext.tsx';
import {
  LANDING_SITES,
  MOON_RADIUS_KM,
  DEM_MAX_RADIUS_KM,
  DEM_MIN_LAT,
} from '../lib/constants.ts';
import {
  latLonToVector,
  polarToLatLon,
  pixelToPolar,
  heightAt,
  formatLat,
  formatLon,
  moonToThree,
  threeToMoon,
  vectorToLatLon,
  sampleDem,
} from '../lib/dem.ts';
import { getEphemeris } from '../lib/ephemeris.ts';
import { createShadingWorker } from '../lib/shadingWorker.ts';
import { StatusDot, cn } from './UIElements.tsx';
import {
  Globe,
  Compass,
  Crosshair,
  Footprints,
} from 'lucide-react';
import { CameraPreset, ShadingMode } from '../types/mission.ts';

const CAMERA_PRESETS: { id: CameraPreset; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'globe', label: 'Globe', icon: Globe },
  { id: 'pole', label: 'Pole', icon: Compass },
  { id: 'site', label: 'Site', icon: Crosshair },
  { id: 'ground', label: 'Ground', icon: Footprints },
];

const SHADING_MODES: { id: ShadingMode; label: string }[] = [
  { id: 'sunlight', label: 'Sunlight' },
  { id: 'illumination', label: 'Illum. map' },
  { id: 'slope', label: 'Slope' },
  { id: 'elevation', label: 'Elevation' },
  { id: 'hillshade', label: 'Hillshade' },
];

function h8(elevationM: number, exaggeration: number): number {
  return 1 + (elevationM * exaggeration) / (1e3 * MOON_RADIUS_KM);
}

function getSurfacePoint(
  dem: any,
  lat: number,
  lon: number,
  exaggeration: number,
  mastHeightM = 0,
): THREE.Vector3 {
  const rawH = dem ? heightAt(dem, lat, lon) : 0;
  const elevM = Number.isFinite(rawH) ? rawH : 0;
  const r = 1 + ((elevM + mastHeightM / Math.max(1, exaggeration)) * exaggeration) / (1e3 * MOON_RADIUS_KM);
  const vec = latLonToVector(lat, lon, r);
  const t = moonToThree(vec);
  return new THREE.Vector3(t[0], t[1], t[2]);
}

function getLandingPerimeter(
  dem: any,
  lat: number,
  lon: number,
  radiusKm: number,
  exaggeration: number,
  pointsCount = 48,
): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const s0 = getSurfacePoint(dem, lat, lon, exaggeration);
  const up = s0.clone().normalize();
  const ref = new THREE.Vector3(0, 0, 1);
  const u = ref.sub(up.clone().multiplyScalar(ref.dot(up))).normalize();
  const v = new THREE.Vector3().crossVectors(up, u).normalize();
  const angRadiusRad = radiusKm / MOON_RADIUS_KM;

  for (let i = 0; i <= pointsCount; i++) {
    const theta = (i / pointsCount) * Math.PI * 2;
    const pt = s0
      .clone()
      .normalize()
      .multiplyScalar(Math.cos(angRadiusRad))
      .add(u.clone().multiplyScalar(Math.sin(angRadiusRad) * Math.cos(theta)))
      .add(v.clone().multiplyScalar(Math.sin(angRadiusRad) * Math.sin(theta)))
      .normalize();

    const moonCoords: [number, number, number] = [pt.x, -pt.z, pt.y];
    const { lat: pLat, lon: pLon } = vectorToLatLon(moonCoords);
    const rawElev = dem ? heightAt(dem, pLat, pLon) : 0;
    const elev = Number.isFinite(rawElev) ? rawElev : 0;
    const r = h8(elev, exaggeration) + 0.00003 * exaggeration;
    pts.push(pt.multiplyScalar(r));
  }
  return pts;
}

function createTextSprite(text: string, isSelected = false): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Sprite();

  const fontSize = 28;
  ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace, system-ui, sans-serif`;
  const textMetrics = ctx.measureText(text);
  const textWidth = Math.ceil(textMetrics.width);

  const padX = 22;
  canvas.width = Math.max(128, textWidth + padX * 2);
  canvas.height = 64;

  ctx.font = `bold ${fontSize}px "JetBrains Mono", monospace, system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';

  const w = canvas.width;
  const h = canvas.height;
  const r = 10;

  ctx.fillStyle = isSelected ? 'rgba(7, 15, 30, 0.88)' : 'rgba(15, 20, 28, 0.82)';
  ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = isSelected ? 3.5 : 2;

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(2, 2, w - 4, h - 4, r);
  } else {
    ctx.rect(2, 2, w - 4, h - 4);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isSelected ? '#38bdf8' : '#f8fafc';
  ctx.fillText(text, w / 2, h / 2 + 1);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(mat);
  const aspect = canvas.width / canvas.height;
  sprite.userData = { aspect, isSelected };
  sprite.center.set(0.5, 0);
  return sprite;
}

export function Lunar3DViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const {
    dem,
    demError,
    mission,
    setCustomSite,
    visual,
    setVisual,
    view,
    requestView,
    analysis,
    settings,
    startMs,
    durationH,
  } = useMission();
  const { cursorH } = useMissionTime();
  const currentSample = useCurrentSample();
  const [renderStats, setRenderStats] = useState<{ renderMs: number; busy: boolean }>({
    renderMs: 12,
    busy: false,
  });
  const isSunlit = (currentSample?.sunFraction ?? 0) >= 0.5;

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Mesh and Texture references
  const globeMeshRef = useRef<THREE.Mesh | null>(null);
  const polarMeshRef = useRef<THREE.Mesh | null>(null);
  const polarTextureRef = useRef<THREE.DataTexture | null>(null);
  const sunMarkerRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const earthMarkerRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const graticuleGroupRef = useRef<THREE.Group | null>(null);
  const starFieldRef = useRef<THREE.Points | null>(null);
  const labelsGroupRef = useRef<THREE.Group | null>(null);
  const siteMarkerGroupRef = useRef<THREE.Group | null>(null);
  const candidatesGroupRef = useRef<THREE.Group | null>(null);
  const pulsingRingRef = useRef<THREE.Mesh | null>(null);

  // Camera transition state
  const cameraAnimRef = useRef<{
    active: boolean;
    t: number;
    fromP: THREE.Vector3;
    fromT: THREE.Vector3;
    fromU: THREE.Vector3;
    pos: THREE.Vector3;
    target: THREE.Vector3;
    up: THREE.Vector3;
  }>({
    active: false,
    t: 1,
    fromP: new THREE.Vector3(0.9, -2.6, 1.9),
    fromT: new THREE.Vector3(0, -0.2, 0),
    fromU: new THREE.Vector3(0, -1, 0),
    pos: new THREE.Vector3(0.9, -2.6, 1.9),
    target: new THREE.Vector3(0, -0.2, 0),
    up: new THREE.Vector3(0, -1, 0),
  });

  // Calculate current celestial directions
  const currentEpochMs = startMs + cursorH * 3600 * 1000;
  const ephemeris = useMemo(() => getEphemeris(new Date(currentEpochMs)), [currentEpochMs]);
  const sunDir = useMemo(() => {
    const v = moonToThree(ephemeris.sunDir);
    return new THREE.Vector3(v[0], v[1], v[2]).normalize();
  }, [ephemeris.sunDir]);
  const earthDir = useMemo(() => {
    const v = moonToThree(ephemeris.earthPos);
    return new THREE.Vector3(v[0], v[1], v[2]).normalize();
  }, [ephemeris.earthPos]);

  // Worker for real-time DEM shading texture generation
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<number>(0);

  // Initialize Worker
  useEffect(() => {
    if (!dem) return;
    const worker = createShadingWorker();
    workerRef.current = worker;
    const demCopy = new Float32Array(dem.data);
    worker.postMessage(
      {
        type: 'init',
        data: demCopy,
        size: dem.size,
        min: dem.min,
        max: dem.max,
      },
      [demCopy.buffer]
    );
    worker.onmessage = (e: MessageEvent) => {
      const { pixels, res, ms } = e.data;
      setRenderStats({ renderMs: Math.round(ms), busy: false });
      if (polarTextureRef.current && polarTextureRef.current.image?.data && polarTextureRef.current.image.width === res) {
        (polarTextureRef.current.image.data as Uint8ClampedArray).set(pixels);
        polarTextureRef.current.needsUpdate = true;
        if (polarMeshRef.current) {
          (polarMeshRef.current.material as THREE.MeshBasicMaterial).map = polarTextureRef.current;
          (polarMeshRef.current.material as THREE.MeshBasicMaterial).color.set(0xffffff);
          (polarMeshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
      } else {
        if (polarTextureRef.current) polarTextureRef.current.dispose();
        const tex = new THREE.DataTexture(pixels, res, res, THREE.RGBAFormat);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.LinearFilter;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.generateMipmaps = true;
        tex.anisotropy = 8;
        tex.flipY = false;
        tex.needsUpdate = true;
        polarTextureRef.current = tex;
        if (polarMeshRef.current) {
          (polarMeshRef.current.material as THREE.MeshBasicMaterial).map = tex;
          (polarMeshRef.current.material as THREE.MeshBasicMaterial).color.set(0xffffff);
          (polarMeshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
        }
      }
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, [dem]);

  // Request shading render on state changes
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker || !dem) return;
    requestIdRef.current += 1;
    setRenderStats((prev) => ({ ...prev, busy: true }));

    const suns: [number, number, number][] = [];
    if (visual.shadingMode === 'illumination') {
      for (let i = 0; i < 16; i++) {
        const ep = getEphemeris(new Date(startMs + (i / 15) * durationH * 3600 * 1000));
        suns.push(ep.sunDir);
      }
    }
    worker.postMessage({
      type: 'render',
      id: requestIdRef.current,
      mode: visual.shadingMode,
      res: visual.shadingMode === 'illumination' ? Math.min(512, visual.shadingRes) : visual.shadingRes,
      sun: ephemeris.sunDir,
      suns: visual.shadingMode === 'illumination' ? suns : undefined,
      exposure: visual.exposure,
      earthshine: visual.earthshine,
      slopeLimit: analysis.slopeLimitDeg,
      shadows: visual.shadows,
      solarModel: settings.solarModel,
    });
  }, [
    dem,
    visual.shadingMode,
    visual.shadingRes,
    visual.exposure,
    visual.earthshine,
    visual.shadows,
    analysis.slopeLimitDeg,
    settings.solarModel,
    ephemeris.sunDir,
    startMs,
    durationH,
  ]);

  // Main Three.js Scene Setup
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020307);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.0004, 4000);
    camera.position.set(0.9, -2.6, 1.9);
    camera.up.set(0, -1, 0);
    camera.lookAt(0, -0.2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: settings.antiAliasing,
      logarithmicDepthBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(settings.highDpi ? Math.min(window.devicePixelRatio || 1, 2) : 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = visual.exposure;
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.003;
    controls.maxDistance = 12;
    controls.zoomSpeed = 0.9;
    controls.autoRotate = visual.autoRotate;
    controls.autoRotateSpeed = 0.35;
    controls.target.set(0, -0.2, 0);
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.035);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.4);
    dirLight.position.set(sunDir.x * 10, sunDir.y * 10, sunDir.z * 10);
    scene.add(dirLight);
    sunLightRef.current = dirLight;

    // Starfield
    const starsGeo = new THREE.BufferGeometry();
    const starCount = 7000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize().multiplyScalar(1200 + Math.random() * 300);
      starPos[i] = v.x;
      starPos[i + 1] = v.y;
      starPos[i + 2] = v.z;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starsMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.8,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starsGeo, starsMat);
    starField.visible = visual.showStars;
    scene.add(starField);
    starFieldRef.current = starField;

    // Global Moon Sphere
    const textureLoader = new THREE.TextureLoader();
    const maxTheta = ((90 - DEM_MIN_LAT + 0.08) / 180) * Math.PI;
    const moonGeo = new THREE.SphereGeometry(0.99985, 256, 128, 0, 2 * Math.PI, 0, maxTheta);
    const moonColorTex = textureLoader.load('/textures/moon-color-4k.jpg');
    moonColorTex.colorSpace = THREE.SRGBColorSpace;
    moonColorTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const moonBumpTex = textureLoader.load('/textures/moon-displacement-4k.jpg');
    moonBumpTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonColorTex,
      bumpMap: moonBumpTex,
      bumpScale: 4.0,
      roughness: 1.0,
      metalness: 0.0,
      wireframe: settings.wireframe,
    });
    const globeMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(globeMesh);
    globeMeshRef.current = globeMesh;

    // Sun Marker
    const sunGroup = new THREE.Group();
    const sunAngularRad = (0.2666 * Math.PI) / 180;
    const sunBaseRad = 400 * Math.tan(sunAngularRad);
    const sunCore = new THREE.Mesh(
      new THREE.SphereGeometry(sunBaseRad, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff6e0, toneMapped: false })
    );
    const sunHalo1 = new THREE.Mesh(
      new THREE.SphereGeometry(2.4 * sunBaseRad, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffd27a,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const sunHalo2 = new THREE.Mesh(
      new THREE.SphereGeometry(5.0 * sunBaseRad, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffb84d,
        transparent: true,
        opacity: 0.04,
        depthWrite: false,
        toneMapped: false,
        blending: THREE.AdditiveBlending,
      })
    );
    sunGroup.add(sunCore, sunHalo1, sunHalo2);
    sunGroup.position.copy(sunDir).multiplyScalar(400);
    scene.add(sunGroup);
    sunMarkerRef.current = sunGroup;

    // Earth Sphere
    const earthGroup = new THREE.Group();
    const earthTex = textureLoader.load('/textures/earth-blue-marble-2k.jpg');
    earthTex.colorSpace = THREE.SRGBColorSpace;
    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 64, 64),
      new THREE.MeshLambertMaterial({
        map: earthTex,
        emissive: 0x0b1d3a,
        emissiveIntensity: 0.15,
      })
    );
    earthMeshRef.current = earthMesh;
    const earthGlow = new THREE.Mesh(
      new THREE.SphereGeometry(1.04, 48, 48),
      new THREE.MeshBasicMaterial({
        color: 0x5aa9ff,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
    );
    earthGroup.add(earthMesh, earthGlow);
    earthGroup.position.copy(earthDir).multiplyScalar(60);
    earthGroup.visible = visual.showEarth;
    scene.add(earthGroup);
    earthMarkerRef.current = earthGroup;

    // Graticule Group
    const graticuleGroup = new THREE.Group();
    const gratR = 1 + (7400 * visual.exaggeration) / 1737400;
    [-80, -82, -84, -86, -88, -89].forEach((lat) => {
      const isMajor = lat % 5 === 0;
      const pts: THREE.Vector3[] = [];
      for (let n = 0; n <= 180; n++) {
        const v = moonToThree(latLonToVector(lat, 2 * n, gratR));
        pts.push(new THREE.Vector3(v[0], v[1], v[2]));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: isMajor ? 0x93c5fd : 0x94a3b8,
        transparent: true,
        opacity: isMajor ? 0.35 : 0.18,
        depthTest: false,
      });
      graticuleGroup.add(new THREE.Line(geo, mat));
    });

    for (let lon = -180; lon < 180; lon += 30) {
      const isMajor = lon % 90 === 0;
      const pts: THREE.Vector3[] = [];
      for (let lat = DEM_MIN_LAT; lat >= -89.8; lat -= 0.25) {
        const v = moonToThree(latLonToVector(lat, lon, gratR));
        pts.push(new THREE.Vector3(v[0], v[1], v[2]));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: isMajor ? 0x93c5fd : 0x94a3b8,
        transparent: true,
        opacity: isMajor ? 0.35 : 0.18,
        depthTest: false,
      });
      graticuleGroup.add(new THREE.Line(geo, mat));
    }
    scene.add(graticuleGroup);
    graticuleGroupRef.current = graticuleGroup;

    // Marker Groups
    const siteGroup = new THREE.Group();
    scene.add(siteGroup);
    siteMarkerGroupRef.current = siteGroup;

    const candGroup = new THREE.Group();
    scene.add(candGroup);
    candidatesGroupRef.current = candGroup;

    const labelsGroup = new THREE.Group();
    labelsGroup.visible = visual.showLabels;
    scene.add(labelsGroup);
    labelsGroupRef.current = labelsGroup;

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop with Target FPS throttling
    let animId: number;
    let prevTime = performance.now();
    const frameInterval = 1000 / Math.max(15, settings.targetFps || 60);
    let lastRenderTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const elapsedSinceLastRender = time - lastRenderTime;
      if (elapsedSinceLastRender < frameInterval - 1) {
        return;
      }
      lastRenderTime = time - (elapsedSinceLastRender % frameInterval);

      const dt = Math.min(0.1, (time - prevTime) / 1000);
      prevTime = time;

      const anim = cameraAnimRef.current;
      if (anim.active) {
        anim.t = Math.min(1, anim.t + dt / 1.6);
        const ease = anim.t < 0.5 ? 4 * anim.t * anim.t * anim.t : 1 - Math.pow(-2 * anim.t + 2, 3) / 2;
        camera.position.lerpVectors(anim.fromP, anim.pos, ease);
        controls.target.lerpVectors(anim.fromT, anim.target, ease);
        camera.up.lerpVectors(anim.fromU, anim.up, ease).normalize();
        controls.update();
        if (anim.t >= 1) {
          anim.active = false;
        }
      } else {
        controls.update();
      }

      if (earthMeshRef.current) {
        const earthRotation = ((currentEpochMs / 86400000) % 1) * Math.PI * 2;
        earthMeshRef.current.rotation.y = earthRotation;
      }

      if (pulsingRingRef.current && cameraRef.current) {
        const targetPos = getSurfacePoint(dem, mission.lat, mission.lon, visual.exaggeration);
        const dist = cameraRef.current.position.distanceTo(targetPos);
        const cycle = ((time / 1000) % 1.6) / 1.6;
        pulsingRingRef.current.scale.setScalar(0.012 * dist * (1 + 2.2 * cycle));
        (pulsingRingRef.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - cycle);
      }

      if (labelsGroupRef.current && visual.showLabels && camera) {
        for (let i = 0; i < labelsGroupRef.current.children.length; i++) {
          const child = labelsGroupRef.current.children[i];
          if (child instanceof THREE.Sprite) {
            const dist = camera.position.distanceTo(child.position);
            const isSel = (child.userData.isSelected as boolean) ?? false;
            const aspect = (child.userData.aspect as number) || 2.5;
            const baseFactor = isSel ? 0.024 : 0.018;
            const scaleFactor = Math.min(Math.max(dist * baseFactor, 0.0035), 0.05);
            child.scale.set(scaleFactor * aspect, scaleFactor, 1);
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate(performance.now());

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  // Sync settings: AntiAliasing, HighDPI, Wireframe, Exposure, AutoRotate, Graticule, Stars, Earth, Labels
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.toneMappingExposure = visual.exposure;
      rendererRef.current.setPixelRatio(settings.highDpi ? Math.min(window.devicePixelRatio || 1, 2) : 1);
    }
    if (controlsRef.current) {
      controlsRef.current.autoRotate = visual.autoRotate;
    }
    if (graticuleGroupRef.current) {
      graticuleGroupRef.current.visible = visual.showGraticule;
    }
    if (starFieldRef.current) {
      starFieldRef.current.visible = visual.showStars;
    }
    if (earthMarkerRef.current) {
      earthMarkerRef.current.visible = visual.showEarth;
    }
    if (labelsGroupRef.current) {
      labelsGroupRef.current.visible = visual.showLabels;
    }
    if (globeMeshRef.current) {
      (globeMeshRef.current.material as THREE.MeshStandardMaterial).wireframe = settings.wireframe;
    }
    if (polarMeshRef.current) {
      (polarMeshRef.current.material as THREE.MeshBasicMaterial).wireframe = settings.wireframe;
    }
  }, [
    visual.exposure,
    visual.autoRotate,
    visual.showGraticule,
    visual.showStars,
    visual.showEarth,
    visual.showLabels,
    settings.highDpi,
    settings.wireframe,
  ]);

  // Update Light Positions
  useEffect(() => {
    if (sunLightRef.current) {
      sunLightRef.current.position.set(sunDir.x * 10, sunDir.y * 10, sunDir.z * 10);
    }
    if (sunMarkerRef.current) {
      sunMarkerRef.current.position.copy(sunDir).multiplyScalar(400);
    }
    if (earthMarkerRef.current) {
      earthMarkerRef.current.position.copy(earthDir).multiplyScalar(60);
    }
  }, [sunDir, earthDir]);

  // Construct Polar Terrain 3D Mesh from LOLA DEM
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !dem) return;

    if (polarMeshRef.current) {
      scene.remove(polarMeshRef.current);
      polarMeshRef.current.geometry.dispose();
      polarMeshRef.current = null;
    }

    const segments = Math.min(256, Math.max(64, visual.meshSegments));
    const vertsPerSide = segments + 1;
    const vertexCount = vertsPerSide * vertsPerSide;
    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);

    for (let row = 0; row < vertsPerSide; row++) {
      for (let col = 0; col < vertsPerSide; col++) {
        const u = (col / segments) * dem.size;
        const v = (row / segments) * dem.size;
        let { x: c, y: h } = pixelToPolar(u, v, dem.size);
        const dist = Math.hypot(c, h);
        if (dist > DEM_MAX_RADIUS_KM) {
          c *= DEM_MAX_RADIUS_KM / dist;
          h *= DEM_MAX_RADIUS_KM / dist;
        }
        const clampedDist = Math.min(dist, DEM_MAX_RADIUS_KM);
        const taper = Math.min(1, Math.max(0, (DEM_MAX_RADIUS_KM - clampedDist) / 20));

        const demS = dem.size / 2 + c / dem.pixelKm;
        const demL = dem.size / 2 - h / dem.pixelKm;
        const elev = sampleDem(dem.data, dem.size, demS, demL, true);

        const { lat, lon } = polarToLatLon(c, h);
        const rad = h8((Number.isFinite(elev) ? elev : 0) * taper, visual.exaggeration * taper + (1 - taper));
        const moonPos = latLonToVector(lat, lon, rad);
        const threePos = moonToThree(moonPos);

        const idx = (row * vertsPerSide + col) * 3;
        positions[idx] = threePos[0];
        positions[idx + 1] = threePos[1];
        positions[idx + 2] = threePos[2];

        const uvIdx = (row * vertsPerSide + col) * 2;
        uvs[uvIdx] = demS / dem.size;
        uvs[uvIdx + 1] = demL / dem.size;
      }
    }

    const indices = new Uint32Array(segments * segments * 6);
    let o = 0;
    for (let r = 0; r < segments; r++) {
      for (let c = 0; c < segments; c++) {
        const i0 = r * vertsPerSide + c;
        const i1 = i0 + 1;
        const i2 = i0 + vertsPerSide;
        const i3 = i2 + 1;
        indices[o++] = i0;
        indices[o++] = i2;
        indices[o++] = i1;
        indices[o++] = i1;
        indices[o++] = i2;
        indices[o++] = i3;
      }
    }

    const polarGeo = new THREE.BufferGeometry();
    polarGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    polarGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    polarGeo.setIndex(new THREE.BufferAttribute(indices, 1));
    polarGeo.computeBoundingSphere();

    const polarMat = new THREE.MeshBasicMaterial({
      map: polarTextureRef.current || null,
      color: polarTextureRef.current ? 0xffffff : 0x1a1c22,
      side: THREE.DoubleSide,
      toneMapped: false,
      wireframe: settings.wireframe,
    });

    const polarMesh = new THREE.Mesh(polarGeo, polarMat);
    polarMesh.name = 'polar-terrain';
    scene.add(polarMesh);
    polarMeshRef.current = polarMesh;
  }, [dem, visual.meshSegments, visual.exaggeration, settings.wireframe]);

  // Update Landing Site Markers, Beacon, Rays, and Landing Ellipse
  useEffect(() => {
    const siteGroup = siteMarkerGroupRef.current;
    if (!siteGroup || !dem) return;
    siteGroup.clear();
    pulsingRingRef.current = null;

    const surfacePoint = getSurfacePoint(dem, mission.lat, mission.lon, visual.exaggeration);
    const normal = surfacePoint.clone().normalize();
    const mastPoint = surfacePoint.clone().add(normal.clone().multiplyScalar(0.012));

    const pinGeo = new THREE.BufferGeometry().setFromPoints([surfacePoint, mastPoint]);
    const pinMat = new THREE.LineBasicMaterial({ color: 0x7dd3fc, linewidth: 2 });
    siteGroup.add(new THREE.Line(pinGeo, pinMat));

    const beaconGeo = new THREE.SphereGeometry(0.0012, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, toneMapped: false });
    const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
    beaconMesh.position.copy(mastPoint);
    siteGroup.add(beaconMesh);

    const ringGeo = new THREE.RingGeometry(0.8, 1.0, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.copy(surfacePoint);
    ringMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    siteGroup.add(ringMesh);
    pulsingRingRef.current = ringMesh;

    if (visual.showEllipse) {
      const ellipseRadius = Math.max(0.1, analysis.ellipseRadiusKm);
      const ellipsePts = getLandingPerimeter(dem, mission.lat, mission.lon, ellipseRadius, visual.exaggeration);
      const ellipseGeo = new THREE.BufferGeometry().setFromPoints(ellipsePts);
      const ellipseMat = new THREE.LineBasicMaterial({
        color: 0x7dd3fc,
        linewidth: 1.5,
        transparent: true,
        opacity: 0.95,
      });
      siteGroup.add(new THREE.Line(ellipseGeo, ellipseMat));

      const zone5kPts = getLandingPerimeter(dem, mission.lat, mission.lon, 5.0, visual.exaggeration);
      const zone5kGeo = new THREE.BufferGeometry().setFromPoints(zone5kPts);
      const zone5kMat = new THREE.LineDashedMaterial({
        color: 0x7dd3fc,
        linewidth: 1,
        dashSize: 0.002,
        gapSize: 0.0015,
        transparent: true,
        opacity: 0.5,
      });
      const zone5kLine = new THREE.Line(zone5kGeo, zone5kMat);
      zone5kLine.computeLineDistances();
      siteGroup.add(zone5kLine);
    }

    if (visual.showSunRay) {
      const sunEnd = surfacePoint.clone().add(sunDir.clone().multiplyScalar(0.06));
      const sunGeo = new THREE.BufferGeometry().setFromPoints([surfacePoint, sunEnd]);
      const sunMat = isSunlit
        ? new THREE.LineBasicMaterial({ color: 0xfbbf24, linewidth: 2 })
        : new THREE.LineDashedMaterial({ color: 0x78716c, linewidth: 1.5, dashSize: 0.003, gapSize: 0.002 });
      const sunLine = new THREE.Line(sunGeo, sunMat);
      if (!isSunlit) sunLine.computeLineDistances();
      siteGroup.add(sunLine);
    }

    if (visual.showEarthRay) {
      const earthVisible = currentSample?.earthVisible ?? false;
      const earthEnd = surfacePoint.clone().add(earthDir.clone().multiplyScalar(0.06));
      const earthGeo = new THREE.BufferGeometry().setFromPoints([surfacePoint, earthEnd]);
      const earthMat = earthVisible
        ? new THREE.LineBasicMaterial({ color: 0x60a5fa, linewidth: 2 })
        : new THREE.LineDashedMaterial({ color: 0x64748b, linewidth: 1.5, dashSize: 0.003, gapSize: 0.002 });
      const earthLine = new THREE.Line(earthGeo, earthMat);
      if (!earthVisible) earthLine.computeLineDistances();
      siteGroup.add(earthLine);
    }
  }, [
    dem,
    mission.lat,
    mission.lon,
    visual.exaggeration,
    visual.showEllipse,
    visual.showSunRay,
    visual.showEarthRay,
    analysis.ellipseRadiusKm,
    sunDir,
    earthDir,
    isSunlit,
    currentSample?.earthVisible,
  ]);

  // Candidate Sites Markers
  useEffect(() => {
    const candGroup = candidatesGroupRef.current;
    if (!candGroup || !dem) return;
    candGroup.clear();
    if (!visual.showCandidates) return;

    LANDING_SITES.forEach((site) => {
      if (site.id === mission.siteId) return;
      const pos = getSurfacePoint(dem, site.lat, site.lon, visual.exaggeration, 150);
      const isArtemis = site.category === 'artemis';
      const sphereGeo = new THREE.SphereGeometry(0.0009, 12, 12);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: isArtemis ? 0xf5f5f4 : 0xa8a29e,
        toneMapped: false,
      });
      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      sphereMesh.position.copy(pos);
      candGroup.add(sphereMesh);
    });
  }, [dem, visual.showCandidates, mission.siteId, visual.exaggeration]);

  // Site Labels (Active Site & Candidate Sites)
  useEffect(() => {
    const labelsGroup = labelsGroupRef.current;
    if (!labelsGroup || !dem) return;

    while (labelsGroup.children.length > 0) {
      const child = labelsGroup.children[0];
      if (child instanceof THREE.Sprite) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
      labelsGroup.remove(child);
    }

    // 1. Label for current active landing site
    const surfacePoint = getSurfacePoint(dem, mission.lat, mission.lon, visual.exaggeration);
    const normal = surfacePoint.clone().normalize();
    const siteLabelPos = surfacePoint.clone().add(normal.clone().multiplyScalar(0.016));
    const activeSprite = createTextSprite(mission.siteName, true);
    activeSprite.position.copy(siteLabelPos);
    labelsGroup.add(activeSprite);

    // 2. Labels for candidate sites
    if (visual.showCandidates) {
      LANDING_SITES.forEach((site) => {
        if (site.id === mission.siteId) return;
        const pos = getSurfacePoint(dem, site.lat, site.lon, visual.exaggeration, 150);
        const candNormal = pos.clone().normalize();
        const candLabelPos = pos.clone().add(candNormal.clone().multiplyScalar(0.008));
        const candSprite = createTextSprite(site.shortName, false);
        candSprite.position.copy(candLabelPos);
        labelsGroup.add(candSprite);
      });
    }

    labelsGroup.visible = visual.showLabels;
  }, [
    dem,
    mission.siteId,
    mission.siteName,
    mission.lat,
    mission.lon,
    visual.showCandidates,
    visual.showLabels,
    visual.exaggeration,
  ]);

  // Handle Camera Presets Transitions
  useEffect(() => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const anim = cameraAnimRef.current;
    anim.fromP.copy(camera.position);
    anim.fromT.copy(controls.target);
    anim.fromU.copy(camera.up);
    anim.t = 0;
    anim.active = true;

    if (view.preset === 'globe') {
      anim.pos.set(0.9, -2.6, 1.9);
      anim.target.set(0, -0.2, 0);
      anim.up.set(0, -1, 0);
    } else if (view.preset === 'pole') {
      anim.pos.set(0, -1.5, 0.16);
      anim.target.set(0, -1, 0);
      anim.up.set(0, -1, 0);
    } else {
      const surfacePoint = getSurfacePoint(dem, mission.lat, mission.lon, visual.exaggeration);
      const normal = surfacePoint.clone().normalize();
      const ref = new THREE.Vector3(0, 0, 1);
      const tangent = ref.sub(normal.clone().multiplyScalar(ref.dot(normal))).normalize();

      if (view.preset === 'site') {
        anim.pos = surfacePoint.clone().addScaledVector(normal, 0.055).addScaledVector(tangent, 0.035);
        anim.target = surfacePoint.clone();
        anim.up = normal.clone();
      } else if (view.preset === 'ground') {
        let c = sunDir.clone().sub(normal.clone().multiplyScalar(sunDir.dot(normal)));
        if (c.lengthSq() < 1e-8) c.copy(tangent);
        c.normalize();
        anim.pos = surfacePoint.clone().addScaledVector(normal, 0.0016).addScaledVector(c, -0.006);
        anim.target = surfacePoint.clone().addScaledVector(c, 0.05).addScaledVector(normal, 0.0015);
        anim.up = normal.clone();
      }
    }
  }, [view.preset, view.nonce, dem, mission.lat, mission.lon, visual.exaggeration, sunDir]);

  // Double Click on 3D Viewport to pick custom South Polar Landing Site
  const handleDoubleClick = (e: React.MouseEvent) => {
    const container = containerRef.current;
    const camera = cameraRef.current;
    const scene = sceneRef.current;
    if (!container || !camera || !scene || !dem) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    for (const hit of intersects) {
      if (hit.object.name === 'polar-terrain' || hit.object === globeMeshRef.current) {
        const moonPos = threeToMoon([hit.point.x, hit.point.y, hit.point.z]);
        const { lat, lon } = vectorToLatLon(moonPos);
        if (lat <= DEM_MIN_LAT - 0.2) {
          setCustomSite(lat, lon);
          break;
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      className="relative h-full min-h-[420px] w-full overflow-hidden bg-[#020307] select-none"
    >
      <canvas ref={canvasRef} className="block size-full touch-none" />

      {/* Radial vignette overlay */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55))]"
        aria-hidden="true"
      />

      {/* Top Controls Bar: Camera Presets & Terrain Shading */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
        {/* Camera Preset Toolbar */}
        <div
          className="pointer-events-auto flex items-center gap-0.5 rounded-md border border-border bg-background/80 p-0.5 backdrop-blur shadow-sm"
          role="group"
          aria-label="Camera view"
        >
          {CAMERA_PRESETS.map((preset) => {
            const Icon = preset.icon;
            const active = view.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => requestView(preset.id)}
                aria-pressed={active}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded px-2.5 font-mono text-[10.5px] uppercase tracking-wider transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Shading Mode Toolbar */}
        <div
          className="pointer-events-auto flex flex-wrap items-center gap-0.5 rounded-md border border-border bg-background/80 p-0.5 backdrop-blur shadow-sm"
          role="group"
          aria-label="Terrain shading"
        >
          {SHADING_MODES.map((mode) => {
            const active = visual.shadingMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setVisual({ shadingMode: mode.id })}
                aria-pressed={active}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded px-2.5 font-mono text-[10.5px] uppercase tracking-wider transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom-Left Telemetry & Shading Legend */}
      <div className="pointer-events-none absolute bottom-0 left-0 flex max-w-full flex-col gap-2 p-3">
        <div className="rounded-md border border-border bg-background/85 px-3 py-2 backdrop-blur shadow-md space-y-1.5">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="font-semibold text-primary">{mission.siteName}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {formatLat(mission.lat)}   {formatLon(mission.lon)}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1">
              <StatusDot tone={isSunlit ? 'good' : 'warn'} pulse={isSunlit} />
              <span className={isSunlit ? 'text-primary' : 'text-muted-foreground'}>
                {isSunlit ? 'Sunlit' : 'Shadow'}
              </span>
            </span>
          </div>

          {/* Shading Mode Legend */}
          <div className="flex items-center gap-2">
            {visual.shadingMode === 'slope' && (
              <div className="flex items-center gap-2 font-mono text-[9.5px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-[#33bf73]" /> ≤ {(analysis.slopeLimitDeg / 2).toFixed(0)}°
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-[#9ed14d]" /> ≤ {analysis.slopeLimitDeg}°
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-[#f5b333]" /> ≤ {2 * analysis.slopeLimitDeg}°
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-[#f0612e]" /> ≤ {3 * analysis.slopeLimitDeg}°
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-xs bg-[#c71f29]" /> &gt; {3 * analysis.slopeLimitDeg}°
                </span>
              </div>
            )}
            {visual.shadingMode === 'elevation' && (
              <div className="flex items-center gap-2 font-mono text-[9.5px] text-muted-foreground">
                <span>Low</span>
                <span
                  className="h-2 w-28 rounded-xs"
                  style={{
                    background: 'linear-gradient(90deg, #440154, #3b528b, #21918c, #5ec962, #fde725)',
                  }}
                />
                <span>High</span>
              </div>
            )}
            {visual.shadingMode === 'illumination' && (
              <div className="flex items-center gap-2 font-mono text-[9.5px] text-muted-foreground">
                <span>0%</span>
                <span
                  className="h-2 w-28 rounded-xs"
                  style={{
                    background: 'linear-gradient(90deg, #000004, #420a68, #932667, #dd513a, #fca50a, #fcffa4)',
                  }}
                />
                <span>100% Lit</span>
              </div>
            )}
            {(visual.shadingMode === 'sunlight' || visual.shadingMode === 'hillshade') && (
              <div className="flex items-center gap-2 font-mono text-[9.5px] text-muted-foreground">
                <span>Raymarched Lunar Shadows & Relief</span>
              </div>
            )}
          </div>
        </div>

        {/* Engine Performance & DEM Status */}
        <div className="flex items-center gap-2 font-mono text-[9.5px] text-muted-foreground/80 px-1">
          <span>LOLA 297m DEM (2048²)</span>
          <span>•</span>
          <span>{renderStats.busy ? 'Rendering...' : `${renderStats.renderMs}ms frame`}</span>
          <span>•</span>
        </div>
      </div>

      {/* Loading Overlay */}
      {!dem && (
        <div className="absolute inset-0 grid place-items-center bg-background/60 backdrop-blur-sm z-20 pointer-events-none">
          <div className="flex flex-col items-center gap-3 text-center">
            {demError ? (
              <>
                <span className="font-mono text-xs uppercase tracking-widest text-destructive font-semibold">
                  DEM load failure
                </span>
                <span className="max-w-xs text-sm text-muted-foreground font-mono">
                  {String(demError)}
                </span>
              </>
            ) : (
              <>
                <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="font-mono text-xs uppercase tracking-widest text-foreground font-semibold">
                  Acquiring LOLA terrain
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  LDEM_80S • 2048² • 297 m/px
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
