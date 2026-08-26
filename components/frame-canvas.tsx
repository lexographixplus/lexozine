"use client";

import Link from "next/link";
import {
  BringToFront,
  Copy,
  Grid3X3,
  Image as ImageIcon,
  Layers3,
  Lock,
  LockOpen,
  Plus,
  RotateCw,
  SendToBack,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { DragEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import RichTextEditor from "@/components/rich-text-editor";
import StudioEditorShell from "@/components/studio-editor-shell";
import type { FrameGeometry, Issue, MediaAsset, StoryBlock } from "@/lib/editor-model";
import { createId, defaultFrameFor, defaultImagePlacement, themeTokens } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";
import { issueStore } from "@/lib/issue-store";

type Gesture = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  origin: FrameGeometry;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normaliseFrame(frame: FrameGeometry, patch: Partial<FrameGeometry>): FrameGeometry {
  const next = { ...frame, ...patch };
  const width = clamp(next.width, 5, 100);
  const height = clamp(next.height, 4, 100);
  return {
    ...next,
    width,
    height,
    x: clamp(next.x, 0, 100 - width),
    y: clamp(next.y, 0, 100 - height),
  };
}

export default function FrameCanvas() {
  const pageRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const issueRef = useRef(issue);
  const [articleId, setArticleId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [zoom, setZoom] = useState(72);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [saveState, setSaveState] = useState("Loading issue…");
  const [mediaAssets, setMediaAssets] = useState<Array<MediaAsset & { focalX: number; focalY: number }>>([]);
  const [mediaState, setMediaState] = useState("Loading media…");
  const [dropActive, setDropActive] = useState(false);

  const article = useMemo(
    () => issue.articles.find((item) => item.id === articleId) ?? issue.articles[0],
    [issue.articles, articleId],
  );
  const selected = useMemo(
    () => article?.blocks.find((block) => block.id === selectedId),
    [article, selectedId],
  );
  const theme = themeTokens[article?.theme ?? issue.theme];
  const blocks = useMemo(
    () => [...(article?.blocks ?? [])].sort((a, b) => (a.frame?.zIndex ?? a.order) - (b.frame?.zIndex ?? b.order)),
    [article],
  );
  const production = issue.production;
  const ratio = production?.pageSize === "Square 210"
    ? 1
    : production?.pageSize === "US Letter"
      ? 8.5 / 11
      : 210 / 297;
  const landscape = production?.orientation === "landscape";

  useEffect(() => {
    issueRef.current = issue;
  }, [issue]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const params = new URLSearchParams(location.search);
      const requestedId = params.get("issue");
      const requestedArticle = params.get("article");
      const requestedSelected = params.get("selected");
      const issues = await issueStore?.list() ?? [];
      const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
      if (!found || !alive) return;
      issueRef.current = found;
      setIssue(found);
      const first = requestedArticle && found.articles.some((item) => item.id === requestedArticle)
        ? requestedArticle
        : found.articles[0]?.id ?? "";
      setArticleId(first);
      const target = found.articles.find((item) => item.id === first);
      setSelectedId(
        requestedSelected && target?.blocks.some((block) => block.id === requestedSelected)
          ? requestedSelected
          : target?.blocks[0]?.id ?? "",
      );
      setSaveState("Saved");
    }
    void load();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    async function loadMedia() {
      try {
        const response = await fetch(`/api/media?issue=${encodeURIComponent(issue.id)}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Media request failed (${response.status})`);
        const data = await response.json() as { assets: Array<MediaAsset & { focalX: number; focalY: number }> };
        if (!alive) return;
        setMediaAssets(data.assets);
        setMediaState(data.assets.length ? `${data.assets.length} asset${data.assets.length === 1 ? "" : "s"}` : "No assets yet");
      } catch {
        if (alive) setMediaState("Media unavailable");
      }
    }
    void loadMedia();
    return () => { alive = false; };
  }, [issue.id]);

  useEffect(() => {
    function onMove(event: globalThis.PointerEvent) {
      const gesture = gestureRef.current;
      const rect = pageRef.current?.getBoundingClientRect();
      if (!gesture || !rect) return;

      const dx = ((event.clientX - gesture.startX) / rect.width) * 100;
      const dy = ((event.clientY - gesture.startY) / rect.height) * 100;
      const snap = (value: number) => snapToGrid ? Math.round(value) : value;

      if (gesture.mode === "move") {
        patchFrame(gesture.id, {
          x: snap(gesture.origin.x + dx),
          y: snap(gesture.origin.y + dy),
        }, false);
      } else {
        patchFrame(gesture.id, {
          width: snap(gesture.origin.width + dx),
          height: snap(gesture.origin.height + dy),
        }, false);
      }
    }

    function onUp() {
      if (gestureRef.current) {
        gestureRef.current = null;
        queueSave();
      }
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input,textarea,select,[contenteditable=true]")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void saveNow();
        return;
      }
      if (!selected || !article) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelected();
        return;
      }

      const step = event.shiftKey ? 2 : 0.5;
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const frame = frameFor(selected);
        if (frame.locked) return;
        patchFrame(selected.id, {
          x: frame.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0),
          y: frame.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0),
        });
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, article, issue]);

  function frameFor(block: StoryBlock) {
    return block.frame ?? defaultFrameFor(block.type, block.order);
  }

  function mutateArticle(mutator: (blocks: StoryBlock[]) => StoryBlock[], autosave = true) {
    if (!article) return;
    const now = new Date().toISOString();
    setIssue((current) => {
      const next = {
        ...current,
        updatedAt: now,
        articles: current.articles.map((item) => (
          item.id === article.id
            ? { ...item, blocks: mutator(item.blocks), updatedAt: now }
            : item
        )),
      };
      issueRef.current = next;
      return next;
    });
    if (autosave) queueSave();
  }

  function patchFrame(blockId: string, patch: Partial<FrameGeometry>, autosave = true) {
    mutateArticle((current) => current.map((block) => (
      block.id === blockId
        ? { ...block, frame: normaliseFrame(frameFor(block), patch) }
        : block
    )), autosave);
  }

  function patchContent(content: string) {
    if (!selected) return;
    mutateArticle((current) => current.map((block) => (
      block.id === selected.id ? { ...block, content } : block
    )));
  }

  function queueSave() {
    setSaveState("Saving…");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => void saveNow(), 650);
  }

  async function saveNow() {
    const snapshot = issueRef.current;
    setSaveState("Saving…");
    try {
      const saved = await issueStore?.save(snapshot) ?? snapshot;
      issueRef.current = saved;
      setIssue(saved);
      setSaveState("Saved");
    } catch {
      setSaveState("Saved to recovery cache");
    }
  }

  function startGesture(event: PointerEvent<HTMLElement>, block: StoryBlock, mode: Gesture["mode"]) {
    const frame = frameFor(block);
    if (frame.locked) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedId(block.id);
    gestureRef.current = {
      id: block.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      origin: frame,
    };
  }

  function addText(type: "headline" | "body" | "pullquote") {
    if (!article) return;
    const block: StoryBlock = {
      id: createId(),
      type,
      content: type === "headline"
        ? "New headline"
        : type === "pullquote"
          ? "A strong pull quote creates rhythm."
          : "Add editorial copy here.",
      order: article.blocks.length,
      frame: defaultFrameFor(type, article.blocks.length),
    };
    mutateArticle((current) => [...current, block]);
    setSelectedId(block.id);
  }

  function addMediaAsset(
    asset: MediaAsset & { focalX: number; focalY: number },
    position?: { x: number; y: number },
  ) {
    if (!article) return;
    const aspect = asset.width && asset.height ? asset.width / asset.height : 4 / 3;
    const width = 48;
    const height = clamp((width * ratio) / aspect, 16, 64);
    const nextLayer = Math.max(0, ...blocks.map((block) => frameFor(block).zIndex)) + 1;
    const block: StoryBlock = {
      id: createId("block"),
      type: "image",
      content: "",
      order: article.blocks.length,
      imageUrl: asset.url,
      imagePublicId: asset.publicId,
      placement: {
        ...defaultImagePlacement,
        alt: asset.alt,
        focalX: asset.focalX,
        focalY: asset.focalY,
      },
      frame: {
        x: clamp((position?.x ?? 50) - width / 2, 0, 100 - width),
        y: clamp((position?.y ?? 50) - height / 2, 0, 100 - height),
        width,
        height,
        rotation: 0,
        zIndex: nextLayer,
        locked: false,
      },
    };
    mutateArticle((current) => [...current, block]);
    setSelectedId(block.id);
    setSaveState(`${asset.name} placed on canvas`);
  }

  function startAssetDrag(event: DragEvent<HTMLButtonElement>, asset: MediaAsset & { focalX: number; focalY: number }) {
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("application/x-lexozine-media", JSON.stringify(asset));
    event.dataTransfer.setData("text/plain", asset.name);
  }

  function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDropActive(false);
    const payload = event.dataTransfer.getData("application/x-lexozine-media");
    if (!payload || !pageRef.current) return;
    try {
      const asset = JSON.parse(payload) as MediaAsset & { focalX: number; focalY: number };
      const rect = pageRef.current.getBoundingClientRect();
      addMediaAsset(asset, {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
      });
    } catch {
      setSaveState("Unable to place the dragged asset");
    }
  }

  function duplicateSelected() {
    if (!selected || !article) return;
    const frame = frameFor(selected);
    const copy: StoryBlock = {
      ...structuredClone(selected),
      id: createId(),
      order: article.blocks.length,
      frame: {
        ...frame,
        x: clamp(frame.x + 3, 0, 100 - frame.width),
        y: clamp(frame.y + 3, 0, 100 - frame.height),
        zIndex: frame.zIndex + 1,
        locked: false,
      },
    };
    mutateArticle((current) => [...current, copy]);
    setSelectedId(copy.id);
  }

  function removeSelected() {
    if (!selected) return;
    mutateArticle((current) => current
      .filter((block) => block.id !== selected.id)
      .map((block, index) => ({ ...block, order: index })));
    setSelectedId("");
  }

  function layer(delta: number) {
    if (!selected) return;
    const values = blocks.map((block) => frameFor(block).zIndex);
    const target = delta > 0 ? Math.max(...values, 0) + 1 : Math.min(...values, 0) - 1;
    patchFrame(selected.id, { zIndex: target });
  }

  function renderFrame(block: StoryBlock) {
    const frame = frameFor(block);
    const active = block.id === selectedId;
    return (
      <div
        key={block.id}
        className={`free-frame frame-${block.type} ${active ? "selected" : ""} ${frame.locked ? "locked" : ""}`}
        style={{
          left: `${frame.x}%`,
          top: `${frame.y}%`,
          width: `${frame.width}%`,
          height: `${frame.height}%`,
          transform: `rotate(${frame.rotation}deg)`,
          zIndex: frame.zIndex,
        }}
        onPointerDown={(event) => startGesture(event, block, "move")}
        onClick={(event) => {
          event.stopPropagation();
          setSelectedId(block.id);
        }}
      >
        {block.type === "image" ? (
          block.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.imageUrl}
              alt={block.placement?.alt ?? ""}
              style={{
                objectFit: block.placement?.fit ?? "cover",
                objectPosition: `${block.placement?.focalX ?? 50}% ${block.placement?.focalY ?? 50}%`,
              }}
            />
          ) : (
            <div className="frame-image-placeholder">
              <ImageIcon size={18} />
              <span>Choose an image from Media</span>
            </div>
          )
        ) : (
          <div className="frame-copy" dangerouslySetInnerHTML={{ __html: block.content || `<span>${block.type}</span>` }} />
        )}
        {active && !frame.locked ? (
          <button
            type="button"
            className="frame-resize"
            aria-label="Resize frame"
            onPointerDown={(event) => startGesture(event, block, "resize")}
          />
        ) : null}
        {active ? <span className="frame-label">{block.type}</span> : null}
      </div>
    );
  }

  if (!article) {
    return (
      <main className="frame-empty">
        <Layers3 size={26} />
        <strong>Create an article before opening the free-form canvas.</strong>
        <Link href={`/issues/${issue.id}`}>Return to issue</Link>
      </main>
    );
  }

  const selectedFrame = selected ? frameFor(selected) : null;
  const previewHref = `/preview?issue=${encodeURIComponent(issue.id)}`;
  const exportHref = `/export?issue=${encodeURIComponent(issue.id)}`;

  const navigator = (
    <>
      <div className="frame-panel-head"><Layers3 size={16} /><strong>Pages & layers</strong></div>
      <label className="frame-article-select">
        <span>Article</span>
        <select
          value={article.id}
          onChange={(event) => {
            setArticleId(event.target.value);
            const next = issue.articles.find((item) => item.id === event.target.value);
            setSelectedId(next?.blocks[0]?.id ?? "");
          }}
        >
          {issue.articles.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>

      <div className="frame-add">
        <button type="button" onClick={() => addText("headline")}><Type size={14} /> Headline</button>
        <button type="button" onClick={() => addText("body")}><Plus size={14} /> Text</button>
        <button type="button" onClick={() => addText("pullquote")}><Plus size={14} /> Quote</button>
        <Link href={`/media?issue=${issue.id}`}><ImageIcon size={14} /> Media</Link>
      </div>

      <div className="frame-media-head">
        <span className="frame-section-label">Media</span>
        <Link href={`/media?issue=${issue.id}&article=${article.id}&returnTo=canvas`}>Open library</Link>
      </div>
      <div className="frame-media-tray">
        {mediaAssets.slice(0, 8).map((asset) => (
          <button
            type="button"
            draggable
            key={asset.id}
            title={`Drag ${asset.name} onto the page`}
            onDragStart={(event) => startAssetDrag(event, asset)}
            onDoubleClick={() => addMediaAsset(asset)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset.url} alt={asset.alt} />
            <span>{asset.name}</span>
          </button>
        ))}
        {!mediaAssets.length ? <Link className="frame-media-empty" href={`/media?issue=${issue.id}&article=${article.id}&returnTo=canvas`}>Add media</Link> : null}
      </div>
      <small className="frame-media-help">{mediaAssets.length ? "Drag an image onto the page or double-click to centre it." : mediaState}</small>

      <div className="frame-section-label">Stacking order</div>
      <div className="layer-list">
        {[...blocks].reverse().map((block) => (
          <button
            type="button"
            key={block.id}
            className={block.id === selectedId ? "active" : ""}
            onClick={() => setSelectedId(block.id)}
          >
            <span>{block.type}</span>
            <small>{frameFor(block).locked ? "locked" : `layer ${frameFor(block).zIndex}`}</small>
          </button>
        ))}
      </div>
    </>
  );

  const toolbar = (
    <>
      <div className="frame-toolbar-group">
        <span className="frame-mode-label">Free-form page</span>
        <button
          type="button"
          className={showGrid ? "active" : ""}
          onClick={() => setShowGrid((value) => !value)}
          aria-pressed={showGrid}
        >
          <Grid3X3 size={14} /> Grid
        </button>
        <button
          type="button"
          className={snapToGrid ? "active" : ""}
          onClick={() => setSnapToGrid((value) => !value)}
          aria-pressed={snapToGrid}
        >
          Snap
        </button>
      </div>
      <div className="frame-toolbar-group">
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(40, value - 10))}>
          <ZoomOut size={15} />
        </button>
        <strong>{zoom}%</strong>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(110, value + 10))}>
          <ZoomIn size={15} />
        </button>
      </div>
    </>
  );

  const inspector = selected && selectedFrame ? (
    <>
      <div className="frame-panel-head"><strong>Object inspector</strong><span>{selected.type}</span></div>
      <div className="frame-object-actions">
        <button type="button" onClick={duplicateSelected}><Copy size={14} /> Duplicate</button>
        <button type="button" onClick={() => patchFrame(selected.id, { locked: !selectedFrame.locked })}>
          {selectedFrame.locked ? <LockOpen size={14} /> : <Lock size={14} />}
          {selectedFrame.locked ? "Unlock" : "Lock"}
        </button>
        <button type="button" aria-label="Bring to front" title="Bring to front" onClick={() => layer(1)}><BringToFront size={14} /></button>
        <button type="button" aria-label="Send to back" title="Send to back" onClick={() => layer(-1)}><SendToBack size={14} /></button>
        <button type="button" className="danger" aria-label="Delete object" title="Delete object" onClick={removeSelected}><Trash2 size={14} /></button>
      </div>

      <div className="frame-section-label">Geometry</div>
      <div className="frame-geometry">
        <label>X<input type="number" step=".5" value={selectedFrame.x.toFixed(1)} onChange={(event) => patchFrame(selected.id, { x: Number(event.target.value) })} /></label>
        <label>Y<input type="number" step=".5" value={selectedFrame.y.toFixed(1)} onChange={(event) => patchFrame(selected.id, { y: Number(event.target.value) })} /></label>
        <label>W<input type="number" step=".5" min="5" value={selectedFrame.width.toFixed(1)} onChange={(event) => patchFrame(selected.id, { width: Number(event.target.value) })} /></label>
        <label>H<input type="number" step=".5" min="4" value={selectedFrame.height.toFixed(1)} onChange={(event) => patchFrame(selected.id, { height: Number(event.target.value) })} /></label>
      </div>

      <label className="frame-rotation">
        <span><RotateCw size={14} /> Rotation <strong>{selectedFrame.rotation}°</strong></span>
        <input type="range" min="-180" max="180" value={selectedFrame.rotation} onChange={(event) => patchFrame(selected.id, { rotation: Number(event.target.value) })} />
      </label>

      {selected.type !== "image" ? (
        <div className="frame-rich">
          <span>Content</span>
          <RichTextEditor value={selected.content} onChange={patchContent} />
        </div>
      ) : (
        <div className="frame-image-note">
          <ImageIcon size={18} />
          <strong>Image frame</strong>
          <span>Use Media to place a source image, then crop and focal-point controls in the image inspector.</span>
        </div>
      )}
    </>
  ) : (
    <div className="frame-inspector-empty">
      <Layers3 size={24} />
      <strong>Select a frame</strong>
      <span>Click an object on the page or choose it from the layer list to edit its properties.</span>
    </div>
  );

  return (
    <StudioEditorShell
      issueId={issue.id}
      issueTitle={issue.title}
      documentLabel={article.title}
      saveState={saveState}
      saveAction={{ label: "Save", onClick: () => void saveNow() }}
      navigator={navigator}
      toolbar={toolbar}
      inspector={inspector}
      previewHref={previewHref}
      exportHref={exportHref}
      status={
        <>
          <span>{selected ? `${selected.type} selected` : "No object selected"}</span>
          <span>•</span>
          <span>{showGrid ? "Grid visible" : "Grid hidden"}</span>
          <span>•</span>
          <span>{snapToGrid ? "Snap 1%" : "Free movement"}</span>
          <span>•</span>
          <span>Arrow keys nudge · Shift + Arrow moves 2%</span>
        </>
      }
    >
      <div className="frame-scroll">
        <div
          ref={pageRef}
          className={`frame-page ${showGrid ? "grid" : ""} ${dropActive ? "drop-active" : ""}`}
          style={{
            aspectRatio: landscape ? `${1 / ratio}` : `${ratio}`,
            background: theme.paper,
            color: theme.ink,
            transform: `scale(${zoom / 100})`,
            transformOrigin: "top center",
          }}
          onClick={() => setSelectedId("")}
          onDragOver={(event) => {
            if (event.dataTransfer.types.includes("application/x-lexozine-media")) {
              event.preventDefault();
              event.dataTransfer.dropEffect = "copy";
              setDropActive(true);
            }
          }}
          onDragLeave={(event) => {
            if (event.currentTarget === event.target) setDropActive(false);
          }}
          onDrop={handleCanvasDrop}
        >
          {blocks.map(renderFrame)}
          <div className="frame-safe-area" />
        </div>
      </div>
    </StudioEditorShell>
  );
}
