"use client";

import { ArrowLeft, CheckCircle2, Clock3, MessageSquareText, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Issue } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";

type Version = { id:string; issueId:string; label:string; author:string; time:string; note:string; status:"saved"|"review"|"approved"; snapshot:Issue };
const VERSIONS_KEY="lexozine-versions-v1";
const ISSUES_KEY="lexozine-issues-v1";

function readVersions():Version[]{try{return JSON.parse(localStorage.getItem(VERSIONS_KEY)??"[]") as Version[]}catch{return[]}}
function readIssues():Issue[]{try{return JSON.parse(localStorage.getItem(ISSUES_KEY)??"[]") as Issue[]}catch{return[]}}

export default function VersionHistory(){
 const [issue,setIssue]=useState<Issue>(()=>createIssueTemplate("editorial"));
 const [versions,setVersions]=useState<Version[]>([]);
 const [active,setActive]=useState("");
 const [note,setNote]=useState("Editorial checkpoint");

 useEffect(()=>{
   const issues=readIssues();
   const requestedId=new URLSearchParams(window.location.search).get("issue");
   const found=requestedId?issues.find((item)=>item.id===requestedId):issues[0];
   const next=found??createIssueTemplate("editorial");
   setIssue(next);
   const related=readVersions().filter((version)=>version.issueId===next.id);
   setVersions(related);
   setActive(related[0]?.id??"");
 },[]);

 const selected=useMemo(()=>versions.find((version)=>version.id===active),[versions,active]);

 function persist(all:Version[]){localStorage.setItem(VERSIONS_KEY,JSON.stringify(all))}

 function saveCheckpoint(status:Version["status"]="saved", customNote=note){
   const all=readVersions();
   const version:Version={id:`version-${Date.now()}`,issueId:issue.id,label:`Version ${versions.length+1}`,author:"Lexozine Studio",time:new Date().toLocaleString(),note:customNote,status,snapshot:structuredClone(issue)};
   persist([version,...all]);
   setVersions((current)=>[version,...current]);
   setActive(version.id);
 }

 function restore(version:Version){
   const issues=readIssues();
   const restored={...structuredClone(version.snapshot),updatedAt:new Date().toISOString()};
   const index=issues.findIndex((item)=>item.id===restored.id);
   if(index>=0)issues[index]=restored;else issues.unshift(restored);
   localStorage.setItem(ISSUES_KEY,JSON.stringify(issues));
   setIssue(restored);
   saveCheckpoint("saved",`Restored publication state from ${version.label}.`);
 }

 return <main className="history-page"><header><div><Link href={`/?issue=${issue.id}`} className="history-back"><ArrowLeft size={16}/>Studio</Link><span>Editorial safety & review</span><h1>Version History</h1><p>Track real issue snapshots, review decisions and recover earlier publication states without overwriting the audit trail.</p></div><button onClick={()=>saveCheckpoint()}><Save size={15}/> Save checkpoint</button></header><section className="history-shell"><div className="history-list"><label className="history-note"><span>Checkpoint note</span><input value={note} onChange={(e)=>setNote(e.target.value)} /></label>{versions.length?versions.map(v=><button key={v.id} className={active===v.id?"active":""} onClick={()=>setActive(v.id)}><div className="history-icon">{v.status==="approved"?<CheckCircle2 size={17}/>:v.status==="review"?<MessageSquareText size={17}/>:<Clock3 size={17}/>}</div><div><strong>{v.label}</strong><span>{v.author} · {v.time}</span><p>{v.note}</p></div></button>):<div className="history-empty"><Clock3 size={22}/><strong>No checkpoints yet</strong><p>Save a version before a major editorial or layout change.</p></div>}</div><aside>{selected?<><span className="history-kicker">Selected checkpoint</span><h2>{selected.label}</h2><div className="history-preview"><div/><div/><div/><div/></div><dl><div><dt>Issue</dt><dd>{selected.snapshot.number} · {selected.snapshot.title}</dd></div><div><dt>Articles</dt><dd>{selected.snapshot.articles.length}</dd></div><div><dt>Status</dt><dd>{selected.status}</dd></div></dl><p>{selected.note}</p><button className="restore" onClick={()=>restore(selected)}><RotateCcw size={15}/>Restore this issue state</button></>:<><span className="history-kicker">Current issue</span><h2>{issue.title}</h2><p>Create the first checkpoint to begin the issue’s recoverable editorial history.</p></>}</aside></section></main>
}
