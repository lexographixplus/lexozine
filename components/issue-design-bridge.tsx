"use client";

import { useEffect } from "react";
import type { Issue } from "@/lib/editor-model";
import { defaultTypographySettings } from "@/lib/editor-model";
import { issueStore } from "@/lib/issue-store";

export default function IssueDesignBridge() {
  useEffect(() => {
    let alive = true;

    async function apply() {
      try {
        const issues = await issueStore?.list() ?? [];
        if (!alive) return;
        const requestedId = new URLSearchParams(window.location.search).get("issue");
        const issue = requestedId ? issues.find((item: Issue) => item.id === requestedId) : issues[0];
        const type = issue?.typography ?? defaultTypographySettings;
        const root = document.documentElement;
        root.style.setProperty("--issue-display-family", type.displayFamily);
        root.style.setProperty("--issue-body-family", type.bodyFamily);
        root.style.setProperty("--issue-body-size", `${type.bodySize}px`);
        root.style.setProperty("--issue-leading", String(type.leading));
        root.style.setProperty("--issue-tracking", `${type.tracking / 10}px`);
      } catch {
        // Keep the current CSS variables if issue state is temporarily unavailable.
      }
    }

    const refresh = () => void apply();
    void apply();
    window.addEventListener("focus", refresh);
    window.addEventListener("popstate", refresh);
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      alive = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("popstate", refresh);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return null;
}
