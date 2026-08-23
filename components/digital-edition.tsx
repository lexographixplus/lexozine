"use client";

import { ArrowDown, BookOpen, Menu, Minus, Moon, Plus, Share2, Sun, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Article, Issue, StoryBlock, defaultImagePlacement, defaultTypographySettings } from "@/lib/editor-model";
import { findEditorsNote } from "@/lib/editors-note";
import { createIssueTemplate } from "@/lib/issue-templates";
import { defaultLayoutSettings } from "@/lib/layout-composer";
import { resolveActiveCoverAsset, resolveCoverDesign, resolveCoverImageUrl, resolveIssuePalette } from "@/lib/magazine-design";

type ReaderMode = "paper" | "sepia" | "night";

function classSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function textFromHtml(html: string) {
  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function articleText(article: Article) {
  return article.blocks.filter((block) => block.type === "body").map((block) => textFromHtml(block.content)).join("\n");
}

function usesLongPoetryReading(article: Article) {
  if (classSlug(article.category) !== "poetry") return false;
  const verse = articleText(article);
  const lines = verse.split(/\n+/).map((line) => line.trim()).filter(Boolean).length;
  return lines >= 32 || verse.replace(/\s+/g, " ").trim().length >= 1900;
}

function readerAnchor(index: number, isEditorsNote: boolean) {
  return isEditorsNote ? "editors-note" : `story-${index + 1}`;
}

function readingMinutes(articles: Article[]) {
  return articles.reduce((total, article) => total + (Number.parseInt(article.readTime, 10) || 0), 0);
}

export default function DigitalEdition({ initialIssue }: { initialIssue?: Issue }) {
  const [issue] = useState<Issue>(() => initialIssue ?? createIssueTemplate("editorial"));
  const [navOpen, setNavOpen] = useState(false);
  const [readerMode, setReaderMode] = useState<ReaderMode>("paper");
  const [fontStep, setFontStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [lastPosition, setLastPosition] = useState(0);
  const [shareMessage, setShareMessage] = useState("");
  const [preferencesReady, setPreferencesReady] = useState(false);

  const palette = resolveIssuePalette(issue);
  const cover = resolveCoverDesign(issue);
  const activeCoverAsset = resolveActiveCoverAsset(issue);
  const coverImageUrl = resolveCoverImageUrl(issue);
  const importedCover = cover.mode === "imported" && Boolean(coverImageUrl);
  const editorsNote = useMemo(() => findEditorsNote(issue), [issue]);
  const orderedArticles = useMemo(() => {
    const articleById = new Map(issue.articles.map((article) => [article.id, article]));
    const placed = [...issue.pages]
      .sort((a, b) => a.order - b.order)
      .flatMap((page) => page.articleId ? [articleById.get(page.articleId)] : [])
      .filter((article): article is Article => Boolean(article));
    const placedIds = new Set(placed.map((article) => article.id));
    return [...placed, ...issue.articles.filter((article) => !placedIds.has(article.id))];
  }, [issue.articles, issue.pages]);
  const stories = useMemo(() => orderedArticles.filter((article) => article.id !== editorsNote?.id), [orderedArticles, editorsNote?.id]);
  const firstArticle = orderedArticles[0];
  const beginHref = firstArticle ? `#${readerAnchor(0, firstArticle.id === editorsNote?.id)}` : "#edition-end";
  const totalReadingTime = useMemo(() => readingMinutes(orderedArticles), [orderedArticles]);
  const typography = issue.typography ?? defaultTypographySettings;

  useEffect(() => {
    const preferenceKey = "lexozine-reader-preferences-v1";
    const positionKey = `lexozine-reader-position:${issue.id}`;
    try {
      const saved = JSON.parse(window.localStorage.getItem(preferenceKey) ?? "{}") as { mode?: ReaderMode; fontStep?: number };
      if (saved.mode === "paper" || saved.mode === "sepia" || saved.mode === "night") setReaderMode(saved.mode);
      if (typeof saved.fontStep === "number") setFontStep(Math.max(-1, Math.min(2, saved.fontStep)));
      const savedPosition = Number(window.localStorage.getItem(positionKey));
      if (Number.isFinite(savedPosition) && savedPosition > 0) setLastPosition(Math.min(savedPosition, 100));
    } catch {}
    setPreferencesReady(true);

    function updateProgress() {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const next = total > 0 ? Math.min(100, Math.max(0, Math.round((window.scrollY / total) * 100))) : 0;
      setProgress(next);
      if (next > 0) {
        setLastPosition(next);
        try { window.localStorage.setItem(positionKey, String(next)); } catch {}
      }
    }

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [issue.id]);

  useEffect(() => {
    if (!preferencesReady) return;
    try { window.localStorage.setItem("lexozine-reader-preferences-v1", JSON.stringify({ mode: readerMode, fontStep })); } catch {}
  }, [preferencesReady, readerMode, fontStep]);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: `Lexozine — ${issue.title}`, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareMessage("Link copied");
        window.setTimeout(() => setShareMessage(""), 1800);
      }
    } catch {}
  }

  function renderBlock(block: StoryBlock, columns: 1 | 2 | 3) {
    const settings = { ...defaultLayoutSettings(block.type, columns), ...(block.layout ?? {}) };
    if (settings.hidden) return null;
    const placement = block.placement ?? defaultImagePlacement;
    const style = { gridColumn: `span ${Math.max(1, Math.min(columns, settings.span))}` };
    if (block.type === "image") return <figure key={block.id} className="edition-composer-block edition-composer-image" style={style}>{block.imageUrl ? <><img src={block.imageUrl} alt={placement.alt} style={{ objectPosition: `${placement.focalX}% ${placement.focalY}%`, objectFit: placement.fit }}/>{placement.caption ? <figcaption>{placement.caption}</figcaption> : null}</> : <div className="edition-composer-placeholder">Editorial image area</div>}</figure>;
    if (block.type === "headline") return <div key={block.id} className="edition-composer-block edition-composer-headline" style={style} dangerouslySetInnerHTML={{ __html: block.content }}/>;
    if (block.type === "deck") return <div key={block.id} className="edition-composer-block edition-composer-deck" style={style} dangerouslySetInnerHTML={{ __html: block.content }}/>;
    if (block.type === "body" && block.layout?.textStyle === "subheading") return <div key={block.id} className="edition-composer-block edition-composer-subheading" style={style} dangerouslySetInnerHTML={{ __html: block.content }}/>;
    if (block.type === "pullquote") return <blockquote key={block.id} className="edition-composer-block edition-composer-quote" style={style} dangerouslySetInnerHTML={{ __html: block.content }}/>;
    if (block.type === "sidebar") return <aside key={block.id} className="edition-composer-block edition-composer-sidebar" style={style} dangerouslySetInnerHTML={{ __html: block.content }}/>;
    if (block.type === "caption") return <div key={block.id} className="edition-composer-block edition-composer-caption" style={style} dangerouslySetInnerHTML={{ __html: block.content }}/>;
    return <div key={block.id} className="edition-composer-block edition-composer-body" style={style} dangerouslySetInnerHTML={{ __html: block.content }}/>;
  }

  function renderEditorsNote(article: Article) {
    const visible = [...article.blocks].sort((a, b) => a.order - b.order).filter((block) => !block.layout?.hidden);
    const headline = visible.find((block) => block.type === "headline");
    const deck = visible.find((block) => block.type === "deck");
    const supporting = visible.filter((block) => block.id !== headline?.id && block.id !== deck?.id);
    return <section className="edition-intro" id="editors-note" key={article.id} aria-labelledby="editors-note-heading"><span className="edition-large-number">EN</span><div><span className="eyebrow">Editor&apos;s note</span><h2 id="editors-note-heading" dangerouslySetInnerHTML={{ __html: headline?.content || article.title }}/><div className="edition-byline"><span>{article.byline}</span><span>{article.readTime}</span></div></div><div className="edition-intro-copy">{deck ? <div className="edition-intro-deck" dangerouslySetInnerHTML={{ __html: deck.content }}/> : null}{supporting.map((block) => block.type === "image" ? (() => { const placement = block.placement ?? defaultImagePlacement; return block.imageUrl ? <figure key={block.id}><img src={block.imageUrl} alt={placement.alt} style={{ objectFit: placement.fit, objectPosition: `${placement.focalX}% ${placement.focalY}%` }}/>{placement.caption ? <figcaption>{placement.caption}</figcaption> : null}</figure> : null; })() : <div key={block.id} className={block.type === "pullquote" ? "edition-intro-quote" : "edition-intro-body"} dangerouslySetInnerHTML={{ __html: block.content }}/>)}</div></section>;
  }

  const coverArtStyle = coverImageUrl ? { backgroundImage: `url(${coverImageUrl})`, backgroundSize: activeCoverAsset?.kind === "wrap" ? "200% 100%" : cover.heroFit, backgroundPosition: activeCoverAsset?.kind === "wrap" ? "right center" : `${cover.heroFocalX}% ${cover.heroFocalY}%`, backgroundRepeat: "no-repeat", backgroundColor: palette.background } : undefined;
  const overlayStyle = cover.overlay.type === "none" ? { opacity: 0 } : cover.overlay.type === "solid" ? { background: cover.overlay.color, opacity: cover.overlay.opacity } : { background: `linear-gradient(180deg, transparent 8%, ${cover.overlay.color} 100%)`, opacity: cover.overlay.opacity };
  const readerStyle = { "--edition-accent": palette.primary, "--issue-display-family": typography.displayFamily, "--issue-body-family": typography.bodyFamily, "--issue-leading": String(typography.leading), "--issue-tracking": `${typography.tracking / 10}px`, "--edition-font-step": `${fontStep}px` } as CSSProperties;

  return <main className={`edition-shell edition-mode-${readerMode} edition-theme-${issue.theme}`} style={readerStyle}>
    <div className="edition-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }}/></div>
    <header className="edition-nav"><button className="edition-menu" onClick={() => setNavOpen((value) => !value)} aria-label={navOpen ? "Close contents" : "Open contents"} aria-expanded={navOpen}><Menu size={18}/></button><div className="edition-brand">{cover.masthead}</div><div className="edition-meta">ISSUE {issue.number} · {issue.editionDate.toUpperCase()} · {totalReadingTime || "—"} MIN READ</div><div className="edition-reader-actions"><button className="edition-reader-control" onClick={() => setFontStep((value) => Math.max(-1, value - 1))} aria-label="Decrease text size" disabled={fontStep <= -1}><Minus size={14}/></button><button className="edition-reader-control" onClick={() => setFontStep((value) => Math.min(2, value + 1))} aria-label="Increase text size" disabled={fontStep >= 2}><Plus size={14}/></button><button className="edition-reader-control" onClick={() => setReaderMode((value) => value === "night" ? "paper" : "night")} aria-label={readerMode === "night" ? "Use light reading mode" : "Use night reading mode"}>{readerMode === "night" ? <Sun size={14}/> : <Moon size={14}/>}</button><button className="edition-share" onClick={() => void share()}><Share2 size={16}/><span>{shareMessage || "Share"}</span></button></div></header>
    {navOpen ? <aside className="edition-drawer" aria-label="Issue contents"><div className="edition-drawer-head"><span className="eyebrow">In this issue</span><button onClick={() => setNavOpen(false)} aria-label="Close contents"><X size={17}/></button></div><p>{issue.title} · {totalReadingTime || "—"} minute read</p>{orderedArticles.map((article, index) => { const isEditorsNote = article.id === editorsNote?.id; return <a key={article.id} href={`#${readerAnchor(index, isEditorsNote)}`} onClick={() => setNavOpen(false)}><span>{isEditorsNote ? "EN" : String(index + 1).padStart(2, "0")}</span>{article.title}</a>; })}{lastPosition > 5 ? <button className="edition-resume" onClick={() => { const total = document.documentElement.scrollHeight - window.innerHeight; window.scrollTo({ top: total * (lastPosition / 100), behavior: "smooth" }); setNavOpen(false); }}><BookOpen size={14}/> Resume at {lastPosition}%</button> : null}</aside> : null}
    <section className={`edition-cover ${importedCover ? "edition-cover-imported" : "edition-cover-generated"}`}>{coverImageUrl ? <div className="edition-cover-art has-photo" style={coverArtStyle}/> : <div className="edition-cover-art"/>}{!importedCover ? <><div className="edition-cover-overlay" style={overlayStyle}/><div className="edition-cover-copy" style={{ textAlign: cover.textAlign }}><span className="edition-kicker">{issue.title} · Issue {issue.number}</span><h1>{cover.mainHeadline}</h1><div>{cover.deck}</div><a href={beginHref} className="edition-read">Begin reading <ArrowDown size={17}/></a></div><div className="edition-coverlines">{cover.lines.map((line) => <span key={line}>{line}</span>)}</div></> : null}</section>
    {orderedArticles.map((article, index) => {
      if (article.id === editorsNote?.id) return renderEditorsNote(article);
      const visibleBlocks = [...article.blocks].sort((a, b) => a.order - b.order).filter((block) => !block.layout?.hidden);
      const storyIndex = stories.findIndex((story) => story.id === article.id);
      const presetClass = `story-category-${classSlug(article.category)}`;
      const longPoetryClass = usesLongPoetryReading(article) ? " story-poetry-long" : "";
      return <article id={readerAnchor(index, false)} key={article.id} className={`edition-story story-layout-${article.layout} ${presetClass}${longPoetryClass} edition-composed-story`}><header className="edition-story-head edition-composed-head"><div className="edition-story-index">{String(storyIndex + 1).padStart(2, "0")}</div><div><span className="edition-story-category">{article.category}</span><div className="edition-byline"><span>{article.byline}</span><span>{article.readTime}</span></div></div></header><div className={`edition-composer-grid cols-${article.columns}`} style={{ gridTemplateColumns: `repeat(${article.columns},minmax(0,1fr))` }}>{visibleBlocks.map((block) => renderBlock(block, article.columns))}</div></article>;
    })}
    <footer className="edition-footer" id="edition-end"><div className="edition-brand">{cover.masthead}</div><p>CREATE · PUBLISH · DIGITIZE · GROW</p><span>LexoGraphix Plus</span></footer>
  </main>;
}
