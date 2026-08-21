"use client";

import { ArrowDown, Menu, Share2 } from "lucide-react";
import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { createIssueTemplate } from "@/lib/issue-templates";
import { Issue, StoryBlock, defaultImagePlacement } from "@/lib/editor-model";
import { defaultLayoutSettings } from "@/lib/layout-composer";
import { resolveActiveCoverAsset, resolveCoverDesign, resolveCoverImageUrl, resolveIssuePalette } from "@/lib/magazine-design";

export default function DigitalEdition({ initialIssue }: { initialIssue?: Issue }) {
  const [issue] = useState<Issue>(() => initialIssue ?? createIssueTemplate("editorial"));
  const [navOpen, setNavOpen] = useState(false);

  const palette = resolveIssuePalette(issue);
  const cover = resolveCoverDesign(issue);
  const activeCoverAsset = resolveActiveCoverAsset(issue);
  const coverImageUrl = resolveCoverImageUrl(issue);
  const importedCover = cover.mode === "imported" && Boolean(coverImageUrl);
  const stories = useMemo(() => issue.articles, [issue.articles]);

  async function share() {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: `Lexozine — ${issue.title}`, url });
    else await navigator.clipboard.writeText(url);
  }

  function renderBlock(block: StoryBlock, columns: 1 | 2 | 3) {
    const settings = { ...defaultLayoutSettings(block.type, columns), ...(block.layout ?? {}) };
    if (settings.hidden) return null;
    const span = Math.max(1, Math.min(columns, settings.span));
    const placement = block.placement ?? defaultImagePlacement;
    const style = { gridColumn: `span ${span}` };
    if (block.type === "image") return <figure key={block.id} className="edition-composer-block edition-composer-image" style={style}>{block.imageUrl ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={block.imageUrl} alt={placement.alt} style={{objectPosition:`${placement.focalX}% ${placement.focalY}%`,objectFit:placement.fit}}/>{placement.caption?<figcaption>{placement.caption}</figcaption>:null}</> : <div className="edition-composer-placeholder">Editorial image area</div>}</figure>;
    if (block.type === "headline") return <div key={block.id} className="edition-composer-block edition-composer-headline" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
    if (block.type === "deck") return <div key={block.id} className="edition-composer-block edition-composer-deck" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
    if (block.type === "pullquote") return <blockquote key={block.id} className="edition-composer-block edition-composer-quote" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
    if (block.type === "sidebar") return <aside key={block.id} className="edition-composer-block edition-composer-sidebar" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
    if (block.type === "caption") return <div key={block.id} className="edition-composer-block edition-composer-caption" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
    return <div key={block.id} className="edition-composer-block edition-composer-body" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
  }

  const coverArtStyle = coverImageUrl ? {
    backgroundImage: `url(${coverImageUrl})`,
    backgroundSize: activeCoverAsset?.kind === "wrap" ? "200% 100%" : cover.heroFit,
    backgroundPosition: activeCoverAsset?.kind === "wrap" ? "right center" : `${cover.heroFocalX}% ${cover.heroFocalY}%`,
    backgroundRepeat: "no-repeat",
    backgroundColor: palette.background,
  } : undefined;
  const overlayStyle = cover.overlay.type === "none"
    ? { opacity: 0 }
    : cover.overlay.type === "solid"
      ? { background: cover.overlay.color, opacity: cover.overlay.opacity }
      : { background: `linear-gradient(180deg, transparent 8%, ${cover.overlay.color} 100%)`, opacity: cover.overlay.opacity };

  return (
    <main className="edition-shell" style={{ "--edition-accent": palette.primary } as CSSProperties}>
      <header className="edition-nav"><button className="edition-menu" onClick={() => setNavOpen((value) => !value)} aria-label="Toggle contents"><Menu size={18} /></button><div className="edition-brand">{cover.masthead}</div><div className="edition-meta">ISSUE {issue.number} · {issue.editionDate.toUpperCase()}</div><button className="edition-share" onClick={share}><Share2 size={16} /><span>Share</span></button></header>

      {navOpen ? <aside className="edition-drawer"><span className="eyebrow">In this issue</span>{stories.map((story, index) => <a key={story.id} href={`#story-${index + 1}`} onClick={() => setNavOpen(false)}><span>{String(index + 1).padStart(2,"0")}</span>{story.title}</a>)}</aside> : null}

      <section className={`edition-cover ${importedCover ? "edition-cover-imported" : "edition-cover-generated"}`}>
        {coverImageUrl ? <div className="edition-cover-art has-photo" style={coverArtStyle} /> : <div className="edition-cover-art" />}
        {!importedCover ? <><div className="edition-cover-overlay" style={overlayStyle}/><div className="edition-cover-copy" style={{ textAlign: cover.textAlign }}><span className="edition-kicker">{issue.title} · Issue {issue.number}</span><h1>{cover.mainHeadline}</h1><div>{cover.deck}</div><a href="#story-1" className="edition-read">Begin reading <ArrowDown size={17} /></a></div><div className="edition-coverlines">{cover.lines.map((line) => <span key={line}>{line}</span>)}</div></> : null}
      </section>

      <section className="edition-intro"><span className="edition-large-number">{issue.number}</span><div><span className="eyebrow">Editor&apos;s note</span><h2>{issue.title}</h2></div><p>{issue.description}</p></section>

      {stories.map((story, index) => {
        const visibleBlocks = [...story.blocks].sort((a,b)=>a.order-b.order).filter((block)=>!block.layout?.hidden);
        return <article id={`story-${index + 1}`} key={story.id} className={`edition-story story-layout-${story.layout} edition-composed-story`}><header className="edition-story-head edition-composed-head"><div className="edition-story-index">{String(index+1).padStart(2,"0")}</div><div><span className="edition-story-category">{story.category}</span><div className="edition-byline"><span>{story.byline}</span><span>{story.readTime}</span></div></div></header><div className={`edition-composer-grid cols-${story.columns}`} style={{gridTemplateColumns:`repeat(${story.columns},minmax(0,1fr))`}}>{visibleBlocks.map((block)=>renderBlock(block,story.columns))}</div></article>;
      })}

      <footer className="edition-footer"><div className="edition-brand">{cover.masthead}</div><p>CREATE · PUBLISH · DIGITIZE · GROW</p><span>LexoGraphix Plus</span></footer>
    </main>
  );
}
