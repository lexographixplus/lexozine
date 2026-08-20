"use client";

import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, Heading1, Heading2, ImageIcon, Pilcrow, Plus, Quote, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BlockType, Issue, StoryBlock } from "@/lib/editor-model";
import { createId } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";

const ISSUES_KEY = "lexozine-issues-v1";

const blocks: Array<{ type: Extract<BlockType,"headline"|"deck"|"body"|"pullquote">; label: string; description: string; icon: typeof Heading1; defaultText: string }> = [
  { type: "headline", label: "Headline", description: "Primary editorial title or section heading.", icon: Heading1, defaultText: "New headline" },
  { type: "deck", label: "Deck", description: "Short framing text beneath a headline.", icon: Heading2, defaultText: "Add a concise editorial deck." },
  { type: "body", label: "Body copy", description: "Long-form article paragraph with rich-text formatting.", icon: Pilcrow, defaultText: "Add body copy here." },
  { type: "pullquote", label: "Pull quote", description: "Prominent quotation used to create editorial rhythm.", icon: Quote, defaultText: "Add a memorable quotation." },
];

function labelFor(block: StoryBlock) {
  if (block.type === "image") return block.placement?.caption || block.placement?.alt || "Placed image";
  const text = block.content.replace(/<[^>]+>/g, "").trim();
  return text || block.type;
}

export default function BlockBuilder() {
  const [issue, setIssue] = useState<Issue>(()=>createIssueTemplate("editorial"));
  const [articleId, setArticleId] = useState("");
  const [status, setStatus] = useState("Choose a block to add");

  useEffect(()=>{
    try {
      const issues=JSON.parse(localStorage.getItem(ISSUES_KEY)??"[]") as Issue[];
      const requestedId=new URLSearchParams(location.search).get("issue");
      const found=requestedId?issues.find((item)=>item.id===requestedId):issues[0];
      if(found){setIssue(found);setArticleId(found.articles[0]?.id??"");}
    } catch {}
  },[]);

  const article = useMemo(()=>issue.articles.find((item)=>item.id===articleId),[issue.articles,articleId]);
  const ordered = useMemo(()=>[...(article?.blocks??[])].sort((a,b)=>a.order-b.order),[article]);

  function persist(next:Issue){
    const issues=(()=>{try{return JSON.parse(localStorage.getItem(ISSUES_KEY)??"[]") as Issue[]}catch{return[]}})();
    const index=issues.findIndex((item)=>item.id===next.id);
    if(index>=0)issues[index]=next;else issues.unshift(next);
    localStorage.setItem(ISSUES_KEY,JSON.stringify(issues));
    setIssue(next);
  }

  function replaceBlocks(nextBlocks: StoryBlock[], message: string){
    if(!article)return;
    const normalized=nextBlocks.map((block,order)=>({...block,order}));
    const next={...issue,articles:issue.articles.map((item)=>item.id===article.id?{...item,blocks:normalized,updatedAt:new Date().toISOString()}:item),updatedAt:new Date().toISOString()};
    persist(next);
    setStatus(message);
  }

  function addBlock(type: Extract<BlockType,"headline"|"deck"|"body"|"pullquote">, text:string){
    if(!article)return;
    const block:StoryBlock={id:createId("block"),type,content:text,order:ordered.length};
    replaceBlocks([...ordered,block],`${type} block added to ${article.title}`);
  }

  function move(blockId:string,direction:-1|1){
    const index=ordered.findIndex((block)=>block.id===blockId);
    const target=index+direction;
    if(index<0||target<0||target>=ordered.length)return;
    const next=[...ordered];
    [next[index],next[target]]=[next[target],next[index]];
    replaceBlocks(next,`Block moved ${direction<0?"up":"down"}`);
  }

  function remove(blockId:string){
    const block=ordered.find((item)=>item.id===blockId);
    replaceBlocks(ordered.filter((item)=>item.id!==blockId),`${block?.type??"Block"} removed`);
  }

  return <main className="utility-shell"><header className="utility-topbar"><Link href={`/?issue=${issue.id}`} className="secondary-button"><ArrowLeft size={15}/> Back to studio</Link><div className="brand-title">Lexozine <span>Blocks</span></div><div className="save-state"><span className="save-dot"/> {status}</div></header><section className="utility-hero"><span className="eyebrow">Structured content</span><h1>Content Block Manager</h1><p>Add, reorder and remove publication-aware blocks, then edit their content and visual treatment inside the Studio.</p></section><section className="utility-grid two-column"><div className="utility-panel"><h2>Story structure</h2><div className="form-field"><label>Article</label><select value={articleId} onChange={(e)=>setArticleId(e.target.value)}>{issue.articles.map((item)=><option key={item.id} value={item.id}>{item.title}</option>)}</select></div><div className="block-order-list">{ordered.map((block,index)=><article key={block.id}><div className="block-order-icon">{block.type==="image"?<ImageIcon size={15}/>:block.type==="pullquote"?<Quote size={15}/>:block.type==="headline"?<Heading1 size={15}/>:block.type==="deck"?<Heading2 size={15}/>:<Pilcrow size={15}/>}</div><div className="block-order-copy"><strong>{block.type}</strong><span>{labelFor(block).slice(0,80)}</span></div><div className="block-order-actions"><button disabled={index===0} onClick={()=>move(block.id,-1)} aria-label="Move block up"><ArrowUp size={13}/></button><button disabled={index===ordered.length-1} onClick={()=>move(block.id,1)} aria-label="Move block down"><ArrowDown size={13}/></button><button className="remove" onClick={()=>remove(block.id)} aria-label="Remove block"><Trash2 size={13}/></button></div></article>)}</div></div><div className="utility-panel"><h2>Add block</h2><div className="preset-list">{blocks.map(({type,label,description,icon:Icon,defaultText})=><button className="preset-card" key={type} onClick={()=>addBlock(type,defaultText)}><Icon size={18}/><div><strong>{label}</strong><span>{description}</span><small>Add to selected article</small></div></button>)}</div><div className="utility-card" style={{marginTop:18}}><Plus size={20}/><h3>Structured reading order</h3><p>The order here drives the editorial sequence used by Studio, digital edition, DOCX export and future server-rendered PDF output.</p></div></div></section></main>;
}
