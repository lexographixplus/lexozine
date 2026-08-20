"use client";

import { ArrowDown, Menu, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createIssueTemplate } from "@/lib/issue-templates";
import { Issue, defaultImagePlacement } from "@/lib/editor-model";
import { resolveCoverDesign, resolveCoverImageUrl, resolveIssuePalette } from "@/lib/magazine-design";

export default function DigitalEdition({ initialIssue }: { initialIssue?: Issue }) {
  const [issue] = useState<Issue>(() => initialIssue ?? createIssueTemplate("editorial"));
  const [navOpen, setNavOpen] = useState(false);

  const palette = resolveIssuePalette(issue);
  const cover = resolveCoverDesign(issue);
  const coverImageUrl = resolveCoverImageUrl(issue);
  const stories = useMemo(() => issue.articles, [issue.articles]);

  async function share() {
    const url = window.location.href;
    if (navigator.share) await navigator.share({ title: `Lexozine — ${issue.title}`, url });
    else await navigator.clipboard.writeText(url);
  }

  return (
    <main className="edition-shell" style={{ "--edition-accent": palette.primary } as React.CSSProperties}>
      <header className="edition-nav"><button className="edition-menu" onClick={() => setNavOpen((value) => !value)} aria-label="Toggle contents"><Menu size={18} /></button><div className="edition-brand">{cover.masthead}</div><div className="edition-meta">ISSUE {issue.number} · {issue.editionDate.toUpperCase()}</div><button className="edition-share" onClick={share}><Share2 size={16} /><span>Share</span></button></header>

      {navOpen ? <aside className="edition-drawer"><span className="eyebrow">In this issue</span>{stories.map((story, index) => <a key={story.id} href={`#story-${index + 1}`} onClick={() => setNavOpen(false)}><span>{String(index + 1).padStart(2,"0")}</span>{story.title}</a>)}</aside> : null}

      <section className="edition-cover">
        {coverImageUrl ? <div className="edition-cover-art has-photo" style={{ backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.12),rgba(0,0,0,${cover.overlay.opacity})),url(${coverImageUrl})`, backgroundPosition: `${cover.heroFocalX}% ${cover.heroFocalY}%` }} /> : <div className="edition-cover-art" />}
        <div className="edition-cover-copy" style={{ textAlign: cover.textAlign }}><span className="edition-kicker">{issue.title} · Issue {issue.number}</span><h1>{cover.mainHeadline}</h1><div>{cover.deck}</div><a href="#story-1" className="edition-read">Begin reading <ArrowDown size={17} /></a></div>
        <div className="edition-coverlines">{cover.lines.map((line) => <span key={line}>{line}</span>)}</div>
      </section>

      <section className="edition-intro"><span className="edition-large-number">{issue.number}</span><div><span className="eyebrow">Editor&apos;s note</span><h2>{issue.title}</h2></div><p>{issue.description}</p></section>

      {stories.map((story, index) => {
        const body = story.blocks.filter((block) => block.type === "body").sort((a,b)=>a.order-b.order);
        const quote = story.blocks.find((block) => block.type === "pullquote");
        const image = story.blocks.find((block) => block.type === "image" && block.imageUrl);
        const placement = image?.placement ?? defaultImagePlacement;
        return <article id={`story-${index + 1}`} key={story.id} className={`edition-story story-layout-${story.layout}`}><header className="edition-story-head"><div className="edition-story-index">{String(index+1).padStart(2,"0")}</div><div><span className="edition-story-category">{story.category}</span><h2>{story.title}</h2><div dangerouslySetInnerHTML={{ __html: story.blocks.find((block) => block.type === "deck")?.content ?? "" }} /><div className="edition-byline"><span>{story.byline}</span><span>{story.readTime}</span></div></div></header>{image?.imageUrl ? <figure className="edition-visual has-image">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={image.imageUrl} alt={placement.alt} style={{objectPosition:`${placement.focalX}% ${placement.focalY}%`,objectFit:placement.fit}}/>{placement.caption?<figcaption>{placement.caption}</figcaption>:null}</figure> : <div className={`edition-visual visual-${index + 1}`}><span>Editorial image area</span></div>}<div className="edition-story-body"><div className="edition-prose">{body.map((block, bodyIndex) => <div key={block.id} className={bodyIndex === 0 ? "edition-dropcap" : ""} dangerouslySetInnerHTML={{__html:block.content}} />)}</div>{quote ? <blockquote dangerouslySetInnerHTML={{__html:quote.content}} /> : null}</div></article>;
      })}

      <footer className="edition-footer"><div className="edition-brand">{cover.masthead}</div><p>CREATE · PUBLISH · DIGITIZE · GROW</p><span>LexoGraphix Plus</span></footer>
    </main>
  );
}
