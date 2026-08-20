"use client";

import { ArrowLeft, Check, ImagePlus, Search, Trash2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { Issue, MediaAsset, StoryBlock } from "@/lib/editor-model";
import { createId, defaultImagePlacement } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";
import { issueStore } from "@/lib/issue-store";

type SharedAsset = MediaAsset & { focalX: number; focalY: number };

export default function MediaLibrary() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<SharedAsset[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [articleId, setArticleId] = useState("");
  const [status, setStatus] = useState("Loading shared media…");
  const [uploading, setUploading] = useState(false);
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const filtered = useMemo(() => assets.filter((asset) => asset.name.toLowerCase().includes(query.toLowerCase())), [assets, query]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const requestedId = new URLSearchParams(window.location.search).get("issue");
        const issues = await issueStore?.list() ?? [];
        const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
        if (found && alive) {
          setIssue(found);
          setArticleId(found.articles[0]?.id ?? "");
        }
        const response = await fetch(`/api/media${found ? `?issue=${encodeURIComponent(found.id)}` : ""}`, { cache: "no-store" });
        if (!response.ok) throw new Error(response.status === 503 ? "Cloud media is not configured yet" : `Media request failed (${response.status})`);
        const data = await response.json() as { assets: SharedAsset[] };
        if (alive) {
          setAssets(data.assets);
          setStatus(`${data.assets.length} shared asset${data.assets.length === 1 ? "" : "s"}`);
        }
      } catch (error) {
        if (alive) setStatus(error instanceof Error ? error.message : "Unable to load shared media");
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    event.target.value = "";
    if (!files.length) return;
    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of files) {
        setStatus(`Uploading ${file.name}…`);
        const form = new FormData();
        form.append("file", file);
        form.append("issueId", issue.id);
        form.append("alt", file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
        const response = await fetch("/api/media/upload", { method: "POST", body: form });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error ?? `Upload failed (${response.status})`);
        const asset = data.asset as SharedAsset;
        setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
        setSelectedId(asset.id);
        uploaded += 1;
      }
      setStatus(`${uploaded} image${uploaded === 1 ? "" : "s"} uploaded to Cloudinary`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function updateSelected(patch: Partial<Pick<SharedAsset, "alt" | "focalX" | "focalY">>) {
    if (!selected) return;
    const optimistic = { ...selected, ...patch };
    setAssets((current) => current.map((asset) => asset.id === selected.id ? optimistic : asset));
    try {
      const response = await fetch("/api/media", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: selected.id, ...patch }),
      });
      if (!response.ok) throw new Error(`Metadata update failed (${response.status})`);
      const data = await response.json() as { asset: SharedAsset };
      setAssets((current) => current.map((asset) => asset.id === selected.id ? data.asset : asset));
      setStatus("Media metadata saved");
    } catch (error) {
      setAssets((current) => current.map((asset) => asset.id === selected.id ? selected : asset));
      setStatus(error instanceof Error ? error.message : "Metadata update failed");
    }
  }

  async function removeSelected() {
    if (!selected || !window.confirm(`Remove ${selected.name} from the shared media library?`)) return;
    try {
      const response = await fetch(`/api/media?id=${encodeURIComponent(selected.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Delete failed (${response.status})`);
      setAssets((current) => current.filter((asset) => asset.id !== selected.id));
      setSelectedId(null);
      setStatus(`${selected.name} removed from Cloudinary`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to remove asset");
    }
  }

  async function saveIssue(nextIssue: Issue) {
    const saved = await issueStore?.save(nextIssue) ?? nextIssue;
    setIssue(saved);
    return saved;
  }

  async function placeInArticle() {
    if (!selected || !articleId) return;
    const article = issue.articles.find((item) => item.id === articleId);
    if (!article) return;
    const block: StoryBlock = {
      id: createId("block"),
      type: "image",
      content: "",
      order: article.blocks.length,
      imageUrl: selected.url,
      imagePublicId: selected.publicId,
      placement: { ...defaultImagePlacement, alt: selected.alt, focalX: selected.focalX, focalY: selected.focalY },
    };
    const nextIssue: Issue = {
      ...issue,
      articles: issue.articles.map((item) => item.id === articleId ? { ...item, blocks: [...item.blocks, block], updatedAt: new Date().toISOString() } : item),
      updatedAt: new Date().toISOString(),
    };
    await saveIssue(nextIssue);
    setStatus(`${selected.name} placed in ${article.title}`);
  }

  async function useAsCover() {
    if (!selected) return;
    await saveIssue({
      ...issue,
      coverImageUrl: selected.url,
      coverImagePublicId: selected.publicId,
      updatedAt: new Date().toISOString(),
    });
    setStatus(`${selected.name} set as issue cover`);
  }

  return (
    <main className="media-shell">
      <input ref={inputRef} hidden type="file" multiple accept="image/*" onChange={handleUpload} />
      <header className="media-header"><div><Link href={`/?issue=${issue.id}`} className="layout-back"><ArrowLeft size={16}/> Studio</Link><span className="eyebrow">Cloudinary publication assets</span><h1>Media Library</h1><p>Shared photography, illustrations and cover imagery for <strong>{issue.title}</strong>, persisted across team sessions.</p></div><button className="dashboard-create" disabled={uploading} onClick={() => inputRef.current?.click()}><UploadCloud size={17} /> {uploading ? "Uploading…" : "Upload images"}</button></header>
      <section className="media-toolbar"><div className="dashboard-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search media" /></div><span>{assets.length} assets · {status}</span></section>
      <section className="media-workspace">
        <div className="media-grid">{filtered.map((asset) => <button key={asset.id} onClick={() => setSelectedId(asset.id)} className={`media-tile ${asset.id === selectedId ? "active" : ""}`}><div className="media-thumb">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={asset.url} alt={asset.alt} style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }} /></div><div><strong>{asset.name}</strong><span>{asset.mimeType.replace("image/", "").toUpperCase()}</span></div></button>)}{!filtered.length ? <button className="media-empty" onClick={() => inputRef.current?.click()}><ImagePlus size={27} /><strong>Add publication imagery</strong><span>Images are stored in Cloudinary and indexed in Neon</span></button> : null}</div>
        <aside className="media-inspector">{selected ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<div className="selected-media-preview"><img src={selected.url} alt={selected.alt} style={{ objectPosition: `${selected.focalX}% ${selected.focalY}%` }} /></div><label>Target article</label><select className="media-select" value={articleId} onChange={(event)=>setArticleId(event.target.value)}>{issue.articles.map((article)=><option key={article.id} value={article.id}>{article.title}</option>)}</select><div className="media-placement-actions"><button onClick={placeInArticle}><Check size={14}/> Place in article</button><button onClick={useAsCover}>Use as cover</button></div><label>Alt text</label><textarea rows={3} value={selected.alt} onChange={(event) => void updateSelected({ alt: event.target.value })} /><label>Horizontal focal point <span>{selected.focalX}%</span></label><input type="range" min="0" max="100" value={selected.focalX} onChange={(event) => void updateSelected({ focalX: Number(event.target.value) })} /><label>Vertical focal point <span>{selected.focalY}%</span></label><input type="range" min="0" max="100" value={selected.focalY} onChange={(event) => void updateSelected({ focalY: Number(event.target.value) })} /><p className="media-note">Focal points and accessibility metadata are shared with the team and follow the asset across placements.</p><button className="media-delete" onClick={removeSelected}><Trash2 size={15} /> Remove asset</button></> : <div className="media-inspector-empty"><ImagePlus size={26} /><strong>Select an image</strong><span>Adjust shared metadata, then place it into the current publication.</span></div>}</aside>
      </section>
    </main>
  );
}
