import { useState } from 'react';
import { useMission } from '../context/MissionContext.tsx';
import { ASTROMOON_INFO, USER_GUIDE } from '../lib/teamAndGuide.ts';
import {
  X,
  Users,
  GraduationCap,
  Award,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Download,
} from 'lucide-react';

export function AboutAstromoonModal() {
  const { showAboutModal, setShowAboutModal } = useMission();
  const [activeTab, setActiveTab] = useState<'team' | 'guide'>('team');

  if (!showAboutModal) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
    >
      <div className="relative flex h-full max-h-[88vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/40 bg-primary/10">
              <Users className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 id="about-modal-title" className="text-base font-semibold text-foreground">
                Team Astromoon & Platform Operation Guide
              </h2>
              <p className="font-mono text-xs text-muted-foreground">
                Engineering team overview, project research context & comprehensive user manual
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAboutModal(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="shrink-0 border-b border-border bg-card/40 px-6 py-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs transition-colors ${
              activeTab === 'team'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <GraduationCap className="size-3.5" />
            Team Astromoon (6 Students)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 font-mono text-xs transition-colors ${
              activeTab === 'guide'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <BookOpen className="size-3.5" />
            Comprehensive Platform Guide
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {activeTab === 'team' ? (
            <div className="space-y-6">
              {/* Team Intro Hero Banner */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Award className="size-5 text-primary" />
                  <span className="font-mono text-xs uppercase tracking-wider text-primary font-semibold">
                    High School Student Research Project
                  </span>
                </div>
                <h3 className="text-lg font-bold text-foreground">
                  {ASTROMOON_INFO.teamName} — {ASTROMOON_INFO.tagline}
                </h3>
                <p className="text-xs leading-relaxed text-foreground/90">
                  {ASTROMOON_INFO.summary}
                </p>
                <div className="border-t border-primary/20 pt-2.5 text-[11.5px] text-muted-foreground leading-relaxed">
                  <strong>Research Context:</strong> {ASTROMOON_INFO.stemContext}
                </div>
              </div>

              {/* 6 Team Members Grid */}
              <div className="space-y-3">
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Engineering Subsystem Leads & Researchers (6 Team Members)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ASTROMOON_INFO.members.map((member, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border bg-background/40 p-4 space-y-2 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">
                            {member.name}
                          </h4>
                          <span className="font-mono text-[11px] text-primary">
                            {member.role}
                          </span>
                        </div>
                        <span className="size-6 grid place-items-center rounded bg-primary/10 text-primary font-mono text-[10px] font-bold">
                          0{idx + 1}
                        </span>
                      </div>
                      <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                        {member.focus}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Innovations & Pillars */}
              <div className="rounded-lg border border-border bg-card/60 p-4 space-y-3">
                <div className="font-mono text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Core Scientific Pillars Built by the Team
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-foreground/90">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span>LOLA 2048² digital elevation model binary decompression with 297 m/px resolution.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span>Truncated periodic ELP lunar theory validated against JPL DE441 ephemerides.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span>Exact 3D geodesic spherical horizon ray-tracing removing flat curvature distortions.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                    <span>Multi-attribute touchdown safety scoring calibrated to vehicle battery endurance.</span>
                  </li>
                </ul>
              </div>

              {/* Source Code Distribution Card */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Download className="size-4 text-primary" />
                    <span>Download Complete Project Codebase (.zip)</span>
                  </div>
                  <p className="text-[11.5px] text-muted-foreground">
                    Direct access to the complete standalone source repository (React 19, TypeScript, Three.js shaders, LOLA DEM data, physics engine, and regression tests) packaged for standalone local deployment and scientific evaluation.
                  </p>
                </div>
                <a
                  href="/astromoon-source-code.zip"
                  download="astromoon-source-code.zip"
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 font-mono text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <Download className="size-3.5" />
                  <span>Download .ZIP</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* User Guide Header */}
              <div className="space-y-1 border-b border-border pb-3">
                <h3 className="text-base font-semibold text-foreground">
                  Complete Platform Operation Manual & User Guide
                </h3>
                <p className="text-xs text-muted-foreground">
                  Step-by-step instructions for evaluating Artemis candidate regions, scrubbing mission timelines, analyzing local horizons, and assessing touchdown viability.
                </p>
              </div>

              {/* 8-Step Walkthrough */}
              <div className="space-y-4">
                {USER_GUIDE.map((step) => (
                  <div
                    key={step.step}
                    className="rounded-lg border border-border bg-background/40 p-4 space-y-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-6 place-items-center rounded-full bg-primary text-primary-foreground font-mono text-xs font-bold">
                        {step.step}
                      </span>
                      <h4 className="text-sm font-semibold text-foreground">
                        {step.title}
                      </h4>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-8">
                      {step.summary}
                    </p>
                    <div className="pl-8 space-y-1.5 pt-1">
                      {step.actions.map((act, aIdx) => (
                        <div key={aIdx} className="flex items-start gap-2 text-[11.5px] text-foreground/80 leading-relaxed">
                          <ChevronRight className="size-3 text-primary shrink-0 mt-0.5" />
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-border bg-card/80 px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a
              href="/astromoon-source-code.zip"
              download="astromoon-source-code.zip"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[11px] font-semibold text-primary hover:bg-primary/20 hover:border-primary transition-colors"
              title="Download standalone complete source code package (.zip)"
            >
              <Download className="size-3.5" />
              <span>Download Source (.zip)</span>
            </a>
            <span className="hidden sm:inline font-mono text-[10px] text-muted-foreground">
              Team Astromoon • Open Lunar Exploration Architecture
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowAboutModal(false)}
            className="rounded-md bg-secondary px-4 py-1.5 font-mono text-xs text-foreground hover:bg-accent transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
