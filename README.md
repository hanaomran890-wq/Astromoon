# 🌑 AstroMoon — Lunar South Pole Landing Planner

**AstroMoon** is an interactive 3D lunar terrain visualization and landing site analysis platform built for **NASA Space Apps Cairo**. Designed to support **Artemis III** mission planning, it enables researchers and mission planners to evaluate candidate landing zones at the Lunar South Pole using official NASA LRO/LOLA datasets.

🔗 **Live Demo:** [https://github.io](https://github.io)

---

## ✨ Key Features

* **3D Lunar Terrain & Globe Visualization:** Interactive exploration of the Lunar South Pole with real-time ray-traced shadows and elevation relief powered by NASA LOLA DEM data.
* **Landing Safety Assessment Engine:** Automated multi-criteria scoring system evaluating candidate sites based on:
  * **Touchdown Slope** & Safe Area percentage within the landing ellipse.
  * **Terrain Relief & Roughness** metrics.
  * **Solar Illumination** duration and **Survivable Darkness** limits.
  * **Direct-to-Earth (DTE) Communication Visibility**.
* **Mission Window Simulation:** Dynamic timeline controls (`1h/s` to `72h/s`) to simulate Sun and Earth positions across specific mission epochs.
* **Multi-Site Comparison:** Side-by-side comparison of 16+ Artemis III candidate regions (including *Mons Mouton Plateau*, *Malapert Massif*, *de Gerlache Rim 2*, and *Haworth*) plus custom coordinate input.

---

## 🛠️ Built With

* **Frontend:** React, TypeScript, Vite
* **3D & Data Visualization:** Three.js / WebGL, Recharts
* **Datasets:** NASA Lunar Reconnaissance Orbiter (LRO) / Lunar Orbiter Laser Altimeter (LOLA) DEM & Ephemeris data

---

## 👥 Team AstroMoon

Developed by **Team AstroMoon** for the **NASA Space Apps Challenge — Cairo**.
