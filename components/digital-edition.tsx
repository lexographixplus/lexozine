"use client";

import { ArrowDown, BookOpen, Menu, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createIssueTemplate } from "@/lib/issue-templates";
import { themeTokens } from "@/lib/editor-model";

export default function DigitalEdition() {
  const [issue] = useState(() => createIssueTemplate("editorial"));
  const [navOpen, setNavOpen] = useState(false);
  const theme = themeTokens[issue.theme];
  const stories = useMemo(() => issue.articles, [issue.articles]);

  return (
    <main className="edition-shell" style={{ "--edition-accent": theme.accent } as React.CSSProperties}>
      <header className="edition-nav">
        <button className="edition-menu" onClick={() => setNavOpen((value) => !value)} aria-label="Toggle contents"><Menu size={18} /></button>
        <div className="edition-brand">LEXOZINE</div>
        <div className="edition-meta">ISSUE {issue.number} · {issue.editionDate.toUpperCase()}</div>
        <button className="edition-share"><Share2 size={16} /><span>Share</span></button>
      </header>

      {navOpen && (
        <aside className="edition-drawer">
          <span className="eyebrow">In this issue</span>
          {stories.map((story, index) => <a key={story.id} href={`#story-${index + 1}`} onClick={() => setNavOpen(false)}><span>{String(index + 1).padStart(2,"0")}</span>{story.title}</a>)}
        </aside>
      )}

      <section className="edition-cover">
        <div className="edition-cover-art" />
        <div className="edition-cover-copy">
          <span className="edition-kicker">{issue.title} · Issue {issue.number}</span>
          <h1>{stories[0].title}</h1>
          <p>{stories[0].blocks.find((block) => block.type === "deck")?.content}</p>
          <a href="#story-1" className="edition-read">Begin reading <ArrowDown size={17} /></a>
        </div>
        <div className="edition-coverlines">{issue.coverLines.map((line) => <span key={line}>{line}</span>)}</div>
      </section>

      <section className="edition-intro">
        <span className="edition-large-number">{issue.number}</span>
        <div><span className="eyebrow">Editor's note</span><h2>An issue is more than a stack of pages.</h2></div>
        <p>Lexozine is designed to let editorial rhythm move between print-informed composition and fluid digital reading. The result should feel authored, not templated.</p>
      </section>

      {stories.map((story, index) => {
        const body = story.blocks.filter((block) => block.type === "body");
        const quote = story.blocks.find((block) => block.type === "pullquote");
        return (
          <article id={`story-${index + 1}`} key={story.id} className={`edition-story story-layout-${story.layout}`}>
            <header className="edition-story-head">
              <div className="edition-story-index">0{index + 1}</div>
              <div>
                <span className="edition-story-category">{story.category}</span>
                <h2>{story.title}</h2>
                <p>{story.blocks.find((block) => block.type === "deck")?.content}</p>
                <div className="edition-byline"><span>{story.byline}</span><span>{story.readTime}</span></div>
              </div>
            </header>
            <div className={`edition-visual visual-${index + 1}`}><span>Editorial image area</span></div>
            <div className="edition-story-body">
              <div className="edition-prose">{body.map((block, bodyIndex) => <p key={block.id} className={bodyIndex === 0 ? "edition-dropcap" : ""}>{block.content}</p>)}</div>
              {quote && <blockquote>“{quote.content}”</blockquote>}
            </div>
          </article>
        );
      })}

      <footer className="edition-footer"><div className="edition-brand">LEXOZINE</div><p>CREATE · PUBLISH · DIGITIZE · GROW</p><span>LexoGraphix Plus</span></footer>
    </main>
  );
}
