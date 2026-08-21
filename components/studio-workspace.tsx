"use client";

import Link from "next/link";
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Columns3,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  Grid3X3,
  ImagePlus,
  LayoutTemplate,
  Lock,
  Menu,
  MonitorUp,
  MoreHorizontal,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Unlock,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { CSSProperties } from "react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import StudioNavigation from "@/components/studio-navigation";
import RichTextEditor from "@/components/rich-text-editor";
import ImagePlacementControls from "@/components/image-placement-controls";
import {
  Article,
  BlockType,
  Issue,
  IssuePage,
  StoryBlock,
  ThemeKey,
  createId,
  defaultImagePlacement,
  defaultProductionSettings,
  themeTokens,
} from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";
import { issueStore } from "@/lib/issue-store";
import {
  applyLayoutPreset,
  defaultLayoutSettings,
  duplicateLayoutBlock,
  layoutPresets,
  moveLayoutBlock,
  normalizeArticleLayout,
  patchBlockLayout,
} from "@/lib/layout-composer";

function plainText(html: string) {
  if (typeof window === "undefined") return html.replace(/<[^>]+>/g, "");
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent ?? "";
}

function importedBlocks(text: string): StoryBlock[] {
  const parts = text.replace(/\r/g, "").split(/\n{2,}|\n(?=[A-Z][^\n]{0,100}$)/g).map((item) => item.trim()).filter(Boolean);
  return parts.map((content, index) => ({
    id: createId("block"),
    order: index,
    type: index === 0 ? "headline" : index === 1 && content.length < 220 ? "deck" : content.length < 100 && index > 2 ? "pullquote" : "body",
    content,
  }));
}

function createArticle(title = "Untitled Story", theme: ThemeKey = "editorial"): Article {
  const now = new Date().toISOString();
  return normalizeArticleLayout({
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
      { id: createId("block"), type: "headline", content: title, order: 0 },
      { id: createId("block"), type: "deck", content: "Add a concise editorial deck that frames the story.", order: 1 },
      { id: createId("block"), type: "body", content: "Begin the story here. Rich text, images and pull quotes can be placed into the layout from the inspector.", order: 2 },
    ],
    createdAt: now,
    updatedAt: now,
  });
}

function blockName(block: StoryBlock) {
  const preview = plainText(block.content).trim();
  if (block.type === "image") return block.placement?.alt || "Image";
  return preview ? preview.slice(0, 34) : block.type;
}

export default function StudioWorkspace() {
  const manuscriptInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const undoRef = useRef<Issue[]>([]);
  const redoRef = useRef<Issue[]>([]);
  const lastHistoryRef = useRef(0);

  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [activePageId, setActivePageId] = useState("");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [zoom, setZoom] = useState(82);
  const [showGrid, setShowGrid] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState("Loading issue…");
  const [importState, setImportState] = useState("DOCX, TXT or HTML");
  const [presetId, setPresetId] = useState(layoutPresets[0].id);

  const pages = useMemo(() => [...issue.pages].sort((a, b) => a.order - b.order), [issue.pages]);
  const activePage = useMemo(() => pages.find((page) => page.id === activePageId) ?? pages[0], [pages, activePageId]);
  const activeArticle = useMemo(() => activePage?.articleId ? issue.articles.find((article) => article.id === activePage.articleId) : undefined, [issue.articles, activePage]);
  const selectedBlock = useMemo(() => activeArticle?.blocks.find((block) => block.id === selectedBlockId), [activeArticle, selectedBlockId]);
  const themeKey = activeArticle?.theme ?? issue.theme;
  const theme = themeTokens[themeKey];
  const production = issue.production ?? defaultProductionSettings;

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        let issues = await issueStore?.list() ?? [];
        const requestedId = new URLSearchParams(window.location.search).get("issue");
        let next = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
        if (!next) {
          next = createIssueTemplate("editorial");
          next = await issueStore?.save(next) ?? next;
          issues = [next];
        }
        if (!alive) return;
        const normalized = { ...next, articles: next.articles.map(normalizeArticleLayout) };
        setIssue(normalized);
        const firstArticlePage = [...normalized.pages].sort((a,b)=>a.order-b.order).find((page) => page.kind === "article") ?? normalized.pages[0];
        setActivePageId(firstArticlePage?.id ?? "");
        const article = firstArticlePage?.articleId ? normalized.articles.find((item) => item.id === firstArticlePage.articleId) : undefined;
        setSelectedBlockId(article?.blocks[0]?.id ?? "");
        setHydrated(true);
        setSaveState("Saved");
      } catch {
        if (alive) {
          setHydrated(true);
          setSaveState("Local workspace available");
        }
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setSaveState("Saving…");
    const timer = window.setTimeout(async () => {
      try {
        const nextIssue = { ...issue, updatedAt: new Date().toISOString() };
        await issueStore?.save(nextIssue);
        if (!cancelled) setSaveState("Saved");
      } catch {
        if (!cancelled) setSaveState("Saved locally");
      }
    }, 450);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [issue, hydrated]);

  function applyIssue(mutator: (current: Issue) => Issue, recordHistory = true) {
    setIssue((current) => {
      if (recordHistory) {
        const now = Date.now();
        if (now - lastHistoryRef.current > 650) {
          undoRef.current = [...undoRef.current.slice(-39), structuredClone(current)];
          redoRef.current = [];
          lastHistoryRef.current = now;
        }
      }
      return mutator(current);
    });
  }

  function undo() {
    const previous = undoRef.current.pop();
    if (!previous) return;
    redoRef.current.push(structuredClone(issue));
    setIssue(previous);
  }

  function redo() {
    const next = redoRef.current.pop();
    if (!next) return;
    undoRef.current.push(structuredClone(issue));
    setIssue(next);
  }

  function updateArticle(patch: Partial<Article>) {
    if (!activeArticle) return;
    applyIssue((current) => ({
      ...current,
      articles: current.articles.map((article) => {
        if (article.id !== activeArticle.id) return article;
        const merged = { ...article, ...patch, updatedAt: new Date().toISOString() };
        return patch.columns ? normalizeArticleLayout(merged) : merged;
      }),
    }));
  }

  function updateBlock(content: string) {
    if (!activeArticle || !selectedBlock) return;
    updateArticle({ blocks: activeArticle.blocks.map((block) => block.id === selectedBlock.id ? { ...block, content } : block) });
  }

  function updateImagePlacement(placement: NonNullable<StoryBlock["placement"]>) {
    if (!activeArticle || !selectedBlock) return;
    updateArticle({ blocks: activeArticle.blocks.map((block) => block.id === selectedBlock.id ? { ...block, placement } : block) });
  }

  function updateSelectedLayout(patch: Partial<NonNullable<StoryBlock["layout"]>>) {
    if (!activeArticle || !selectedBlock) return;
    updateArticle({ blocks: activeArticle.blocks.map((block) => block.id === selectedBlock.id ? patchBlockLayout(block, activeArticle.columns, patch) : block) });
  }

  function moveSelectedBlock(direction: -1 | 1) {
    if (!activeArticle || !selectedBlock) return;
    updateArticle({ blocks: moveLayoutBlock(activeArticle.blocks, selectedBlock.id, direction) });
  }

  function duplicateSelectedBlock() {
    if (!activeArticle || !selectedBlock) return;
    const blocks = duplicateLayoutBlock(activeArticle.blocks, selectedBlock.id);
    const sourceIndex = blocks.findIndex((block) => block.id === selectedBlock.id);
    updateArticle({ blocks });
    setSelectedBlockId(blocks[sourceIndex + 1]?.id ?? selectedBlock.id);
  }

  function addTextBlock(type: Extract<BlockType, "body" | "pullquote" | "sidebar" | "caption">) {
    if (!activeArticle) return;
    const copy: Record<typeof type, string> = {
      body: "Add body text here.",
      pullquote: "Add a pull quote here.",
      sidebar: "Add sidebar or supporting information here.",
      caption: "Add a caption or credit.",
    };
    const block: StoryBlock = {
      id: createId("block"),
      type,
      content: copy[type],
      order: activeArticle.blocks.length,
      layout: defaultLayoutSettings(type, activeArticle.columns),
    };
    updateArticle({ blocks: [...activeArticle.blocks, block] });
    setSelectedBlockId(block.id);
  }

  function applyPreset() {
    if (!activeArticle) return;
    const next = applyLayoutPreset(activeArticle, presetId);
    updateArticle(next);
    setSelectedBlockId(next.blocks[0]?.id ?? "");
  }

  function addArticle() {
    const article = createArticle("Untitled Story", issue.theme);
    const page: IssuePage = { id: createId("page"), label: article.title, kind: "article", articleId: article.id, order: pages.length };
    applyIssue((current) => ({ ...current, articles: [...current.articles, article], pages: [...current.pages, page] }));
    setActivePageId(page.id);
    setSelectedBlockId(article.blocks[0].id);
  }

  function deleteActiveArticle() {
    if (!activeArticle || !activePage) return;
    const remainingPages = issue.pages.filter((page) => page.id !== activePage.id).map((page, index) => ({ ...page, order: index }));
    applyIssue((current) => ({ ...current, articles: current.articles.filter((article) => article.id !== activeArticle.id), pages: remainingPages }));
    const fallback = remainingPages.find((page) => page.kind === "article") ?? remainingPages[0];
    setActivePageId(fallback?.id ?? "");
    setSelectedBlockId("");
  }

  function movePage(pageId: string, direction: -1 | 1) {
    const ordered = [...pages];
    const index = ordered.findIndex((page) => page.id === pageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    applyIssue((current) => ({ ...current, pages: ordered.map((page, order) => ({ ...page, order })) }));
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportState(`Importing ${file.name}…`);
    try {
      let text = "";
      if (file.name.toLowerCase().endsWith(".docx")) {
        const mammoth = await import("mammoth");
        text = (await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
      } else {
        text = await file.text();
        if (file.name.toLowerCase().endsWith(".html")) text = new DOMParser().parseFromString(text, "text/html").body.innerText;
      }
      const blocks = importedBlocks(text);
      const title = plainText(blocks.find((block) => block.type === "headline")?.content ?? file.name.replace(/\.[^.]+$/, ""));
      const article = normalizeArticleLayout({ ...createArticle(title, issue.theme), blocks });
      const page: IssuePage = { id: createId("page"), label: title.slice(0, 52), kind: "article", articleId: article.id, order: pages.length };
      applyIssue((current) => ({ ...current, articles: [...current.articles, article], pages: [...current.pages, page] }));
      setActivePageId(page.id);
      setSelectedBlockId(article.blocks[0]?.id ?? "");
      setImportState(`${blocks.length} blocks imported`);
    } catch {
      setImportState("Import failed — source left unchanged");
    } finally {
      event.target.value = "";
    }
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (activePage?.kind === "cover") {
        applyIssue((current) => ({ ...current, coverImageUrl: String(reader.result) }));
        return;
      }
      if (!activeArticle) return;
      const block: StoryBlock = {
        id: createId("block"),
        type: "image",
        content: "",
        order: activeArticle.blocks.length,
        imageUrl: String(reader.result),
        placement: { ...defaultImagePlacement, alt: file.name.replace(/\.[^.]+$/, "") },
        layout: defaultLayoutSettings("image", activeArticle.columns),
      };
      updateArticle({ blocks: [...activeArticle.blocks, block] });
      setSelectedBlockId(block.id);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function removeSelectedBlock() {
    if (!activeArticle || !selectedBlock || selectedBlock.layout?.locked) return;
    const remaining = activeArticle.blocks.filter((block) => block.id !== selectedBlock.id).map((block, order) => ({ ...block, order }));
    updateArticle({ blocks: remaining });
    setSelectedBlockId(remaining[0]?.id ?? "");
  }

  function setTheme(key: ThemeKey) {
    if (activeArticle) updateArticle({ theme: key });
    else applyIssue((current) => ({ ...current, theme: key }));
  }

  function renderCover() {
    return <div className="single-page-wrap" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}><article className="cover-canvas" style={{ color: theme.paper }}>
      {issue.coverImageUrl ? <div className="cover-photo" style={{ backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.72)),url(${issue.coverImageUrl})` }} /> : <div className="cover-art" style={{ background: `radial-gradient(circle at 68% 25%, ${theme.accent} 0 12%, transparent 13%), linear-gradient(135deg, #17191c 0 44%, ${theme.accent} 44% 58%, #dfd7cc 58% 100%)` }} />}
      <div className="cover-topline"><span>ISSUE {issue.number}</span><span>{issue.editionDate}</span></div><div className="cover-masthead">LEXOZINE</div><div className="cover-strategy">CREATE · PUBLISH · DIGITIZE · GROW</div><div className="cover-feature"><span>{issue.title.toUpperCase()}</span><h1>{issue.articles[0]?.title ?? issue.title}</h1><p>{issue.description}</p></div><div className="cover-lines">{issue.coverLines.slice(0,2).map((line)=><span key={line}>{line}</span>)}</div>
    </article></div>;
  }

  function renderToc() {
    return <div className="single-page-wrap" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}><article className="toc-canvas" style={{ background: theme.paper, color: theme.ink }}><div className="toc-number" style={{ color: theme.accent }}>{issue.number}</div><div className="toc-heading"><span>Issue {issue.number}</span><h1>Contents</h1><p>{issue.description}</p></div><div className="toc-list">{issue.articles.map((article,index)=>{const page=issue.pages.find((item)=>item.articleId===article.id);return <button key={article.id} onClick={()=>page&&setActivePageId(page.id)} className="toc-entry"><span>{String(index*4+4).padStart(2,"0")}</span><div><strong>{article.title}</strong><small>{article.category}</small></div></button>})}</div><div className="toc-footer">LEXOZINE · {issue.title.toUpperCase()} · {issue.editionDate}</div></article></div>;
  }

  function renderStructuredBlock(block: StoryBlock) {
    if (!activeArticle) return null;
    const settings = { ...defaultLayoutSettings(block.type, activeArticle.columns), ...(block.layout ?? {}) };
    const placement = block.placement ?? defaultImagePlacement;
    const span = Math.max(1, Math.min(activeArticle.columns, settings.span));
    const className = `composer-block ${block.type} ${selectedBlockId === block.id ? "selected" : ""} ${settings.locked ? "locked" : ""}`;
    const style = { gridColumn: `span ${span}` };
    return <button type="button" key={block.id} className={className} style={style} onClick={() => setSelectedBlockId(block.id)}>
      {block.type === "headline" ? <h1 dangerouslySetInnerHTML={{__html:block.content}}/> : null}
      {block.type === "deck" ? <div dangerouslySetInnerHTML={{__html:block.content}}/> : null}
      {block.type === "body" ? <div className="rich-copy" dangerouslySetInnerHTML={{__html:block.content}}/> : null}
      {block.type === "pullquote" ? <div dangerouslySetInnerHTML={{__html:block.content}}/> : null}
      {block.type === "sidebar" ? <div dangerouslySetInnerHTML={{__html:block.content}}/> : null}
      {block.type === "caption" ? <div dangerouslySetInnerHTML={{__html:block.content}}/> : null}
      {block.type === "image" ? <figure className="composer-image">{block.imageUrl ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={block.imageUrl} alt={placement.alt} style={{objectFit:placement.fit,objectPosition:`${placement.focalX}% ${placement.focalY}%`}}/>{placement.caption?<figcaption>{placement.caption}</figcaption>:null}</> : <div className="composer-image-placeholder">Place image</div>}</figure> : null}
    </button>;
  }

  function renderComposerPage(blocks: StoryBlock[], side: "left" | "right", folio: string) {
    if (!activeArticle) return null;
    return <article className={`mag-page ${side}-page composer-spread-page`} style={{background:theme.paper,color:theme.ink,"--composer-accent":theme.accent} as CSSProperties}>
      <div className="page-running-head"><span>{side === "left" ? `LEXOZINE · ${issue.title.toUpperCase()}` : activeArticle.title.toUpperCase()}</span><span>{activeArticle.category}</span></div>
      <div className={`composer-grid cols-${activeArticle.columns}`}>
        <div className="byline-row" style={{gridColumn:"1 / -1"}}><span>{activeArticle.byline}</span><span>{activeArticle.readTime}</span></div>
        {blocks.length ? blocks.map(renderStructuredBlock) : <div className="composer-empty">No visible blocks on this page</div>}
      </div>
      <div className="folio">{folio}</div>
    </article>;
  }

  function renderArticle() {
    if (!activeArticle) return null;
    const visible = [...activeArticle.blocks].sort((a,b)=>a.order-b.order).filter((block)=>!block.layout?.hidden);
    const splitAt = Math.max(1, Math.ceil(visible.length / 2));
    const left = visible.slice(0, splitAt);
    const right = visible.slice(splitAt);
    return <div className={`magazine-spread ${showGrid?"show-layout-grid":""}`} style={{transform:`scale(${zoom/100})`,transformOrigin:"top center"}}>{renderComposerPage(left,"left","04")}{renderComposerPage(right,"right","05")}</div>;
  }

  const orderedBlocks = activeArticle ? [...activeArticle.blocks].sort((a,b)=>a.order-b.order) : [];

  return <main className="studio-shell">
    <input ref={manuscriptInputRef} type="file" accept=".docx,.txt,.html" hidden onChange={handleImport}/>
    <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload}/>
    <header className="topbar">
      <div className="brand-lockup"><button className="icon-button mobile-only" aria-label="Open navigation"><Menu size={18}/></button><Link href="/issues" className="brand-mark">LZ</Link><div><div className="brand-title">Lexozine <span>Studio</span></div><div className="brand-subtitle">Editorial design workspace</div></div></div>
      <Link href="/issues" className="document-title"><span>Issue {issue.number} · {issue.title}</span><ChevronDown size={14}/></Link>
      <div className="top-actions"><button className="icon-button" aria-label="Undo" onClick={undo} disabled={!undoRef.current.length}><Undo2 size={17}/></button><button className="icon-button" aria-label="Redo" onClick={redo} disabled={!redoRef.current.length}><Redo2 size={17}/></button><div className="save-state"><span className="save-dot"/> {saveState}</div><Link href={`/preview?issue=${issue.id}`} className="secondary-button"><MonitorUp size={16}/> Preview</Link><Link href={`/export?issue=${issue.id}`} className="primary-button"><Download size={16}/> Export</Link></div>
    </header>

    <section className="workspace">
      <StudioNavigation/>
      <aside className="navigator-panel">
        <div className="panel-heading"><div><span className="eyebrow">Issue structure</span><h2>{issue.title}</h2></div><Link href="/issues" className="icon-button"><MoreHorizontal size={18}/></Link></div>
        <div className="issue-meta"><div><span>Issue</span><strong>{issue.number}</strong></div><div><span>Status</span><strong>{issue.status}</strong></div></div>
        <div className="section-label">Pages & stories</div>
        <div className="page-list">{pages.map((page,index)=><div className={`page-row ${activePage?.id===page.id?"active":""}`} key={page.id}><button className="page-row-main" onClick={()=>{setActivePageId(page.id);const article=page.articleId?issue.articles.find((item)=>item.id===page.articleId):undefined;setSelectedBlockId(article?.blocks[0]?.id??"")}}><span className={`page-thumb ${page.kind}`}>{page.kind==="cover"?"LZ":page.kind==="toc"?issue.number:String(Math.max(1,index-1)).padStart(2,"0")}</span><span className="page-copy"><strong>{page.label}</strong><small>{page.kind==="article"?"Editable article spread":page.kind==="cover"?"Front cover":"Auto contents"}</small></span></button><span className="page-move"><button onClick={()=>movePage(page.id,-1)} aria-label="Move page up"><ChevronUp size={12}/></button><button onClick={()=>movePage(page.id,1)} aria-label="Move page down"><ChevronDown size={12}/></button></span></div>)}</div>
        <button onClick={addArticle} className="add-page-button"><Plus size={16}/> Add article</button>
        <button className="import-card" onClick={()=>manuscriptInputRef.current?.click()}><Upload size={18}/><div><strong>Import manuscript</strong><span>{importState}</span></div></button>
        <button className="import-card image-import" onClick={()=>imageInputRef.current?.click()}><ImagePlus size={18}/><div><strong>{activePage?.kind==="cover"?"Set cover image":"Place image"}</strong><span>JPG, PNG, WEBP or GIF</span></div></button>
      </aside>

      <section className="canvas-stage">
        <div className="canvas-toolbar"><div className="toolbar-group"><button className="tool-button active"><FileText size={15}/> {activePage?.kind==="article"?"Editable spread":"Page"}</button><button className={`tool-button ${showGrid?"active":""}`} onClick={()=>setShowGrid((value)=>!value)}><Grid3X3 size={15}/> Grid</button>{activeArticle?<button className="tool-button" onClick={()=>updateArticle({columns:activeArticle.columns===3?1:(activeArticle.columns+1) as 1|2|3})}><Columns3 size={15}/> {activeArticle.columns} Columns</button>:null}{activeArticle?<Link className="tool-button composer-toolbar-link" href={`/layouts?issue=${issue.id}&article=${activeArticle.id}`}><LayoutTemplate size={15}/> Layouts</Link>:null}</div><div className="toolbar-group zoom-controls"><button className="icon-button" onClick={()=>setZoom((z)=>Math.max(50,z-10))}><ZoomOut size={16}/></button><span>{zoom}%</span><button className="icon-button" onClick={()=>setZoom((z)=>Math.min(120,z+10))}><ZoomIn size={16}/></button></div></div>
        <div className="canvas-scroll"><div className="spread-label"><span>{activePage?.label}</span><span>{activePage?.kind==="article"?`${activeArticle?.layout} · editable composition`:"Publication page"}</span></div>{activePage?.kind==="cover"?renderCover():activePage?.kind==="toc"?renderToc():renderArticle()}</div>
      </section>

      <aside className="inspector-panel">
        <div className="panel-heading compact"><div><span className="eyebrow">Inspector</span><h2>{selectedBlock?.type==="image"?"Image & layout":"Design & layout"}</h2></div></div>
        {activeArticle?<div className="inspector-section"><label>Article metadata</label><label className="stacked-field"><span>Title</span><input value={activeArticle.title} onChange={(e)=>{const title=e.target.value;updateArticle({title,slug:title.toLowerCase().replace(/[^a-z0-9]+/g,"-")});applyIssue((current)=>({...current,pages:current.pages.map((page)=>page.articleId===activeArticle.id?{...page,label:title}:page)}),false)}}/></label><label className="stacked-field"><span>Category</span><input value={activeArticle.category} onChange={(e)=>updateArticle({category:e.target.value})}/></label><label className="stacked-field"><span>Byline</span><input value={activeArticle.byline} onChange={(e)=>updateArticle({byline:e.target.value})}/></label><label className="stacked-field"><span>Read time</span><input value={activeArticle.readTime} onChange={(e)=>updateArticle({readTime:e.target.value})}/></label></div>:null}

        <div className="inspector-section"><label>Magazine style</label><div className="theme-grid">{(Object.keys(themeTokens) as ThemeKey[]).map((key)=><button key={key} onClick={()=>setTheme(key)} className={`theme-card ${themeKey===key?"active":""}`}><span className="theme-swatch" style={{background:themeTokens[key].paper,color:themeTokens[key].ink,borderColor:themeTokens[key].accent}}>Aa</span><strong>{themeTokens[key].label}</strong></button>)}</div></div>

        {activeArticle?<div className="inspector-section"><label>Editable layout</label><div className="composer-preset-row"><select value={presetId} onChange={(e)=>setPresetId(e.target.value)}>{layoutPresets.map((preset)=><option key={preset.id} value={preset.id}>{preset.name}</option>)}</select><button onClick={applyPreset}>Apply</button></div><label style={{display:"block",marginTop:10}}>Page columns</label><div className="segmented-control">{([1,2,3] as const).map((value)=><button key={value} onClick={()=>updateArticle({columns:value})} className={activeArticle.columns===value?"active":""}>{value}</button>)}</div><div className="composer-note">Presets initialise the composition only. The block controls below remain editable afterward.</div><div className="composer-quick-add"><button onClick={()=>addTextBlock("body")}>+ Text</button><button onClick={()=>addTextBlock("pullquote")}>+ Quote</button><button onClick={()=>addTextBlock("sidebar")}>+ Sidebar</button></div><div className="composer-block-list">{orderedBlocks.map((block,index)=>{const settings={...defaultLayoutSettings(block.type,activeArticle.columns),...(block.layout??{})};return <div key={block.id} className={`composer-row ${selectedBlockId===block.id?"active":""}`}><button className="composer-row-main" onClick={()=>setSelectedBlockId(block.id)}><AlignLeft size={12}/><span>{blockName(block)}</span><small>{block.type} · {settings.span}c</small></button><div className="composer-row-actions"><button title="Move up" disabled={index===0||settings.locked} onClick={()=>{setSelectedBlockId(block.id);updateArticle({blocks:moveLayoutBlock(activeArticle.blocks,block.id,-1)})}}><ArrowUp size={12}/></button><button title="Move down" disabled={index===orderedBlocks.length-1||settings.locked} onClick={()=>{setSelectedBlockId(block.id);updateArticle({blocks:moveLayoutBlock(activeArticle.blocks,block.id,1)})}}><ArrowDown size={12}/></button><button title={settings.hidden?"Show":"Hide"} onClick={()=>{setSelectedBlockId(block.id);updateArticle({blocks:activeArticle.blocks.map((item)=>item.id===block.id?patchBlockLayout(item,activeArticle.columns,{hidden:!settings.hidden}):item)})}}>{settings.hidden?<EyeOff size={12}/>:<Eye size={12}/>}</button><button title={settings.locked?"Unlock":"Lock"} onClick={()=>{setSelectedBlockId(block.id);updateArticle({blocks:activeArticle.blocks.map((item)=>item.id===block.id?patchBlockLayout(item,activeArticle.columns,{locked:!settings.locked}):item)})}}>{settings.locked?<Lock size={12}/>:<Unlock size={12}/>}</button></div></div>})}</div></div>:null}

        {activeArticle&&selectedBlock?<div className="inspector-section"><label>Selected block layout</label><div className="selected-meta"><AlignLeft size={16}/><span>{selectedBlock.type}</span></div><div className="composer-span-control">{([1,2,3] as const).map((span)=><button key={span} disabled={span>activeArticle.columns} className={(selectedBlock.layout?.span??defaultLayoutSettings(selectedBlock.type,activeArticle.columns).span)===span?"active":""} onClick={()=>updateSelectedLayout({span})}>{span} col{span>1?"s":""}</button>)}</div><div className="composer-row-actions" style={{marginTop:8}}><button title="Move up" onClick={()=>moveSelectedBlock(-1)}><ArrowUp size={13}/></button><button title="Move down" onClick={()=>moveSelectedBlock(1)}><ArrowDown size={13}/></button><button title={selectedBlock.layout?.hidden?"Show":"Hide"} onClick={()=>updateSelectedLayout({hidden:!(selectedBlock.layout?.hidden??false)})}>{selectedBlock.layout?.hidden?<EyeOff size={13}/>:<Eye size={13}/>}</button><button title={selectedBlock.layout?.locked?"Unlock":"Lock"} onClick={()=>updateSelectedLayout({locked:!(selectedBlock.layout?.locked??false)})}>{selectedBlock.layout?.locked?<Lock size={13}/>:<Unlock size={13}/>}</button><button title="Duplicate" onClick={duplicateSelectedBlock}><Copy size={13}/></button><button title="Delete" disabled={selectedBlock.layout?.locked} onClick={removeSelectedBlock}><Trash2 size={13}/></button></div></div>:null}

        {activeArticle&&selectedBlock&&selectedBlock.type!=="image"?<div className="inspector-section"><label>Block content</label><RichTextEditor value={selectedBlock.content} onChange={updateBlock}/></div>:null}
        {activeArticle&&selectedBlock?.type==="image"?<div className="inspector-section"><label>Image placement</label><ImagePlacementControls value={selectedBlock.placement??defaultImagePlacement} onChange={updateImagePlacement}/><button className="danger-button" disabled={selectedBlock.layout?.locked} onClick={removeSelectedBlock}>Remove image</button></div>:null}

        <div className="inspector-section"><label>Production</label><div className="production-row"><span>Page size</span><strong>{production.pageSize}</strong></div><div className="production-row"><span>Bleed</span><strong>{production.bleed} mm</strong></div><div className="production-row"><span>Safe margin</span><strong>{production.safeMargin} mm</strong></div><div className="production-row"><span>Grid</span><strong>{showGrid?"Visible":"Hidden"}</strong></div></div>
        {activeArticle?<button className="danger-button" onClick={deleteActiveArticle}><Trash2 size={13}/> Delete article</button>:null}
        <Link href={`/history?issue=${issue.id}`} className="save-button"><Save size={16}/> Save version</Link>
      </aside>
    </section>
  </main>;
}
