"use client";

import Link from "next/link";
import { ArrowLeft, Check, Ruler } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "lexozine-production-settings-v1";

export default function ProductionSetup() {
  const [pageSize, setPageSize] = useState("A4");
  const [orientation, setOrientation] = useState("portrait");
  const [bleed, setBleed] = useState(3);
  const [margin, setMargin] = useState(12);
  const [gutter, setGutter] = useState(6);
  const [baseline, setBaseline] = useState(12);
  const [showGuides, setShowGuides] = useState(true);
  const [snap, setSnap] = useState(true);
  const [saved, setSaved] = useState("Ready");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setPageSize(data.pageSize ?? "A4");
      setOrientation(data.orientation ?? "portrait");
      setBleed(data.bleed ?? 3);
      setMargin(data.margin ?? 12);
      setGutter(data.gutter ?? 6);
      setBaseline(data.baseline ?? 12);
      setShowGuides(data.showGuides ?? true);
      setSnap(data.snap ?? true);
    } catch {}
  }, []);

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ pageSize, orientation, bleed, margin, gutter, baseline, showGuides, snap }));
    setSaved("Production settings saved");
  }

  return (
    <main className="utility-shell">
      <header className="utility-topbar"><Link href="/" className="secondary-button"><ArrowLeft size={15}/> Back to studio</Link><div className="brand-title">Lexozine <span>Setup</span></div><button className="primary-button" onClick={save}><Check size={15}/> Save setup</button></header>
      <section className="utility-hero"><span className="eyebrow">Production configuration</span><h1>Page, grid & print setup</h1><p>Define the physical constraints of the publication once, then design consistently against them across every spread.</p></section>
      <section className="utility-grid two-column">
        <div className="utility-panel"><h2>Document geometry</h2><div className="form-grid"><div className="form-field"><label>Page size</label><select value={pageSize} onChange={(e)=>setPageSize(e.target.value)}><option>A4</option><option>A5</option><option>US Letter</option><option>Square 210</option><option>Custom</option></select></div><div className="form-field"><label>Orientation</label><select value={orientation} onChange={(e)=>setOrientation(e.target.value)}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div><div className="form-field"><label>Bleed (mm)</label><input type="number" min="0" max="10" value={bleed} onChange={(e)=>setBleed(Number(e.target.value))}/></div><div className="form-field"><label>Safe margin (mm)</label><input type="number" min="5" max="30" value={margin} onChange={(e)=>setMargin(Number(e.target.value))}/></div><div className="form-field"><label>Column gutter (mm)</label><input type="number" min="2" max="20" value={gutter} onChange={(e)=>setGutter(Number(e.target.value))}/></div><div className="form-field"><label>Baseline grid (pt)</label><input type="number" min="8" max="24" value={baseline} onChange={(e)=>setBaseline(Number(e.target.value))}/></div></div></div>
        <div className="utility-panel"><h2>Layout behavior</h2><label className="check-row"><span>Show margin and bleed guides</span><input type="checkbox" checked={showGuides} onChange={(e)=>setShowGuides(e.target.checked)}/></label><label className="check-row"><span>Snap objects to layout grid</span><input type="checkbox" checked={snap} onChange={(e)=>setSnap(e.target.checked)}/></label><div className="utility-card" style={{marginTop:18}}><Ruler size={22}/><h3>Current production profile</h3><p>{pageSize} · {orientation} · {bleed} mm bleed · {margin} mm safe margin · {gutter} mm gutter · {baseline} pt baseline.</p></div><div className="save-state" style={{marginTop:16}}><span className="save-dot"/> {saved}</div></div>
      </section>
    </main>
  );
}
