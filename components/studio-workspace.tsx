"use client";

import Link from "next/link";
import {
  AlignLeft,
  ChevronDown,
  ChevronUp,
  Columns3,
  Download,
  FileText,
  Grid3X3,
  ImagePlus,
  Menu,
  MonitorUp,
  MoreHorizontal,
  Plus,
  Redo2,
  Save,
  Trash2,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import StudioNavigation from "@/components/studio-navigation";
import RichTextEditor from "@/components/rich-text-editor";
import ImagePlacementControls from "@/components/image-placement-controls";
import {
  Article,
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

const ISSUES_KEY = "lexozine-issues-v1";

function readIssues(): Issue[] {
  try {
    return JSON.parse(window.localStorage.getItem(ISSUES_KEY) ?? "[]") as Issue[];
  } catch {
    return [];
  }
}

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
      { id: createId("block"), type: "headline", content: title, order: 0 },
      { id: createId("block"), type: "deck", content: "Add a concise editorial deck that frames the story.", order: 1 },
      { id: createId("block"), type: "body", content: "Begin the story here. Rich text, images and pull quotes can be placed into the layout from the inspector.", order: 2 },
    ],
    createdAt: now,
    updatedAt: now,
  };
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

  const pages = useMemo(() => [...issue.pages].sort((a, b) => a.order - b.order), [issue.pages]);
  const activePage = useMemo(() => pages.find((page) => page.id === activePageId) ?? pages[0], [pages, activePageId]);
  const activeArticle = useMemo(() => activePage?.articleId ? issue.articles.find((article) => article.id === activePage.articleId) : undefined, [issue.articles, activePage]);
  const selectedBlock = useMemo(() => activeArticle?.blocks.find((block) => block.id === selectedBlockId), [activeArticle, selectedBlockId]);
  const themeKey = activeArticle?.theme ?? issue.theme;
  const theme = themeTokens[themeKey];
  const production = issue.production ?? defaultProductionSettings;

  useEffect(() => {
    const issues = readIssues();
    const requestedId = new URLSearchParams(window.location.search).get("issue");
    let next = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
    if (!next) {
      next = createIssueTemplate("editorial");
      window.localStorage.setItem(ISSUES_KEY, JSON.stringify([next]));
    }
    setIssue(next);
    const firstArticlePage = [...next.pages].sort((a,b)=>a.order-b.order).find((page) => page.kind === "article") ?? next.pages[0];
    setActivePageId(firstArticlePage?.id ?? "");
    const article = firstArticlePage?.articleId ? next.articles.find((item) => item.id === firstArticlePage.articleId) : undefined;
    setSelectedBlockId(article?.blocks[0]?.id ?? "");
    setHydrated(true);
    setSaveState("Saved locally");
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState("Saving…");
    const timer = window.setTimeout(() => {
      const issues = readIssues();
      const nextIssue = { ...issue, updatedAt: new Date().toISOString() };
      const index = issues.findIndex((item) => item.id === issue.id);
      if (index >= 0) issues[index] = nextIssue;
      else issues.unshift(nextIssue);
      window.localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
      setSaveState("Saved locally");
    }, 300);
    return () => window.clearTimeout(timer);
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
    applyIssue((current) => ({ ...current, articles: current.articles.map((article) => article.id === activeArticle.id ? { ...article, ...patch, updatedAt: new Date().toISOString() } : article) }));
  }

  function updateBlock(content: string) {
    if (!activeArticle || !selectedBlock) return;
    updateArticle({ blocks: activeArticle.blocks.map((block) => block.id === selectedBlock.id ? { ...block, content } : block) });
  }

  function updateImagePlacement(placement: NonNullable<StoryBlock["placement"]>) {
    if (!activeArticle || !selectedBlock) return;
    updateArticle({ blocks: activeArticle.blocks.map((block) => block.id === selectedBlock.id ? { ...block, placement } : block) });
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
      const article = { ...createArticle(title, issue.theme), blocks };
      const page: IssuePage = { id: createId("page"), label: title.slice(0, 52), kind: "article", articleId: article.id, order: pages.length };
      applyIssue((current) => ({ ...current, articles: [...current.articles, article], pages: [...current.pages, page] }));
      setActivePageId(page.id);
      setSelectedBlockId(blocks[0]?.id ?? "");
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
      const block: StoryBlock = { id: createId("block"), type: "image", content: "", order: activeArticle.blocks.length, imageUrl: String(reader.result), placement: { ...defaultImagePlacement, alt: file.name.replace(/\.[^.]+$/, "") } };
      updateArticle({ blocks: [...activeArticle.blocks, block] });
      setSelectedBlockId(block.id);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function removeSelectedBlock() {
    if (!activeArticle || !selectedBlock) return;
    updateArticle({ blocks: activeArticle.blocks.filter((block) => block.id !== selectedBlock.id).map((block, order) => ({ ...block, order })) });
    setSelectedBlockId(activeArticle.blocks.find((block) => block.id !== selectedBlock.id)?.id ?? "");
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

  function renderImage(block: StoryBlock) {
    const placement = block.placement ?? defaultImagePlacement;
    return <figure key={block.id} className={`placed-image align-${placement.align} ${selectedBlockId===block.id?"selected-image":""}`} style={{width:placement.align==="full"?"100%":`${placement.width}%`}} onClick={()=>setSelectedBlockId(block.id)}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={block.imageUrl} alt={placement.alt} style={{objectFit:placement.fit,objectPosition:`${placement.focalX}% ${placement.focalY}%`}}/>{placement.caption?<figcaption>{placement.caption}</figcaption>:null}</figure>;
  }

  function renderArticle() {
    if (!activeArticle) return null;
    const headline = activeArticle.blocks.find((block)=>block.type==="headline");
    const deck = activeArticle.blocks.find((block)=>block.type==="deck");
    const bodies = activeArticle.blocks.filter((block)=>block.type==="body").sort((a,b)=>a.order-b.order);
    const quotes = activeArticle.blocks.filter((block)=>block.type==="pullquote");
    const images = activeArticle.blocks.filter((block)=>block.type==="image"&&block.imageUrl);
    const hero = images.find((block)=>(block.placement??defaultImagePlacement).align==="full") ?? images[0];
    const inline = images.filter((block)=>block.id!==hero?.id);
    return <div className={`magazine-spread ${showGrid?"show-layout-grid":""}`} style={{transform:`scale(${zoom/100})`,transformOrigin:"top center"}}><article className="mag-page left-page" style={{background:theme.paper,color:theme.ink}}><div className="page-running-head">LEXOZINE · {issue.title.toUpperCase()}</div><div className="story-kicker" style={{color:theme.accent}}>{activeArticle.category.toUpperCase()}</div>{headline?<button onClick={()=>setSelectedBlockId(headline.id)} className={`editable-block ${selectedBlockId===headline.id?"selected":""}`}><h1 dangerouslySetInnerHTML={{__html:headline.content}}/></button>:null}{deck?<button onClick={()=>setSelectedBlockId(deck.id)} className={`editable-block ${selectedBlockId===deck.id?"selected":""}`}><div className="story-deck" dangerouslySetInnerHTML={{__html:deck.content}}/></button>:null}<div className="byline-row"><span>Words by {activeArticle.byline}</span><span>{activeArticle.readTime}</span></div>{hero?renderImage(hero):<button className="hero-image-frame image-drop-target" onClick={()=>imageInputRef.current?.click()}><div className="hero-image-art" style={{background:`linear-gradient(145deg,${theme.accent} 0%,#2a2523 48%,#ded4c7 48%,#ded4c7 100%)`}}/><span><ImagePlus size={12}/> Place feature image</span></button>}<div className="folio">04</div></article><article className="mag-page right-page" style={{background:theme.paper,color:theme.ink}}><div className="page-running-head">{activeArticle.title.toUpperCase()}</div><div className={`article-flow columns-${activeArticle.columns}`}>{bodies.map((block,index)=><button key={block.id} onClick={()=>setSelectedBlockId(block.id)} className={`editable-block body-block ${selectedBlockId===block.id?"selected":""}`}><div className={index===0?"drop-cap rich-copy":"rich-copy"} dangerouslySetInnerHTML={{__html:block.content}}/></button>)}{inline.map(renderImage)}{quotes.map((block)=><button key={block.id} onClick={()=>setSelectedBlockId(block.id)} className={`editable-block pullquote ${selectedBlockId===block.id?"selected":""}`} style={{borderColor:theme.accent}}><div dangerouslySetInnerHTML={{__html:block.content}}/></button>)}</div><div className="article-note" style={{borderTopColor:theme.accent}}><strong>{activeArticle.layout} layout</strong><span>Editable blocks · structured content</span></div><div className="folio">05</div></article></div>;
  }

  return <main className="studio-shell"><input ref={manuscriptInputRef} type="file" accept=".docx,.txt,.html" hidden onChange={handleImport}/><input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload}/><header className="topbar"><div className="brand-lockup"><button className="icon-button mobile-only" aria-label="Open navigation"><Menu size={18}/></button><Link href="/issues" className="brand-mark">LZ</Link><div><div className="brand-title">Lexozine <span>Studio</span></div><div className="brand-subtitle">Editorial design workspace</div></div></div><Link href="/issues" className="document-title"><span>Issue {issue.number} · {issue.title}</span><ChevronDown size={14}/></Link><div className="top-actions"><button className="icon-button" aria-label="Undo" onClick={undo} disabled={!undoRef.current.length}><Undo2 size={17}/></button><button className="icon-button" aria-label="Redo" onClick={redo} disabled={!redoRef.current.length}><Redo2 size={17}/></button><div className="save-state"><span className="save-dot"/> {saveState}</div><Link href={`/preview?issue=${issue.id}`} className="secondary-button"><MonitorUp size={16}/> Preview</Link><Link href={`/export?issue=${issue.id}`} className="primary-button"><Download size={16}/> Export</Link></div></header><section className="workspace"><StudioNavigation/><aside className="navigator-panel"><div className="panel-heading"><div><span className="eyebrow">Issue structure</span><h2>{issue.title}</h2></div><Link href="/issues" className="icon-button"><MoreHorizontal size={18}/></Link></div><div className="issue-meta"><div><span>Issue</span><strong>{issue.number}</strong></div><div><span>Status</span><strong>{issue.status}</strong></div></div><div className="section-label">Pages & stories</div><div className="page-list">{pages.map((page,index)=><div className={`page-row ${activePage?.id===page.id?"active":""}`} key={page.id}><button className="page-row-main" onClick={()=>{setActivePageId(page.id);const article=page.articleId?issue.articles.find((item)=>item.id===page.articleId):undefined;setSelectedBlockId(article?.blocks[0]?.id??"")}}><span className={`page-thumb ${page.kind}`}>{page.kind==="cover"?"LZ":page.kind==="toc"?issue.number:String(Math.max(1,index-1)).padStart(2,"0")}</span><span className="page-copy"><strong>{page.label}</strong><small>{page.kind==="article"?"Article spread":page.kind==="cover"?"Front cover":"Auto contents"}</small></span></button><span className="page-move"><button onClick={()=>movePage(page.id,-1)} aria-label="Move page up"><ChevronUp size={12}/></button><button onClick={()=>movePage(page.id,1)} aria-label="Move page down"><ChevronDown size={12}/></button></span></div>)}</div><button onClick={addArticle} className="add-page-button"><Plus size={16}/> Add article</button><button className="import-card" onClick={()=>manuscriptInputRef.current?.click()}><Upload size={18}/><div><strong>Import manuscript</strong><span>{importState}</span></div></button><button className="import-card image-import" onClick={()=>imageInputRef.current?.click()}><ImagePlus size={18}/><div><strong>{activePage?.kind==="cover"?"Set cover image":"Place image"}</strong><span>JPG, PNG, WEBP or GIF</span></div></button></aside><section className="canvas-stage"><div className="canvas-toolbar"><div className="toolbar-group"><button className="tool-button active"><FileText size={15}/> {activePage?.kind==="article"?"Spread":"Page"}</button><button className={`tool-button ${showGrid?"active":""}`} onClick={()=>setShowGrid((value)=>!value)}><Grid3X3 size={15}/> Grid</button>{activeArticle?<button className="tool-button" onClick={()=>updateArticle({columns:activeArticle.columns===3?1:(activeArticle.columns+1) as 1|2|3})}><Columns3 size={15}/> {activeArticle.columns} Columns</button>:null}</div><div className="toolbar-group zoom-controls"><button className="icon-button" onClick={()=>setZoom((z)=>Math.max(50,z-10))}><ZoomOut size={16}/></button><span>{zoom}%</span><button className="icon-button" onClick={()=>setZoom((z)=>Math.min(120,z+10))}><ZoomIn size={16}/></button></div></div><div className="canvas-scroll"><div className="spread-label"><span>{activePage?.label}</span><span>{activePage?.kind==="article"?activeArticle?.layout:"Publication page"}</span></div>{activePage?.kind==="cover"?renderCover():activePage?.kind==="toc"?renderToc():renderArticle()}</div></section><aside className="inspector-panel"><div className="panel-heading compact"><div><span className="eyebrow">Inspector</span><h2>{selectedBlock?.type==="image"?"Image":"Design & content"}</h2></div></div>{activeArticle?<div className="inspector-section"><label>Article metadata</label><label className="stacked-field"><span>Title</span><input value={activeArticle.title} onChange={(e)=>{const title=e.target.value;updateArticle({title,slug:title.toLowerCase().replace(/[^a-z0-9]+/g,"-")});applyIssue((current)=>({...current,pages:current.pages.map((page)=>page.articleId===activeArticle.id?{...page,label:title}:page)}),false)}}/></label><label className="stacked-field"><span>Category</span><input value={activeArticle.category} onChange={(e)=>updateArticle({category:e.target.value})}/></label><label className="stacked-field"><span>Byline</span><input value={activeArticle.byline} onChange={(e)=>updateArticle({byline:e.target.value})}/></label><label className="stacked-field"><span>Read time</span><input value={activeArticle.readTime} onChange={(e)=>updateArticle({readTime:e.target.value})}/></label></div>:null}<div className="inspector-section"><label>Magazine style</label><div className="theme-grid">{(Object.keys(themeTokens) as ThemeKey[]).map((key)=><button key={key} onClick={()=>setTheme(key)} className={`theme-card ${themeKey===key?"active":""}`}><span className="theme-swatch" style={{background:themeTokens[key].paper,color:themeTokens[key].ink,borderColor:themeTokens[key].accent}}>Aa</span><strong>{themeTokens[key].label}</strong></button>)}</div></div>{activeArticle?<div className="inspector-section"><label>Layout</label><div className="segmented-control">{(["feature","essay","interview","visual"] as const).map((layout)=><button key={layout} onClick={()=>updateArticle({layout})} className={activeArticle.layout===layout?"active":""}>{layout}</button>)}</div><label style={{display:"block",marginTop:10}}>Text columns</label><div className="segmented-control">{([1,2,3] as const).map((value)=><button key={value} onClick={()=>updateArticle({columns:value})} className={activeArticle.columns===value?"active":""}>{value}</button>)}</div></div>:null}{activeArticle&&selectedBlock&&selectedBlock.type!=="image"?<div className="inspector-section"><label>Selected block</label><div className="selected-meta"><AlignLeft size={16}/><span>{selectedBlock.type}</span></div><RichTextEditor value={selectedBlock.content} onChange={updateBlock}/></div>:null}{activeArticle&&selectedBlock?.type==="image"?<div className="inspector-section"><label>Image placement</label><ImagePlacementControls value={selectedBlock.placement??defaultImagePlacement} onChange={updateImagePlacement}/><button className="danger-button" onClick={removeSelectedBlock}>Remove image</button></div>:null}<div className="inspector-section"><label>Production</label><div className="production-row"><span>Page size</span><strong>{production.pageSize}</strong></div><div className="production-row"><span>Bleed</span><strong>{production.bleed} mm</strong></div><div className="production-row"><span>Safe margin</span><strong>{production.safeMargin} mm</strong></div><div className="production-row"><span>Grid</span><strong>{showGrid?"Visible":"Hidden"}</strong></div></div>{activeArticle?<button className="danger-button" onClick={deleteActiveArticle}><Trash2 size={13}/> Delete article</button>:null}<Link href={`/history?issue=${issue.id}`} className="save-button"><Save size={16}/> Save version</Link></aside></section></main>;
}
