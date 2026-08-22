"use client";

import { BookOpen, CheckCircle2, Eye, FilePenLine, FileText, ImageIcon, Images, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";

type IssueNavigationProps = {
  issueId: string;
  active?: "issue" | "articles" | "editors-note" | "cover" | "media" | "review" | "preview";
  onNavigate?: (href: string) => void | Promise<void>;
};

export default function IssueNavigation({ issueId, active = "issue", onNavigate }: IssueNavigationProps) {
  const items = [
    { id: "issue" as const, label: "Issue", icon: LayoutDashboard, href: `/issues/${issueId}` },
    { id: "articles" as const, label: "Articles", icon: FileText, href: `/issues/${issueId}#articles` },
    { id: "editors-note" as const, label: "Editor's Note", icon: FilePenLine, href: `/issues/${issueId}#editors-note` },
    { id: "cover" as const, label: "Cover", icon: ImageIcon, href: `/cover?issue=${issueId}` },
    { id: "media" as const, label: "Media", icon: Images, href: `/media?issue=${issueId}` },
    { id: "review" as const, label: "Review", icon: CheckCircle2, href: `/review?issue=${issueId}` },
    { id: "preview" as const, label: "Preview", icon: Eye, href: `/preview?issue=${issueId}` },
  ];

  function handleClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!onNavigate) return;
    event.preventDefault();
    void onNavigate(href);
  }

  return (
    <nav className="issue-context-nav" aria-label="Issue workflow">
      <div className="issue-context-brand"><BookOpen size={14}/><span>Issue workflow</span></div>
      <div className="issue-context-links">
        {items.map(({ id, label, icon: Icon, href }) => (
          <Link key={id} href={href} onClick={(event) => handleClick(event, href)} className={active === id ? "active" : ""}>
            <Icon size={13}/><span>{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
