"use client";

import { ArrowLeft, CheckCircle2, Clock3, MessageSquareText, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Issue } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";
import { issueStore } from "@/lib/issue-store";

type Version = { id:string; issueId:string; label:string; author:string; time:string; note:string; status:"saved"|"review"|"approved"; snapshot:Issue };

export default function VersionHistory(){
 const [issue,setIssue]=useState<Issue>(()=>createIssueTemplate("editorial"));
 const [versions,setVersions]=useState<Version[]>([]);
 const [active,setActive]=useState("");
 const [note,setNote]=useState("Editorial checkpoint");
 const [activity,setActivity]=useState("Loading shared history…");

 useEffect(()=>{
   let alive=true;
   async function load(){
     const issues=await issueStore?.list()??[];
     const requestedId=new URLSearchParams(window.location.search).get("issue");
     const found=requestedId?issues.find((item)=>item.id===requestedId):issues[0];
     const next=found??createIssueTemplate("editorial");
     if(!alive)return;
     setIssue(next);
     try{
       const response=await fetch(`/api/versions?issue=${encodeURIComponent(next.id)}`,{cache:"no-store"});
       if(!response.ok)throw new Error(`Version sync failed (${response.status})`);
       const data=await response.json() as {versions:Version[]};
       if(alive){setVersions(data.versions);setActive(data.versions[0]?.id??"");setActivity("History synced with Neon");}
     }catch(error){if(alive)setActivity(error instanceof Error?error.message:"History sync unavailable")}
   }
   void load();
   return()=>{alive=false};
 },[]);

 const selected=useMemo(()=>versions.find((version)=>version.id===active),[versions,active]);

 async function saveCheckpoint(customNote=note){
   setActivity("Saving checkpoint…");
   try{
     const response=await fetch("/api/versions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({issue,note:customNote})});
     const data=await response.json().catch(()=>({}));
     if(!response.ok)throw new Error(data.error??`Checkpoint failed (${response.status})`);
     const version=data.version as Version;
     setVersions((current)=>[version,...current]);
     setActive(version.id);
     setActivity("Checkpoint saved to Neon");
     return version;
   }catch(error){setActivity(error instanceof Error?error.message:"Unable to save checkpoint");return null}
 }

 async function restore(version:Version){
   setActivity(`Restoring ${version.label}…`);
   const restored={...structuredClone(version.snapshot),updatedAt:new Date().toISOString()};
   try{
     const saved=await issueStore?.save(restored)??restored;
     setIssue(saved);
     const response=await fetch("/api/versions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({issue:saved,note:`Restored publication state from ${version.label}.`})});
     const data=await response.json().catch(()=>({}));
     if(response.ok){const checkpoint=data.version as Version;setVersions((current)=>[checkpoint,...current]);setActive(checkpoint.id)}
     setActivity(`${version.label} restored without deleting newer history`);
   }catch(error){setActivity(error instanceof Error?error.message:"Unable to restore checkpoint")}
 }

 return <main className="history-page"><header><div><Link href={`/?issue=${issue.id}`} className="history-back"><ArrowLeft size={16}/>Studio</Link><span>Shared editorial safety & review</span><h1>Version History</h1><p>Track issue snapshots, review decisions and recover earlier publication states without overwriting the audit trail.</p></div><button onClick={()=>void saveCheckpoint()}><Save size={15}/> Save checkpoint</button></header><section className="history-shell"><div className="history-list"><label className="history-note"><span>Checkpoint note · {activity}</span><input value={note} onChange={(e)=>setNote(e.target.value)} /></label>{versions.length?versions.map((v,index)=><button key={v.id} className={active===v.id?"active":""} onClick={()=>setActive(v.id)}><div className="history-icon">{v.status==="approved"?<CheckCircle2 size={17}/>:v.status==="review"?<MessageSquareText size={17}/>:<Clock3 size={17}/>}</div><div><strong>{v.label || `Version ${versions.length-index}`}</strong><span>{v.author} · {new Date(v.time).toLocaleString()}</span><p>{v.note}</p></div></button>):<div className="history-empty"><Clock3 size={22}/><strong>No checkpoints yet</strong><p>Save a shared version before a major editorial or layout change.</p></div>}</div><aside>{selected?<><span className="history-kicker">Selected checkpoint</span><h2>{selected.label}</h2><div className="history-preview"><div/><div/><div/><div/></div><dl><div><dt>Issue</dt><dd>{selected.snapshot.number} · {selected.snapshot.title}</dd></div><div><dt>Articles</dt><dd>{selected.snapshot.articles.length}</dd></div><div><dt>Status</dt><dd>{selected.status}</dd></div></dl><p>{selected.note}</p><button className="restore" onClick={()=>void restore(selected)}><RotateCcw size={15}/>Restore this issue state</button></>:<><span className="history-kicker">Current issue</span><h2>{issue.title}</h2><p>Create the first shared checkpoint to begin the issue’s recoverable editorial history.</p></>}</aside></section></main>
}
