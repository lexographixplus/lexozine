"use client";

import Link from "next/link";
import { ArrowLeft, Heading1, Heading2, Pilcrow, Plus, Quote } from "lucide-react";
import { useEffect, useState } from "react";
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

  function persist(next:Issue){
    const issues=(()=>{try{return JSON.parse(localStorage.getItem(ISSUES_KEY)??"[]") as Issue[]}catch{return[]}})();
    const index=issues.findIndex((item)=>item.id===next.id);
    if(index>=0)issues[index]=next;else issues.unshift(next);
    localStorage.setItem(ISSUES_KEY,JSON.stringify(issues));
    setIssue(next);
  }

  function addBlock(type: Extract<BlockType,"headline"|"deck"|"body"|"pullquote">, text:string){
    const article=issue.articles.find((item)=>item.id===articleId);
    if(!article)return;
    const block:StoryBlock={id:createId("block"),type,content:text,order:article.blocks.length};
    const next={...issue,articles:issue.articles.map((item)=>item.id===articleId?{...item,blocks:[...item.blocks,block],updatedAt:new Date().toISOString()}:item),updatedAt:new Date().toISOString()};
    persist(next);
    setStatus(`${type} block added to ${article.title}`);
  }

  return <main className="utility-shell"><header className="utility-topbar"><Link href={`/?issue=${issue.id}`} className="secondary-button"><ArrowLeft size={15}/> Back to studio</Link><div className="brand-title">Lexozine <span>Blocks</span></div><div className="save-state"><span className="save-dot"/> {status}</div></header><section className="utility-hero"><span className="eyebrow">Structured content</span><h1>Content Block Builder</h1><p>Add publication-aware blocks to an article, then style and edit them directly inside the Studio.</p></section><section className="utility-grid two-column"><div className="utility-panel"><h2>Target article</h2><div className="form-field"><label>Article</label><select value={articleId} onChange={(e)=>setArticleId(e.target.value)}>{issue.articles.map((article)=><option key={article.id} value={article.id}>{article.title}</option>)}</select></div><div className="utility-card" style={{marginTop:18}}><Plus size={20}/><h3>Structured, not free-floating</h3><p>Blocks stay inside the Article model, preserving reading order and making web, DOCX and future server-PDF rendering predictable.</p></div></div><div className="utility-panel"><h2>Add block</h2><div className="preset-list">{blocks.map(({type,label,description,icon:Icon,defaultText})=><button className="preset-card" key={type} onClick={()=>addBlock(type,defaultText)}><Icon size={18}/><div><strong>{label}</strong><span>{description}</span><small>Add to selected article</small></div></button>)}</div></div></section></main>;
}
