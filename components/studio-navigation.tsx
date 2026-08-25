"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Boxes,
  Frame,
  Image as ImageIcon,
  LayoutDashboard,
  MessageSquareText,
  Settings2,
  Sparkles,
  Type,
  History,
} from "lucide-react";

const items = [
  { href: "/issues", label: "Issues", icon: BookOpen, scoped: false },
  { href: "/cover", label: "Cover", icon: ImageIcon, scoped: true },
  { href: "/canvas", label: "Canvas", icon: Frame, scoped: true },
  { href: "/layouts", label: "Layouts", icon: LayoutDashboard, scoped: true },
  { href: "/blocks", label: "Blocks", icon: Boxes, scoped: true },
  { href: "/styles", label: "Styles", icon: Type, scoped: true },
  { href: "/media", label: "Media", icon: ImageIcon, scoped: true },
  { href: "/review", label: "Review", icon: MessageSquareText, scoped: true },
  { href: "/assist", label: "Assist", icon: Sparkles, scoped: true },
  { href: "/history", label: "History", icon: History, scoped: true },
  { href: "/setup", label: "Setup", icon: Settings2, scoped: true },
];

export default function StudioNavigation({ issueId }: { issueId?: string }) {
  const pathname = usePathname();
  const currentIssueId = issueId ?? (
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("issue") ?? undefined
      : undefined
  );

  return (
    <aside className="rail" aria-label="Studio navigation">
      {items.map(({ href, label, icon: Icon, scoped }) => {
        const target = scoped && currentIssueId ? `${href}?issue=${currentIssueId}` : href;
        const active = href === "/issues"
          ? pathname === "/issues" || pathname === "/"
          : pathname === href || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={target}
            className={`rail-item ${active ? "active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={19} />
            <span>{label}</span>
          </Link>
        );
      })}
    </aside>
  );
}
