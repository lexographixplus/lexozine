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
  Plus,
  Settings2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Article, ArticleWorkflowStatus, Issue, IssuePage } from "@/lib/editor-model";
import { createId } from "@/lib/editor-model";
import { articleReadiness, articleWorkflowLabels, getArticleWorkflowStatus, setArticleWorkflowStatus } from "@/lib/editorial-workflow";
import { issueStore } from "@/lib/issue-store";

function createArticle(title = "Untitled Story", issue?: Issue): Article {
  const now = new Date().toISOString();
  const theme = issue?.theme ?? "editorial";
  return {
    id: createId("article"),
    title,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    category: "Feature / Editorial",
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

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const found = await issueStore?.get(issueId) ?? null;
        if (alive) setIssue(found);
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [issueId]);

  const readiness = useMemo(() => issue ? articleReadiness(issue) : null, [issue]);
  const orderedArticles = useMemo(() => {
    if (!issue) return [];
    const pageOrder = new Map(issue.pages.filter((page) => page.articleId).map((page) => [page.articleId!, page.order]));
    return [...issue.articles].sort((a, b) => (pageOrder.get(a.id) ?? 999) - (pageOrder.get(b.id) ?? 999));
  }, [issue]);

  async function persist(next: Issue, note?: string) {
    const saved = await issueStore?.save(next) ?? next;
    setIssue(saved);
    if (note) setMessage(note);
    return saved;
  }

  async function changeStatus(articleId: string, status: ArticleWorkflowStatus) {
    if (!issue) return;
    await persist(setArticleWorkflowStatus(issue, articleId, status), `Article moved to ${articleWorkflowLabels[status]}`);
  }

  async function moveArticle(articleId: string, direction: -1 | 1) {
    if (!issue) return;
    const articles = [...orderedArticles];
    const index = articles.findIndex((article) => article.id === articleId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= articles.length) return;
    [articles[index], articles[target]] = [articles[target], articles[index]];
    const articlePageIds = new Set(articles.map((article) => article.id));
    const nonArticlePages = issue.pages.filter((page) => !page.articleId || !articlePageIds.has(page.articleId));
    const baseOrder = nonArticlePages.length;
    const articlePages: IssuePage[] = articles.map((article, order) => {
      const existing = issue.pages.find((page) => page.articleId === article.id);
      return existing
        ? { ...existing, order: baseOrder + order }
        : { id: createId("page"), label: article.title, kind: "article", articleId: article.id, order: baseOrder + order };
    });
    await persist({ ...issue, articles, pages: [...nonArticlePages, ...articlePages], updatedAt: new Date().toISOString() }, "Article order updated");
  }

  async function addArticle() {
    if (!issue) return;
    const article = createArticle("Untitled Story", issue);
    const page: IssuePage = {
      id: createId("page"),
      label: article.title,
      kind: "article",
      articleId: article.id,
      order: issue.pages.length,
    };
    const next = setArticleWorkflowStatus({ ...issue, articles: [...issue.articles, article], pages: [...issue.pages, page] }, article.id, "draft");
    const saved = await persist(next, "New article added");
    window.location.href = `/issues/${encodeURIComponent(saved.id)}/articles/${encodeURIComponent(article.id)}`;
  }

  if (loading) return <main className="editorial-loading">Loading issue workspace…</main>;
  if (!issue || !readiness) return <main className="editorial-loading">Issue not found.</main>;

  const coverReady = Boolean(issue.coverImageUrl || issue.cover?.assets?.length || issue.cover?.mainHeadline);

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

      <section className="issue-workspace-hero">
        <div>
          <span className="editorial-eyebrow">Issue {issue.number} · {issue.editionDate}</span>
          <h1>{issue.title}</h1>
          <p>{issue.description}</p>
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

      <section className="issue-articles-section">
        <div className="issue-section-heading">
          <div><span className="editorial-eyebrow">Editorial sequence</span><h2>Articles & pages</h2><p>Open an article to edit its content, then switch to Design mode to shape the page composition.</p></div>
          <button onClick={() => void addArticle()} className="editorial-button"><Plus size={15}/> Add article</button>
        </div>

        <div className="article-workflow-list">
          {orderedArticles.map((article, index) => {
            const status = getArticleWorkflowStatus(issue, article.id);
            const missingImage = !article.blocks.some((block) => block.type === "image" && block.imageUrl && !block.layout?.hidden);
            return (
              <article className="article-workflow-row" key={article.id}>
                <div className="article-order">{String(index + 1).padStart(2, "0")}</div>
                <div className="article-workflow-copy">
                  <div className="article-workflow-meta"><span>{article.category}</span><span>{article.layout} · {article.columns} col</span>{missingImage ? <span className="needs-media">Needs image</span> : null}</div>
                  <h3>{article.title}</h3>
                  <small>{article.byline} · {article.readTime}</small>
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
                <Link href={`/layouts?issue=${issue.id}&article=${article.id}`} className="article-row-icon" title="Assign layout"><LayoutTemplate size={16}/></Link>
                <Link href={`/issues/${issue.id}/articles/${article.id}`} className="article-open-button">Open article <ArrowRight size={14}/></Link>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="issue-workspace-footer">
        <Link href={`/studio?issue=${issue.id}`}><Settings2 size={14}/> Legacy full-spread Studio</Link>
        <span>Release 0.6 editorial workflow · LexoStudio</span>
      </footer>
    </main>
  );
}
