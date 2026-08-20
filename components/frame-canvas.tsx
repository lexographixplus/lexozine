"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BringToFront,
  Copy,
  Image as ImageIcon,
  Layers3,
  Lock,
  LockOpen,
  Plus,
  RotateCw,
  Save,
  SendToBack,
  Trash2,
  Type,
} from "lucide-react";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import RichTextEditor from "@/components/rich-text-editor";
import type { FrameGeometry, Issue, StoryBlock } from "@/lib/editor-model";
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

export default function FrameCanvas() {
  const pageRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [articleId, setArticleId] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [zoom, setZoom] = useState(72);
  const [showGrid, setShowGrid] = useState(true);
  const [saveState, setSaveState] = useState("Loading shared issue…");

  const article = useMemo(() => issue.articles.find((item) => item.id === articleId) ?? issue.articles[0], [issue.articles, articleId]);
  const selected = useMemo(() => article?.blocks.find((block) => block.id === selectedId), [article, selectedId]);
  const theme = themeTokens[article?.theme ?? issue.theme];
  const blocks = useMemo(() => [...(article?.blocks ?? [])].sort((a,b)=>(a.frame?.zIndex ?? a.order)-(b.frame?.zIndex ?? b.order)), [article]);
  const production = issue.production;
  const ratio = production?.pageSize === "Square 210" ? 1 : production?.pageSize === "US Letter" ? 8.5 / 11 : 210 / 297;
  const landscape = production?.orientation === "landscape";

  useEffect(() => {
    let alive = true;
    async function load() {
      const requestedId = new URLSearchParams(location.search).get("issue");
      const requestedArticle = new URLSearchParams(location.search).get("article");
      const issues = await issueStore?.list() ?? [];
      const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
      if (!found || !alive) return;
      setIssue(found);
      const first = requestedArticle && found.articles.some((item)=>item.id===requestedArticle) ? requestedArticle : found.articles[0]?.id ?? "";
      setArticleId(first);
      const target = found.articles.find((item)=>item.id===first);
      setSelectedId(target?.blocks[0]?.id ?? "");
      setSaveState("Synced with Neon");
    }
    void load();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    function onMove(event: globalThis.PointerEvent) {
      const gesture = gestureRef.current;
      const rect = pageRef.current?.getBoundingClientRect();
      if (!gesture || !rect) return;
      const dx = ((event.clientX - gesture.startX) / rect.width) * 100;
      const dy = ((event.clientY - gesture.startY) / rect.height) * 100;
      if (gesture.mode === "move") {
        patchFrame(gesture.id, {
          x: clamp(gesture.origin.x + dx, 0, 100 - gesture.origin.width),
          y: clamp(gesture.origin.y + dy, 0, 100 - gesture.origin.height),
        }, false);
      } else {
        patchFrame(gesture.id, {
          width: clamp(gesture.origin.width + dx, 5, 100 - gesture.origin.x),
          height: clamp(gesture.origin.height + dy, 4, 100 - gesture.origin.y),
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
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  });

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input,textarea,select,[contenteditable=true]")) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void saveNow(); return; }
      if (!selected || !article) return;
      if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); removeSelected(); return; }
      const step = event.shiftKey ? 2 : .5;
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key)) {
        event.preventDefault();
        const frame = frameFor(selected);
        if (frame.locked) return;
        patchFrame(selected.id, {
          x: clamp(frame.x + (event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0), 0, 100 - frame.width),
          y: clamp(frame.y + (event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0), 0, 100 - frame.height),
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
    setIssue((current) => ({
      ...current,
      updatedAt: now,
      articles: current.articles.map((item) => item.id === article.id ? { ...item, blocks: mutator(item.blocks), updatedAt: now } : item),
    }));
    if (autosave) queueSave();
  }

  function patchFrame(blockId: string, patch: Partial<FrameGeometry>, autosave = true) {
    mutateArticle((current) => current.map((block) => block.id === blockId ? { ...block, frame: { ...frameFor(block), ...patch } } : block), autosave);
  }

  function patchContent(content: string) {
    if (!selected) return;
    mutateArticle((current)=>current.map((block)=>block.id===selected.id?{...block,content}:block));
  }

  function queueSave() {
    setSaveState("Saving…");
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => void saveNow(), 650);
  }

  async function saveNow() {
    setSaveState("Saving to Neon…");
    try {
      const saved = await issueStore?.save(issue) ?? issue;
      setIssue(saved);
      setSaveState("Saved to Neon");
    } catch {
      setSaveState("Saved to recovery cache");
    }
  }

  function startGesture(event: PointerEvent, block: StoryBlock, mode: Gesture["mode"]) {
    const frame = frameFor(block);
    if (frame.locked) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(block.id);
    gestureRef.current = { id: block.id, mode, startX: event.clientX, startY: event.clientY, origin: frame };
  }

  function addText(type: "headline"|"body"|"pullquote") {
    if (!article) return;
    const block: StoryBlock = {
      id: createId(),
      type,
      content: type === "headline" ? "New headline" : type === "pullquote" ? "A strong pull quote creates rhythm." : "Add editorial copy here.",
      order: article.blocks.length,
      frame: defaultFrameFor(type, article.blocks.length),
    };
    mutateArticle((current)=>[...current, block]);
    setSelectedId(block.id);
  }

  function duplicateSelected() {
    if (!selected || !article) return;
    const frame = frameFor(selected);
    const copy: StoryBlock = { ...structuredClone(selected), id:createId(), order:article.blocks.length, frame:{...frame,x:clamp(frame.x+3,0,100-frame.width),y:clamp(frame.y+3,0,100-frame.height),zIndex:frame.zIndex+1,locked:false} };
    mutateArticle((current)=>[...current,copy]);
    setSelectedId(copy.id);
  }

  function removeSelected() {
    if (!selected) return;
    mutateArticle((current)=>current.filter((block)=>block.id!==selected.id).map((block,index)=>({...block,order:index})));
    setSelectedId("");
  }

  function layer(delta: number) {
    if (!selected) return;
    const values = blocks.map((block)=>frameFor(block).zIndex);
    const target = delta > 0 ? Math.max(...values,0)+1 : Math.min(...values,0)-1;
    patchFrame(selected.id,{zIndex:target});
  }

  function renderFrame(block: StoryBlock) {
    const frame = frameFor(block);
    const active = block.id === selectedId;
    return <div key={block.id} className={`free-frame frame-${block.type} ${active?"selected":""} ${frame.locked?"locked":""}`} style={{left:`${frame.x}%`,top:`${frame.y}%`,width:`${frame.width}%`,height:`${frame.height}%`,transform:`rotate(${frame.rotation}deg)`,zIndex:frame.zIndex}} onPointerDown={(event)=>startGesture(event,block,"move")} onClick={(event)=>{event.stopPropagation();setSelectedId(block.id)}}>
      {block.type === "image" && block.imageUrl ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={block.imageUrl} alt={block.placement?.alt ?? ""} style={{objectFit:block.placement?.fit??"cover",objectPosition:`${block.placement?.focalX??50}% ${block.placement?.focalY??50}%`}}/></> : <div className="frame-copy" dangerouslySetInnerHTML={{__html:block.content || `<span>${block.type}</span>`}}/>}
      {active && !frame.locked ? <button className="frame-resize" aria-label="Resize frame" onPointerDown={(event)=>startGesture(event,block,"resize")}/>:null}
      {active ? <span className="frame-label">{block.type}</span>:null}
    </div>;
  }

  if (!article) return <main className="frame-shell"><div className="frame-empty">Create an article before opening the free-form canvas.</div></main>;
  const selectedFrame = selected ? frameFor(selected) : null;

  return <main className="frame-shell">
    <header className="frame-topbar"><div><Link href={`/?issue=${issue.id}`} className="secondary-button"><ArrowLeft size={15}/> Studio</Link><strong>Lexozine Canvas</strong><span>{issue.title} · {article.title}</span></div><div className="frame-top-actions"><span>{saveState}</span><button className="secondary-button" onClick={()=>setShowGrid((value)=>!value)}>Grid</button><button className="primary-button" onClick={()=>void saveNow()}><Save size={15}/> Save</button></div></header>
    <section className="frame-workspace">
      <aside className="frame-layers"><div className="frame-panel-head"><Layers3 size={16}/><strong>Layers</strong></div><label>Article<select value={article.id} onChange={(event)=>{setArticleId(event.target.value);const next=issue.articles.find((item)=>item.id===event.target.value);setSelectedId(next?.blocks[0]?.id??"")}}>{issue.articles.map((item)=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label><div className="frame-add"><button onClick={()=>addText("headline")}><Type size={14}/>Headline</button><button onClick={()=>addText("body")}><Plus size={14}/>Text</button><button onClick={()=>addText("pullquote")}><Plus size={14}/>Quote</button><Link href={`/media?issue=${issue.id}`}><ImageIcon size={14}/>Media</Link></div><div className="layer-list">{[...blocks].reverse().map((block)=><button key={block.id} className={block.id===selectedId?"active":""} onClick={()=>setSelectedId(block.id)}><span>{block.type}</span><small>{frameFor(block).locked?"locked":`z ${frameFor(block).zIndex}`}</small></button>)}</div></aside>
      <section className="frame-stage"><div className="frame-stage-toolbar"><span>Free-form page composition</span><label>Zoom <input type="range" min="40" max="110" value={zoom} onChange={(event)=>setZoom(Number(event.target.value))}/><strong>{zoom}%</strong></label></div><div className="frame-scroll"><div ref={pageRef} className={`frame-page ${showGrid?"grid":""}`} style={{aspectRatio:landscape?`${1/ratio}`:`${ratio}`,background:theme.paper,color:theme.ink,transform:`scale(${zoom/100})`,transformOrigin:"top center"}} onClick={()=>setSelectedId("")}>{blocks.map(renderFrame)}<div className="frame-safe-area"/></div></div></section>
      <aside className="frame-inspector"><div className="frame-panel-head"><strong>Frame Inspector</strong></div>{selected&&selectedFrame?<><div className="frame-object-actions"><button onClick={duplicateSelected}><Copy size={14}/>Duplicate</button><button onClick={()=>patchFrame(selected.id,{locked:!selectedFrame.locked})}>{selectedFrame.locked?<LockOpen size={14}/>:<Lock size={14}/>} {selectedFrame.locked?"Unlock":"Lock"}</button><button onClick={()=>layer(1)}><BringToFront size={14}/></button><button onClick={()=>layer(-1)}><SendToBack size={14}/></button><button className="danger" onClick={removeSelected}><Trash2 size={14}/></button></div><div className="frame-geometry"><label>X<input type="number" step=".5" value={selectedFrame.x.toFixed(1)} onChange={(e)=>patchFrame(selected.id,{x:Number(e.target.value)})}/></label><label>Y<input type="number" step=".5" value={selectedFrame.y.toFixed(1)} onChange={(e)=>patchFrame(selected.id,{y:Number(e.target.value)})}/></label><label>W<input type="number" step=".5" min="5" value={selectedFrame.width.toFixed(1)} onChange={(e)=>patchFrame(selected.id,{width:Number(e.target.value)})}/></label><label>H<input type="number" step=".5" min="4" value={selectedFrame.height.toFixed(1)} onChange={(e)=>patchFrame(selected.id,{height:Number(e.target.value)})}/></label></div><label className="frame-rotation"><span><RotateCw size={14}/> Rotation <strong>{selectedFrame.rotation}°</strong></span><input type="range" min="-180" max="180" value={selectedFrame.rotation} onChange={(e)=>patchFrame(selected.id,{rotation:Number(e.target.value)})}/></label>{selected.type!=="image"?<div className="frame-rich"><span>Content</span><RichTextEditor value={selected.content} onChange={patchContent}/></div>:<div className="frame-image-note"><ImageIcon size={18}/><strong>Image frame</strong><span>Crop and focal point remain controlled by the Media/Studio image inspector.</span></div>}</>:<div className="frame-inspector-empty"><Layers3 size={24}/><strong>Select a frame</strong><span>Drag objects on the page or select a layer to edit geometry and content.</span></div>}</aside>
    </section>
  </main>;
}
