"use client";

import { ArrowLeft, ArrowRight, BookOpen, FileDown, Grid2X2, Minus, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { Issue, LexoBooksEdition } from "@/lib/editor-model";
import styles from "./fixed-layout-edition.module.css";

type Props = {
  issue: Issue;
  edition: LexoBooksEdition;
  onRead: () => void;
};

export default function FixedLayoutEdition({ issue, edition, onRead }: Props) {
  const pages = useMemo(() => [...edition.pages].sort((left, right) => left.number - right.number), [edition.pages]);
  const [pageIndex, setPageIndex] = useState(0);
  const [spread, setSpread] = useState(false);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [zoom, setZoom] = useState(100);

  const step = spread ? 2 : 1;
  const activePages = pages.slice(pageIndex, spread ? pageIndex + 2 : pageIndex + 1);
  const canGoBack = pageIndex > 0;
  const canGoForward = pageIndex + step < pages.length;

  function move(delta: number) {
    setPageIndex((current) => Math.max(0, Math.min(pages.length - 1, current + delta * step)));
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
      if (event.key === "Escape") setThumbnailsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length, step]);

  useEffect(() => {
    if (!spread) return;
    setPageIndex((current) => Math.min(current, Math.max(0, pages.length - 2)));
  }, [pages.length, spread]);

  const label = activePages.length > 1
    ? `${activePages[0]?.label ?? ""} – ${activePages[1]?.label ?? ""}`
    : activePages[0]?.label ?? "Page";

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <button className={styles.logo} onClick={onRead} aria-label="Open the responsive reading view">
          <BookOpen size={18}/><span>{issue.cover?.masthead ?? "LEXOZINE"}</span>
        </button>
        <div className={styles.issueMeta}><strong>{issue.title}</strong><span>Issue {issue.number} · Magazine view</span></div>
        <div className={styles.actions}>
          <button className={styles.action} onClick={() => setThumbnailsOpen((value) => !value)} aria-expanded={thumbnailsOpen}>
            {thumbnailsOpen ? <X size={16}/> : <Grid2X2 size={16}/>}<span>Pages</span>
          </button>
          <button className={styles.action} onClick={() => setSpread((value) => !value)} aria-pressed={spread}>
            <span>{spread ? "Single" : "Spread"}</span>
          </button>
          <button className={styles.iconAction} onClick={() => setZoom((value) => Math.max(70, value - 10))} disabled={zoom <= 70} aria-label="Zoom out"><Minus size={16}/></button>
          <button className={styles.iconAction} onClick={() => setZoom((value) => Math.min(180, value + 10))} disabled={zoom >= 180} aria-label="Zoom in"><Plus size={16}/></button>
          {edition.pdfUrl ? <a className={styles.action} href={edition.pdfUrl}><FileDown size={16}/><span>PDF</span></a> : null}
          <button className={styles.readAction} onClick={onRead}>Read articles</button>
        </div>
      </header>

      {thumbnailsOpen ? <aside className={styles.thumbnails} aria-label="Page thumbnails">
        <div><strong>Pages</strong><span>{pages.length} total</span></div>
        <ol>{pages.map((page, index) => <li key={page.number}>
          <button className={index === pageIndex ? styles.activeThumbnail : ""} onClick={() => { setPageIndex(index); setThumbnailsOpen(false); }}>
            {page.previewUrl ? <img src={page.previewUrl} alt="" /> : <span className={styles.pageNumber}>{page.number}</span>}
            <span>{page.number} · {page.label}</span>
          </button>
        </li>)}</ol>
      </aside> : null}

      <section className={styles.stage} aria-label="Fixed-layout magazine pages">
        <div className={styles.pageViewport}>
          <div className={styles.pageSet} data-spread={activePages.length > 1} style={{ width: `${zoom}%` }}>
            {activePages.map((page) => <figure className={styles.page} key={page.number}>
              <img src={page.svgUrl} alt={`Page ${page.number}: ${page.label}`} />
              <figcaption>Page {page.number} · {page.label}</figcaption>
            </figure>)}
          </div>
        </div>
      </section>

      <nav className={styles.navigation} aria-label="Magazine page navigation">
        <button onClick={() => move(-1)} disabled={!canGoBack} aria-label="Previous page"><ArrowLeft size={18}/><span>Previous</span></button>
        <div><span>{label}</span><strong>{pageIndex + 1}{activePages.length > 1 ? `–${pageIndex + activePages.length}` : ""} / {pages.length}</strong></div>
        <button onClick={() => move(1)} disabled={!canGoForward} aria-label="Next page"><span>Next</span><ArrowRight size={18}/></button>
      </nav>
    </main>
  );
}
