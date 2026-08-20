"use client";

import { useEffect } from "react";
import { BrowserIssueStore, RemoteIssueStore } from "@/lib/issue-store";
import type { Issue } from "@/lib/editor-model";

const SYNC_MS = 8000;

function newer(a: Issue, b: Issue) {
  return new Date(a.updatedAt).getTime() >= new Date(b.updatedAt).getTime() ? a : b;
}

export default function PersistenceBridge() {
  useEffect(() => {
    if (location.pathname.startsWith("/auth")) return;
    const browser = new BrowserIssueStore();
    const remote = new RemoteIssueStore();
    let syncing = false;
    let stopped = false;

    async function sync() {
      if (syncing || stopped) return;
      syncing = true;
      try {
        const [local, server] = await Promise.all([browser.list(), remote.list()]);
        const serverById = new Map(server.map((item) => [item.id, item]));
        const merged = new Map<string, Issue>();

        for (const remoteIssue of server) merged.set(remoteIssue.id, remoteIssue);

        for (const localIssue of local) {
          const remoteIssue = serverById.get(localIssue.id);
          if (!remoteIssue) {
            try {
              const saved = await remote.save(localIssue);
              merged.delete(localIssue.id);
              merged.set(saved.id, saved);
            } catch {
              merged.set(localIssue.id, localIssue);
            }
            continue;
          }
          const winner = newer(localIssue, remoteIssue);
          if (winner === localIssue && localIssue.updatedAt !== remoteIssue.updatedAt) {
            try { merged.set(localIssue.id, await remote.save(localIssue)); }
            catch { merged.set(localIssue.id, localIssue); }
          } else {
            merged.set(remoteIssue.id, remoteIssue);
          }
        }

        browser.writeAll([...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
        window.dispatchEvent(new CustomEvent("lexozine:issues-synced"));
      } catch {
        // Offline and transient server failures deliberately preserve the local recovery cache.
      } finally {
        syncing = false;
      }
    }

    void sync();
    const timer = window.setInterval(sync, SYNC_MS);
    const onFocus = () => void sync();
    window.addEventListener("focus", onFocus);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return null;
}
