"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDot,
  FileText,
  ImageIcon,
  LayoutTemplate,
  MonitorUp,
  Pencil,
  Plus,
  Settings2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { DragEvent, useEffect, useMemo, useState } from "react";
import IssueNavigation from "@/components/issue-navigation";
import type { Article, ArticleWorkflowStatus, Issue, IssuePage } from "@/lib/editor-model";
import { createId } from "@/lib/editor-model";
import { articleReadiness, articleWorkflowLabels, getArticleWorkflowStatus, setArticleWorkflowStatus } from "@/lib/editorial-workflow";
import { applyLayoutPreset, layoutPresets } from "@/lib/layout-composer";
import { issueStore } from "@/lib/issue-store";

function createArticle(title: string, issue?: Issue): Article {
  const now = new Date().toISOString();
  const theme = issue?.theme ?? "editorial";
  return {
    id: createId("article"),
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    category: "Feature",
    byline: "Lexozine Editorial",
    readTime: "6 min read",
    layout: "feature",
    columns: 2,
    theme,
    blocks: [
      { id: createId("block"), type: "headline", content: title, order: 0, layout: { hidden: false, span: 2, locked: false } },
      { id: createId("block"), type: "deck", content: "Add a concise editorial deck that frames the story.", order: 1, layout: { hidden: false, span: 2, locked: false } },
      { id: createId("block"), type: "body", content: "Begin the story here.", order: 2, layout: { hidden: false, span: 1, locked: false } },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export default function IssueWorkspace({ issueId }: { issueId: string }) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showArticleCreator, setShowArticleCreator] = useState(false);
  const [articleTitle, setArticleTitle] = useState("");
  const [articlePresetId, setArticlePresetId] = useState("feature-opener");
  const [articleCreateError, setArticleCreateError] = useState("");
  const [editingIssueName, setEditingIssueName] = useState(false);
  const [issueNameDraft, setIssueNameDraft] = useState("");
  const [draggedArticleId, setDraggedArticleId] = useState("");
  const [dragOverArticleId, setDragOverArticleId] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const found = await issueStore?.get(issueId) ?? null;
        if (alive) {
          setIssue(found);
          setIssueNameDraft(found?.title ?? "");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [issueId]);

  const readiness = useMemo(() => issue ? articleReadiness(issue) : null, [issue]);
  const selectedPreset = useMemo(() => layoutPresets.find((preset) => preset.id === articlePresetId) ?? layoutPresets[0], [articlePresetId]);
  const orderedArticles = useMemo(() => {
    if (!issue) return [];
    const pageOrder = new Map(issue.pages.filter((page) => page.articleId).map((page) => [page.articleId!, page.order]));
    return [...issue.articles].sort((a, b) => (pageOrder.get(a.id) ?? 999) - (pageOrder.get(b.id) ?? 999));
  }, [issue]);
  const coverReady = Boolean(issue && (issue.coverImageUrl || issue.cover?.assets?.length || issue.cover?.mainHeadline));
  const readinessTasks = useMemo(() => {
    if (!issue) return [] as Array<{ id: string; title: string; detail: string; href: string }>;
    const tasks: Array<{ id: string; title: string; detail: string; href: string }> = [];
    if (!coverReady) tasks.push({ id: "cover", title: "Complete the cover", detail: "The issue still needs a cover treatment or image.", href: `/cover?issue=${issue.id}` });
    if (!issue.articles.length) tasks.push({ id: "article", title: "Add the first article", detail: "The editorial sequence is still empty.", href: `#articles` });
    for (const article of orderedArticles) {
      const workflow = getArticleWorkflowStatus(issue, article.id);
      const visibleBlocks = article.blocks.filter((block) => !block.layout?.hidden);
      const hasHeadline = visibleBlocks.some((block) => block.type === "headline" && block.content.trim());
      const imageBlocks = visibleBlocks.filter((block) => block.type === "image");
      const hasImage = imageBlocks.some((block) => block.imageUrl);
      const missingAlt = imageBlocks.some((block) => block.imageUrl && !(block.placement?.alt ?? "").trim());
      const href = `/issues/${issue.id}/articles/${article.id}`;
      if (!hasHeadline) tasks.push({ id: `${article.id}-headline`, title: `${article.title}: headline needed`, detail: "Add or restore a visible headline block.", href });
      if (article.category !== "Poetry" && !hasImage) tasks.push({ id: `${article.id}-image`, title: `${article.title}: image needed`, detail: "Add publication imagery or intentionally use a poetry/text-led preset.", href });
      if (missingAlt) tasks.push({ id: `${article.id}-alt`, title: `${article.title}: alt text needed`, detail: "One or more placed images are missing accessibility text.", href });
      if (workflow !== "approved") tasks.push({ id: `${article.id}-workflow`, title: `${article.title}: ${articleWorkflowLabels[workflow]}`, detail: "Move the article through review and approval before publishing.", href });
    }
    return tasks;
  }, [issue, orderedArticles, coverReady]);

  async function persist(next: Issue, note?: string) {
    const saved = await issueStore?.save({ ...next, updatedAt: new Date().toISOString() }) ?? next;
    setIssue(saved);
    if (note) setMessage(note);
    return saved;
  }

  async function saveIssueName() {
    if (!issue) return;
    const title = issueNameDraft.trim();
    if (!title) {
      setMessage("Issue name cannot be empty.");
      return;
    }
    const saved = await persist({ ...issue, title }, "Issue name updated");
    setIssueNameDraft(saved.title);
    setEditingIssueName(false);
  }

  async function changeStatus(articleId: string, status: ArticleWorkflowStatus) {
    if (!issue) return;
    await persist(setArticleWorkflowStatus(issue, articleId, status), `Article moved to ${articleWorkflowLabels[status]}`);
  }

  async function persistArticleOrder(articles: Article[], note = "Article order updated") {
    if (!issue) return;
    const articlePageIds = new Set(articles.map((article) => article.id));
    const nonArticlePages = issue.pages.filter((page) => !page.articleId || !articlePageIds.has(page.articleId));
    const baseOrder = nonArticlePages.length;
    const articlePages: IssuePage[] = articles.map((article, order) => {
      const existing = issue.pages.find((page) => page.articleId === article.id);
      return existing
        ? { ...existing, label: article.title, order: baseOrder + order }
        : { id: createId("page"), label: article.title, kind: "article", articleId: article.id, order: baseOrder + order };
    });
    await persist({ ...issue, articles, pages: [...nonArticlePages, ...articlePages] }, note);
  }

  async function moveArticle(articleId: string, direction: -1 | 1) {
    const articles = [...orderedArticles];
    const index = articles.findIndex((article) => article.id === articleId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= articles.length) return;
    [articles[index], articles[target]] = [articles[target], articles[index]];
    await persistArticleOrder(articles);
  }

  async function dropArticle(sourceId: string, targetId: string) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const articles = [...orderedArticles];
    const from = articles.findIndex((article) => article.id === sourceId);
    const to = articles.findIndex((article) => article.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = articles.splice(from, 1);
    articles.splice(to, 0, moved);
    await persistArticleOrder(articles, "Article order updated by drag and drop");
  }

  function handleArticleDragStart(event: DragEvent<HTMLElement>, articleId: string) {
    event.dataTransfer.effectAllowed = "move";
    setDraggedArticleId(articleId);
  }

  async function addArticle() {
    if (!issue) return;
    const title = articleTitle.trim();
    if (!title) {
      setArticleCreateError("Give the article a title before creating it.");
      return;
    }
    const article = applyLayoutPreset(createArticle(title, issue), selectedPreset.id);
    const page: IssuePage = {
      id: createId("page"),
      label: article.title,
      kind: "article",
      articleId: article.id,
      order: issue.pages.length,
    };
    const next = setArticleWorkflowStatus({ ...issue, articles: [...issue.articles, article], pages: [...issue.pages, page] }, article.id, "draft");
    const saved = await persist(next, `${selectedPreset.name} article added`);
    setArticleTitle("");
    setArticleCreateError("");
    setShowArticleCreator(false);
    window.location.href = `/issues/${encodeURIComponent(saved.id)}/articles/${encodeURIComponent(article.id)}`;
  }

  function openArticleCreator(note?: string) {
    setShowArticleCreator(true);
    setArticleCreateError("");
    if (note) setMessage(note);
    window.setTimeout(() => document.getElementById("articles")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  }

  if (loading) return <main className="editorial-loading">Loading issue workspace…</main>;
  if (!issue || !readiness) return <main className="editorial-loading">Issue not found.</main>;

  return (
    <main className="issue-workspace-shell">
      <header className="editorial-topbar">
        <Link href="/issues" className="editorial-back"><ArrowLeft size={16}/> Issues</Link>
        <div className="editorial-brand"><strong>Lexozine</strong><span>Editorial workspace</span></div>
        <div className="editorial-actions">
          <Link href={`/review?issue=${issue.id}`} className="editorial-button secondary"><CheckCircle2 size={15}/> Review</Link>
          <Link href={`/preview?issue=${issue.id}`} className="editorial-button"><MonitorUp size={15}/> Preview issue</Link>
        </div>
      </header>

      <IssueNavigation issueId={issue.id} active="issue"/>

      <section className="issue-workspace-hero">
        <div>
          <span className="editorial-eyebrow">Issue {issue.number} · {issue.editionDate}</span>
          <div className="issue-title-row"><h1>{issue.title}</h1><button className="issue-title-edit" onClick={() => { setIssueNameDraft(issue.title); setEditingIssueName((value) => !value); }}><Pencil size={13}/> Rename</button></div>
          {editingIssueName ? <div className="issue-rename-panel"><input value={issueNameDraft} onChange={(event) => setIssueNameDraft(event.target.value)} aria-label="Issue name"/><button onClick={() => void saveIssueName()}>Save name</button><button className="secondary" onClick={() => { setIssueNameDraft(issue.title); setEditingIssueName(false); }}>Cancel</button></div> : null}
          <p>{issue.description || "Build the issue article by article, then review and publish when the editorial checklist is clear."}</p>
          {message ? <div className="editorial-message">{message}</div> : null}
        </div>
        <div className="readiness-card">
          <span>Editorial readiness</span>
          <strong>{readiness.percentage}%</strong>
          <div className="readiness-track"><i style={{ width: `${readiness.percentage}%` }}/></div>
          <small>{readiness.approved} of {readiness.total} articles approved</small>
        </div>
      </section>

      <section className="issue-workspace-summary">
        <Link href={`/cover?issue=${issue.id}`} className={`workflow-summary-card ${coverReady ? "ready" : "attention"}`}>
          <ImageIcon size={18}/><div><span>Cover</span><strong>{coverReady ? "Ready to refine" : "Needs attention"}</strong></div><ArrowRight size={15}/>
        </Link>
        <div className="workflow-summary-card"><FileText size={18}/><div><span>Articles</span><strong>{issue.articles.length} stories</strong></div></div>
        <div className="workflow-summary-card"><CircleDot size={18}/><div><span>In review</span><strong>{readiness.review}</strong></div></div>
        <div className="workflow-summary-card"><CheckCircle2 size={18}/><div><span>Approved</span><strong>{readiness.approved}</strong></div></div>
      </section>

      <section className="readiness-actions">
        <div className="readiness-actions-card">
          <header><h3>What needs attention</h3><span>{readinessTasks.length ? `${readinessTasks.length} action${readinessTasks.length === 1 ? "" : "s"}` : "Ready"}</span></header>
          {readinessTasks.length ? <div className="readiness-task-list">{readinessTasks.slice(0, 8).map((task) => task.href.startsWith("#") ? <button key={task.id} className="readiness-task" onClick={() => openArticleCreator()}><FileText size={15}/><div><strong>{task.title}</strong><span>{task.detail}</span></div></button> : <Link key={task.id} className="readiness-task" href={task.href}><ArrowRight size={15}/><div><strong>{task.title}</strong><span>{task.detail}</span></div></Link>)}</div> : <div className="readiness-all-clear">No structural blockers detected. Continue the editorial review and final visual check before publishing.</div>}
        </div>
      </section>

      {!issue.articles.length ? <section className="blank-issue-actions">
        <button className="blank-issue-action" onClick={() => openArticleCreator()}><Plus size={18}/><strong>Add first article</strong><span>Name it, choose Poetry/Essay/Interview/etc., then customise it in the editor.</span></button>
        <button className="blank-issue-action" onClick={() => openArticleCreator("Name the article first; once it opens, choose Import manuscript to map the document structure.")}><Upload size={18}/><strong>Import manuscript</strong><span>Create the article shell, then import DOCX/TXT/HTML with semantic mapping.</span></button>
        <Link className="blank-issue-action" href={`/cover?issue=${issue.id}`}><ImageIcon size={18}/><strong>Design cover</strong><span>Start the visual identity while editorial content is being prepared.</span></Link>
      </section> : null}

      <section className="issue-articles-section" id="articles">
        <div className="issue-section-heading">
          <div><span className="editorial-eyebrow">Editorial sequence</span><h2>Articles & pages</h2><p>Create the article with the right editorial preset, then drag to reorder and edit both content and composition freely.</p></div>
          <button onClick={() => { setShowArticleCreator((value) => !value); setArticleCreateError(""); }} className="editorial-button"><Plus size={15}/> {showArticleCreator ? "Close creator" : "Add article"}</button>
        </div>

        {showArticleCreator ? <section className="article-create-panel">
          <div className="article-create-copy"><span className="editorial-eyebrow">New article</span><h3>Name the entry and choose its starting format</h3><p>Article presets set the first-pass structure and typography. You can customise every block afterward in the editor.</p></div>
          <label className="article-create-title"><span>Article title</span><input autoFocus value={articleTitle} onChange={(event) => { setArticleTitle(event.target.value); setArticleCreateError(""); }} placeholder="e.g. The Road Home"/></label>
          <div className="article-type-heading"><span>Article type</span><small>Poetry is a single-column literary preset with preserved line rhythm and generous spacing.</small></div>
          <div className="article-type-grid">{layoutPresets.map((preset) => <button key={preset.id} className={`article-type-option ${articlePresetId === preset.id ? "active" : ""} ${preset.category === "Poetry" ? "poetry" : ""}`} onClick={() => setArticlePresetId(preset.id)}><strong>{preset.category}</strong><span>{preset.name}</span></button>)}</div>
          <div className="article-preset-summary"><LayoutTemplate size={16}/><div><strong>{selectedPreset.name}</strong><span>{selectedPreset.description}</span><small>{selectedPreset.columns} column{selectedPreset.columns > 1 ? "s" : ""} · {selectedPreset.character} · image {selectedPreset.imageRatio}</small></div></div>
          {articleCreateError ? <div className="article-create-error">{articleCreateError}</div> : null}
          <div className="article-create-actions"><button className="editorial-button secondary" onClick={() => { setShowArticleCreator(false); setArticleCreateError(""); }}>Cancel</button><button className="editorial-button save-action" onClick={() => void addArticle()}>Create & open editor <ArrowRight size={14}/></button></div>
        </section> : null}

        <div className="article-workflow-list">
          {orderedArticles.map((article, index) => {
            const status = getArticleWorkflowStatus(issue, article.id);
            const missingImage = !article.blocks.some((block) => block.type === "image" && block.imageUrl && !block.layout?.hidden);
            return (
              <article
                className={`article-workflow-row ${draggedArticleId === article.id ? "dragging" : ""} ${dragOverArticleId === article.id ? "drag-target" : ""}`}
                key={article.id}
                draggable
                onDragStart={(event) => handleArticleDragStart(event, article.id)}
                onDragOver={(event) => { event.preventDefault(); setDragOverArticleId(article.id); }}
                onDrop={(event) => { event.preventDefault(); void dropArticle(draggedArticleId, article.id); setDraggedArticleId(""); setDragOverArticleId(""); }}
                onDragEnd={() => { setDraggedArticleId(""); setDragOverArticleId(""); }}
              >
                <div className="article-order">{String(index + 1).padStart(2, "0")}</div>
                <div className="article-workflow-copy">
                  <div className="article-workflow-meta"><span>{article.category}</span><span>{article.layout} · {article.columns} col</span>{missingImage && article.category !== "Poetry" ? <span className="needs-media">Needs image</span> : null}</div>
                  <h3>{article.title}</h3>
                  <small>{article.byline} · {article.readTime}</small><div className="drag-hint">Drag row to reorder</div>
                </div>
                <label className={`workflow-status status-${status}`}>
                  <select value={status} onChange={(event) => void changeStatus(article.id, event.target.value as ArticleWorkflowStatus)}>
                    {(Object.keys(articleWorkflowLabels) as ArticleWorkflowStatus[]).map((value) => <option key={value} value={value}>{articleWorkflowLabels[value]}</option>)}
                  </select>
                  <ChevronDown size={13}/>
                </label>
                <div className="article-row-move">
                  <button onClick={() => void moveArticle(article.id, -1)} disabled={index === 0} aria-label="Move article up"><ChevronUp size={14}/></button>
                  <button onClick={() => void moveArticle(article.id, 1)} disabled={index === orderedArticles.length - 1} aria-label="Move article down"><ChevronDown size={14}/></button>
                </div>
                <Link href={`/layouts?issue=${issue.id}&article=${article.id}`} className="article-row-icon" title="Change article preset or layout"><LayoutTemplate size={16}/></Link>
                <Link href={`/issues/${issue.id}/articles/${article.id}`} className="article-open-button">Open article <ArrowRight size={14}/></Link>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="issue-workspace-footer">
        <Link href={`/studio?legacy=1&issue=${issue.id}`}><Settings2 size={14}/> Legacy full-spread Studio</Link>
        <span>Release 0.7 UX consolidation · LexoStudio</span>
      </footer>
    </main>
  );
}
