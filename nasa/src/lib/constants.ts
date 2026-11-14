import {
  LandingSite,
  LanderProfile,
  VisualSettings,
  AnalysisConstraints,
  DataSourceItem,
} from '../types/mission.ts';

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;
export const MOON_RADIUS_KM = 1737.4;
export const EARTH_RADIUS_KM = 6371.0;
export const SPEED_OF_LIGHT_KMS = 299792.458;
export const SOLAR_CONSTANT = 1361.0; // W/m^2 (SORCE/TIM & IAU accepted standard)
export const SUN_ANGULAR_RADIUS_DEG = 0.2666; // approx 16 arcmin
export const STEFAN_BOLTZMANN = 5.670374419e-8; // W/(m^2 K^4)
export const GEOTHERMAL_FLUX = 0.018; // W/m^2 lunar internal heat flow (Langseth et al. Apollo 15/17)
export const LUNAR_AU_KM = 149597870.7;

export const DEM_SIZE = 2048;
export const DEM_EXTENT_KM = 608;
export const DEM_PIXEL_KM = 0.296875;
export const DEM_MIN_LAT = -80.0;
export const DEM_MAX_RADIUS_KM = 3474.8 * Math.tan(Math.PI / 4 + (-80.0 * D2R) / 2);
export const DEM_URL = '/data/lola-south-pole-2048.delta.bin.gz';

export const DEFAULT_CONSTRAINTS: AnalysisConstraints = {
  mastHeightM: 2,
  horizonStepDeg: 0.5,
  horizonRangeKm: 250,
  panelAreaM2: 12,
  panelEfficiency: 0.3,
  loadPowerW: 1200,
  batteryKWh: 60,
  commMaskDeg: 2,
  slopeLimitDeg: 8,
  ellipseRadiusKm: 1,
  albedo: 0.12,
  emissivity: 0.95,
};

export const DEFAULT_VISUAL: VisualSettings = {
  shadingMode: 'sunlight',
  shadingRes: 768,
  meshSegments: 384,
  exaggeration: 2,
  shadows: true,
  exposure: 1.4,
  earthshine: 0.02,
  showGraticule: true,
  showCandidates: true,
  showLabels: true,
  showSunRay: true,
  showEarthRay: true,
  showEllipse: true,
  showStars: true,
  showEarth: true,
  autoRotate: false,
};

export const CATEGORY_LABEL: Record<string, string> = {
  artemis: 'Artemis III candidate region',
  rim: 'Crater rim / ridge',
  psr: 'Permanently shadowed region',
  robotic: 'Robotic mission site',
  massif: 'Massif / mountain',
};

const NASA_ARTEMIS_SRC = {
  label: 'NASA — Updated Artemis III Candidate Landing Regions (Oct 28, 2024)',
  url: 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/',
};
const NASA_LOLA_SRC = {
  label: 'NASA GSFC — LOLA Polar DEM LDEM_80S_80M (PDS Geosciences Node)',
  url: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/',
};
const NASA_SVS_SRC = {
  label: 'NASA SVS — CGI Moon Kit (LROC WAC Color + LOLA)',
  url: 'https://svs.gsfc.nasa.gov/4720',
};
const NASA_TREK_SRC = {
  label: 'NASA Moon Trek — Polar GIS & Artemis Landing Region Portal',
  url: 'https://trek.nasa.gov/moon/',
};
const ASU_QUICKMAP_SRC = {
  label: 'Arizona State University (ASU) / LROC Science Operations Center — QuickMap Polar Atlas',
  url: 'https://quickmap.lroc.im-ldi.com/',
};

export const LANDING_SITES: LandingSite[] = [
  // --- Official NASA October 28, 2024 Artemis III Candidate Landing Regions (9 regions) ---
  {
    id: 'mons-mouton-plateau',
    name: 'Mons Mouton Plateau (Artemis III Candidate Region)',
    shortName: 'Mons Mouton Plateau',
    lat: -84.3,
    lon: 30.6,
    category: 'artemis',
    tags: ['Artemis III (Oct 2024)', 'Gentle plateau slope', 'Elevated massif'],
    summary:
      'One of NASA’s nine refined Artemis III candidate landing regions announced in October 2024. Located on the broad, elevated northern plateau of Mons Mouton, its gently sloping highland terrain provides favorable touchdown safety alongside regional illumination and Earth visibility.',
    science: [
      'Ancient South Pole-Aitken basin highland massif preserving early lunar crustal history.',
      'Broad, low-slope plateau accessible for extended rover traverses toward small polar cold traps.',
      'Coordinates denote a representative nominal point inside NASA’s multi-kilometer candidate region.',
    ],
    heritage: 'Refined Artemis III candidate landing region (NASA October 28, 2024 update).',
    sources: [NASA_ARTEMIS_SRC, NASA_TREK_SRC, NASA_LOLA_SRC],
  },
  {
    id: 'mons-mouton',
    name: 'Mons Mouton (Artemis III Candidate Region)',
    shortName: 'Mons Mouton',
    lat: -84.6,
    lon: 31.0,
    category: 'artemis',
    tags: ['Artemis III (Oct 2024)', 'CLPS IM-2 area', 'Elevated'],
    summary:
      'Flat-topped lunar massif named after NASA mathematician Melba Roy Mouton and designated as one of NASA’s nine October 2024 Artemis III candidate landing regions. The Mons Mouton area was also targeted by Intuitive Machines’ IM-2 (Athena) lander under NASA’s CLPS initiative.',
    science: [
      'Elevated massif crest rising > 5 km above the reference sphere with intermittent prolonged sunlight.',
      'Nearby craterlets and small shadowed depressions provide accessible targets for volatile prospecting.',
      'Coordinates mark a nominal reference point within the broader Mons Mouton candidate region.',
    ],
    heritage: 'Artemis III candidate region (Oct 2024) and target massif of NASA CLPS IM-2 (March 2025).',
    sources: [
      NASA_ARTEMIS_SRC,
      {
        label: 'NASA — Commercial Lunar Payload Services (CLPS)',
        url: 'https://www.nasa.gov/commercial-lunar-payload-services/',
      },
      NASA_LOLA_SRC,
    ],
  },
  {
    id: 'malapert-massif',
    name: 'Malapert Massif (Artemis III Candidate Region)',
    shortName: 'Malapert Massif',
    lat: -86.0,
    lon: 2.9,
    category: 'artemis',
    tags: ['Artemis III (Oct 2024)', 'Earth visibility', 'Nearside massif'],
    summary:
      'A ~5 km-high mountain massif on the Earth-facing side of the lunar south pole and one of NASA’s nine October 2024 Artemis III candidate landing regions. Its near-side longitude (~2.9° E) and high elevation provide high-reliability direct-to-Earth (DTE) radio communications.',
    science: [
      'Pre-Imbrian highland massif linked to the outer rim structure of the South Pole-Aitken basin.',
      'High vantage point with strong near-side Earth line-of-sight and favorable plateau slope segments.',
      'Coordinates denote a nominal point inside the multi-kilometer Malapert Massif candidate region.',
    ],
    heritage: 'Retained across NASA’s August 2022 and October 2024 Artemis III candidate lists.',
    sources: [NASA_ARTEMIS_SRC, NASA_TREK_SRC, NASA_LOLA_SRC],
  },
  {
    id: 'de-gerlache-rim-2',
    name: 'de Gerlache Rim 2 (Artemis III Candidate Region)',
    shortName: 'de Gerlache Rim 2',
    lat: -88.45,
    lon: -67.86,
    category: 'artemis',
    tags: ['Artemis III (Oct 2024)', 'High latitude', 'Crater rim'],
    summary:
      'One of NASA’s nine refined October 2024 Artemis III candidate landing regions, positioned along the elevated rim of the ~32 km de Gerlache crater near 88.5° S. Combines high polar illumination periods with proximity to permanently shadowed crater interiors.',
    science: [
      'Direct access toward cold traps within de Gerlache crater that may preserve hydrogen-bearing volatiles.',
      'High-elevation rim segments provide solar illumination windows and intermittent Earth visibility.',
      'Coordinates denote a nominal rim crest point within the broader de Gerlache Rim 2 region.',
    ],
    heritage: 'Refined Artemis III candidate landing region (NASA October 28, 2024 update).',
    sources: [NASA_ARTEMIS_SRC, NASA_TREK_SRC, NASA_LOLA_SRC],
  },
  {
    id: 'haworth',
    name: 'Haworth (Artemis III Candidate Region)',
    shortName: 'Haworth',
    lat: -86.7,
    lon: -23.7,
    category: 'artemis',
    tags: ['Artemis III (Oct 2024)', 'Near large PSR', 'Nearside'],
    summary:
      'One of NASA’s nine refined October 2024 Artemis III candidate landing regions, located on elevated near-side terrain bordering the ~51 km permanently shadowed Haworth crater. Favors direct-to-Earth communications alongside traverse proximity to one of the largest south polar cold traps.',
    science: [
      'Adjacent to Haworth crater’s permanently shadowed floor, where LRO LEND neutron data show hydrogen enrichment.',
      'Near-side longitude supports high direct-to-Earth visibility without lunar orbital relay dependence.',
      'Coordinates mark a nominal highland reference point inside the multi-kilometer Haworth candidate region.',
    ],
    heritage: 'Retained in NASA’s October 28, 2024 Artemis III candidate list.',
    sources: [NASA_ARTEMIS_SRC, NASA_TREK_SRC, NASA_LOLA_SRC],
  },
  {
    id: 'peak-near-cabeus-b',
    name: 'Peak near Cabeus B (Artemis III Candidate Region)',
    shortName: 'Peak near Cabeus B',
    lat: -83.66,
    lon: -69.01,
    category: 'artemis',
    tags: ['Artemis III (Oct 2024)', 'Elevated ridge', 'Cabeus proximity'],
    summary:
      'An elevated topographic peak bordering the Cabeus crater complex and one of NASA’s nine refined October 2024 Artemis III candidate landing regions. Its height above surrounding depressions offers extended illumination windows and regional geological diversity.',
    science: [
      'Adjacent to the Cabeus crater complex, where NASA’s 2009 LCROSS mission confirmed water ice and volatiles.',
      'Steeper ridge flanks require careful touchdown dispersion planning within the candidate region.',
      'Coordinates mark a nominal peak-complex reference point inside the broader NASA candidate region.',
    ],
    heritage: 'Retained in NASA’s October 28, 2024 Artemis III candidate list.',
    sources: [NASA_ARTEMIS_SRC, NASA_TREK_SRC, NASA_LOLA_SRC],
  },
  {
    id: 'nobile-rim-1',
    name: 'Nobile Rim 1 (Artemis III Candidate Region)',
    shortName: 'Nobile Rim 1',
    lat: -85.44,
    lon: 37.37,
    category: 'artemis',
    tags: ['Artemis III (Oct 2024)', 'Nobile massif', 'High relief'],
    summary:
      'One of NASA’s nine October 2024 Artemis III candidate landing regions situated on the western rim/flank highlands of the degraded ~73 km Nobile crater, near the terrain originally studied for NASA’s VIPER volatile-mapping rover.',
    science: [
      'Provides access to multiple small permanently shadowed pockets and doubly shadowed depressions.',
      'High-relief rim topography requires precision hazard avoidance to target flatter local pads.',
      'Coordinates mark a nominal point within the multi-kilometer Nobile Rim 1 region.',
    ],
    heritage: 'Retained in NASA’s October 28, 2024 Artemis III candidate list.',
    sources: [NASA_ARTEMIS_SRC, NASA_TREK_SRC, NASA_LOLA_SRC],
  },
  {
    id: 'nobile-rim-2',
    name: 'Nobile Rim 2 (Artemis III Candidate Region)',
    shortName: 'Nobile Rim 2',
    lat: -84.05,
    lon: 58.82,
    category: 'artemis',
    tags: ['Artemis III (Oct 2024)', 'Crater rim', 'Ancient highlands'],
    summary:
      'The second Nobile-bordering Artemis III candidate landing region in NASA’s October 2024 refinement, situated on the eastern/northeastern rim sector of Nobile crater with varied illumination and access to South Pole-Aitken basin ejecta.',
    science: [
      'Exposed highland regolith and impact melt deposits along the Nobile crater rim.',
      'Mixed terrain relief underscores the importance of local flat-pad selection within the candidate zone.',
      'Coordinates mark a nominal point within the broader Nobile Rim 2 candidate region.',
    ],
    heritage: 'Retained in NASA’s October 28, 2024 Artemis III candidate list.',
    sources: [NASA_ARTEMIS_SRC, NASA_TREK_SRC, NASA_LOLA_SRC],
  },
  {
    id: 'slater-plain',
    name: 'Slater Plain (Artemis III Candidate Region)',
    shortName: 'Slater Plain',
    lat: -87.13,
    lon: 127.86,
    category: 'artemis',
    tags: ['Artemis III (Oct 2024)', 'Low slope', 'Far-side polar'],
    summary:
      'A relatively smooth highland plain adjacent to the 24 km Slater crater (~87° S), newly highlighted in NASA’s October 28, 2024 refined list of nine Artemis III candidate landing regions. Notable for comparatively gentle slopes suitable for crewed touchdown.',
    science: [
      'Low regional terrain slopes (~2–7°) combined with proximity to permanently shadowed crater interiors.',
      'Far-side polar longitude (~128° E) limits direct-to-Earth line-of-sight, elevating relay communication value.',
      'Coordinates denote a nominal point inside the multi-kilometer Slater Plain candidate region.',
    ],
    heritage: 'Added/refined in NASA’s October 28, 2024 Artemis III candidate landing regions update.',
    sources: [NASA_ARTEMIS_SRC, NASA_TREK_SRC, NASA_LOLA_SRC],
  },

  // --- Historical 2022 Candidates & Classic Polar Reference Sites ---
  {
    id: 'connecting-ridge',
    name: 'Shackleton – de Gerlache Connecting Ridge (Historical 2022 Candidate)',
    shortName: 'Connecting Ridge',
    lat: -89.45,
    lon: -138.0,
    category: 'rim',
    tags: ['2022 Candidate (Retired Oct 2024)', 'Near-continuous sunlight', 'Historical benchmark'],
    summary:
      'A ~15 km ridge linking the rims of Shackleton and de Gerlache craters. Originally listed among NASA’s 13 August 2022 Artemis III candidate regions before being excluded in the October 2024 nine-region update, it remains a premier scientific benchmark for polar solar illumination.',
    science: [
      'Elevated crest yields some of the longest continuous sunlight intervals near the lunar south pole.',
      'Overlooks cold traps in both Shackleton and de Gerlache craters.',
      'Retained as a historical 2022 Artemis III candidate for comparative benchmarking against the 2024 nine-region list.',
    ],
    heritage: 'Original August 2022 Artemis III candidate region (excluded in NASA October 2024 refinement).',
    sources: [NASA_ARTEMIS_SRC, ASU_QUICKMAP_SRC, NASA_LOLA_SRC],
  },
  {
    id: 'faustini-rim',
    name: 'Faustini Rim A (Historical 2022 Candidate)',
    shortName: 'Faustini Rim A',
    lat: -87.6,
    lon: 86.0,
    category: 'rim',
    tags: ['2022 Candidate (Retired Oct 2024)', 'PSR access', 'Historical benchmark'],
    summary:
      'Elevated rim sector of the ~39 km Faustini crater. Included in NASA’s original August 2022 list of 13 Artemis III candidate regions and removed in the October 2024 refinement; retained here for historical mission-architecture comparisons.',
    science: [
      'Borders Faustini crater’s permanently shadowed cold-trapping interior.',
      'Provides an eastern polar benchmark contrasting with the nine active October 2024 candidates.',
    ],
    heritage: 'Original August 2022 Artemis III candidate region (excluded in NASA October 2024 refinement).',
    sources: [NASA_ARTEMIS_SRC, NASA_LOLA_SRC],
  },
  {
    id: 'shackleton-rim',
    name: 'Shackleton Crater Rim (Pole-Facing Reference)',
    shortName: 'Shackleton Rim',
    lat: -89.9,
    lon: -160.0,
    category: 'rim',
    tags: ['Classic LOLA Benchmark', 'Rim crest', 'Steep inner wall'],
    summary:
      'The rim of the 21 km Shackleton crater passes within kilometers of the geographic lunar south pole. While Shackleton Crater Rim itself is not one of the nine October 2024 Artemis III landing regions, it is a classic NASA LOLA illumination and traverse benchmark.',
    science: [
      'Combined access to sunlit rim segments and steeply walled permanently shadowed floor within short traverse distance.',
      'Extensively studied in NASA GSFC LOLA illumination publications (e.g., Mazarico et al.).',
    ],
    heritage: 'Classic NASA LOLA polar illumination benchmark (adjacent to de Gerlache Rim 2).',
    sources: [
      NASA_LOLA_SRC,
      {
        label: 'NASA SVS — Shackleton Crater Elevation & Lighting',
        url: 'https://svs.gsfc.nasa.gov/3845',
      },
    ],
  },
  {
    id: 'shackleton-floor',
    name: 'Shackleton Crater Floor',
    shortName: 'Shackleton Floor',
    lat: -89.66,
    lon: 129.78,
    category: 'psr',
    tags: ['PSR', 'Cryogenic cold trap', 'No direct sunlight'],
    summary:
      'Shackleton is a 21 km-wide, roughly 4 km-deep impact crater near the lunar south pole. Its permanently shadowed floor has not received direct sunlight for billions of years, with LRO Diviner measurements indicating extreme cryogenic temperatures (< 100 K).',
    science: [
      'LRO LAMP and LOLA reflectance observations suggest localized surface frost mixed with regolith.',
      'Classic end-member cold trap for water ice and volatile preservation.',
      'Extreme engineering environment: zero direct solar power and zero direct-to-Earth line of sight.',
    ],
    sources: [
      {
        label: 'NASA — Lunar Reconnaissance Orbiter (LRO) Mission & Polar Ice',
        url: 'https://science.nasa.gov/mission/lro/',
      },
      ASU_QUICKMAP_SRC,
      NASA_LOLA_SRC,
    ],
  },
  {
    id: 'cabeus',
    name: 'Cabeus Crater (LCROSS Impact Site)',
    shortName: 'Cabeus / LCROSS',
    lat: -84.675,
    lon: -48.725,
    category: 'robotic',
    tags: ['LCROSS 2009', 'Water confirmed', 'PSR'],
    summary:
      'On 9 October 2009 NASA’s LCROSS Centaur upper stage impacted a permanently shadowed area inside Cabeus. Spectral analysis of the ejecta plume confirmed water ice (5.6 ± 2.9% by mass) along with other volatile compounds.',
    science: [
      'Empirical in-situ confirmation of water ice in a lunar south polar cold trap.',
      'Plume spectroscopy also identified CO, H2, NH3, Hg, and light hydrocarbons.',
    ],
    heritage: 'LCROSS impact coordinates: 84.675° S, 48.725° W (NASA Ames Research Center).',
    sources: [
      {
        label: 'NASA — LCROSS Lunar Crater Observation and Sensing Satellite',
        url: 'https://science.nasa.gov/mission/lcross/',
      },
      NASA_LOLA_SRC,
    ],
  },
  {
    id: 'shoemaker',
    name: 'Shoemaker Crater Floor',
    shortName: 'Shoemaker',
    lat: -88.1,
    lon: 44.9,
    category: 'psr',
    tags: ['PSR', 'Lunar Prospector 1999', 'Hydrogen anomaly'],
    summary:
      'A ~51 km permanently shadowed crater named after planetary geologist Eugene Shoemaker. NASA’s Lunar Prospector spacecraft was deliberately targeted into Shoemaker crater at the end of its mission in July 1999.',
    science: [
      'Extensive cold trap exhibiting neutron-spectrometer hydrogen enrichment.',
      'Represents a zero-solar-power interior crater environment for stress-testing lander endurance.',
    ],
    sources: [NASA_LOLA_SRC, NASA_SVS_SRC],
  },
  {
    id: 'amundsen-rim',
    name: 'Amundsen Rim',
    shortName: 'Amundsen Rim',
    lat: -83.6,
    lon: 82.0,
    category: 'rim',
    tags: ['Large crater', 'Mixed illumination'],
    summary:
      'Amundsen is a ~103 km crater with a central peak complex. Its northern rim experiences stronger diurnal solar cycles, while its southern interior contains permanently shadowed areas.',
    science: [
      'Diverse geology spanning crater rim highland regolith and shadowed interior floor.',
      'Lower polar latitude (~83.6° S) produces larger solar elevation swings and thermal cycling.',
    ],
    sources: [NASA_LOLA_SRC, NASA_SVS_SRC],
  },
];

export const DEFAULT_SITE_ID = 'mons-mouton-plateau';

export function getSite(id: string): LandingSite | undefined {
  return LANDING_SITES.find((s) => s.id === id);
}

export const LANDER_PROFILES: LanderProfile[] = [
  {
    id: 'hls',
    name: 'Crewed HLS (Artemis III class)',
    description: 'Large crewed lander with elevated solar arrays and a ~6.5-day surface stay.',
    arrayType: 'vertical_tracking',
    overrides: {
      slopeLimitDeg: 8,
      ellipseRadiusKm: 0.5,
      mastHeightM: 30,
      panelAreaM2: 60,
      panelEfficiency: 0.32,
      loadPowerW: 12000,
      batteryKWh: 400,
    },
  },
  {
    id: 'clps',
    name: 'Robotic CLPS lander',
    description: 'Commercial Lunar Payload Services class lander with deck-mounted horizontal panels.',
    arrayType: 'deck_mounted',
    overrides: {
      slopeLimitDeg: 10,
      ellipseRadiusKm: 1.0,
      mastHeightM: 2,
      panelAreaM2: 6,
      panelEfficiency: 0.28,
      loadPowerW: 450,
      batteryKWh: 8,
    },
  },
  {
    id: 'rover',
    name: 'Polar rover (VIPER class)',
    description: 'Mobile rover with a vertical solar array tracking a low Sun.',
    arrayType: 'vertical_tracking',
    overrides: {
      slopeLimitDeg: 15,
      ellipseRadiusKm: 0.3,
      mastHeightM: 1.5,
      panelAreaM2: 3,
      panelEfficiency: 0.3,
      loadPowerW: 300,
      batteryKWh: 4,
    },
  },
  {
    id: 'outpost',
    name: 'Surface power tower',
    description: 'Fixed vertical solar array on a 10 m mast for a long-duration outpost.',
    arrayType: 'vertical_tracking',
    overrides: {
      slopeLimitDeg: 6,
      ellipseRadiusKm: 0.2,
      mastHeightM: 10,
      panelAreaM2: 40,
      panelEfficiency: 0.32,
      loadPowerW: 5000,
      batteryKWh: 250,
    },
  },
];

export const DATE_PRESETS = [
  { label: 'Artemis III (mid-2027)', iso: '2027-06-15T00:00' },
  { label: 'Southern summer 2027', iso: '2027-09-20T00:00' },
  { label: 'Southern winter 2028', iso: '2028-03-20T00:00' },
  { label: 'IM-2 Athena epoch', iso: '2025-03-06T17:30' },
];

export const DURATION_PRESETS = [
  { label: '6.5 d', value: 6.5, hint: 'Artemis III surface stay' },
  { label: '14.8 d', value: 14.77, hint: 'Half synodic month' },
  { label: '29.5 d', value: 29.53, hint: 'Full lunar day-night cycle' },
  { label: '60 d', value: 60, hint: 'Extended outpost' },
];

export const DATA_SOURCES: DataSourceItem[] = [
  {
    title: 'NASA Moon Trek — Solar System Treks Portal',
    org: 'NASA JPL / Solar System Exploration Research Virtual Institute',
    detail:
      'Official NASA planetary GIS portal for south polar topography, crater slope profiles, lighting geometry, and Artemis III candidate region visualization.',
    url: 'https://trek.nasa.gov/moon/',
  },
  {
    title: 'NASA/JPL Horizons System (DE441 Ephemerides)',
    org: 'NASA Jet Propulsion Laboratory (Solar System Dynamics)',
    detail:
      'Authoritative JPL DE441 planetary and lunar ephemeris service used to validate AstroMoon sub-solar coordinates, sub-Earth libration vectors, and topocentric Earth-Moon distances within < 0.045° (2020–2035).',
    url: 'https://ssd.jpl.nasa.gov/horizons/',
  },
  {
    title: 'LOLA Digital Elevation Model (LDEM_80S_80M)',
    org: 'NASA Goddard Space Flight Center / PDS Geosciences Node (WashU)',
    detail:
      'Lunar Orbiter Laser Altimeter polar stereographic grid (80°S–90°S, NASA PDS LDEM_80S_80M) resampled to 2048×2048 at 296.875 m/pixel. Verified against published LOLA benchmark elevations at Shackleton and polar massifs.',
    url: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/',
  },
  {
    title: 'Artemis III Candidate Landing Regions (October 2024 Update)',
    org: 'NASA Exploration Systems Development Directorate',
    detail:
      'Authoritative list of nine refined Artemis III candidate regions (Peak near Cabeus B, Haworth, Malapert Massif, Mons Mouton Plateau, Mons Mouton, Nobile Rim 1, Nobile Rim 2, de Gerlache Rim 2, Slater Plain). Historical 2022 sites (Connecting Ridge, Faustini Rim A) are retained separately for comparison.',
    url: 'https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/',
  },
  {
    title: 'CGI Moon Kit — LROC WAC Color Mosaic & LOLA Displacement',
    org: 'NASA Scientific Visualization Studio (GSFC)',
    detail:
      'Global lunar color mosaic and elevation displacement dataset derived from NASA LRO WAC and LOLA instruments for 3D globe rendering.',
    url: 'https://svs.gsfc.nasa.gov/4720',
  },
  {
    title: 'Lunar Reconnaissance Orbiter — Diviner & Polar Volatile Observations',
    org: 'NASA / LRO Science Team',
    detail:
      'LRO Diviner Lunar Radiometer cryogenic cold-trap measurements (40–55 K baseline) and polar illumination research used to ground AstroMoon’s simplified steady-state radiative balance model.',
    url: 'https://science.nasa.gov/mission/lro/',
  },
  {
    title: 'SORCE/TIM Total Solar Irradiance Reference Standard',
    org: 'NASA Solar Radiation and Climate Experiment (SORCE)',
    detail:
      'NASA solar irradiance reference S₀ = 1361.0 W/m² at 1 AU, scaled via the inverse-square law across true lunar heliocentric distance.',
    url: 'https://science.nasa.gov/mission/sorce/',
  },
  {
    title: 'LCROSS Impact Mission Volatile Detection',
    org: 'NASA Ames Research Center',
    detail:
      'Empirical confirmation of water ice (5.6 ± 2.9% by mass) and companion volatiles inside Cabeus crater from the 2009 NASA LCROSS impact experiment.',
    url: 'https://science.nasa.gov/mission/lcross/',
  },
  {
    title: 'LROC QuickMap — Lunar Reconnaissance Orbiter Camera Atlas',
    org: 'Arizona State University (ASU) / LROC Science Operations Center (External Partner)',
    detail:
      'Academic instrument-team web GIS operated by ASU for NASA’s LROC instrument, providing NAC/WAC imagery, LOLA slope maps, and meter-scale hazard inspection beyond 297 m/px DEM resolution.',
    url: 'https://quickmap.lroc.im-ldi.com/',
  },
  {
    title: 'Canadian Space Agency (CSA) — Moon Exploration & Artemis Partner Science',
    org: 'Canadian Space Agency (CSA — International Artemis Partner)',
    detail:
      'Official CSA documentation on Artemis-era lunar surface exploration, polar rover power systems, and international lunar science contributions (non-NASA partner agency).',
    url: 'https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/',
  },
];
