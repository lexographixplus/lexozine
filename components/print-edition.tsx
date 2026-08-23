import type { CSSProperties } from "react";
import type { Article, Issue, StoryBlock } from "@/lib/editor-model";
import { defaultFrameFor, defaultImagePlacement, themeTokens } from "@/lib/editor-model";
import { findEditorsNote } from "@/lib/editors-note";
import { defaultLayoutSettings } from "@/lib/layout-composer";
import { resolveActiveCoverAsset, resolveCoverDesign, resolveCoverImageUrl, resolveIssuePalette } from "@/lib/magazine-design";

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
  return article.blocks
    .filter((block) => block.type === "body")
    .map((block) => textFromHtml(block.content))
    .join("\n");
}

function poetryMetrics(article: Article) {
  const verse = articleText(article);
  const lines = verse.split(/\n+/).map((line) => line.trim()).filter(Boolean).length;
  const characters = verse.replace(/\s+/g, " ").trim().length;
  return { lines, characters };
}

function usesLongPoetryPrint(article: Article) {
  if (classSlug(article.category) !== "poetry") return false;
  const { lines, characters } = poetryMetrics(article);
  return lines >= 32 || characters >= 1900;
}

function usesLongProsePrint(article: Article) {
  if (classSlug(article.category) === "poetry") return false;
  const characters = articleText(article).replace(/\s+/g, " ").trim().length;
  const minutes = Number.parseInt(article.readTime, 10) || 0;
  return characters >= 3000 || minutes >= 4;
}

function Frame({ block }: { block: StoryBlock }) {
  if (block.layout?.hidden) return null;
  const frame = block.frame ?? defaultFrameFor(block.type, block.order);
  const style: CSSProperties = {
    left: `${frame.x}%`,
    top: `${frame.y}%`,
    width: `${frame.width}%`,
    height: `${frame.height}%`,
    transform: `rotate(${frame.rotation}deg)`,
    zIndex: frame.zIndex,
  };
  if (block.type === "image" && block.imageUrl) {
    const placement = block.placement ?? defaultImagePlacement;
    return <figure className="print-frame print-image" style={style}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={block.imageUrl} alt={placement.alt} style={{objectFit:placement.fit,objectPosition:`${placement.focalX}% ${placement.focalY}%`}}/>{placement.caption?<figcaption>{placement.caption}</figcaption>:null}</figure>;
  }
  const presentation = block.type === "body" && block.layout?.textStyle === "subheading" ? "subheading" : block.type;
  return <div className={`print-frame print-${presentation}`} style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
}

function ComposedBlock({ block, columns }: { block: StoryBlock; columns: 1 | 2 | 3 }) {
  const settings = { ...defaultLayoutSettings(block.type, columns), ...(block.layout ?? {}) };
  if (settings.hidden) return null;
  const span = Math.max(1, Math.min(columns, settings.span));
  const style: CSSProperties = { gridColumn: `span ${span}` };
  const placement = block.placement ?? defaultImagePlacement;
  if (block.type === "image") return <figure className="print-composer-block print-composer-image" style={style}>{block.imageUrl ? <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={block.imageUrl} alt={placement.alt} style={{objectFit:placement.fit,objectPosition:`${placement.focalX}% ${placement.focalY}%`}}/>{placement.caption?<figcaption>{placement.caption}</figcaption>:null}</> : null}</figure>;
  if (block.type === "headline") return <div className="print-composer-block print-composer-headline" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
  if (block.type === "deck") return <div className="print-composer-block print-composer-deck" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
  if (block.type === "body" && block.layout?.textStyle === "subheading") return <div className="print-composer-block print-composer-subheading" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
  if (block.type === "pullquote") return <blockquote className="print-composer-block print-composer-quote" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
  if (block.type === "sidebar") return <aside className="print-composer-block print-composer-sidebar" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
  if (block.type === "caption") return <div className="print-composer-block print-composer-caption" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
  return <div className="print-composer-block print-composer-body" style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
}

export default function PrintEdition({ issue }: { issue: Issue }) {
  const palette = resolveIssuePalette(issue);
  const cover = resolveCoverDesign(issue);
  const activeCoverAsset = resolveActiveCoverAsset(issue);
  const coverImageUrl = resolveCoverImageUrl(issue);
  const importedCover = cover.mode === "imported" && Boolean(coverImageUrl);
  const editorsNote = findEditorsNote(issue);
  const articleById = new Map(issue.articles.map((article) => [article.id, article]));
  const placedArticles = [...issue.pages]
    .sort((a, b) => a.order - b.order)
    .flatMap((page) => page.articleId ? [articleById.get(page.articleId)] : [])
    .filter((article): article is Article => Boolean(article));
  const placedIds = new Set(placedArticles.map((article) => article.id));
  const orderedArticles = [...placedArticles, ...issue.articles.filter((article) => !placedIds.has(article.id))];
  const stories = orderedArticles.filter((article) => article.id !== editorsNote?.id);
  const contributors = [...new Set(stories.map((article) => article.byline.trim()).filter(Boolean))];
  const coverPhotoStyle: CSSProperties | undefined = coverImageUrl ? {
    backgroundImage: `url(${coverImageUrl})`,
    backgroundSize: activeCoverAsset?.kind === "wrap" ? "200% 100%" : cover.heroFit,
    backgroundPosition: activeCoverAsset?.kind === "wrap" ? "right center" : `${cover.heroFocalX}% ${cover.heroFocalY}%`,
    backgroundRepeat: "no-repeat",
    backgroundColor: palette.background,
  } : undefined;
  const overlayStyle: CSSProperties = cover.overlay.type === "none"
    ? { opacity: 0 }
    : cover.overlay.type === "solid"
      ? { background: cover.overlay.color, opacity: cover.overlay.opacity }
      : { background: `linear-gradient(180deg, transparent 8%, ${cover.overlay.color} 100%)`, opacity: cover.overlay.opacity };

  return <main className="print-edition" style={{"--print-paper":palette.background,"--print-ink":palette.ink,"--print-accent":palette.primary} as CSSProperties}>
    <section className={`print-page print-cover ${importedCover ? "print-cover-imported" : "print-cover-generated"}`}>
      {coverImageUrl ? <div className="print-cover-photo" style={coverPhotoStyle}/>:<div className="print-cover-art"/>}
      {!importedCover ? <><div className="print-cover-overlay" style={overlayStyle}/><div className="print-cover-top"><span>ISSUE {issue.number}</span><span>{issue.editionDate}</span></div><div className="print-masthead">{cover.masthead}</div><div className="print-cover-copy" style={{textAlign:cover.textAlign}}><span>{issue.title}</span><h1>{cover.mainHeadline}</h1><p>{cover.deck}</p></div><div className="print-coverlines">{cover.lines.map((line)=><span key={line}>{line}</span>)}</div></> : null}
    </section>
    <section className="print-page print-toc"><div className="print-toc-number">{issue.number}</div><h1>Contents</h1><p>{issue.description}</p><ol>{editorsNote ? <li key={editorsNote.id}><span>EN</span><div><strong>{editorsNote.title}</strong><small>Editor&apos;s Note · {editorsNote.byline}</small></div></li> : null}{stories.map((article,index)=><li key={article.id}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{article.title}</strong><small>{article.category} · {article.byline}</small></div></li>)}</ol></section>
    {editorsNote ? (() => {
      const articleTheme=themeTokens[editorsNote.theme];
      const ordered=[...editorsNote.blocks].sort((a,b)=>a.order-b.order);
      return <section key={editorsNote.id} className="print-page print-composed-page print-editors-note print-category-editorial" style={{"--print-paper":articleTheme.paper,"--print-ink":articleTheme.ink,"--print-accent":articleTheme.accent} as CSSProperties}><div className="print-running"><span>{cover.masthead}</span><span>Editor&apos;s Note</span><span>EN</span></div><div className="print-composed-meta"><span>Editor&apos;s Note</span><strong>{editorsNote.byline} · {editorsNote.readTime}</strong></div><div className="print-composer-grid" style={{gridTemplateColumns:`repeat(${editorsNote.columns},minmax(0,1fr))`}}>{ordered.map((block)=><ComposedBlock key={block.id} block={block} columns={editorsNote.columns}/>)}</div></section>;
    })() : null}
    {stories.map((article,index)=>{
      const hasFrames=article.blocks.some((block)=>block.frame);
      const articleTheme=themeTokens[article.theme];
      const ordered=[...article.blocks].sort((a,b)=>a.order-b.order);
      const presetClass=`print-category-${classSlug(article.category)}`;
      const longPoetryClass=usesLongPoetryPrint(article) ? " print-poetry-long" : "";
      const longProseClass=usesLongProsePrint(article) ? " print-prose-long" : "";
      if(hasFrames) return <section key={article.id} className={`print-page print-frame-page ${presetClass}${longPoetryClass}${longProseClass}`} style={{"--print-paper":articleTheme.paper,"--print-ink":articleTheme.ink,"--print-accent":articleTheme.accent} as CSSProperties}><div className="print-running"><span>{cover.masthead}</span><span>{article.category}</span><span>{String(index+1).padStart(2,"0")}</span></div>{ordered.map((block)=><Frame key={block.id} block={block}/>)}</section>;
      return <section key={article.id} className={`print-page print-composed-page ${presetClass}${longPoetryClass}${longProseClass}`} style={{"--print-paper":articleTheme.paper,"--print-ink":articleTheme.ink,"--print-accent":articleTheme.accent} as CSSProperties}><div className="print-running"><span>{cover.masthead}</span><span>{article.category}</span><span>{String(index+1).padStart(2,"0")}</span></div><div className="print-composed-meta"><span>{article.category}</span><strong>{article.byline} · {article.readTime}</strong></div><div className="print-composer-grid" style={{gridTemplateColumns:`repeat(${article.columns},minmax(0,1fr))`}}>{ordered.map((block)=><ComposedBlock key={block.id} block={block} columns={article.columns}/>)}</div></section>;
    })}
    <section className="print-page print-colophon"><div><span className="print-colophon-label">Colophon</span><div className="print-colophon-masthead">{cover.masthead}</div></div><div className="print-colophon-copy"><p><strong>{issue.title}</strong> is a fixed-page PDF edition, composed independently for A4 reading and print.</p><p>Published by LexoGraphix Plus · Issue {issue.number} · {issue.editionDate}</p></div><div><span className="print-colophon-label">Contributors</span><p className="print-colophon-contributors">{contributors.join(" · ") || "Contributor credits forthcoming"}</p></div></section>
  </main>;
}
