"use client";

import { Check, Columns2, Columns3, FileText, Grid2X2, LayoutTemplate, PencilRuler } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import StudioEditorShell from "@/components/studio-editor-shell";
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
          setArticleId(
            requestedArticleId && found.articles.some((article) => article.id === requestedArticleId)
              ? requestedArticleId
              : found.articles[0]?.id ?? "",
          );
          setStatus("Choose an article type or starting composition. Nothing is locked after you apply it.");
        } else {
          setStatus("Create an issue before applying a preset");
        }
      } catch {
        if (alive) setStatus("Issue state is temporarily unavailable");
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  const activeLayout = useMemo(
    () => layoutPresets.find((layout) => layout.id === active) ?? layoutPresets[0],
    [active],
  );
  const selectedArticle = issue.articles.find((article) => article.id === articleId);
  const articleEditorHref = articleId ? `/issues/${issue.id}/articles/${articleId}` : `/issues/${issue.id}`;

  async function persist(nextIssue: Issue) {
    const saved = await issueStore?.save(nextIssue) ?? nextIssue;
    setIssue(saved);
    return saved;
  }

  async function applyLayout() {
    if (!articleId) return;
    setStatus("Applying editable article preset…");
    const nextIssue: Issue = {
      ...issue,
      articles: issue.articles.map((article) => article.id === articleId ? applyLayoutPreset(article, activeLayout.id) : article),
      updatedAt: new Date().toISOString(),
    };
    try {
      const saved = await persist(nextIssue);
      const article = saved.articles.find((item) => item.id === articleId);
      setApplied(true);
      setStatus(`${activeLayout.name} applied to ${article?.title ?? "article"}. Continue in the canvas or article editor to refine every block.`);
    } catch {
      setStatus("Preset could not be saved. Try again.");
    }
  }

  const previewHref = `/preview?issue=${encodeURIComponent(issue.id)}`;
  const exportHref = `/export?issue=${encodeURIComponent(issue.id)}`;

  return (
    <StudioEditorShell
      issueId={issue.id}
      issueTitle={issue.title}
      documentLabel="Layouts"
      saveState={status}
      saveAction={{ label: "Apply preset", onClick: () => void applyLayout(), disabled: !articleId }}
      previewHref={previewHref}
      exportHref={exportHref}
      navigator={
        <div className="layout-nav">
          <div className="layout-panel-head"><FileText size={16} /><strong>Article target</strong></div>
          <label className="layout-article-select">
            <span>Apply to</span>
            <select value={articleId} onChange={(event) => { setArticleId(event.target.value); setApplied(false); }}>
              {issue.articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}
            </select>
          </label>
          <div className="layout-nav-summary">
            <span>Current story</span>
            <strong>{selectedArticle?.title ?? "No article selected"}</strong>
            <small>{selectedArticle?.category ?? "Choose an article from this issue"}</small>
          </div>
          <div className="layout-nav-note">
            <PencilRuler size={16} />
            <p>Presets establish the starting hierarchy and rhythm. They never lock the story’s content or its final visual composition.</p>
          </div>
        </div>
      }
      toolbar={
        <>
          <div className="layout-toolbar-label"><LayoutTemplate size={15} /> Preset gallery</div>
          <div className="layout-toolbar-current"><span>Selected</span><strong>{activeLayout.name}</strong></div>
        </>
      }
      inspector={
        <div className="layout-inspector">
          <div className="layout-panel-head"><LayoutTemplate size={16} /><strong>Preset details</strong></div>
          <div className={`layout-preview layout-inspector-preview columns-${activeLayout.columns}`}>
            <div className="layout-preview-head" /><div className="layout-preview-deck" /><div className="layout-preview-image" /><div className="layout-preview-copy" /><div className="layout-preview-copy short" /><div className="layout-preview-accent" />
          </div>
          <div className="layout-inspector-copy">
            <span>{activeLayout.category}</span>
            <h2>{activeLayout.name}</h2>
            <p>{activeLayout.description}</p>
          </div>
          <div className="layout-specs">
            <span>{activeLayout.columns === 3 ? <Columns3 size={13} /> : activeLayout.columns === 2 ? <Columns2 size={13} /> : <Grid2X2 size={13} />} {activeLayout.columns} column{activeLayout.columns > 1 ? "s" : ""}</span>
            <span><LayoutTemplate size={13} /> Image {activeLayout.imageRatio}</span>
          </div>
          <div className="layout-editability">Fully editable after application</div>
          <Link className="layout-open-editor" href={articleEditorHref}>{applied ? "Open article editor" : "Continue without applying"}</Link>
        </div>
      }
      status={<><span>{selectedArticle ? `Target: ${selectedArticle.title}` : "No article selected"}</span><span>•</span><span>{activeLayout.category} preset</span><span>•</span><span>All blocks remain editable</span></>}
    >
      <div className="layout-canvas">
        <div className="layout-canvas-heading">
          <div><span>Editorial compositions</span><h1>Choose a starting rhythm</h1></div>
          <p>Apply the selected preset, then continue composing on the Canvas with direct frame controls.</p>
        </div>
        <div className="layout-library-grid">
          {layoutPresets.map((layout) => (
            <button
              type="button"
              key={layout.id}
              className={`layout-preset-card ${active === layout.id ? "active" : ""}`}
              onClick={() => { setActive(layout.id); setApplied(false); }}
            >
              <div className={`layout-preview columns-${layout.columns}`}>
                <div className="layout-preview-head" /><div className="layout-preview-deck" /><div className="layout-preview-image" /><div className="layout-preview-copy" /><div className="layout-preview-copy short" /><div className="layout-preview-accent" />
              </div>
              <div className="layout-card-copy">
                <div className="layout-card-top"><span>{layout.category}</span><strong>{layout.character}</strong></div>
                <h2>{layout.name}</h2>
                <p>{layout.description}</p>
                <div className="layout-specs">
                  <span>{layout.columns === 3 ? <Columns3 size={13} /> : layout.columns === 2 ? <Columns2 size={13} /> : <Grid2X2 size={13} />} {layout.columns} column{layout.columns > 1 ? "s" : ""}</span>
                  <span><LayoutTemplate size={13} /> Image {layout.imageRatio}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </StudioEditorShell>
  );
}
