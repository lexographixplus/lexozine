import type { CSSProperties } from "react";
import type { Issue, StoryBlock } from "@/lib/editor-model";
import { defaultFrameFor, defaultImagePlacement, themeTokens } from "@/lib/editor-model";
import { resolveCoverDesign, resolveCoverImageUrl, resolveIssuePalette } from "@/lib/magazine-design";

function Frame({ block }: { block: StoryBlock }) {
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

export default function PrintEdition({ issue }: { issue: Issue }) {
  const palette = resolveIssuePalette(issue);
  const cover = resolveCoverDesign(issue);
  const coverImageUrl = resolveCoverImageUrl(issue);
  return <main className="print-edition" style={{"--print-paper":palette.background,"--print-ink":palette.ink,"--print-accent":palette.primary} as CSSProperties}>
    <section className="print-page print-cover">
      {coverImageUrl ? <div className="print-cover-photo" style={{backgroundImage:`linear-gradient(180deg,rgba(0,0,0,.08),rgba(0,0,0,${cover.overlay.opacity})),url(${coverImageUrl})`,backgroundPosition:`${cover.heroFocalX}% ${cover.heroFocalY}%`}}/>:<div className="print-cover-art"/>}
      <div className="print-cover-top"><span>ISSUE {issue.number}</span><span>{issue.editionDate}</span></div><div className="print-masthead">{cover.masthead}</div><div className="print-cover-copy" style={{textAlign:cover.textAlign}}><span>{issue.title}</span><h1>{cover.mainHeadline}</h1><p>{cover.deck}</p></div><div className="print-coverlines">{cover.lines.map((line)=><span key={line}>{line}</span>)}</div>
    </section>
    <section className="print-page print-toc"><div className="print-toc-number">{issue.number}</div><h1>Contents</h1><p>{issue.description}</p><ol>{issue.articles.map((article,index)=><li key={article.id}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{article.title}</strong><small>{article.category} · {article.byline}</small></div></li>)}</ol></section>
    {issue.articles.map((article,index)=>{
      const hasFrames=article.blocks.some((block)=>block.frame);
      const articleTheme=themeTokens[article.theme];
      if(hasFrames) return <section key={article.id} className="print-page print-frame-page" style={{"--print-paper":articleTheme.paper,"--print-ink":articleTheme.ink,"--print-accent":articleTheme.accent} as CSSProperties}><div className="print-running"><span>{cover.masthead}</span><span>{article.category}</span><span>{String(index+1).padStart(2,"0")}</span></div>{article.blocks.map((block)=><Frame key={block.id} block={block}/>)}</section>;
      const headline=article.blocks.find((block)=>block.type==="headline"); const deck=article.blocks.find((block)=>block.type==="deck"); const body=article.blocks.filter((block)=>block.type==="body").sort((a,b)=>a.order-b.order); const quote=article.blocks.find((block)=>block.type==="pullquote"); const image=article.blocks.find((block)=>block.type==="image"&&block.imageUrl); const placement=image?.placement??defaultImagePlacement;
      return <section key={article.id} className="print-page print-flow-page"><div className="print-running"><span>{cover.masthead}</span><span>{article.category}</span><span>{String(index+1).padStart(2,"0")}</span></div><header><span>{article.category}</span><h1 dangerouslySetInnerHTML={{__html:headline?.content??article.title}}/><div dangerouslySetInnerHTML={{__html:deck?.content??""}}/><small>{article.byline} · {article.readTime}</small></header>{image?.imageUrl?<figure className="print-flow-image">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={image.imageUrl} alt={placement.alt}/>{placement.caption?<figcaption>{placement.caption}</figcaption>:null}</figure>:null}<div className={`print-flow-copy cols-${article.columns}`}>{body.map((block)=><div key={block.id} dangerouslySetInnerHTML={{__html:block.content}}/>)}{quote?<blockquote dangerouslySetInnerHTML={{__html:quote.content}}/>:null}</div></section>;
    })}
  </main>;
}
