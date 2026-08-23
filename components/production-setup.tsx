"use client";

import Link from "next/link";
import { ArrowLeft, Check, Ruler } from "lucide-react";
import { useEffect, useState } from "react";
import type { Issue, ProductionSettings } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";
import { defaultProductionSettings } from "@/lib/editor-model";
import { issueStore } from "@/lib/issue-store";

const BEHAVIOR_KEY = "lexozine-layout-behavior-v1";

export default function ProductionSetup() {
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [settings, setSettings] = useState<ProductionSettings>(defaultProductionSettings);
  const [showGuides, setShowGuides] = useState(true);
  const [snap, setSnap] = useState(true);
  const [saved, setSaved] = useState("Ready");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const issues = await issueStore?.list() ?? [];
        const requestedId = new URLSearchParams(window.location.search).get("issue");
        const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
        if (found && alive) {
          setIssue(found);
          setSettings(found.production ?? defaultProductionSettings);
        }
        const behavior = JSON.parse(localStorage.getItem(BEHAVIOR_KEY) ?? "{}") as { showGuides?: boolean; snap?: boolean };
        if (alive) { setShowGuides(behavior.showGuides ?? true); setSnap(behavior.snap ?? true); }
      } catch {
        if (alive) setSaved("Issue settings are temporarily unavailable");
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  function patch(next: Partial<ProductionSettings>) {
    setSettings((current) => ({ ...current, ...next }));
  }

  function patchIssue(next: Partial<Issue>) {
    setIssue((current) => ({ ...current, ...next }));
  }

  function updateCoverLine(index: number, value: string) {
    setIssue((current) => {
      const lines = [...current.coverLines];
      lines[index] = value;
      return { ...current, coverLines: lines };
    });
  }

  async function save() {
    const nextIssue = { ...issue, production: settings, updatedAt: new Date().toISOString() };
    try {
      const savedIssue = await issueStore?.save(nextIssue) ?? nextIssue;
      localStorage.setItem(BEHAVIOR_KEY, JSON.stringify({ showGuides, snap }));
      setIssue(savedIssue);
      setSaved("Issue and production settings saved");
    } catch {
      setSaved("Settings could not be saved. Try again.");
    }
  }

  return (
    <main className="utility-shell">
      <header className="utility-topbar"><Link href={`/issues/${issue.id}`} className="secondary-button"><ArrowLeft size={15}/> Back to workspace</Link><div className="brand-title">Lexozine <span>Setup</span></div><button className="primary-button" onClick={() => void save()}><Check size={15}/> Save setup</button></header>
      <section className="utility-hero"><span className="eyebrow">Publication configuration</span><h1>Issue & production setup</h1><p>Manage the editorial identity and physical production rules that drive the cover, contents, editor, digital edition and exports.</p></section>
      <section className="utility-grid two-column">
        <div className="utility-panel">
          <h2>Issue identity</h2>
          <div className="form-grid"><div className="form-field"><label>Issue title</label><input value={issue.title} onChange={(e)=>patchIssue({title:e.target.value})}/></div><div className="form-field"><label>Issue number</label><input value={issue.number} onChange={(e)=>patchIssue({number:e.target.value})}/></div><div className="form-field"><label>Edition date</label><input value={issue.editionDate} onChange={(e)=>patchIssue({editionDate:e.target.value})}/></div></div>
          <label className="stacked-field" style={{marginTop:14}}><span>Description / editor's note</span><textarea rows={6} value={issue.description} onChange={(e)=>patchIssue({description:e.target.value})}/></label>
          <h2 style={{marginTop:22}}>Cover lines</h2>
          {[0,1,2].map((index)=><div className="form-field" key={index} style={{marginTop:9}}><label>Cover line {index+1}</label><input value={issue.coverLines[index]??""} onChange={(e)=>updateCoverLine(index,e.target.value)}/></div>)}
        </div>
        <div className="utility-panel"><h2>Document geometry</h2><div className="form-grid"><div className="form-field"><label>Page size</label><select value={settings.pageSize} onChange={(e)=>patch({pageSize:e.target.value as ProductionSettings["pageSize"]})}><option>A4</option><option>A5</option><option>US Letter</option><option>Square 210</option><option>Custom</option></select></div><div className="form-field"><label>Orientation</label><select value={settings.orientation} onChange={(e)=>patch({orientation:e.target.value as ProductionSettings["orientation"]})}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></div><div className="form-field"><label>Bleed (mm)</label><input type="number" min="0" max="10" value={settings.bleed} onChange={(e)=>patch({bleed:Number(e.target.value)})}/></div><div className="form-field"><label>Safe margin (mm)</label><input type="number" min="5" max="30" value={settings.safeMargin} onChange={(e)=>patch({safeMargin:Number(e.target.value)})}/></div><div className="form-field"><label>Column gutter (mm)</label><input type="number" min="2" max="20" value={settings.gutter} onChange={(e)=>patch({gutter:Number(e.target.value)})}/></div><div className="form-field"><label>Baseline grid (pt)</label><input type="number" min="8" max="24" value={settings.baseline} onChange={(e)=>patch({baseline:Number(e.target.value)})}/></div></div><h2 style={{marginTop:22}}>Layout behavior</h2><label className="check-row"><span>Show margin and bleed guides</span><input type="checkbox" checked={showGuides} onChange={(e)=>setShowGuides(e.target.checked)}/></label><label className="check-row"><span>Snap objects to layout grid</span><input type="checkbox" checked={snap} onChange={(e)=>setSnap(e.target.checked)}/></label><div className="utility-card" style={{marginTop:18}}><Ruler size={22}/><h3>Current production profile</h3><p>{settings.pageSize} · {settings.orientation} · {settings.bleed} mm bleed · {settings.safeMargin} mm safe margin · {settings.gutter} mm gutter · {settings.baseline} pt baseline.</p></div><div className="save-state" style={{marginTop:16}}><span className="save-dot"/> {saved}</div></div>
      </section>
    </main>
  );
}
