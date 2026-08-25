"use client";

import Link from "next/link";
import { Download, Eye, Save } from "lucide-react";
import type { ReactNode } from "react";
import StudioNavigation from "@/components/studio-navigation";
import styles from "./studio-editor-shell.module.css";

type StudioEditorShellProps = {
  issueId: string;
  issueTitle: string;
  documentLabel: string;
  saveState: string;
  onSave: () => void;
  navigator: ReactNode;
  inspector: ReactNode;
  toolbar: ReactNode;
  children: ReactNode;
  status: ReactNode;
  previewHref: string;
  exportHref: string;
};

/**
 * The durable studio frame used by every visual editing route.
 *
 * It deliberately keeps the page canvas as the largest surface and moves
 * document navigation and object properties to supporting, scrollable panels.
 * Route-specific tools live in the three slots rather than creating another
 * competing editor layout.
 */
export default function StudioEditorShell({
  issueId,
  issueTitle,
  documentLabel,
  saveState,
  onSave,
  navigator,
  inspector,
  toolbar,
  children,
  status,
  previewHref,
  exportHref,
}: StudioEditorShellProps) {
  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <Link href="/issues" className={styles.mark} aria-label="Back to issues">
            LZ
          </Link>
          <div>
            <div className={styles.brandTitle}>Lexozine <span>Studio</span></div>
            <div className={styles.brandSubtitle}>Visual publishing workspace</div>
          </div>
        </div>

        <div className={styles.documentTitle} title={issueTitle}>
          <span>Issue</span>
          <strong>{issueTitle}</strong>
          <i aria-hidden="true">/</i>
          <em>{documentLabel}</em>
        </div>

        <div className={styles.actions}>
          <span className={styles.saveState}><i aria-hidden="true" />{saveState}</span>
          <Link href={previewHref} className={styles.secondaryAction}>
            <Eye size={15} /> Preview
          </Link>
          <Link href={exportHref} className={styles.secondaryAction}>
            <Download size={15} /> Export
          </Link>
          <button type="button" className={styles.primaryAction} onClick={onSave}>
            <Save size={15} /> Save
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        <StudioNavigation issueId={issueId} />

        <aside className={styles.navigator} aria-label="Document navigator">
          {navigator}
        </aside>

        <section className={styles.canvas} aria-label="Page canvas">
          <div className={styles.canvasToolbar}>{toolbar}</div>
          <div className={styles.canvasScroll}>{children}</div>
        </section>

        <aside className={styles.inspector} aria-label="Selected object properties">
          {inspector}
        </aside>
      </div>

      <footer className={styles.statusbar}>{status}</footer>
    </main>
  );
}
