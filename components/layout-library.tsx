"use client";

import { ArrowLeft, Check, Columns2, Columns3, Grid2X2, LayoutTemplate, PencilRuler } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Issue } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";
import { issueStore } from "@/lib/issue-store";
import { applyLayoutPreset, layoutPresets } from "@/lib/layout-composer";

export default function LayoutLibrary() {
  const [active, setActive] = useState(layoutPresets[0].id);
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [articleId, setArticleId] = useState("");
  const [status, setStatus] = useState("Loading shared issue…");
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const issues = await issueStore?.list() ?? [];
        if (!alive) return;
        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get("issue");
        const requestedArticleId = params.get("article");
        const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
        if (found) {
          setIssue(found);
          setArticleId(requestedArticleId && found.articles.some((article) => article.id === requestedArticleId) ? requestedArticleId : found.articles[0]?.id ?? "");
          setStatus("Choose a starting composition. Nothing is locked after you apply it.");
        } else {
          setStatus("Create an issue before applying a layout");
        }
      } catch {
        if (alive) setStatus("Issue state is temporarily unavailable");
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  const activeLayout = useMemo(() => layoutPresets.find((layout) => layout.id === active) ?? layoutPresets[0], [active]);
  const articleEditorHref = articleId ? `/issues/${issue.id}/articles/${articleId}` : `/issues/${issue.id}`;

  async function persist(nextIssue: Issue) {
    const saved = await issueStore?.save(nextIssue) ?? nextIssue;
    setIssue(saved);
    return saved;
  }

  async function applyLayout() {
    if (!articleId) return;
    setStatus("Applying editable composition…");
    const now = new Date().toISOString();
    const nextIssue: Issue = {
      ...issue,
      articles: issue.articles.map((article) => article.id === articleId ? applyLayoutPreset(article, activeLayout.id) : article),
      updatedAt: now,
    };
    try {
      const saved = await persist(nextIssue);
      const article = saved.articles.find((item) => item.id === articleId);
      setApplied(true);
      setStatus(`${activeLayout.name} applied to ${article?.title ?? "article"}. Open Design mode to reorder, hide, resize and duplicate its blocks.`);
    } catch {
      setStatus("Layout could not be saved. Try again.");
    }
  }

  return (
    <main className="layout-library-page">
      <header className="layout-library-header">
        <div className="layout-title-wrap">
          <Link href={`/issues/${issue.id}`} className="layout-back"><ArrowLeft size={16} /> Issue workspace</Link>
          <span className="layout-eyebrow">Lexozine design system · Release 0.6</span>
          <h1>Layout Library</h1>
          <p>Choose a composition as a starting point, then refine the actual article in Design mode. Presets never lock the story into a fixed arrangement.</p>
        </div>
        <div className="layout-apply-panel">
          <select value={articleId} onChange={(e)=>{setArticleId(e.target.value);setApplied(false);}}>{issue.articles.map((article)=><option key={article.id} value={article.id}>{article.title}</option>)}</select>
          <button className="layout-create" onClick={()=>void applyLayout()}><Check size={16} /> Apply & customise</button>
          <Link className="layout-continue" href={articleEditorHref}>{applied ? "Open article in Design mode" : "Continue without layout"}</Link>
          <small>{status}</small>
        </div>
      </header>

      <section className="layout-flex-note"><PencilRuler size={17}/><div><strong>Editable by design</strong><span>After applying a preset you can remove or hide parts, move blocks up or down, reorder images and text, change 1/2/3-column structure, change block spans, duplicate blocks and lock elements you want to keep in place.</span></div></section>

      <section className="layout-library-grid">{layoutPresets.map((layout) => <article key={layout.id} className={`layout-preset-card ${active === layout.id ? "active" : ""}`} onClick={() => setActive(layout.id)}><div className={`layout-preview columns-${layout.columns}`}><div className="layout-preview-head" /><div className="layout-preview-deck" /><div className="layout-preview-image" /><div className="layout-preview-copy" /><div className="layout-preview-copy short" /><div className="layout-preview-accent" /></div><div className="layout-card-copy"><div className="layout-card-top"><span>{layout.category}</span><strong>{layout.character}</strong></div><h2>{layout.name}</h2><p>{layout.description}</p><div className="layout-specs"><span>{layout.columns === 3 ? <Columns3 size={13} /> : layout.columns === 2 ? <Columns2 size={13} /> : <Grid2X2 size={13} />} {layout.columns} column{layout.columns > 1 ? "s" : ""}</span><span><LayoutTemplate size={13} /> Image {layout.imageRatio}</span></div><div className="layout-editability">Starting composition · fully editable</div></div></article>)}</section>
    </main>
  );
}
