"use client";

import { ImagePlus, Search, UploadCloud, X } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { MediaAsset } from "@/lib/editor-model";

type SharedAsset = MediaAsset & { focalX: number; focalY: number };

type ArticleMediaPickerProps = {
  issueId: string;
  onSelect: (asset: SharedAsset) => void;
  onClose: () => void;
};

export default function ArticleMediaPicker({ issueId, onSelect, onClose }: ArticleMediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<SharedAsset[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Loading media…");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const response = await fetch(`/api/media?issue=${encodeURIComponent(issueId)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Media request failed (${response.status})`);
        const data = await response.json() as { assets: SharedAsset[] };
        if (alive) {
          setAssets(data.assets);
          setStatus(`${data.assets.length} asset${data.assets.length === 1 ? "" : "s"}`);
        }
      } catch (error) {
        if (alive) setStatus(error instanceof Error ? error.message : "Unable to load media");
      }
    }
    void load();
    return () => { alive = false; };
  }, [issueId]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return assets;
    return assets.filter((asset) => `${asset.name} ${asset.alt}`.toLowerCase().includes(normalized));
  }, [assets, query]);

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setStatus(`Uploading ${file.name}…`);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("issueId", issueId);
      form.append("alt", file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
      const response = await fetch("/api/media/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? `Upload failed (${response.status})`);
      const asset = data.asset as SharedAsset;
      setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setStatus("Uploaded — choose it below");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="article-media-picker">
      <input ref={inputRef} hidden type="file" accept="image/*" onChange={handleUpload}/>
      <div className="article-media-picker-head">
        <div><strong>Choose image</strong><span>{status}</span></div>
        <button onClick={onClose} aria-label="Close media picker"><X size={15}/></button>
      </div>
      <div className="article-media-picker-tools">
        <label><Search size={13}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search publication media"/></label>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}><UploadCloud size={13}/>{uploading ? "Uploading…" : "Upload"}</button>
      </div>
      <div className="article-media-picker-grid">
        {filtered.map((asset) => (
          <button key={asset.id} className="article-media-option" onClick={() => onSelect(asset)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt={asset.alt} style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }}/>
            <span>{asset.name}</span>
          </button>
        ))}
        {!filtered.length ? <button className="article-media-empty" onClick={() => inputRef.current?.click()}><ImagePlus size={22}/><strong>Add an image</strong><span>Upload directly without leaving the article.</span></button> : null}
      </div>
    </div>
  );
}
