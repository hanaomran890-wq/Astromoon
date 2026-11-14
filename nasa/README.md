# AstroMoon — Lunar South Pole Landing Planner

An interactive mission-control simulation workbench and terrain-analysis dashboard developed by **Team Astromoon** for evaluating landing sites across the lunar south polar region (80° S to 90° S).

> **Disclaimer:** AstroMoon is an independent student research and mission-planning educational platform created for the NASA Space Apps Challenge. It is **not** officially endorsed by NASA, and its composite site scores should not be used as operational flight navigation or certification guidance.

---

## Project Purpose & Scientific Objectives

Landing in the lunar south polar region presents coupled engineering and planetary-science trade-offs:
- **Grazing solar geometry:** Because the Moon’s equatorial obliquity to the ecliptic is only $1.54242^\circ$, the Sun skims within a few degrees of the local horizon, creating peaks of extended illumination alongside craters in billion-year permanent shadow.
- **Thermal extremes & volatile cold traps:** Sunlit slopes approach ~386 K near sub-solar incidence (polar grazing slopes run cooler), whereas Permanently Shadowed Regions (PSRs) remain at ~40–55 K and act as cold traps for water ice and volatiles.
- **Intermittent Direct-to-Earth (DTE) communications:** Earth librates around $\pm 6.8^\circ$ in selenographic latitude near the polar horizon, making terrain clearance and antenna mask angles decisive for unassisted radio links with Earth ground stations.
- **Topographic landing hazards:** Crater inner walls often exceed $20^\circ$–$30^\circ$, whereas landing architectures constrain touchdown slopes (typically $\le 8^\circ$–$15^\circ$).

AstroMoon integrates real NASA Lunar Reconnaissance Orbiter (LRO) Laser Altimeter (**LOLA**) topography with spherical geodesic ray-tracing, topocentric ephemerides, 1D thermal balance, and spacecraft power budgeting to compare candidate landing targets quantitatively.

---

## Core Features

1. **LOLA Polar DEM Ingestion & Terrain Analysis**
   - Decodes a bundled 2048 × 2048 polar stereographic grid derived from NASA PDS `LDEM_80S_80M` covering $80^\circ\text{ S}$ to $90^\circ\text{ S}$ at **296.875 m/pixel** ($608\text{ km} \times 608\text{ km}$ extent).
   - Evaluates local elevation, 3 × 3 Horn gradient slope ($\theta_{\text{slope}}$), slope distribution histograms, landing-ellipse safe-area fraction, relief, and full 2 × 2 ordinary-least-squares (OLS) planar-detrended RMS roughness.
   - Interactive 3D Three.js lunar globe with **Sunlight**, **Illumination Map**, **Slope**, **Elevation**, and **Hillshade** shaders plus Globe, Pole, Site, and Ground camera presets.

2. **October 2024 Artemis III Candidate Regions & Historical Benchmarks**
   - Features NASA’s **9 refined Artemis III candidate landing regions** announced on October 28, 2024:
     - *Peak near Cabeus B*, *Haworth*, *Malapert Massif*, *Mons Mouton Plateau*, *Mons Mouton*, *Nobile Rim 1*, *Nobile Rim 2*, *de Gerlache Rim 2*, and *Slater Plain*.
   - Separately preserves **historical August 2022 candidates** (*Connecting Ridge*, *Faustini Rim A*) and classic polar benchmarks (*Shackleton Crater Rim*, *Shackleton Floor*, *Cabeus / LCROSS*, *Shoemaker*, *Amundsen Rim*) so historical illumination benchmarks remain comparable without mislabeling retired sites as active 2024 Artemis III candidates.
   - Supports arbitrary user coordinates anywhere within $-80.0^\circ\text{ S}$ to $-90.0^\circ\text{ S}$.

3. **360° Spherical Geodesic Horizon Ray-Tracing**
   - Casts rays across $360^\circ$ of azimuth out to $250\text{ km}$ using exact spherical trigonometry to account for lunar curvature drop ($R_M = 1737.4\text{ km}$).
   - Models partial solar-disk grazing occultation using both a **geometric circular segment** model and an **Eddington-Milne linear limb-darkening** approximation ($u_L = 0.60$).
   - Renders a live 360° horizon silhouette synchronized with diurnal Sun and Earth libration sky tracks.

4. **Topocentric Solar & Earth Ephemeris**
   - Evaluates sub-solar and sub-Earth coordinates, heliocentric Sun-Moon distance, and topocentric surface-to-Earth distance/one-way light time.
   - Validated across 2024–2028 mission epochs against **NASA/JPL Horizons (DE441)** reference ephemerides within $< 0.045^\circ$ angular error and $< 35\text{ km}$ ($< 0.01\%$) range error.

5. **Photovoltaic Power, Battery SoC & Thermal Equilibrium Modeling**
   - Models vertical Sun-tracking masts versus deck-mounted horizontal solar arrays, inverse-square solar irradiance ($S_0 = 1361.0\text{ W/m}^2$ at 1 AU), configurable battery Depth-of-Discharge (DoD) thresholds, and charge efficiency.
   - Tracks sunrise/sunset and earthrise/earthset transitions, continuous eclipse/blackout streaks, and surface radiative equilibrium temperatures in SI Kelvin (`K`, toggleable to `°C` / `°F`).

6. **Multi-Site Analytics Matrix, Safety Scoring & Export**
   - Multi-attribute safety scoring (0–100) with hard engineering constraint gates (`SAFE` / `CAUTION` / `HAZARDOUS` / `INSUFFICIENT_DATA`).
   - Interactive radar plots, grouped bar charts, 2D Pareto illumination-vs-comms scatter plots, head-to-head site duels, CSV/JSON matrix export, and downloadable standalone source archive (`/astromoon-source-code.zip`).

---

## Technologies Used

- **Frontend:** React 19, TypeScript, Tailwind CSS v4
- **3D Rendering & Charts:** Three.js (WebGL shaders & OrbitControls), Recharts, Lucide Icons
- **Build & Tooling:** Vite 8, `tsx` (Node.js native test runner), Python 3 packaging script

---

## Data Sources & Authoritative References

AstroMoon clearly distinguishes official **NASA** datasets and publications from external academic and international partner institutions:

### NASA Agencies, Portals & Datasets
1. **NASA Exploration Systems Development Directorate — Artemis III Candidate Landing Regions (Oct 28, 2024 Update)**  
   https://www.nasa.gov/news-release/nasa-provides-update-on-artemis-iii-moon-landing-regions/
2. **NASA JPL — Moon Trek (Solar System Treks GIS Portal)**  
   https://trek.nasa.gov/moon/
3. **NASA JPL — Horizons System (DE441 Planetary & Lunar Ephemerides)**  
   https://ssd.jpl.nasa.gov/horizons/
4. **NASA Goddard Space Flight Center / PDS Geosciences Node (WashU) — LOLA Polar GDR (`LDEM_80S_80M`)**  
   https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/
5. **NASA Scientific Visualization Studio (SVS) — CGI Moon Kit (`#4720`) & Shackleton Crater (`#3845`)**  
   https://svs.gsfc.nasa.gov/4720 · https://svs.gsfc.nasa.gov/3845
6. **NASA Science — Lunar Reconnaissance Orbiter (LRO) & Diviner Radiometer**  
   https://science.nasa.gov/mission/lro/
7. **NASA Science — SORCE/TIM Total Solar Irradiance Standard ($1361.0\text{ W/m}^2$)**  
   https://science.nasa.gov/mission/sorce/
8. **NASA Science — LCROSS Volatile Confirmation in Cabeus Crater**  
   https://science.nasa.gov/mission/lcross/
9. **NASA — Commercial Lunar Payload Services (CLPS)**  
   https://www.nasa.gov/commercial-lunar-payload-services/
10. **NASA Deep Space Network (DSN) — Telecommunications Link Design Handbook (`810-005`)**  
    https://deepspace.jpl.nasa.gov/dsndocs/810-005/
11. **NASA Technical Reports Server (NTRS) Peer-Reviewed Engineering & Planetary References:**
    - Mazarico et al. (LOLA Polar Illumination): https://ntrs.nasa.gov/citations/20120010094
    - NASA Lunar Thermal Analysis Guidebook (L-TAG): https://ntrs.nasa.gov/citations/20220013412
    - Landis (1989), *Solar Power for the Lunar Night* (`NASA TM-102127`): https://ntrs.nasa.gov/citations/19890017428
    - Apollo Lunar Module Landing Gear Stability Studies: https://ntrs.nasa.gov/citations/19730010151
    - Sostaric et al. (2020), *Orion and HLS Descent and Landing Navigation*: https://ntrs.nasa.gov/citations/20205008544

### External Academic & International Partner Institutions (Non-NASA)
- **Arizona State University (ASU) / LROC Science Operations Center — LROC QuickMap:**  
  Academic instrument-team web GIS operated by ASU for NASA’s LRO Camera team — https://quickmap.lroc.im-ldi.com/
- **Canadian Space Agency (CSA) — Moon Exploration (International Artemis Partner):**  
  Official CSA lunar exploration science and polar rover engineering resources — https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/

---

## Installation & Running Locally

### Prerequisites
- Node.js v20+ and `npm`
- Python 3 (optional, only if regenerating `public/astromoon-source-code.zip`)

### Setup & Commands

```bash
# 1. Install dependencies
npm install

# 2. Start the development server on http://localhost:3000
npm run dev

# 3. Run TypeScript static type-checking
npm run lint

# 4. Run scientific calculations & validation unit tests
npm test

# 5. Build the production bundle into dist/
npm run build

# 6. Preview the built production bundle
npm run preview

# 7. Rebuild standalone source distribution archive (public/astromoon-source-code.zip)
npm run package
```

---

## Scientific Assumptions, Uncertainties & Limitations

1. **Topographic Resolution (~297 m/pixel Regional Scale):**  
   The bundled LOLA polar stereographic DEM (`2048 × 2048` over $608\text{ km} \times 608\text{ km}$) accurately resolves regional crater rims, massifs, horizon ridges, and $> 600\text{ m}$ slopes. Sub-meter landing hazards (boulders, small craterlets, and regolith bearing strength inside a $10\text{–}100\text{ m}$ touchdown pad) are **below pixel resolution** and require LROC NAC stereo imagery or terminal descent lidar.
2. **Nominal Candidate Region Coordinates:**  
   NASA’s Artemis III candidate landing regions span multi-kilometer zones ($\sim 15\text{ km} \times 15\text{ km}$). Coordinates in the preset selector represent **nominal reference points** inside each region; slopes and lighting vary strongly across local rim crests and plateaus, so users can test custom coordinates within each region.
3. **1D Steady-State Thermal Equilibrium vs. Transient Regolith Conduction:**  
   Temperatures are computed using instantaneous 1D Stefan-Boltzmann radiative equilibrium incorporating local 3D surface normals, regolith albedo ($A = 0.12$), IR emissivity ($\epsilon = 0.95$), internal geothermal flux ($Q_{\text{geo}} = 0.018\text{ W/m}^2$), and an empirical secondary diffuse IR parameter ($Q_{\text{diffuse}} = 0.15\text{ W/m}^2$) representing scattered light/IR from surrounding sunlit walls. Thermal inertia lag across rapid shadow transitions and full 3D view-factor radiative exchange are not explicitly integrated.
4. **Truncated Periodic Ephemeris Window (2020–2035):**  
   The client-side lunar ephemeris uses 32 longitude/distance and 20 latitude periodic terms plus IAU polar libration geometry. Across 2024–2028 test epochs, angular accuracy is verified to $< 0.045^\circ$ against NASA/JPL Horizons DE441; outside 2020–2035 or for high-precision flight operations, full DE441 numerical ephemerides should be used.
5. **Solar Grazing & Knife-Edge Occultation:**  
   Partial solar illumination assumes a straight local terrain knife-edge across the solar angular radius ($0.2666^\circ$) and a monochromatic visible linear limb-darkening law ($u_L = 0.60$).
6. **Composite Landing Safety Score:**  
   The `0–100` suitability score and `GO / HOLD / NO-GO` badges implement an AstroMoon multi-attribute decision heuristic calibrated to Apollo/HLS slope tipping tolerances and battery endurance thresholds—they are comparative engineering metrics, not official NASA mission certification criteria.
