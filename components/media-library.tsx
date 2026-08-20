"use client";

import { ArrowLeft, Check, ImagePlus, Search, Trash2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Issue, StoryBlock } from "@/lib/editor-model";
import { createId, defaultImagePlacement } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";

type Asset = {
  id: string;
  name: string;
  url: string;
  type: string;
  alt: string;
  focalX: number;
  focalY: number;
};

const STORAGE_KEY = "lexozine-media-v1";
const ISSUES_KEY = "lexozine-issues-v1";

function loadAssets(): Asset[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

export default function MediaLibrary() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>(loadAssets);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [articleId, setArticleId] = useState("");
  const [status, setStatus] = useState("Select an asset to place it");
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const filtered = useMemo(() => assets.filter((asset) => asset.name.toLowerCase().includes(query.toLowerCase())), [assets, query]);

  useEffect(() => {
    try {
      const issues = JSON.parse(localStorage.getItem(ISSUES_KEY) ?? "[]") as Issue[];
      const requestedId = new URLSearchParams(window.location.search).get("issue");
      const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
      if (found) {
        setIssue(found);
        setArticleId(found.articles[0]?.id ?? "");
      }
    } catch {}
  }, []);

  function persist(next: Asset[]) {
    setAssets(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { setStatus("Browser storage is full — external media storage is needed"); }
  }

  function persistIssue(nextIssue: Issue) {
    const issues = (() => { try { return JSON.parse(localStorage.getItem(ISSUES_KEY) ?? "[]") as Issue[]; } catch { return []; } })();
    const index = issues.findIndex((item) => item.id === nextIssue.id);
    if (index >= 0) issues[index] = nextIssue; else issues.unshift(nextIssue);
    localStorage.setItem(ISSUES_KEY, JSON.stringify(issues));
    setIssue(nextIssue);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const asset: Asset = { id: createId("media"), name: file.name, url: String(reader.result), type: file.type, alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "), focalX: 50, focalY: 50 };
        setAssets((current) => {
          const next = [asset, ...current];
          try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { setStatus("Browser storage is full — external media storage is needed"); }
          return next;
        });
        setSelectedId(asset.id);
        setStatus(`${file.name} added to library`);
      };
      reader.readAsDataURL(file);
    });
    event.target.value = "";
  }

  function updateSelected(patch: Partial<Asset>) {
    if (!selected) return;
    persist(assets.map((asset) => asset.id === selected.id ? { ...asset, ...patch } : asset));
  }

  function removeSelected() {
    if (!selected) return;
    persist(assets.filter((asset) => asset.id !== selected.id));
    setSelectedId(null);
  }

  function placeInArticle() {
    if (!selected || !articleId) return;
    const article = issue.articles.find((item) => item.id === articleId);
    if (!article) return;
    const block: StoryBlock = {
      id: createId("block"),
      type: "image",
      content: "",
      order: article.blocks.length,
      imageUrl: selected.url,
      placement: { ...defaultImagePlacement, alt: selected.alt, focalX: selected.focalX, focalY: selected.focalY },
    };
    const nextIssue = { ...issue, articles: issue.articles.map((item) => item.id === articleId ? { ...item, blocks: [...item.blocks, block], updatedAt: new Date().toISOString() } : item), updatedAt: new Date().toISOString() };
    persistIssue(nextIssue);
    setStatus(`${selected.name} placed in ${article.title}`);
  }

  function useAsCover() {
    if (!selected) return;
    const nextIssue = { ...issue, coverImageUrl: selected.url, updatedAt: new Date().toISOString() };
    persistIssue(nextIssue);
    setStatus(`${selected.name} set as issue cover`);
  }

  return (
    <main className="media-shell">
      <input ref={inputRef} hidden type="file" multiple accept="image/*" onChange={handleUpload} />
      <header className="media-header"><div><Link href={`/?issue=${issue.id}`} className="layout-back"><ArrowLeft size={16}/> Studio</Link><span className="eyebrow">Publication assets</span><h1>Media Library</h1><p>Manage and reuse photography, illustrations and cover imagery for <strong>{issue.title}</strong>.</p></div><button className="dashboard-create" onClick={() => inputRef.current?.click()}><UploadCloud size={17} /> Upload images</button></header>
      <section className="media-toolbar"><div className="dashboard-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search media" /></div><span>{assets.length} assets · {status}</span></section>
      <section className="media-workspace">
        <div className="media-grid">{filtered.map((asset) => <button key={asset.id} onClick={() => setSelectedId(asset.id)} className={`media-tile ${asset.id === selectedId ? "active" : ""}`}><div className="media-thumb">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={asset.url} alt={asset.alt} style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }} /></div><div><strong>{asset.name}</strong><span>{asset.type.replace("image/", "").toUpperCase()}</span></div></button>)}{!filtered.length ? <button className="media-empty" onClick={() => inputRef.current?.click()}><ImagePlus size={27} /><strong>Add publication imagery</strong><span>JPEG, PNG, WEBP and browser-supported formats</span></button> : null}</div>
        <aside className="media-inspector">{selected ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<div className="selected-media-preview"><img src={selected.url} alt={selected.alt} style={{ objectPosition: `${selected.focalX}% ${selected.focalY}%` }} /></div><label>Target article</label><select className="media-select" value={articleId} onChange={(event)=>setArticleId(event.target.value)}>{issue.articles.map((article)=><option key={article.id} value={article.id}>{article.title}</option>)}</select><div className="media-placement-actions"><button onClick={placeInArticle}><Check size={14}/> Place in article</button><button onClick={useAsCover}>Use as cover</button></div><label>Alt text</label><textarea rows={3} value={selected.alt} onChange={(event) => updateSelected({ alt: event.target.value })} /><label>Horizontal focal point <span>{selected.focalX}%</span></label><input type="range" min="0" max="100" value={selected.focalX} onChange={(event) => updateSelected({ focalX: Number(event.target.value) })} /><label>Vertical focal point <span>{selected.focalY}%</span></label><input type="range" min="0" max="100" value={selected.focalY} onChange={(event) => updateSelected({ focalY: Number(event.target.value) })} /><p className="media-note">Focal points keep subjects framed consistently when an asset is reused across different crops.</p><button className="media-delete" onClick={removeSelected}><Trash2 size={15} /> Remove asset</button></> : <div className="media-inspector-empty"><ImagePlus size={26} /><strong>Select an image</strong><span>Adjust crop metadata, then place it into the current publication.</span></div>}</aside>
      </section>
    </main>
  );
}
