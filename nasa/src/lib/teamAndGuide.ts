export interface TeamMember {
  name: string;
  role: string;
  focus: string;
}

export interface GuideStep {
  step: number;
  title: string;
  summary: string;
  actions: string[];
}

export const ASTROMOON_INFO = {
  teamName: 'Team Astromoon',
  tagline: 'High School Student Research Team Pioneering Lunar Landing Architecture',
  summary:
    'Team Astromoon is an ambitious engineering and scientific research team composed of 6 dedicated high school students. Combining astrodynamics, topographic ray-tracing, telecommunications physics, and high-performance web visualization, the team developed this mission-control simulation platform to provide open scientific tooling for evaluating candidate landing sites across the lunar south pole.',
  members: [
    {
      name: 'Abdelrahman Mohamed',
      role: 'Team Lead & Astrodynamics Architecture',
      focus: 'Orbital mechanics, truncated ELP lunar ephemeris models, sub-solar/sub-Earth libration theory, and system coordination.',
    },
    {
      name: 'Seif Hossam',
      role: 'Geospatial & Topographic Computing',
      focus: 'LOLA 297 m/px DEM binary ingestion, stereographic cartography, and 3D Horn gradient algorithms.',
    },
    {
      name: 'Moaz Ahmed',
      role: 'Interactive 3D WebGL & Systems Engineering',
      focus: 'Three.js lunar globe shaders, geodesic horizon raycasting, performance optimization, and mission control UX.',
    },
    {
      name: 'Hana Ahmed',
      role: 'Planetary Thermophysics & Radiative Transfer',
      focus: 'Stefan-Boltzmann radiative equilibrium, 3D slope insolation, and cryogenic cold-trap physics.',
    },
    {
      name: 'Roqia Sherif',
      role: 'RF Telecommunications & Line-of-Sight Modeling',
      focus: 'Direct-to-Earth line-of-sight clearance, Earth angular semi-diameter parallax, and ground station visibility.',
    },
    {
      name: 'Mariam Mohamed',
      role: 'Spacecraft Power & Battery Dynamics',
      focus: 'PV array incidence geometry (vertical tracking vs deck-mounted), Li-ion integration, and DoD thresholds.',
    },
  ],
  stemContext:
    'Developed as a collaborative youth engineering research project by the 6 student members of Team Astromoon, studying challenges in space exploration, solar energy harvesting in extreme polar environments, and high-precision lunar landing site evaluation with rigorous astrodynamic and topographic models.',
};

export const USER_GUIDE: GuideStep[] = [
  {
    step: 1,
    title: 'Selecting a Target Landing Site',
    summary:
      'Choose an Artemis candidate region or enter custom south polar coordinates.',
    actions: [
      'Navigate to the Landing Targets card in the left sidebar.',
      'Search by crater name, geographic feature, or tags (e.g., "Mons Mouton Plateau", "Malapert Massif", "Slater Plain", "Artemis III (Oct 2024)").',
      'Compare NASA’s nine October 2024 Artemis III candidate regions alongside historical 2022 benchmarks and permanently shadowed craters.',
      'Alternatively, enter custom selenographic coordinates between -80.0° S and -90.0° S and click "Set".',
    ],
  },
  {
    step: 2,
    title: 'Configuring Mission Window & Epoch',
    summary:
      'Define the landing epoch in UTC and surface exploration stay duration to calculate celestial positions.',
    actions: [
      'Select a preset epoch: Artemis III (mid-2027), Southern Summer 2027 (maximum polar sunlight), Southern Winter 2028, or IM-2 Athena.',
      'Or pick an exact landing date and time using the datetime-local picker.',
      'Select mission stay duration: 6.5 days (Artemis III stay), 14.8 days (half synodic period), 29.5 days (full day/night cycle), or 60 days (extended outpost).',
    ],
  },
  {
    step: 3,
    title: 'Setting Lander Architecture & Engineering Constraints',
    summary:
      'Match your simulation to specific vehicle hardware profiles and physical thresholds.',
    actions: [
      'Choose a preset profile: Crewed HLS (Artemis III class), Robotic CLPS (deck-mounted panels), Polar Rover (VIPER class), or Surface Power Tower.',
      'Adjust Max Touchdown Slope (2° to 20°) to match landing gear tipping tolerances.',
      'Adjust Landing Ellipse Radius (0.1 to 5.0 km) to account for touchdown dispersion.',
      'Set Solar Array Mast Height (0 to 50 m) to evaluate elevation clearing crater rim shadows.',
      'Tune Panel Area, Cell Efficiency, Base Power Load, Battery Capacity, and DTE Communication Elevation Mask.',
    ],
  },
  {
    step: 4,
    title: 'Navigating the 3D Lunar Viewport',
    summary:
      'Inspect the lunar surface, topography, terrain shading modes, and celestial line-of-sight rays.',
    actions: [
      'Switch Camera View Presets: "Globe" (full Moon sphere), "Pole" (top-down south pole view), "Site" (close-up landing ellipse inspection), and "Ground" (surface vantage looking across the horizon).',
      'Rotate: Click and drag with mouse or touch.',
      'Zoom: Scroll wheel or pinch gesture.',
      'Toggle Shading Modes: "Sunlight" (real-time raytraced solar illumination), "Hillshade" (topographic contrast), "Elevation" (color-coded altitude ramp), "Slope" (green/yellow/red landing hazard map).',
      'Inspect Ray Vectors: Gold ray indicates incident Sun vector (solid = sunlit, dashed = occluded); Cyan ray indicates direct line-of-sight to Earth (solid = link clear, dashed = obstructed).',
    ],
  },
  {
    step: 5,
    title: 'Analyzing Local Horizon Panorama & Celestial Tracks',
    summary:
      'Examine the 360° panoramic horizon silhouette surrounding the observer.',
    actions: [
      'The bottom panorama displays the 360° topographical profile (North, East, South, West, North) ray-traced with lunar curvature drop.',
      'Gold track illustrates the Sun’s diurnal elevation and azimuth path across the stay.',
      'Cyan track illustrates Earth’s apparent position, showing libration motion in the lunar sky.',
      'Live markers indicate the instantaneous positions of Sun and Earth at the current timeline cursor.',
    ],
  },
  {
    step: 6,
    title: 'Timeline Playback & Mission Event Log',
    summary:
      'Scrub through mission elapsed time (MET) to evaluate operational transitions and solar cycles.',
    actions: [
      'Click the Play/Pause button or drag the timeline scrubber to advance mission time.',
      'Select playback speed multiplier: 1×, 6×, 24×, or 72×.',
      'Review the sunlight band (amber) and DTE visibility band (cyan) to identify power gaps and comm blackouts.',
      'Open the Comms tab to browse the chronological Event Log (sunrise, sunset, earthrise, earthset) and click any event to jump directly to that timestamp.',
    ],
  },
  {
    step: 7,
    title: 'Evaluating Power Budget & Thermal Extremes',
    summary:
      'Verify battery state of charge (SoC) and regolith temperature survivability.',
    actions: [
      'Switch to the "Power" tab in the right sidebar.',
      'Review total energy harvested (kWh), average output (kW), peak output (kW), and battery state (NOMINAL vs DEPLETED).',
      'Inspect the dual-axis chart comparing solar generation against battery reserve over time.',
      'Check the surface temperature curve (K) derived from slope insolation and cryogenic thermal physics.',
    ],
  },
  {
    step: 8,
    title: 'Reviewing Overall Landing Safety Score (Go / No-Go)',
    summary:
      'Assess composite touchdown viability based on multi-attribute decision theory.',
    actions: [
      'Check the radial dial score (0 to 100) and readiness status badge in the top header: GO (≥ 72, Safe), HOLD (48–71, Caution / hazard avoidance required), NO-GO (<48, Hazardous).',
      'Examine the 6 weighted components: Touchdown slope (25%), Safe area within ellipse (15%), Surface roughness & relief (10%), Solar illumination (20%), DTE visibility (15%), and Survivable darkness calibrated to battery capacity (15%).',
    ],
  },
];
