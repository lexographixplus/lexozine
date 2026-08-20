"use client";

import { Archive, ArrowLeft, CheckCircle2, FileJson, FileText, Globe2, Printer, ShieldCheck } from "lucide-react";
import Link from "next/link";

const checks = [
  ["Editorial structure", "Cover, contents and article sequence are present."],
  ["Image accessibility", "Media library supports alt text and focal-point metadata."],
  ["Print geometry", "A4, 3 mm bleed and 12 mm safe-area conventions are represented in Studio."],
  ["Recovery", "Local autosave and explicit version checkpoints reduce accidental loss."],
];

function downloadPackage() {
  const payload = {
    format: "lexozine-package-v1",
    exportedAt: new Date().toISOString(),
    issue: { title: "New Voices", number: "01", status: "draft" },
    note: "Structured package placeholder. Database-backed issue content will replace this snapshot when persistence is enabled.",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "lexozine-issue-01-package.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ExportCenter() {
  return (
    <main className="export-page">
      <header className="export-header">
        <div>
          <Link href="/" className="export-back"><ArrowLeft size={16} /> Studio</Link>
          <span className="export-eyebrow">Production & delivery</span>
          <h1>Export Center</h1>
          <p>Prepare a magazine issue for review, print/PDF delivery, digital publication, or archival handoff.</p>
        </div>
        <div className="export-ready"><ShieldCheck size={18} /><div><strong>Preflight</strong><span>4 checks available</span></div></div>
      </header>

      <section className="export-grid">
        <article className="export-card primary"><div className="export-icon"><Printer size={22}/></div><span>Print / PDF</span><h2>Production PDF</h2><p>Use the browser print engine for current proofing. Server-rendered, deterministic pagination remains the production target for final press-quality output.</p><button onClick={() => window.print()}><Printer size={15}/>Print or save PDF</button></article>
        <article className="export-card"><div className="export-icon"><Globe2 size={22}/></div><span>Digital edition</span><h2>Web publication</h2><p>Preview the responsive reading experience that turns a finished issue into a shareable digital magazine.</p><Link href="/preview"><Globe2 size={15}/>Open digital edition</Link></article>
        <article className="export-card"><div className="export-icon"><FileJson size={22}/></div><span>Archive</span><h2>Issue package</h2><p>Download a structured issue package for backup and future migration between persistence systems.</p><button onClick={downloadPackage}><Archive size={15}/>Download package</button></article>
        <article className="export-card muted"><div className="export-icon"><FileText size={22}/></div><span>Editable document</span><h2>DOCX export</h2><p>The original prototype proved DOCX generation. This production route is reserved for the structured Article → Block exporter once the editor model is fully connected.</p><button disabled><FileText size={15}/>Coming in persistence milestone</button></article>
      </section>

      <section className="preflight-panel"><div><span className="export-eyebrow">Issue preflight</span><h2>Before final delivery</h2></div><div className="preflight-list">{checks.map(([title,copy])=><div key={title}><CheckCircle2 size={17}/><div><strong>{title}</strong><span>{copy}</span></div></div>)}</div></section>
    </main>
  );
}
