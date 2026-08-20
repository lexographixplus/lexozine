"use client";

import Link from "next/link";
import {
  BookOpen,
  Image as ImageIcon,
  LayoutDashboard,
  Settings2,
  Sparkles,
  Type,
  History,
} from "lucide-react";

const items = [
  { href: "/issues", label: "Issues", icon: BookOpen, scoped: false },
  { href: "/layouts", label: "Layouts", icon: LayoutDashboard, scoped: true },
  { href: "/styles", label: "Styles", icon: Type, scoped: true },
  { href: "/media", label: "Media", icon: ImageIcon, scoped: true },
  { href: "/assist", label: "Assist", icon: Sparkles, scoped: true },
  { href: "/history", label: "History", icon: History, scoped: true },
  { href: "/setup", label: "Setup", icon: Settings2, scoped: true },
];

export default function StudioNavigation({ issueId }: { issueId?: string }) {
  const currentIssueId = issueId ?? (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("issue") ?? undefined : undefined);
  return (
    <aside className="rail" aria-label="Studio navigation">
      {items.map(({ href, label, icon: Icon, scoped }, index) => {
        const target = scoped && currentIssueId ? `${href}?issue=${currentIssueId}` : href;
        return <Link key={href} href={target} className={`rail-item ${index === 0 ? "active" : ""}`}><Icon size={19} /><span>{label}</span></Link>;
      })}
    </aside>
  );
}
