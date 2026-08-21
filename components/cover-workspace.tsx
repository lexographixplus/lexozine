"use client";

import Link from "next/link";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Check,
  FileImage,
  FileText,
  Image as ImageIcon,
  Palette,
  Plus,
  Save,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type { CoverAsset, CoverAssetKind, CoverDesign, CoverTextAlign, Issue, IssuePalette } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";
import { issueStore } from "@/lib/issue-store";
import {
  coverTemplates,
  pageDimensionsMm,
  resolveCoverAspectRatio,
  resolveCoverDesign,
  resolveIssuePalette,
  resolveProductionSettings,
} from "@/lib/magazine-design";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hex(value: number) {
  return value.toString(16).padStart(2, "0");
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${hex(red)}${hex(green)}${hex(blue)}`;
}

function luminance(color: string) {
  const value = color.replace("#", "");
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

async function extractCoverPalette(url: string): Promise<IssuePalette> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Unable to read cover image"));
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 72;
  canvas.height = 72;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Colour analysis is unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const counts = new Map<string, number>();

  for (let index = 0; index < pixels.length; index += 16) {
    if (pixels[index + 3] < 180) continue;
    const red = Math.min(255, Math.round(pixels[index] / 32) * 32);
    const green = Math.min(255, Math.round(pixels[index + 1] / 32) * 32);
    const blue = Math.min(255, Math.round(pixels[index + 2] / 32) * 32);
    const key = rgbToHex(red, green, blue);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color).slice(0, 16);
  if (!ranked.length) throw new Error("No cover colours could be detected");
  const darkest = [...ranked].sort((a, b) => luminance(a) - luminance(b))[0];
  const brightest = [...ranked].sort((a, b) => luminance(b) - luminance(a))[0];
  const primary = ranked.find((color) => luminance(color) > 35 && luminance(color) < 225) ?? ranked[0];
  const secondary = ranked.find((color) => color !== primary && Math.abs(luminance(color) - luminance(primary)) > 18) ?? darkest;
  const muted = ranked.find((color) => color !== primary && color !== secondary) ?? secondary;

  return { source: "cover", primary, secondary, background: brightest, ink: darkest, muted };
}

export default function CoverWorkspace() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [assetKind, setAssetKind] = useState<CoverAssetKind>("front");
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("Loading cover workspace…");
  const [dirty, setDirty] = useState(false);

  const cover = useMemo(() => resolveCoverDesign(issue), [issue]);
  const palette = useMemo(() => resolveIssuePalette(issue), [issue]);
  const production = useMemo(() => resolveProductionSettings(issue), [issue]);
  const activeAsset = useMemo(() => cover.assets.find((asset) => asset.id === cover.activeAssetId), [cover]);
  const previewKind = activeAsset?.kind ?? assetKind;
  const aspectRatio = resolveCoverAspectRatio(issue, previewKind);
  const dimensions = pageDimensionsMm[production.pageSize] ?? { width: 210, height: 297 };
  const pageWidth = production.orientation === "landscape" ? dimensions.height : dimensions.width;
  const pageHeight = production.orientation === "landscape" ? dimensions.width : dimensions.height;
  const bleedX = clamp((production.bleed / pageWidth) * 100, 0, 8);
  const bleedY = clamp((production.bleed / pageHeight) * 100, 0, 8);
  const safeX = clamp((production.safeMargin / pageWidth) * 100, 1, 18);
  const safeY = clamp((production.safeMargin / pageHeight) * 100, 1, 18);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const requestedId = new URLSearchParams(window.location.search).get("issue");
        const issues = await issueStore?.list() ?? [];
        const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
        if (!alive) return;
        if (found) {
          setIssue(found);
          const foundCover = resolveCoverDesign(found);
          const selected = foundCover.assets.find((asset) => asset.id === foundCover.activeAssetId);
          if (selected) setAssetKind(selected.kind);
          setStatus("Cover loaded from shared issue");
        } else {
          setStatus("No shared issue found — showing a local starter issue");
        }
      } catch (error) {
        if (alive) setStatus(error instanceof Error ? error.message : "Unable to load cover workspace");
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  function patchCover(patch: Partial<CoverDesign>) {
    setIssue((current) => {
      const currentCover = resolveCoverDesign(current);
      const nextCover = { ...currentCover, ...patch };
      return {
        ...current,
        cover: nextCover,
        coverLines: nextCover.lines,
        updatedAt: new Date().toISOString(),
      };
    });
    setDirty(true);
    setStatus("Unsaved cover changes");
  }

  function patchLine(index: number, value: string) {
    const lines = cover.lines.map((line, lineIndex) => lineIndex === index ? value : line);
    patchCover({ lines });
  }

  function addLine() {
    patchCover({ lines: [...cover.lines, "New cover line"] });
  }

  async function saveIssue(nextIssue = issue, message = "Cover saved to shared issue") {
    const currentCover = resolveCoverDesign(nextIssue);
    const currentAsset = currentCover.assets.find((asset) => asset.id === currentCover.activeAssetId);
    const normalized: Issue = {
      ...nextIssue,
      cover: currentCover,
      coverLines: currentCover.lines,
      coverImageUrl: currentAsset?.url ?? currentCover.heroImageUrl,
      coverImagePublicId: currentAsset?.publicId ?? currentCover.heroImagePublicId,
      updatedAt: new Date().toISOString(),
    };
    try {
      const saved = await issueStore?.save(normalized) ?? normalized;
      setIssue(saved);
      setDirty(false);
      setStatus(message);
      return saved;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save cover");
      throw error;
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setStatus(`Uploading ${file.name}…`);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("issueId", issue.id);
      form.append("kind", assetKind);
      const response = await fetch("/api/cover/upload", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? `Cover upload failed (${response.status})`);
      const asset = data.asset as CoverAsset;
      const currentCover = resolveCoverDesign(issue);
      const nextCover: CoverDesign = {
        ...currentCover,
        mode: "imported",
        heroImageUrl: asset.url,
        heroImagePublicId: asset.publicId,
        heroFit: "contain",
        heroFocalX: 50,
        heroFocalY: 50,
        assets: [asset, ...currentCover.assets.filter((item) => item.id !== asset.id)],
        activeAssetId: asset.id,
      };
      const nextIssue: Issue = {
        ...issue,
        cover: nextCover,
        coverImageUrl: asset.url,
        coverImagePublicId: asset.publicId,
        updatedAt: new Date().toISOString(),
      };
      setIssue(nextIssue);
      setAssetKind(asset.kind);
      await saveIssue(nextIssue, `${asset.name} imported as the active ${asset.kind === "wrap" ? "full wrap" : "front cover"}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Cover upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function activateAsset(asset: CoverAsset) {
    const nextCover: CoverDesign = {
      ...cover,
      mode: "imported",
      activeAssetId: asset.id,
      heroImageUrl: asset.url,
      heroImagePublicId: asset.publicId,
      heroFit: "contain",
      heroFocalX: 50,
      heroFocalY: 50,
    };
    const nextIssue = { ...issue, cover: nextCover, coverImageUrl: asset.url, coverImagePublicId: asset.publicId, updatedAt: new Date().toISOString() };
    setIssue(nextIssue);
    setAssetKind(asset.kind);
    await saveIssue(nextIssue, `${asset.name} restored as active cover`);
  }

  async function createPaletteFromCover() {
    const imageUrl = activeAsset?.url ?? cover.heroImageUrl;
    if (!imageUrl) {
      setStatus("Add a cover image before creating a palette");
      return;
    }
    setStatus("Analysing cover colours…");
    try {
      const nextPalette = await extractCoverPalette(imageUrl);
      const nextIssue = { ...issue, palette: nextPalette, updatedAt: new Date().toISOString() };
      setIssue(nextIssue);
      await saveIssue(nextIssue, "Issue palette created from the active cover");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create palette from cover");
    }
  }

  const imageUrl = activeAsset?.url ?? cover.heroImageUrl;
  const imported = cover.mode === "imported";
  const templateClass = `template-${cover.templateId.replace("cover-", "")}`;
  const overlayStyle = cover.overlay.type === "none"
    ? { opacity: 0 }
    : cover.overlay.type === "solid"
      ? { background: cover.overlay.color, opacity: cover.overlay.opacity }
      : { background: `linear-gradient(180deg, transparent 10%, ${cover.overlay.color} 100%)`, opacity: cover.overlay.opacity };

  return (
    <main className="cover-studio-shell">
      <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.pdf" onChange={handleUpload} />
      <header className="cover-studio-header">
        <div className="cover-header-copy">
          <Link href={`/?issue=${issue.id}`} className="cover-back"><ArrowLeft size={16}/> Studio</Link>
          <div><span className="cover-eyebrow">Lexozine cover system · Release 0.4</span><h1>Cover Studio</h1><p>{issue.title} · Issue {issue.number}</p></div>
        </div>
        <div className="cover-header-actions"><span className={dirty ? "cover-status dirty" : "cover-status"}>{status}</span><button className="cover-save" onClick={() => void saveIssue()} disabled={!dirty}><Save size={16}/> Save cover</button></div>
      </header>

      <section className="cover-studio-workspace">
        <aside className="cover-source-panel">
          <div className="cover-mode-switch">
            <button className={imported ? "active" : ""} onClick={() => patchCover({ mode: "imported" })}><UploadCloud size={16}/> Import</button>
            <button className={!imported ? "active" : ""} onClick={() => patchCover({ mode: "generated" })}><Sparkles size={16}/> Design</button>
          </div>

          {imported ? <>
            <div className="cover-panel-section">
              <span className="cover-panel-label">Cover format</span>
              <div className="cover-kind-switch"><button className={assetKind === "front" ? "active" : ""} onClick={() => setAssetKind("front")}><FileImage size={15}/> Front cover</button><button className={assetKind === "wrap" ? "active" : ""} onClick={() => setAssetKind("wrap")}><FileText size={15}/> Full wrap</button></div>
              <button className="cover-upload" disabled={uploading} onClick={() => inputRef.current?.click()}><UploadCloud size={17}/>{uploading ? "Uploading…" : cover.assets.length ? "Import new version" : "Import cover"}</button>
              <small>JPG, PNG, WEBP or PDF · original asset retained</small>
            </div>
            <div className="cover-panel-section cover-versions">
              <span className="cover-panel-label">Cover versions</span>
              {cover.assets.length ? cover.assets.map((asset) => <button key={asset.id} className={asset.id === cover.activeAssetId ? "cover-version active" : "cover-version"} onClick={() => void activateAsset(asset)}><span className="cover-version-thumb">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={asset.url} alt="" /></span><span><strong>{asset.name}</strong><small>{asset.kind === "wrap" ? "Full wrap" : "Front cover"} · {asset.mimeType === "application/pdf" ? "PDF" : "Image"}</small></span>{asset.id === cover.activeAssetId ? <Check size={15}/> : null}</button>) : <div className="cover-empty-versions"><ImageIcon size={23}/><strong>No imported covers</strong><span>Import an externally designed cover to start version history.</span></div>}
            </div>
          </> : <>
            <div className="cover-panel-section">
              <span className="cover-panel-label">Cover template</span>
              <div className="cover-template-list">{coverTemplates.map((template) => <button key={template.id} className={cover.templateId === template.id ? "active" : ""} onClick={() => patchCover({ templateId: template.id })}><strong>{template.name}</strong><span>{template.description}</span></button>)}</div>
            </div>
          </>}

          <div className="cover-panel-section">
            <span className="cover-panel-label">Issue palette</span>
            <div className="cover-swatches"><span style={{ background: palette.primary }}/><span style={{ background: palette.secondary }}/><span style={{ background: palette.background }}/><span style={{ background: palette.ink }}/><span style={{ background: palette.muted }}/></div>
            <button className="cover-palette-action" onClick={() => void createPaletteFromCover()}><Palette size={15}/> Build palette from cover</button>
            <small>Palette source: {palette.source}</small>
          </div>
        </aside>

        <section className="cover-stage">
          <div className="cover-stage-toolbar"><div><strong>{previewKind === "wrap" ? "Full-wrap preview" : "Front-cover preview"}</strong><span>{production.pageSize} · {production.orientation} · bleed {production.bleed} mm · safe {production.safeMargin} mm</span></div><div className="cover-guide-key"><span><i className="trim-key"/>Trim</span><span><i className="safe-key"/>Safe area</span></div></div>
          <div className="cover-preview-scroll">
            <article className={`cover-preview ${templateClass} ${previewKind === "wrap" ? "is-wrap" : ""}`} style={{ aspectRatio }}>
              {imageUrl ? <div className="cover-preview-image">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={imageUrl} alt="Active cover" style={{ objectFit: cover.heroFit, objectPosition: `${cover.heroFocalX}% ${cover.heroFocalY}%` }}/></div> : <div className="cover-preview-fallback" style={{ background: `linear-gradient(135deg, ${palette.secondary}, ${palette.primary} 55%, ${palette.background})` }}/>} 
              {!imported ? <><div className="cover-preview-overlay" style={overlayStyle}/><div className={`cover-generated-copy align-${cover.textAlign}`}><div className="generated-meta"><span>ISSUE {issue.number}</span><span>{issue.editionDate}</span></div><div className="generated-masthead">{cover.masthead}</div><div className="generated-feature"><span>{issue.title}</span><h2>{cover.mainHeadline}</h2><p>{cover.deck}</p></div><div className="generated-lines">{cover.lines.map((line) => <span key={line}>{line}</span>)}</div></div></> : null}
              <div className="cover-trim-guide" style={{ inset: `${bleedY}% ${bleedX}%` }}/>
              <div className="cover-safe-guide" style={{ inset: `${bleedY + safeY}% ${bleedX + safeX}%` }}/>
              {previewKind === "wrap" ? <><div className="cover-wrap-center"/><div className="cover-wrap-label back">BACK</div><div className="cover-wrap-label front">FRONT</div></> : null}
            </article>
          </div>
          {previewKind === "wrap" ? <p className="cover-wrap-note">Wrap preview shows back/front panel balance. Exact spine width should be resolved at final print export once page count and stock are confirmed.</p> : null}
        </section>

        <aside className="cover-inspector">
          {imported ? <>
            <div className="cover-inspector-head"><span>Imported cover</span><strong>{activeAsset?.name ?? "No active asset"}</strong></div>
            <label>Image fit<select value={cover.heroFit} onChange={(event) => patchCover({ heroFit: event.target.value as CoverDesign["heroFit"] })}><option value="contain">Fit whole design</option><option value="cover">Fill and crop</option></select></label>
            <label>Horizontal position <span>{cover.heroFocalX}%</span><input type="range" min="0" max="100" value={cover.heroFocalX} onChange={(event) => patchCover({ heroFocalX: Number(event.target.value) })}/></label>
            <label>Vertical position <span>{cover.heroFocalY}%</span><input type="range" min="0" max="100" value={cover.heroFocalY} onChange={(event) => patchCover({ heroFocalY: Number(event.target.value) })}/></label>
            {activeAsset?.sourceUrl && activeAsset.sourceUrl !== activeAsset.url ? <a className="cover-original-link" href={activeAsset.sourceUrl} target="_blank" rel="noreferrer">Open original PDF</a> : null}
            <div className="cover-inspector-note"><strong>Imported mode keeps the artwork intact.</strong><span>Lexozine does not place mastheads or cover lines over an externally designed cover. Guides are preview-only.</span></div>
          </> : <>
            <div className="cover-inspector-head"><span>Cover editor</span><strong>Magazine-specific controls</strong></div>
            <label>Masthead<input value={cover.masthead} onChange={(event) => patchCover({ masthead: event.target.value })}/></label>
            <label>Main headline<textarea rows={3} value={cover.mainHeadline} onChange={(event) => patchCover({ mainHeadline: event.target.value })}/></label>
            <label>Deck<textarea rows={3} value={cover.deck} onChange={(event) => patchCover({ deck: event.target.value })}/></label>
            <div className="cover-align-control"><span>Text alignment</span><div><button className={cover.textAlign === "left" ? "active" : ""} onClick={() => patchCover({ textAlign: "left" as CoverTextAlign })}><AlignLeft size={16}/></button><button className={cover.textAlign === "center" ? "active" : ""} onClick={() => patchCover({ textAlign: "center" as CoverTextAlign })}><AlignCenter size={16}/></button><button className={cover.textAlign === "right" ? "active" : ""} onClick={() => patchCover({ textAlign: "right" as CoverTextAlign })}><AlignRight size={16}/></button></div></div>
            <div className="cover-lines-editor"><span>Cover lines</span>{cover.lines.map((line, index) => <input key={`${index}-${cover.lines.length}`} value={line} onChange={(event) => patchLine(index, event.target.value)}/>)}<button onClick={addLine}><Plus size={14}/> Add cover line</button></div>
            <label>Overlay<select value={cover.overlay.type} onChange={(event) => patchCover({ overlay: { ...cover.overlay, type: event.target.value as CoverDesign["overlay"]["type"] } })}><option value="gradient">Gradient</option><option value="solid">Solid</option><option value="none">None</option></select></label>
            {cover.overlay.type !== "none" ? <><label>Overlay colour<input type="color" value={cover.overlay.color} onChange={(event) => patchCover({ overlay: { ...cover.overlay, color: event.target.value } })}/></label><label>Overlay strength <span>{Math.round(cover.overlay.opacity * 100)}%</span><input type="range" min="0" max="100" value={Math.round(cover.overlay.opacity * 100)} onChange={(event) => patchCover({ overlay: { ...cover.overlay, opacity: Number(event.target.value) / 100 } })}/></label></> : null}
            {imageUrl ? <><label>Hero image fit<select value={cover.heroFit} onChange={(event) => patchCover({ heroFit: event.target.value as CoverDesign["heroFit"] })}><option value="cover">Fill frame</option><option value="contain">Fit image</option></select></label><label>Hero horizontal focus <span>{cover.heroFocalX}%</span><input type="range" min="0" max="100" value={cover.heroFocalX} onChange={(event) => patchCover({ heroFocalX: Number(event.target.value) })}/></label><label>Hero vertical focus <span>{cover.heroFocalY}%</span><input type="range" min="0" max="100" value={cover.heroFocalY} onChange={(event) => patchCover({ heroFocalY: Number(event.target.value) })}/></label></> : <div className="cover-inspector-note"><strong>No hero image selected.</strong><span>Import an image cover version first, then switch to Design mode to use it as the cover background.</span></div>}
          </>}
        </aside>
      </section>
    </main>
  );
}
