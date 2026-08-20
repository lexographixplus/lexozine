"use client";

import Link from "next/link";
import { ArrowLeft, Check, Type } from "lucide-react";
import { useEffect, useState } from "react";

type TypePreset = {
  id: string;
  name: string;
  display: string;
  body: string;
  description: string;
  scale: string;
};

const presets: TypePreset[] = [
  { id: "editorial-serif", name: "Editorial Serif", display: "Playfair Display", body: "Georgia", description: "High-contrast feature typography for essays, culture and literary work.", scale: "Display 52 / Deck 16 / Body 10" },
  { id: "modern-sans", name: "Modern Sans", display: "Inter", body: "Inter", description: "Clean, contemporary system for technology, business and visual reporting.", scale: "Display 48 / Deck 15 / Body 10" },
  { id: "hybrid", name: "Hybrid Journal", display: "Playfair Display", body: "Inter", description: "Classic editorial character with highly readable modern body copy.", scale: "Display 50 / Deck 15 / Body 9.5" },
  { id: "minimal", name: "Minimal Digest", display: "Inter", body: "Georgia", description: "Restrained hierarchy for profiles, interviews and compact long-form editions.", scale: "Display 44 / Deck 14 / Body 10" },
];

const STORAGE_KEY = "lexozine-type-system-v1";

export default function StyleSystem() {
  const [selected, setSelected] = useState("editorial-serif");
  const [tracking, setTracking] = useState(0);
  const [leading, setLeading] = useState(1.6);
  const [bodySize, setBodySize] = useState(10);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setSelected(data.selected ?? "editorial-serif");
      setTracking(data.tracking ?? 0);
      setLeading(data.leading ?? 1.6);
      setBodySize(data.bodySize ?? 10);
    } catch {}
  }, []);

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ selected, tracking, leading, bodySize }));
  }

  const active = presets.find((preset) => preset.id === selected) ?? presets[0];

  return (
    <main className="utility-shell">
      <header className="utility-topbar"><Link href="/" className="secondary-button"><ArrowLeft size={15}/> Back to studio</Link><div className="brand-title">Lexozine <span>Styles</span></div><button className="primary-button" onClick={save}><Check size={15}/> Apply system</button></header>
      <section className="utility-hero"><span className="eyebrow">Design system</span><h1>Typography & editorial styles</h1><p>Control the publication’s typographic voice from one reusable system instead of formatting individual pages by hand.</p></section>
      <section className="utility-grid two-column">
        <div className="utility-panel"><h2>Type presets</h2><div className="preset-list">{presets.map((preset) => <button key={preset.id} className={`preset-card ${selected === preset.id ? "active" : ""}`} onClick={() => setSelected(preset.id)}><Type size={18}/><div><strong>{preset.name}</strong><span>{preset.description}</span><small>{preset.display} + {preset.body}</small></div></button>)}</div></div>
        <div className="utility-panel"><h2>Fine controls</h2><label className="range-field"><span>Body size <strong>{bodySize}px</strong></span><input type="range" min="8" max="14" step="0.5" value={bodySize} onChange={(e)=>setBodySize(Number(e.target.value))}/></label><label className="range-field"><span>Line height <strong>{leading.toFixed(2)}</strong></span><input type="range" min="1.2" max="2" step="0.05" value={leading} onChange={(e)=>setLeading(Number(e.target.value))}/></label><label className="range-field"><span>Tracking <strong>{tracking}</strong></span><input type="range" min="-2" max="6" step="0.25" value={tracking} onChange={(e)=>setTracking(Number(e.target.value))}/></label><div className="type-preview" style={{fontFamily: active.body, fontSize: bodySize, lineHeight: leading, letterSpacing: tracking/10}}><span style={{fontFamily: active.display}}>The shape of a story</span><p>Typography carries hierarchy, rhythm and tone. Lexozine keeps those decisions reusable across the entire issue.</p><blockquote>Good editorial design gives the reader a path through complexity.</blockquote></div></div>
      </section>
    </main>
  );
}
