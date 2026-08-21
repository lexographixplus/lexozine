import type { CSSProperties } from "react";
import type { Issue, StoryBlock } from "@/lib/editor-model";
import { defaultFrameFor, defaultImagePlacement, themeTokens } from "@/lib/editor-model";
import { defaultLayoutSettings } from "@/lib/layout-composer";
import { resolveActiveCoverAsset, resolveCoverDesign, resolveCoverImageUrl, resolveIssuePalette } from "@/lib/magazine-design";

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
  return <div className={`print-frame print-${block.type}`} style={style} dangerouslySetInnerHTML={{__html:block.content}}/>;
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
    <section className="print-page print-toc"><div className="print-toc-number">{issue.number}</div><h1>Contents</h1><p>{issue.description}</p><ol>{issue.articles.map((article,index)=><li key={article.id}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{article.title}</strong><small>{article.category} · {article.byline}</small></div></li>)}</ol></section>
    {issue.articles.map((article,index)=>{
      const hasFrames=article.blocks.some((block)=>block.frame);
      const articleTheme=themeTokens[article.theme];
      const ordered=[...article.blocks].sort((a,b)=>a.order-b.order);
      if(hasFrames) return <section key={article.id} className="print-page print-frame-page" style={{"--print-paper":articleTheme.paper,"--print-ink":articleTheme.ink,"--print-accent":articleTheme.accent} as CSSProperties}><div className="print-running"><span>{cover.masthead}</span><span>{article.category}</span><span>{String(index+1).padStart(2,"0")}</span></div>{ordered.map((block)=><Frame key={block.id} block={block}/>)}</section>;
      return <section key={article.id} className="print-page print-composed-page" style={{"--print-paper":articleTheme.paper,"--print-ink":articleTheme.ink,"--print-accent":articleTheme.accent} as CSSProperties}><div className="print-running"><span>{cover.masthead}</span><span>{article.category}</span><span>{String(index+1).padStart(2,"0")}</span></div><div className="print-composed-meta"><span>{article.category}</span><strong>{article.byline} · {article.readTime}</strong></div><div className="print-composer-grid" style={{gridTemplateColumns:`repeat(${article.columns},minmax(0,1fr))`}}>{ordered.map((block)=><ComposedBlock key={block.id} block={block} columns={article.columns}/>)}</div></section>;
    })}
  </main>;
}
