"use client";

import { ArrowLeft, Check, Columns2, Columns3, Grid2X2, LayoutTemplate, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Article, Issue } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";

type LayoutPreset = {
  id: string;
  name: string;
  category: string;
  description: string;
  columns: 1 | 2 | 3;
  imageRatio: string;
  character: string;
  articleLayout: Article["layout"];
};

const initialLayouts: LayoutPreset[] = [
  { id: "feature-opener", name: "Feature Opener", category: "Feature", description: "Large editorial headline, deck and dominant image for long-form story openings.", columns: 2, imageRatio: "3:2", character: "Expressive", articleLayout: "feature" },
  { id: "classic-essay", name: "Classic Essay", category: "Editorial", description: "Quiet text-led spread with generous margins, drop cap and pull quote rhythm.", columns: 2, imageRatio: "4:3", character: "Literary", articleLayout: "essay" },
  { id: "visual-report", name: "Visual Report", category: "Culture", description: "Image-forward modular grid for photography, captions and short editorial text.", columns: 3, imageRatio: "1:1", character: "Visual", articleLayout: "visual" },
  { id: "interview", name: "Interview", category: "People", description: "Portrait-led Q&A system with strong speaker hierarchy and flexible side notes.", columns: 2, imageRatio: "4:5", character: "Conversational", articleLayout: "interview" },
  { id: "dispatch", name: "Dispatch", category: "News", description: "Dense, efficient page system for briefs, sidebars and multi-item editorial packages.", columns: 3, imageRatio: "16:9", character: "Structured", articleLayout: "essay" },
  { id: "minimal-profile", name: "Minimal Profile", category: "Profile", description: "Single-subject feature with restrained typography and dramatic negative space.", columns: 1, imageRatio: "2:3", character: "Minimal", articleLayout: "feature" },
];

const ISSUES_KEY = "lexozine-issues-v1";

export default function LayoutLibrary() {
  const [layouts, setLayouts] = useState(initialLayouts);
  const [active, setActive] = useState(layouts[0].id);
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [articleId, setArticleId] = useState("");
  const [status, setStatus] = useState("Choose an article and layout");

  useEffect(() => {
    try {
      const issues = JSON.parse(localStorage.getItem(ISSUES_KEY) ?? "[]") as Issue[];
      const requestedId = new URLSearchParams(window.location.search).get("issue");
      const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
      if (found) {
        setIssue(found);
        setArticleId(found.articles[0]?.id ?? "");
      }
    } catch {}
  }, []);

  const activeLayout = useMemo(() => layouts.find((layout) => layout.id === active) ?? layouts[0], [layouts, active]);

  function persist(nextIssue: Issue) {
    const issues = (() => { try { return JSON.parse(localStorage.getItem(ISSUES_KEY) ?? "[]") as Issue[]; } catch { return []; } })();
    const index = issues.findIndex((item) => item.id === nextIssue.id);
    if (index >= 0) issues[index] = nextIssue; else issues.unshift(nextIssue);
    localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
    setIssue(nextIssue);
  }

  function applyLayout() {
    if (!articleId) return;
    const nextIssue = { ...issue, articles: issue.articles.map((article) => article.id === articleId ? { ...article, layout: activeLayout.articleLayout, columns: activeLayout.columns, updatedAt: new Date().toISOString() } : article), updatedAt: new Date().toISOString() };
    persist(nextIssue);
    const article = nextIssue.articles.find((item) => item.id === articleId);
    setStatus(`${activeLayout.name} applied to ${article?.title ?? "article"}`);
  }

  function duplicateLayout(layout: LayoutPreset) {
    const copy = { ...layout, id: `${layout.id}-${Date.now()}`, name: `${layout.name} Copy` };
    setLayouts((current) => [...current, copy]);
    setActive(copy.id);
  }

  return (
    <main className="layout-library-page">
      <header className="layout-library-header"><div className="layout-title-wrap"><Link href={`/?issue=${issue.id}`} className="layout-back"><ArrowLeft size={16} /> Studio</Link><span className="layout-eyebrow">Lexozine design system</span><h1>Layout Library</h1><p>Reusable editorial systems for consistent, high-quality magazine pages and spreads.</p></div><div className="layout-apply-panel"><select value={articleId} onChange={(e)=>setArticleId(e.target.value)}>{issue.articles.map((article)=><option key={article.id} value={article.id}>{article.title}</option>)}</select><button className="layout-create" onClick={applyLayout}><Check size={16} /> Apply layout</button><small>{status}</small></div></header>

      <section className="layout-library-grid">{layouts.map((layout) => <article key={layout.id} className={`layout-preset-card ${active === layout.id ? "active" : ""}`} onClick={() => setActive(layout.id)}><div className={`layout-preview columns-${layout.columns}`}><div className="layout-preview-head" /><div className="layout-preview-deck" /><div className="layout-preview-image" /><div className="layout-preview-copy" /><div className="layout-preview-copy short" /><div className="layout-preview-accent" /></div><div className="layout-card-copy"><div className="layout-card-top"><span>{layout.category}</span><strong>{layout.character}</strong></div><h2>{layout.name}</h2><p>{layout.description}</p><div className="layout-specs"><span>{layout.columns === 3 ? <Columns3 size={13} /> : layout.columns === 2 ? <Columns2 size={13} /> : <Grid2X2 size={13} />} {layout.columns} column{layout.columns > 1 ? "s" : ""}</span><span><LayoutTemplate size={13} /> Image {layout.imageRatio}</span></div><button onClick={(event) => { event.stopPropagation(); duplicateLayout(layout); }}><Sparkles size={13} /> Duplicate & customise</button></div></article>)}</section>
    </main>
  );
}
