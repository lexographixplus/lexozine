"use client";

import { ArrowRight, BookOpen, CalendarDays, Copy, ExternalLink, FilePlus2, Globe2, LayoutTemplate, Link2, MessageSquareText, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBlankIssue, createIssueTemplate, templateCatalog } from "@/lib/issue-templates";
import type { IssueTemplateKind } from "@/lib/issue-templates";
import type { Issue, PublicationVisibility } from "@/lib/editor-model";
import { createId } from "@/lib/editor-model";
import { issueStore } from "@/lib/issue-store";
import { ensurePublicationSlug, publicIssueUrl } from "@/lib/publication";

export default function IssueDashboard() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [query, setQuery] = useState("");
  const [showTemplates, setShowTemplates] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState("");
  const [creationError, setCreationError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      const next = await issueStore?.list() ?? [];
      if (alive) {
        setIssues(next);
        setHydrated(true);
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return issues;
    return issues.filter((issue) => `${issue.title} ${issue.number} ${issue.status} ${issue.visibility ?? "private"}`.toLowerCase().includes(normalized));
  }, [issues, query]);

  function openCreator() {
    setShowTemplates(true);
    setCreationError("");
  }

  function closeCreator() {
    setShowTemplates(false);
    setCreationError("");
  }

  function requestedIssueTitle() {
    const title = newIssueTitle.trim();
    if (!title) {
      setCreationError("Give the issue a name before choosing how to start it.");
      return null;
    }
    return title;
  }

  async function saveIssue(nextIssue: Issue) {
    const originalId = nextIssue.id;
    const saved = await issueStore?.save(nextIssue) ?? nextIssue;
    setIssues((current) => [saved, ...current.filter((item) => item.id !== originalId && item.id !== saved.id)]);
    return saved;
  }

  async function createBlank() {
    const title = requestedIssueTitle();
    if (!title) return;
    const issue = createBlankIssue();
    issue.title = title;
    issue.number = String(issues.length + 1).padStart(2, "0");
    const saved = await saveIssue(issue);
    setNewIssueTitle("");
    closeCreator();
    window.location.href = `/issues/${encodeURIComponent(saved.id)}`;
  }

  async function createIssue(kind: IssueTemplateKind) {
    const title = requestedIssueTitle();
    if (!title) return;
    const issue = createIssueTemplate(kind);
    issue.title = title;
    issue.number = String(issues.length + 1).padStart(2, "0");
    issue.visibility = "private";
    const saved = await saveIssue(issue);
    setNewIssueTitle("");
    closeCreator();
    window.location.href = `/issues/${encodeURIComponent(saved.id)}`;
  }

  async function duplicate(issue: Issue) {
    const copy = structuredClone(issue);
    copy.id = createId("issue");
    copy.number = String(issues.length + 1).padStart(2, "0");
    copy.title = `${issue.title} Copy`;
    copy.status = "draft";
    copy.visibility = "private";
    copy.publicSlug = undefined;
    copy.publishedAt = undefined;
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    copy.articles = copy.articles.map((article) => ({
      ...article,
      id: createId("article"),
      blocks: article.blocks.map((block) => ({ ...block, id: createId("block") })),
      createdAt: copy.createdAt,
      updatedAt: copy.createdAt,
    }));
    const articleMap = new Map(issue.articles.map((article, index) => [article.id, copy.articles[index].id]));
    copy.pages = copy.pages.map((page) => ({ ...page, id: createId("page"), articleId: page.articleId ? articleMap.get(page.articleId) : undefined }));
    await saveIssue(copy);
    setMessage(`${copy.title} created as a private draft`);
  }

  async function removeIssue(issue: Issue) {
    const confirmed = window.confirm(`Delete “${issue.title}”? This cannot be undone unless you exported a package.`);
    if (!confirmed) return;
    await issueStore?.remove(issue.id);
    setIssues((current) => current.filter((item) => item.id !== issue.id));
  }

  async function setVisibility(issue: Issue, visibility: PublicationVisibility) {
    const saved = await saveIssue({ ...issue, visibility, updatedAt: new Date().toISOString() });
    setMessage(`${saved.title} visibility set to ${visibility}`);
  }

  async function publishIssue(issue: Issue) {
    const next: Issue = {
      ...issue,
      status: "published",
      visibility: issue.visibility && issue.visibility !== "private" ? issue.visibility : "public",
      publicSlug: ensurePublicationSlug(issue),
      publishedAt: issue.publishedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveIssue(next);
    setMessage(`Published: ${publicIssueUrl(saved)}`);
  }

  async function unpublishIssue(issue: Issue) {
    const saved = await saveIssue({ ...issue, status: "review", visibility: "private", publishedAt: undefined, updatedAt: new Date().toISOString() });
    setMessage(`${saved.title} returned to review and removed from the public reader`);
  }

  async function copyPublicLink(issue: Issue) {
    const url = publicIssueUrl(issue);
    await navigator.clipboard.writeText(url);
    setMessage(`Copied ${url}`);
  }

  return (
    <main className="dashboard-shell">
      <header className="dashboard-topbar"><div className="brand-lockup"><div className="brand-mark">LZ</div><div><div className="brand-title">Lexozine <span>Studio</span></div><div className="brand-subtitle">Editorial publishing workspace</div></div></div>{hydrated && issues[0] ? <Link className="primary-button" href={`/issues/${issues[0].id}`}><BookOpen size={16} /> Open workspace</Link> : hydrated ? <button className="primary-button" onClick={openCreator}><Plus size={16}/> Create first issue</button> : <span className="secondary-button">Loading issues…</span>}</header>
      <section className="dashboard-hero"><div><span className="eyebrow">Editorial operations</span><h1>Issues</h1><p>Manage each edition through writing, design, review and publication from one structured workflow.</p>{message ? <div className="publication-message">{message}</div> : null}</div><button className="dashboard-create" onClick={() => showTemplates ? closeCreator() : openCreator()}><Plus size={17} /> {showTemplates ? "Close" : "New issue"}</button></section>

      {showTemplates ? (
        <section className="template-picker">
          <div className="template-picker-heading"><LayoutTemplate size={17} /><div><strong>Create a new issue</strong><span>Name it first, then choose a blank slate or a starter publication system.</span></div></div>
          <label className="template-name-field">
            <span>Issue name</span>
            <input autoFocus value={newIssueTitle} onChange={(event) => { setNewIssueTitle(event.target.value); setCreationError(""); }} placeholder="e.g. Fragments of the Coast — Issue 01" />
            <small>This becomes the issue title in the dashboard, workspace and publication metadata.</small>
          </label>
          {creationError ? <div className="template-creation-error">{creationError}</div> : null}
          <div className="template-cards">
            <button onClick={() => void createBlank()} className="template-card template-blank"><div className="template-preview template-preview-blank"><span>LEXOZINE</span><strong>+</strong><small>Blank issue</small></div><div><strong>Blank issue</strong><p>Start with an empty issue and build the editorial structure yourself.</p><small>No articles, blocks, pages, cover layout or sample copy</small></div><ArrowRight size={16} /></button>
            {templateCatalog.map((template) => <button key={template.id} onClick={() => void createIssue(template.id)} className={`template-card template-${template.id}`}><div className="template-preview"><span>LEXOZINE</span><strong>Aa</strong><small>{template.name}</small></div><div><strong>{template.name}</strong><p>{template.description}</p><small>Your issue name is kept; the template only supplies starter structure and visual direction.</small></div><ArrowRight size={16} /></button>)}
          </div>
        </section>
      ) : null}

      <section className="dashboard-toolbar"><div className="dashboard-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search issues" /></div><div className="dashboard-summary"><span>{issues.filter((item) => item.status === "draft").length} drafts</span><span>{issues.filter((item) => item.status === "review").length} in review</span><span>{issues.filter((item) => item.status === "published").length} published</span></div></section>
      <section className="issue-grid">
        {filtered.map((issue) => {
          const isPublished = issue.status === "published";
          const shareable = isPublished && issue.visibility !== "private" && Boolean(issue.publicSlug);
          const publicationUrl = issue.publicSlug ? publicIssueUrl(issue) : undefined;
          const publicationLabel = publicationUrl?.replace(/^https?:\/\//, "");
          return <article key={issue.id} className="issue-card"><div className={`issue-cover-mini issue-theme-${issue.theme}`}><span className="mini-issue-number">ISSUE {issue.number}</span><strong>LEXOZINE</strong><div><small>{issue.editionDate}</small><h2>{issue.title}</h2></div></div><div className="issue-card-body"><div className="issue-card-topline"><span className={`status-pill status-${issue.status}`}>{issue.status}</span><Link href={`/review?issue=${issue.id}`} className="icon-button" title="Review issue"><MessageSquareText size={16} /></Link></div><h3>{issue.title}</h3><p>{issue.description}</p><div className="issue-stats"><span><FilePlus2 size={13} /> {issue.articles.length} stories</span><span><CalendarDays size={13} /> {issue.editionDate}</span></div><div className="publication-controls"><label><Globe2 size={14}/><select value={issue.visibility ?? "private"} onChange={(event) => void setVisibility(issue, event.target.value as PublicationVisibility)}><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select></label>{isPublished ? <button className="publication-action secondary" onClick={() => void unpublishIssue(issue)}>Unpublish</button> : <button className="publication-action" onClick={() => void publishIssue(issue)}>Publish</button>}{shareable ? <><button className="icon-button" title="Copy public link" onClick={() => void copyPublicLink(issue)}><Link2 size={15}/></button><a className="icon-button" title="Open public reader" href={publicIssueUrl(issue)} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a></> : null}</div>{publicationLabel ? <div className="publication-slug">{publicationLabel}</div> : null}<div className="issue-card-actions"><Link href={`/issues/${issue.id}`} className="primary-button">Open workspace <ArrowRight size={15} /></Link><Link href={`/review?issue=${issue.id}`} className="icon-button" title="Review"><MessageSquareText size={15} /></Link><button className="icon-button" title="Duplicate issue" onClick={() => void duplicate(issue)}><Copy size={15} /></button><button className="icon-button dashboard-delete" title="Delete issue" onClick={() => void removeIssue(issue)}><Trash2 size={15} /></button></div></div></article>;
        })}
        {!filtered.length && hydrated ? <button className="new-issue-placeholder" onClick={openCreator}><Plus size={24} /><strong>Create your first issue</strong><span>Name it, then start blank or choose a reusable publication template</span></button> : <button className="new-issue-placeholder" onClick={openCreator}><Plus size={24} /><strong>Create another issue</strong><span>Name it, then start blank or choose a reusable publication template</span></button>}
      </section>
    </main>
  );
}
