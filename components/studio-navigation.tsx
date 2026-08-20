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
  { href: "/issues", label: "Issues", icon: BookOpen },
  { href: "/layouts", label: "Layouts", icon: LayoutDashboard },
  { href: "/styles", label: "Styles", icon: Type },
  { href: "/media", label: "Media", icon: ImageIcon },
  { href: "/assist", label: "Assist", icon: Sparkles },
  { href: "/history", label: "History", icon: History },
  { href: "/setup", label: "Setup", icon: Settings2 },
];

export default function StudioNavigation() {
  return (
    <aside className="rail" aria-label="Studio navigation">
      {items.map(({ href, label, icon: Icon }, index) => (
        <Link key={href} href={href} className={`rail-item ${index === 0 ? "active" : ""}`}>
          <Icon size={19} />
          <span>{label}</span>
        </Link>
      ))}
    </aside>
  );
}
