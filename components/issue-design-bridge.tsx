"use client";

import { useEffect } from "react";
import type { Issue } from "@/lib/editor-model";
import { defaultTypographySettings } from "@/lib/editor-model";

const ISSUES_KEY = "lexozine-issues-v1";

export default function IssueDesignBridge() {
  useEffect(() => {
    function apply() {
      try {
        const issues = JSON.parse(localStorage.getItem(ISSUES_KEY) ?? "[]") as Issue[];
        const requestedId = new URLSearchParams(window.location.search).get("issue");
        const issue = requestedId ? issues.find((item) => item.id === requestedId) : issues[0];
        const type = issue?.typography ?? defaultTypographySettings;
        const root = document.documentElement;
        root.style.setProperty("--issue-display-family", type.displayFamily);
        root.style.setProperty("--issue-body-family", type.bodyFamily);
        root.style.setProperty("--issue-body-size", `${type.bodySize}px`);
        root.style.setProperty("--issue-leading", String(type.leading));
        root.style.setProperty("--issue-tracking", `${type.tracking / 10}px`);
      } catch {}
    }

    apply();
    window.addEventListener("focus", apply);
    window.addEventListener("popstate", apply);
    window.addEventListener("storage", apply);
    document.addEventListener("visibilitychange", apply);
    return () => {
      window.removeEventListener("focus", apply);
      window.removeEventListener("popstate", apply);
      window.removeEventListener("storage", apply);
      document.removeEventListener("visibilitychange", apply);
    };
  }, []);

  return null;
}
