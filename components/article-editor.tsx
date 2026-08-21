"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  FileText,
  ImageIcon,
  LayoutTemplate,
  Lock,
  MonitorUp,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import RichTextEditor from "@/components/rich-text-editor";
import type { Article, ArticleWorkflowStatus, BlockType, Issue, StoryBlock } from "@/lib/editor-model";
import { createId, defaultImagePlacement, defaultProductionSettings, themeTokens } from "@/lib/editor-model";
import { articleWorkflowLabels, getArticleWorkflowStatus, setArticleWorkflowStatus } from "@/lib/editorial-workflow";
import { clampLayoutSpan, defaultLayoutSettings, duplicateLayoutBlock, moveLayoutBlock, patchBlockLayout } from "@/lib/layout-composer";
import { issueStore } from "@/lib/issue-store";

type EditorMode = "content" | "design";

const blockLabels: Record<BlockType, string> = {
  headline: "Headline",
  deck: "Deck",
  body: "Body text",
  pullquote: "Pull quote",
  sidebar: "Sidebar",
  image: "Image",
  caption: "Caption",
};

function previewText(block: StoryBlock) {
  if (block.type === "image") return block.placement?.alt || block.caption || "Image block";
  return block.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || `Empty ${blockLabels[block.type].toLowerCase()}`;
}

export default function ArticleEditor({ issueId, articleId }: { issueId: string; articleId: string }) {
  const [issue, setIssue] = useState<Issue | null>(null);
  const [mode, setMode] = useState<EditorMode>("content");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("Loading…");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const found = await issueStore?.get(issueId) ?? null;
        if (!alive) return;
        setIssue(found);
        const article = found?.articles.find((item) => item.id === articleId);
        setSelectedBlockId(article?.blocks.slice().sort((a, b) => a.order - b.order)[0]?.id ?? "");
        setSaveState(found ? "Saved" : "Not found");
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [issueId, articleId]);

  const article = useMemo(() => issue?.articles.find((item) => item.id === articleId), [issue, articleId]);
  const blocks = useMemo(() => article ? [...article.blocks].sort((a, b) => a.order - b.order) : [], [article]);
  const selectedBlock = useMemo(() => blocks.find((block) => block.id === selectedBlockId), [blocks, selectedBlockId]);
  const status = issue && article ? getArticleWorkflowStatus(issue, article.id) : "draft";
  const theme = article ? themeTokens[article.theme] : themeTokens.editorial;

  async function persist(next: Issue) {
    setSaveState("Saving…");
    const saved = await issueStore?.save({ ...next, updatedAt: new Date().toISOString() }) ?? next;
    setIssue(saved);
    setSaveState("Saved");
    return saved;
  }

  async function updateArticle(patch: Partial<Article>) {
    if (!issue || !article) return;
    const nextArticle = { ...article, ...patch, updatedAt: new Date().toISOString() };
    await persist({
      ...issue,
      articles: issue.articles.map((item) => item.id === article.id ? nextArticle : item),
      pages: issue.pages.map((page) => page.articleId === article.id ? { ...page, label: nextArticle.title } : page),
    });
  }

  async function replaceBlocks(nextBlocks: StoryBlock[]) {
    await updateArticle({ blocks: nextBlocks.map((block, order) => ({ ...block, order })) });
  }

  async function patchSelected(patch: Partial<StoryBlock>) {
    if (!article || !selectedBlock) return;
    await replaceBlocks(blocks.map((block) => block.id === selectedBlock.id ? { ...block, ...patch } : block));
  }

  async function setStatus(nextStatus: ArticleWorkflowStatus) {
    if (!issue || !article) return;
    await persist(setArticleWorkflowStatus(issue, article.id, nextStatus));
  }

  async function addBlock(type: BlockType) {
    if (!article) return;
    const block: StoryBlock = {
      id: createId("block"),
      type,
      content: type === "headline" ? "New headline" : type === "deck" ? "Add a supporting deck." : type === "pullquote" ? "Add a memorable pull quote." : type === "sidebar" ? "Add sidebar content." : type === "caption" ? "Image caption" : type === "image" ? "" : "Begin writing here.",
      order: blocks.length,
      layout: defaultLayoutSettings(type, article.columns),
      placement: type === "image" ? { ...defaultImagePlacement } : undefined,
    };
    await replaceBlocks([...blocks, block]);
    setSelectedBlockId(block.id);
  }

  async function removeSelected() {
    if (!selectedBlock) return;
    const remaining = blocks.filter((block) => block.id !== selectedBlock.id);
    await replaceBlocks(remaining);
    setSelectedBlockId(remaining[0]?.id ?? "");
  }

  async function moveSelected(direction: -1 | 1) {
    if (!selectedBlock) return;
    await replaceBlocks(moveLayoutBlock(blocks, selectedBlock.id, direction));
  }

  async function duplicateSelected() {
    if (!selectedBlock) return;
    const next = duplicateLayoutBlock(blocks, selectedBlock.id);
    await replaceBlocks(next);
    const sourceIndex = next.findIndex((block) => block.id === selectedBlock.id);
    setSelectedBlockId(next[sourceIndex + 1]?.id ?? selectedBlock.id);
  }

  async function patchLayout(patch: Partial<NonNullable<StoryBlock["layout"]>>) {
    if (!article || !selectedBlock) return;
    await replaceBlocks(blocks.map((block) => block.id === selectedBlock.id ? patchBlockLayout(block, article.columns, patch) : block));
  }

  async function setColumns(columns: 1 | 2 | 3) {
    if (!article) return;
    const nextBlocks = blocks.map((block) => ({
      ...block,
      layout: {
        ...defaultLayoutSettings(block.type, columns),
        ...(block.layout ?? {}),
        span: clampLayoutSpan(block.layout?.span ?? 1, columns),
      },
    }));
    await updateArticle({ columns, blocks: nextBlocks });
  }

  if (loading) return <main className="editorial-loading">Loading article editor…</main>;
  if (!issue || !article) return <main className="editorial-loading">Article not found.</main>;

  return (
    <main className="article-editor-shell">
      <header className="editorial-topbar">
        <Link href={`/issues/${issue.id}`} className="editorial-back"><ArrowLeft size={16}/> Issue workspace</Link>
        <div className="editorial-brand"><strong>{article.title}</strong><span>{saveState} · {articleWorkflowLabels[status]}</span></div>
        <div className="editorial-actions">
          <Link href={`/layouts?issue=${issue.id}&article=${article.id}`} className="editorial-button secondary"><LayoutTemplate size={15}/> Layouts</Link>
          <Link href={`/preview?issue=${issue.id}`} className="editorial-button"><MonitorUp size={15}/> Preview</Link>
        </div>
      </header>

      <section className="article-editor-main">
        <aside className="article-editor-left">
          <span className="editorial-eyebrow">Story structure</span>
          <h1 className="article-editor-title">{article.title}</h1>
          <div className="mode-tabs"><button className={mode === "content" ? "active" : ""} onClick={() => setMode("content")}><FileText size={12}/> Content</button><button className={mode === "design" ? "active" : ""} onClick={() => setMode("design")}><LayoutTemplate size={12}/> Design</button></div>
          <div className="article-block-list">
            {blocks.map((block) => <button key={block.id} onClick={() => setSelectedBlockId(block.id)} className={`article-block-item ${selectedBlockId === block.id ? "active" : ""} ${block.layout?.hidden ? "hidden" : ""}`}><strong>{blockLabels[block.type]}</strong><small>{previewText(block)}</small></button>)}
          </div>
          <div className="editorial-add-row"><button onClick={() => void addBlock("body")}><Plus size={11}/> Text</button><button onClick={() => void addBlock("image")}><Plus size={11}/> Image</button><button onClick={() => void addBlock("pullquote")}><Plus size={11}/> Quote</button><button onClick={() => void addBlock("sidebar")}><Plus size={11}/> Sidebar</button></div>
        </aside>

        <section className="article-editor-center">
          {mode === "content" ? (
            <div className="content-edit-card">
              <span className="editorial-eyebrow">Content mode</span>
              <h2>Edit the story</h2>
              <div className="editorial-field"><span>Article title</span><input value={article.title} onChange={(event) => void updateArticle({ title: event.target.value, slug: event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") })}/></div>
              <div className="editorial-field"><span>Category</span><input value={article.category} onChange={(event) => void updateArticle({ category: event.target.value })}/></div>
              <div className="editorial-field"><span>Byline</span><input value={article.byline} onChange={(event) => void updateArticle({ byline: event.target.value })}/></div>
              <div className="editorial-field"><span>Read time</span><input value={article.readTime} onChange={(event) => void updateArticle({ readTime: event.target.value })}/></div>
              {selectedBlock ? <div className="content-block-editor"><span className="editorial-panel-label">Selected {blockLabels[selectedBlock.type]}</span>{selectedBlock.type === "image" ? <div className="editorial-field"><span>Image description / alt text</span><input value={selectedBlock.placement?.alt ?? ""} onChange={(event) => void patchSelected({ placement: { ...(selectedBlock.placement ?? defaultImagePlacement), alt: event.target.value } })}/><span>Caption</span><input value={selectedBlock.placement?.caption ?? ""} onChange={(event) => void patchSelected({ placement: { ...(selectedBlock.placement ?? defaultImagePlacement), caption: event.target.value } })}/><Link href={`/media?issue=${issue.id}`} className="editorial-button secondary"><ImageIcon size={14}/> Manage media</Link></div> : <RichTextEditor value={selectedBlock.content} onChange={(content) => void patchSelected({ content })}/>}</div> : null}
            </div>
          ) : (
            <div className="design-canvas" style={{ background: theme.paper, color: theme.ink }}>
              <div className={`design-grid columns-${article.columns}`}>
                {blocks.filter((block) => !block.layout?.hidden).map((block) => {
                  const span = clampLayoutSpan(block.layout?.span ?? defaultLayoutSettings(block.type, article.columns).span, article.columns);
                  const selected = block.id === selectedBlockId;
                  return <div key={block.id} onClick={() => setSelectedBlockId(block.id)} className={`design-block ${block.type} span-${span} ${selected ? "selected" : ""}`}>{block.type === "image" ? block.imageUrl ? <img src={block.imageUrl} alt={block.placement?.alt ?? ""}/> : <div className="design-image-placeholder"><ImageIcon size={24}/><span>Choose image from Media Library</span></div> : <div dangerouslySetInnerHTML={{ __html: block.content }}/>}</div>;
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="article-editor-right">
          <span className="editorial-eyebrow">Inspector</span>
          <div className="editorial-field"><span>Workflow status</span><select value={status} onChange={(event) => void setStatus(event.target.value as ArticleWorkflowStatus)}>{(Object.keys(articleWorkflowLabels) as ArticleWorkflowStatus[]).map((value) => <option key={value} value={value}>{articleWorkflowLabels[value]}</option>)}</select></div>
          <div className="editorial-field"><span>Article layout</span><select value={article.layout} onChange={(event) => void updateArticle({ layout: event.target.value as Article["layout"] })}><option value="feature">Feature</option><option value="essay">Essay</option><option value="interview">Interview</option><option value="visual">Visual</option></select></div>
          <span className="editorial-panel-label">Columns</span><div className="span-buttons">{([1,2,3] as const).map((value) => <button key={value} className={article.columns === value ? "active" : ""} onClick={() => void setColumns(value)}>{value}</button>)}</div>

          {selectedBlock ? <><div style={{ height: 22 }}/><span className="editorial-panel-label">Selected block · {blockLabels[selectedBlock.type]}</span><div className="span-buttons">{([1,2,3] as const).filter((value) => value <= article.columns).map((value) => <button key={value} className={(selectedBlock.layout?.span ?? 1) === value ? "active" : ""} onClick={() => void patchLayout({ span: value })}>Span {value}</button>)}</div><div className="block-control-grid"><button onClick={() => void moveSelected(-1)}><ChevronUp size={12}/> Move up</button><button onClick={() => void moveSelected(1)}><ChevronDown size={12}/> Move down</button><button onClick={() => void patchLayout({ hidden: !selectedBlock.layout?.hidden })}>{selectedBlock.layout?.hidden ? <Eye size={12}/> : <EyeOff size={12}/>} {selectedBlock.layout?.hidden ? "Show" : "Hide"}</button><button onClick={() => void patchLayout({ locked: !selectedBlock.layout?.locked })}>{selectedBlock.layout?.locked ? <Unlock size={12}/> : <Lock size={12}/>} {selectedBlock.layout?.locked ? "Unlock" : "Lock"}</button><button onClick={() => void duplicateSelected()}><Copy size={12}/> Duplicate</button><button className="danger" onClick={() => void removeSelected()}><Trash2 size={12}/> Remove</button></div></> : null}

          <div style={{ height: 22 }}/><Link href={`/layouts?issue=${issue.id}&article=${article.id}`} className="editorial-button secondary"><LayoutTemplate size={14}/> Apply another layout</Link>
          <div style={{ height: 8 }}/><Link href={`/issues/${issue.id}`} className="editorial-button secondary"><CheckCircle2 size={14}/> Return to issue workflow</Link>
          <div className="article-editor-tip"><strong>One article, two views.</strong><span>Content and Design edit the same underlying story. Layouts are starting points, not locked templates.</span></div>
        </aside>
      </section>
    </main>
  );
}
