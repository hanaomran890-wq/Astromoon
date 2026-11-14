import React, { useState } from 'react';
import { useMission } from '../context/MissionContext.tsx';
import { SCIENTIFIC_FORMULAS } from '../lib/scientificFormulas.ts';
import {
  X,
  BookOpen,
  ExternalLink,
  CheckCircle2,
  Atom,
  Compass,
  Zap,
  Radio,
  Thermometer,
  ShieldCheck,
  Rocket,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Topography & Cartography': <Compass className="size-4 text-primary" />,
  'Planetary Geometry': <Compass className="size-4 text-primary" />,
  'Celestial Mechanics': <Atom className="size-4 text-primary" />,
  'Radiative Transfer': <Zap className="size-4 text-primary" />,
  'Telecommunications': <Radio className="size-4 text-primary" />,
  'Planetary Thermophysics': <Thermometer className="size-4 text-primary" />,
  'Spacecraft Power Systems': <Zap className="size-4 text-primary" />,
  'Mission Safety & Systems Engineering': <ShieldCheck className="size-4 text-primary" />,
  'Spacecraft Flight Mechanics': <Rocket className="size-4 text-primary" />,
};

export function ScientificFormulasModal() {
  const { showFormulasModal, setShowFormulasModal } = useMission();
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (!showFormulasModal) return null;

  const categories = [
    'all',
    ...Array.from(new Set(SCIENTIFIC_FORMULAS.map((s) => s.category))),
  ];

  const filtered =
    activeCategory === 'all'
      ? SCIENTIFIC_FORMULAS
      : SCIENTIFIC_FORMULAS.filter((s) => s.category === activeCategory);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scientific-modal-title"
    >
      <div className="relative flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-card/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-primary/40 bg-primary/10">
              <BookOpen className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h2 id="scientific-modal-title" className="text-base font-semibold text-foreground">
                Scientific Methodology, Equations & Sources
              </h2>
              <p className="font-mono text-xs text-primary/90">
                Planetary Astrophysics, Verified Physical Derivations, and Official NASA/LOLA Datasets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFormulasModal(false)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Scientific Validations Highlights Banner */}
        <div className="shrink-0 border-b border-border bg-primary/5 px-6 py-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
            <div className="text-[11.5px] leading-relaxed text-foreground/90">
              <strong className="text-primary font-semibold">Scientific Validations & Corrections Applied:</strong>{' '}
              1) Solar array incidence angle evaluated for horizontal deck vs vertical tracking geometry; 2) Regolith thermal equilibrium derived from 3D slope insolation and cryogenic cold-trap physics; 3) Direct-to-Earth line-of-sight evaluated with Earth angular semi-diameter for full DSN network visibility; 4) Geodesic spherical curvature drop applied for 360° horizon ray-tracing; 5) Multi-attribute safety scoring enforces mandatory slope tipping and battery endurance constraints.
            </div>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="shrink-0 border-b border-border bg-card/40 px-6 py-2 overflow-x-auto flex items-center gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded-md px-2.5 py-1 font-mono text-[11px] whitespace-nowrap transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {cat === 'all' ? 'All Domains' : cat}
            </button>
          ))}
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {filtered.map((section) => (
            <article
              key={section.id}
              className="rounded-lg border border-border bg-background/40 p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  {CATEGORY_ICONS[section.category] || <Atom className="size-4 text-primary" />}
                  <h3 className="text-sm font-semibold text-foreground">
                    {section.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/30">
                    {section.category}
                  </span>
                </div>
              </div>

              <p className="text-xs leading-relaxed text-muted-foreground">
                {section.summary}
              </p>

              <div className="space-y-4">
                {section.formulas.map((formula, fIdx) => (
                  <div
                    key={fIdx}
                    className="rounded-lg border border-border/80 bg-card/70 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        {formula.name}
                      </span>
                    </div>

                    {/* Formula Display Box */}
                    <div className="rounded-md bg-black/60 p-3 text-center border border-primary/20 shadow-inner overflow-x-auto">
                      <span className="font-mono text-sm tracking-wide text-primary">
                        {formula.latex}
                      </span>
                    </div>

                    {/* Scientific Derivation Details */}
                    <p className="text-[11.5px] leading-relaxed text-foreground/80">
                      <strong>Physical Derivation:</strong> {formula.derivation}
                    </p>

                    {/* Variables Table */}
                    <div className="space-y-1 pt-1">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Parameter Definitions & CODATA / IAU Units:
                      </div>
                      <div className="grid grid-cols-1 gap-1 text-[11px]">
                        {formula.variables.map((v, vIdx) => (
                          <div
                            key={vIdx}
                            className="flex flex-wrap items-baseline gap-2 rounded bg-background/30 px-2 py-1"
                          >
                            <span className="font-mono font-bold text-primary shrink-0">
                              {v.symbol}
                            </span>
                            <span className="flex-1 text-muted-foreground">{v.description}</span>
                            <span className="font-mono text-[10px] text-muted-foreground/80 shrink-0">
                              [{v.unit}]
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Official Source & Citation */}
                    <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                      <div className="text-[11px] text-muted-foreground">
                        <strong className="text-foreground">Authoritative Citation:</strong>{' '}
                        {formula.scientificSource}
                      </div>
                      {formula.referenceUrl && (
                        <a
                          href={formula.referenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline shrink-0 ml-2"
                        >
                          Source Link <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="shrink-0 border-t border-border bg-card/80 px-6 py-3 flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">
            LSP Planetary Science & Engineering Reference — Synchronized with Simulation Model
          </span>
          <button
            type="button"
            onClick={() => setShowFormulasModal(false)}
            className="rounded-md bg-secondary px-4 py-1.5 font-mono text-xs text-foreground hover:bg-accent transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
