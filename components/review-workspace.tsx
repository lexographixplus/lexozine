"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, MessageSquareText, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Issue, IssueStatus } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";
import { issueStore } from "@/lib/issue-store";

type ReviewComment = {
  id: string;
  issueId: string;
  articleId?: string;
  blockId?: string;
  author: string;
  body: string;
  createdAt: string;
  resolved: boolean;
};

export default function ReviewWorkspace() {
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [articleId, setArticleId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [draft, setDraft] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const [activity, setActivity] = useState("Loading shared review…");

  useEffect(() => {
    let alive = true;
    async function load() {
      const requestedId = new URLSearchParams(location.search).get("issue");
      const issues = await issueStore?.list() ?? [];
      const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
      if (!found || !alive) return;
      setIssue(found);
      setArticleId(found.articles[0]?.id ?? "");
      try {
        const response = await fetch(`/api/review?issue=${encodeURIComponent(found.id)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Review sync failed (${response.status})`);
        const data = await response.json() as { comments: ReviewComment[] };
        if (alive) {
          setComments(data.comments);
          setActivity("Review synced with Neon");
        }
      } catch (error) {
        if (alive) setActivity(error instanceof Error ? error.message : "Review sync unavailable");
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  const article = useMemo(() => issue.articles.find((item) => item.id === articleId), [issue.articles, articleId]);
  const issueComments = useMemo(() => comments.filter((comment) => showResolved || !comment.resolved), [comments, showResolved]);
  const openCount = comments.filter((comment) => !comment.resolved).length;

  async function setStatus(status: IssueStatus) {
    const next = { ...issue, status, updatedAt: new Date().toISOString() };
    const saved = await issueStore?.save(next) ?? next;
    setIssue(saved);
    setActivity(`Issue moved to ${status}`);
  }

  async function addComment() {
    if (!draft.trim()) return;
    setActivity("Saving comment…");
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ issueId: issue.id, articleId: articleId || undefined, blockId: blockId || undefined, body: draft.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? `Comment save failed (${response.status})`);
      setComments((current) => [data.comment as ReviewComment, ...current]);
      setDraft("");
      setActivity("Comment shared with the team");
    } catch (error) {
      setActivity(error instanceof Error ? error.message : "Unable to save comment");
    }
  }

  async function toggleResolved(comment: ReviewComment) {
    const desired = !comment.resolved;
    setComments((current) => current.map((item) => item.id === comment.id ? { ...item, resolved: desired } : item));
    try {
      const response = await fetch("/api/review", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: comment.id, resolved: desired }),
      });
      if (!response.ok) throw new Error(`Review update failed (${response.status})`);
      const data = await response.json() as { comment: ReviewComment };
      setComments((current) => current.map((item) => item.id === comment.id ? data.comment : item));
      setActivity(desired ? "Comment resolved" : "Comment reopened");
    } catch (error) {
      setComments((current) => current.map((item) => item.id === comment.id ? comment : item));
      setActivity(error instanceof Error ? error.message : "Unable to update comment");
    }
  }

  function locationLabel(comment: ReviewComment) {
    const targetArticle = issue.articles.find((item) => item.id === comment.articleId);
    const targetBlock = targetArticle?.blocks.find((block) => block.id === comment.blockId);
    if (!targetArticle) return "Whole issue";
    return `${targetArticle.title}${targetBlock ? ` · ${targetBlock.type}` : ""}`;
  }

  return (
    <main className="utility-shell">
      <header className="utility-topbar"><Link href={`/?issue=${issue.id}`} className="secondary-button"><ArrowLeft size={15}/> Back to studio</Link><div className="brand-title">Lexozine <span>Review</span></div><div className="save-state"><MessageSquareText size={14}/> {openCount} open · {activity}</div></header>
      <section className="utility-hero"><span className="eyebrow">Shared editorial review</span><h1>Review & approval</h1><p>Move <strong>{issue.title}</strong> through draft, review and publication while keeping team feedback attached to the relevant story or content block.</p></section>
      <section className="utility-grid two-column">
        <div className="utility-panel">
          <h2>Issue workflow</h2>
          <div className="review-status-grid">{(["draft","review","published"] as IssueStatus[]).map((status) => <button key={status} className={issue.status===status?"active":""} onClick={()=>void setStatus(status)}>{issue.status===status?<CheckCircle2 size={16}/>:<Circle size={16}/>}<span>{status}</span></button>)}</div>
          <h2 style={{marginTop:24}}>Add review comment</h2>
          <div className="form-field"><label>Article</label><select value={articleId} onChange={(e)=>{setArticleId(e.target.value);setBlockId("")}}><option value="">Whole issue</option>{issue.articles.map((item)=><option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
          {articleId ? <div className="form-field" style={{marginTop:12}}><label>Block (optional)</label><select value={blockId} onChange={(e)=>setBlockId(e.target.value)}><option value="">Whole article</option>{article?.blocks.map((block)=><option key={block.id} value={block.id}>{block.type} · {block.content.replace(/<[^>]+>/g,"").slice(0,48) || "image"}</option>)}</select></div> : null}
          <label className="stacked-field" style={{marginTop:12}}><span>Comment</span><textarea rows={6} value={draft} onChange={(e)=>setDraft(e.target.value)} placeholder="Describe the change, question or approval note…"/></label>
          <button className="primary-button review-add" onClick={()=>void addComment()}><Plus size={15}/> Add comment</button>
        </div>
        <div className="utility-panel">
          <div className="review-list-head"><h2>Feedback</h2><label><input type="checkbox" checked={showResolved} onChange={(e)=>setShowResolved(e.target.checked)}/> Show resolved</label></div>
          <div className="review-list">{issueComments.length ? issueComments.map((comment)=><article key={comment.id} className={comment.resolved?"resolved":""}><div className="review-comment-head"><div><strong>{locationLabel(comment)}</strong><span>{new Date(comment.createdAt).toLocaleString()}</span></div><button onClick={()=>void toggleResolved(comment)}>{comment.resolved?<><RotateCcw size={13}/> Reopen</>:<><CheckCircle2 size={13}/> Resolve</>}</button></div><p>{comment.body}</p><small>{comment.author}</small></article>) : <div className="history-empty"><MessageSquareText size={22}/><strong>No review comments</strong><p>Add feedback against the issue, an article or a specific block.</p></div>}</div>
        </div>
      </section>
    </main>
  );
}
