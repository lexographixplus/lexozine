"use client";

import { ArrowRight, BookOpen, CalendarDays, Copy, FilePlus2, LayoutTemplate, MessageSquareText, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createIssueTemplate, templateCatalog } from "@/lib/issue-templates";
import type { Issue } from "@/lib/editor-model";

const STORAGE_KEY = "lexozine-issues-v1";

function seedIssues(): Issue[] {
  const first = createIssueTemplate("editorial");
  const second = createIssueTemplate("culture");
  second.number = "02";
  second.status = "review";
  second.title = "Living Archives";
  return [first, second];
}

export default function IssueDashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    let next: Issue[];
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      next = stored ? JSON.parse(stored) : seedIssues();
    } catch {
      next = seedIssues();
    }
    if (!window.localStorage.getItem(STORAGE_KEY)) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setIssues(next);
    setHydrated(true);
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return issues;
    return issues.filter((issue) => `${issue.title} ${issue.number} ${issue.status}`.toLowerCase().includes(normalized));
  }, [issues, query]);

  function persist(next: Issue[]) {
    setIssues(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function createIssue(kind: "editorial" | "culture" | "minimal") {
    const issue = createIssueTemplate(kind);
    issue.number = String(issues.length + 1).padStart(2, "0");
    persist([issue, ...issues]);
    setShowTemplates(false);
    window.location.href = `/?issue=${issue.id}`;
  }

  function duplicate(issue: Issue) {
    const copy = structuredClone(issue);
    const stamp = Date.now();
    copy.id = `${issue.id}-copy-${stamp}`;
    copy.number = String(issues.length + 1).padStart(2, "0");
    copy.title = `${issue.title} Copy`;
    copy.status = "draft";
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    copy.articles = copy.articles.map((article, index) => ({ ...article, id: `${article.id}-copy-${stamp}-${index}` }));
    const articleMap = new Map(issue.articles.map((article, index) => [article.id, copy.articles[index].id]));
    copy.pages = copy.pages.map((page, index) => ({ ...page, id: `${page.id}-copy-${stamp}-${index}`, articleId: page.articleId ? articleMap.get(page.articleId) : undefined }));
    persist([copy, ...issues]);
  }

  function removeIssue(issue: Issue) {
    const confirmed = window.confirm(`Delete “${issue.title}” and its local issue data? This cannot be undone unless you exported a package.`);
    if (!confirmed) return;
    persist(issues.filter((item) => item.id !== issue.id));
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar"><div className="brand-lockup"><div className="brand-mark">LZ</div><div><div className="brand-title">Lexozine <span>Studio</span></div><div className="brand-subtitle">Publication workspace</div></div></div>{hydrated && issues[0] ? <Link className="primary-button" href={`/?issue=${issues[0].id}`}><BookOpen size={16} /> Open editor</Link> : <span className="secondary-button">Loading issues…</span>}</header>
      <section className="dashboard-hero"><div><span className="eyebrow">Editorial operations</span><h1>Issues</h1><p>Build, review and publish complete magazine editions from one structured workspace.</p></div><button className="dashboard-create" onClick={() => setShowTemplates((value) => !value)}><Plus size={17} /> New issue</button></section>
      {showTemplates ? <section className="template-picker"><div className="template-picker-heading"><LayoutTemplate size={17} /><strong>Start from a publication system</strong></div><div className="template-cards">{templateCatalog.map((template) => <button key={template.id} onClick={() => createIssue(template.id)} className={`template-card template-${template.id}`}><div className="template-preview"><span>LEXOZINE</span><strong>Aa</strong><small>{template.name}</small></div><div><strong>{template.name}</strong><p>{template.description}</p></div><ArrowRight size={16} /></button>)}</div></section> : null}
      <section className="dashboard-toolbar"><div className="dashboard-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search issues" /></div><div className="dashboard-summary"><span>{issues.filter((item) => item.status === "draft").length} drafts</span><span>{issues.filter((item) => item.status === "review").length} in review</span><span>{issues.filter((item) => item.status === "published").length} published</span></div></section>
      <section className="issue-grid">
        {filtered.map((issue) => <article key={issue.id} className="issue-card"><div className={`issue-cover-mini issue-theme-${issue.theme}`}><span className="mini-issue-number">ISSUE {issue.number}</span><strong>LEXOZINE</strong><div><small>{issue.editionDate}</small><h2>{issue.title}</h2></div></div><div className="issue-card-body"><div className="issue-card-topline"><span className={`status-pill status-${issue.status}`}>{issue.status}</span><Link href={`/review?issue=${issue.id}`} className="icon-button" title="Review issue"><MessageSquareText size={16} /></Link></div><h3>{issue.title}</h3><p>{issue.description}</p><div className="issue-stats"><span><FilePlus2 size={13} /> {issue.articles.length} stories</span><span><CalendarDays size={13} /> {issue.editionDate}</span></div><div className="issue-card-actions"><Link href={`/?issue=${issue.id}`} className="primary-button">Open issue <ArrowRight size={15} /></Link><Link href={`/review?issue=${issue.id}`} className="icon-button" title="Review"><MessageSquareText size={15} /></Link><button className="icon-button" title="Duplicate issue" onClick={() => duplicate(issue)}><Copy size={15} /></button><button className="icon-button dashboard-delete" title="Delete issue" onClick={() => removeIssue(issue)}><Trash2 size={15} /></button></div></div></article>)}
        <button className="new-issue-placeholder" onClick={() => setShowTemplates(true)}><Plus size={24} /><strong>Create another issue</strong><span>Choose a reusable editorial template</span></button>
      </section>
    </main>
  );
}
