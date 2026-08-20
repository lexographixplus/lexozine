"use client";

import { ArrowLeft, CheckCircle2, Clock3, MessageSquareText, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type Version = { id:string; label:string; author:string; time:string; note:string; status:"saved"|"review"|"approved" };
const seed:Version[]=[
{id:"v5",label:"Version 5",author:"Awa",time:"12:54",note:"Refined feature opener and article rhythm.",status:"saved"},
{id:"v4",label:"Version 4",author:"Essa",time:"11:32",note:"Approved cover direction; requested tighter contents page.",status:"approved"},
{id:"v3",label:"Version 3",author:"Awa",time:"10:18",note:"Imported manuscript and corrected block tags.",status:"review"},
{id:"v2",label:"Version 2",author:"Studio",time:"Yesterday",note:"Created article spread from Editorial Journal template.",status:"saved"},
{id:"v1",label:"Version 1",author:"Studio",time:"Yesterday",note:"Issue created.",status:"saved"},
];

export default function VersionHistory(){
 const [versions,setVersions]=useState(seed); const [active,setActive]=useState(seed[0].id);
 function restore(v:Version){ setVersions(c=>[{id:`v-${Date.now()}`,label:`Restored ${v.label}`,author:"Studio",time:"Now",note:`Restored from ${v.label}.`,status:"saved"},...c]); }
 return <main className="history-page"><header><div><Link href="/" className="history-back"><ArrowLeft size={16}/>Studio</Link><span>Editorial safety & review</span><h1>Version History</h1><p>Track meaningful editorial checkpoints, review decisions and recover earlier states without losing current work.</p></div><button onClick={()=>setVersions(c=>[{id:`v-${Date.now()}`,label:`Version ${c.length+1}`,author:"Studio",time:"Now",note:"Manual editorial checkpoint.",status:"saved"},...c])}>Save checkpoint</button></header><section className="history-shell"><div className="history-list">{versions.map(v=><button key={v.id} className={active===v.id?"active":""} onClick={()=>setActive(v.id)}><div className="history-icon">{v.status==="approved"?<CheckCircle2 size={17}/>:v.status==="review"?<MessageSquareText size={17}/>:<Clock3 size={17}/>}</div><div><strong>{v.label}</strong><span>{v.author} · {v.time}</span><p>{v.note}</p></div></button>)}</div><aside>{(()=>{const v=versions.find(x=>x.id===active)!;return <><span className="history-kicker">Selected checkpoint</span><h2>{v.label}</h2><div className="history-preview"><div/><div/><div/><div/></div><dl><div><dt>Created by</dt><dd>{v.author}</dd></div><div><dt>Time</dt><dd>{v.time}</dd></div><div><dt>Status</dt><dd>{v.status}</dd></div></dl><p>{v.note}</p><button className="restore" onClick={()=>restore(v)}><RotateCcw size={15}/>Restore as new version</button></>})()}</aside></section></main>
}
