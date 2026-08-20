"use client";

import { Archive, ArrowLeft, CheckCircle2, FileJson, FileText, Globe2, Printer, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Issue, StoryBlock } from "@/lib/editor-model";
import { createIssueTemplate } from "@/lib/issue-templates";
import { issueStore } from "@/lib/issue-store";

function plainText(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent?.trim() ?? "";
}

export default function ExportCenter() {
  const [issue, setIssue] = useState<Issue>(() => createIssueTemplate("editorial"));
  const [docxState, setDocxState] = useState("Export editable DOCX");
  const [syncState, setSyncState] = useState("Loading production issue…");

  useEffect(() => {
    let alive = true;
    async function load() {
      const issues = await issueStore?.list() ?? [];
      const requestedId = new URLSearchParams(window.location.search).get("issue");
      const found = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
      if (found && alive) {
        setIssue(found);
        setSyncState("Production data synced");
      }
    }
    void load();
    return () => { alive = false; };
  }, []);

  const checks = useMemo(() => {
    const imageBlocks = issue.articles.flatMap((article) => article.blocks.filter((block) => block.type === "image"));
    const missingAlt = imageBlocks.filter((block) => !(block.placement?.alt || "").trim()).length;
    const emptyTitles = issue.articles.filter((article) => !article.title.trim()).length;
    return [
      { title: "Editorial structure", copy: `${issue.pages.length} pages and ${issue.articles.length} articles are in the issue.`, pass: issue.pages.some((page) => page.kind === "cover") && issue.pages.some((page) => page.kind === "toc") && issue.articles.length > 0 },
      { title: "Article titles", copy: emptyTitles ? `${emptyTitles} article titles still need attention.` : "All articles have titles.", pass: emptyTitles === 0 },
      { title: "Image accessibility", copy: missingAlt ? `${missingAlt} placed images are missing alt text.` : `${imageBlocks.length} placed images have accessibility metadata.`, pass: missingAlt === 0 },
      { title: "Print geometry", copy: `${issue.production?.pageSize ?? "A4"}, ${issue.production?.bleed ?? 3} mm bleed, ${issue.production?.safeMargin ?? 12} mm safe margin.`, pass: true },
      { title: "Cover artwork", copy: issue.coverImageUrl ? "A cover image is assigned." : "No cover photograph is assigned; the designed graphic cover will be used.", pass: true },
    ];
  }, [issue]);

  const passed = checks.filter((check) => check.pass).length;

  function downloadPackage() {
    const payload = { format: "lexozine-package-v3", exportedAt: new Date().toISOString(), issue };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `lexozine-${issue.number}-${issue.title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportDocx() {
    setDocxState("Building DOCX…");
    try {
      const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import("docx");
      const children: InstanceType<typeof Paragraph>[] = [];
      children.push(new Paragraph({ text: "LEXOZINE", heading: HeadingLevel.TITLE }));
      children.push(new Paragraph({ text: `${issue.title} · Issue ${issue.number}`, heading: HeadingLevel.HEADING_1 }));
      children.push(new Paragraph({ children: [new TextRun({ text: issue.description, italics: true })] }));
      children.push(new Paragraph({ text: `Edition: ${issue.editionDate}` }));
      children.push(new Paragraph({ text: "" }));
      children.push(new Paragraph({ text: "Contents", heading: HeadingLevel.HEADING_1 }));
      issue.articles.forEach((article, index) => children.push(new Paragraph({ text: `${index + 1}. ${article.title} — ${article.byline}` })));

      issue.articles.forEach((article) => {
        children.push(new Paragraph({ text: article.title, heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
        children.push(new Paragraph({ children: [new TextRun({ text: `${article.category} · ${article.byline} · ${article.readTime}`, bold: true })] }));
        const ordered = [...article.blocks].sort((a,b)=>a.order-b.order);
        ordered.forEach((block: StoryBlock) => {
          const text = plainText(block.content);
          if (block.type === "headline") return;
          if (block.type === "deck") children.push(new Paragraph({ children: [new TextRun({ text, italics: true, size: 26 })], spacing: { after: 240 } }));
          else if (block.type === "pullquote") children.push(new Paragraph({ children: [new TextRun({ text: `“${text}”`, bold: true, italics: true })], spacing: { before: 180, after: 180 } }));
          else if (block.type === "body") children.push(new Paragraph({ text, spacing: { after: 160 } }));
          else if (block.type === "image") {
            const caption = block.placement?.caption?.trim();
            const alt = block.placement?.alt?.trim();
            children.push(new Paragraph({ children: [new TextRun({ text: `[Image${alt ? `: ${alt}` : ""}]`, italics: true })] }));
            if (caption) children.push(new Paragraph({ children: [new TextRun({ text: caption, italics: true, size: 18 })] }));
          } else if (text) children.push(new Paragraph({ text }));
        });
      });

      const wordDocument = new Document({ sections: [{ properties: {}, children }] });
      const blob = await Packer.toBlob(wordDocument);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `lexozine-${issue.number}-${issue.title.toLowerCase().replace(/[^a-z0-9]+/g,"-")}.docx`;
      anchor.click();
      URL.revokeObjectURL(url);
      setDocxState("DOCX downloaded");
    } catch {
      setDocxState("DOCX export failed");
    }
  }

  return (
    <main className="export-page">
      <header className="export-header"><div><Link href={`/?issue=${issue.id}`} className="export-back"><ArrowLeft size={16} /> Studio</Link><span className="export-eyebrow">Production & delivery</span><h1>Export Center</h1><p>Prepare <strong>{issue.title}</strong> · Issue {issue.number} for review, print/PDF delivery, digital publication, or archival handoff. {syncState}</p></div><div className="export-ready"><ShieldCheck size={18} /><div><strong>Preflight</strong><span>{passed}/{checks.length} checks passed</span></div></div></header>

      <section className="export-grid">
        <article className="export-card primary"><div className="export-icon"><Printer size={22}/></div><span>Server PDF</span><h2>Production PDF</h2><p>Generate a deterministic server-rendered PDF using Chromium, the selected issue’s production geometry and its Cloudinary imagery.</p><a href={`/api/pdf?issue=${encodeURIComponent(issue.id)}`}><Printer size={15}/>Generate PDF</a></article>
        <article className="export-card"><div className="export-icon"><Globe2 size={22}/></div><span>Digital edition</span><h2>Web publication</h2><p>Preview the responsive reading experience generated directly from the shared Neon issue and its placed imagery.</p><Link href={`/preview?issue=${issue.id}`}><Globe2 size={15}/>Open digital edition</Link></article>
        <article className="export-card"><div className="export-icon"><FileJson size={22}/></div><span>Archive</span><h2>Issue package</h2><p>Download the full Issue → Article → Block structure, including layout and image-placement metadata.</p><button onClick={downloadPackage}><Archive size={15}/>Download package</button></article>
        <article className="export-card"><div className="export-icon"><FileText size={22}/></div><span>Editable document</span><h2>DOCX export</h2><p>Generate an editable Word document from the structured issue, preserving hierarchy, body copy, decks, pull quotes, image references and captions.</p><button onClick={exportDocx}><FileText size={15}/>{docxState}</button></article>
      </section>

      <section className="preflight-panel"><div><span className="export-eyebrow">Issue preflight</span><h2>Before final delivery</h2></div><div className="preflight-list">{checks.map((check)=><div key={check.title}>{check.pass?<CheckCircle2 size={17}/>:<TriangleAlert size={17}/>}<div><strong>{check.title}</strong><span>{check.copy}</span></div></div>)}</div></section>
    </main>
  );
}
