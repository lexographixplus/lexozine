"use client";

import Link from "next/link";
import {
  AlignLeft,
  ChevronDown,
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
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import StudioNavigation from "@/components/studio-navigation";
import RichTextEditor from "@/components/rich-text-editor";
import ImagePlacementControls, { ImagePlacement } from "@/components/image-placement-controls";

type BlockType = "headline" | "deck" | "body" | "pullquote" | "caption" | "image";
type PageKind = "cover" | "toc" | "article";
type StoryBlock = {
  id: string;
  type: BlockType;
  content: string;
  imageUrl?: string;
  placement?: ImagePlacement;
};
type PageItem = { id: string; label: string; kind: PageKind };

type PersistedStudioState = {
  pages: PageItem[];
  blocks: StoryBlock[];
  activePage: string;
  selectedBlock: string;
  themeKey: ThemeKey;
  columns: number;
};

const STORAGE_KEY = "lexozine-studio-v2";
const defaultPlacement: ImagePlacement = {
  width: 65,
  align: "center",
  fit: "cover",
  focalX: 50,
  focalY: 50,
  caption: "",
  alt: "",
};

const initialPages: PageItem[] = [
  { id: "cover", label: "Cover", kind: "cover" },
  { id: "toc", label: "Contents", kind: "toc" },
  { id: "feature", label: "City After Rain", kind: "article" },
  { id: "culture", label: "New African Forms", kind: "article" },
];

const initialBlocks: StoryBlock[] = [
  { id: "1", type: "headline", content: "The City After Rain" },
  { id: "2", type: "deck", content: "How a generation of designers is rethinking public space, memory and movement." },
  { id: "3", type: "body", content: "By morning, the streets have changed character. Pavements become mirrors, concrete softens beneath reflected light, and the geometry of the city feels briefly negotiable." },
  { id: "4", type: "body", content: "For young architects and visual thinkers, that transformation is more than atmosphere. It is a reminder that cities are never finished objects; they are edited continuously by weather, people, commerce and culture." },
  { id: "5", type: "pullquote", content: "A magazine spread should not merely contain a story. It should stage the reader's encounter with it." },
  { id: "6", type: "body", content: "That principle sits at the centre of Lexozine Studio: content remains editable, but every editorial decision can also become a visual one." },
];

const themes = {
  editorial: { label: "Editorial", accent: "#c87648", paper: "#f3eee6", ink: "#181715" },
  modern: { label: "Modern", accent: "#2b63ff", paper: "#f4f6f8", ink: "#111827" },
  cultural: { label: "Cultural", accent: "#b3382f", paper: "#f1e5d3", ink: "#201914" },
  minimal: { label: "Minimal", accent: "#202020", paper: "#faf9f6", ink: "#171717" },
};
type ThemeKey = keyof typeof themes;

function plainText(html: string) {
  if (typeof window === "undefined") return html.replace(/<[^>]+>/g, "");
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent ?? "";
}

function textToBlocks(text: string): StoryBlock[] {
  const paragraphs = text.replace(/\r/g, "").split(/\n{2,}|\n(?=[A-Z][^\n]{0,100}$)/g).map((item) => item.trim()).filter(Boolean);
  if (!paragraphs.length) return initialBlocks;
  return paragraphs.map((content, index) => {
    let type: BlockType = "body";
    if (index === 0) type = "headline";
    else if (index === 1 && content.length < 220) type = "deck";
    else if (/^[“\"]|[”\"]$/.test(content) && content.length < 260) type = "pullquote";
    else if (content.length < 90 && index > 2) type = "pullquote";
    return { id: `import-${Date.now()}-${index}`, type, content };
  });
}

function blockText(block: StoryBlock) {
  return plainText(block.content);
}

export default function StudioShell() {
  const manuscriptInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState(initialPages);
  const [activePage, setActivePage] = useState("feature");
  const [blocks, setBlocks] = useState(initialBlocks);
  const [selectedBlock, setSelectedBlock] = useState("1");
  const [themeKey, setThemeKey] = useState<ThemeKey>("editorial");
  const [zoom, setZoom] = useState(82);
  const [columns, setColumns] = useState(2);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState("Saved locally");
  const [importState, setImportState] = useState("DOCX, TXT or HTML");
  const [showGrid, setShowGrid] = useState(false);

  const theme = themes[themeKey];
  const selected = useMemo(() => blocks.find((block) => block.id === selectedBlock), [blocks, selectedBlock]);
  const activeItem = useMemo(() => pages.find((page) => page.id === activePage) ?? pages[0], [pages, activePage]);
  const headline = blockText(blocks.find((block) => block.type === "headline") ?? { id: "", type: "headline", content: "Untitled Story" });
  const deck = blockText(blocks.find((block) => block.type === "deck") ?? { id: "", type: "deck", content: "Add a short editorial deck for this story." });
  const imageBlocks = blocks.filter((block) => block.type === "image" && block.imageUrl);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as PersistedStudioState;
        setPages(parsed.pages);
        setBlocks(parsed.blocks);
        setActivePage(parsed.activePage);
        setSelectedBlock(parsed.selectedBlock);
        setThemeKey(parsed.themeKey);
        setColumns(parsed.columns);
      }
    } catch {
      setSaveState("Local recovery unavailable");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState("Saving…");
    const timeout = window.setTimeout(() => {
      const snapshot: PersistedStudioState = { pages, blocks, activePage, selectedBlock, themeKey, columns };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      setSaveState("Saved locally");
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [pages, blocks, activePage, selectedBlock, themeKey, columns, hydrated]);

  function updateBlock(content: string) {
    setBlocks((current) => current.map((block) => block.id === selectedBlock ? { ...block, content } : block));
  }

  function updateImagePlacement(placement: ImagePlacement) {
    setBlocks((current) => current.map((block) => block.id === selectedBlock ? { ...block, placement } : block));
  }

  function addPage() {
    const id = `story-${Date.now()}`;
    setPages((current) => [...current, { id, label: `Untitled story ${current.length - 1}`, kind: "article" }]);
    setActivePage(id);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportState(`Importing ${file.name}…`);
    try {
      let text = "";
      if (file.name.toLowerCase().endsWith(".docx")) {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value;
      } else {
        text = await file.text();
        if (file.name.toLowerCase().endsWith(".html")) {
          const doc = new DOMParser().parseFromString(text, "text/html");
          text = doc.body.innerText;
        }
      }
      const imported = textToBlocks(text);
      setBlocks(imported);
      setSelectedBlock(imported[0]?.id ?? "");
      const title = imported.find((block) => block.type === "headline")?.content || file.name.replace(/\.[^.]+$/, "");
      const id = `article-${Date.now()}`;
      setPages((current) => [...current, { id, label: title.slice(0, 45), kind: "article" }]);
      setActivePage(id);
      setImportState(`${imported.length} blocks imported`);
    } catch {
      setImportState("Import failed — file was not changed");
    } finally {
      event.target.value = "";
    }
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const id = `image-${Date.now()}`;
      const block: StoryBlock = {
        id,
        type: "image",
        content: "",
        imageUrl: String(reader.result),
        placement: { ...defaultPlacement, alt: file.name.replace(/\.[^.]+$/, "") },
      };
      setBlocks((current) => [...current, block]);
      setSelectedBlock(id);
      setActivePage((current) => pages.find((page) => page.id === current)?.kind === "article" ? current : "feature");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function removeSelectedBlock() {
    if (!selected) return;
    setBlocks((current) => current.filter((block) => block.id !== selected.id));
    setSelectedBlock(blocks.find((block) => block.id !== selected.id)?.id ?? "");
  }

  function renderCover() {
    return (
      <div className="single-page-wrap" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
        <article className="cover-canvas" style={{ color: theme.paper }}>
          <div className="cover-art" style={{ background: `radial-gradient(circle at 68% 25%, ${theme.accent} 0 12%, transparent 13%), linear-gradient(135deg, #17191c 0 44%, ${theme.accent} 44% 58%, #dfd7cc 58% 100%)` }} />
          <div className="cover-topline"><span>ISSUE 01</span><span>2026</span></div>
          <div className="cover-masthead">LEXOZINE</div>
          <div className="cover-strategy">CREATE · PUBLISH · DIGITIZE · GROW</div>
          <div className="cover-feature"><span>NEW VOICES</span><h1>{headline}</h1><p>{deck}</p></div>
          <div className="cover-lines"><span>Designing the next African visual language</span><span>Culture, publishing and creative technology</span></div>
        </article>
      </div>
    );
  }

  function renderToc() {
    const stories = pages.filter((page) => page.kind === "article");
    return (
      <div className="single-page-wrap" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
        <article className="toc-canvas" style={{ background: theme.paper, color: theme.ink }}>
          <div className="toc-number" style={{ color: theme.accent }}>01</div>
          <div className="toc-heading"><span>Issue 01</span><h1>Contents</h1><p>Stories, ideas and visual culture from the Lexozine editorial desk.</p></div>
          <div className="toc-list">{stories.map((story, index) => <button key={story.id} onClick={() => setActivePage(story.id)} className="toc-entry"><span>{String(index * 4 + 4).padStart(2, "0")}</span><div><strong>{story.label}</strong><small>{index === 0 ? "Design / City / Culture" : "Ideas / Publishing / People"}</small></div></button>)}</div>
          <div className="toc-footer">LEXOZINE · NEW VOICES · 2026</div>
        </article>
      </div>
    );
  }

  function renderImageFigure(block: StoryBlock) {
    const placement = block.placement ?? defaultPlacement;
    return (
      <figure
        key={block.id}
        className={`placed-image align-${placement.align} ${selectedBlock === block.id ? "selected-image" : ""}`}
        style={{ width: placement.align === "full" ? "100%" : `${placement.width}%` }}
        onClick={() => setSelectedBlock(block.id)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={block.imageUrl} alt={placement.alt} style={{ objectFit: placement.fit, objectPosition: `${placement.focalX}% ${placement.focalY}%` }} />
        {placement.caption ? <figcaption>{placement.caption}</figcaption> : null}
      </figure>
    );
  }

  function renderArticle() {
    const fullImages = imageBlocks.filter((block) => (block.placement ?? defaultPlacement).align === "full");
    const inlineImages = imageBlocks.filter((block) => (block.placement ?? defaultPlacement).align !== "full");
    return (
      <div className={`magazine-spread ${showGrid ? "show-layout-grid" : ""}`} style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
        <article className="mag-page left-page" style={{ background: theme.paper, color: theme.ink }}>
          <div className="page-running-head">LEXOZINE · NEW VOICES</div>
          <div className="story-kicker" style={{ color: theme.accent }}>DESIGN / CITY / CULTURE</div>
          {blocks.filter((b) => ["headline", "deck"].includes(b.type)).map((block) => <button key={block.id} onClick={() => setSelectedBlock(block.id)} className={`editable-block ${selectedBlock === block.id ? "selected" : ""}`}>{block.type === "headline" ? <h1 dangerouslySetInnerHTML={{ __html: block.content }} /> : <div className="story-deck" dangerouslySetInnerHTML={{ __html: block.content }} />}</button>)}
          <div className="byline-row"><span>Words by Lexozine Editorial</span><span>8 min read</span></div>
          {fullImages[0] ? renderImageFigure(fullImages[0]) : <button className="hero-image-frame image-drop-target" onClick={() => imageInputRef.current?.click()}><div className="hero-image-art" style={{ background: `linear-gradient(145deg, ${theme.accent} 0%, #2a2523 48%, #ded4c7 48%, #ded4c7 100%)` }} /><span><ImagePlus size={12} /> Place feature image</span></button>}
          <div className="folio">04</div>
        </article>

        <article className="mag-page right-page" style={{ background: theme.paper, color: theme.ink }}>
          <div className="page-running-head">{headline.toUpperCase()}</div>
          <div className={`article-flow columns-${columns}`}>
            {blocks.filter((b) => b.type === "body").map((block, index) => <button key={block.id} onClick={() => setSelectedBlock(block.id)} className={`editable-block body-block ${selectedBlock === block.id ? "selected" : ""}`}><div className={index === 0 ? "drop-cap rich-copy" : "rich-copy"} dangerouslySetInnerHTML={{ __html: block.content }} /></button>)}
            {inlineImages.map(renderImageFigure)}
            {blocks.filter((b) => b.type === "pullquote").map((block) => <button key={block.id} onClick={() => setSelectedBlock(block.id)} className={`editable-block pullquote ${selectedBlock === block.id ? "selected" : ""}`} style={{ borderColor: theme.accent }}><div dangerouslySetInnerHTML={{ __html: block.content }} /></button>)}
          </div>
          <div className="article-note" style={{ borderTopColor: theme.accent }}><strong>Editorial note</strong><span>Layouts remain editable after manuscript import.</span></div>
          <div className="folio">05</div>
        </article>
      </div>
    );
  }

  return (
    <main className="studio-shell">
      <input ref={manuscriptInputRef} type="file" accept=".docx,.txt,.html" hidden onChange={handleImport} />
      <input ref={imageInputRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
      <header className="topbar">
        <div className="brand-lockup"><button className="icon-button mobile-only" aria-label="Open navigation"><Menu size={18} /></button><Link href="/issues" className="brand-mark">LZ</Link><div><div className="brand-title">Lexozine <span>Studio</span></div><div className="brand-subtitle">Editorial design workspace</div></div></div>
        <Link href="/issues" className="document-title"><span>Issue 01 · New Voices</span><ChevronDown size={14} /></Link>
        <div className="top-actions"><button className="icon-button" aria-label="Undo" title="Undo"><Undo2 size={17} /></button><button className="icon-button" aria-label="Redo" title="Redo"><Redo2 size={17} /></button><div className="save-state"><span className="save-dot" /> {saveState}</div><Link href="/preview" className="secondary-button"><MonitorUp size={16} /> Preview</Link><Link href="/export" className="primary-button"><Download size={16} /> Export</Link></div>
      </header>

      <section className="workspace">
        <StudioNavigation />

        <aside className="navigator-panel">
          <div className="panel-heading"><div><span className="eyebrow">Issue structure</span><h2>New Voices</h2></div><Link href="/issues" className="icon-button" aria-label="Issue manager"><MoreHorizontal size={18} /></Link></div>
          <div className="issue-meta"><div><span>Issue</span><strong>01</strong></div><div><span>Status</span><strong>Draft</strong></div></div>
          <div className="section-label">Pages & stories</div>
          <div className="page-list">{pages.map((page, index) => <button key={page.id} onClick={() => setActivePage(page.id)} className={`page-row ${activePage === page.id ? "active" : ""}`}><span className={`page-thumb ${page.kind}`}>{page.kind === "cover" ? "LZ" : page.kind === "toc" ? "01" : String(Math.max(1, index - 1)).padStart(2, "0")}</span><span className="page-copy"><strong>{page.label}</strong><small>{page.kind === "article" ? "Feature story" : page.kind === "cover" ? "Front cover" : "Auto generated"}</small></span><MoreHorizontal size={15} /></button>)}</div>
          <button onClick={addPage} className="add-page-button"><Plus size={16} /> Add article</button>
          <button className="import-card" onClick={() => manuscriptInputRef.current?.click()}><Upload size={18} /><div><strong>Import manuscript</strong><span>{importState}</span></div></button>
          <button className="import-card image-import" onClick={() => imageInputRef.current?.click()}><ImagePlus size={18} /><div><strong>Place image</strong><span>JPG, PNG, WEBP or GIF</span></div></button>
        </aside>

        <section className="canvas-stage">
          <div className="canvas-toolbar"><div className="toolbar-group"><button className="tool-button active"><FileText size={15} /> {activeItem.kind === "article" ? "Spread" : "Page"}</button><button className={`tool-button ${showGrid ? "active" : ""}`} onClick={() => setShowGrid((value) => !value)}><Grid3X3 size={15} /> Grid</button><button className="tool-button" onClick={() => setColumns((value) => value === 3 ? 1 : value + 1)}><Columns3 size={15} /> {columns} Columns</button></div><div className="toolbar-group zoom-controls"><button className="icon-button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 10))}><ZoomOut size={16} /></button><span>{zoom}%</span><button className="icon-button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(120, z + 10))}><ZoomIn size={16} /></button></div></div>
          <div className="canvas-scroll"><div className="spread-label"><span>{activeItem.label}</span><span>{activeItem.kind === "article" ? "Editorial spread" : activeItem.kind === "cover" ? "Front cover" : "Issue navigation"}</span></div>{activeItem.kind === "cover" ? renderCover() : activeItem.kind === "toc" ? renderToc() : renderArticle()}</div>
        </section>

        <aside className="inspector-panel">
          <div className="panel-heading compact"><div><span className="eyebrow">Inspector</span><h2>{selected?.type === "image" ? "Image" : "Design & type"}</h2></div></div>
          <div className="inspector-section"><label>Magazine style</label><div className="theme-grid">{(Object.keys(themes) as ThemeKey[]).map((key) => <button key={key} onClick={() => setThemeKey(key)} className={`theme-card ${themeKey === key ? "active" : ""}`}><span className="theme-swatch" style={{ background: themes[key].paper, color: themes[key].ink, borderColor: themes[key].accent }}>Aa</span><strong>{themes[key].label}</strong></button>)}</div></div>
          {activeItem.kind === "article" ? <div className="inspector-section"><label>Text columns</label><div className="segmented-control">{[1, 2, 3].map((value) => <button key={value} onClick={() => setColumns(value)} className={columns === value ? "active" : ""}>{value}</button>)}</div></div> : null}
          {activeItem.kind === "article" && selected && selected.type !== "image" ? <div className="inspector-section"><label>Selected block</label><div className="selected-meta"><AlignLeft size={16} /><span>{selected.type}</span></div><RichTextEditor value={selected.content} onChange={updateBlock} ariaLabel={`Edit ${selected.type}`} /></div> : null}
          {activeItem.kind === "article" && selected?.type === "image" ? <div className="inspector-section"><label>Image placement</label><ImagePlacementControls value={selected.placement ?? defaultPlacement} onChange={updateImagePlacement} /><button className="danger-button" onClick={removeSelectedBlock}>Remove image</button></div> : null}
          <div className="inspector-section"><label>Production</label><div className="production-row"><span>Page size</span><strong>A4</strong></div><div className="production-row"><span>Bleed</span><strong>3 mm</strong></div><div className="production-row"><span>Safe margin</span><strong>12 mm</strong></div><div className="production-row"><span>Grid</span><strong>{showGrid ? "Visible" : "Hidden"}</strong></div></div>
          <Link href="/history" className="save-button" onClick={() => setSaveState("Saved locally")}><Save size={16} /> Save version</Link>
        </aside>
      </section>
    </main>
  );
}
