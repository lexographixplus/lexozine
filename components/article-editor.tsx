"use client";

import {
  ArrowLeft,
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
  Save,
  Trash2,
  Unlock,
  Upload,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import ArticleMediaPicker from "@/components/article-media-picker";
import IssueNavigation from "@/components/issue-navigation";
import RichTextEditor from "@/components/rich-text-editor";
import type { Article, ArticleWorkflowStatus, BlockType, Issue, StoryBlock } from "@/lib/editor-model";
import { createId, defaultImagePlacement, themeTokens } from "@/lib/editor-model";
import { articleWorkflowLabels, getArticleWorkflowStatus, setArticleWorkflowStatus } from "@/lib/editorial-workflow";
import { applyLayoutPreset, clampLayoutSpan, defaultLayoutSettings, duplicateLayoutBlock, layoutPresets, moveLayoutBlock, patchBlockLayout } from "@/lib/layout-composer";
import { issueStore } from "@/lib/issue-store";
import { blocksFromPlainText, blocksFromStructuredHtml, mammothStyleMap } from "@/lib/manuscript-import";

type EditorMode = "content" | "design";
type TextBlockType = Exclude<BlockType, "image">;
type TextBlockRole = TextBlockType | "subheading";
type SyncMode = "synced" | "local" | "failed";

const textBlockRoles: TextBlockRole[] = ["headline", "deck", "subheading", "body", "pullquote", "sidebar", "caption"];

const blockLabels: Record<BlockType, string> = {
  headline: "Headline",
  deck: "Deck",
  body: "Body text",
  pullquote: "Pull quote",
  sidebar: "Sidebar",
  image: "Image",
  caption: "Caption",
};

const roleLabels: Record<TextBlockRole, string> = {
  headline: "Headline",
  deck: "Deck",
  subheading: "Subheading",
  body: "Body text",
  pullquote: "Pull quote",
  sidebar: "Sidebar",
  caption: "Caption",
};

function plainText(content: string) {
  return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function roleForBlock(block: StoryBlock): TextBlockRole | "image" {
  if (block.type === "image") return "image";
  if (block.type === "body" && block.layout?.textStyle === "subheading") return "subheading";
  return block.type;
}

function labelForBlock(block: StoryBlock) {
  const role = roleForBlock(block);
  return role === "image" ? blockLabels.image : roleLabels[role];
}

function previewText(block: StoryBlock) {
  if (block.type === "image") return block.placement?.alt || block.caption || "Image block";
  return plainText(block.content) || `Empty ${labelForBlock(block).toLowerCase()}`;
}

function presetForArticle(article: Article) {
  return layoutPresets.find((preset) => preset.category === article.category && preset.columns === article.columns)
    ?? layoutPresets.find((preset) => preset.category === article.category)
    ?? layoutPresets.find((preset) => preset.articleLayout === article.layout)
    ?? layoutPresets[0];
}

function syncPrimaryHeadline(article: Article, title: string): Article {
  let synced = false;
  const nextBlocks = article.blocks.map((block) => {
    if (!synced && block.type === "headline") {
      synced = true;
      return { ...block, content: title };
    }
    return block;
  });
  if (!synced) {
    nextBlocks.unshift({
      id: createId("block"),
      type: "headline",
      content: title,
      order: 0,
      layout: defaultLayoutSettings("headline", article.columns),
    });
  }
  return {
    ...article,
    title,
    slug: slugify(title),
    blocks: nextBlocks.map((block, order) => ({ ...block, order })),
    updatedAt: new Date().toISOString(),
  };
}

export default function ArticleEditor({ issueId, articleId }: { issueId: string; articleId: string }) {
  const manuscriptInputRef = useRef<HTMLInputElement>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  const [mode, setMode] = useState<EditorMode>("content");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [newBlockRole, setNewBlockRole] = useState<TextBlockRole>("body");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState("Loading…");
  const [syncMode, setSyncMode] = useState<SyncMode>("synced");
  const [dirty, setDirty] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState(layoutPresets[0].id);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState("");
  const [dragOverBlockId, setDragOverBlockId] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const found = await issueStore?.get(issueId) ?? null;
        if (!alive) return;
        setIssue(found);
        const article = found?.articles.find((item) => item.id === articleId);
        setSelectedBlockId(article?.blocks.slice().sort((a, b) => a.order - b.order)[0]?.id ?? "");
        if (article) setSelectedPresetId(presetForArticle(article).id);
        const sync = issueStore?.getSyncState();
        if (sync?.state === "local") {
          setSyncMode("local");
          setSaveState("Working from local cache");
        } else {
          setSyncMode("synced");
          setSaveState(found ? "Saved & synced" : "Not found");
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; };
  }, [issueId, articleId]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveCurrent();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  });

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const article = useMemo(() => issue?.articles.find((item) => item.id === articleId), [issue, articleId]);
  const blocks = useMemo(() => article ? [...article.blocks].sort((a, b) => a.order - b.order) : [], [article]);
  const selectedBlock = useMemo(() => blocks.find((block) => block.id === selectedBlockId), [blocks, selectedBlockId]);
  const status = issue && article ? getArticleWorkflowStatus(issue, article.id) : "draft";
  const theme = article ? themeTokens[article.theme] : themeTokens.editorial;
  const activePreset = article ? presetForArticle(article) : layoutPresets[0];

  function stage(next: Issue, note = "Unsaved changes") {
    setIssue({ ...next, updatedAt: new Date().toISOString() });
    setDirty(true);
    setSaveState(note);
  }

  async function saveCurrent() {
    if (!issue) return null;
    setSaveState("Saving…");
    try {
      const saved = await issueStore?.save({ ...issue, updatedAt: new Date().toISOString() }) ?? issue;
      const sync = issueStore?.getSyncState();
      setIssue(saved);
      setDirty(false);
      if (sync?.state === "local") {
        setSyncMode("local");
        setSaveState("Saved locally — sync pending");
      } else {
        setSyncMode("synced");
        setSaveState(`Saved & synced · ${new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`);
      }
      return saved;
    } catch {
      setSyncMode("failed");
      setSaveState("Save failed — try again");
      return null;
    }
  }

  function updateArticle(patch: Partial<Article>) {
    if (!issue || !article) return;
    let nextArticle = { ...article, ...patch, updatedAt: new Date().toISOString() };
    if (typeof patch.title === "string") nextArticle = syncPrimaryHeadline(nextArticle, patch.title);
    stage({
      ...issue,
      articles: issue.articles.map((item) => item.id === article.id ? nextArticle : item),
      pages: issue.pages.map((page) => page.articleId === article.id ? { ...page, label: nextArticle.title } : page),
    });
  }

  function replaceBlocks(nextBlocks: StoryBlock[]) {
    updateArticle({ blocks: nextBlocks.map((block, order) => ({ ...block, order })) });
  }

  function patchSelected(patch: Partial<StoryBlock>) {
    if (!article || !selectedBlock) return;
    const nextBlocks = blocks.map((block) => block.id === selectedBlock.id ? { ...block, ...patch } : block);
    if (selectedBlock.type === "headline" && typeof patch.content === "string") {
      const title = plainText(patch.content) || article.title;
      updateArticle({ title, slug: slugify(title), blocks: nextBlocks });
      return;
    }
    replaceBlocks(nextBlocks);
  }

  function changeSelectedRole(nextRole: TextBlockRole) {
    if (!article || !selectedBlock || selectedBlock.type === "image") return;
    if (roleForBlock(selectedBlock) === nextRole) return;

    const nextType: TextBlockType = nextRole === "subheading" ? "body" : nextRole;
    const defaults = defaultLayoutSettings(nextType, article.columns);
    const nextLayout = {
      ...defaults,
      hidden: selectedBlock.layout?.hidden ?? defaults.hidden,
      locked: selectedBlock.layout?.locked ?? defaults.locked,
      span: nextRole === "subheading"
        ? article.columns
        : clampLayoutSpan(selectedBlock.layout?.span ?? defaults.span, article.columns),
      textStyle: nextRole === "subheading" ? "subheading" as const : undefined,
    };
    const nextBlocks = blocks.map((block) => block.id === selectedBlock.id ? { ...block, type: nextType, layout: nextLayout } : block);
    const alreadyHasHeadline = blocks.some((block) => block.type === "headline" && block.id !== selectedBlock.id);
    if (nextRole === "headline" && !alreadyHasHeadline) {
      const title = plainText(selectedBlock.content) || article.title;
      updateArticle({ title, slug: slugify(title), blocks: nextBlocks });
      return;
    }
    replaceBlocks(nextBlocks);
  }

  function setStatus(nextStatus: ArticleWorkflowStatus) {
    if (!issue || !article) return;
    stage(setArticleWorkflowStatus(issue, article.id, nextStatus));
  }

  function addTextBlock(role: TextBlockRole) {
    if (!article) return;
    const type: TextBlockType = role === "subheading" ? "body" : role;
    const defaults = defaultLayoutSettings(type, article.columns);
    const block: StoryBlock = {
      id: createId("block"),
      type,
      content: role === "headline" ? "New headline" : role === "deck" ? "Add a supporting deck." : role === "subheading" ? "Add a section heading." : role === "pullquote" ? "Add a memorable pull quote." : role === "sidebar" ? "Add sidebar content." : role === "caption" ? "Image caption" : "Begin writing here.",
      order: blocks.length,
      layout: role === "subheading" ? { ...defaults, textStyle: "subheading", span: article.columns } : defaults,
    };
    replaceBlocks([...blocks, block]);
    setSelectedBlockId(block.id);
    setMode("content");
  }

  function addImageBlock() {
    if (!article) return;
    const block: StoryBlock = {
      id: createId("block"),
      type: "image",
      content: "",
      order: blocks.length,
      layout: defaultLayoutSettings("image", article.columns),
      placement: { ...defaultImagePlacement },
    };
    replaceBlocks([...blocks, block]);
    setSelectedBlockId(block.id);
    setMode("content");
    setShowMediaPicker(true);
  }

  function removeSelected() {
    if (!selectedBlock) return;
    const remaining = blocks.filter((block) => block.id !== selectedBlock.id);
    replaceBlocks(remaining);
    setSelectedBlockId(remaining[0]?.id ?? "");
    setShowMediaPicker(false);
  }

  function moveSelected(direction: -1 | 1) {
    if (!selectedBlock) return;
    replaceBlocks(moveLayoutBlock(blocks, selectedBlock.id, direction));
  }

  function reorderBlocks(sourceId: string, targetId: string) {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const ordered = [...blocks];
    const from = ordered.findIndex((block) => block.id === sourceId);
    const to = ordered.findIndex((block) => block.id === targetId);
    if (from < 0 || to < 0 || ordered[from].layout?.locked) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    replaceBlocks(ordered);
  }

  function handleBlockDragStart(event: DragEvent<HTMLButtonElement>, block: StoryBlock) {
    if (block.layout?.locked) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    setDraggedBlockId(block.id);
  }

  function duplicateSelected() {
    if (!selectedBlock) return;
    const next = duplicateLayoutBlock(blocks, selectedBlock.id);
    replaceBlocks(next);
    const sourceIndex = next.findIndex((block) => block.id === selectedBlock.id);
    setSelectedBlockId(next[sourceIndex + 1]?.id ?? selectedBlock.id);
  }

  function patchLayout(patch: Partial<NonNullable<StoryBlock["layout"]>>) {
    if (!article || !selectedBlock) return;
    replaceBlocks(blocks.map((block) => block.id === selectedBlock.id ? patchBlockLayout(block, article.columns, patch) : block));
  }

  function setColumns(columns: 1 | 2 | 3) {
    if (!article) return;
    const nextBlocks = blocks.map((block) => ({
      ...block,
      layout: {
        ...defaultLayoutSettings(block.type, columns),
        ...(block.layout ?? {}),
        span: block.layout?.textStyle === "subheading"
          ? columns
          : clampLayoutSpan(block.layout?.span ?? 1, columns),
      },
    }));
    updateArticle({ columns, blocks: nextBlocks });
  }

  function applyPresetChoice() {
    if (!issue || !article) return;
    const nextArticle = applyLayoutPreset(article, selectedPresetId);
    stage({
      ...issue,
      articles: issue.articles.map((item) => item.id === article.id ? nextArticle : item),
      pages: issue.pages.map((page) => page.articleId === article.id ? { ...page, label: nextArticle.title } : page),
    }, `${layoutPresets.find((preset) => preset.id === selectedPresetId)?.name ?? "Preset"} applied — review and save`);
    setSelectedBlockId(nextArticle.blocks.slice().sort((a, b) => a.order - b.order)[0]?.id ?? "");
  }

  async function saveAndGo(url: string) {
    const saved = dirty ? await saveCurrent() : issue;
    if (!saved) return;
    window.location.href = url;
  }

  async function handleManuscriptImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !article) return;
    setSaveState(`Importing ${file.name}…`);
    try {
      const lowerName = file.name.toLowerCase();
      let imported: StoryBlock[] = [];
      if (lowerName.endsWith(".docx")) {
        const mammoth = await import("mammoth");
        const result = await mammoth.convertToHtml(
          { arrayBuffer: await file.arrayBuffer() },
          { styleMap: mammothStyleMap },
        );
        imported = blocksFromStructuredHtml(result.value, article.columns);
      } else if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
        imported = blocksFromStructuredHtml(await file.text(), article.columns);
      } else {
        imported = blocksFromPlainText(await file.text(), article.columns);
      }
      if (!imported.length) throw new Error("No readable text found");
      const existingMedia = blocks.filter((block) => block.type === "image");
      const nextBlocks = [...imported, ...existingMedia].map((block, order) => ({ ...block, order }));
      const importedHeadline = imported.find((block) => block.type === "headline");
      const importedTitle = importedHeadline ? plainText(importedHeadline.content) : "";
      if (importedTitle) updateArticle({ title: importedTitle, slug: slugify(importedTitle), blocks: nextBlocks });
      else updateArticle({ blocks: nextBlocks });
      setSelectedBlockId(imported[0].id);
      const mappedTypes = Array.from(new Set(imported.map((block) => labelForBlock(block)))).join(", ");
      setSaveState(`${imported.length} structured blocks imported (${mappedTypes}) — review, then save`);
    } catch {
      setSaveState("Import failed — article left unchanged");
    } finally {
      event.target.value = "";
    }
  }

  if (loading) return <main className="editorial-loading">Loading article editor…</main>;
  if (!issue || !article) return <main className="editorial-loading">Article not found.</main>;

  return (
    <main className="article-editor-shell">
      <input ref={manuscriptInputRef} type="file" accept=".docx,.txt,.html,.htm" hidden onChange={handleManuscriptImport}/>
      <header className="editorial-topbar article-editor-topbar">
        <button onClick={() => void saveAndGo(`/issues/${issue.id}`)} className="editorial-back"><ArrowLeft size={16}/> Issue workspace</button>
        <div className="editorial-brand"><strong>{article.title}</strong><span className={`sync-state ${syncMode}`}><i className="sync-dot"/>{saveState} · {articleWorkflowLabels[status]}</span></div>
        <div className="editorial-actions">
          <button onClick={() => manuscriptInputRef.current?.click()} className="editorial-button secondary import-action"><Upload size={15}/> Import manuscript</button>
          <button onClick={() => void saveAndGo(`/layouts?issue=${issue.id}&article=${article.id}`)} className="editorial-button secondary optional-action"><LayoutTemplate size={15}/> Preset library</button>
          <button onClick={() => void saveCurrent()} className={`editorial-button save-action ${dirty ? "dirty" : ""}`} disabled={!dirty}><Save size={15}/> {dirty ? "Save" : syncMode === "local" ? "Saved locally" : "Saved"}</button>
          <button onClick={() => void saveAndGo(`/preview?issue=${issue.id}&v=${Date.now()}`)} className="editorial-button preview-action"><MonitorUp size={15}/> Preview</button>
        </div>
      </header>

      <IssueNavigation issueId={issue.id} active="articles" onNavigate={saveAndGo}/>

      <section className="article-editor-main">
        <aside className="article-editor-left">
          <span className="editorial-eyebrow">Story structure</span>
          <h1 className="article-editor-title">{article.title}</h1>
          <div className="mode-tabs"><button className={mode === "content" ? "active" : ""} onClick={() => setMode("content")}><FileText size={12}/> Content</button><button className={mode === "design" ? "active" : ""} onClick={() => setMode("design")}><LayoutTemplate size={12}/> Design</button></div>
          <div className="article-block-list">
            {blocks.map((block) => <button
              key={block.id}
              draggable={!block.layout?.locked}
              onDragStart={(event) => handleBlockDragStart(event, block)}
              onDragOver={(event) => { event.preventDefault(); setDragOverBlockId(block.id); }}
              onDrop={(event) => { event.preventDefault(); reorderBlocks(draggedBlockId, block.id); setDraggedBlockId(""); setDragOverBlockId(""); }}
              onDragEnd={() => { setDraggedBlockId(""); setDragOverBlockId(""); }}
              onClick={() => { setSelectedBlockId(block.id); setMode("content"); }}
              className={`article-block-item ${selectedBlockId === block.id ? "active" : ""} ${block.layout?.hidden ? "hidden" : ""} ${draggedBlockId === block.id ? "dragging" : ""} ${dragOverBlockId === block.id ? "drag-target" : ""}`}
            ><div className="article-block-meta"><strong>{labelForBlock(block)}</strong><span>{block.layout?.locked ? "Locked" : "Drag · Edit"}</span></div><small>{previewText(block)}</small></button>)}
          </div>
          <div className="block-add-composer">
            <select value={newBlockRole} onChange={(event) => setNewBlockRole(event.target.value as TextBlockRole)} aria-label="Text block type">
              {textBlockRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}
            </select>
            <button onClick={() => addTextBlock(newBlockRole)}><Plus size={11}/> Add text block</button>
            <button onClick={addImageBlock}><Plus size={11}/> Image</button>
          </div>
        </aside>

        <section className="article-editor-center">
          {mode === "content" ? (
            <div className="content-edit-card">
              <div className="content-card-heading"><div><span className="editorial-eyebrow">Content mode</span><h2>Edit the story</h2></div><span className={`content-save-state ${dirty ? "dirty" : ""}`}>{saveState}</span></div>
              <div className="manuscript-import-card">
                <div><Upload size={18}/><div><strong>Import manuscript</strong><span>Bring a DOCX, TXT or HTML manuscript directly into this article. Word/HTML headings, paragraphs, quotes, captions and lists are mapped into editable Lexozine blocks; existing image blocks are preserved.</span></div></div>
                <button onClick={() => manuscriptInputRef.current?.click()}><Upload size={14}/> Choose file</button>
              </div>
              <div className="editorial-field"><span>Article title</span><input value={article.title} onChange={(event) => updateArticle({ title: event.target.value })}/><small>Synced with the primary headline used in preview and publication.</small></div>
              <div className="editorial-field"><span>Category</span><input value={article.category} onChange={(event) => updateArticle({ category: event.target.value })}/></div>
              <div className="editorial-field"><span>Byline</span><input value={article.byline} onChange={(event) => updateArticle({ byline: event.target.value })}/></div>
              <div className="editorial-field"><span>Read time</span><input value={article.readTime} onChange={(event) => updateArticle({ readTime: event.target.value })}/></div>
              {selectedBlock ? <div className="content-block-editor">
                <div className="block-editor-heading"><span className="editorial-panel-label">Selected {labelForBlock(selectedBlock)}</span><span className="block-editor-id">Edit block</span></div>
                {selectedBlock.type === "image" ? <div className="editorial-field">
                  <span>Image description / alt text</span><input value={selectedBlock.placement?.alt ?? ""} onChange={(event) => patchSelected({ placement: { ...(selectedBlock.placement ?? defaultImagePlacement), alt: event.target.value } })}/>
                  <span>Caption</span><input value={selectedBlock.placement?.caption ?? ""} onChange={(event) => patchSelected({ placement: { ...(selectedBlock.placement ?? defaultImagePlacement), caption: event.target.value } })}/>
                  <button className="editorial-button secondary" onClick={() => setShowMediaPicker((value) => !value)}><ImageIcon size={14}/> {selectedBlock.imageUrl ? "Replace image" : "Choose from Media"}</button>
                  {showMediaPicker ? <ArticleMediaPicker issueId={issue.id} onClose={() => setShowMediaPicker(false)} onSelect={(asset) => {
                    patchSelected({
                      imageUrl: asset.url,
                      imagePublicId: asset.publicId,
                      placement: { ...(selectedBlock.placement ?? defaultImagePlacement), alt: asset.alt, focalX: asset.focalX, focalY: asset.focalY },
                    });
                    setShowMediaPicker(false);
                  }}/> : null}
                  <button onClick={() => void saveAndGo(`/media?issue=${issue.id}`)} className="editorial-button secondary"><ImageIcon size={14}/> Open full Media Library</button>
                </div> : <><div className="editorial-field block-type-field"><span>Block type</span><select value={roleForBlock(selectedBlock)} onChange={(event) => changeSelectedRole(event.target.value as TextBlockRole)}>{textBlockRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select><small>Reclassify imported or existing text without losing its content.</small></div><RichTextEditor value={selectedBlock.content} onChange={(content) => patchSelected({ content })}/></>}
              </div> : null}
            </div>
          ) : (
            <div className="design-canvas-wrap">
              <div className="design-canvas-toolbar"><span>Live article composition</span><strong>{article.columns} column{article.columns > 1 ? "s" : ""}</strong></div>
              <div className="design-canvas" style={{ background: theme.paper, color: theme.ink }}>
                <div className={`design-grid columns-${article.columns}`}>
                  {blocks.filter((block) => !block.layout?.hidden).map((block) => {
                    const span = clampLayoutSpan(block.layout?.span ?? defaultLayoutSettings(block.type, article.columns).span, article.columns);
                    const selected = block.id === selectedBlockId;
                    const visualRole = roleForBlock(block);
                    return <div key={block.id} onClick={() => { setSelectedBlockId(block.id); if (block.type === "image" && !block.imageUrl) { setMode("content"); setShowMediaPicker(true); } }} className={`design-block ${visualRole} span-${span} ${selected ? "selected" : ""}`}>{block.type === "image" ? block.imageUrl ? <img src={block.imageUrl} alt={block.placement?.alt ?? ""}/> : <div className="design-image-placeholder"><ImageIcon size={24}/><span>Choose image from Media</span></div> : <div dangerouslySetInnerHTML={{ __html: block.content }}/>}</div>;
                  })}
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="article-editor-right">
          <span className="editorial-eyebrow">Inspector</span>
          <div className="preset-inspector-card">
            <span>Article type preset</span>
            <strong>{activePreset.name}</strong>
            <p>{activePreset.description} Presets are starting points; every block remains editable after application.</p>
            <select value={selectedPresetId} onChange={(event) => setSelectedPresetId(event.target.value)}>
              {layoutPresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.category} · {preset.name}</option>)}
            </select>
            <button onClick={applyPresetChoice}>Apply preset</button>
          </div>
          <div className="editorial-field"><span>Workflow status</span><select value={status} onChange={(event) => setStatus(event.target.value as ArticleWorkflowStatus)}>{(Object.keys(articleWorkflowLabels) as ArticleWorkflowStatus[]).map((value) => <option key={value} value={value}>{articleWorkflowLabels[value]}</option>)}</select></div>
          <div className="editorial-field"><span>Composition</span><select value={article.layout} onChange={(event) => updateArticle({ layout: event.target.value as Article["layout"] })}><option value="feature">Feature</option><option value="essay">Essay</option><option value="interview">Interview</option><option value="visual">Visual</option></select></div>
          <span className="editorial-panel-label">Columns</span><div className="span-buttons">{([1,2,3] as const).map((value) => <button key={value} className={article.columns === value ? "active" : ""} onClick={() => setColumns(value)}>{value}</button>)}</div>

          {selectedBlock ? <><div style={{ height: 22 }}/><span className="editorial-panel-label">Selected block · {labelForBlock(selectedBlock)}</span>{selectedBlock.type !== "image" ? <div className="editorial-field inspector-block-type"><span>Block type</span><select value={roleForBlock(selectedBlock)} onChange={(event) => changeSelectedRole(event.target.value as TextBlockRole)}>{textBlockRoles.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></div> : null}<div className="span-buttons">{([1,2,3] as const).filter((value) => value <= article.columns).map((value) => <button key={value} className={(selectedBlock.layout?.span ?? 1) === value ? "active" : ""} onClick={() => patchLayout({ span: value })}>Span {value}</button>)}</div><div className="block-control-grid"><button onClick={() => moveSelected(-1)}><ChevronUp size={12}/> Move up</button><button onClick={() => moveSelected(1)}><ChevronDown size={12}/> Move down</button><button onClick={() => patchLayout({ hidden: !selectedBlock.layout?.hidden })}>{selectedBlock.layout?.hidden ? <Eye size={12}/> : <EyeOff size={12}/>} {selectedBlock.layout?.hidden ? "Show" : "Hide"}</button><button onClick={() => patchLayout({ locked: !selectedBlock.layout?.locked })}>{selectedBlock.layout?.locked ? <Unlock size={12}/> : <Lock size={12}/>} {selectedBlock.layout?.locked ? "Unlock" : "Lock"}</button><button onClick={duplicateSelected}><Copy size={12}/> Duplicate</button><button className="danger" onClick={removeSelected}><Trash2 size={12}/> Remove</button></div></> : null}

          <div style={{ height: 22 }}/><button onClick={() => void saveAndGo(`/layouts?issue=${issue.id}&article=${article.id}`)} className="editorial-button secondary full-width"><LayoutTemplate size={14}/> Browse preset library</button>
          <div style={{ height: 8 }}/><button onClick={() => void saveAndGo(`/issues/${issue.id}`)} className="editorial-button secondary full-width"><CheckCircle2 size={14}/> Return to issue workflow</button>
          <div className="article-editor-tip"><strong>One article, two views.</strong><span>Content and Design edit the same underlying story. Navigation saves first; Ctrl/Cmd+S saves at any time.</span></div>
        </aside>
      </section>
    </main>
  );
}
