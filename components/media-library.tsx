"use client";

import { ImagePlus, Search, Trash2, UploadCloud } from "lucide-react";
import { ChangeEvent, useMemo, useRef, useState } from "react";

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

function loadAssets(): Asset[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
}

export default function MediaLibrary() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>(loadAssets);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const filtered = useMemo(() => assets.filter((asset) => asset.name.toLowerCase().includes(query.toLowerCase())), [assets, query]);

  function persist(next: Asset[]) {
    setAssets(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage quota can be exceeded by large images */ }
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const asset: Asset = {
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          url: String(reader.result),
          type: file.type,
          alt: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          focalX: 50,
          focalY: 50,
        };
        setAssets((current) => {
          const next = [asset, ...current];
          try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
        setSelectedId(asset.id);
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

  return (
    <main className="media-shell">
      <input ref={inputRef} hidden type="file" multiple accept="image/*" onChange={handleUpload} />
      <header className="media-header">
        <div><span className="eyebrow">Publication assets</span><h1>Media Library</h1><p>Manage photography, illustrations and cover imagery for Lexozine issues.</p></div>
        <button className="dashboard-create" onClick={() => inputRef.current?.click()}><UploadCloud size={17} /> Upload images</button>
      </header>
      <section className="media-toolbar">
        <div className="dashboard-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search media" /></div>
        <span>{assets.length} assets</span>
      </section>
      <section className="media-workspace">
        <div className="media-grid">
          {filtered.map((asset) => (
            <button key={asset.id} onClick={() => setSelectedId(asset.id)} className={`media-tile ${asset.id === selectedId ? "active" : ""}`}>
              <div className="media-thumb"><img src={asset.url} alt={asset.alt} style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }} /></div>
              <div><strong>{asset.name}</strong><span>{asset.type.replace("image/", "").toUpperCase()}</span></div>
            </button>
          ))}
          {!filtered.length && <button className="media-empty" onClick={() => inputRef.current?.click()}><ImagePlus size={27} /><strong>Add publication imagery</strong><span>JPEG, PNG, WEBP and other browser-supported image formats</span></button>}
        </div>
        <aside className="media-inspector">
          {selected ? <>
            <div className="selected-media-preview"><img src={selected.url} alt={selected.alt} style={{ objectPosition: `${selected.focalX}% ${selected.focalY}%` }} /></div>
            <label>Alt text</label><textarea rows={3} value={selected.alt} onChange={(event) => updateSelected({ alt: event.target.value })} />
            <label>Horizontal focal point <span>{selected.focalX}%</span></label><input type="range" min="0" max="100" value={selected.focalX} onChange={(event) => updateSelected({ focalX: Number(event.target.value) })} />
            <label>Vertical focal point <span>{selected.focalY}%</span></label><input type="range" min="0" max="100" value={selected.focalY} onChange={(event) => updateSelected({ focalY: Number(event.target.value) })} />
            <p className="media-note">Focal points keep the subject framed consistently when the same asset is used across different magazine crops.</p>
            <button className="media-delete" onClick={removeSelected}><Trash2 size={15} /> Remove asset</button>
          </> : <div className="media-inspector-empty"><ImagePlus size={26} /><strong>Select an image</strong><span>Adjust its crop focal point and accessibility description.</span></div>}
        </aside>
      </section>
    </main>
  );
}
