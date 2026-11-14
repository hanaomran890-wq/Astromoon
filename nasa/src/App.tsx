import { MissionProvider } from './context/MissionContext.tsx';
import { Header } from './components/Header.tsx';
import { SidebarLeft } from './components/SidebarLeft.tsx';
import { SidebarRight } from './components/SidebarRight.tsx';
import { Lunar3DViewport } from './components/Lunar3DViewport.tsx';
import { HorizonPanorama } from './components/HorizonPanorama.tsx';
import { TimelinePlayer } from './components/TimelinePlayer.tsx';
import { ScientificFormulasModal } from './components/ScientificFormulasModal.tsx';
import { AboutAstromoonModal } from './components/AboutAstromoonModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { SiteComparisonModal } from './components/SiteComparisonModal.tsx';
import { Mountain } from 'lucide-react';

export default function App() {
  return (
    <MissionProvider>
      <div className="relative z-10 flex min-h-dvh flex-col bg-background text-foreground lg:h-dvh lg:overflow-hidden">
        {/* Top Mission Control Header */}
        <Header />

        {/* 3-Column Responsive Grid Layout */}
        <div className="flex flex-1 flex-col lg:grid lg:min-h-0 lg:grid-cols-[288px_minmax(0,1fr)_360px]">
          {/* Left Column: Mission Planning & Constraints */}
          <SidebarLeft />

          {/* Center Column: 3D Globe/Terrain Viewport & 360° Horizon Silhouette */}
          <main className="order-1 flex min-h-0 flex-col lg:order-none">
            {/* Top 3D Viewport */}
            <div className="relative h-[60vh] min-h-80 lg:h-auto lg:flex-1">
              <Lunar3DViewport />
            </div>

            {/* Bottom 360° Horizon Silhouette Section */}
            <section
              aria-label="Horizon panorama"
              className="flex h-44 shrink-0 flex-col border-t border-border bg-card/40 px-4 pt-2 pb-2"
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <Mountain className="size-3.5" aria-hidden="true" />
                  Local horizon — 360°
                </h2>
                <div className="flex items-center gap-3 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-3 bg-primary" /> Sun track
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-3 bg-earth" /> Earth track
                  </span>
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <HorizonPanorama />
              </div>
            </section>

            {/* Bottom Playback Scrubber & Transport */}
            <TimelinePlayer />
          </main>

          {/* Right Column: Multi-tab Landing Safety Assessment, Power, Comms, Terrain, Science Methods, and Data Provenance */}
          <SidebarRight />
        </div>

        {/* Interactive Scientific Methodology & Equations Reference Modal */}
        <ScientificFormulasModal />

        {/* Team Astromoon (6 Students) & Comprehensive Operational User Guide Modal */}
        <AboutAstromoonModal />

        {/* Extensive Mission & Visualization Settings Modal */}
        <SettingsModal />

        {/* Landing Sites Comparative Analytics Matrix & Statistical Workbench */}
        <SiteComparisonModal />
      </div>
    </MissionProvider>
  );
}
