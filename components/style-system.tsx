"use client";

import Link from "next/link";
import { ArrowLeft, Check, Type } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Issue, TypographyPreset } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";
import { defaultTypographySettings, typographyPresets } from "@/lib/editor-model";

const ISSUES_KEY = "lexozine-issues-v1";

const presetCopy: Record<TypographyPreset, { description: string; display: string; body: string }> = {
  "editorial-serif": { display: "Playfair Display", body: "Georgia", description: "High-contrast feature typography for essays, culture and literary work." },
  "modern-sans": { display: "Inter", body: "Inter", description: "Clean, contemporary typography for technology, business and visual reporting." },
  hybrid: { display: "Playfair Display", body: "Inter", description: "Classic editorial character with highly readable modern body copy." },
  minimal: { display: "Inter", body: "Georgia", description: "Restrained hierarchy for profiles, interviews and compact long-form editions." },
};

export default function StyleSystem() {
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [selected, setSelected] = useState<TypographyPreset>("editorial-serif");
  const [tracking, setTracking] = useState(defaultTypographySettings.tracking);
  const [leading, setLeading] = useState(defaultTypographySettings.leading);
  const [bodySize, setBodySize] = useState(defaultTypographySettings.bodySize);
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    try {
      const issues = JSON.parse(localStorage.getItem(ISSUES_KEY) ?? "[]") as Issue[];
      const requestedId = new URLSearchParams(window.location.search).get("issue");
      const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
      if (!found) return;
      setIssue(found);
      const typography = found.typography ?? defaultTypographySettings;
      setSelected(typography.preset);
      setTracking(typography.tracking);
      setLeading(typography.leading);
      setBodySize(typography.bodySize);
    } catch {}
  }, []);

  function selectPreset(id: TypographyPreset) {
    const preset = typographyPresets[id];
    setSelected(id);
    setTracking(preset.tracking);
    setLeading(preset.leading);
    setBodySize(preset.bodySize);
  }

  function save() {
    const preset = typographyPresets[selected];
    const nextIssue: Issue = {
      ...issue,
      typography: { preset: selected, displayFamily: preset.displayFamily, bodyFamily: preset.bodyFamily, bodySize, leading, tracking },
      updatedAt: new Date().toISOString(),
    };
    const issues = (() => { try { return JSON.parse(localStorage.getItem(ISSUES_KEY) ?? "[]") as Issue[]; } catch { return []; } })();
    const index = issues.findIndex((item) => item.id === nextIssue.id);
    if (index >= 0) issues[index] = nextIssue; else issues.unshift(nextIssue);
    localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
    setIssue(nextIssue);
    setStatus("Typography applied to issue");
  }

  const active = useMemo(() => ({ ...typographyPresets[selected], ...presetCopy[selected] }), [selected]);

  return (
    <main className="utility-shell">
      <header className="utility-topbar"><Link href={`/?issue=${issue.id}`} className="secondary-button"><ArrowLeft size={15}/> Back to studio</Link><div className="brand-title">Lexozine <span>Styles</span></div><button className="primary-button" onClick={save}><Check size={15}/> Apply system</button></header>
      <section className="utility-hero"><span className="eyebrow">Design system</span><h1>Typography & editorial styles</h1><p>Control the typographic voice of <strong>{issue.title}</strong> from one reusable issue-level system.</p></section>
      <section className="utility-grid two-column">
        <div className="utility-panel"><h2>Type presets</h2><div className="preset-list">{(Object.keys(typographyPresets) as TypographyPreset[]).map((id) => <button key={id} className={`preset-card ${selected === id ? "active" : ""}`} onClick={() => selectPreset(id)}><Type size={18}/><div><strong>{typographyPresets[id].label}</strong><span>{presetCopy[id].description}</span><small>{presetCopy[id].display} + {presetCopy[id].body}</small></div></button>)}</div></div>
        <div className="utility-panel"><h2>Fine controls</h2><label className="range-field"><span>Body size <strong>{bodySize}px</strong></span><input type="range" min="8" max="14" step="0.5" value={bodySize} onChange={(e)=>setBodySize(Number(e.target.value))}/></label><label className="range-field"><span>Line height <strong>{leading.toFixed(2)}</strong></span><input type="range" min="1.2" max="2" step="0.05" value={leading} onChange={(e)=>setLeading(Number(e.target.value))}/></label><label className="range-field"><span>Tracking <strong>{tracking}</strong></span><input type="range" min="-2" max="6" step="0.25" value={tracking} onChange={(e)=>setTracking(Number(e.target.value))}/></label><div className="type-preview" style={{fontFamily: active.bodyFamily, fontSize: bodySize, lineHeight: leading, letterSpacing: `${tracking/10}px`}}><span style={{fontFamily: active.displayFamily}}>The shape of a story</span><p>Typography carries hierarchy, rhythm and tone. Lexozine keeps those decisions reusable across the entire issue.</p><blockquote>Good editorial design gives the reader a path through complexity.</blockquote></div><div className="save-state" style={{marginTop:14}}><span className="save-dot"/> {status}</div></div>
      </section>
    </main>
  );
}
