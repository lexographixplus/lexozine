"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";

type Tool = { id: string; title: string; description: string; action: (text: string) => string };

const tools: Tool[] = [
  { id: "quotes", title: "Smart quotes", description: "Normalize straight quotation marks into editorial punctuation.", action: (text) => text.replace(/"([^\"]+)"/g, "“$1”").replace(/'([^']+)'/g, "‘$1’") },
  { id: "spacing", title: "Clean spacing", description: "Remove repeated spaces and tidy paragraph spacing.", action: (text) => text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() },
  { id: "dashes", title: "Editorial dashes", description: "Normalize spaced hyphens into em dashes for prose.", action: (text) => text.replace(/\s-\s/g, " — ") },
  { id: "orphans", title: "Flag short endings", description: "Mark very short final lines for manual editorial review.", action: (text) => text.split("\n").map((line) => line.trim().split(/\s+/).length <= 3 && line.trim() ? `⚑ ${line}` : line).join("\n") },
];

export default function EditorialAssist() {
  const [source, setSource] = useState("Paste or draft editorial copy here to clean punctuation, spacing and production consistency before placing it into the magazine.");
  const [result, setResult] = useState(source);
  const [lastAction, setLastAction] = useState("Ready");

  const stats = useMemo(() => {
    const words = result.trim() ? result.trim().split(/\s+/).length : 0;
    return { words, minutes: Math.max(1, Math.ceil(words / 220)), chars: result.length };
  }, [result]);

  function run(tool: Tool) {
    setResult(tool.action(result));
    setLastAction(`${tool.title} applied`);
  }

  return (
    <main className="utility-shell">
      <header className="utility-topbar"><Link href="/" className="secondary-button"><ArrowLeft size={15}/> Back to studio</Link><div className="brand-title">Lexozine <span>Assist</span></div><div className="save-state"><CheckCircle2 size={14}/> {lastAction}</div></header>
      <section className="utility-hero"><span className="eyebrow">Editorial utilities</span><h1>Assist without losing editorial control</h1><p>Deterministic cleanup tools for copy preparation, rhythm and consistency. The editor remains in charge of every final wording and layout decision.</p></section>
      <section className="utility-grid two-column">
        <div className="utility-panel"><h2>Copy workspace</h2><textarea rows={22} value={result} onChange={(e)=>{setSource(e.target.value);setResult(e.target.value);}}/><div className="production-row"><span>Words</span><strong>{stats.words}</strong></div><div className="production-row"><span>Estimated read time</span><strong>{stats.minutes} min</strong></div><div className="production-row"><span>Characters</span><strong>{stats.chars}</strong></div><button className="secondary-button" onClick={()=>setResult(source)}>Reset</button></div>
        <div className="utility-panel"><h2>Editorial actions</h2><div className="preset-list">{tools.map((tool)=><button key={tool.id} className="preset-card" onClick={()=>run(tool)}><Wand2 size={18}/><div><strong>{tool.title}</strong><span>{tool.description}</span></div></button>)}</div><div className="utility-card" style={{marginTop:18}}><Sparkles size={20}/><h3>AI-assisted editing boundary</h3><p>Future AI features can suggest headlines, decks, summaries and layout cues, but source copy should remain reviewable and reversible. This workspace keeps that separation explicit.</p></div></div>
      </section>
    </main>
  );
}
