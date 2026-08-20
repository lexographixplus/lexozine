"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, MessageSquareText, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Issue, IssueStatus } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";

const ISSUES_KEY = "lexozine-issues-v1";
const COMMENTS_KEY = "lexozine-review-comments-v1";

type ReviewComment = {
  id: string;
  issueId: string;
  articleId: string;
  blockId?: string;
  author: string;
  body: string;
  createdAt: string;
  resolved: boolean;
};

function readComments(): ReviewComment[] {
  try { return JSON.parse(localStorage.getItem(COMMENTS_KEY) ?? "[]") as ReviewComment[]; } catch { return []; }
}

export default function ReviewWorkspace() {
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [articleId, setArticleId] = useState("");
  const [blockId, setBlockId] = useState("");
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [draft, setDraft] = useState("");
  const [showResolved, setShowResolved] = useState(false);

  useEffect(() => {
    try {
      const issues = JSON.parse(localStorage.getItem(ISSUES_KEY) ?? "[]") as Issue[];
      const requestedId = new URLSearchParams(location.search).get("issue");
      const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
      if (found) {
        setIssue(found);
        setArticleId(found.articles[0]?.id ?? "");
      }
      setComments(readComments());
    } catch {}
  }, []);

  const article = useMemo(() => issue.articles.find((item) => item.id === articleId), [issue.articles, articleId]);
  const issueComments = useMemo(() => comments.filter((comment) => comment.issueId === issue.id && (showResolved || !comment.resolved)), [comments, issue.id, showResolved]);
  const openCount = comments.filter((comment) => comment.issueId === issue.id && !comment.resolved).length;

  function persistIssue(next: Issue) {
    const issues = (() => { try { return JSON.parse(localStorage.getItem(ISSUES_KEY) ?? "[]") as Issue[]; } catch { return []; } })();
    const index = issues.findIndex((item) => item.id === next.id);
    if (index >= 0) issues[index] = next; else issues.unshift(next);
    localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
    setIssue(next);
  }

  function setStatus(status: IssueStatus) {
    persistIssue({ ...issue, status, updatedAt: new Date().toISOString() });
  }

  function persistComments(next: ReviewComment[]) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(next));
    setComments(next);
  }

  function addComment() {
    if (!articleId || !draft.trim()) return;
    const comment: ReviewComment = {
      id: `comment-${Date.now()}`,
      issueId: issue.id,
      articleId,
      blockId: blockId || undefined,
      author: "Lexozine Editorial",
      body: draft.trim(),
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    persistComments([comment, ...comments]);
    setDraft("");
  }

  function toggleResolved(id: string) {
    persistComments(comments.map((comment) => comment.id === id ? { ...comment, resolved: !comment.resolved } : comment));
  }

  function locationLabel(comment: ReviewComment) {
    const targetArticle = issue.articles.find((item) => item.id === comment.articleId);
    const targetBlock = targetArticle?.blocks.find((block) => block.id === comment.blockId);
    return `${targetArticle?.title ?? "Article"}${targetBlock ? ` · ${targetBlock.type}` : ""}`;
  }

  return (
    <main className="utility-shell">
      <header className="utility-topbar"><Link href={`/?issue=${issue.id}`} className="secondary-button"><ArrowLeft size={15}/> Back to studio</Link><div className="brand-title">Lexozine <span>Review</span></div><div className="save-state"><MessageSquareText size={14}/> {openCount} open comments</div></header>
      <section className="utility-hero"><span className="eyebrow">Editorial review</span><h1>Review & approval</h1><p>Move <strong>{issue.title}</strong> through draft, review and publication while keeping feedback attached to the relevant story or content block.</p></section>
      <section className="utility-grid two-column">
        <div className="utility-panel">
          <h2>Issue workflow</h2>
          <div className="review-status-grid">{(["draft","review","published"] as IssueStatus[]).map((status) => <button key={status} className={issue.status===status?"active":""} onClick={()=>setStatus(status)}>{issue.status===status?<CheckCircle2 size={16}/>:<Circle size={16}/>}<span>{status}</span></button>)}</div>
          <h2 style={{marginTop:24}}>Add review comment</h2>
          <div className="form-field"><label>Article</label><select value={articleId} onChange={(e)=>{setArticleId(e.target.value);setBlockId("")}}>{issue.articles.map((item)=><option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
          <div className="form-field" style={{marginTop:12}}><label>Block (optional)</label><select value={blockId} onChange={(e)=>setBlockId(e.target.value)}><option value="">Whole article</option>{article?.blocks.map((block)=><option key={block.id} value={block.id}>{block.type} · {block.content.replace(/<[^>]+>/g,"").slice(0,48) || "image"}</option>)}</select></div>
          <label className="stacked-field" style={{marginTop:12}}><span>Comment</span><textarea rows={6} value={draft} onChange={(e)=>setDraft(e.target.value)} placeholder="Describe the change, question or approval note…"/></label>
          <button className="primary-button review-add" onClick={addComment}><Plus size={15}/> Add comment</button>
        </div>
        <div className="utility-panel">
          <div className="review-list-head"><h2>Feedback</h2><label><input type="checkbox" checked={showResolved} onChange={(e)=>setShowResolved(e.target.checked)}/> Show resolved</label></div>
          <div className="review-list">{issueComments.length ? issueComments.map((comment)=><article key={comment.id} className={comment.resolved?"resolved":""}><div className="review-comment-head"><div><strong>{locationLabel(comment)}</strong><span>{new Date(comment.createdAt).toLocaleString()}</span></div><button onClick={()=>toggleResolved(comment.id)}>{comment.resolved?<><RotateCcw size={13}/> Reopen</>:<><CheckCircle2 size={13}/> Resolve</>}</button></div><p>{comment.body}</p><small>{comment.author}</small></article>) : <div className="history-empty"><MessageSquareText size={22}/><strong>No review comments</strong><p>Add feedback against an article or a specific block.</p></div>}</div>
        </div>
      </section>
    </main>
  );
}
