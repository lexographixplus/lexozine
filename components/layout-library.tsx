"use client";

import { ArrowLeft, Columns2, Columns3, Grid2X2, LayoutTemplate, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type LayoutPreset = {
  id: string;
  name: string;
  category: string;
  description: string;
  columns: number;
  imageRatio: string;
  character: string;
};

const initialLayouts: LayoutPreset[] = [
  { id: "feature-opener", name: "Feature Opener", category: "Feature", description: "Large editorial headline, deck and dominant image for long-form story openings.", columns: 2, imageRatio: "3:2", character: "Expressive" },
  { id: "classic-essay", name: "Classic Essay", category: "Editorial", description: "Quiet text-led spread with generous margins, drop cap and pull quote rhythm.", columns: 2, imageRatio: "4:3", character: "Literary" },
  { id: "visual-report", name: "Visual Report", category: "Culture", description: "Image-forward modular grid for photography, captions and short editorial text.", columns: 3, imageRatio: "1:1", character: "Visual" },
  { id: "interview", name: "Interview", category: "People", description: "Portrait-led Q&A system with strong speaker hierarchy and flexible side notes.", columns: 2, imageRatio: "4:5", character: "Conversational" },
  { id: "dispatch", name: "Dispatch", category: "News", description: "Dense, efficient page system for briefs, sidebars and multi-item editorial packages.", columns: 3, imageRatio: "16:9", character: "Structured" },
  { id: "minimal-profile", name: "Minimal Profile", category: "Profile", description: "Single-subject feature with restrained typography and dramatic negative space.", columns: 1, imageRatio: "2:3", character: "Minimal" },
];

export default function LayoutLibrary() {
  const [layouts, setLayouts] = useState(initialLayouts);
  const [active, setActive] = useState(layouts[0].id);

  function duplicateLayout(layout: LayoutPreset) {
    const copy = { ...layout, id: `${layout.id}-${Date.now()}`, name: `${layout.name} Copy` };
    setLayouts((current) => [...current, copy]);
    setActive(copy.id);
  }

  return (
    <main className="layout-library-page">
      <header className="layout-library-header">
        <div className="layout-title-wrap">
          <Link href="/" className="layout-back"><ArrowLeft size={16} /> Studio</Link>
          <span className="layout-eyebrow">Lexozine design system</span>
          <h1>Layout Library</h1>
          <p>Reusable editorial systems for consistent, high-quality magazine pages and spreads.</p>
        </div>
        <button className="layout-create"><Plus size={16} /> New layout</button>
      </header>

      <section className="layout-library-grid">
        {layouts.map((layout) => (
          <article key={layout.id} className={`layout-preset-card ${active === layout.id ? "active" : ""}`} onClick={() => setActive(layout.id)}>
            <div className={`layout-preview columns-${layout.columns}`}>
              <div className="layout-preview-head" />
              <div className="layout-preview-deck" />
              <div className="layout-preview-image" />
              <div className="layout-preview-copy" />
              <div className="layout-preview-copy short" />
              <div className="layout-preview-accent" />
            </div>
            <div className="layout-card-copy">
              <div className="layout-card-top"><span>{layout.category}</span><strong>{layout.character}</strong></div>
              <h2>{layout.name}</h2>
              <p>{layout.description}</p>
              <div className="layout-specs">
                <span>{layout.columns === 3 ? <Columns3 size={13} /> : layout.columns === 2 ? <Columns2 size={13} /> : <Grid2X2 size={13} />} {layout.columns} column{layout.columns > 1 ? "s" : ""}</span>
                <span><LayoutTemplate size={13} /> Image {layout.imageRatio}</span>
              </div>
              <button onClick={(event) => { event.stopPropagation(); duplicateLayout(layout); }}><Sparkles size={13} /> Duplicate & customise</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
