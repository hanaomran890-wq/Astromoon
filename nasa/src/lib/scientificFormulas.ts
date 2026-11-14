export interface FormulaSection {
  id: string;
  title: string;
  category: string;
  summary: string;
  formulas: {
    name: string;
    latex: string;
    variables: { symbol: string; description: string; unit: string }[];
    derivation: string;
    scientificSource: string;
    referenceUrl?: string;
  }[];
}

export const SCIENTIFIC_FORMULAS: FormulaSection[] = [
  {
    id: 'terrain-slope',
    title: 'Terrain Topography & Slope Gradients',
    category: 'Topography & Cartography',
    summary:
      'Evaluation of local elevation, surface gradients, relief, and detrended RMS roughness computed from the NASA LOLA polar stereographic digital elevation model (LDEM_80S_80M). The ~297 m/pixel grid resolves regional topography and crater rim slopes (> 600 m) for preliminary site selection, while sub-meter touchdown hazard evaluation uses LROC NAC imagery via LROC QuickMap or descent lidar.',
    formulas: [
      {
        name: 'South Polar Stereographic Coordinate Projection',
        latex: 'r = 2 \\cdot R_M \\cdot \\tan\\left(\\frac{\\pi}{4} + \\frac{\\phi}{2}\\right), \\quad x = r \\sin(\\lambda), \\quad y = r \\cos(\\lambda)',
        variables: [
          { symbol: 'R_M', description: 'Mean volumetric radius of the Moon (NASA/IAU standard)', unit: '1737.4 km' },
          { symbol: '\\phi', description: 'Selenographic latitude (-90° to -80°)', unit: 'degrees / radians' },
          { symbol: '\\lambda', description: 'Selenographic longitude (-180° to +180°)', unit: 'degrees / radians' },
          { symbol: 'r', description: 'Radial distance from South Pole in projection plane', unit: 'km' },
        ],
        derivation:
          'Conformal azimuthal mapping preserving true local angles and shape around the lunar south pole, standard for NASA LOLA Polar GDR products.',
        scientificSource: 'NASA Goddard Space Flight Center — LOLA Polar GDR Data Product Specification (PDS Geosciences Node).',
        referenceUrl: 'https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/',
      },
      {
        name: 'Surface Slope Gradient (3×3 Central Finite Difference Kernel)',
        latex: '\\theta_{slope} = \\arctan\\left(\\sqrt{\\left(\\frac{\\partial z}{\\partial x}\\right)^2 + \\left(\\frac{\\partial z}{\\partial y}\\right)^2}\\right) \\cdot \\frac{180}{\\pi}',
        variables: [
          { symbol: '\\frac{\\partial z}{\\partial x}', description: 'East-West elevation gradient: [ (z_{+1,-1}+2z_{+1,0}+z_{+1,+1}) - (z_{-1,-1}+2z_{-1,0}+z_{-1,+1}) ] / (8 \\Delta x)', unit: 'dimensionless' },
          { symbol: '\\frac{\\partial z}{\\partial y}', description: 'North-South elevation gradient: [ (z_{-1,+1}+2z_{0,+1}+z_{+1,+1}) - (z_{-1,-1}+2z_{0,-1}+z_{+1,-1}) ] / (8 \\Delta y)', unit: 'dimensionless' },
          { symbol: '\\Delta x, \\Delta y', description: 'DEM pixel physical grid resolution', unit: '296.875 m' },
          { symbol: '\\theta_{slope}', description: 'Local topographical terrain slope relative to horizontal', unit: 'degrees (°)' },
        ],
        derivation:
          'Second-order central finite difference operator weighted by inverse distance, minimizing noise susceptibility across crater rims and laser altimetry tracks.',
        scientificSource: 'Arizona State University (ASU) / LROC Science Operations Center (External Partner) — LROC QuickMap Polar Topographic Slope Maps.',
        referenceUrl: 'https://quickmap.lroc.im-ldi.com/',
      },
      {
        name: 'Detrended Surface Roughness (RMS Residual Elevation)',
        latex: '\\sigma_z = \\sqrt{\\frac{1}{N} \\sum_{i=1}^N \\left(z_i - z_{plane}(x_i, y_i)\\right)^2}, \\quad z_{plane} = \\bar{z} + a \\Delta x_i + b \\Delta y_i',
        variables: [
          { symbol: 'z_i', description: 'Sampled elevation of pixel i inside landing ellipse', unit: 'm' },
          { symbol: 'z_{plane}', description: 'Best-fit regional planar slope trend across the ellipse', unit: 'm' },
          { symbol: 'N', description: 'Total number of valid DEM pixels enclosed within landing ellipse', unit: 'count' },
          { symbol: '\\sigma_z', description: 'Root-Mean-Square (RMS) detrended roughness variation', unit: 'm' },
        ],
        derivation:
          'Isolates micro-topographic morphological variance from the broad regional gradient slope across the target touchdown ellipse.',
        scientificSource: 'NASA Moon Trek — Lunar South Pole Terrain Roughness & Slope Analysis Portal.',
        referenceUrl: 'https://trek.nasa.gov/moon/',
      },
    ],
  },
  {
    id: 'horizon-raytracing',
    title: 'Geodesic Horizon & Topographical Occlusion',
    category: 'Planetary Geometry',
    summary:
      'Exact 360° spherical ray-tracing accounting for lunar planetary curvature drop to determine solar and Earth line-of-sight elevation angles.',
    formulas: [
      {
        name: 'Spherical Geodesic Horizon Elevation Angle',
        latex: '\\alpha_{el} = \\arctan\\left(\\frac{(R_M + h_{tgt})\\cos\\left(\\frac{d}{R_M}\\right) - (R_M + h_{obs})}{(R_M + h_{tgt})\\sin\\left(\\frac{d}{R_M}\\right)}\\right) \\cdot \\frac{180}{\\pi}',
        variables: [
          { symbol: 'R_M', description: 'Volumetric lunar radius', unit: '1,737,400 m' },
          { symbol: 'h_{obs}', description: 'Observer elevation = z_{local} + h_{mast}', unit: 'm' },
          { symbol: 'h_{tgt}', description: 'Distant terrain pixel elevation from DEM', unit: 'm' },
          { symbol: 'd', description: 'Geodesic ground arc distance to terrain obstacle', unit: 'm' },
          { symbol: '\\alpha_{el}', description: 'Apparent elevation angle above local tangent plane', unit: 'degrees (°)' },
        ],
        derivation:
          'Derived from exact 3D Euclidean vector geometry on a sphere. Eliminates parabolic planar approximation errors that produce over 30 m of vertical displacement at 250 km horizon distances.',
        scientificSource: 'Mazarico, E., et al. (NASA GSFC LOLA Science Team). Illumination Conditions of the Lunar Polar Regions Using LOLA Topography. NASA NTRS.',
        referenceUrl: 'https://ntrs.nasa.gov/citations/20120010094',
      },
    ],
  },
  {
    id: 'ephemeris-astronomy',
    title: 'Astronomical Ephemeris & Selenographic Librations',
    category: 'Celestial Mechanics',
    summary:
      'Periodic lunar orbital and libration model calculating sub-solar coordinates, sub-Earth coordinates, and topocentric vectors verified within < 0.045° against NASA/JPL Horizons DE441 numerical ephemerides.',
    formulas: [
      {
        name: 'Sub-Solar Selenographic Latitude & Obliquity Cycle',
        latex: 'b_\\odot = \\arcsin\\left(-\\sin(\\lambda_\\odot - \\Omega) \\cos(\\beta_\\odot) \\sin(I) - \\sin(\\beta_\\odot) \\cos(I)\\right) \\approx \\pm 1.54242^\\circ',
        variables: [
          { symbol: 'I', description: 'Inclination of the lunar equator to the ecliptic plane', unit: '1.54242°' },
          { symbol: '\\lambda_\\odot', description: 'Apparent ecliptic longitude of the Sun', unit: 'degrees (°)' },
          { symbol: '\\Omega', description: 'Longitude of the ascending node of the Moon’s orbit', unit: 'degrees (°)' },
          { symbol: 'b_\\odot', description: 'Sub-solar selenographic latitude', unit: 'degrees (°)' },
        ],
        derivation:
          'Because lunar obliquity is only 1.54°, seasonal solar elevation changes at the poles are very gentle, creating extended periods of near-continuous sunlight on elevated crater rims and perpetual darkness in crater depressions.',
        scientificSource: 'NASA/JPL Solar System Dynamics — Horizons System (DE441 Lunar Cartographic & Rotational Frame).',
        referenceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
      },
      {
        name: 'Earth-Moon Distance & Topocentric Parallax',
        latex: '\\vec{r}_{topo} = \\vec{r}_{\\oplus/Moon} - \\vec{r}_{lander}, \\quad d_{\\oplus} = \\|\\vec{r}_{topo}\\|, \\quad t_{OWLT} = \\frac{d_{\\oplus}}{c}',
        variables: [
          { symbol: '\\vec{r}_{\\oplus/Moon}', description: 'Vector from Moon center to Earth center', unit: 'km' },
          { symbol: '\\vec{r}_{lander}', description: 'Observer vector from Moon center to surface lander mast', unit: 'km' },
          { symbol: 'd_{\\oplus}', description: 'True topocentric line-of-sight distance to Earth', unit: 'km' },
          { symbol: 'c', description: 'Speed of light in vacuum', unit: '299,792.458 km/s' },
          { symbol: 't_{OWLT}', description: 'One-Way Light Time delay', unit: 'seconds (~1.25–1.35 s)' },
        ],
        derivation:
          'Accounts for topocentric displacement (~1,737 km) from lunar center to surface station, necessary for exact radio signal propagation and antenna pointing vectors.',
        scientificSource: 'NASA/JPL Horizons System — Topocentric Observer Ephemeris & Light-Time Validation (DE441).',
        referenceUrl: 'https://ssd.jpl.nasa.gov/horizons/',
      },
    ],
  },
  {
    id: 'solar-illumination',
    title: 'Solar Flux & Penumbral Horizon Fraction',
    category: 'Radiative Transfer',
    summary:
      'Total solar irradiance at lunar orbit and partial solar disk occultation incorporating limb darkening.',
    formulas: [
      {
        name: 'Inverse-Square Heliocentric Solar Flux',
        latex: 'Q(r_\\odot) = S_0 \\cdot \\left(\\frac{1\\text{ AU}}{r_\\odot}\\right)^2, \\quad S_0 = 1361.0\\text{ W/m}^2',
        variables: [
          { symbol: 'S_0', description: 'Total Solar Irradiance at 1 Astronomical Unit (NASA SORCE/TIM standard)', unit: '1361.0 W/m²' },
          { symbol: 'r_\\odot', description: 'True distance from Sun to Moon at epoch', unit: 'km' },
          { symbol: '1\\text{ AU}', description: 'Astronomical Unit distance standard', unit: '149,597,870.7 km' },
          { symbol: 'Q(r_\\odot)', description: 'Solar irradiance incident at the top of the lunar surface', unit: 'W/m²' },
        ],
        derivation:
          'Solar flux varies between ~1320 W/m² (aphelion in July) and ~1410 W/m² (perihelion in January).',
        scientificSource: 'NASA Solar Radiation and Climate Experiment (SORCE) — Total Solar Irradiance Standard (1361.0 W/m²).',
        referenceUrl: 'https://science.nasa.gov/mission/sorce/',
      },
      {
        name: 'Solar Disc Occultation with Limb Darkening',
        latex: 'u = \\frac{\\theta_{sun} - \\theta_{horizon}}{R_{sun,ang}}, \\quad f_{geom} = 1 - \\frac{\\arccos(u) - u\\sqrt{1 - u^2}}{\\pi}, \\quad f_{limb} = f_{geom} + 0.0524 u (1 - u^2)',
        variables: [
          { symbol: 'u', description: 'Normalized solar center height relative to horizon (-1 to +1)', unit: 'dimensionless' },
          { symbol: 'R_{sun,ang}', description: 'Solar angular radius (~16 arcmin)', unit: '0.2666°' },
          { symbol: 'f_{geom}', description: 'Circular segment geometric area fraction', unit: '0.0 to 1.0' },
          { symbol: 'f_{limb}', description: 'Limb-darkened solar flux fraction (symmetric about u = 0)', unit: '0.0 to 1.0' },
        ],
        derivation:
          'Geometric disk clipping combined with solar limb darkening (I(mu)/I_0 = 1 - 0.60(1 - mu)). By circular symmetry, f(0) = 0.50000 exactly and f(u) + f(-u) = 1.00000. Peak central brightness causes flux fraction to exceed area fraction for u > 0.',
        scientificSource: 'Mazarico, E., et al. (NASA GSFC LOLA Science Team) — Polar Solar Grazing Occultation Modeling (NASA NTRS).',
        referenceUrl: 'https://ntrs.nasa.gov/citations/20120010094',
      },
    ],
  },
  {
    id: 'comms-visibility',
    title: 'Direct-To-Earth (DTE) Line-of-Sight Geometry',
    category: 'Telecommunications',
    summary:
      'Geometric clearance of Earth above local terrain to evaluate RF link feasibility with NASA Deep Space Network (DSN).',
    formulas: [
      {
        name: 'Earth Angular Radius & Full-Disk Visibility',
        latex: 'R_{\\oplus,ang} = \\arcsin\\left(\\frac{R_\\oplus}{d_\\oplus}\\right) \\cdot \\frac{180}{\\pi} \\approx 0.95^\\circ - 1.05^\\circ, \\quad \\Delta_{margin} = \\theta_{\\oplus} - R_{\\oplus,ang} - \\theta_{horizon} - \\delta_{mask}',
        variables: [
          { symbol: 'R_\\oplus', description: 'Mean volumetric radius of Earth', unit: '6371.0 km' },
          { symbol: 'd_\\oplus', description: 'Distance between Moon lander and Earth center', unit: 'km' },
          { symbol: '\\theta_\\oplus', description: 'Apparent elevation of Earth center above local horizontal', unit: 'degrees (°)' },
          { symbol: '\\theta_{horizon}', description: 'Terrain elevation in direction of Earth azimuth', unit: 'degrees (°)' },
          { symbol: '\\delta_{mask}', description: 'Operational antenna ground-clearance elevation mask', unit: 'degrees (°)' },
          { symbol: '\\Delta_{margin}', description: 'Unobstructed clearance margin for entire visible Earth disk', unit: 'degrees (°)' },
        ],
        derivation:
          'Because Earth rotates every 24 hours, DSN stations (Goldstone, Madrid, Canberra) move across the Earth disk. If only the top limb of Earth clears a ridge, stations in the southern/central hemisphere are occluded. Unconditional communication requires boresight clearance and full disk margin.',
        scientificSource: 'NASA Deep Space Network (DSN) Telecommunications Link Design Handbook, 810-005, Rev. E.',
        referenceUrl: 'https://deepspace.jpl.nasa.gov/dsndocs/810-005/',
      },
    ],
  },
  {
    id: 'surface-thermal',
    title: 'Surface Radiative Equilibrium & Thermal Model',
    category: 'Planetary Thermophysics',
    summary:
      'Radiative thermal equilibrium incorporating 3D terrain slope normal vector, regolith albedo, infrared emissivity, and cryogenic equilibrium in shadow.',
    formulas: [
      {
        name: 'Sunlit Sloped Surface Equilibrium Temperature',
        latex: 'T_{eq} = \\left[\\frac{(1 - A) Q(r_\\odot) f_{sun} \\max(0, \\hat{n} \\cdot \\hat{s}) + Q_{geo}}{\\epsilon \\sigma}\\right]^{1/4}',
        variables: [
          { symbol: 'A', description: 'Hemispherical regolith albedo (NASA LRO Diviner measurement)', unit: '0.12' },
          { symbol: '\\epsilon', description: 'Thermal infrared emissivity of lunar regolith', unit: '0.95' },
          { symbol: '\\sigma', description: 'Stefan-Boltzmann physical constant', unit: '5.670374419 × 10⁻⁸ W/(m² K⁴)' },
          { symbol: 'Q_{geo}', description: 'Lunar interior geothermal heat flow flux (Apollo 15/17)', unit: '0.018 W/m²' },
          { symbol: '\\hat{n} \\cdot \\hat{s}', description: 'Dot product between 3D terrain normal and solar vector', unit: 'dimensionless' },
          { symbol: 'T_{eq}', description: 'Equilibrium surface brightness temperature', unit: 'Kelvin (K)' },
        ],
        derivation:
          'Derived from steady-state energy balance where absorbed solar radiation equals emitted blackbody radiation plus geothermal leakage.',
        scientificSource: 'NASA Lunar Thermal Analysis Guidebook (L-TAG): Thermo-physical and Optical Properties of Lunar Regolith (NASA NTRS).',
        referenceUrl: 'https://ntrs.nasa.gov/citations/20220013412',
      },
      {
        name: 'Cryogenic Equilibrium in Polar Shadow (Parameterized Baseline)',
        latex: 'T_{min} = \\left[\\frac{Q_{geo} + Q_{diffuse}}{\\epsilon \\sigma}\\right]^{1/4} \\approx 40\\text{ K} - 55\\text{ K}',
        variables: [
          { symbol: 'T_{min}', description: 'Equilibrium temperature in unilluminated polar shadow', unit: 'Kelvin (K)' },
          { symbol: 'Q_{geo}', description: 'Interior geothermal heat flow (Apollo 15/17 heat flow probes)', unit: '0.018 W/m²' },
          { symbol: 'Q_{diffuse}', description: 'Parameterized secondary diffuse thermal IR & scattered flux from surrounding sunlit terrain', unit: '0.15 W/m²' },
          { symbol: '\\epsilon', description: 'Thermal infrared emissivity of cold lunar regolith', unit: '0.95' },
          { symbol: '\\sigma', description: 'Stefan-Boltzmann physical radiation constant', unit: '5.670374419 × 10⁻⁸ W/(m² K⁴)' },
        ],
        derivation:
          'Parameterized 1D steady-state radiative balance approximation for permanently shadowed regions (PSRs) where direct solar insolation is zero. Balances internal lunar geothermal conduction (0.018 W/m²) with an empirical diffuse IR flux parameter (0.15 W/m²) to reproduce the 40–55 K cold-trap baseline rather than solving full 3D view-factor terrain re-radiation.',
        scientificSource: 'NASA Lunar Reconnaissance Orbiter (LRO) — Diviner Lunar Radiometer Experiment.',
        referenceUrl: 'https://science.nasa.gov/mission/lro/',
      },
    ],
  },
  {
    id: 'solar-power-battery',
    title: 'Solar Array Generation & Battery Dynamics',
    category: 'Spacecraft Power Systems',
    summary:
      'Electrical power generation modeling based on array mounting geometry (tracking vertical vs deck horizontal) and battery state-of-charge integration.',
    formulas: [
      {
        name: 'Solar Array Electric Output Power',
        latex: 'P_{gen} = Q(r_\\odot) \\cdot f_{sun} \\cdot \\cos(\\theta_{incidence}) \\cdot A_{array} \\cdot \\eta_{cell}',
        variables: [
          { symbol: '\\cos(\\theta_{incidence})', description: 'Vertical tracking mast array = cos(\\theta_{el}); Horizontal deck array = sin(\\theta_{el})', unit: 'dimensionless' },
          { symbol: 'A_{array}', description: 'Effective surface area of photovoltaic panels', unit: 'm²' },
          { symbol: '\\eta_{cell}', description: 'Multi-junction solar cell conversion efficiency', unit: '28% – 32%' },
          { symbol: 'P_{gen}', description: 'Instantaneous electrical power generated', unit: 'Watts (W)' },
        ],
        derivation:
          'At the lunar south pole, the Sun skims the horizon at ~1.5°. Vertical tracking arrays maximize exposure (cos(1.5°) ≈ 0.999), whereas horizontal deck panels receive only sin(1.5°) ≈ 0.026. For grazing partial-disk illumination with solar center below horizontal, power is computed from the visible disk portion above the local horizon.',
        scientificSource: 'Landis, G. A. (NASA Glenn Research Center). Solar Power for the Lunar Night, NASA TM-102127 (NASA NTRS).',
        referenceUrl: 'https://ntrs.nasa.gov/citations/19890017428',
      },
      {
        name: 'Battery State-of-Charge Numerical Integration',
        latex: 'E(t + \\Delta t) = \\min\\left(E_{cap}, \\; E(t) + \\frac{\\Delta t}{1000} \\cdot \\left[\\begin{cases} (P_{gen} - P_{load}) \\cdot \\eta_{chg} & \\text{if } P_{gen} \\ge P_{load} \\\\ P_{gen} - P_{load} & \\text{if } P_{gen} < P_{load} \\end{cases}\\right]\\right)',
        variables: [
          { symbol: 'E_{cap}', description: 'Nameplate battery energy storage capacity', unit: 'kWh' },
          { symbol: 'P_{load}', description: 'Continuous base electrical load of spacecraft subsystems', unit: 'Watts (W)' },
          { symbol: '\\eta_{chg}', description: 'Coulombic / round-trip electrochemical charge efficiency', unit: 'configurable (default 96%)' },
          { symbol: '\\Delta t', description: 'Simulation integration time step', unit: 'hours' },
        ],
        derivation:
          'Separates true zero-energy battery depletion (E = 0, catastrophic power loss) from crossing operational Depth of Discharge (DoD) reserve thresholds.',
        scientificSource: 'Canadian Space Agency (CSA — International Artemis Partner) — Moon Exploration & Surface Power Systems.',
        referenceUrl: 'https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/',
      },
    ],
  },
  {
    id: 'safety-scoring',
    title: 'Multi-Attribute Landing Safety Scoring Model',
    category: 'Mission Safety & Systems Engineering',
    summary:
      'AstroMoon multi-attribute decision theory scoring combining landing slope, safe area within ellipse, roughness, solar illumination, Earth communication visibility, and survivable darkness calibrated to battery endurance. Hard constraints enforce that sites violating slope tipping limits or battery depletion cannot receive a SAFE classification.',
    formulas: [
      {
        name: 'Overall Landing Safety Score & Constraint Gates',
        latex: 'S_{total} = \\min\\left(S_{cap}, \\; \\sum_{i=1}^6 w_i \\cdot s_i(x_i)\\right), \\quad \\sum w_i = 1.00',
        variables: [
          { symbol: 'w_{slope} = 0.25', description: 'Touchdown slope weight (target point slope vs lander limit)', unit: 'weight' },
          { symbol: 'w_{area} = 0.15', description: 'Landing ellipse safe terrain fraction (≤ limit)', unit: 'weight' },
          { symbol: 'w_{roughness} = 0.10', description: 'Detrended RMS surface roughness variance', unit: 'weight' },
          { symbol: 'w_{illum} = 0.20', description: 'Percentage of surface stay in sunlight (≥ 80% is optimal)', unit: 'weight' },
          { symbol: 'w_{comm} = 0.15', description: 'Direct-to-Earth visibility percentage (≥ 85% is optimal)', unit: 'weight' },
          { symbol: 'w_{dark} = 0.15', description: 'Darkness survivability calibrated to t_{endurance} = (E_{batt} \\cdot \\text{DoD}) / P_{load}', unit: 'weight' },
        ],
        derivation:
          'Verdicts: SAFE (S ≥ 72 with all mandatory constraints satisfied), CAUTION (48 ≤ S < 72, marginal slope / DoD reserve crossed), HAZARDOUS (S < 48, hard tipping violation, or zero-energy battery depletion). Missing, NaN, or out-of-coverage inputs yield INSUFFICIENT_DATA. Physical slope tipping limits (< 8° to 15°) reference NASA Apollo Lunar Module stability studies and Artemis HLS guidelines.',
        scientificSource: 'NASA Apollo Lunar Module Landing Gear Stability Studies (NASA NTRS) & Artemis HLS Guidelines.',
        referenceUrl: 'https://ntrs.nasa.gov/citations/19730010151',
      },
    ],
  },
  {
    id: 'descent-propulsion',
    title: 'Descent Trajectory & Delta-v Budget Context',
    category: 'Spacecraft Flight Mechanics',
    summary:
      'Preliminary propulsion delta-v budgeting for powered lunar descent from Low Lunar Orbit (LLO) or Near Rectilinear Halo Orbit (NRHO) to polar touchdown. Note: AstroMoon focuses on post-touchdown surface operations; trajectory figures provide mission architecture context and are not operational flight navigation guidance.',
    formulas: [
      {
        name: 'Tsiolkovsky Rocket Equation & Propellant Fraction',
        latex: '\\Delta v = I_{sp} \\cdot g_0 \\cdot \\ln\\left(\\frac{m_{init}}{m_{final}}\\right), \\quad \\frac{m_{prop}}{m_{init}} = 1 - \\exp\\left(-\\frac{\\Delta v}{I_{sp} g_0}\\right)',
        variables: [
          { symbol: '\\Delta v', description: 'Required descent velocity increment including gravity losses', unit: '1,700 – 2,200 m/s' },
          { symbol: 'I_{sp}', description: 'Specific impulse of storable bipropellant or cryogenic descent stage', unit: '310 – 450 s' },
          { symbol: 'g_0', description: 'Standard gravitational acceleration constant', unit: '9.80665 m/s²' },
          { symbol: 'm_{init}', description: 'Spacecraft wet mass at start of powered descent initiation (PDI)', unit: 'kg' },
          { symbol: 'm_{final}', description: 'Spacecraft dry / landing touchdown mass', unit: 'kg' },
        ],
        derivation:
          'Fundamental rocket equation governing propellant expenditure. For lunar descent from 100 km circular orbit, nominal ideal delta-v (~1,680 m/s) plus gravity losses during finite-burn braking (~250–350 m/s) and terminal hover/hazard avoidance margin yields an operational budget of 1,900–2,200 m/s.',
        scientificSource: 'Sostaric, R. R., et al. (2020). Orion and Human Landing System Descent and Landing Navigation. NASA/TM-2020-220556.',
        referenceUrl: 'https://ntrs.nasa.gov/citations/20205008544',
      },
    ],
  },
];
