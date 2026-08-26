"use client";

import { Check, ImagePlus, Search, Trash2, UploadCloud } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import StudioEditorShell from "@/components/studio-editor-shell";
import type { Issue, MediaAsset, StoryBlock } from "@/lib/editor-model";
import { createId, defaultFrameFor, defaultImagePlacement } from "@/lib/editor-model";
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
  const selectedArticle = issue.articles.find((article) => article.id === articleId);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? assets.filter((asset) => `${asset.name} ${asset.alt}`.toLowerCase().includes(term)) : assets;
  }, [assets, query]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const params = new URLSearchParams(window.location.search);
        const requestedId = params.get("issue");
        const requestedArticle = params.get("article");
        const issues = await issueStore?.list() ?? [];
        const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
        if (found && alive) {
          setIssue(found);
          setArticleId(requestedArticle && found.articles.some((article) => article.id === requestedArticle)
            ? requestedArticle
            : found.articles[0]?.id ?? "");
        }
        const response = await fetch(`/api/media${found ? `?issue=${encodeURIComponent(found.id)}` : ""}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(response.status === 503 ? "Cloud media is not configured yet" : `Media request failed (${response.status})`);
        }
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

  function imageBlock(frame = false): StoryBlock | null {
    if (!selected || !selectedArticle) return null;
    const block: StoryBlock = {
      id: createId("block"),
      type: "image",
      content: "",
      order: selectedArticle.blocks.length,
      imageUrl: selected.url,
      imagePublicId: selected.publicId,
      placement: {
        ...defaultImagePlacement,
        alt: selected.alt,
        focalX: selected.focalX,
        focalY: selected.focalY,
      },
    };
    if (frame) block.frame = defaultFrameFor("image", block.order);
    return block;
  }

  async function placeInArticle() {
    const block = imageBlock();
    if (!block || !selectedArticle || !selected) return;
    const nextIssue: Issue = {
      ...issue,
      articles: issue.articles.map((article) => article.id === selectedArticle.id
        ? { ...article, blocks: [...article.blocks, block], updatedAt: new Date().toISOString() }
        : article),
      updatedAt: new Date().toISOString(),
    };
    await saveIssue(nextIssue);
    setStatus(`${selected.name} placed in ${selectedArticle.title}`);
  }

  async function placeOnCanvas() {
    const block = imageBlock(true);
    if (!block || !selectedArticle || !selected) return;
    const nextIssue: Issue = {
      ...issue,
      articles: issue.articles.map((article) => article.id === selectedArticle.id
        ? { ...article, blocks: [...article.blocks, block], updatedAt: new Date().toISOString() }
        : article),
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveIssue(nextIssue);
    setStatus(`${selected.name} added to canvas`);
    window.location.assign(
      `/canvas?issue=${encodeURIComponent(saved.id)}&article=${encodeURIComponent(selectedArticle.id)}&selected=${encodeURIComponent(block.id)}`,
    );
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

  const previewHref = `/preview?issue=${encodeURIComponent(issue.id)}`;
  const exportHref = `/export?issue=${encodeURIComponent(issue.id)}`;

  return (
    <>
      <input ref={inputRef} hidden type="file" multiple accept="image/*" onChange={handleUpload} />
      <StudioEditorShell
        issueId={issue.id}
        issueTitle={issue.title}
        documentLabel="Media"
        saveState={status}
        navigator={
          <div className="media-nav">
            <div className="media-panel-head"><ImagePlus size={16} /><strong>Publication media</strong></div>
            <button className="media-upload" type="button" disabled={uploading} onClick={() => inputRef.current?.click()}>
              <UploadCloud size={16} /> {uploading ? "Uploading…" : "Upload images"}
            </button>
            <p>Images are shared across the issue and keep their focal point and accessibility data wherever they are used.</p>
            <div className="media-nav-stats">
              <span><strong>{assets.length}</strong> Assets</span>
              <span><strong>{issue.articles.length}</strong> Stories</span>
            </div>
            <div className="media-target">
              <label htmlFor="media-target-article">Placement target</label>
              <select id="media-target-article" value={articleId} onChange={(event) => setArticleId(event.target.value)}>
                {issue.articles.map((article) => <option key={article.id} value={article.id}>{article.title}</option>)}
              </select>
            </div>
          </div>
        }
        toolbar={
          <>
            <label className="media-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search publication media" /></label>
            <span className="media-toolbar-count">{filtered.length} of {assets.length} asset{assets.length === 1 ? "" : "s"}</span>
          </>
        }
        inspector={selected ? (
          <div className="media-inspector">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="selected-media-preview"><img src={selected.url} alt={selected.alt} style={{ objectPosition: `${selected.focalX}% ${selected.focalY}%` }} /></div>
            <div className="media-inspector-head"><span>Selected asset</span><strong>{selected.name}</strong></div>
            <div className="media-placement-actions">
              <button type="button" onClick={() => void placeOnCanvas()}><Check size={14} /> Place on canvas</button>
              <button type="button" onClick={() => void placeInArticle()}>Place in article</button>
            </div>
            <button className="media-cover-action" type="button" onClick={() => void useAsCover()}>Use as cover</button>
            <label>Alt text<textarea rows={3} value={selected.alt} onChange={(event) => void updateSelected({ alt: event.target.value })} /></label>
            <label>Horizontal focal point <span>{selected.focalX}%</span></label>
            <input type="range" min="0" max="100" value={selected.focalX} onChange={(event) => void updateSelected({ focalX: Number(event.target.value) })} />
            <label>Vertical focal point <span>{selected.focalY}%</span></label>
            <input type="range" min="0" max="100" value={selected.focalY} onChange={(event) => void updateSelected({ focalY: Number(event.target.value) })} />
            <p className="media-note">Focal points and accessibility metadata are shared with the team and follow the asset across placements.</p>
            <button className="media-delete" type="button" onClick={removeSelected}><Trash2 size={15} /> Remove asset</button>
          </div>
        ) : (
          <div className="media-inspector-empty"><ImagePlus size={26} /><strong>Select an image</strong><span>Adjust metadata, then place the selected image in the article or directly on the canvas.</span></div>
        )}
        previewHref={previewHref}
        exportHref={exportHref}
        status={<><span>{selectedArticle ? `Target: ${selectedArticle.title}` : "No article selected"}</span><span>•</span><span>{assets.length} shared assets</span><span>•</span><span>Drag assets from Canvas to compose directly</span></>}
      >
        <div className="media-canvas">
          <div className="media-grid">
            {filtered.map((asset) => (
              <button key={asset.id} type="button" onClick={() => setSelectedId(asset.id)} className={`media-tile ${asset.id === selectedId ? "active" : ""}`}>
                <div className="media-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.alt} style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }} />
                </div>
                <div><strong>{asset.name}</strong><span>{asset.mimeType.replace("image/", "").toUpperCase()}</span></div>
              </button>
            ))}
            {!filtered.length ? (
              <button type="button" className="media-empty" onClick={() => inputRef.current?.click()}>
                <ImagePlus size={27} /><strong>Add publication imagery</strong><span>Images are stored in Cloudinary and indexed in Neon.</span>
              </button>
            ) : null}
          </div>
        </div>
      </StudioEditorShell>
    </>
  );
}
