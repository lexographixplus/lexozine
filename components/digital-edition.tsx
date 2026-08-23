"use client";

import { ArrowDown, ArrowLeft, ArrowRight, BookOpen, Link2, Menu, Minus, Moon, Plus, Share2, SlidersHorizontal, Sun, X } from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Article, Issue, StoryBlock, defaultImagePlacement, defaultTypographySettings } from "@/lib/editor-model";
import { findEditorsNote } from "@/lib/editors-note";
import { createIssueTemplate } from "@/lib/issue-templates";
import { defaultLayoutSettings } from "@/lib/layout-composer";
import { resolveActiveCoverAsset, resolveCoverDesign, resolveCoverImageUrl, resolveIssuePalette } from "@/lib/magazine-design";

type ReaderMode = "paper" | "sepia" | "night";
type ReaderExperience = "paged" | "continuous";

type ReaderContentItem = {
  article: Article;
  anchor: string;
  isEditorsNote: boolean;
  label: string;
  section: string;
  page: number;
};

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [readerMode, setReaderMode] = useState<ReaderMode>("paper");
  const [readerExperience, setReaderExperience] = useState<ReaderExperience>("paged");
  const [fontStep, setFontStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [lastPosition, setLastPosition] = useState(0);
  const [shareMessage, setShareMessage] = useState("");
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState("editors-note");
  const [currentPage, setCurrentPage] = useState(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

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
  const contentItems = useMemo<ReaderContentItem[]>(() => {
    let storyNumber = 0;
    return orderedArticles.map((article, index) => {
      const isEditorsNote = article.id === editorsNote?.id;
      if (!isEditorsNote) storyNumber += 1;
      return {
        article,
        anchor: readerAnchor(index, isEditorsNote),
        isEditorsNote,
        label: isEditorsNote ? "EN" : String(storyNumber).padStart(2, "0"),
        section: isEditorsNote ? "Opening" : article.category || "Stories",
        page: index + 1,
      };
    });
  }, [orderedArticles, editorsNote?.id]);
  const contentGroups = useMemo(() => {
    const groups = new Map<string, ReaderContentItem[]>();
    contentItems.forEach((item) => groups.set(item.section, [...(groups.get(item.section) ?? []), item]));
    return [...groups.entries()].map(([section, items]) => ({ section, items }));
  }, [contentItems]);
  const contributors = useMemo(() => [...new Set(stories.map((article) => article.byline.trim()).filter(Boolean))], [stories]);
  const firstArticle = orderedArticles[0];
  const beginHref = firstArticle ? `#${readerAnchor(0, firstArticle.id === editorsNote?.id)}` : "#edition-end";
  const lastPage = contentItems.length + 1;
  const totalReadingTime = useMemo(() => readingMinutes(orderedArticles), [orderedArticles]);
  const typography = issue.typography ?? defaultTypographySettings;

  function goToPage(page: number) {
    const nextPage = Math.max(0, Math.min(lastPage, page));
    setCurrentPage(nextPage);
    const item = contentItems[nextPage - 1];
    const anchor = item?.anchor ?? (nextPage === lastPage ? "edition-end" : "");
    if (anchor) {
      setActiveAnchor(anchor);
      try { window.history.replaceState(null, "", `#${anchor}`); } catch {}
    }
    window.scrollTo({ top: 0 });
  }

  function goToContentItem(item: ReaderContentItem) {
    if (readerExperience === "paged") goToPage(item.page);
    else document.getElementById(item.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setNavOpen(false);
  }

  function readerPageClass(page: number, className: string) {
    return `${className} edition-reader-page${readerExperience === "paged" ? currentPage === page ? " is-active" : " is-inactive" : ""}`;
  }

  useEffect(() => {
    const preferenceKey = "lexozine-reader-preferences-v1";
    const positionKey = `lexozine-reader-position:${issue.id}`;
    try {
      const saved = JSON.parse(window.localStorage.getItem(preferenceKey) ?? "{}") as { mode?: ReaderMode; fontStep?: number; experience?: ReaderExperience };
      if (saved.mode === "paper" || saved.mode === "sepia" || saved.mode === "night") setReaderMode(saved.mode);
      if (saved.experience === "paged" || saved.experience === "continuous") setReaderExperience(saved.experience);
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

    if (readerExperience === "continuous") {
      updateProgress();
      window.addEventListener("scroll", updateProgress, { passive: true });
      window.addEventListener("resize", updateProgress);
      return () => {
        window.removeEventListener("scroll", updateProgress);
        window.removeEventListener("resize", updateProgress);
      };
    }
  }, [issue.id, readerExperience]);

  useEffect(() => {
    if (readerExperience !== "paged") return;
    const savedPageKey = `lexozine-reader-page:${issue.id}`;
    const requestedAnchor = window.location.hash.slice(1);
    const matchingItem = contentItems.find((item) => item.anchor === requestedAnchor);
    const savedPage = Number(window.localStorage.getItem(savedPageKey));
    const nextPage = matchingItem?.page ?? (Number.isFinite(savedPage) ? Math.max(0, Math.min(lastPage, savedPage)) : 0);
    setCurrentPage(nextPage);
  }, [contentItems, issue.id, lastPage, readerExperience]);

  useEffect(() => {
    if (readerExperience !== "paged") return;
    const nextProgress = lastPage > 0 ? Math.round((currentPage / lastPage) * 100) : 0;
    setProgress(nextProgress);
    try { window.localStorage.setItem(`lexozine-reader-page:${issue.id}`, String(currentPage)); } catch {}
  }, [currentPage, issue.id, lastPage, readerExperience]);

  useEffect(() => {
    const targets = contentItems
      .map((item) => document.getElementById(item.anchor))
      .filter((target): target is HTMLElement => Boolean(target));
    if (readerExperience !== "continuous" || !targets.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible?.target.id) setActiveAnchor((current) => current === visible.target.id ? current : visible.target.id);
    }, { rootMargin: "-18% 0px -68% 0px", threshold: 0.01 });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [contentItems, readerExperience]);

  useEffect(() => {
    if (!preferencesReady) return;
    try { window.localStorage.setItem("lexozine-reader-preferences-v1", JSON.stringify({ mode: readerMode, fontStep, experience: readerExperience })); } catch {}
  }, [preferencesReady, readerMode, fontStep, readerExperience]);

  useEffect(() => {
    if (readerExperience !== "paged") return;
    function handleKeydown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']") || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowLeft") { event.preventDefault(); goToPage(currentPage - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); goToPage(currentPage + 1); }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [currentPage, readerExperience]);

  async function share(title: string, url: string, copiedMessage = "Link copied") {
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareMessage(copiedMessage);
        window.setTimeout(() => setShareMessage(""), 1800);
      }
    } catch {}
  }

  function shareIssue() {
    return share(`Lexozine — ${issue.title}`, window.location.href);
  }

  function shareStory(article: Article, anchor: string) {
    const url = new URL(window.location.href);
    url.hash = anchor;
    return share(`${article.title} · ${issue.title}`, url.toString(), "Piece link copied");
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

  function renderEditorsNote(article: Article, page: number) {
    const visible = [...article.blocks].sort((a, b) => a.order - b.order).filter((block) => !block.layout?.hidden);
    const headline = visible.find((block) => block.type === "headline");
    const deck = visible.find((block) => block.type === "deck");
    const supporting = visible.filter((block) => block.id !== headline?.id && block.id !== deck?.id);
    return <section className={readerPageClass(page, "edition-intro")} id="editors-note" key={article.id} aria-labelledby="editors-note-heading"><span className="edition-large-number">EN</span><div><span className="eyebrow">Editor&apos;s note</span><h2 id="editors-note-heading" dangerouslySetInnerHTML={{ __html: headline?.content || article.title }}/><div className="edition-byline"><span>{article.byline}</span><span>{article.readTime}</span></div></div><div className="edition-intro-copy">{deck ? <div className="edition-intro-deck" dangerouslySetInnerHTML={{ __html: deck.content }}/> : null}{supporting.map((block) => block.type === "image" ? (() => { const placement = block.placement ?? defaultImagePlacement; return block.imageUrl ? <figure key={block.id}><img src={block.imageUrl} alt={placement.alt} style={{ objectFit: placement.fit, objectPosition: `${placement.focalX}% ${placement.focalY}%` }}/>{placement.caption ? <figcaption>{placement.caption}</figcaption> : null}</figure> : null; })() : <div key={block.id} className={block.type === "pullquote" ? "edition-intro-quote" : "edition-intro-body"} dangerouslySetInnerHTML={{ __html: block.content }}/>)}</div></section>;
  }

  const coverArtStyle = coverImageUrl ? { backgroundImage: `url(${coverImageUrl})`, backgroundSize: activeCoverAsset?.kind === "wrap" ? "200% 100%" : cover.heroFit, backgroundPosition: activeCoverAsset?.kind === "wrap" ? "right center" : `${cover.heroFocalX}% ${cover.heroFocalY}%`, backgroundRepeat: "no-repeat", backgroundColor: palette.background } : undefined;
  const overlayStyle = cover.overlay.type === "none" ? { opacity: 0 } : cover.overlay.type === "solid" ? { background: cover.overlay.color, opacity: cover.overlay.opacity } : { background: `linear-gradient(180deg, transparent 8%, ${cover.overlay.color} 100%)`, opacity: cover.overlay.opacity };
  const readerStyle = { "--edition-accent": palette.primary, "--issue-display-family": typography.displayFamily, "--issue-body-family": typography.bodyFamily, "--issue-leading": String(typography.leading), "--issue-tracking": `${typography.tracking / 10}px`, "--edition-font-step": `${fontStep}px` } as CSSProperties;

  return <main className={`edition-shell edition-mode-${readerMode} edition-theme-${issue.theme} edition-experience-${readerExperience}`} style={readerStyle}>
    <div className="edition-progress" aria-hidden="true"><span style={{ transform: `scaleX(${progress / 100})` }}/></div>
    <header className="edition-nav"><button className="edition-menu" onClick={() => { setNavOpen((value) => !value); setSettingsOpen(false); }} aria-label={navOpen ? "Close contents" : "Open contents"} aria-expanded={navOpen}><Menu size={18}/></button><div className="edition-brand">{cover.masthead}</div><div className="edition-meta">ISSUE {issue.number} · {issue.editionDate.toUpperCase()} · {totalReadingTime || "—"} MIN READ</div><div className="edition-reader-actions"><button className="edition-experience-toggle" onClick={() => setReaderExperience((value) => value === "paged" ? "continuous" : "paged")} aria-label={readerExperience === "paged" ? "Use continuous reading" : "Use page-by-page reading"}><span>{readerExperience === "paged" ? "Pages" : "Scroll"}</span></button><button className="edition-reader-control" onClick={() => setFontStep((value) => Math.max(-1, value - 1))} aria-label="Decrease text size" disabled={fontStep <= -1}><Minus size={14}/></button><button className="edition-reader-control" onClick={() => setFontStep((value) => Math.min(2, value + 1))} aria-label="Increase text size" disabled={fontStep >= 2}><Plus size={14}/></button><button className="edition-reader-control" onClick={() => setReaderMode((value) => value === "night" ? "paper" : "night")} aria-label={readerMode === "night" ? "Use light reading mode" : "Use night reading mode"}>{readerMode === "night" ? <Sun size={14}/> : <Moon size={14}/>}</button><button className="edition-settings-trigger" onClick={() => { setSettingsOpen((value) => !value); setNavOpen(false); }} aria-label="Reader settings" aria-expanded={settingsOpen}><SlidersHorizontal size={15}/></button><button className="edition-share" onClick={() => void shareIssue()}><Share2 size={16}/><span>{shareMessage || "Share"}</span></button></div></header>
    {settingsOpen ? <section className="edition-reader-settings" aria-label="Reader settings"><div><span>Text size</span><button onClick={() => setFontStep((value) => Math.max(-1, value - 1))} disabled={fontStep <= -1} aria-label="Decrease text size"><Minus size={14}/></button><button onClick={() => setFontStep((value) => Math.min(2, value + 1))} disabled={fontStep >= 2} aria-label="Increase text size"><Plus size={14}/></button></div><div><span>Reading mode</span>{(["paper", "sepia", "night"] as ReaderMode[]).map((mode) => <button key={mode} className={readerMode === mode ? "active" : ""} onClick={() => setReaderMode(mode)}>{mode}</button>)}</div><div><span>Reading style</span>{(["paged", "continuous"] as ReaderExperience[]).map((experience) => <button key={experience} className={readerExperience === experience ? "active" : ""} onClick={() => setReaderExperience(experience)}>{experience === "paged" ? "Pages" : "Scroll"}</button>)}</div></section> : null}
    {navOpen ? <aside className="edition-drawer" aria-label="Issue contents"><div className="edition-drawer-head"><span className="eyebrow">In this issue</span><button onClick={() => setNavOpen(false)} aria-label="Close contents"><X size={17}/></button></div><p>{issue.title} · {totalReadingTime || "—"} minute read</p><div className="edition-drawer-groups">{contentGroups.map((group) => <section key={group.section}><h2>{group.section}</h2>{group.items.map((item) => <a key={item.article.id} className={activeAnchor === item.anchor ? "active" : ""} href={`#${item.anchor}`} onClick={(event) => { if (readerExperience === "paged") event.preventDefault(); goToContentItem(item); }}><span>{item.label}</span>{item.article.title}</a>)}</section>)}</div>{readerExperience === "continuous" && lastPosition > 5 ? <button className="edition-resume" onClick={() => { const total = document.documentElement.scrollHeight - window.innerHeight; window.scrollTo({ top: total * (lastPosition / 100), behavior: "smooth" }); setNavOpen(false); }}><BookOpen size={14}/> Resume at {lastPosition}%</button> : null}</aside> : null}
    <section className="edition-reading-stage" onTouchStart={(event) => { touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={(event) => { const start = touchStart.current; touchStart.current = null; if (readerExperience !== "paged" || !start) return; const deltaX = event.changedTouches[0].clientX - start.x; const deltaY = event.changedTouches[0].clientY - start.y; if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return; goToPage(deltaX < 0 ? currentPage + 1 : currentPage - 1); }}>
    <section className={readerPageClass(0, `edition-cover ${importedCover ? "edition-cover-imported" : "edition-cover-generated"}`)}>{coverImageUrl ? <div className="edition-cover-art has-photo" style={coverArtStyle}/> : <div className="edition-cover-art"/>}{!importedCover ? <><div className="edition-cover-overlay" style={overlayStyle}/><div className="edition-cover-copy" style={{ textAlign: cover.textAlign }}><span className="edition-kicker">{issue.title} · Issue {issue.number}</span><h1>{cover.mainHeadline}</h1><div>{cover.deck}</div><a href={beginHref} onClick={(event) => { if (readerExperience === "paged") { event.preventDefault(); goToPage(1); } }} className="edition-read">Begin reading <ArrowDown size={17}/></a></div><div className="edition-coverlines">{cover.lines.map((line) => <span key={line}>{line}</span>)}</div></> : null}</section>
    {orderedArticles.map((article, index) => {
      if (article.id === editorsNote?.id) return renderEditorsNote(article, index + 1);
      const visibleBlocks = [...article.blocks].sort((a, b) => a.order - b.order).filter((block) => !block.layout?.hidden);
      const storyIndex = stories.findIndex((story) => story.id === article.id);
      const presetClass = `story-category-${classSlug(article.category)}`;
      const longPoetryClass = usesLongPoetryReading(article) ? " story-poetry-long" : "";
      const previousArticle = orderedArticles[index - 1];
      const compactPoetryClass = classSlug(article.category) === "poetry" && classSlug(previousArticle?.category ?? "") === "poetry" ? " story-poetry-compact" : "";
      const nextArticle = orderedArticles[index + 1];
      const anchor = readerAnchor(index, false);
      return <article id={anchor} key={article.id} className={readerPageClass(index + 1, `edition-story story-layout-${article.layout} ${presetClass}${longPoetryClass}${compactPoetryClass} edition-composed-story`)}><header className="edition-story-head edition-composed-head"><div className="edition-story-index">{String(storyIndex + 1).padStart(2, "0")}</div><div><span className="edition-story-category">{article.category}</span><div className="edition-byline"><span>{article.byline}</span><span>{article.readTime}</span><button className="edition-story-share" onClick={() => void shareStory(article, anchor)}><Link2 size={13}/><span>Share piece</span></button></div></div></header><div className={`edition-composer-grid cols-${article.columns}`} style={{ gridTemplateColumns: `repeat(${article.columns},minmax(0,1fr))` }}>{visibleBlocks.map((block) => renderBlock(block, article.columns))}</div><aside className="edition-next-piece">{nextArticle ? <><span>Continue reading</span><a href={`#${readerAnchor(index + 1, nextArticle.id === editorsNote?.id)}`} onClick={(event) => { if (readerExperience === "paged") { event.preventDefault(); goToPage(index + 2); } }}>{nextArticle.title}<ArrowDown size={15}/></a></> : <a href="#edition-end" onClick={(event) => { if (readerExperience === "paged") { event.preventDefault(); goToPage(lastPage); } }}>Finish issue<ArrowDown size={15}/></a>}</aside></article>;
    })}
    <footer className={readerPageClass(lastPage, "edition-footer edition-colophon")} id="edition-end"><div><div className="edition-brand">{cover.masthead}</div><span>Issue {issue.number} · {issue.editionDate}</span></div><div><span className="edition-colophon-label">Contributors</span><p>{contributors.join(" · ") || "Contributor credits forthcoming"}</p></div><span>Published by LexoGraphix Plus</span></footer>
    </section>
    {readerExperience === "paged" ? <nav className="edition-page-controls" aria-label="Page navigation"><button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0} aria-label="Previous page"><ArrowLeft size={18}/><span>Previous</span></button><div><span>{currentPage === 0 ? "Cover" : currentPage === lastPage ? "Colophon" : contentItems[currentPage - 1]?.label}</span><strong>{currentPage + 1} / {lastPage + 1}</strong></div><button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === lastPage} aria-label="Next page"><span>Next</span><ArrowRight size={18}/></button></nav> : null}
  </main>;
}
