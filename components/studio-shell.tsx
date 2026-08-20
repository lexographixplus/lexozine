"use client";

import {
  AlignLeft,
  BookOpen,
  ChevronDown,
  Columns3,
  Download,
  FileText,
  Grid3X3,
  Image as ImageIcon,
  LayoutDashboard,
  Menu,
  MonitorUp,
  MoreHorizontal,
  Plus,
  Redo2,
  Save,
  Settings2,
  Sparkles,
  Type,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type BlockType = "headline" | "deck" | "body" | "pullquote" | "caption";

type StoryBlock = {
  id: string;
  type: BlockType;
  content: string;
};

type PageItem = {
  id: string;
  label: string;
  kind: "cover" | "toc" | "article";
};

type PersistedStudioState = {
  pages: PageItem[];
  blocks: StoryBlock[];
  activePage: string;
  selectedBlock: string;
  themeKey: ThemeKey;
  columns: number;
};

const STORAGE_KEY = "lexozine-studio-v1";

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
};

type ThemeKey = keyof typeof themes;

function textToBlocks(text: string): StoryBlock[] {
  const paragraphs = text
    .replace(/\r/g, "")
    .split(/\n{2,}|\n(?=[A-Z][^\n]{0,100}$)/g)
    .map((item) => item.trim())
    .filter(Boolean);

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

export default function StudioShell() {
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const theme = themes[themeKey];
  const selected = useMemo(() => blocks.find((block) => block.id === selectedBlock), [blocks, selectedBlock]);

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

  return (
    <main className="studio-shell">
      <input ref={fileInputRef} type="file" accept=".docx,.txt,.html" hidden onChange={handleImport} />
      <header className="topbar">
        <div className="brand-lockup">
          <button className="icon-button mobile-only" aria-label="Open navigation"><Menu size={18} /></button>
          <div className="brand-mark">LZ</div>
          <div>
            <div className="brand-title">Lexozine <span>Studio</span></div>
            <div className="brand-subtitle">Editorial design workspace</div>
          </div>
        </div>

        <div className="document-title">
          <span>Issue 01 · New Voices</span>
          <ChevronDown size={14} />
        </div>

        <div className="top-actions">
          <button className="icon-button" aria-label="Undo"><Undo2 size={17} /></button>
          <button className="icon-button" aria-label="Redo"><Redo2 size={17} /></button>
          <div className="save-state"><span className="save-dot" /> {saveState}</div>
          <button className="secondary-button"><MonitorUp size={16} /> Preview</button>
          <button className="primary-button"><Download size={16} /> Export</button>
        </div>
      </header>

      <section className="workspace">
        <aside className="rail">
          <button className="rail-item active"><BookOpen size={19} /><span>Issue</span></button>
          <button className="rail-item"><LayoutDashboard size={19} /><span>Layouts</span></button>
          <button className="rail-item"><Type size={19} /><span>Styles</span></button>
          <button className="rail-item"><ImageIcon size={19} /><span>Media</span></button>
          <button className="rail-item"><Sparkles size={19} /><span>Assist</span></button>
          <div className="rail-spacer" />
          <button className="rail-item"><Settings2 size={19} /><span>Setup</span></button>
        </aside>

        <aside className="navigator-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Issue structure</span>
              <h2>New Voices</h2>
            </div>
            <button className="icon-button"><MoreHorizontal size={18} /></button>
          </div>

          <div className="issue-meta">
            <div><span>Issue</span><strong>01</strong></div>
            <div><span>Status</span><strong>Draft</strong></div>
          </div>

          <div className="section-label">Pages & stories</div>
          <div className="page-list">
            {pages.map((page, index) => (
              <button key={page.id} onClick={() => setActivePage(page.id)} className={`page-row ${activePage === page.id ? "active" : ""}`}>
                <span className={`page-thumb ${page.kind}`}>
                  {page.kind === "cover" ? "LZ" : page.kind === "toc" ? "01" : String(Math.max(1, index - 1)).padStart(2, "0")}
                </span>
                <span className="page-copy">
                  <strong>{page.label}</strong>
                  <small>{page.kind === "article" ? "Feature story" : page.kind === "cover" ? "Front cover" : "Auto generated"}</small>
                </span>
                <MoreHorizontal size={15} />
              </button>
            ))}
          </div>

          <button onClick={addPage} className="add-page-button"><Plus size={16} /> Add article</button>

          <button className="import-card" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} />
            <div><strong>Import manuscript</strong><span>{importState}</span></div>
          </button>
        </aside>

        <section className="canvas-stage">
          <div className="canvas-toolbar">
            <div className="toolbar-group">
              <button className="tool-button active"><FileText size={15} /> Page</button>
              <button className="tool-button"><Grid3X3 size={15} /> Grid</button>
              <button className="tool-button"><Columns3 size={15} /> Columns</button>
            </div>
            <div className="toolbar-group zoom-controls">
              <button className="icon-button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(50, z - 10))}><ZoomOut size={16} /></button>
              <span>{zoom}%</span>
              <button className="icon-button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(120, z + 10))}><ZoomIn size={16} /></button>
            </div>
          </div>

          <div className="canvas-scroll">
            <div className="spread-label"><span>Pages 4–5</span><span>Feature spread</span></div>
            <div className="magazine-spread" style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}>
              <article className="mag-page left-page" style={{ background: theme.paper, color: theme.ink }}>
                <div className="page-running-head">LEXOZINE · NEW VOICES</div>
                <div className="story-kicker" style={{ color: theme.accent }}>DESIGN / CITY / CULTURE</div>
                {blocks.filter((b) => ["headline", "deck"].includes(b.type)).map((block) => (
                  <button key={block.id} onClick={() => setSelectedBlock(block.id)} className={`editable-block ${selectedBlock === block.id ? "selected" : ""}`}>
                    {block.type === "headline" ? <h1>{block.content}</h1> : <p className="story-deck">{block.content}</p>}
                  </button>
                ))}
                <div className="byline-row"><span>Words by Lexozine Editorial</span><span>8 min read</span></div>
                <div className="hero-image-frame">
                  <div className="hero-image-art" style={{ background: `linear-gradient(145deg, ${theme.accent} 0%, #2a2523 48%, #ded4c7 48%, #ded4c7 100%)` }} />
                  <span>Feature image · focal point editable</span>
                </div>
                <div className="folio">04</div>
              </article>

              <article className="mag-page right-page" style={{ background: theme.paper, color: theme.ink }}>
                <div className="page-running-head">{blocks.find((b) => b.type === "headline")?.content.toUpperCase() || "UNTITLED STORY"}</div>
                <div className={`article-flow columns-${columns}`}>
                  {blocks.filter((b) => b.type === "body").map((block, index) => (
                    <button key={block.id} onClick={() => setSelectedBlock(block.id)} className={`editable-block body-block ${selectedBlock === block.id ? "selected" : ""}`}>
                      <p className={index === 0 ? "drop-cap" : ""}>{block.content}</p>
                    </button>
                  ))}
                  {blocks.filter((b) => b.type === "pullquote").map((block) => (
                    <button key={block.id} onClick={() => setSelectedBlock(block.id)} className={`editable-block pullquote ${selectedBlock === block.id ? "selected" : ""}`} style={{ borderColor: theme.accent }}>
                      “{block.content}”
                    </button>
                  ))}
                </div>
                <div className="article-note" style={{ borderTopColor: theme.accent }}>
                  <strong>Editorial note</strong>
                  <span>Layouts remain fully editable after manuscript import.</span>
                </div>
                <div className="folio">05</div>
              </article>
            </div>
          </div>
        </section>

        <aside className="inspector-panel">
          <div className="panel-heading compact">
            <div><span className="eyebrow">Inspector</span><h2>Design</h2></div>
          </div>

          <div className="inspector-section">
            <label>Magazine style</label>
            <div className="theme-grid">
              {(Object.keys(themes) as ThemeKey[]).map((key) => (
                <button key={key} onClick={() => setThemeKey(key)} className={`theme-card ${themeKey === key ? "active" : ""}`}>
                  <span className="theme-swatch" style={{ background: themes[key].paper, color: themes[key].ink, borderColor: themes[key].accent }}>Aa</span>
                  <strong>{themes[key].label}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="inspector-section">
            <label>Text columns</label>
            <div className="segmented-control">
              {[1, 2, 3].map((value) => <button key={value} onClick={() => setColumns(value)} className={columns === value ? "active" : ""}>{value}</button>)}
            </div>
          </div>

          <div className="inspector-section">
            <label>Selected block</label>
            <div className="selected-meta"><AlignLeft size={16} /><span>{selected?.type ?? "None"}</span></div>
            <textarea value={selected?.content ?? ""} onChange={(event) => updateBlock(event.target.value)} rows={8} />
          </div>

          <div className="inspector-section">
            <label>Production</label>
            <div className="production-row"><span>Page size</span><strong>A4</strong></div>
            <div className="production-row"><span>Bleed</span><strong>3 mm</strong></div>
            <div className="production-row"><span>Safe margin</span><strong>12 mm</strong></div>
          </div>

          <button className="save-button" onClick={() => setSaveState("Saved locally")}><Save size={16} /> Save version</button>
        </aside>
      </section>
    </main>
  );
}
