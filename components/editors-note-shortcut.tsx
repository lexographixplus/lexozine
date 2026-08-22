"use client";

import { ArrowRight, FilePenLine, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Article, Issue, IssuePage } from "@/lib/editor-model";
import { createId } from "@/lib/editor-model";
import { setArticleWorkflowStatus } from "@/lib/editorial-workflow";
import { applyLayoutPreset } from "@/lib/layout-composer";
import { issueStore } from "@/lib/issue-store";

function articleSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function createEditorsNote(issue: Issue): Article {
  const now = new Date().toISOString();
  const title = "Editor's Note";
  const article: Article = {
    id: createId("article"),
    title,
    slug: articleSlug(title),
    category: "Editorial",
    byline: "Lexozine Editorial",
    readTime: "3 min read",
    layout: "essay",
    columns: 1,
    theme: issue.theme,
    blocks: [
      {
        id: createId("block"),
        type: "headline",
        content: title,
        order: 0,
        layout: { hidden: false, span: 1, locked: false },
      },
      {
        id: createId("block"),
        type: "deck",
        content: "A note to readers from the editor.",
        order: 1,
        layout: { hidden: false, span: 1, locked: false },
      },
      {
        id: createId("block"),
        type: "body",
        content: "Write the editor's note here.",
        order: 2,
        layout: { hidden: false, span: 1, locked: false },
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
  return applyLayoutPreset(article, "editors-note");
}

function findEditorsNote(issue: Issue | null) {
  if (!issue) return null;
  const exact = issue.articles.find((article) => articleSlug(article.title) === "editor-s-note" || articleSlug(article.title) === "editors-note");
  return exact ?? issue.articles.find((article) => article.category === "Editorial") ?? null;
}

export default function EditorsNoteShortcut({ issueId }: { issueId: string }) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const editorsNote = useMemo(() => findEditorsNote(issue), [issue]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const found = await issueStore?.get(issueId) ?? null;
        if (alive) setIssue(found);
      } catch {
        if (alive) setStatus("Unable to load the Editor's Note status.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [issueId]);

  async function openOrCreate() {
    if (!issue || creating) return;
    if (editorsNote) {
      window.location.href = `/issues/${encodeURIComponent(issue.id)}/articles/${encodeURIComponent(editorsNote.id)}`;
      return;
    }

    setCreating(true);
    setStatus("Creating Editor's Note…");
    try {
      const article = createEditorsNote(issue);
      const page: IssuePage = {
        id: createId("page"),
        label: article.title,
        kind: "article",
        articleId: article.id,
        order: issue.pages.length,
      };
      const next = setArticleWorkflowStatus(
        { ...issue, articles: [...issue.articles, article], pages: [...issue.pages, page], updatedAt: new Date().toISOString() },
        article.id,
        "draft",
      );
      const saved = await issueStore?.save(next) ?? next;
      setIssue(saved);
      window.location.href = `/issues/${encodeURIComponent(saved.id)}/articles/${encodeURIComponent(article.id)}`;
    } catch {
      setStatus("Could not create the Editor's Note. Try again.");
      setCreating(false);
    }
  }

  return (
    <aside className="editors-note-shortcut" id="editors-note" aria-label="Editor's Note">
      <div className="editors-note-shortcut-icon"><FilePenLine size={17}/></div>
      <div className="editors-note-shortcut-copy">
        <span>Issue opening</span>
        <strong>Editor&apos;s Note</strong>
        <small>{loading ? "Checking this issue…" : editorsNote ? "Opening editorial is ready to edit." : "Create the reflective opening page for this issue."}</small>
        {status ? <em>{status}</em> : null}
      </div>
      <button onClick={() => void openOrCreate()} disabled={loading || creating || !issue}>
        {creating ? <><Loader2 size={13} className="spin"/> Creating…</> : editorsNote ? <>Edit note <ArrowRight size={13}/></> : <>Create note <ArrowRight size={13}/></>}
      </button>
    </aside>
  );
}
